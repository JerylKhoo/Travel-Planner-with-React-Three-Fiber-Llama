# Testing Collaborative Editing Feature

## Test Environment
- **Frontend URL:** http://localhost:5175/
- **Database:** Supabase (RLS policies updated ✅)
- **Status:** Ready to test

---

## Pre-Test Checklist

✅ **Database Setup:**
- RLS policies updated in Supabase
- SELECT policy: ✅ "Users can view trips"
- UPDATE policy: ✅ "Users can update trips they own or have shared access to"
- DELETE policy: ✅ "Users can delete their own trips"
- INSERT policy: ✅ "Users can insert their own trips"

✅ **Frontend Setup:**
- MyTrips.jsx updated with Edit button for all users
- TripEditor.jsx updated with collaborative editing
- Development server running on port 5175

---

## Test Scenarios

### Test 1: Owner Creates and Edits Trip
**Goal:** Verify trip owner can create and edit their own trip

**Steps:**
1. Open http://localhost:5175/
2. Login as User A (mattlkz1803@gmail.com or your test account)
3. Navigate to "My Trips"
4. Verify you see your existing trips
5. Click "Edit" on any trip
6. Modify some fields (destination, itinerary, etc.)
7. Click "Save Changes"
8. Verify success message appears
9. Go back to "My Trips"
10. Click "Edit" again and verify changes persisted

**Expected Result:**
- ✅ Owner can edit their trip
- ✅ Changes save successfully
- ✅ See "Copy Trip ID" and "Delete" buttons

---

### Test 2: Owner Shares Trip ID
**Goal:** Verify owner can copy trip ID to share

**Steps:**
1. Still logged in as User A
2. In "My Trips", locate a trip you want to share
3. Click "Copy Trip ID" button
4. Verify alert: "Trip ID copied! Share it with your friends."
5. Paste the Trip ID somewhere (notepad, etc.) - you'll need it for Test 3

**Expected Result:**
- ✅ Trip ID copied to clipboard
- ✅ Trip ID is a UUID format (e.g., 01198160-8eb9-4ad3-9e89-c143e91534ef)

---

### Test 3: Friend Adds Shared Trip
**Goal:** Verify another user can find and add a shared trip

**Steps:**
1. **Logout** from User A
2. **Login** as User B (different account - create new account if needed)
3. Navigate to "My Trips"
4. Click "Find a Trip" button
5. Paste the Trip ID you copied in Test 2
6. Click "Add Trip"
7. Verify success message: "Trip added successfully!"
8. Verify the shared trip now appears in your trip list
9. Look for the badge: "Shared with You"

**Expected Result:**
- ✅ Trip added to User B's list
- ✅ Badge shows "Shared with You" (not "Created by You")
- ✅ Trip details match the original

---

### Test 4: Friend Can Edit Shared Trip (KEY TEST)
**Goal:** Verify collaborative editing works - User B can edit User A's trip

**Steps:**
1. Still logged in as User B
2. In "My Trips", find the shared trip
3. Verify you see "Edit" button
4. Click "Edit" button
5. Verify banner says: "Collaborative Trip - Changes are visible to everyone with access"
6. Modify the itinerary field (add some text like "User B was here!")
7. Modify destination or origin
8. Change travellers number
9. Click "Save Changes"
10. Verify success message: "Trip updated successfully! Changes are visible to everyone with access."

**Expected Result:**
- ✅ User B can edit the shared trip
- ✅ All fields are editable (not disabled)
- ✅ Save button works
- ✅ No errors in browser console

---

### Test 5: Owner Sees Friend's Changes
**Goal:** Verify changes made by shared user are visible to owner

**Steps:**
1. **Logout** from User B
2. **Login** back as User A (original owner)
3. Navigate to "My Trips"
4. Find the trip you shared
5. Click "Edit" button
6. Verify you see the changes User B made:
   - Itinerary contains "User B was here!"
   - Destination/origin changes visible
   - Travellers number updated

**Expected Result:**
- ✅ User A sees all changes made by User B
- ✅ Changes are synchronized
- ✅ Data is consistent

---

### Test 6: Friend Cannot Delete Owner's Trip
**Goal:** Verify only owner can delete trips

**Steps:**
1. **Login** as User B (shared user)
2. Navigate to "My Trips"
3. Find the shared trip
4. Verify you see:
   - "Edit" button ✅
   - "Remove from My Trips" button ✅
   - **NO "Delete" button** ✅
   - **NO "Copy Trip ID" button** ✅

**Expected Result:**
- ✅ Shared user cannot delete the trip
- ✅ Shared user can only remove from their own list
- ✅ Only owner has access to "Delete" button

---

### Test 7: Friend Removes Trip from List
**Goal:** Verify shared user can remove trip from their list without deleting it

**Steps:**
1. Still logged in as User B
2. In "My Trips", find the shared trip
3. Click "Remove from My Trips" button
4. Confirm the action
5. Verify alert: "Trip removed from your list"
6. Verify trip disappears from User B's trip list

**Now verify trip still exists for owner:**
7. **Logout** from User B
8. **Login** as User A (owner)
9. Navigate to "My Trips"
10. Verify the trip is still there
11. Verify you can still edit it

**Expected Result:**
- ✅ Trip removed from User B's list
- ✅ Trip still exists for User A
- ✅ Trip not deleted from database

---

### Test 8: Only Owner Can Delete Trip
**Goal:** Verify delete functionality is owner-only

**Steps:**
1. Still logged in as User A (owner)
2. In "My Trips", find any of your trips
3. Click "Delete" button
4. Confirm deletion
5. Verify trip is removed from your list
6. Try to navigate to "Edit" - should not be possible
7. Check database - trip should be deleted

