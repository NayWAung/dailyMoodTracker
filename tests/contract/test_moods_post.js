const request = require('supertest');
const { SecureDatabase } = require('../../backend/src/database/secure');
const { PerformanceMonitor } = require('../../backend/src/utils/performance');

// THIS TEST MUST FAIL - No implementation exists yet
describe('Contract Test: POST /api/moods', () => {
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
    // Clean test data
    await db.run('DELETE FROM mood_entries');
  });

  describe('POST /api/moods - Happy Path', () => {
    it('should create a new mood entry with valid data', async () => {
      const moodData = {
        date: '2025-09-22',
        emoji: '😊',
        note: 'Had a great day at work!'
      };

      const timer = monitor.startTimer('mood_entry');
      
      const response = await request(app)
        .post('/api/moods')
        .send(moodData)
        .expect(201);

      monitor.endTimer(timer);
      expect(monitor.validateBudget(timer, 'mood_entry')).toBe(true);

      expect(response.body).toMatchObject({
        id: expect.any(Number),
        date: '2025-09-22',
        emoji: '😊',
        note: 'Had a great day at work!',
        created_at: expect.any(String),
        updated_at: expect.any(String)
      });

      // Verify it was actually saved to database
      const saved = await db.get('SELECT * FROM mood_entries WHERE date = ?', ['2025-09-22']);
      expect(saved).toBeTruthy();
      expect(saved.emoji).toBe('😊');
    });

    it('should create mood entry without note', async () => {
      const moodData = {
        date: '2025-09-23',
        emoji: '😐'
      };

      const response = await request(app)
        .post('/api/moods')
        .send(moodData)
        .expect(201);

      expect(response.body.note).toBeNull();
      expect(response.body.emoji).toBe('😐');
    });
  });

  describe('POST /api/moods - Validation', () => {
    it('should reject invalid emoji', async () => {
      const invalidData = {
        date: '2025-09-22',
        emoji: '🤖', // Not in allowed list
        note: 'Invalid emoji'
      };

      const response = await request(app)
        .post('/api/moods')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toContain('emoji');
      expect(response.body.error).toContain('😢', '😐', '😊', '😄', '😍');
    });

    it('should reject missing date', async () => {
      const invalidData = {
        emoji: '😊',
        note: 'Missing date'
      };

      await request(app)
        .post('/api/moods')
        .send(invalidData)
        .expect(400);
    });

    it('should reject invalid date format', async () => {
      const invalidData = {
        date: 'not-a-date',
        emoji: '😊'
      };

      await request(app)
        .post('/api/moods')
        .send(invalidData)
        .expect(400);
    });

    it('should reject note longer than 500 characters', async () => {
      const longNote = 'a'.repeat(501);
      const invalidData = {
        date: '2025-09-22',
        emoji: '😊',
        note: longNote
      };

      await request(app)
        .post('/api/moods')
        .send(invalidData)
        .expect(400);
    });

    it('should reject duplicate date', async () => {
      const moodData = {
        date: '2025-09-22',
        emoji: '😊',
        note: 'First entry'
      };

      // Create first entry
      await request(app)
        .post('/api/moods')
        .send(moodData)
        .expect(201);

      // Try to create duplicate
      const duplicateData = {
        date: '2025-09-22',
        emoji: '😄',
        note: 'Duplicate entry'
      };

      const response = await request(app)
        .post('/api/moods')
        .send(duplicateData)
        .expect(409);

      expect(response.body.error).toContain('already exists');
    });
  });

  describe('POST /api/moods - Performance', () => {
    it('should meet constitutional performance budget (<100ms)', async () => {
      const moodData = {
        date: '2025-09-22',
        emoji: '😊',
        note: 'Performance test'
      };

      const timer = monitor.startTimer('mood_entry');
      
      await request(app)
        .post('/api/moods')
        .send(moodData)
        .expect(201);

      monitor.endTimer(timer);
      
      // Constitutional requirement: <100ms
      expect(monitor.validateBudget(timer, 'mood_entry')).toBe(true);
      expect(timer.duration).toBeLessThan(100);
    });
  });
});