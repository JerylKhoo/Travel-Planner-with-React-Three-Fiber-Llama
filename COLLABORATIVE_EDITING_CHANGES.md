# Collaborative Trip Editing Implementation

## Overview
This document describes the changes made to enable collaborative editing of shared trips. Anyone who has a trip ID can now edit the trip directly, and changes are reflected across all users who have access to that trip.

---

## Changes Summary

### Database Changes (Supabase)

**File:** `enable_collaborative_editing.sql`

#### Updated RLS Policies:

1. **SELECT Policy** (unchanged)
   - Policy Name: `"Users can view trips"`
   - Allows: Anyone can view any trip
   - Reason: Required for sharing feature to work

2. **UPDATE Policy** (CHANGED)
   - Policy Name: `"Users can update trips they own or have shared access to"`
   - **Old Behavior:** Only trip owner (`user_id`) could edit
   - **New Behavior:** Owner OR anyone with trip in their `shared_trips` table can edit
   - SQL Logic:
     ```sql
     auth.uid() = user_id
     OR
     EXISTS (
       SELECT 1 FROM shared_trips
       WHERE shared_trips.trip_id = trips.trip_id
       AND shared_trips.shared_with_user_id = auth.uid()
     )
     ```

3. **DELETE Policy** (unchanged)
   - Policy Name: `"Users can delete their own trips"`
   - Allows: Only trip owner can delete
   - Reason: Prevent shared users from deleting trips they don't own

---

### Frontend Changes

#### 1. MyTrips.jsx
**File:** `Frontend/src/Components/Trips/MyTrips.jsx`

**Changes Made:**
- **Lines 434-466:** Restructured button layout
  - **Edit button** now appears for ALL users (owner and shared)
  - **Copy Trip ID & Delete buttons** only for trip owner
  - **Remove from My Trips button** only for shared users

**Button Logic:**
```javascript
// Everyone can edit
<button className="btn-edit" onClick={() => handleEditTrip(trip.trip_id)}>
  Edit
</button>

// Only owner can share and delete
{trip.user_id === userId ? (
  <>
    <button className="btn-share">Copy Trip ID</button>
    <button className="btn-delete">Delete</button>
  </>
) : (
  <button className="btn-remove">Remove from My Trips</button>
)}
```

**Visual Result:**
- **Owner sees:** Edit | Copy Trip ID | Delete
- **Shared user sees:** Edit | Remove from My Trips

---

#### 2. TripEditor.jsx
**File:** `Frontend/src/Components/TripEditor/TripEditor.jsx`

**Changes Made:**

1. **Added State Management:**
   - `saving` state for save button loading
   - `handleInputChange` function for form updates

2. **Implemented Save Functionality:**
   ```javascript
   const handleSaveTrip = async () => {
     const { error } = await supabase
       .from('trips')
       .update({
         destination: trip.destination,
         origin: trip.origin,
         start_date: trip.start_date,
         end_date: trip.end_date,
         travellers: trip.travellers,
         status: trip.status,
         itinerary: trip.itinerary
       })
       .eq('trip_id', selectedTrip);
   }
   ```

3. **Removed Read-Only Restrictions:**
   - Removed `disabled={!isOwner}` from all input fields
   - All users can now edit fields
   - Removed read-only warning message
   - Changed banner text to: "Collaborative Trip - Changes are visible to everyone with access"

4. **Enhanced Form Fields:**
   - Added Start Date input
   - Added End Date input
   - Added Number of Travellers input
   - Added Status dropdown (upcoming/completed/cancelled)
   - All fields are now editable with proper onChange handlers

---

## How It Works

### User Flow:

1. **Trip Owner Creates Trip:**
   - Creates trip in TripPlanner
   - Trip stored in database with their `user_id`
   - Gets trip ID to share

2. **Owner Shares Trip:**
   - Clicks "Copy Trip ID" button in MyTrips
   - Shares trip ID with friends

3. **Friend Adds Shared Trip:**
   - Clicks "Find a Trip" button
   - Pastes trip ID
   - Entry created in `shared_trips` table linking their user ID to the trip

4. **Collaborative Editing:**
   - Both owner and friend see "Edit" button
   - Clicking Edit opens TripEditor
   - Both can modify: destination, origin, dates, travellers, status, itinerary
   - Clicking "Save Changes" updates the trip in database
   - Changes immediately visible to everyone with access