**Expected Result:**
- ✅ Owner can delete their trips
- ✅ Trip removed from database
- ✅ Cascade deletion removes entries from shared_trips table

---

### Test 9: Multiple Shared Users Editing
**Goal:** Verify multiple users can collaborate on same trip

**Steps:**
1. **Login** as User A (owner)
2. Create a new trip or use existing one
3. Copy trip ID
4. Share with User B and User C (if you have a third account)
5. Have User B add the trip and make edit 1 (change destination)
6. Have User C add the trip and make edit 2 (change itinerary)
7. User A checks trip - should see both changes

**Expected Result:**
- ✅ Multiple users can access same trip
- ✅ All changes are visible to all users
- ✅ Last write wins (no conflict resolution)

---

### Test 10: Button Layout Verification
**Goal:** Verify buttons are uniformly styled without emojis

**Visual Checks:**
1. In "My Trips", check owned trip buttons:
   - "Edit" (blue, solid)
   - "Copy Trip ID" (blue, solid)
   - "Delete" (red, outline)
   - No emojis in button text ✅

2. Check shared trip buttons:
   - "Edit" (blue, solid)
   - "Remove from My Trips" (red, outline)
   - No emojis in button text ✅

3. Check badges:
   - "Created by You" (no ✓ emoji)
   - "Shared with You" (no 📤 emoji)
   - "Upcoming Trip" (no 🗓️ emoji)

**Expected Result:**
- ✅ All buttons have consistent styling
- ✅ No emojis in any button text
- ✅ Blue theme for primary actions
- ✅ Red theme for destructive actions

---

## Browser Console Checks

During testing, keep browser console open (F12) and check for:

### Should NOT see:
- ❌ RLS policy errors
- ❌ "permission denied" errors
- ❌ Failed UPDATE queries
- ❌ Network errors (500, 403, etc.)

### Should see:
- ✅ Successful UPDATE queries (status 200)
- ✅ Successful SELECT queries
- ✅ Clean console with no errors

---

## Database Verification

After testing, verify in Supabase:

### Check trips table:
```sql
SELECT trip_id, user_id, destination, origin, itinerary
FROM trips
WHERE trip_id = 'YOUR_TEST_TRIP_ID';
```
- ✅ Changes made by User B should be saved
- ✅ user_id should still be User A's ID (owner unchanged)

### Check shared_trips table:
```sql
SELECT trip_id, shared_with_user_id, shared_at
FROM shared_trips
WHERE trip_id = 'YOUR_TEST_TRIP_ID';
```
- ✅ Should see entry for User B
- ✅ If User B removed trip, entry should be gone

---

## Known Issues to Watch For

1. **Permission Errors:**
   - If you see "permission denied for table trips"
   - RLS policies may not be applied correctly
   - Re-run enable_collaborative_editing.sql

2. **Trip Not Found:**
   - If shared user gets "Trip not found"
   - Check if SELECT policy allows viewing any trip
   - Verify trip_id is correct UUID

3. **Cannot Save Changes:**
   - If save fails for shared user
   - Check UPDATE policy includes shared_trips check
   - Verify user has entry in shared_trips table

4. **Button Not Showing:**
   - If Edit button missing for shared user
   - Clear browser cache
   - Check MyTrips.jsx changes are deployed

---

## Success Criteria

All tests should pass:
- ✅ Owner can create, edit, delete trips
- ✅ Owner can share trip IDs
- ✅ Friend can add shared trip
- ✅ **Friend can edit shared trip (KEY FEATURE)**
- ✅ Changes by friend visible to owner
- ✅ Friend cannot delete owner's trip
- ✅ Friend can remove trip from their list
- ✅ Multiple users can collaborate
- ✅ Buttons styled uniformly without emojis
- ✅ No errors in console

---

## Troubleshooting

### Issue: "Permission denied" when saving
**Solution:**
```sql
-- Verify RLS policy
SELECT * FROM pg_policies WHERE tablename = 'trips' AND cmd = 'UPDATE';
-- Should show policy that includes shared_trips check
```

### Issue: Changes not visible to other users
**Solution:**
- Refresh the page
- Check if both users are looking at same trip_id
- Verify save operation completed successfully

### Issue: Edit button not showing for shared user
**Solution:**
- Check browser console for errors
- Verify MyTrips.jsx has latest code
- Clear browser cache and reload

---

## Test Report Template

After testing, fill this out:

**Test Date:** _____________

**Tester:** _____________

**Browser:** _____________

| Test # | Test Name | Status | Notes |
|--------|-----------|--------|-------|
| 1 | Owner Creates/Edits | ⬜ Pass / ⬜ Fail | |
| 2 | Owner Shares Trip ID | ⬜ Pass / ⬜ Fail | |
| 3 | Friend Adds Shared Trip | ⬜ Pass / ⬜ Fail | |
| 4 | Friend Can Edit Shared Trip | ⬜ Pass / ⬜ Fail | |
| 5 | Owner Sees Friend's Changes | ⬜ Pass / ⬜ Fail | |
| 6 | Friend Cannot Delete | ⬜ Pass / ⬜ Fail | |
| 7 | Friend Removes from List | ⬜ Pass / ⬜ Fail | |
| 8 | Owner Can Delete | ⬜ Pass / ⬜ Fail | |
| 9 | Multiple Users Editing | ⬜ Pass / ⬜ Fail | |
| 10 | Button Layout | ⬜ Pass / ⬜ Fail | |

**Overall Result:** ⬜ All Pass / ⬜ Some Failures

**Issues Found:**
_____________________________________________
_____________________________________________

**Additional Comments:**
_____________________________________________
_____________________________________________

---

**Ready to start testing!** 🚀

Open http://localhost:5175/ and begin with Test 1.
