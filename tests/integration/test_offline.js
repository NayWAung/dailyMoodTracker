const request = require('supertest');
const { SecureDatabase } = require('../../backend/src/database/secure');

// THIS TEST MUST FAIL - No implementation exists yet
describe('Integration Test: Offline Functionality', () => {
  let app;
  let db;

  beforeAll(async () => {
    // This will fail because the app doesn't exist yet
    const { createApp } = require('../../backend/src/server');
    app = createApp();
    
    db = new SecureDatabase();
    await db.connect();
    await db.initializeSchema();
  });

  afterAll(async () => {
    if (db) {
      await db.disconnect();
    }
  });

  beforeEach(async () => {
    // Clean database for each test
    await db.run('DELETE FROM mood_entries');
  });

  describe('Offline Data Storage and Sync', () => {
    it('should handle offline mood entry creation and sync when online', async () => {
      // Note: This test simulates offline behavior by testing local storage
      // In real implementation, frontend would store in localStorage/IndexedDB
      
      // Simulate offline data that would be stored locally
      const offlineMoodEntries = [
        {
          date: '2025-09-20',
          emoji: '😊',
          note: 'Created while offline',
          timestamp: '2025-09-20T14:30:00Z',
          syncStatus: 'pending'
        },
        {
          date: '2025-09-21',
          emoji: '😐',
          note: 'Another offline entry',
          timestamp: '2025-09-21T09:15:00Z',
          syncStatus: 'pending'
        }
      ];

      // When coming back online, these entries should be synced
      // Test sync process by creating these entries
      for (const entry of offlineMoodEntries) {
        const response = await request(app)
          .post('/api/moods')
          .send({
            date: entry.date,
            emoji: entry.emoji,
            note: entry.note
          })
          .expect(201);

        expect(response.body).toMatchObject({
          date: entry.date,
          emoji: entry.emoji,
          note: entry.note
        });
      }

      // Verify all offline entries are now synced
      const syncedResponse = await request(app)
        .get('/api/moods')
        .expect(200);

      expect(syncedResponse.body.moods).toHaveLength(2);
      expect(syncedResponse.body.total).toBe(2);

      // Verify both entries are present and correctly ordered
      const dates = syncedResponse.body.moods.map(m => m.date);
      expect(dates).toContain('2025-09-20');
      expect(dates).toContain('2025-09-21');
    });

    it('should handle offline updates and resolve conflicts on sync', async () => {
      // Create initial online entry
      const originalEntry = {
        date: '2025-09-22',
        emoji: '😊',
        note: 'Original online entry'
      };

      await request(app)
        .post('/api/moods')
        .send(originalEntry)
        .expect(201);

      // Simulate offline modification (would be stored locally)
      const offlineModification = {
        date: '2025-09-22',
        emoji: '😄',
        note: 'Modified while offline - much better mood!',
        lastSync: '2025-09-22T10:00:00Z'
      };

      // When syncing offline changes, implement "last write wins" or conflict resolution
      // For this simple app, we'll simulate by doing delete + create (update pattern)
      await request(app)
        .delete('/api/moods/2025-09-22')
        .expect(200);

      const syncResponse = await request(app)
        .post('/api/moods')
        .send({
          date: offlineModification.date,
          emoji: offlineModification.emoji,
          note: offlineModification.note
        })
        .expect(201);

      expect(syncResponse.body.emoji).toBe('😄');
      expect(syncResponse.body.note).toBe('Modified while offline - much better mood!');

      // Verify final state
      const finalResponse = await request(app)
        .get('/api/moods/2025-09-22')
        .expect(200);

      expect(finalResponse.body).toMatchObject({
        date: '2025-09-22',
        emoji: '😄',
        note: 'Modified while offline - much better mood!'
      });
    });

    it('should handle multiple offline entries with proper ordering on sync', async () => {
      // Simulate multiple days of offline usage
      const offlineEntries = [
        { date: '2025-09-18', emoji: '😢', note: 'Offline day 1' },
        { date: '2025-09-19', emoji: '😐', note: 'Offline day 2' },
        { date: '2025-09-20', emoji: '😊', note: 'Offline day 3' },
        { date: '2025-09-21', emoji: '😄', note: 'Offline day 4' },
        { date: '2025-09-22', emoji: '😍', note: 'Offline day 5, back online!' }
      ];

      // Sync all offline entries (would happen in batch on reconnection)
      for (const entry of offlineEntries) {
        await request(app)
          .post('/api/moods')
          .send(entry)
          .expect(201);
      }

      // Verify proper chronological ordering after sync
      const syncedResponse = await request(app)
        .get('/api/moods')
        .expect(200);

      expect(syncedResponse.body.moods).toHaveLength(5);
      expect(syncedResponse.body.total).toBe(5);

      // Should be ordered newest first
      const dates = syncedResponse.body.moods.map(m => m.date);
      expect(dates).toEqual(['2025-09-22', '2025-09-21', '2025-09-20', '2025-09-19', '2025-09-18']);

      // Verify all content is preserved
      const day5Entry = syncedResponse.body.moods.find(m => m.date === '2025-09-22');
      expect(day5Entry.emoji).toBe('😍');
      expect(day5Entry.note).toBe('Offline day 5, back online!');
    });
  });

  describe('Offline Data Validation and Integrity', () => {
    it('should validate offline entries on sync with same constraints', async () => {
      // Simulate invalid offline entry that should be rejected on sync
      const invalidOfflineEntry = {
        date: '2025-09-22',
        emoji: '🤖', // Invalid emoji
        note: 'Invalid offline entry'
      };

      const errorResponse = await request(app)
        .post('/api/moods')
        .send(invalidOfflineEntry)
        .expect(400);

      expect(errorResponse.body.error).toContain('emoji');

      // Verify no entry was created
      const checkResponse = await request(app)
        .get('/api/moods')
        .expect(200);

      expect(checkResponse.body.moods).toHaveLength(0);
    });

    it('should handle offline entries with note length validation', async () => {
      const longNoteEntry = {
        date: '2025-09-22',
        emoji: '😊',
        note: 'x'.repeat(501) // Over 500 character limit
      };

      await request(app)
        .post('/api/moods')
        .send(longNoteEntry)
        .expect(400);

      // Test exactly at limit (should succeed)
      const exactLimitEntry = {
        date: '2025-09-22',
        emoji: '😊',
        note: 'x'.repeat(500)
      };

      const validResponse = await request(app)
        .post('/api/moods')
        .send(exactLimitEntry)
        .expect(201);

      expect(validResponse.body.note.length).toBe(500);
    });

    it('should prevent duplicate date entries during offline sync', async () => {
      // Create initial entry
      await request(app)
        .post('/api/moods')
        .send({
          date: '2025-09-22',
          emoji: '😊',
          note: 'First entry'
        })
        .expect(201);

      // Simulate offline entry with same date (conflict scenario)
      const conflictingEntry = {
        date: '2025-09-22',
        emoji: '😄',
        note: 'Conflicting offline entry'
      };

      const conflictResponse = await request(app)
        .post('/api/moods')
        .send(conflictingEntry)
        .expect(409);

      expect(conflictResponse.body.error).toContain('already exists');
      expect(conflictResponse.body).toHaveProperty('suggestion');

      // Verify original entry is unchanged
      const originalResponse = await request(app)
        .get('/api/moods/2025-09-22')
        .expect(200);

      expect(originalResponse.body.note).toBe('First entry');
      expect(originalResponse.body.emoji).toBe('😊');
    });
  });

  describe('Offline Resilience and Edge Cases', () => {
    it('should handle sync after extended offline period', async () => {
      // Simulate 2 weeks of offline entries
      const extendedOfflineEntries = [];
      const startDate = new Date('2025-09-08');
      
      for (let i = 0; i < 14; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        extendedOfflineEntries.push({
          date: dateStr,
          emoji: ['😢', '😐', '😊', '😄', '😍'][i % 5],
          note: `Extended offline day ${i + 1}`
        });
      }

      // Sync all entries
      const syncPromises = extendedOfflineEntries.map(entry =>
        request(app)
          .post('/api/moods')
          .send(entry)
          .expect(201)
      );

      await Promise.all(syncPromises);

      // Verify all entries synced correctly
      const allEntriesResponse = await request(app)
        .get('/api/moods?limit=20')
        .expect(200);

      expect(allEntriesResponse.body.moods).toHaveLength(14);
      expect(allEntriesResponse.body.total).toBe(14);

      // Verify date range is correct
      const dates = allEntriesResponse.body.moods.map(m => m.date).sort();
      expect(dates[0]).toBe('2025-09-08');
      expect(dates[13]).toBe('2025-09-21');
    });

    it('should handle partial sync failures gracefully', async () => {
      const mixedEntries = [
        { date: '2025-09-20', emoji: '😊', note: 'Valid entry 1' },
        { date: '2025-09-21', emoji: '🤖', note: 'Invalid emoji' }, // This should fail
        { date: '2025-09-22', emoji: '😄', note: 'Valid entry 2' }
      ];

      // Sync entries individually to test partial failure
      const results = [];
      
      for (const entry of mixedEntries) {
        const response = await request(app).post('/api/moods').send(entry);
        results.push({ 
          success: response.status >= 200 && response.status < 300, 
          status: response.status 
        });
      }

      // Verify partial success pattern
      expect(results[0].success).toBe(true);  // First entry should succeed
      expect(results[1].success).toBe(false); // Second entry should fail
      expect(results[2].success).toBe(true);  // Third entry should succeed

      // Verify only valid entries were saved
      const savedResponse = await request(app)
        .get('/api/moods')
        .expect(200);

      expect(savedResponse.body.moods).toHaveLength(2);
      
      const savedDates = savedResponse.body.moods.map(m => m.date);
      expect(savedDates).toContain('2025-09-20');
      expect(savedDates).toContain('2025-09-22');
      expect(savedDates).not.toContain('2025-09-21');
    });

    it('should maintain data consistency during interrupted sync', async () => {
      // Simulate interrupted sync by creating some entries, then testing state
      await request(app)
        .post('/api/moods')
        .send({
          date: '2025-09-20',
          emoji: '😊',
          note: 'Pre-interruption entry'
        })
        .expect(201);

      // Verify state is consistent even with partial sync
      const partialResponse = await request(app)
        .get('/api/moods')
        .expect(200);

      expect(partialResponse.body.moods).toHaveLength(1);
      expect(partialResponse.body.total).toBe(1);

      // Continue sync after "interruption"
      await request(app)
        .post('/api/moods')
        .send({
          date: '2025-09-21',
          emoji: '😄',
          note: 'Post-interruption entry'
        })
        .expect(201);

      // Final state should be consistent
      const finalResponse = await request(app)
        .get('/api/moods')
        .expect(200);

      expect(finalResponse.body.moods).toHaveLength(2);
      expect(finalResponse.body.total).toBe(2);

      // Verify chronological order maintained
      const dates = finalResponse.body.moods.map(m => m.date);
      expect(dates).toEqual(['2025-09-21', '2025-09-20']);
    });
  });

  describe('Offline Performance and Resource Management', () => {
    it('should handle bulk offline sync efficiently', async () => {
      // Create larger set of offline entries to test bulk sync performance
      const bulkEntries = [];
      for (let i = 0; i < 50; i++) {
        const date = new Date('2025-08-01');
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        bulkEntries.push({
          date: dateStr,
          emoji: ['😢', '😐', '😊', '😄', '😍'][i % 5],
          note: `Bulk offline entry ${i + 1}`
        });
      }

      const startTime = Date.now();
      
      // Sync in batches (simulating realistic offline sync)
      const batchSize = 10;
      for (let i = 0; i < bulkEntries.length; i += batchSize) {
        const batch = bulkEntries.slice(i, i + batchSize);
        const batchPromises = batch.map(entry =>
          request(app).post('/api/moods').send(entry).expect(201)
        );
        await Promise.all(batchPromises);
      }

      const syncTime = Date.now() - startTime;
      
      // Verify all entries synced
      const allSyncedResponse = await request(app)
        .get('/api/moods?limit=100')
        .expect(200);

      expect(allSyncedResponse.body.moods).toHaveLength(50);
      expect(allSyncedResponse.body.total).toBe(50);

      // Performance should be reasonable for bulk sync
      expect(syncTime).toBeLessThan(10000); // Under 10 seconds for 50 entries
    });
  });
});