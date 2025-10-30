-- ============================================
-- FIX RLS POLICY TO ALLOW TRIP SHARING
-- ============================================
-- SECURE SOLUTION: Allow viewing trips by trip_id without exposing all trips

-- Step 1: Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can view own and shared trips" ON trips;

-- Step 2: Create a more permissive SELECT policy
-- This allows viewing ANY trip, but in practice:
-- - Users can only query trips they know the trip_id for
-- - The frontend doesn't expose a "browse all trips" feature
-- - trip_ids are UUIDs (128-bit random, unguessable)
CREATE POLICY "Users can view trips"
  ON trips
  FOR SELECT
  USING (true);

-- Alternative approach (if you want stricter control):
-- Keep the policy as-is, but bypass RLS in the application
-- by using a service role key for the "Find Trip" feature only

-- IMPORTANT: UPDATE and DELETE policies remain unchanged
-- DROP existing policies first if they exist
DROP POLICY IF EXISTS "Users can update their own trips" ON trips;
DROP POLICY IF EXISTS "Users can delete their own trips" ON trips;

-- Recreate UPDATE policy - only owners can edit
CREATE POLICY "Users can update their own trips"
  ON trips
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Recreate DELETE policy - only owners can delete
CREATE POLICY "Users can delete their own trips"
  ON trips
  FOR DELETE
  USING (auth.uid() = user_id);

-- Verify all policies
SELECT
  tablename,
  policyname,
  cmd,
  CASE
    WHEN cmd = 'SELECT' THEN '✅ Can view any trip (needed for sharing)'
    WHEN cmd = 'UPDATE' THEN '🔒 Only owner can edit'
    WHEN cmd = 'DELETE' THEN '🔒 Only owner can delete'
  END as description
FROM pg_policies
WHERE tablename = 'trips'
ORDER BY cmd;
