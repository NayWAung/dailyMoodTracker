const request = require('supertest');
const { SecureDatabase } = require('../../backend/src/database/secure');
const { PerformanceMonitor } = require('../../backend/src/utils/performance');

// THIS TEST MUST FAIL - No implementation exists yet
describe('Contract Test: DELETE /api/moods/:date', () => {
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
    await db.run(
      'INSERT INTO mood_entries (date, emoji, note) VALUES (?, ?, ?)',
      ['2025-09-20', '😄', 'Awesome day!']
    );
  });

  describe('DELETE /api/moods/:date - Happy Path', () => {
    it('should delete existing mood entry', async () => {
      const timer = monitor.startTimer('mood_entry');
      
      const response = await request(app)
        .delete('/api/moods/2025-09-22')
        .expect(200);

      monitor.endTimer(timer);
      expect(monitor.validateBudget(timer, 'mood_entry')).toBe(true);

      expect(response.body).toMatchObject({
        message: 'Mood entry deleted successfully',
        date: '2025-09-22',
        deleted: true
      });

      // Verify it was actually deleted from database
      const deleted = await db.get('SELECT * FROM mood_entries WHERE date = ?', ['2025-09-22']);
      expect(deleted).toBeUndefined();

      // Verify other entries are still there
      const remaining = await db.all('SELECT * FROM mood_entries');
      expect(remaining).toHaveLength(2);
      expect(remaining.map(r => r.date)).toContain('2025-09-21');
      expect(remaining.map(r => r.date)).toContain('2025-09-20');
    });

    it('should return confirmation with entry details', async () => {
      // First get the entry to compare
      const beforeDelete = await db.get('SELECT * FROM mood_entries WHERE date = ?', ['2025-09-21']);
      
      const response = await request(app)
        .delete('/api/moods/2025-09-21')
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Mood entry deleted successfully',
        date: '2025-09-21',
        deleted: true,
        deletedEntry: {
          id: beforeDelete.id,
          date: '2025-09-21',
          emoji: '😐',
          note: 'Okay day'
        }
      });
    });
  });

  describe('DELETE /api/moods/:date - Not Found', () => {
    it('should return 404 for non-existent date', async () => {
      const response = await request(app)
        .delete('/api/moods/2025-12-25')
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'Mood entry not found',
        date: '2025-12-25',
        deleted: false
      });

      // Verify nothing was deleted
      const remaining = await db.all('SELECT * FROM mood_entries');
      expect(remaining).toHaveLength(3);
    });

    it('should return 404 for future date', async () => {
      const futureDate = '2026-01-01';
      
      const response = await request(app)
        .delete(`/api/moods/${futureDate}`)
        .expect(404);

      expect(response.body.error).toContain('not found');
      expect(response.body.date).toBe(futureDate);
      expect(response.body.deleted).toBe(false);
    });

    it('should return 404 for already deleted entry', async () => {
      // Delete the entry first
      await request(app)
        .delete('/api/moods/2025-09-22')
        .expect(200);

      // Try to delete again
      const response = await request(app)
        .delete('/api/moods/2025-09-22')
        .expect(404);

      expect(response.body.error).toContain('not found');
      expect(response.body.deleted).toBe(false);
    });
  });

  describe('DELETE /api/moods/:date - Validation', () => {
    it('should reject invalid date format', async () => {
      const response = await request(app)
        .delete('/api/moods/invalid-date')
        .expect(400);

      expect(response.body.error).toContain('date format');
      
      // Verify nothing was deleted
      const remaining = await db.all('SELECT * FROM mood_entries');
      expect(remaining).toHaveLength(3);
    });

    it('should reject malformed date parameter', async () => {
      await request(app)
        .delete('/api/moods/2025-13-99')
        .expect(400);
    });

    it('should handle special characters in date parameter safely', async () => {
      await request(app)
        .delete('/api/moods/2025-09-22%3Cscript%3E')
        .expect(400);
        
      // Verify original entry is still there
      const original = await db.get('SELECT * FROM mood_entries WHERE date = ?', ['2025-09-22']);
      expect(original).toBeTruthy();
    });

    it('should reject empty date parameter', async () => {
      await request(app)
        .delete('/api/moods/')
        .expect(404); // Route not found rather than bad request
    });
  });

  describe('DELETE /api/moods/:date - Security', () => {
    it('should prevent SQL injection attempts', async () => {
      const maliciousDate = "2025-09-22'; DROP TABLE mood_entries; --";
      
      await request(app)
        .delete(`/api/moods/${encodeURIComponent(maliciousDate)}`)
        .expect(400);
        
      // Verify table still exists and data is intact
      const entries = await db.all('SELECT * FROM mood_entries');
      expect(entries).toHaveLength(3);
    });

    it('should sanitize input properly', async () => {
      const weirdInput = "2025-09-22<script>alert('xss')</script>";
      
      await request(app)
        .delete(`/api/moods/${encodeURIComponent(weirdInput)}`)
        .expect(400);
    });
  });

  describe('DELETE /api/moods/:date - Performance', () => {
    it('should meet constitutional performance budget (<100ms)', async () => {
      const timer = monitor.startTimer('mood_entry');
      
      await request(app)
        .delete('/api/moods/2025-09-22')
        .expect(200);

      monitor.endTimer(timer);
      
      // Constitutional requirement: <100ms for mood entry operations
      expect(monitor.validateBudget(timer, 'mood_entry')).toBe(true);
      expect(timer.duration).toBeLessThan(100);
    });

    it('should perform consistently', async () => {
      // Add more test data
      for (let i = 1; i <= 5; i++) {
        await db.run(
          'INSERT INTO mood_entries (date, emoji, note) VALUES (?, ?, ?)',
          [`2025-09-${10 + i}`, '😊', `Test ${i}`]
        );
      }

      const times = [];
      
      // Delete multiple entries and measure performance
      for (let i = 1; i <= 3; i++) {
        const timer = monitor.startTimer('mood_entry');
        
        await request(app)
          .delete(`/api/moods/2025-09-${10 + i}`)
          .expect(200);
          
        monitor.endTimer(timer);
        times.push(timer.duration);
      }
      
      // All deletions should be under budget
      times.forEach(time => expect(time).toBeLessThan(100));
      
      // Performance should be consistent
      const avg = times.reduce((a, b) => a + b) / times.length;
      const maxDeviation = Math.max(...times.map(t => Math.abs(t - avg)));
      expect(maxDeviation).toBeLessThan(50); // Max 50ms deviation
    });
  });

  describe('DELETE /api/moods/:date - Idempotency', () => {
    it('should be idempotent - multiple deletes of same entry should be safe', async () => {
      // First delete should succeed
      await request(app)
        .delete('/api/moods/2025-09-22')
        .expect(200);

      // Subsequent deletes should return 404 but not cause errors
      await request(app)
        .delete('/api/moods/2025-09-22')
        .expect(404);
        
      await request(app)
        .delete('/api/moods/2025-09-22')
        .expect(404);

      // Database should be in consistent state
      const remaining = await db.all('SELECT * FROM mood_entries');
      expect(remaining).toHaveLength(2);
    });
  });
});