# Quickstart: Daily Mood Logging Testing Scenarios

## Prerequisites
1. Application server running on `http://localhost:3000`
2. Database initialized with mood_entries table
3. Frontend accessible via web browser

## Test Scenario 1: First-Time User Experience

### Steps
1. **Open Application**
   - Navigate to `http://localhost:3000`
   - Verify today's date is displayed
   - Verify no existing mood entry is shown

2. **Select Mood Emoji**
   - Click on "😊" emoji
   - Verify emoji is highlighted/selected
   - Verify save button becomes enabled

3. **Add Optional Note**
   - Type "First time using this app!" in note field
   - Verify character count updates
   - Verify note is captured

4. **Save Entry**
   - Click "Save" button
   - Verify success message appears
   - Verify API call: `POST /api/moods` with correct data
   - Verify response contains saved entry with timestamps

### Expected Results
- Mood entry saved successfully
- UI updates to show saved state
- Database contains new entry for today

---

## Test Scenario 2: Update Existing Entry

### Steps
1. **View Existing Entry**
   - Open application (assuming previous entry exists)
   - Verify today's entry is loaded and displayed
   - Verify correct emoji and note are shown

2. **Modify Mood**
   - Change emoji selection from "😊" to "😄"
   - Verify new emoji is highlighted
   - Update note to "Changed my mind - feeling even better!"

3. **Save Update**
   - Click "Save" button
   - Verify update confirmation message
   - Verify API call: `POST /api/moods` updates existing entry

### Expected Results
- Entry updated in database
- Updated timestamp reflects change
- UI shows current state

---

## Test Scenario 3: View Mood History

### Steps
1. **Access History View**
   - Click "View History" or similar navigation
   - Verify API call: `GET /api/moods`
   - Verify entries are displayed in reverse chronological order

2. **Browse Past Entries**
   - Scroll through previous entries
   - Verify each entry shows date, emoji, and note
   - Verify dates are formatted correctly

3. **Navigate Back**
   - Return to today's entry view
   - Verify current day's entry is still accessible

### Expected Results
- History loads within constitutional performance budget (<500ms)
- All entries display correctly
- Navigation works smoothly

---

## Test Scenario 4: Offline Functionality

### Steps
1. **Disconnect Network**
   - Disable internet connection
   - Keep application open

2. **Create Mood Entry**
   - Select emoji "😐"
   - Add note "Testing offline mode"
   - Click save

3. **Verify Offline Storage**
   - Verify entry is saved to local storage
   - Verify UI indicates offline mode
   - Verify no network errors displayed

4. **Reconnect and Sync**
   - Re-enable internet connection
   - Verify automatic sync occurs
   - Verify API call: `POST /api/moods` sends stored data

### Expected Results
- Offline functionality works seamlessly
- Data integrity maintained
- Sync completes successfully when online

---

## Test Scenario 5: Validation and Error Handling

### Steps
1. **Test Empty Emoji**
   - Try to save without selecting emoji
   - Verify validation error message
   - Verify save button remains disabled

2. **Test Long Note**
   - Enter note longer than 500 characters
   - Verify character limit enforcement
   - Verify appropriate error message

3. **Test Network Error**
   - Simulate server unavailability
   - Attempt to save entry
   - Verify error handling and user feedback

### Expected Results
- All validation rules enforced
- Clear error messages displayed
- Application remains stable

---

## Performance Validation

### Metrics to Verify
- **Mood Entry Save**: < 100ms (constitutional requirement)
- **History Loading**: < 500ms (constitutional requirement)
- **Database Queries**: < 50ms (research decision)
- **Memory Usage**: < 200MB (constitutional requirement)

### Tools
- Browser DevTools Network tab for timing
- Performance API for measurement
- SQLite query analysis for database performance

---

## Accessibility Testing

### Manual Checks
1. **Keyboard Navigation**
   - Tab through all interactive elements
   - Verify focus indicators
   - Test Enter/Space key activation

2. **Screen Reader Compatibility**
   - Use VoiceOver (macOS) or NVDA (Windows)
   - Verify emoji descriptions are read
   - Verify form labels are properly associated

3. **Color Contrast**
   - Verify text meets WCAG AA standards
   - Test with high contrast mode
   - Verify emoji visibility

### Expected Results
- Full keyboard accessibility
- Screen reader compatibility
- Constitutional accessibility compliance

---

## Success Criteria

✅ All test scenarios pass without errors  
✅ Performance metrics meet constitutional requirements  
✅ Accessibility standards are met  
✅ Data persistence works correctly  
✅ Offline functionality operates as expected  
✅ Error handling is user-friendly  
✅ UI/UX is intuitive and consistent