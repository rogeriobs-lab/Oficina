import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Wrench } from 'lucide-react-native';
import { useAuth } from '@/lib/auth';
import { theme } from '@/lib/theme';

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Preencha e-mail e senha');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres');
      return;
    }
    setLoading(true);
    setError(null);
    const result = mode === 'signin' ? await signIn(email.trim(), password) : await signUp(email.trim(), password);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'web' ? undefined : 'padding'}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.logoWrap}>
          <View style={styles.logoCircle}>
            <Wrench size={36} color={theme.white} strokeWidth={2} />
          </View>
          <Text style={styles.appName}>OficinaPro</Text>
          <Text style={styles.tagline}>Controle de serviços mecânicos</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.tabs}>
            <Pressable
              style={[styles.tab, mode === 'signin' && styles.tabActive]}
              onPress={() => { setMode('signin'); setError(null); }}
            >
              <Text style={[styles.tabText, mode === 'signin' && styles.tabTextActive]}>Entrar</Text>
            </Pressable>
            <Pressable
              style={[styles.tab, mode === 'signup' && styles.tabActive]}
              onPress={() => { setMode('signup'); setError(null); }}
            >
              <Text style={[styles.tabText, mode === 'signup' && styles.tabTextActive]}>Criar conta</Text>
            </Pressable>
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>E-mail</Text>
            <TextInput
              style={styles.input}
              placeholder="seu@email.com"
              placeholderTextColor={theme.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Senha</Text>
            <TextInput
              style={styles.input}
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor={theme.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <Pressable
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.white} size="small" />
            ) : (
              <Text style={styles.submitButtonText}>
                {mode === 'signin' ? 'Entrar' : 'Criar conta'}
              </Text>
            )}
          </Pressable>

          <Text style={styles.hint}>
            {mode === 'signin'
              ? 'Não tem conta? Toque em "Criar conta" acima.'
              : 'Já tem conta? Toque em "Entrar" acima.'}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    elevation: 4,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  appName: {
    fontSize: 26,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  card: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.border,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: theme.surfaceAlt,
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: theme.surface,
    elevation: 1,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textMuted,
  },
  tabTextActive: {
    color: theme.primary,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
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
  submitButton: {
    backgroundColor: theme.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: theme.white,
    fontSize: 16,
    fontWeight: '700',
  },
  hint: {
    fontSize: 13,
    color: theme.textMuted,
    textAlign: 'center',
    marginTop: 16,
  },
});
