const request = require('supertest');
const { SecureDatabase } = require('../../backend/src/database/secure');
const { PerformanceMonitor } = require('../../backend/src/utils/performance');

// THIS TEST MUST FAIL - No implementation exists yet
describe('Integration Test: First-time User Experience', () => {
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
    // Start with completely clean database for first-time user scenarios
    await db.run('DELETE FROM mood_entries');
  });

  describe('First-Time User Journey', () => {
    it('should handle complete first mood entry flow', async () => {
      // 1. Check empty state - user has no mood entries
      const emptyResponse = await request(app)
        .get('/api/moods')
        .expect(200);

      expect(emptyResponse.body.moods).toHaveLength(0);
      expect(emptyResponse.body.total).toBe(0);

      // 2. Create first mood entry
      const firstMoodData = {
        date: '2025-09-22',
        emoji: '😊',
        note: 'My very first mood entry! Excited to start tracking.'
      };

      const timer = monitor.startTimer('mood_entry');
      
      const createResponse = await request(app)
        .post('/api/moods')
        .send(firstMoodData)
        .expect(201);

      monitor.endTimer(timer);
      expect(monitor.validateBudget(timer, 'mood_entry')).toBe(true);

      expect(createResponse.body).toMatchObject({
        id: expect.any(Number),
        date: '2025-09-22',
        emoji: '😊',
        note: 'My very first mood entry! Excited to start tracking.',
        created_at: expect.any(String),
        updated_at: expect.any(String)
      });

      // 3. Verify the entry appears in the mood list
      const listResponse = await request(app)
        .get('/api/moods')
        .expect(200);

      expect(listResponse.body.moods).toHaveLength(1);
      expect(listResponse.body.total).toBe(1);
      expect(listResponse.body.moods[0]).toMatchObject(firstMoodData);

      // 4. Verify can retrieve the specific entry
      const getResponse = await request(app)
        .get('/api/moods/2025-09-22')
        .expect(200);

      expect(getResponse.body).toMatchObject(firstMoodData);
    });

    it('should guide user through creating multiple entries', async () => {
      const moodEntries = [
        {
          date: '2025-09-20',
          emoji: '😐',
          note: 'First day, feeling neutral about starting this habit.'
        },
        {
          date: '2025-09-21',
          emoji: '😊', 
          note: 'Day 2, starting to see the value in reflection.'
        },
        {
          date: '2025-09-22',
          emoji: '😄',
          note: 'Day 3, really enjoying this daily check-in!'
        }
      ];

      // Create entries in order
      for (const mood of moodEntries) {
        await request(app)
          .post('/api/moods')
          .send(mood)
          .expect(201);
      }

      // Verify chronological history shows progression
      const historyResponse = await request(app)
        .get('/api/moods')
        .expect(200);

      expect(historyResponse.body.moods).toHaveLength(3);
      expect(historyResponse.body.total).toBe(3);

      // Should be ordered newest first
      const dates = historyResponse.body.moods.map(m => m.date);
      expect(dates).toEqual(['2025-09-22', '2025-09-21', '2025-09-20']);

      // Verify mood progression is visible
      const emojis = historyResponse.body.moods.map(m => m.emoji);
      expect(emojis).toEqual(['😄', '😊', '😐']);
    });

    it('should handle user creating entry without note (minimal input)', async () => {
      const minimalMood = {
        date: '2025-09-22',
        emoji: '😊'
        // no note provided
      };

      const createResponse = await request(app)
        .post('/api/moods')
        .send(minimalMood)
        .expect(201);

      expect(createResponse.body.emoji).toBe('😊');
      expect(createResponse.body.date).toBe('2025-09-22');
      expect(createResponse.body.note).toBeNull();

      // Verify it can be retrieved
      const getResponse = await request(app)
        .get('/api/moods/2025-09-22')
        .expect(200);

      expect(getResponse.body.note).toBeNull();
      expect(getResponse.body.emoji).toBe('😊');
    });
  });

  describe('First-Time User Error Recovery', () => {
    it('should handle user mistakes gracefully with helpful errors', async () => {
      // User tries invalid emoji
      const invalidMood = {
        date: '2025-09-22',
        emoji: '🤖',
        note: 'Trying robot emoji'
      };

      const errorResponse = await request(app)
        .post('/api/moods')
        .send(invalidMood)
        .expect(400);

      expect(errorResponse.body.error).toContain('emoji');
      expect(errorResponse.body.error).toContain('😢');
      expect(errorResponse.body.error).toContain('😐');
      expect(errorResponse.body.error).toContain('😊');
      expect(errorResponse.body.error).toContain('😄');
      expect(errorResponse.body.error).toContain('😍');

      // Verify database is still clean
      const listResponse = await request(app)
        .get('/api/moods')
        .expect(200);
      expect(listResponse.body.moods).toHaveLength(0);
    });

    it('should help user understand date format requirements', async () => {
      const invalidDateMood = {
        date: 'today',
        emoji: '😊',
        note: 'Using word instead of date'
      };

      const errorResponse = await request(app)
        .post('/api/moods')
        .send(invalidDateMood)
        .expect(400);

      expect(errorResponse.body.error).toContain('date');
      expect(errorResponse.body.error).toMatch(/YYYY-MM-DD|format/i);
    });

    it('should prevent user from creating duplicate entries with helpful message', async () => {
      // Create first entry
      const moodData = {
        date: '2025-09-22',
        emoji: '😊',
        note: 'First entry'
      };

      await request(app)
        .post('/api/moods')
        .send(moodData)
        .expect(201);

      // Try to create duplicate
      const duplicateData = {
        date: '2025-09-22',
        emoji: '😄',
        note: 'Trying to create another entry for same day'
      };

      const duplicateResponse = await request(app)
        .post('/api/moods')
        .send(duplicateData)
        .expect(409);

      expect(duplicateResponse.body.error).toContain('already exists');
      expect(duplicateResponse.body.error).toContain('2025-09-22');
      expect(duplicateResponse.body).toHaveProperty('suggestion');
      expect(duplicateResponse.body.suggestion).toMatch(/update|edit|delete/i);

      // Verify original entry is unchanged
      const getResponse = await request(app)
        .get('/api/moods/2025-09-22')
        .expect(200);
      
      expect(getResponse.body.emoji).toBe('😊');
      expect(getResponse.body.note).toBe('First entry');
    });
  });

  describe('First-Time User Performance Expectations', () => {
    it('should provide fast initial experience', async () => {
      // Empty state should be fast
      const emptyTimer = monitor.startTimer('analytics');
      await request(app)
        .get('/api/moods')
        .expect(200);
      monitor.endTimer(emptyTimer);
      expect(emptyTimer.duration).toBeLessThan(100); // Should be very fast when empty

      // First entry should meet constitutional budget
      const createTimer = monitor.startTimer('mood_entry');
      await request(app)
        .post('/api/moods')
        .send({
          date: '2025-09-22',
          emoji: '😊',
          note: 'Performance test entry'
        })
        .expect(201);
      monitor.endTimer(createTimer);
      expect(monitor.validateBudget(createTimer, 'mood_entry')).toBe(true);

      // Subsequent list view should be fast
      const listTimer = monitor.startTimer('analytics');
      await request(app)
        .get('/api/moods')
        .expect(200);
      monitor.endTimer(listTimer);
      expect(monitor.validateBudget(listTimer, 'analytics')).toBe(true);
    });
  });

  describe('First-Time User Data Validation', () => {
    it('should validate note length for new users', async () => {
      const longNote = 'a'.repeat(501); // Over 500 character limit
      
      const longNoteData = {
        date: '2025-09-22',
        emoji: '😊',
        note: longNote
      };

      const errorResponse = await request(app)
        .post('/api/moods')
        .send(longNoteData)
        .expect(400);

      expect(errorResponse.body.error).toContain('note');
      expect(errorResponse.body.error).toContain('500');
    });

    it('should accept exactly 500 character note', async () => {
      const exactLimitNote = 'a'.repeat(500); // Exactly 500 characters
      
      const validData = {
        date: '2025-09-22',
        emoji: '😊',
        note: exactLimitNote
      };

      const response = await request(app)
        .post('/api/moods')
        .send(validData)
        .expect(201);

      expect(response.body.note).toBe(exactLimitNote);
      expect(response.body.note.length).toBe(500);
    });
  });

  describe('First-Time User Privacy Assurance', () => {
    it('should store data securely from first entry', async () => {
      const sensitiveData = {
        date: '2025-09-22',
        emoji: '😢',
        note: 'Had a tough day dealing with personal issues. Very private thoughts here.'
      };

      await request(app)
        .post('/api/moods')
        .send(sensitiveData)
        .expect(201);

      // Verify data is stored and retrievable (encryption is transparent)
      const getResponse = await request(app)
        .get('/api/moods/2025-09-22')
        .expect(200);

      expect(getResponse.body.note).toBe(sensitiveData.note);

      // Check that database file would be encrypted (this is integration level validation)
      const directDbQuery = await db.get('SELECT * FROM mood_entries WHERE date = ?', ['2025-09-22']);
      expect(directDbQuery).toBeTruthy();
      expect(directDbQuery.note).toBe(sensitiveData.note);
    });
  });
});