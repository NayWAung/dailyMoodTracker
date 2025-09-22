const request = require('supertest');
const { SecureDatabase } = require('../../backend/src/database/secure');
const { PerformanceMonitor } = require('../../backend/src/utils/performance');

// THIS TEST MUST FAIL - No implementation exists yet
describe('Integration Test: Update Existing Entry', () => {
  let app;
  let db;
  let monitor;

  beforeAll(async () => {
    // This will fail because the app doesn't exist yet
    const { createApp } = require('../../backend/src/server');
    app = createApp();
    
    db = new SecureDatabase();
    await db.connect();
    await db.initializeSchema();
    
    monitor = new PerformanceMonitor();
  });

  afterAll(async () => {
    if (db) {
      await db.disconnect();
    }
  });

  beforeEach(async () => {
    // Clean and seed with test data
    await db.run('DELETE FROM mood_entries');
    
    // Create existing entries to update
    await db.run(
      'INSERT INTO mood_entries (date, emoji, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      ['2025-09-22', '😐', 'Original neutral mood', '2025-09-22T09:00:00Z', '2025-09-22T09:00:00Z']
    );
    await db.run(
      'INSERT INTO mood_entries (date, emoji, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      ['2025-09-21', '😊', 'Good day initially', '2025-09-21T10:00:00Z', '2025-09-21T10:00:00Z']
    );
  });

  describe('Update Existing Entry Flow', () => {
    it('should handle complete mood update workflow', async () => {
      // 1. Get original entry to verify baseline
      const originalResponse = await request(app)
        .get('/api/moods/2025-09-22')
        .expect(200);

      expect(originalResponse.body).toMatchObject({
        date: '2025-09-22',
        emoji: '😐',
        note: 'Original neutral mood'
      });

      const originalUpdatedAt = originalResponse.body.updated_at;

      // 2. Update the mood entry (simulated by DELETE + POST since no PUT endpoint in spec)
      // First delete existing entry
      const deleteResponse = await request(app)
        .delete('/api/moods/2025-09-22')
        .expect(200);

      expect(deleteResponse.body.deleted).toBe(true);

      // 3. Create updated entry
      const updatedMoodData = {
        date: '2025-09-22',
        emoji: '😄',
        note: 'Actually turned into a great day! Mood improved significantly.'
      };

      const timer = monitor.startTimer('mood_entry');
      
      const createResponse = await request(app)
        .post('/api/moods')
        .send(updatedMoodData)
        .expect(201);

      monitor.endTimer(timer);
      expect(monitor.validateBudget(timer, 'mood_entry')).toBe(true);

      // 4. Verify the update was successful
      expect(createResponse.body).toMatchObject({
        date: '2025-09-22',
        emoji: '😄',
        note: 'Actually turned into a great day! Mood improved significantly.'
      });

      // 5. Verify updated entry can be retrieved
      const updatedResponse = await request(app)
        .get('/api/moods/2025-09-22')
        .expect(200);

      expect(updatedResponse.body).toMatchObject(updatedMoodData);
      expect(updatedResponse.body.updated_at).not.toBe(originalUpdatedAt);

      // 6. Verify it appears correctly in mood history
      const historyResponse = await request(app)
        .get('/api/moods')
        .expect(200);

      const todayEntry = historyResponse.body.moods.find(m => m.date === '2025-09-22');
      expect(todayEntry).toMatchObject(updatedMoodData);
    });

    it('should handle updating mood emoji only', async () => {
      // Update just the emoji, keep the same note
      await request(app)
        .delete('/api/moods/2025-09-21')
        .expect(200);

      const emojiUpdateData = {
        date: '2025-09-21',
        emoji: '😍',
        note: 'Good day initially' // Keep same note
      };

      const response = await request(app)
        .post('/api/moods')
        .send(emojiUpdateData)
        .expect(201);

      expect(response.body.emoji).toBe('😍');
      expect(response.body.note).toBe('Good day initially');
    });

    it('should handle updating note only', async () => {
      // Update just the note, keep the same emoji
      await request(app)
        .delete('/api/moods/2025-09-21')
        .expect(200);

      const noteUpdateData = {
        date: '2025-09-21',
        emoji: '😊', // Keep same emoji
        note: 'Updated: The day kept getting better and better!'
      };

      const response = await request(app)
        .post('/api/moods')
        .send(noteUpdateData)
        .expect(201);

      expect(response.body.emoji).toBe('😊');
      expect(response.body.note).toBe('Updated: The day kept getting better and better!');
    });

    it('should handle removing note from existing entry', async () => {
      // Remove note entirely (set to null)
      await request(app)
        .delete('/api/moods/2025-09-21')
        .expect(200);

      const removeNoteData = {
        date: '2025-09-21',
        emoji: '😊'
        // note intentionally omitted
      };

      const response = await request(app)
        .post('/api/moods')
        .send(removeNoteData)
        .expect(201);

      expect(response.body.emoji).toBe('😊');
      expect(response.body.note).toBeNull();
    });
  });

  describe('Update Validation and Error Handling', () => {
    it('should validate updated data meets same constraints', async () => {
      // Delete existing entry
      await request(app)
        .delete('/api/moods/2025-09-22')
        .expect(200);

      // Try to update with invalid emoji
      const invalidUpdateData = {
        date: '2025-09-22',
        emoji: '🤖',
        note: 'Invalid emoji in update'
      };

      const errorResponse = await request(app)
        .post('/api/moods')
        .send(invalidUpdateData)
        .expect(400);

      expect(errorResponse.body.error).toContain('emoji');

      // Verify entry was not created
      await request(app)
        .get('/api/moods/2025-09-22')
        .expect(404);
    });

    it('should validate note length constraints on update', async () => {
      await request(app)
        .delete('/api/moods/2025-09-22')
        .expect(200);

      const longNote = 'x'.repeat(501);
      const invalidUpdateData = {
        date: '2025-09-22',
        emoji: '😊',
        note: longNote
      };

      await request(app)
        .post('/api/moods')
        .send(invalidUpdateData)
        .expect(400);
    });

    it('should handle update attempts on non-existent entries gracefully', async () => {
      // Try to update entry that doesn't exist
      const response = await request(app)
        .delete('/api/moods/2025-12-25')
        .expect(404);

      expect(response.body.error).toContain('not found');
      expect(response.body.deleted).toBe(false);
    });
  });

  describe('Update Performance Requirements', () => {
    it('should meet constitutional performance budgets for updates', async () => {
      // Delete operation performance
      const deleteTimer = monitor.startTimer('mood_entry');
      await request(app)
        .delete('/api/moods/2025-09-22')
        .expect(200);
      monitor.endTimer(deleteTimer);
      expect(monitor.validateBudget(deleteTimer, 'mood_entry')).toBe(true);

      // Create operation performance (part of update flow)
      const createTimer = monitor.startTimer('mood_entry');
      await request(app)
        .post('/api/moods')
        .send({
          date: '2025-09-22',
          emoji: '😄',
          note: 'Performance test update'
        })
        .expect(201);
      monitor.endTimer(createTimer);
      expect(monitor.validateBudget(createTimer, 'mood_entry')).toBe(true);

      // Total update time should be reasonable (both operations combined)
      const totalUpdateTime = deleteTimer.duration + createTimer.duration;
      expect(totalUpdateTime).toBeLessThan(200); // Both operations under 200ms total
    });
  });

  describe('Update History and Timestamps', () => {
    it('should maintain proper chronological order after updates', async () => {
      // Create a third entry to test ordering
      await request(app)
        .post('/api/moods')
        .send({
          date: '2025-09-23',
          emoji: '😢',
          note: 'New entry after existing ones'
        })
        .expect(201);

      // Update middle entry
      await request(app)
        .delete('/api/moods/2025-09-22')
        .expect(200);

      await request(app)
        .post('/api/moods')
        .send({
          date: '2025-09-22',
          emoji: '😍',
          note: 'Updated middle entry'
        })
        .expect(201);

      // Verify chronological order is maintained
      const historyResponse = await request(app)
        .get('/api/moods')
        .expect(200);

      const dates = historyResponse.body.moods.map(m => m.date);
      expect(dates).toEqual(['2025-09-23', '2025-09-22', '2025-09-21']);

      // Verify updated entry content
      const updatedEntry = historyResponse.body.moods.find(m => m.date === '2025-09-22');
      expect(updatedEntry.emoji).toBe('😍');
      expect(updatedEntry.note).toBe('Updated middle entry');
    });

    it('should handle updates preserving data integrity', async () => {
      // Get original entry count
      const beforeResponse = await request(app)
        .get('/api/moods')
        .expect(200);
      const originalCount = beforeResponse.body.total;

      // Perform update
      await request(app)
        .delete('/api/moods/2025-09-21')
        .expect(200);

      await request(app)
        .post('/api/moods')
        .send({
          date: '2025-09-21',
          emoji: '😄',
          note: 'Completely rewritten entry'
        })
        .expect(201);

      // Verify total count is unchanged
      const afterResponse = await request(app)
        .get('/api/moods')
        .expect(200);
      expect(afterResponse.body.total).toBe(originalCount);

      // Verify all other entries are unchanged
      const unchangedEntry = afterResponse.body.moods.find(m => m.date === '2025-09-22');
      expect(unchangedEntry.emoji).toBe('😐');
      expect(unchangedEntry.note).toBe('Original neutral mood');
    });
  });

  describe('Complex Update Scenarios', () => {
    it('should handle rapid successive updates', async () => {
      const updates = [
        { emoji: '😢', note: 'First update - feeling down' },
        { emoji: '😐', note: 'Second update - getting neutral' },
        { emoji: '😊', note: 'Third update - feeling better' },
        { emoji: '😄', note: 'Final update - great mood!' }
      ];

      for (const update of updates) {
        // Delete then recreate for each update
        await request(app)
          .delete('/api/moods/2025-09-22')
          .expect(200);

        await request(app)
          .post('/api/moods')
          .send({
            date: '2025-09-22',
            ...update
          })
          .expect(201);
      }

      // Verify final state
      const finalResponse = await request(app)
        .get('/api/moods/2025-09-22')
        .expect(200);

      expect(finalResponse.body.emoji).toBe('😄');
      expect(finalResponse.body.note).toBe('Final update - great mood!');
    });

    it('should handle update with data encryption/privacy requirements', async () => {
      const sensitiveUpdate = {
        date: '2025-09-22',
        emoji: '😢',
        note: 'Very private updated thoughts about personal struggles and confidential matters.'
      };

      await request(app)
        .delete('/api/moods/2025-09-22')
        .expect(200);

      await request(app)
        .post('/api/moods')
        .send(sensitiveUpdate)
        .expect(201);

      // Verify sensitive data is properly stored and retrievable
      const retrieveResponse = await request(app)
        .get('/api/moods/2025-09-22')
        .expect(200);

      expect(retrieveResponse.body.note).toBe(sensitiveUpdate.note);

      // Verify database encryption is transparent to application
      const directDbQuery = await db.get('SELECT * FROM mood_entries WHERE date = ?', ['2025-09-22']);
      expect(directDbQuery.note).toBe(sensitiveUpdate.note);
    });
  });
});