5. **Permissions:**
   - **Can Edit:** Owner + all shared users
   - **Can Delete:** Owner only
   - **Can Share:** Owner only
   - **Can Remove from List:** Shared users only

---

## Security Considerations

1. **RLS Policy Protection:**
   - Edit access controlled at database level via RLS policies
   - Even if frontend is bypassed, database enforces rules

2. **Trip ID Security:**
   - Trip IDs are UUIDs (128-bit random)
   - Unguessable without sharing
   - No browse/list feature in frontend

3. **Deletion Protection:**
   - Only original creator can delete trips
   - Shared users can only remove from their own list
   - Cascade deletion handles cleanup of `shared_trips` entries

4. **Access Revocation:**
   - Remove entry from `shared_trips` table to revoke access
   - User immediately loses edit permissions

---

## Migration Steps

To enable collaborative editing in your Supabase instance:

### Step 1: Run SQL Script
```bash
# In Supabase SQL Editor, run:
enable_collaborative_editing.sql
```

### Step 2: Verify Policies
```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'trips'
ORDER BY cmd;
```

Expected output:
- `Users can view trips` (SELECT)
- `Users can update trips they own or have shared access to` (UPDATE)
- `Users can delete their own trips` (DELETE)

### Step 3: Test the Feature
1. Login as User A
2. Create a trip
3. Copy trip ID
4. Login as User B
5. Find trip using trip ID
6. Click Edit on the shared trip
7. Modify itinerary
8. Save changes
9. Login back as User A
10. Verify changes are visible

---

## Rollback Instructions

If you need to revert to read-only sharing:

```sql
-- Restore owner-only UPDATE policy
DROP POLICY IF EXISTS "Users can update trips they own or have shared access to" ON trips;

CREATE POLICY "Users can update their own trips"
  ON trips
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

Then revert frontend changes:
- [MyTrips.jsx:434-466](Frontend/src/Components/Trips/MyTrips.jsx#L434-L466): Show Edit only for owners
- [TripEditor.jsx:106-201](Frontend/src/Components/TripEditor/TripEditor.jsx#L106-L201): Add back `disabled={!isOwner}`

---

## Benefits of Collaborative Editing

1. **Real-time Collaboration:**
   - Friends can plan together
   - Updates visible immediately

2. **Shared Responsibility:**
   - Multiple people can contribute
   - Distribute planning workload

3. **Synchronized Information:**
   - Single source of truth
   - No conflicting versions

4. **Flexible Ownership:**
   - Original creator retains control (delete rights)
   - Shared users can contribute content

---

## Known Limitations

1. **No Conflict Resolution:**
   - Last write wins
   - No merge conflict handling
   - Users should coordinate edits

2. **No Edit History:**
   - Changes overwrite previous values
   - No audit trail of who changed what
   - Consider adding versioning in future

3. **No Real-time Updates:**
   - Changes only visible after page refresh
   - Consider adding WebSocket/real-time subscriptions

4. **No Notification System:**
   - Users not notified when trip is edited
   - Consider adding email/push notifications

---

## Future Enhancements

1. **Real-time Sync:**
   - Use Supabase Realtime to broadcast changes
   - Auto-refresh when trip is updated by others

2. **Edit History:**
   - Track who made changes and when
   - Add rollback capability

3. **Conflict Detection:**
   - Warn users if editing simultaneously
   - Implement optimistic locking

4. **Granular Permissions:**
   - Add permission levels (view/edit/admin)
   - Allow owner to restrict edit access

5. **Activity Feed:**
   - Show recent edits
   - Display who edited what field

---

## Files Modified

1. `enable_collaborative_editing.sql` (NEW)
   - SQL script to update RLS policies

2. `Frontend/src/Components/Trips/MyTrips.jsx`
   - Lines 434-466: Button layout restructure

3. `Frontend/src/Components/TripEditor/TripEditor.jsx`
   - Lines 16: Added `saving` state
   - Lines 49-83: Added `handleSaveTrip` and `handleInputChange`
   - Lines 97-204: Removed read-only restrictions, added form fields

4. `COLLABORATIVE_EDITING_CHANGES.md` (NEW)
   - This documentation file

---

## Support

For issues or questions:
1. Check Supabase logs for RLS policy errors
2. Verify user is logged in (auth.uid() must be valid)
3. Confirm trip exists in `shared_trips` for shared users
4. Test with browser console open to see error messages

---

**Last Updated:** 2025-11-04
**Version:** 1.0
