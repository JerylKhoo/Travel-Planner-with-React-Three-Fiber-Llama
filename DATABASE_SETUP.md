# Database Setup for Travel Planner

## Overview

This database consists of three main tables:
1. **itineraries** - Stores AI-generated travel itineraries (primary table)
2. **trips** - Stores user trip metadata linked to itineraries
3. **shared_trips** - Manages trip sharing between users

The `trip_id` is auto-generated in the `itineraries` table and serves as the primary key. Other tables reference this ID as a foreign key.

---

## Table 1: itineraries

This table stores the AI-generated travel itinerary data.

### Schema

**Table name:** `itineraries`

**Columns:**

| Column Name | Data Type | Constraints | Description |
|------------|-----------|-------------|-------------|
| `trip_id` | `uuid` | PRIMARY KEY, DEFAULT gen_random_uuid() | Auto-generated unique trip ID |
| `itinerary_data` | `jsonb` | | Complete itinerary data as JSON |
| `cityname` | `text` | | Destination city name |
| `created_at` | `timestamptz` | DEFAULT now() | When record was created |
| `updated_at` | `timestamptz` | DEFAULT now() | When record was last updated |

### itinerary_data JSON Structure

The `itinerary_data` column contains a JSONB object with this structure:

```json
{
  "destination": "Vietnam",
  "destination_lat": 10.8231,
  "destination_lng": 106.6297,
  "start_date": "2025-07-27",
  "end_date": "2025-08-03",
  "origin": "Singapore",
  "budget": 2000,
  "travelers": 2,
  "remarks": "Cultural experiences preferred",
  "itinerary": [
    {
      "id": "activity-2025-07-27-1",
      "date": "2025-07-27",
      "title": "Cu Chi Tunnels",
      "description": "Historic underground tunnel system",
      "destination": "Cu Chi Tunnels",
      "startTime": "09:00",
      "endTime": "12:00",
      "image_url": "",
      "location": {
        "lat": 11.0514,
        "lng": 106.4631
      }
    }
  ],
  "day_titles": {
    "2025-07-27": "Arrival and Historical Tour",
    "2025-07-28": "City Exploration"
  },
  "activity_notes": {
    "activity-2025-07-27-1": "Open 7:00-17:00. Bring comfortable shoes."
  },
  "context": {
    "summary": "7-day cultural tour of Vietnam",
    "travelers": "2 travelers on a moderate budget"
  },
  "tips": [
    "Best time to visit is early morning",
    "Pack light, breathable clothing"
  ]
}
```

### SQL to Create Table

```sql
-- Create itineraries table (PRIMARY - generates trip_id)
CREATE TABLE IF NOT EXISTS public.itineraries (
  trip_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_data jsonb,
  cityname text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster city searches
CREATE INDEX IF NOT EXISTS idx_itineraries_cityname ON public.itineraries(cityname);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_itineraries_updated_at
  BEFORE UPDATE ON public.itineraries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.itineraries ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read itineraries (adjust based on your needs)
CREATE POLICY "Users can view itineraries"
  ON public.itineraries
  FOR SELECT
  USING (true);

-- Policy: Authenticated users can insert itineraries
CREATE POLICY "Authenticated users can insert itineraries"
  ON public.itineraries
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Policy: Users can update itineraries they own (via trips table)
CREATE POLICY "Users can update their itineraries"
  ON public.itineraries
  FOR UPDATE
  USING (
    trip_id IN (
      SELECT trip_id FROM public.trips WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can delete itineraries they own (via trips table)
CREATE POLICY "Users can delete their itineraries"
  ON public.itineraries
  FOR DELETE
  USING (
    trip_id IN (
      SELECT trip_id FROM public.trips WHERE user_id = auth.uid()
    )
  );
```

---

## Table 2: trips

This table stores user-specific trip metadata and references the itineraries table.

### Schema

**Table name:** `trips`

**Columns:**

| Column Name | Data Type | Constraints | Description |
|------------|-----------|-------------|-------------|
| `user_id` | `uuid` | NOT NULL, FOREIGN KEY → auth.users(id) | User who owns the trip |
| `trip_id` | `uuid` | NOT NULL, FOREIGN KEY → itineraries(trip_id) | Reference to itinerary |
| `origin` | `text` | | Starting location |
| `destination` | `text` | | Destination location |
| `start_date` | `date` | | Trip start date |
| `end_date` | `date` | | Trip end date |
| `travellers` | `integer` | DEFAULT 1 | Number of travelers |
| `status` | `text` | DEFAULT 'upcoming' | Trip status (upcoming, completed, cancelled) |
| `created_at` | `timestamptz` | DEFAULT now() | When record was created |
| `updated_at` | `timestamptz` | DEFAULT now() | When record was last updated |

