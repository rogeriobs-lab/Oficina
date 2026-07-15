import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ChevronDown,
  Plus,
  Trash2,
  Wrench,
  Package,
  X,
  ArrowLeft,
} from 'lucide-react-native';
import { supabase, type Client, type Vehicle } from '@/lib/supabase';
import { theme, formatCurrency } from '@/lib/theme';
import { LoadingState, ErrorState } from '@/components/States';

type ItemDraft = {
  key: string;
  item_type: 'servico' | 'peca';
  description: string;
  price: string;
};

type VehicleOption = Vehicle & { clients: Pick<Client, 'name'> };

export default function NewOrderScreen() {
  const router = useRouter();

  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [mileage, setMileage] = useState('');
  const [items, setItems] = useState<ItemDraft[]>([]);
  const [vehiclePickerVisible, setVehiclePickerVisible] = useState(false);

  const loadVehicles = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*, clients(name)')
        .order('plate');
      if (error) throw error;
      setVehicles((data ?? []) as VehicleOption[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar veículos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  const addItem = (type: 'servico' | 'peca') => {
    setItems((prev) => [
      ...prev,
      { key: Math.random().toString(36).slice(2), item_type: type, description: '', price: '' },
    ]);
  };

  const updateItem = (key: string, field: 'description' | 'price', value: string) => {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, [field]: value } : i)));
  };

  const removeItem = (key: string) => {
    setItems((prev) => prev.filter((i) => i.key !== key));
  };

  const totalServicos = items
    .filter((i) => i.item_type === 'servico')
    .reduce((s, i) => s + (parseFloat(i.price.replace(',', '.')) || 0), 0);
  const totalPecas = items
    .filter((i) => i.item_type === 'peca')
    .reduce((s, i) => s + (parseFloat(i.price.replace(',', '.')) || 0), 0);
  const total = totalServicos + totalPecas;

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);

  const handleSave = async () => {
    if (!selectedVehicleId) {
      setFormError('Selecione o veículo');
      return;
    }
    if (!orderDate) {
      setFormError('Informe a data');
      return;
    }
    if (items.some((i) => !i.description.trim())) {
      setFormError('Preencha a descrição de todos os itens');
      return;
    }
    setSaving(true);
    setFormError(null);

    try {
      const vehicle = vehicles.find((v) => v.id === selectedVehicleId);
      if (!vehicle) throw new Error('Veículo não encontrado');

      const { data: orderData, error: orderError } = await supabase
        .from('service_orders')
        .insert({
          vehicle_id: selectedVehicleId,
          client_id: vehicle.client_id,
          order_date: orderDate,
          mileage: mileage ? parseInt(mileage, 10) : null,
          status: 'aberta',
        })
        .select('id')
        .single();

      if (orderError) throw orderError;

      if (items.length > 0) {
        const { error: itemsError } = await supabase.from('order_items').insert(
          items.map((i) => ({
            order_id: orderData.id,
            item_type: i.item_type,
            description: i.description.trim(),
            price: parseFloat(i.price.replace(',', '.')) || 0,
          }))
        );
        if (itemsError) throw itemsError;
      }

      router.replace(`/(tabs)/orders/${orderData.id}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao salvar ordem');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'web' ? undefined : 'padding'}
    >
      <View style={styles.navHeader}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={22} color={theme.text} strokeWidth={2} />
        </Pressable>
        <Text style={styles.navTitle}>Nova Ordem de Serviço</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {formError && (
          <View style={styles.formErrorBox}>
            <Text style={styles.formErrorText}>{formError}</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Dados Gerais</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Veículo *</Text>
          {vehicles.length === 0 ? (
            <View style={styles.warnBox}>
              <Text style={styles.warnText}>Nenhum veículo cadastrado. Cadastre um veículo primeiro.</Text>
            </View>
          ) : (
            <>
              <Pressable
                style={styles.selectButton}
                onPress={() => setVehiclePickerVisible(!vehiclePickerVisible)}
              >
                <Text style={[styles.selectText, !selectedVehicleId && styles.selectPlaceholder]}>
                  {selectedVehicle
                    ? `${selectedVehicle.plate} · ${selectedVehicle.brand} ${selectedVehicle.model} — ${selectedVehicle.clients?.name}`
                    : 'Selecionar veículo...'}
                </Text>
                <ChevronDown size={18} color={theme.textMuted} strokeWidth={2} />
              </Pressable>
              {vehiclePickerVisible && (
                <View style={styles.pickerList}>
                  {vehicles.map((v) => (
                    <Pressable
                      key={v.id}
                      style={[styles.pickerItem, v.id === selectedVehicleId && styles.pickerItemActive]}
                      onPress={() => {
                        setSelectedVehicleId(v.id);
                        setVehiclePickerVisible(false);
                      }}
                    >
                      <Text style={[styles.pickerItemText, v.id === selectedVehicleId && styles.pickerItemTextActive]}>
                        {v.plate} · {v.brand} {v.model}
                      </Text>
                      <Text style={styles.pickerItemSub}>{v.clients?.name}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </>
          )}
        </View>

        <View style={styles.row}>
          <View style={[styles.field, { flex: 1.5 }]}>
            <Text style={styles.label}>Data *</Text>
            <TextInput
              style={styles.input}
              value={orderDate}
              onChangeText={setOrderDate}
              placeholder="AAAA-MM-DD"
              placeholderTextColor={theme.textMuted}
            />
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Quilometragem</Text>
            <TextInput
              style={styles.input}
              value={mileage}
              onChangeText={setMileage}
              placeholder="0"
              placeholderTextColor={theme.textMuted}
              keyboardType="number-pad"
            />
          </View>
        </View>

        <View style={styles.sectionDivider} />
        <Text style={styles.sectionTitle}>Serviços e Peças</Text>

        <View style={styles.addItemsRow}>
          <Pressable style={[styles.addItemButton, { backgroundColor: '#EEF7FF' }]} onPress={() => addItem('servico')}>
            <Wrench size={18} color={theme.primary} strokeWidth={2} />
            <Text style={[styles.addItemText, { color: theme.primary }]}>Serviço</Text>
          </Pressable>
          <Pressable style={[styles.addItemButton, { backgroundColor: '#E8F8F5' }]} onPress={() => addItem('peca')}>
            <Package size={18} color={theme.secondary} strokeWidth={2} />
            <Text style={[styles.addItemText, { color: theme.secondary }]}>Peça</Text>
          </Pressable>
        </View>

        {items.length === 0 && (
          <View style={styles.emptyItems}>
            <Text style={styles.emptyItemsText}>Nenhum item adicionado. Toque em "Serviço" ou "Peça" acima.</Text>
          </View>
        )}

        {items.map((item) => (
          <View key={item.key} style={[styles.itemCard, item.item_type === 'servico' ? styles.itemCardService : styles.itemCardPart]}>
            <View style={styles.itemHeader}>
              <View style={styles.itemTypeBadge}>
                {item.item_type === 'servico' ? (
                  <Wrench size={14} color={theme.primary} strokeWidth={2} />
                ) : (
                  <Package size={14} color={theme.secondary} strokeWidth={2} />
                )}
                <Text style={[styles.itemTypeText, item.item_type === 'servico' ? styles.itemTypeTextService : styles.itemTypeTextPart]}>
                  {item.item_type === 'servico' ? 'Serviço' : 'Peça'}
                </Text>
              </View>
              <Pressable onPress={() => removeItem(item.key)} hitSlop={8}>
                <X size={18} color={theme.error} strokeWidth={2} />
              </Pressable>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Descrição"
              placeholderTextColor={theme.textMuted}
              value={item.description}
              onChangeText={(v) => updateItem(item.key, 'description', v)}
            />
            <TextInput
              style={[styles.input, styles.priceInput]}
              placeholder="Valor (R$)"
              placeholderTextColor={theme.textMuted}
              value={item.price}
              onChangeText={(v) => updateItem(item.key, 'price', v)}
              keyboardType="decimal-pad"
            />
          </View>
        ))}

        {items.length > 0 && (
          <View style={styles.totalsCard}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Serviços</Text>
              <Text style={styles.totalValue}>{formatCurrency(totalServicos)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Peças</Text>
              <Text style={styles.totalValue}>{formatCurrency(totalPecas)}</Text>
            </View>
            <View style={[styles.totalRow, styles.totalRowFinal]}>
              <Text style={styles.totalLabelFinal}>Total</Text>
              <Text style={styles.totalValueFinal}>{formatCurrency(total)}</Text>
            </View>
          </View>
        )}

        <View style={{ height: 16 }} />

        <Pressable style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveButtonText}>{saving ? 'Salvando...' : 'Abrir Ordem de Serviço'}</Text>
        </Pressable>

        <View style={{ height: 32 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  navTitle: { fontSize: 17, fontWeight: '700', color: theme.text, flex: 1, textAlign: 'center' },
  scroll: { flex: 1 },
  content: { padding: 16 },
  formErrorBox: { backgroundColor: '#FEE2E2', borderRadius: 8, padding: 10, marginBottom: 12 },
  formErrorText: { color: theme.error, fontSize: 13 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: theme.text, marginBottom: 12 },
  sectionDivider: { borderTopWidth: 1, borderTopColor: theme.border, marginVertical: 16 },
  field: { marginBottom: 14 },
  row: { flexDirection: 'row', gap: 12 },
  label: { fontSize: 14, fontWeight: '600', color: theme.textSecondary, marginBottom: 6 },
  input: {
    backgroundColor: theme.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.text,
    borderWidth: 1,
    borderColor: theme.border,
  },
  priceInput: { marginTop: 8 },
  selectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  selectText: { fontSize: 15, color: theme.text, flex: 1, marginRight: 8 },
  selectPlaceholder: { color: theme.textMuted },
  pickerList: {
    backgroundColor: theme.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    marginTop: 4,
    maxHeight: 220,
  },
  pickerItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  pickerItemActive: { backgroundColor: theme.surfaceAlt },
  pickerItemText: { fontSize: 15, color: theme.text, fontWeight: '500' },
  pickerItemTextActive: { color: theme.primary, fontWeight: '600' },
  pickerItemSub: { fontSize: 12, color: theme.textMuted, marginTop: 1 },
  warnBox: { backgroundColor: '#FEF3E2', borderRadius: 8, padding: 12 },
  warnText: { color: '#92400E', fontSize: 13 },
  addItemsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  addItemButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
  },
  addItemText: { fontSize: 14, fontWeight: '600' },
  emptyItems: {
    backgroundColor: theme.surface,
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
    borderStyle: 'dashed',
    marginBottom: 12,
  },
  emptyItemsText: { fontSize: 13, color: theme.textMuted, textAlign: 'center' },
  itemCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  itemCardService: {
    backgroundColor: '#F8FBFF',
    borderColor: '#BFDBFE',
  },
  itemCardPart: {
    backgroundColor: '#F0FDF8',
    borderColor: '#99F6E4',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  itemTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemTypeText: { fontSize: 13, fontWeight: '600' },
  itemTypeTextService: { color: theme.primary },
  itemTypeTextPart: { color: theme.secondary },
  totalsCard: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: theme.border,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalRowFinal: {
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingTop: 10,
    marginBottom: 0,
    marginTop: 4,
  },
  totalLabel: { fontSize: 14, color: theme.textSecondary },
  totalValue: { fontSize: 14, color: theme.text, fontWeight: '500' },
  totalLabelFinal: { fontSize: 16, fontWeight: '700', color: theme.text },
  totalValueFinal: { fontSize: 18, fontWeight: '700', color: theme.success },
  saveButton: {
    backgroundColor: theme.accent,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: theme.white, fontSize: 16, fontWeight: '700' },
});
