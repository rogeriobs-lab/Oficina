import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import { theme } from '@/lib/theme';

export function LoadingState() {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={theme.primary} />
      <Text style={styles.loadingText}>Carregando...</Text>
    </View>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <View style={styles.center}>
      <Text style={styles.errorIcon}>!</Text>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.center}>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: theme.textSecondary,
  },
  errorIcon: {
    fontSize: 48,
    fontWeight: '700',
    color: theme.error,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 15,
    color: theme.error,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: theme.textMuted,
    textAlign: 'center',
  },
});
