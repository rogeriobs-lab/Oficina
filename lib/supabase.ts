import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type Client = {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  user_id: string | null;
  created_at: string;
};

export type Vehicle = {
  id: string;
  client_id: string;
  plate: string;
  brand: string;
  model: string;
  year: number | null;
  notes: string | null;
  created_at: string;
};

export type ServiceOrder = {
  id: string;
  vehicle_id: string;
  client_id: string;
  order_date: string;
  mileage: number | null;
  status: string;
  created_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  item_type: 'servico' | 'peca';
  description: string;
  price: number;
  created_at: string;
};

export type VehicleWithClient = Vehicle & {
  clients: Pick<Client, 'id' | 'name' | 'phone'>;
};

export type ServiceOrderWithDetails = ServiceOrder & {
  vehicles: Pick<Vehicle, 'id' | 'plate' | 'brand' | 'model' | 'year'>;
  clients: Pick<Client, 'id' | 'name'>;
  order_items: OrderItem[];
};
