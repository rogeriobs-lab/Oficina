/*
# Workshop Management Schema

Creates the core tables for a mechanic workshop service management app.

1. New Tables
- `clients`: Registered customers (name, phone)
- `vehicles`: Vehicles belonging to clients (plate, brand, model, year)
- `service_orders`: Service orders linking a vehicle with date and mileage
- `order_items`: Itemized services and parts within a service order (type, description, price)

2. Relationships
- vehicles.client_id -> clients.id (CASCADE)
- service_orders.vehicle_id -> vehicles.id (CASCADE)
- service_orders.client_id -> clients.id (CASCADE)
- order_items.order_id -> service_orders.id (CASCADE)

3. Security
- RLS enabled on all tables.
- Single-tenant (no auth): all policies use `TO anon, authenticated` with `USING (true)`.
- The data is intentionally shared/public within the workshop.
*/

CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_clients" ON clients;
CREATE POLICY "anon_select_clients" ON clients FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_clients" ON clients;
CREATE POLICY "anon_insert_clients" ON clients FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_clients" ON clients;
CREATE POLICY "anon_update_clients" ON clients FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_clients" ON clients;
CREATE POLICY "anon_delete_clients" ON clients FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  plate text NOT NULL,
  brand text NOT NULL,
  model text NOT NULL,
  year int,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_vehicles" ON vehicles;
CREATE POLICY "anon_select_vehicles" ON vehicles FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_vehicles" ON vehicles;
CREATE POLICY "anon_insert_vehicles" ON vehicles FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_vehicles" ON vehicles;
CREATE POLICY "anon_update_vehicles" ON vehicles FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_vehicles" ON vehicles;
CREATE POLICY "anon_delete_vehicles" ON vehicles FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS service_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  mileage int,
  status text NOT NULL DEFAULT 'aberta',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE service_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_service_orders" ON service_orders;
CREATE POLICY "anon_select_service_orders" ON service_orders FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_service_orders" ON service_orders;
CREATE POLICY "anon_insert_service_orders" ON service_orders FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_service_orders" ON service_orders;
CREATE POLICY "anon_update_service_orders" ON service_orders FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_service_orders" ON service_orders;
CREATE POLICY "anon_delete_service_orders" ON service_orders FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('servico', 'peca')),
  description text NOT NULL,
  price numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_order_items" ON order_items;
CREATE POLICY "anon_select_order_items" ON order_items FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_order_items" ON order_items;
CREATE POLICY "anon_insert_order_items" ON order_items FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_order_items" ON order_items;
CREATE POLICY "anon_update_order_items" ON order_items FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_order_items" ON order_items;
CREATE POLICY "anon_delete_order_items" ON order_items FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_vehicles_client_id ON vehicles(client_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_vehicle_id ON service_orders(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_client_id ON service_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