**Composite Primary Key:** `(user_id, trip_id)`

### SQL to Create Table

```sql
-- Create trips table (references itineraries)
CREATE TABLE IF NOT EXISTS public.trips (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id uuid NOT NULL,
  origin text,
  destination text,
  start_date date,
  end_date date,
  travellers integer DEFAULT 1,
  status text DEFAULT 'upcoming'::text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, trip_id)
);

-- Add foreign key to itineraries
ALTER TABLE public.trips
  ADD CONSTRAINT trips_trip_id_fkey
  FOREIGN KEY (trip_id)
  REFERENCES public.itineraries(trip_id)
  ON DELETE CASCADE;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON public.trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_trip_id ON public.trips(trip_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON public.trips(status);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_trips_updated_at
  BEFORE UPDATE ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own trips
CREATE POLICY "Users can view their own trips"
  ON public.trips
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own trips
CREATE POLICY "Users can insert their own trips"
  ON public.trips
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own trips
CREATE POLICY "Users can update their own trips"
  ON public.trips
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own trips
CREATE POLICY "Users can delete their own trips"
  ON public.trips
  FOR DELETE
  USING (auth.uid() = user_id);
```

---

## Table 3: shared_trips

This table manages trip sharing between users.

### Schema

**Table name:** `shared_trips`

**Columns:**

| Column Name | Data Type | Constraints | Description |
|------------|-----------|-------------|-------------|
| `trip_id` | `uuid` | NOT NULL, FOREIGN KEY → itineraries(trip_id) | Reference to shared trip |
| `owner_id` | `uuid` | NOT NULL, FOREIGN KEY → auth.users(id) | Original trip owner |
| `shared_with_id` | `uuid` | NOT NULL, FOREIGN KEY → auth.users(id) | User the trip is shared with |
| `permission` | `text` | DEFAULT 'view' | Permission level (view, edit) |
| `shared_at` | `timestamptz` | DEFAULT now() | When trip was shared |

**Composite Primary Key:** `(trip_id, shared_with_id)`

### SQL to Create Table

```sql
-- Create shared_trips table
CREATE TABLE IF NOT EXISTS public.shared_trips (
  trip_id uuid NOT NULL,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission text DEFAULT 'view'::text,
  shared_at timestamptz DEFAULT now(),
  PRIMARY KEY (trip_id, shared_with_id)
);

-- Add foreign key to itineraries
ALTER TABLE public.shared_trips
  ADD CONSTRAINT shared_trips_trip_id_fkey
  FOREIGN KEY (trip_id)
  REFERENCES public.itineraries(trip_id)
  ON DELETE CASCADE;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_shared_trips_trip_id ON public.shared_trips(trip_id);
CREATE INDEX IF NOT EXISTS idx_shared_trips_owner_id ON public.shared_trips(owner_id);
CREATE INDEX IF NOT EXISTS idx_shared_trips_shared_with_id ON public.shared_trips(shared_with_id);

-- Enable Row Level Security
ALTER TABLE public.shared_trips ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view trips shared with them
CREATE POLICY "Users can view shared trips"
  ON public.shared_trips
  FOR SELECT
  USING (
    auth.uid() = owner_id
    OR auth.uid() = shared_with_id
  );

-- Policy: Trip owners can share their trips
CREATE POLICY "Owners can share trips"
  ON public.shared_trips
  FOR INSERT
  WITH CHECK (
    auth.uid() = owner_id
    AND trip_id IN (
      SELECT trip_id FROM public.trips WHERE user_id = auth.uid()
    )
  );

-- Policy: Owners can update sharing permissions
CREATE POLICY "Owners can update shared trips"
  ON public.shared_trips
  FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Policy: Owners can revoke sharing
CREATE POLICY "Owners can delete shared trips"
  ON public.shared_trips
  FOR DELETE
  USING (auth.uid() = owner_id);
```

---

## Common Functions

These functions are used across multiple tables:

```sql
-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Complete Setup Script

Run this complete script in Supabase SQL Editor:

```sql
-- ============================================
-- TRAVEL PLANNER DATABASE SETUP
-- ============================================

