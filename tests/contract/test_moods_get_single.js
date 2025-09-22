const request = require('supertest');
const { SecureDatabase } = require('../../backend/src/database/secure');
const { PerformanceMonitor } = require('../../backend/src/utils/performance');

// THIS TEST MUST FAIL - No implementation exists yet
describe('Contract Test: GET /api/moods/:date', () => {
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
    // Clean and seed test data
    await db.run('DELETE FROM mood_entries');
    
    // Insert test data
    await db.run(
      'INSERT INTO mood_entries (date, emoji, note) VALUES (?, ?, ?)',
      ['2025-09-22', '😊', 'Great day!']
    );
    await db.run(
      'INSERT INTO mood_entries (date, emoji, note) VALUES (?, ?, ?)',
      ['2025-09-21', '😐', 'Okay day']
    );
  });

  describe('GET /api/moods/:date - Happy Path', () => {
    it('should return mood entry for existing date', async () => {
      const timer = monitor.startTimer('analytics');
      
      const response = await request(app)
        .get('/api/moods/2025-09-22')
        .expect(200);

      monitor.endTimer(timer);
      expect(monitor.validateBudget(timer, 'analytics')).toBe(true);

      expect(response.body).toMatchObject({
        id: expect.any(Number),
        date: '2025-09-22',
        emoji: '😊',
        note: 'Great day!',
        created_at: expect.any(String),
        updated_at: expect.any(String)
      });
    });

    it('should return mood entry without note', async () => {
      // Insert entry without note
      await db.run(
        'INSERT INTO mood_entries (date, emoji, note) VALUES (?, ?, ?)',
        ['2025-09-23', '😄', null]
      );

      const response = await request(app)
        .get('/api/moods/2025-09-23')
        .expect(200);

      expect(response.body.date).toBe('2025-09-23');
      expect(response.body.emoji).toBe('😄');
      expect(response.body.note).toBeNull();
    });
  });

  describe('GET /api/moods/:date - Not Found', () => {
    it('should return 404 for non-existent date', async () => {
      const response = await request(app)
        .get('/api/moods/2025-12-25')
        .expect(404);

      expect(response.body.error).toContain('not found');
      expect(response.body.date).toBe('2025-12-25');
    });

    it('should return 404 for future date', async () => {
      const futureDate = '2026-01-01';
      
      const response = await request(app)
        .get(`/api/moods/${futureDate}`)
        .expect(404);

      expect(response.body.error).toContain('not found');
    });
  });

  describe('GET /api/moods/:date - Validation', () => {
    it('should reject invalid date format', async () => {
      const response = await request(app)
        .get('/api/moods/invalid-date')
        .expect(400);

      expect(response.body.error).toContain('date format');
    });

    it('should reject malformed date parameter', async () => {
      await request(app)
        .get('/api/moods/2025-13-99')
        .expect(400);
    });

    it('should handle special characters in date parameter', async () => {
      await request(app)
        .get('/api/moods/2025-09-22%3Cscript%3E')
        .expect(400);
    });
  });

  describe('GET /api/moods/:date - Performance', () => {
    it('should meet constitutional performance budget (<500ms)', async () => {
      const timer = monitor.startTimer('analytics');
      
      await request(app)
        .get('/api/moods/2025-09-22')
        .expect(200);

      monitor.endTimer(timer);
      
      // Constitutional requirement: <500ms for analytics
      expect(monitor.validateBudget(timer, 'analytics')).toBe(true);
      expect(timer.duration).toBeLessThan(500);
    });

    it('should perform consistently with database lookup', async () => {
      const times = [];
      
      for (let i = 0; i < 5; i++) {
        const timer = monitor.startTimer('analytics');
        
        await request(app)
          .get('/api/moods/2025-09-22')
          .expect(200);
          
        monitor.endTimer(timer);
        times.push(timer.duration);
      }
      
      // All requests should be under budget
      times.forEach(time => expect(time).toBeLessThan(500));
      
      // Performance should be consistent (no huge outliers)
      const avg = times.reduce((a, b) => a + b) / times.length;
      const maxDeviation = Math.max(...times.map(t => Math.abs(t - avg)));
      expect(maxDeviation).toBeLessThan(100); // Max 100ms deviation
    });
  });
});