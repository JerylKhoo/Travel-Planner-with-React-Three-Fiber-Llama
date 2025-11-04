-- ============================================
-- ENABLE COLLABORATIVE EDITING FOR SHARED TRIPS
-- ============================================
-- This allows anyone who has the trip ID (in their shared_trips) to edit the trip
-- Only the original creator can delete the trip

-- Step 1: Drop the old UPDATE policy that restricts to owner only
DROP POLICY IF EXISTS "Users can update their own trips" ON trips;

-- Step 2: Create new UPDATE policy that allows owner OR shared users to edit
CREATE POLICY "Users can update trips they own or have shared access to"
  ON trips
  FOR UPDATE
  USING (
    -- Allow if user is the owner
    auth.uid() = user_id
    OR
    -- Allow if user has this trip in their shared_trips table
    EXISTS (
      SELECT 1
      FROM shared_trips
      WHERE shared_trips.trip_id = trips.trip_id
      AND shared_trips.shared_with_user_id = auth.uid()
    )
  )
  WITH CHECK (
    -- Same conditions for the check constraint
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1
      FROM shared_trips
      WHERE shared_trips.trip_id = trips.trip_id
      AND shared_trips.shared_with_user_id = auth.uid()
    )
  );

-- Step 3: Keep DELETE policy as owner-only (only creator can delete trips)
-- First drop existing policy
DROP POLICY IF EXISTS "Users can delete their own trips" ON trips;

-- Recreate DELETE policy - only owners can delete
CREATE POLICY "Users can delete their own trips"
  ON trips
  FOR DELETE
  USING (auth.uid() = user_id);

-- Step 4: Keep SELECT policy permissive (needed for sharing to work)
-- This should already be in place from the previous fix
DROP POLICY IF EXISTS "Users can view trips" ON trips;

CREATE POLICY "Users can view trips"
  ON trips
  FOR SELECT
  USING (true);

-- Step 5: Verify all policies
SELECT
  tablename,
  policyname,
  cmd,
  CASE
    WHEN cmd = 'SELECT' THEN '✅ Can view any trip (needed for sharing)'
    WHEN cmd = 'UPDATE' THEN '✅ Owner OR shared user can edit (collaborative)'
    WHEN cmd = 'DELETE' THEN '🔒 Only owner can delete (creator protection)'
  END as description
FROM pg_policies
WHERE tablename = 'trips'
ORDER BY cmd;

-- ============================================
-- IMPORTANT NOTES:
-- ============================================
-- 1. The is_read_only column in shared_trips is now effectively ignored
--    since RLS policies determine who can edit
--
-- 2. Anyone who adds a trip to their shared_trips can edit it
--
-- 3. Only the original creator (user_id) can delete the trip
--
-- 4. Changes made by any shared user are reflected for everyone
--    who has access to the trip
--
-- 5. To revoke edit access, remove the entry from shared_trips table
-- ============================================
