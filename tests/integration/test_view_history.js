const request = require('supertest');
const { SecureDatabase } = require('../../backend/src/database/secure');
const { PerformanceMonitor } = require('../../backend/src/utils/performance');

// THIS TEST MUST FAIL - No implementation exists yet
describe('Integration Test: View Mood History', () => {
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
    // Clean and seed with comprehensive test data
    await db.run('DELETE FROM mood_entries');
    
    // Create 30 days of mood history for comprehensive testing
    const today = new Date('2025-09-22');
    const moods = ['😢', '😐', '😊', '😄', '😍'];
    const notes = [
      'Difficult day with challenges',
      'Regular day, nothing special',
      'Good day with positive moments', 
      'Great day, felt really happy',
      'Amazing day, everything went perfectly'
    ];

    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const moodIndex = i % 5;
      const emoji = moods[moodIndex];
      const note = i % 3 === 0 ? null : `${notes[moodIndex]} - Day ${i + 1}`;

      await db.run(
        'INSERT INTO mood_entries (date, emoji, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [dateStr, emoji, note, `${dateStr}T10:00:00Z`, `${dateStr}T10:00:00Z`]
      );
    }
  });

  describe('Complete Mood History Viewing', () => {
    it('should display comprehensive mood history with proper pagination', async () => {
      const timer = monitor.startTimer('analytics');
      
      const response = await request(app)
        .get('/api/moods')
        .expect(200);

      monitor.endTimer(timer);
      expect(monitor.validateBudget(timer, 'analytics')).toBe(true);

      expect(response.body).toHaveProperty('moods');
      expect(response.body).toHaveProperty('total', 30);
      expect(response.body).toHaveProperty('page', 1);
      expect(response.body).toHaveProperty('limit');

      // Default should show reasonable number (e.g., 10-20 items)
      expect(response.body.moods.length).toBeGreaterThan(0);
      expect(response.body.moods.length).toBeLessThanOrEqual(20);

      // Should be ordered by date descending (newest first)
      const dates = response.body.moods.map(m => m.date);
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i-1] >= dates[i]).toBe(true);
      }

      // First entry should be most recent (today)
      expect(response.body.moods[0].date).toBe('2025-09-22');
    });

    it('should handle pagination for viewing older mood history', async () => {
      // Get first page
      const firstPageResponse = await request(app)
        .get('/api/moods?limit=10&page=1')
        .expect(200);

      expect(firstPageResponse.body.moods).toHaveLength(10);
      expect(firstPageResponse.body.page).toBe(1);
      expect(firstPageResponse.body.limit).toBe(10);
      expect(firstPageResponse.body.total).toBe(30);

      // Get second page
      const secondPageResponse = await request(app)
        .get('/api/moods?limit=10&page=2')
        .expect(200);

      expect(secondPageResponse.body.moods).toHaveLength(10);
      expect(secondPageResponse.body.page).toBe(2);

      // Verify no overlap between pages
      const firstPageDates = firstPageResponse.body.moods.map(m => m.date);
      const secondPageDates = secondPageResponse.body.moods.map(m => m.date);
      
      firstPageDates.forEach(date => {
        expect(secondPageDates).not.toContain(date);
      });

      // Second page should have older dates
      expect(secondPageDates[0] < firstPageDates[firstPageDates.length - 1]).toBe(true);

      // Get third page
      const thirdPageResponse = await request(app)
        .get('/api/moods?limit=10&page=3')
        .expect(200);

      expect(thirdPageResponse.body.moods).toHaveLength(10);
      expect(thirdPageResponse.body.total).toBe(30);
    });

    it('should support date range filtering for focused history viewing', async () => {
      // View last week only
      const weekAgoResponse = await request(app)
        .get('/api/moods?from=2025-09-16&to=2025-09-22')
        .expect(200);

      expect(weekAgoResponse.body.moods.length).toBe(7); // 7 days inclusive
      weekAgoResponse.body.moods.forEach(mood => {
        expect(mood.date >= '2025-09-16').toBe(true);
        expect(mood.date <= '2025-09-22').toBe(true);
      });

      // View specific month segment
      const monthSegmentResponse = await request(app)
        .get('/api/moods?from=2025-09-01&to=2025-09-15')
        .expect(200);

      monthSegmentResponse.body.moods.forEach(mood => {
        expect(mood.date >= '2025-09-01').toBe(true);
        expect(mood.date <= '2025-09-15').toBe(true);
      });
    });
  });

  describe('Mood History Analytics and Patterns', () => {
    it('should enable mood pattern analysis through history data', async () => {
      const response = await request(app)
        .get('/api/moods?limit=30')
        .expect(200);

      const moods = response.body.moods;
      expect(moods).toHaveLength(30);

      // Verify all mood types are represented
      const uniqueEmojis = [...new Set(moods.map(m => m.emoji))];
      expect(uniqueEmojis).toContain('😢');
      expect(uniqueEmojis).toContain('😐');
      expect(uniqueEmojis).toContain('😊');
      expect(uniqueEmojis).toContain('😄');
      expect(uniqueEmojis).toContain('😍');

      // Verify data structure supports analysis
      moods.forEach(mood => {
        expect(mood).toHaveProperty('date');
        expect(mood).toHaveProperty('emoji');
        expect(mood).toHaveProperty('created_at');
        expect(mood).toHaveProperty('updated_at');
      });

      // Verify chronological consistency
      for (let i = 1; i < moods.length; i++) {
        expect(moods[i-1].date >= moods[i].date).toBe(true);
      }
    });

    it('should provide mood frequency distribution data', async () => {
      const response = await request(app)
        .get('/api/moods?limit=30')
        .expect(200);

      const moodCounts = {};
      response.body.moods.forEach(mood => {
        moodCounts[mood.emoji] = (moodCounts[mood.emoji] || 0) + 1;
      });

      // Each mood should appear 6 times (30 entries / 5 moods)
      expect(moodCounts['😢']).toBe(6);
      expect(moodCounts['😐']).toBe(6);
      expect(moodCounts['😊']).toBe(6);
      expect(moodCounts['😄']).toBe(6);
      expect(moodCounts['😍']).toBe(6);
    });

    it('should support mood trend analysis over time', async () => {
      // Get recent trends (last 14 days)
      const recentResponse = await request(app)
        .get('/api/moods?from=2025-09-09&to=2025-09-22')
        .expect(200);

      expect(recentResponse.body.moods).toHaveLength(14);

      // Verify chronological data for trend analysis
      const recentMoods = recentResponse.body.moods.reverse(); // Oldest first for trend
      for (let i = 1; i < recentMoods.length; i++) {
        const prevDate = new Date(recentMoods[i-1].date);
        const currDate = new Date(recentMoods[i].date);
        expect(currDate > prevDate).toBe(true);
      }

      // Get older period for comparison
      const olderResponse = await request(app)
        .get('/api/moods?from=2025-08-25&to=2025-09-08')
        .expect(200);

      // Should be able to compare periods
      expect(olderResponse.body.moods.length).toBeGreaterThan(0);
    });
  });

  describe('History Viewing Performance', () => {
    it('should meet constitutional performance budgets for history viewing', async () => {
      // Small dataset performance
      const smallTimer = monitor.startTimer('analytics');
      await request(app)
        .get('/api/moods?limit=10')
        .expect(200);
      monitor.endTimer(smallTimer);
      expect(monitor.validateBudget(smallTimer, 'analytics')).toBe(true);

      // Larger dataset performance
      const largeTimer = monitor.startTimer('analytics');
      await request(app)
        .get('/api/moods?limit=50')
        .expect(200);
      monitor.endTimer(largeTimer);
      expect(monitor.validateBudget(largeTimer, 'analytics')).toBe(true);

      // Complex query performance (date range + pagination)
      const complexTimer = monitor.startTimer('analytics');
      await request(app)
        .get('/api/moods?from=2025-09-01&to=2025-09-22&limit=20&page=1')
        .expect(200);
      monitor.endTimer(complexTimer);
      expect(monitor.validateBudget(complexTimer, 'analytics')).toBe(true);
    });

    it('should handle concurrent history requests efficiently', async () => {
      const concurrentRequests = Array(5).fill().map((_, i) => 
        request(app)
          .get(`/api/moods?limit=10&page=${i + 1}`)
          .expect(200)
      );

      const timer = monitor.startTimer('analytics');
      const responses = await Promise.all(concurrentRequests);
      monitor.endTimer(timer);

      // All concurrent requests should complete within budget
      expect(monitor.validateBudget(timer, 'analytics')).toBe(true);

      // Verify all responses are valid
      responses.forEach((response, index) => {
        expect(response.body.page).toBe(index + 1);
        expect(response.body.moods).toBeDefined();
      });
    });
  });

  describe('History Data Integrity and Completeness', () => {
    it('should maintain complete mood history without data loss', async () => {
      // Get complete history
      const completeResponse = await request(app)
        .get('/api/moods?limit=100')
        .expect(200);

      expect(completeResponse.body.total).toBe(30);
      expect(completeResponse.body.moods).toHaveLength(30);

      // Verify no duplicate dates
      const dates = completeResponse.body.moods.map(m => m.date);
      const uniqueDates = new Set(dates);
      expect(uniqueDates.size).toBe(30);

      // Verify date sequence is complete (no gaps in daily entries)
      const sortedDates = dates.sort().reverse(); // Most recent first
      const expectedStartDate = new Date('2025-09-22');
      
      for (let i = 0; i < 30; i++) {
        const expectedDate = new Date(expectedStartDate);
        expectedDate.setDate(expectedDate.getDate() - i);
        const expectedDateStr = expectedDate.toISOString().split('T')[0];
        expect(sortedDates[i]).toBe(expectedDateStr);
      }
    });

    it('should preserve note data correctly in history', async () => {
      const response = await request(app)
        .get('/api/moods?limit=30')
        .expect(200);

      let entriesWithNotes = 0;
      let entriesWithoutNotes = 0;

      response.body.moods.forEach(mood => {
        if (mood.note !== null) {
          entriesWithNotes++;
          expect(mood.note).toMatch(/Day \d+/);
        } else {
          entriesWithoutNotes++;
        }
      });

      // Based on our test data pattern (every 3rd entry has no note)
      expect(entriesWithoutNotes).toBe(10); // 30 / 3
      expect(entriesWithNotes).toBe(20);   // 30 - 10
    });

    it('should handle edge cases in history viewing', async () => {
      // Test viewing history at boundaries
      const response = await request(app)
        .get('/api/moods?limit=1&page=30')
        .expect(200);

      expect(response.body.moods).toHaveLength(1);
      expect(response.body.page).toBe(30);
      
      // Should be the oldest entry
      const oldestExpectedDate = new Date('2025-09-22');
      oldestExpectedDate.setDate(oldestExpectedDate.getDate() - 29);
      const expectedOldestDateStr = oldestExpectedDate.toISOString().split('T')[0];
      
      expect(response.body.moods[0].date).toBe(expectedOldestDateStr);

      // Test page beyond available data
      const emptyResponse = await request(app)
        .get('/api/moods?limit=10&page=10')
        .expect(200);

      expect(emptyResponse.body.moods).toHaveLength(0);
      expect(emptyResponse.body.total).toBe(30);
    });
  });

  describe('History Viewing User Experience', () => {
    it('should provide intuitive navigation through mood history', async () => {
      // Recent entries (what user sees first)
      const recentResponse = await request(app)
        .get('/api/moods?limit=7') // Week view
        .expect(200);

      expect(recentResponse.body.moods).toHaveLength(7);
      
      // Most recent should be first
      expect(recentResponse.body.moods[0].date).toBe('2025-09-22');
      expect(recentResponse.body.moods[6].date).toBe('2025-09-16');

      // Pagination info should be helpful
      expect(recentResponse.body.total).toBe(30);
      expect(recentResponse.body.page).toBe(1);
      expect(recentResponse.body.limit).toBe(7);

      // User can navigate to older entries
      const olderResponse = await request(app)
        .get('/api/moods?limit=7&page=2')
        .expect(200);

      expect(olderResponse.body.moods[0].date).toBe('2025-09-15');
      expect(olderResponse.body.moods[6].date).toBe('2025-09-09');
    });

    it('should support common history viewing patterns', async () => {
      // Monthly view pattern
      const monthlyResponse = await request(app)
        .get('/api/moods?from=2025-09-01&to=2025-09-30')
        .expect(200);

      expect(monthlyResponse.body.moods.length).toBeGreaterThanOrEqual(20);

      // Weekly view pattern  
      const weeklyResponse = await request(app)
        .get('/api/moods?from=2025-09-16&to=2025-09-22')
        .expect(200);

      expect(weeklyResponse.body.moods).toHaveLength(7);

      // "Show me my last 10 entries" pattern
      const lastTenResponse = await request(app)
        .get('/api/moods?limit=10')
        .expect(200);

      expect(lastTenResponse.body.moods).toHaveLength(10);
      expect(lastTenResponse.body.moods[0].date).toBe('2025-09-22');
    });
  });
});