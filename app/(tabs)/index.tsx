import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Users, Car, ClipboardList, Wrench, LogOut } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { theme, formatCurrency, formatDate } from '@/lib/theme';
import { LoadingState, ErrorState } from '@/components/States';
import { useAuth } from '@/lib/auth';

type Stats = {
  clientCount: number;
  vehicleCount: number;
  orderCount: number;
  openOrders: number;
};

type RecentOrder = {
  id: string;
  order_date: string;
  status: string;
  clients: { name: string };
  vehicles: { plate: string; brand: string; model: string };
  order_items: { price: number }[];
};

export default function HomeScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setError(null);

      const [clientsRes, vehiclesRes, ordersRes] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact', head: true }),
        supabase.from('vehicles').select('id', { count: 'exact', head: true }),
        supabase
          .from('service_orders')
          .select('id, order_date, status, clients(name), vehicles(plate, brand, model), order_items(price)'),
      ]);

      if (clientsRes.error) throw clientsRes.error;
      if (vehiclesRes.error) throw vehiclesRes.error;
      if (ordersRes.error) throw ordersRes.error;

      const orders = ordersRes.data ?? [];
      let openOrders = 0;

      for (const order of orders) {
        if (order.status === 'aberta') openOrders++;
      }

      setStats({
        clientCount: clientsRes.count ?? 0,
        vehicleCount: vehiclesRes.count ?? 0,
        orderCount: orders.length,
        openOrders,
      });

      const sorted = [...orders]
        .sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime())
        .slice(0, 5);
      setRecentOrders(sorted as unknown as RecentOrder[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>OficinaPro</Text>
          <Text style={styles.subtitle}>Controle de serviços mecânicos</Text>
        </View>
        <Pressable style={styles.signOutButton} onPress={signOut} hitSlop={8}>
          <LogOut size={20} color={theme.textSecondary} strokeWidth={2} />
        </Pressable>
      </View>

      <View style={styles.statsGrid}>
        <StatCard
          icon={<Users size={22} color={theme.white} strokeWidth={2} />}
          label="Clientes"
          value={stats?.clientCount.toString() ?? '0'}
          color={theme.primary}
          onPress={() => router.push('/(tabs)/clients')}
        />
        <StatCard
          icon={<Car size={22} color={theme.white} strokeWidth={2} />}
          label="Veículos"
          value={stats?.vehicleCount.toString() ?? '0'}
          color={theme.secondary}
          onPress={() => router.push('/(tabs)/vehicles')}
        />
        <StatCard
          icon={<ClipboardList size={22} color={theme.white} strokeWidth={2} />}
          label="Ordens"
          value={stats?.orderCount.toString() ?? '0'}
          color={theme.accent}
          onPress={() => router.push('/(tabs)/orders')}
        />
      </View>

      {stats && stats.openOrders > 0 && (
        <View style={styles.alertCard}>
          <Wrench size={20} color={theme.warning} strokeWidth={2} />
          <Text style={styles.alertText}>
            {stats.openOrders} ordem(ns) de serviço aberta(s)
          </Text>
        </View>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Ordens Recentes</Text>
        <Pressable onPress={() => router.push('/(tabs)/orders')}>
          <Text style={styles.seeAll}>Ver todas</Text>
        </Pressable>
      </View>

      {recentOrders.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Nenhuma ordem de serviço cadastrada</Text>
        </View>
      ) : (
        <View style={styles.orderList}>
          {recentOrders.map((order) => {
            return (
              <Pressable
                key={order.id}
                style={styles.orderCard}
                onPress={() => router.push(`/(tabs)/orders/${order.id}`)}
              >
                <View style={styles.orderCardLeft}>
                  <Text style={styles.orderClient}>{order.clients?.name ?? '—'}</Text>
                  <Text style={styles.orderVehicle}>
                    {order.vehicles?.plate ?? '—'} · {order.vehicles?.brand} {order.vehicles?.model}
                  </Text>
                  <Text style={styles.orderDate}>{formatDate(order.order_date)}</Text>
                </View>
                <View style={styles.orderCardRight}>
                  <View style={[styles.statusBadge, order.status === 'aberta' ? styles.statusOpen : styles.statusClosed]}>
                    <Text style={[styles.statusText, order.status === 'aberta' ? styles.statusTextOpen : styles.statusTextClosed]}>
                      {order.status === 'aberta' ? 'Aberta' : 'Fechada'}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
  smallValue,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  smallValue?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      style={[styles.statCard, { backgroundColor: color }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.statIcon}>{icon}</View>
      <Text style={[styles.statValue, smallValue && styles.statValueSmall]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    marginTop: 8,
  },
  signOutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: theme.textSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    width: '48%',
    flexGrow: 1,
    borderRadius: 14,
    padding: 16,
    minHeight: 110,
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  statIcon: {
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.white,
    marginBottom: 2,
  },
  statValueSmall: {
    fontSize: 18,
  },
  statLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3E2',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    gap: 10,
  },
  alertText: {
    fontSize: 14,
    color: '#92400E',
    fontWeight: '500',
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.text,
  },
  seeAll: {
    fontSize: 14,
    color: theme.primary,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  emptyText: {
    fontSize: 14,
    color: theme.textMuted,
  },
  orderList: {
    gap: 10,
  },
  orderCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.border,
  },
  orderCardLeft: {
    flex: 1,
  },
  orderCardRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  orderClient: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 2,
  },
  orderVehicle: {
    fontSize: 13,
    color: theme.textSecondary,
    marginBottom: 2,
  },
  orderDate: {
    fontSize: 12,
    color: theme.textMuted,
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.success,
    marginBottom: 6,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusOpen: {
    backgroundColor: '#FEF3E2',
  },
  statusClosed: {
    backgroundColor: '#E8F5E9',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusTextOpen: {
    color: '#92400E',
  },
  statusTextClosed: {
    color: '#2E7D32',
  },
});
