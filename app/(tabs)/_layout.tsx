import { Tabs } from 'expo-router';
import { Home, Users, Car, ClipboardList } from 'lucide-react-native';
import { theme } from '@/lib/theme';
import { Platform } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          height: Platform.OS === 'web' ? 110 : 56,
          paddingBottom: Platform.OS === 'web' ? 54 : 4,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ size, color }) => (
            <Home size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="clients"
        options={{
          title: 'Clientes',
          tabBarIcon: ({ size, color }) => (
            <Users size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="vehicles"
        options={{
          title: 'Veículos',
          tabBarIcon: ({ size, color }) => (
            <Car size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Serviços',
          tabBarIcon: ({ size, color }) => (
            <ClipboardList size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
    </Tabs>
  );
}
