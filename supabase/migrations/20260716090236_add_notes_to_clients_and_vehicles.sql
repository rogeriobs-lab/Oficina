/*
# Add notes column to clients and vehicles

1. Schema Changes
- Added `notes` (text, nullable) to `clients` — free-text observations about the customer.
- Added `notes` (text, nullable) to `vehicles` — free-text observations about the vehicle.

2. Security
- No policy changes needed. Existing UPDATE policies already cover the new column
  since they operate at the row level, not column level.
- RLS remains enabled on both tables.

3. Important Notes
- The new columns are nullable, so existing rows get NULL (no data loss).
- The columns are optional in the frontend — users can leave them blank.
- This migration is idempotent: both DO $$ blocks check for column existence.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'notes'
  ) THEN
    ALTER TABLE clients ADD COLUMN notes text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'vehicles' AND column_name = 'notes'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN notes text;
  END IF;
END $$;
