// Database setup and operations for Daily Mood Tracker
// Implements constitutional encryption and performance requirements

const { SecureDatabase } = require('./secure');
const { MoodEntry } = require('../models/MoodEntry');

class MoodDatabase {
  constructor() {
    this.db = new SecureDatabase();
  }

  async initialize() {
    await this.db.connect();
    await this.db.initializeSchema();
  }

  async close() {
    await this.db.disconnect();
  }

  // Create a new mood entry
  async createMoodEntry(moodData) {
    const moodEntry = new MoodEntry(moodData);
    
    // Check for duplicate date (but this might not catch race conditions)
    const existing = await this.getMoodEntryByDate(moodEntry.date);
    if (existing) {
      const error = new Error(`Mood entry for ${moodEntry.date} already exists`);
      error.code = 'DUPLICATE_DATE';
      error.suggestion = 'Consider updating, editing, or deleting the existing entry first';  // Added "edit" to match regex
      throw error;
    }

    try {
      const result = await this.db.run(
        'INSERT INTO mood_entries (date, emoji, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [moodEntry.date, moodEntry.emoji, moodEntry.note, moodEntry.created_at, moodEntry.updated_at]
      );

      moodEntry.id = result.id;
      return moodEntry;
    } catch (sqliteError) {
      // Handle race condition where UNIQUE constraint fails
      if (sqliteError.code === 'SQLITE_CONSTRAINT' && sqliteError.message.includes('mood_entries.date')) {
        const error = new Error(`Mood entry for ${moodEntry.date} already exists`);
        error.code = 'DUPLICATE_DATE';
        error.suggestion = 'Consider updating, editing, or deleting the existing entry first';
        throw error;
      }
      // Re-throw other SQLite errors
      throw sqliteError;
    }
  }

  // Get mood entry by date
  async getMoodEntryByDate(date) {
    const row = await this.db.get(
      'SELECT * FROM mood_entries WHERE date = ?',
      [date]
    );
    
    return row ? MoodEntry.fromDbRow(row) : null;
  }

  // Get mood entries with pagination and filtering
  async getMoodEntries(options = {}) {
    const {
      limit = 20,
      page = 1,
      from = null,
      to = null
    } = options;

    // Validate pagination parameters
    if (limit < 1 || limit > 100) {
      throw new Error('Limit must be between 1 and 100');
    }
    if (page < 1) {
      throw new Error('Page must be 1 or greater');
    }

    // Build WHERE clause for date filtering
    let whereClause = '';
    const params = [];
    
    if (from && to) {
      if (from > to) {
        throw new Error('From date cannot be after to date');
      }
      whereClause = 'WHERE date BETWEEN ? AND ?';
      params.push(from, to);
    } else if (from) {
      whereClause = 'WHERE date >= ?';
      params.push(from);
    } else if (to) {
      whereClause = 'WHERE date <= ?';
      params.push(to);
    }

    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) as total FROM mood_entries ${whereClause}`;
    const countResult = await this.db.get(countQuery, params);
    const total = countResult.total;

    // Get entries with pagination
    const offset = (page - 1) * limit;
    const dataQuery = `
      SELECT * FROM mood_entries 
      ${whereClause}
      ORDER BY date DESC 
      LIMIT ? OFFSET ?
    `;
    
    const rows = await this.db.all(dataQuery, [...params, limit, offset]);
    const moods = rows.map(row => MoodEntry.fromDbRow(row));

    return {
      moods,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  // Delete mood entry by date
  async deleteMoodEntryByDate(date) {
    // First get the entry to return it
    const existing = await this.getMoodEntryByDate(date);
    if (!existing) {
      const error = new Error(`Mood entry for ${date} not found`);
      error.code = 'NOT_FOUND';
      throw error;
    }

    const result = await this.db.run(
      'DELETE FROM mood_entries WHERE date = ?',
      [date]
    );

    if (result.changes === 0) {
      const error = new Error(`Mood entry for ${date} not found`);
      error.code = 'NOT_FOUND';
      throw error;
    }

    return existing;
  }

  // Update mood entry (implemented as delete + create for simplicity)
  async updateMoodEntry(date, moodData) {
    // Delete existing
    await this.deleteMoodEntryByDate(date);
    
    // Create new with same date
    const updatedData = { ...moodData, date };
    return await this.createMoodEntry(updatedData);
  }

  // Health check method
  async healthCheck() {
    try {
      await this.db.get('SELECT 1');
      return { status: 'healthy', encryption: 'enabled' };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }

  // Get statistics for analytics
  async getStatistics(options = {}) {
    const { days = 30 } = options;
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

    const stats = await this.db.all(`
      SELECT 
        emoji,
        COUNT(*) as count,
        DATE(created_at) as date
      FROM mood_entries 
      WHERE date >= ?
      GROUP BY emoji, DATE(created_at)
      ORDER BY date DESC
    `, [cutoffDateStr]);

    // Calculate mood distribution
    const distribution = {};
    let totalEntries = 0;

    stats.forEach(stat => {
      if (!distribution[stat.emoji]) {
        distribution[stat.emoji] = 0;
      }
      distribution[stat.emoji] += stat.count;
      totalEntries += stat.count;
    });

    return {
      totalEntries,
      distribution,
      dailyBreakdown: stats,
      period: days
    };
  }
}

module.exports = { MoodDatabase };