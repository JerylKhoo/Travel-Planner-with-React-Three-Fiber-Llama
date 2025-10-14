# Database Setup for Travel Planner

## Supabase Table: trips

### Table Schema

Create this table in your Supabase dashboard:

**Table name:** `trips`

**Columns:**

| Column Name | Data Type | Constraints | Description |
|------------|-----------|-------------|-------------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique trip ID |
| `user_id` | `uuid` | NOT NULL, FOREIGN KEY → auth.users(id) | User who owns the trip |
| `booking_number` | `text` | NOT NULL | Unique booking number |
| `origin` | `text` | NOT NULL | Starting location (e.g., "Singapore (SIN)") |
| `destination` | `text` | NOT NULL | Destination location (e.g., "Indonesia (DPS)") |
| `start_date` | `date` | NOT NULL | Trip start date |
| `end_date` | `date` | NOT NULL | Trip end date |
| `travelers` | `integer` | NOT NULL, DEFAULT 1 | Number of travelers |
| `booking_date` | `date` | NOT NULL, DEFAULT now() | When the trip was booked |
| `status` | `text` | DEFAULT 'upcoming' | Trip status (upcoming, completed, cancelled) |
| `image_url` | `text` | | Optional trip image URL |
| `created_at` | `timestamp` | DEFAULT now() | When record was created |
| `updated_at` | `timestamp` | DEFAULT now() | When record was last updated |

### SQL to Create Table

```sql
-- Create trips table
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_number TEXT NOT NULL UNIQUE,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  travelers INTEGER NOT NULL DEFAULT 1,
  booking_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'upcoming',
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for faster queries
CREATE INDEX idx_trips_user_id ON trips(user_id);

-- Create index on status for filtering
CREATE INDEX idx_trips_status ON trips(status);

-- Enable Row Level Security
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own trips
CREATE POLICY "Users can view their own trips"
  ON trips
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own trips
CREATE POLICY "Users can insert their own trips"
  ON trips
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own trips
CREATE POLICY "Users can update their own trips"
  ON trips
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own trips
CREATE POLICY "Users can delete their own trips"
  ON trips
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_trips_updated_at
  BEFORE UPDATE ON trips
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

## How to Set Up in Supabase

### Step 1: Go to Supabase Dashboard
1. Visit [supabase.com](https://supabase.com)
2. Open your project
3. Click on **SQL Editor** in the left sidebar

### Step 2: Run the SQL Script
1. Copy the entire SQL script above
2. Paste it into the SQL Editor
3. Click **Run** (or press Cmd/Ctrl + Enter)
4. You should see "Success. No rows returned"

### Step 3: Verify the Table
1. Go to **Table Editor** in the left sidebar
2. You should see the `trips` table
3. Click on it to see the columns

### Step 4: Test Row Level Security
1. The RLS policies ensure users can only see/modify their own trips
2. Each trip is automatically linked to the authenticated user's ID
3. No user can access another user's trips

## Sample Data (Optional)

If you want to add test data:

```sql
-- Insert sample trips (replace 'YOUR_USER_ID' with actual user ID from auth.users)
INSERT INTO trips (user_id, booking_number, origin, destination, start_date, end_date, travelers, booking_date, image_url)
VALUES
  (
    'YOUR_USER_ID',
    '157894087671398',
    'Singapore (SIN)',
    'Indonesia (DPS)',
    '2025-07-27',
    '2025-08-03',
    1,
    '2025-07-25',
    'https://images.unsplash.com/photo-1537996194471-e657df975ab4'
  ),
  (
    'YOUR_USER_ID',
    '157894001526854',
    'Singapore (SIN)',
    'Vietnam (SGN)',
    '2025-08-04',
    '2025-08-10',
    7,
    '2025-06-20',
    'https://images.unsplash.com/photo-1583417319070-4a69db38a482'
  );
```

## Booking Number Format

The booking numbers are generated automatically in the format:
- `157894` (prefix) + `current timestamp` (milliseconds)
- Example: `157894087671398`

This ensures unique booking numbers for each trip.

## Trip Status Values

- `upcoming` - Trip is scheduled for the future
- `completed` - Trip has finished
- `cancelled` - Trip was cancelled

## Notes

- All dates are stored in ISO format (YYYY-MM-DD)
- The `travelers` field represents the number of passengers
- Duration is calculated automatically: `end_date - start_date`
- Images are stored as URLs (you can use Unsplash or upload to Supabase Storage)
- RLS (Row Level Security) ensures data privacy per user
