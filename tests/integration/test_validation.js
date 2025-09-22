const request = require('supertest');
const { SecureDatabase } = require('../../backend/src/database/secure');

// THIS TEST MUST FAIL - No implementation exists yet
describe('Integration Test: Validation and Error Handling', () => {
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

  describe('Comprehensive Input Validation', () => {
    it('should validate all emoji constraints comprehensively', async () => {
      const invalidEmojis = [
        '🤖', '🎉', '🎈', '❤️', '🏠', '🚗', '🍎', '😀', '😃', '😁', '😆'
      ];

      for (const emoji of invalidEmojis) {
        const invalidData = {
          date: '2025-09-22',
          emoji: emoji,
          note: `Testing invalid emoji: ${emoji}`
        };

        const errorResponse = await request(app)
          .post('/api/moods')
          .send(invalidData)
          .expect(400);

        expect(errorResponse.body.error).toContain('emoji');
        expect(errorResponse.body.error).toContain('😢');
        expect(errorResponse.body.error).toContain('😐');
        expect(errorResponse.body.error).toContain('😊');
        expect(errorResponse.body.error).toContain('😄');
        expect(errorResponse.body.error).toContain('😍');
      }

      // Verify no invalid entries were created
      const checkResponse = await request(app)
        .get('/api/moods')
        .expect(200);
      expect(checkResponse.body.moods).toHaveLength(0);
    });

    it('should validate all allowed emojis work correctly', async () => {
      const validEmojis = ['😢', '😐', '😊', '😄', '😍'];

      for (let i = 0; i < validEmojis.length; i++) {
        const emoji = validEmojis[i];
        const validData = {
          date: `2025-09-${18 + i}`, // Different dates to avoid conflicts
          emoji: emoji,
          note: `Testing valid emoji: ${emoji}`
        };

        const response = await request(app)
          .post('/api/moods')
          .send(validData)
          .expect(201);

        expect(response.body.emoji).toBe(emoji);
        expect(response.body.note).toBe(`Testing valid emoji: ${emoji}`);
      }

      // Verify all valid entries were created
      const checkResponse = await request(app)
        .get('/api/moods')
        .expect(200);
      expect(checkResponse.body.moods).toHaveLength(5);
    });

    it('should validate date format constraints thoroughly', async () => {
      const invalidDates = [
        'today',
        'yesterday', 
        '2025/09/22',
        '22-09-2025',
        '09-22-2025',
        '2025.09.22',
        'Sep 22, 2025',
        '2025-13-01', // Invalid month
        '2025-02-30', // Invalid day
        '2025-00-15', // Invalid month
        '2025-06-32', // Invalid day
        '20250922',   // No separators
        '25-09-22',   // Wrong year format
        '',           // Empty
        null,         // Null
        undefined     // Undefined
      ];

      for (const invalidDate of invalidDates) {
        const invalidData = {
          date: invalidDate,
          emoji: '😊',
          note: `Testing invalid date: ${invalidDate}`
        };

        const errorResponse = await request(app)
          .post('/api/moods')
          .send(invalidData)
          .expect(400);

        expect(errorResponse.body.error).toMatch(/date|format/i);
      }
    });

    it('should validate note length constraints with edge cases', async () => {
      const testCases = [
        { length: 501, shouldFail: true, description: 'over limit' },
        { length: 500, shouldFail: false, description: 'exactly at limit' },
        { length: 499, shouldFail: false, description: 'just under limit' },
        { length: 250, shouldFail: false, description: 'middle length' },
        { length: 1, shouldFail: false, description: 'minimal length' },
        { length: 0, shouldFail: false, description: 'empty string' }
      ];

      for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        const note = testCase.length > 0 ? 'a'.repeat(testCase.length) : '';
        
        const testData = {
          date: `2025-09-${15 + i}`, // Different dates
          emoji: '😊',
          note: note
        };

        if (testCase.shouldFail) {
          const errorResponse = await request(app)
            .post('/api/moods')
            .send(testData)
            .expect(400);

          expect(errorResponse.body.error).toMatch(/note|length|500/i);
        } else {
          const response = await request(app)
            .post('/api/moods')
            .send(testData)
            .expect(201);

          expect(response.body.note).toBe(note || null);
        }
      }
    });
  });

  describe('Required Field Validation', () => {
    it('should require date field', async () => {
      const noDateData = {
        emoji: '😊',
        note: 'Missing date field'
      };

      const errorResponse = await request(app)
        .post('/api/moods')
        .send(noDateData)
        .expect(400);

      expect(errorResponse.body.error).toMatch(/date.*required/i);
    });

    it('should require emoji field', async () => {
      const noEmojiData = {
        date: '2025-09-22',
        note: 'Missing emoji field'
      };

      const errorResponse = await request(app)
        .post('/api/moods')
        .send(noEmojiData)
        .expect(400);

      expect(errorResponse.body.error).toMatch(/emoji.*required/i);
    });

    it('should allow optional note field', async () => {
      const noNoteData = {
        date: '2025-09-22',
        emoji: '😊'
        // note is optional
      };

      const response = await request(app)
        .post('/api/moods')
        .send(noNoteData)
        .expect(201);

      expect(response.body.note).toBeNull();
      expect(response.body.emoji).toBe('😊');
      expect(response.body.date).toBe('2025-09-22');
    });

    it('should handle empty request body', async () => {
      const errorResponse = await request(app)
        .post('/api/moods')
        .send({})
        .expect(400);

      expect(errorResponse.body.error).toMatch(/date.*required|emoji.*required/i);
    });
  });

  describe('Data Type Validation', () => {
    it('should validate date field is string', async () => {
      const invalidTypes = [123, true, [], {}, null];

      for (const invalidDate of invalidTypes) {
        const invalidData = {
          date: invalidDate,
          emoji: '😊',
          note: 'Type validation test'
        };

        await request(app)
          .post('/api/moods')
          .send(invalidData)
          .expect(400);
      }
    });

    it('should validate emoji field is string', async () => {
      const invalidTypes = [123, true, [], {}, null];

      for (const invalidEmoji of invalidTypes) {
        const invalidData = {
          date: '2025-09-22',
          emoji: invalidEmoji,
          note: 'Type validation test'
        };

        await request(app)
          .post('/api/moods')
          .send(invalidData)
          .expect(400);
      }
    });

    it('should validate note field is string when provided', async () => {
      const invalidTypes = [123, true, [], {}];

      for (const invalidNote of invalidTypes) {
        const invalidData = {
          date: '2025-09-22',
          emoji: '😊',
          note: invalidNote
        };

        await request(app)
          .post('/api/moods')
          .send(invalidData)
          .expect(400);
      }
    });
  });

  describe('Security Validation', () => {
    it('should prevent SQL injection attempts', async () => {
      const sqlInjectionAttempts = [
        "'; DROP TABLE mood_entries; --",
        "' OR '1'='1",
        "'; DELETE FROM mood_entries; --",
        "' UNION SELECT * FROM mood_entries --",
        "'; INSERT INTO mood_entries VALUES ('hack'); --"
      ];

      for (const injection of sqlInjectionAttempts) {
        const maliciousData = {
          date: injection,
          emoji: '😊',
          note: injection
        };

        await request(app)
          .post('/api/moods')
          .send(maliciousData)
          .expect(400);
      }

      // Verify database integrity
      const dbCheck = await db.all('SELECT name FROM sqlite_master WHERE type="table"');
      expect(dbCheck.find(table => table.name === 'mood_entries')).toBeTruthy();
    });

    it('should prevent XSS attempts in note field', async () => {
      const xssAttempts = [
        '<script>alert("xss")</script>',
        '<img src="x" onerror="alert(1)">',
        'javascript:alert("xss")',
        '<svg onload="alert(1)">',
        '"><script>alert("xss")</script>'
      ];

      for (let i = 0; i < xssAttempts.length; i++) {
        const xssData = {
          date: `2025-09-${15 + i}`,
          emoji: '😊',
          note: xssAttempts[i]
        };

        // Should accept but sanitize (or reject if app doesn't allow HTML)
        // For this simple app, likely should just store as-is but escape on output
        const response = await request(app)
          .post('/api/moods')
          .send(xssData)
          .expect(201);

        // Note content should be stored (sanitization happens on output)
        expect(response.body.note).toBe(xssAttempts[i]);
      }
    });

    it('should handle special characters safely', async () => {
      const specialCharacters = [
        'Café ñoño 中文 🌟',
        'Åpfel Übung naïve résumé',
        'Testing "quotes" and \'apostrophes\'',
        'Line\nbreaks\rand\ttabs',
        'Symbols: !@#$%^&*()_+-=[]{}|;:,.<>?',
        'Unicode: ∑π∆∞≠≤≥'
      ];

      for (let i = 0; i < specialCharacters.length; i++) {
        const specialData = {
          date: `2025-09-${10 + i}`,
          emoji: '😊',
          note: specialCharacters[i]
        };

        const response = await request(app)
          .post('/api/moods')
          .send(specialData)
          .expect(201);

        expect(response.body.note).toBe(specialCharacters[i]);
      }
    });
  });

  describe('Error Response Format and Quality', () => {
    it('should provide helpful error messages for validation failures', async () => {
      const invalidData = {
        date: 'invalid-date',
        emoji: '🤖',
        note: 'x'.repeat(501)
      };

      const errorResponse = await request(app)
        .post('/api/moods')
        .send(invalidData)
        .expect(400);

      // Error should be informative
      expect(errorResponse.body).toHaveProperty('error');
      expect(errorResponse.body.error).toBeTruthy();
      expect(typeof errorResponse.body.error).toBe('string');
      expect(errorResponse.body.error.length).toBeGreaterThan(10);
    });

    it('should provide consistent error response structure', async () => {
      const testCases = [
        { date: 'invalid', emoji: '😊', note: 'test' },
        { date: '2025-09-22', emoji: '🤖', note: 'test' },
        { date: '2025-09-22', emoji: '😊', note: 'x'.repeat(501) }
      ];

      for (const testCase of testCases) {
        const errorResponse = await request(app)
          .post('/api/moods')
          .send(testCase)
          .expect(400);

        // Consistent error structure
        expect(errorResponse.body).toHaveProperty('error');
        expect(typeof errorResponse.body.error).toBe('string');
        
        // Optional: timestamp, request ID, etc.
        expect(errorResponse.headers['content-type']).toMatch(/json/);
      }
    });

    it('should handle malformed JSON gracefully', async () => {
      // This test depends on how the server handles malformed JSON
      // Most Express apps with body-parser will handle this automatically
      const response = await request(app)
        .post('/api/moods')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Duplicate Prevention and Conflicts', () => {
    it('should prevent duplicate entries with helpful conflict resolution', async () => {
      const originalData = {
        date: '2025-09-22',
        emoji: '😊',
        note: 'Original entry'
      };

      // Create original entry
      await request(app)
        .post('/api/moods')
        .send(originalData)
        .expect(201);

      // Attempt duplicate
      const duplicateData = {
        date: '2025-09-22',
        emoji: '😄',
        note: 'Attempted duplicate'
      };

      const conflictResponse = await request(app)
        .post('/api/moods')
        .send(duplicateData)
        .expect(409);

      expect(conflictResponse.body.error).toContain('already exists');
      expect(conflictResponse.body.error).toContain('2025-09-22');
      expect(conflictResponse.body).toHaveProperty('suggestion');
      expect(conflictResponse.body.suggestion).toMatch(/update|edit|delete/i);

      // Verify original entry unchanged
      const checkResponse = await request(app)
        .get('/api/moods/2025-09-22')
        .expect(200);

      expect(checkResponse.body.emoji).toBe('😊');
      expect(checkResponse.body.note).toBe('Original entry');
    });

    it('should handle concurrent creation attempts safely', async () => {
      const sameDate = '2025-09-22';
      const concurrentData = [
        { date: sameDate, emoji: '😊', note: 'First attempt' },
        { date: sameDate, emoji: '😄', note: 'Second attempt' },
        { date: sameDate, emoji: '😍', note: 'Third attempt' }
      ];

      // Attempt concurrent creation
      const promises = concurrentData.map(data =>
        request(app).post('/api/moods').send(data)
      );

      const results = await Promise.allSettled(promises);

      // Only one should succeed, others should fail with conflict
      const successes = results.filter(r => r.status === 'fulfilled' && r.value.status === 201);
      const conflicts = results.filter(r => r.status === 'fulfilled' && r.value.status === 409);

      expect(successes).toHaveLength(1);
      expect(conflicts).toHaveLength(2);

      // Verify only one entry exists
      const finalCheck = await request(app)
        .get('/api/moods')
        .expect(200);

      expect(finalCheck.body.moods).toHaveLength(1);
      expect(finalCheck.body.moods[0].date).toBe(sameDate);
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle extreme boundary dates', async () => {
      const boundaryDates = [
        '1900-01-01', // Very old date
        '2099-12-31', // Far future date
        '2000-02-29', // Leap year
        '2001-02-28', // Non-leap year
        '2025-01-01', // New year
        '2025-12-31'  // End of year
      ];

      for (let i = 0; i < boundaryDates.length; i++) {
        const boundaryData = {
          date: boundaryDates[i],
          emoji: ['😢', '😐', '😊', '😄', '😍'][i % 5],
          note: `Boundary test for ${boundaryDates[i]}`
        };

        const response = await request(app)
          .post('/api/moods')
          .send(boundaryData)
          .expect(201);

        expect(response.body.date).toBe(boundaryDates[i]);
      }
    });

    it('should handle very large request payloads gracefully', async () => {
      // Test with maximum allowed note size
      const maxNoteData = {
        date: '2025-09-22',
        emoji: '😊',
        note: 'a'.repeat(500)
      };

      const response = await request(app)
        .post('/api/moods')
        .send(maxNoteData)
        .expect(201);

      expect(response.body.note.length).toBe(500);
    });

    it('should handle minimum viable requests', async () => {
      const minimalData = {
        date: '2025-09-22',
        emoji: '😊'
        // No note (optional)
      };

      const response = await request(app)
        .post('/api/moods')
        .send(minimalData)
        .expect(201);

      expect(response.body.date).toBe('2025-09-22');
      expect(response.body.emoji).toBe('😊');
      expect(response.body.note).toBeNull();
    });
  });
});