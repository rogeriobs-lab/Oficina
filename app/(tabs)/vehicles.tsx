import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Plus, Car, User, X, Search, ChevronDown } from 'lucide-react-native';
import { supabase, type Vehicle, type Client } from '@/lib/supabase';
import { theme } from '@/lib/theme';
import { LoadingState, ErrorState, EmptyState } from '@/components/States';

type VehicleRow = Vehicle & { clients: Pick<Client, 'name'> };

export default function VehiclesScreen() {
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState('');

  const [formPlate, setFormPlate] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formModel, setFormModel] = useState('');
  const [formYear, setFormYear] = useState('');
  const [formClientId, setFormClientId] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [clientPickerVisible, setClientPickerVisible] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [vehiclesRes, clientsRes] = await Promise.all([
        supabase.from('vehicles').select('*, clients(name)').order('plate'),
        supabase.from('clients').select('*').order('name'),
      ]);
      if (vehiclesRes.error) throw vehiclesRes.error;
      if (clientsRes.error) throw clientsRes.error;
      setVehicles((vehiclesRes.data ?? []) as VehicleRow[]);
      setClients(clientsRes.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar veículos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    if (!formPlate.trim()) {
      setFormError('Informe a placa do veículo');
      return;
    }
    if (!formBrand.trim()) {
      setFormError('Informe a marca do veículo');
      return;
    }
    if (!formModel.trim()) {
      setFormError('Informe o modelo do veículo');
      return;
    }
    if (!formClientId) {
      setFormError('Selecione o cliente proprietário');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const { error } = await supabase.from('vehicles').insert({
        plate: formPlate.trim().toUpperCase(),
        brand: formBrand.trim(),
        model: formModel.trim(),
        year: formYear ? parseInt(formYear, 10) : null,
        client_id: formClientId,
      });
      if (error) throw error;
      setFormPlate('');
      setFormBrand('');
      setFormModel('');
      setFormYear('');
      setFormClientId('');
      setModalVisible(false);
      loadData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setFormPlate('');
    setFormBrand('');
    setFormModel('');
    setFormYear('');
    setFormClientId('');
    setFormError(null);
  };

  const selectedClient = clients.find((c) => c.id === formClientId);

  const filtered = vehicles.filter(
    (v) =>
      v.plate.toLowerCase().includes(search.toLowerCase()) ||
      v.brand.toLowerCase().includes(search.toLowerCase()) ||
      v.model.toLowerCase().includes(search.toLowerCase()) ||
      v.clients?.name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Veículos</Text>
        <Pressable style={styles.addButton} onPress={() => setModalVisible(true)}>
          <Plus size={20} color={theme.white} strokeWidth={2.5} />
          <Text style={styles.addButtonText}>Novo</Text>
        </Pressable>
      </View>

      <View style={styles.searchContainer}>
        <Search size={18} color={theme.textMuted} strokeWidth={2} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por placa, modelo ou cliente..."
          placeholderTextColor={theme.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
      >
        {filtered.length === 0 ? (
          <EmptyState message={search ? 'Nenhum veículo encontrado' : 'Nenhum veículo cadastrado. Toque em "Novo" para começar.'} />
        ) : (
          <View style={styles.cards}>
            {filtered.map((vehicle) => (
              <View key={vehicle.id} style={styles.card}>
                <View style={styles.plateBadge}>
                  <Text style={styles.plateText}>{vehicle.plate}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardMain}>
                    {vehicle.brand} {vehicle.model}{vehicle.year ? ` · ${vehicle.year}` : ''}
                  </Text>
                  <View style={styles.ownerRow}>
                    <User size={13} color={theme.textSecondary} strokeWidth={2} />
                    <Text style={styles.cardOwner}>{vehicle.clients?.name ?? '—'}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'web' ? undefined : 'padding'} style={styles.modalOverlay}>
          <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Novo Veículo</Text>
                <Pressable onPress={closeModal} hitSlop={12}>
                  <X size={24} color={theme.textSecondary} strokeWidth={2} />
                </Pressable>
              </View>

              {formError && (
                <View style={styles.formErrorBox}>
                  <Text style={styles.formErrorText}>{formError}</Text>
                </View>
              )}

              <View style={styles.field}>
                <Text style={styles.label}>Placa *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="ABC1D23"
                  placeholderTextColor={theme.textMuted}
                  value={formPlate}
                  onChangeText={setFormPlate}
                  autoCapitalize="characters"
                  maxLength={8}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>Marca *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: Toyota"
                    placeholderTextColor={theme.textMuted}
                    value={formBrand}
                    onChangeText={setFormBrand}
                  />
                </View>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>Ano</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="2023"
                    placeholderTextColor={theme.textMuted}
                    value={formYear}
                    onChangeText={setFormYear}
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Modelo *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Corolla"
                  placeholderTextColor={theme.textMuted}
                  value={formModel}
                  onChangeText={setFormModel}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Cliente *</Text>
                {clients.length === 0 ? (
                  <View style={styles.noClientsBox}>
                    <Text style={styles.noClientsText}>Nenhum cliente cadastrado. Cadastre um cliente primeiro.</Text>
                  </View>
                ) : (
                  <>
                    <Pressable
                      style={styles.selectButton}
                      onPress={() => setClientPickerVisible(!clientPickerVisible)}
                    >
                      <Text style={[styles.selectText, !formClientId && styles.selectPlaceholder]}>
                        {selectedClient?.name ?? 'Selecionar cliente...'}
                      </Text>
                      <ChevronDown size={18} color={theme.textMuted} strokeWidth={2} />
                    </Pressable>
                    {clientPickerVisible && (
                      <View style={styles.clientList}>
                        {clients.map((c) => (
                          <Pressable
                            key={c.id}
                            style={[styles.clientItem, c.id === formClientId && styles.clientItemActive]}
                            onPress={() => {
                              setFormClientId(c.id);
                              setClientPickerVisible(false);
                            }}
                          >
                            <Text style={[styles.clientItemText, c.id === formClientId && styles.clientItemTextActive]}>
                              {c.name}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </>
                )}
              </View>

              <Pressable style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={handleSave} disabled={saving}>
                <Text style={styles.saveButtonText}>{saving ? 'Salvando...' : 'Cadastrar'}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
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
    backgroundColor: theme.secondary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  addButtonText: { color: theme.white, fontSize: 14, fontWeight: '600' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.border,
    gap: 8,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: theme.text },
  list: { flex: 1 },
  cards: { paddingHorizontal: 16, gap: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.border,
    gap: 14,
  },
  plateBadge: {
    backgroundColor: theme.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  plateText: { color: theme.white, fontWeight: '700', fontSize: 15, letterSpacing: 1 },
  cardInfo: { flex: 1 },
  cardMain: { fontSize: 15, fontWeight: '600', color: theme.text, marginBottom: 3 },
  ownerRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardOwner: { fontSize: 13, color: theme.textSecondary },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalScroll: { maxHeight: '95%' },
  modalContent: {
    backgroundColor: theme.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: theme.text },
  formErrorBox: { backgroundColor: '#FEE2E2', borderRadius: 8, padding: 10, marginBottom: 12 },
  formErrorText: { color: theme.error, fontSize: 13 },
  field: { marginBottom: 16 },
  row: { flexDirection: 'row', gap: 12 },
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
  selectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.surfaceAlt,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  selectText: { fontSize: 15, color: theme.text },
  selectPlaceholder: { color: theme.textMuted },
  clientList: {
    backgroundColor: theme.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    marginTop: 4,
    maxHeight: 200,
  },
  clientItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  clientItemActive: { backgroundColor: theme.surfaceAlt },
  clientItemText: { fontSize: 15, color: theme.text },
  clientItemTextActive: { fontWeight: '600', color: theme.primary },
  noClientsBox: {
    backgroundColor: '#FEF3E2',
    borderRadius: 8,
    padding: 12,
  },
  noClientsText: { color: '#92400E', fontSize: 13 },
  saveButton: {
    backgroundColor: theme.secondary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: theme.white, fontSize: 16, fontWeight: '600' },
});
