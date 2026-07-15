/*
# Fix RLS: Add owner-scoped policies with authentication

## Problem
All RLS policies on clients, vehicles, service_orders, and order_items
used `USING (true)` / `WITH CHECK (true)` with `TO anon, authenticated`.
This effectively disabled row-level security — any anon-key client could
read, insert, update, and delete all data in every table.

## Solution
Convert to a multi-user (authenticated) schema with owner-scoped policies.

1. Schema Changes
- Added `user_id` column to `clients` (nullable, DEFAULT auth.uid()).
  Existing rows get NULL user_id (orphaned, invisible to all users — not deleted).
  New rows from authenticated users automatically get the owner's UUID via DEFAULT.
- No user_id columns on child tables (vehicles, service_orders, order_items).
  Child tables are scoped through their parent relationships via EXISTS subqueries.

2. Policy Changes (all 4 tables)
- Dropped all 16 existing `anon_*` policies that used `USING (true)`.
- Created 16 new owner-scoped policies (4 per table: SELECT, INSERT, UPDATE, DELETE).
- All policies are `TO authenticated` only (anon role has no access).
- Ownership checks:
  - clients: direct `auth.uid() = user_id`
  - vehicles: EXISTS through clients (vehicles.client_id → clients.user_id)
  - service_orders: EXISTS through clients (service_orders.client_id → clients.user_id)
  - order_items: EXISTS through service_orders → clients

3. Security
- RLS remains enabled on all tables.
- Anon role can no longer access any data.
- Each authenticated user only sees data they own (through the clients table).
- INSERT policies verify parent ownership via WITH CHECK EXISTS subqueries.

4. Important Notes
- The frontend MUST implement sign-in/sign-up UI for this to work.
  Without an authenticated session, all queries return empty results.
- The `DEFAULT auth.uid()` on clients.user_id allows `.insert({ name, phone })`
  without explicitly passing user_id — the database fills it from the session.
- Existing test data (created under the old no-auth schema) has NULL user_id
  and is invisible to all authenticated users. It is NOT deleted.
- This migration is idempotent: all DROP POLICY IF EXISTS + CREATE POLICY
  statements can be safely re-run.
*/

-- 1. Add user_id to clients (nullable for existing rows, DEFAULT for new rows)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE clients ADD COLUMN user_id uuid DEFAULT auth.uid();
  END IF;
END $$;

-- 2. Create index on clients.user_id for policy checks
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);

-- 3. Drop all old anon policies on clients
DROP POLICY IF EXISTS "anon_select_clients" ON clients;
DROP POLICY IF EXISTS "anon_insert_clients" ON clients;
DROP POLICY IF EXISTS "anon_update_clients" ON clients;
DROP POLICY IF EXISTS "anon_delete_clients" ON clients;

-- 4. Create owner-scoped policies on clients
DROP POLICY IF EXISTS "select_own_clients" ON clients;
CREATE POLICY "select_own_clients" ON clients FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_clients" ON clients;
CREATE POLICY "insert_own_clients" ON clients FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_clients" ON clients;
CREATE POLICY "update_own_clients" ON clients FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_clients" ON clients;
CREATE POLICY "delete_own_clients" ON clients FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- 5. Drop all old anon policies on vehicles
DROP POLICY IF EXISTS "anon_select_vehicles" ON vehicles;
DROP POLICY IF EXISTS "anon_insert_vehicles" ON vehicles;
DROP POLICY IF EXISTS "anon_update_vehicles" ON vehicles;
DROP POLICY IF EXISTS "anon_delete_vehicles" ON vehicles;

-- 6. Create owner-scoped policies on vehicles (through clients parent)
DROP POLICY IF EXISTS "select_own_vehicles" ON vehicles;
CREATE POLICY "select_own_vehicles" ON vehicles FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM clients WHERE clients.id = vehicles.client_id AND clients.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_vehicles" ON vehicles;
CREATE POLICY "insert_own_vehicles" ON vehicles FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM clients WHERE clients.id = vehicles.client_id AND clients.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_vehicles" ON vehicles;
CREATE POLICY "update_own_vehicles" ON vehicles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM clients WHERE clients.id = vehicles.client_id AND clients.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM clients WHERE clients.id = vehicles.client_id AND clients.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_vehicles" ON vehicles;
CREATE POLICY "delete_own_vehicles" ON vehicles FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM clients WHERE clients.id = vehicles.client_id AND clients.user_id = auth.uid())
  );

-- 7. Drop all old anon policies on service_orders
DROP POLICY IF EXISTS "anon_select_service_orders" ON service_orders;
DROP POLICY IF EXISTS "anon_insert_service_orders" ON service_orders;
DROP POLICY IF EXISTS "anon_update_service_orders" ON service_orders;
DROP POLICY IF EXISTS "anon_delete_service_orders" ON service_orders;

-- 8. Create owner-scoped policies on service_orders (through clients parent)
DROP POLICY IF EXISTS "select_own_service_orders" ON service_orders;
CREATE POLICY "select_own_service_orders" ON service_orders FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM clients WHERE clients.id = service_orders.client_id AND clients.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_service_orders" ON service_orders;
CREATE POLICY "insert_own_service_orders" ON service_orders FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM clients WHERE clients.id = service_orders.client_id AND clients.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_service_orders" ON service_orders;
CREATE POLICY "update_own_service_orders" ON service_orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM clients WHERE clients.id = service_orders.client_id AND clients.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM clients WHERE clients.id = service_orders.client_id AND clients.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_service_orders" ON service_orders;
CREATE POLICY "delete_own_service_orders" ON service_orders FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM clients WHERE clients.id = service_orders.client_id AND clients.user_id = auth.uid())
  );

-- 9. Drop all old anon policies on order_items
DROP POLICY IF EXISTS "anon_select_order_items" ON order_items;
DROP POLICY IF EXISTS "anon_insert_order_items" ON order_items;
DROP POLICY IF EXISTS "anon_update_order_items" ON order_items;
DROP POLICY IF EXISTS "anon_delete_order_items" ON order_items;

-- 10. Create owner-scoped policies on order_items (through service_orders -> clients)
DROP POLICY IF EXISTS "select_own_order_items" ON order_items;
CREATE POLICY "select_own_order_items" ON order_items FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM service_orders
      JOIN clients ON clients.id = service_orders.client_id
      WHERE service_orders.id = order_items.order_id AND clients.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_own_order_items" ON order_items;
CREATE POLICY "insert_own_order_items" ON order_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM service_orders
      JOIN clients ON clients.id = service_orders.client_id
      WHERE service_orders.id = order_items.order_id AND clients.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "update_own_order_items" ON order_items;
CREATE POLICY "update_own_order_items" ON order_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM service_orders
      JOIN clients ON clients.id = service_orders.client_id
      WHERE service_orders.id = order_items.order_id AND clients.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM service_orders
      JOIN clients ON clients.id = service_orders.client_id
      WHERE service_orders.id = order_items.order_id AND clients.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_own_order_items" ON order_items;
CREATE POLICY "delete_own_order_items" ON order_items FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM service_orders
      JOIN clients ON clients.id = service_orders.client_id
      WHERE service_orders.id = order_items.order_id AND clients.user_id = auth.uid()
    )
  );
