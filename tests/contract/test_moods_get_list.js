const request = require('supertest');
const { SecureDatabase } = require('../../backend/src/database/secure');
const { PerformanceMonitor } = require('../../backend/src/utils/performance');

// THIS TEST MUST FAIL - No implementation exists yet
describe('Contract Test: GET /api/moods', () => {
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
    
    // Insert test data for last 7 days
    const dates = [
      '2025-09-22', '2025-09-21', '2025-09-20', 
      '2025-09-19', '2025-09-18', '2025-09-17', '2025-09-16'
    ];
    const emojis = ['😊', '😐', '😄', '😢', '😍', '😊', '😐'];
    const notes = [
      'Great day!', 'Okay day', 'Awesome!', 
      'Tough day', 'Amazing!', 'Good vibes', null
    ];

    for (let i = 0; i < dates.length; i++) {
      await db.run(
        'INSERT INTO mood_entries (date, emoji, note) VALUES (?, ?, ?)',
        [dates[i], emojis[i], notes[i]]
      );
    }
  });

  describe('GET /api/moods - Default Behavior', () => {
    it('should return all mood entries sorted by date desc', async () => {
      const timer = monitor.startTimer('analytics');
      
      const response = await request(app)
        .get('/api/moods')
        .expect(200);

      monitor.endTimer(timer);
      expect(monitor.validateBudget(timer, 'analytics')).toBe(true);

      expect(response.body).toHaveProperty('moods');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');

      expect(response.body.moods).toHaveLength(7);
      expect(response.body.total).toBe(7);
      
      // Should be sorted by date descending (newest first)
      const dates = response.body.moods.map(m => m.date);
      expect(dates[0]).toBe('2025-09-22');
      expect(dates[1]).toBe('2025-09-21');
      expect(dates[6]).toBe('2025-09-16');

      // Each entry should have required fields
      response.body.moods.forEach(mood => {
        expect(mood).toMatchObject({
          id: expect.any(Number),
          date: expect.any(String),
          emoji: expect.stringMatching(/^(😢|😐|😊|😄|😍)$/),
          created_at: expect.any(String),
          updated_at: expect.any(String)
        });
      });
    });

    it('should handle empty database', async () => {
      await db.run('DELETE FROM mood_entries');

      const response = await request(app)
        .get('/api/moods')
        .expect(200);

      expect(response.body.moods).toHaveLength(0);
      expect(response.body.total).toBe(0);
      expect(response.body.page).toBe(1);
    });
  });

  describe('GET /api/moods - Pagination', () => {
    it('should support limit parameter', async () => {
      const response = await request(app)
        .get('/api/moods?limit=3')
        .expect(200);

      expect(response.body.moods).toHaveLength(3);
      expect(response.body.total).toBe(7);
      expect(response.body.limit).toBe(3);
      
      // Should still be newest first
      expect(response.body.moods[0].date).toBe('2025-09-22');
      expect(response.body.moods[2].date).toBe('2025-09-20');
    });

    it('should support page parameter', async () => {
      const response = await request(app)
        .get('/api/moods?limit=3&page=2')
        .expect(200);

      expect(response.body.moods).toHaveLength(3);
      expect(response.body.page).toBe(2);
      expect(response.body.limit).toBe(3);
      
      // Second page should start from 4th item
      expect(response.body.moods[0].date).toBe('2025-09-19');
      expect(response.body.moods[2].date).toBe('2025-09-17');
    });

    it('should handle page beyond available data', async () => {
      const response = await request(app)
        .get('/api/moods?limit=10&page=5')
        .expect(200);

      expect(response.body.moods).toHaveLength(0);
      expect(response.body.page).toBe(5);
    });
  });

  describe('GET /api/moods - Date Range Filtering', () => {
    it('should support date range with from parameter', async () => {
      const response = await request(app)
        .get('/api/moods?from=2025-09-20')
        .expect(200);

      expect(response.body.moods).toHaveLength(3);
      response.body.moods.forEach(mood => {
        expect(mood.date).toMatch(/^2025-09-2[0-2]$/);
      });
    });

    it('should support date range with to parameter', async () => {
      const response = await request(app)
        .get('/api/moods?to=2025-09-18')
        .expect(200);

      expect(response.body.moods).toHaveLength(3);
      response.body.moods.forEach(mood => {
        expect(mood.date).toMatch(/^2025-09-1[6-8]$/);
      });
    });

    it('should support both from and to parameters', async () => {
      const response = await request(app)
        .get('/api/moods?from=2025-09-18&to=2025-09-20')
        .expect(200);

      expect(response.body.moods).toHaveLength(3);
      const dates = response.body.moods.map(m => m.date);
      expect(dates).toContain('2025-09-18');
      expect(dates).toContain('2025-09-19');
      expect(dates).toContain('2025-09-20');
    });
  });

  describe('GET /api/moods - Validation', () => {
    it('should reject invalid limit parameter', async () => {
      await request(app)
        .get('/api/moods?limit=invalid')
        .expect(400);
    });

    it('should reject negative limit', async () => {
      await request(app)
        .get('/api/moods?limit=-5')
        .expect(400);
    });

    it('should reject limit over maximum (100)', async () => {
      await request(app)
        .get('/api/moods?limit=500')
        .expect(400);
    });

    it('should reject invalid date format in from parameter', async () => {
      await request(app)
        .get('/api/moods?from=invalid-date')
        .expect(400);
    });

    it('should reject invalid date format in to parameter', async () => {
      await request(app)
        .get('/api/moods?to=not-a-date')
        .expect(400);
    });

    it('should reject when from date is after to date', async () => {
      await request(app)
        .get('/api/moods?from=2025-09-22&to=2025-09-20')
        .expect(400);
    });
  });

  describe('GET /api/moods - Performance', () => {
    it('should meet constitutional performance budget (<500ms)', async () => {
      const timer = monitor.startTimer('analytics');
      
      await request(app)
        .get('/api/moods')
        .expect(200);

      monitor.endTimer(timer);
      
      // Constitutional requirement: <500ms for analytics
      expect(monitor.validateBudget(timer, 'analytics')).toBe(true);
      expect(timer.duration).toBeLessThan(500);
    });

    it('should handle large datasets efficiently', async () => {
      // Clear existing data first to avoid conflicts
      await db.run('DELETE FROM mood_entries');
      
      // Insert more data to test performance with unique dates
      const promises = [];
      for (let i = 0; i < 50; i++) {
        // Use dates from far in the past to avoid conflicts
        const date = new Date(2020, 0, 1 + i).toISOString().split('T')[0];  
        promises.push(
          db.run(
            'INSERT INTO mood_entries (date, emoji, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
            [date, '😊', `Note ${i}`, new Date().toISOString(), new Date().toISOString()]
          )
        );
      }
      await Promise.all(promises);

      const timer = monitor.startTimer('analytics');
      
      const response = await request(app)
        .get('/api/moods?limit=50')
        .expect(200);

      monitor.endTimer(timer);
      
      expect(response.body.moods.length).toBeGreaterThan(20);
      expect(timer.duration).toBeLessThan(500);
    });
  });
});