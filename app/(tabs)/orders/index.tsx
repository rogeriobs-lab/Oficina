import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, Search, ClipboardList, FileDown } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { theme, formatCurrency, formatDate } from '@/lib/theme';
import { exportOrdersListToPdf } from '@/lib/exportPdf';
import { LoadingState, ErrorState, EmptyState } from '@/components/States';

type OrderRow = {
  id: string;
  order_date: string;
  mileage: number | null;
  status: string;
  clients: { name: string; phone: string | null };
  vehicles: { plate: string; brand: string; model: string; year: number | null };
  order_items: { item_type: 'servico' | 'peca'; description: string; price: number }[];
};

export default function OrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todas' | 'aberta' | 'fechada'>('todas');

  const loadOrders = useCallback(async () => {
    try {
      setError(null);
      const { data, error } = await supabase
        .from('service_orders')
        .select('id, order_date, mileage, status, clients(name, phone), vehicles(plate, brand, model, year), order_items(item_type, description, price)')
        .order('order_date', { ascending: false });
      if (error) throw error;
      setOrders((data ?? []) as unknown as OrderRow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar ordens');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const filtered = orders.filter((o) => {
    const matchSearch =
      o.clients?.name?.toLowerCase().includes(search.toLowerCase()) ||
      o.vehicles?.plate?.toLowerCase().includes(search.toLowerCase()) ||
      o.vehicles?.model?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'todas' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Ordens de Serviço</Text>
        <View style={styles.headerActions}>
          {orders.some((o) => o.status === 'fechada') && (
            <Pressable style={styles.exportButton} onPress={() => exportOrdersListToPdf(orders.filter((o) => o.status === 'fechada'))}>
              <FileDown size={18} color={theme.primary} strokeWidth={2} />
              <Text style={styles.exportButtonText}>PDF</Text>
            </Pressable>
          )}
          <Pressable style={styles.addButton} onPress={() => router.push('/(tabs)/orders/new')}>
            <Plus size={20} color={theme.white} strokeWidth={2.5} />
            <Text style={styles.addButtonText}>Nova</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Search size={18} color={theme.textMuted} strokeWidth={2} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por cliente ou veículo..."
          placeholderTextColor={theme.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.filters}>
        {(['todas', 'aberta', 'fechada'] as const).map((f) => (
          <Pressable
            key={f}
            style={[styles.filterChip, statusFilter === f && styles.filterChipActive]}
            onPress={() => setStatusFilter(f)}
          >
            <Text style={[styles.filterText, statusFilter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadOrders(); }} />}
      >
        {filtered.length === 0 ? (
          <EmptyState message={search || statusFilter !== 'todas' ? 'Nenhuma ordem encontrada' : 'Nenhuma ordem de serviço cadastrada. Toque em "Nova" para começar.'} />
        ) : (
          <View style={styles.cards}>
            {filtered.map((order) => {
              const total = (order.order_items ?? []).reduce((s, i) => s + Number(i.price), 0);
              return (
                <Pressable
                  key={order.id}
                  style={styles.card}
                  onPress={() => router.push(`/(tabs)/orders/${order.id}`)}
                >
                  <View style={styles.cardTop}>
                    <View style={styles.cardIconWrap}>
                      <ClipboardList size={20} color={theme.accent} strokeWidth={2} />
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardClient}>{order.clients?.name ?? '—'}</Text>
                      <Text style={styles.cardVehicle}>
                        {order.vehicles?.plate ?? '—'} · {order.vehicles?.brand} {order.vehicles?.model}
                        {order.vehicles?.year ? ` (${order.vehicles.year})` : ''}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, order.status === 'aberta' ? styles.statusOpen : styles.statusClosed]}>
                      <Text style={[styles.statusText, order.status === 'aberta' ? styles.statusTextOpen : styles.statusTextClosed]}>
                        {order.status === 'aberta' ? 'Aberta' : 'Fechada'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.cardBottom}>
                    <Text style={styles.cardDate}>{formatDate(order.order_date)}</Text>
                    {order.mileage != null && (
                      <Text style={styles.cardMileage}>{order.mileage.toLocaleString('pt-BR')} km</Text>
                    )}
                    <Text style={styles.cardTotal}>{formatCurrency(total)}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: { fontSize: 24, fontWeight: '700', color: theme.text },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  addButtonText: { color: theme.white, fontSize: 14, fontWeight: '600' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  exportButtonText: { color: theme.primary, fontSize: 14, fontWeight: '600' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.border,
    gap: 8,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: theme.text },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: theme.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.border,
  },
  filterChipActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  filterText: { fontSize: 13, fontWeight: '500', color: theme.textSecondary },
  filterTextActive: { color: theme.white },
  list: { flex: 1 },
  cards: { paddingHorizontal: 16, gap: 10 },
  card: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.border,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  cardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF3E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cardInfo: { flex: 1 },
  cardClient: { fontSize: 15, fontWeight: '600', color: theme.text, marginBottom: 1 },
  cardVehicle: { fontSize: 13, color: theme.textSecondary },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  statusOpen: { backgroundColor: '#FEF3E2' },
  statusClosed: { backgroundColor: '#E8F5E9' },
  statusText: { fontSize: 11, fontWeight: '600' },
  statusTextOpen: { color: '#92400E' },
  statusTextClosed: { color: '#2E7D32' },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  cardDate: { fontSize: 13, color: theme.textSecondary },
  cardMileage: { fontSize: 13, color: theme.textSecondary },
  cardTotal: { fontSize: 16, fontWeight: '700', color: theme.success },
});