-- 1. Create update timestamp function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 2. Create itineraries table (PRIMARY)
-- ============================================
CREATE TABLE IF NOT EXISTS public.itineraries (
  trip_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_data jsonb,
  cityname text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_itineraries_cityname ON public.itineraries(cityname);

CREATE TRIGGER update_itineraries_updated_at
  BEFORE UPDATE ON public.itineraries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.itineraries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view itineraries"
  ON public.itineraries FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert itineraries"
  ON public.itineraries FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their itineraries"
  ON public.itineraries FOR UPDATE
  USING (trip_id IN (SELECT trip_id FROM public.trips WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their itineraries"
  ON public.itineraries FOR DELETE
  USING (trip_id IN (SELECT trip_id FROM public.trips WHERE user_id = auth.uid()));

-- ============================================
-- 3. Create trips table (references itineraries)
-- ============================================
CREATE TABLE IF NOT EXISTS public.trips (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id uuid NOT NULL,
  origin text,
  destination text,
  start_date date,
  end_date date,
  travellers integer DEFAULT 1,
  status text DEFAULT 'upcoming'::text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, trip_id)
);

ALTER TABLE public.trips
  ADD CONSTRAINT trips_trip_id_fkey
  FOREIGN KEY (trip_id) REFERENCES public.itineraries(trip_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_trips_user_id ON public.trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_trip_id ON public.trips(trip_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON public.trips(status);

CREATE TRIGGER update_trips_updated_at
  BEFORE UPDATE ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own trips"
  ON public.trips FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trips"
  ON public.trips FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trips"
  ON public.trips FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trips"
  ON public.trips FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 4. Create shared_trips table
-- ============================================
CREATE TABLE IF NOT EXISTS public.shared_trips (
  trip_id uuid NOT NULL,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission text DEFAULT 'view'::text,
  shared_at timestamptz DEFAULT now(),
  PRIMARY KEY (trip_id, shared_with_id)
);

ALTER TABLE public.shared_trips
  ADD CONSTRAINT shared_trips_trip_id_fkey
  FOREIGN KEY (trip_id) REFERENCES public.itineraries(trip_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_shared_trips_trip_id ON public.shared_trips(trip_id);
CREATE INDEX IF NOT EXISTS idx_shared_trips_owner_id ON public.shared_trips(owner_id);
CREATE INDEX IF NOT EXISTS idx_shared_trips_shared_with_id ON public.shared_trips(shared_with_id);

ALTER TABLE public.shared_trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view shared trips"
  ON public.shared_trips FOR SELECT
  USING (auth.uid() = owner_id OR auth.uid() = shared_with_id);

CREATE POLICY "Owners can share trips"
  ON public.shared_trips FOR INSERT
  WITH CHECK (
    auth.uid() = owner_id
    AND trip_id IN (SELECT trip_id FROM public.trips WHERE user_id = auth.uid())
  );

CREATE POLICY "Owners can update shared trips"
  ON public.shared_trips FOR UPDATE
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can delete shared trips"
  ON public.shared_trips FOR DELETE USING (auth.uid() = owner_id);
```

---

## Migration Guide (If Updating Existing Database)

If you already have tables set up with the old structure, follow these steps:

### Step 1: Backup Your Data

```sql
-- Export existing data
CREATE TEMP TABLE trips_backup AS SELECT * FROM trips;
CREATE TEMP TABLE itineraries_backup AS SELECT * FROM itineraries;
```

### Step 2: Drop Old Tables (in correct order)

```sql
-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS public.shared_trips CASCADE;
DROP TABLE IF EXISTS public.trips CASCADE;
DROP TABLE IF EXISTS public.itineraries CASCADE;
```

### Step 3: Run Complete Setup Script

Run the complete setup script above.

### Step 4: Migrate Data (if applicable)

```sql
-- This depends on your old structure
-- Adjust as needed based on your backup
```

---

## How to Set Up in Supabase

### Step 1: Go to Supabase Dashboard
1. Visit [supabase.com](https://supabase.com)
2. Open your project
3. Click on **SQL Editor** in the left sidebar

### Step 2: Run the Complete Setup Script
1. Copy the entire "Complete Setup Script" above
2. Paste it into the SQL Editor
3. Click **Run** (or press Cmd/Ctrl + Enter)
4. You should see "Success. No rows returned"

### Step 3: Verify the Tables
1. Go to **Table Editor** in the left sidebar
2. You should see three tables: `itineraries`, `trips`, `shared_trips`
3. Click on each to verify the columns

### Step 4: Test the Setup
1. The RLS policies ensure proper data access control
2. Each trip is automatically linked via the `trip_id` from itineraries
3. Users can only access their own trips or trips shared with them

---

## Notes

- **trip_id** is auto-generated in the `itineraries` table using `gen_random_uuid()`
- All trips reference this `trip_id` as a foreign key
- Cascade deletes ensure data integrity (deleting an itinerary deletes associated trips)
- All dates are stored in ISO format (YYYY-MM-DD)
- JSONB allows flexible storage of complex itinerary data
- RLS (Row Level Security) ensures data privacy per user
- Shared trips can have 'view' or 'edit' permissions
