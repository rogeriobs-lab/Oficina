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
import { Plus, Phone, User, X, Search } from 'lucide-react-native';
import { supabase, type Client } from '@/lib/supabase';
import { theme } from '@/lib/theme';
import { LoadingState, ErrorState, EmptyState } from '@/components/States';

export default function ClientsScreen() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState('');

  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadClients = useCallback(async () => {
    try {
      setError(null);
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      setClients(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar clientes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const handleSave = async () => {
    if (!formName.trim()) {
      setFormError('Informe o nome do cliente');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const { error } = await supabase.from('clients').insert({
        name: formName.trim(),
        phone: formPhone.trim() || null,
      });
      if (error) throw error;
      setFormName('');
      setFormPhone('');
      setModalVisible(false);
      loadClients();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setFormName('');
    setFormPhone('');
    setFormError(null);
  };

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone ?? '').includes(search)
  );

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Clientes</Text>
        <Pressable style={styles.addButton} onPress={() => setModalVisible(true)}>
          <Plus size={20} color={theme.white} strokeWidth={2.5} />
          <Text style={styles.addButtonText}>Novo</Text>
        </Pressable>
      </View>

      <View style={styles.searchContainer}>
        <Search size={18} color={theme.textMuted} strokeWidth={2} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nome ou telefone..."
          placeholderTextColor={theme.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadClients(); }} />}
      >
        {filtered.length === 0 ? (
          <EmptyState message={search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado. Toque em "Novo" para começar.'} />
        ) : (
          <View style={styles.cards}>
            {filtered.map((client) => (
              <View key={client.id} style={styles.card}>
                <View style={styles.cardIcon}>
                  <User size={20} color={theme.primary} strokeWidth={2} />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{client.name}</Text>
                  {client.phone && (
                    <View style={styles.phoneRow}>
                      <Phone size={13} color={theme.textSecondary} strokeWidth={2} />
                      <Text style={styles.cardPhone}>{client.phone}</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'web' ? undefined : 'padding'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Novo Cliente</Text>
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
              <Text style={styles.label}>Nome *</Text>
              <TextInput
                style={styles.input}
                placeholder="Nome do cliente"
                placeholderTextColor={theme.textMuted}
                value={formName}
                onChangeText={setFormName}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Telefone</Text>
              <TextInput
                style={styles.input}
                placeholder="(00) 00000-0000"
                placeholderTextColor={theme.textMuted}
                value={formPhone}
                onChangeText={setFormPhone}
                keyboardType="phone-pad"
              />
            </View>

            <Pressable style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={handleSave} disabled={saving}>
              <Text style={styles.saveButtonText}>{saving ? 'Salvando...' : 'Cadastrar'}</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.text,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  addButtonText: {
    color: theme.white,
    fontSize: 14,
    fontWeight: '600',
  },
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
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.text,
  },
  list: {
    flex: 1,
  },
  cards: {
    paddingHorizontal: 16,
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.border,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 2,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardPhone: {
    fontSize: 13,
    color: theme.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    backgroundColor: theme.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.text,
  },
  formErrorBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  formErrorText: {
    color: theme.error,
    fontSize: 13,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textSecondary,
    marginBottom: 6,
  },
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
  saveButton: {
    backgroundColor: theme.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: theme.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
