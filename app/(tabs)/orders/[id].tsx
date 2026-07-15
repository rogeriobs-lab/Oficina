import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  User,
  Car,
  Calendar,
  Gauge,
  Wrench,
  Package,
  Plus,
  X,
  Check,
  Trash2,
  FileDown,
} from 'lucide-react-native';
import { supabase, type OrderItem } from '@/lib/supabase';
import { theme, formatCurrency, formatDate } from '@/lib/theme';
import { exportOrderToPdf } from '@/lib/exportPdf';
import { LoadingState, ErrorState } from '@/components/States';

type OrderDetail = {
  id: string;
  order_date: string;
  mileage: number | null;
  status: string;
  clients: { name: string; phone: string | null };
  vehicles: { plate: string; brand: string; model: string; year: number | null };
  order_items: OrderItem[];
};

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addType, setAddType] = useState<'servico' | 'peca'>('servico');
  const [addDescription, setAddDescription] = useState('');
  const [addPrice, setAddPrice] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadOrder = useCallback(async () => {
    try {
      setError(null);
      const { data, error } = await supabase
        .from('service_orders')
        .select('id, order_date, mileage, status, clients(name, phone), vehicles(plate, brand, model, year), order_items(*)')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Ordem não encontrada');
      setOrder(data as unknown as OrderDetail);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar ordem');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const handleAddItem = async () => {
    if (!addDescription.trim()) {
      setAddError('Informe a descrição');
      return;
    }
    setSaving(true);
    setAddError(null);
    try {
      const { error } = await supabase.from('order_items').insert({
        order_id: id,
        item_type: addType,
        description: addDescription.trim(),
        price: parseFloat(addPrice.replace(',', '.')) || 0,
      });
      if (error) throw error;
      setAddDescription('');
      setAddPrice('');
      setAddModalVisible(false);
      loadOrder();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Erro ao adicionar item');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    setDeleting(itemId);
    try {
      const { error } = await supabase.from('order_items').delete().eq('id', itemId);
      if (error) throw error;
      loadOrder();
    } catch {
      // silently reload
    } finally {
      setDeleting(null);
    }
  };

  const handleToggleStatus = async () => {
    if (!order) return;
    const newStatus = order.status === 'aberta' ? 'fechada' : 'aberta';
    setToggling(true);
    try {
      const { error } = await supabase
        .from('service_orders')
        .update({ status: newStatus })
        .eq('id', id);
      if (error) throw error;
      loadOrder();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar status');
    } finally {
      setToggling(false);
    }
  };

  const openAddModal = (type: 'servico' | 'peca') => {
    setAddType(type);
    setAddDescription('');
    setAddPrice('');
    setAddError(null);
    setAddModalVisible(true);
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!order) return <ErrorState message="Ordem não encontrada" />;

  const servicos = order.order_items.filter((i) => i.item_type === 'servico');
  const pecas = order.order_items.filter((i) => i.item_type === 'peca');
  const totalServicos = servicos.reduce((s, i) => s + Number(i.price), 0);
  const totalPecas = pecas.reduce((s, i) => s + Number(i.price), 0);
  const total = totalServicos + totalPecas;
  const isOpen = order.status === 'aberta';

  return (
    <View style={styles.container}>
      <View style={styles.navHeader}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={22} color={theme.text} strokeWidth={2} />
        </Pressable>
        <Text style={styles.navTitle}>Ordem de Serviço</Text>
        <View style={[styles.statusBadge, isOpen ? styles.statusOpen : styles.statusClosed]}>
          <Text style={[styles.statusText, isOpen ? styles.statusTextOpen : styles.statusTextClosed]}>
            {isOpen ? 'Aberta' : 'Fechada'}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadOrder(); }} />}
      >
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <User size={16} color={theme.primary} strokeWidth={2} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Cliente</Text>
              <Text style={styles.infoValue}>{order.clients?.name ?? '—'}</Text>
              {order.clients?.phone && (
                <Text style={styles.infoSub}>{order.clients.phone}</Text>
              )}
            </View>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Car size={16} color={theme.secondary} strokeWidth={2} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Veículo</Text>
              <Text style={styles.infoValue}>
                {order.vehicles?.brand} {order.vehicles?.model}
                {order.vehicles?.year ? ` (${order.vehicles.year})` : ''}
              </Text>
              <Text style={styles.infoSub}>{order.vehicles?.plate}</Text>
            </View>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRowHalf}>
            <View style={[styles.infoRow, { flex: 1 }]}>
              <Calendar size={16} color={theme.accent} strokeWidth={2} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Data</Text>
                <Text style={styles.infoValue}>{formatDate(order.order_date)}</Text>
              </View>
            </View>
            {order.mileage != null && (
              <View style={[styles.infoRow, { flex: 1 }]}>
                <Gauge size={16} color={theme.textSecondary} strokeWidth={2} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Km</Text>
                  <Text style={styles.infoValue}>{order.mileage.toLocaleString('pt-BR')}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Wrench size={17} color={theme.primary} strokeWidth={2} />
            <Text style={styles.sectionTitle}>Serviços</Text>
          </View>
          {isOpen && (
            <Pressable style={[styles.addBtn, { backgroundColor: '#EEF7FF' }]} onPress={() => openAddModal('servico')}>
              <Plus size={15} color={theme.primary} strokeWidth={2.5} />
              <Text style={[styles.addBtnText, { color: theme.primary }]}>Adicionar</Text>
            </Pressable>
          )}
        </View>

        {servicos.length === 0 ? (
          <Text style={styles.noItemsText}>Nenhum serviço adicionado</Text>
        ) : (
          <View style={styles.itemList}>
            {servicos.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                isOpen={isOpen}
                deleting={deleting === item.id}
                onDelete={() => handleDeleteItem(item.id)}
              />
            ))}
            <View style={styles.subtotalRow}>
              <Text style={styles.subtotalLabel}>Total serviços</Text>
              <Text style={styles.subtotalValue}>{formatCurrency(totalServicos)}</Text>
            </View>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Package size={17} color={theme.secondary} strokeWidth={2} />
            <Text style={styles.sectionTitle}>Peças</Text>
          </View>
          {isOpen && (
            <Pressable style={[styles.addBtn, { backgroundColor: '#E8F8F5' }]} onPress={() => openAddModal('peca')}>
              <Plus size={15} color={theme.secondary} strokeWidth={2.5} />
              <Text style={[styles.addBtnText, { color: theme.secondary }]}>Adicionar</Text>
            </Pressable>
          )}
        </View>

        {pecas.length === 0 ? (
          <Text style={styles.noItemsText}>Nenhuma peça adicionada</Text>
        ) : (
          <View style={styles.itemList}>
            {pecas.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                isOpen={isOpen}
                deleting={deleting === item.id}
                onDelete={() => handleDeleteItem(item.id)}
              />
            ))}
            <View style={styles.subtotalRow}>
              <Text style={styles.subtotalLabel}>Total peças</Text>
              <Text style={styles.subtotalValue}>{formatCurrency(totalPecas)}</Text>
            </View>
          </View>
        )}

        <View style={styles.totalCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Geral</Text>
            <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
          </View>
        </View>

        <Pressable
          style={[styles.actionButton, isOpen ? styles.closeButton : styles.reopenButton, toggling && styles.disabledButton]}
          onPress={handleToggleStatus}
          disabled={toggling}
        >
          {isOpen ? (
            <Check size={18} color={theme.white} strokeWidth={2.5} />
          ) : (
            <Wrench size={18} color={theme.primary} strokeWidth={2} />
          )}
          <Text style={[styles.actionButtonText, !isOpen && styles.actionButtonTextSecondary]}>
            {toggling ? 'Atualizando...' : isOpen ? 'Fechar Ordem' : 'Reabrir Ordem'}
          </Text>
        </Pressable>

        {!isOpen && (
          <Pressable style={styles.exportButton} onPress={() => exportOrderToPdf(order)}>
            <FileDown size={18} color={theme.primary} strokeWidth={2} />
            <Text style={styles.exportButtonText}>Exportar PDF</Text>
          </Pressable>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      <Modal visible={addModalVisible} animationType="slide" transparent onRequestClose={() => setAddModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {addType === 'servico' ? 'Adicionar Serviço' : 'Adicionar Peça'}
              </Text>
              <Pressable onPress={() => setAddModalVisible(false)} hitSlop={12}>
                <X size={24} color={theme.textSecondary} strokeWidth={2} />
              </Pressable>
            </View>
            {addError && (
              <View style={styles.formErrorBox}>
                <Text style={styles.formErrorText}>{addError}</Text>
              </View>
            )}
            <View style={styles.field}>
              <Text style={styles.label}>Descrição *</Text>
              <TextInput
                style={styles.input}
                placeholder={addType === 'servico' ? 'Ex: Troca de óleo' : 'Ex: Filtro de óleo'}
                placeholderTextColor={theme.textMuted}
                value={addDescription}
                onChangeText={setAddDescription}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Valor (R$)</Text>
              <TextInput
                style={styles.input}
                placeholder="0,00"
                placeholderTextColor={theme.textMuted}
                value={addPrice}
                onChangeText={setAddPrice}
                keyboardType="decimal-pad"
              />
            </View>
            <Pressable style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={handleAddItem} disabled={saving}>
              <Text style={styles.saveButtonText}>{saving ? 'Salvando...' : 'Adicionar'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ItemRow({
  item,
  isOpen,
  deleting,
  onDelete,
}: {
  item: OrderItem;
  isOpen: boolean;
  deleting: boolean;
  onDelete: () => void;
}) {
  return (
    <View style={styles.itemRow}>
      <View style={styles.itemRowInfo}>
        <Text style={styles.itemDesc}>{item.description}</Text>
      </View>
      <Text style={styles.itemPrice}>{formatCurrency(Number(item.price))}</Text>
      {isOpen && (
        <Pressable
          onPress={onDelete}
          disabled={deleting}
          hitSlop={8}
          style={styles.deleteBtn}
        >
          <Trash2 size={15} color={deleting ? theme.textMuted : theme.error} strokeWidth={2} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    gap: 8,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  navTitle: { fontSize: 17, fontWeight: '700', color: theme.text, flex: 1 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  statusOpen: { backgroundColor: '#FEF3E2' },
  statusClosed: { backgroundColor: '#E8F5E9' },
  statusText: { fontSize: 12, fontWeight: '600' },
  statusTextOpen: { color: '#92400E' },
  statusTextClosed: { color: '#2E7D32' },
  scroll: { flex: 1 },
  content: { padding: 16 },
  infoCard: {
    backgroundColor: theme.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  infoRowHalf: { flexDirection: 'row', gap: 16 },
  infoDivider: { height: 1, backgroundColor: theme.border, marginVertical: 12 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, color: theme.textMuted, fontWeight: '500', marginBottom: 2 },
  infoValue: { fontSize: 15, color: theme.text, fontWeight: '600' },
  infoSub: { fontSize: 13, color: theme.textSecondary, marginTop: 1 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.text },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
  },
  addBtnText: { fontSize: 13, fontWeight: '600' },
  noItemsText: { fontSize: 13, color: theme.textMuted, marginBottom: 12 },
  itemList: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 16,
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  itemRowInfo: { flex: 1 },
  itemDesc: { fontSize: 14, color: theme.text },
  itemPrice: { fontSize: 14, fontWeight: '600', color: theme.text, marginRight: 10 },
  deleteBtn: { padding: 4 },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: theme.surfaceAlt,
  },
  subtotalLabel: { fontSize: 13, color: theme.textSecondary, fontWeight: '500' },
  subtotalValue: { fontSize: 13, fontWeight: '600', color: theme.text },
  totalCard: {
    backgroundColor: theme.primary,
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 16, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  totalValue: { fontSize: 24, fontWeight: '700', color: theme.white },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 12,
  },
  closeButton: { backgroundColor: theme.success },
  reopenButton: { backgroundColor: '#EEF7FF', borderWidth: 1, borderColor: theme.primary },
  disabledButton: { opacity: 0.6 },
  actionButtonText: { fontSize: 16, fontWeight: '600', color: theme.white },
  actionButtonTextSecondary: { color: theme.primary },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.primary,
    marginBottom: 16,
  },
  exportButtonText: { fontSize: 16, fontWeight: '600', color: theme.primary },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalContent: {
    backgroundColor: theme.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: theme.text },
  formErrorBox: { backgroundColor: '#FEE2E2', borderRadius: 8, padding: 10, marginBottom: 12 },
  formErrorText: { color: theme.error, fontSize: 13 },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: theme.textSecondary, marginBottom: 6 },
  input: {
    backgroundColor: theme.surfaceAlt,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.text,
    borderWidth: 1,
    borderColor: theme.border,
  },
  saveButton: { backgroundColor: theme.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: theme.white, fontSize: 16, fontWeight: '600' },
});
