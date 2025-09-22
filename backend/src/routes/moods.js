// Mood API routes - RESTful endpoints for mood tracking
// Implements constitutional performance and validation requirements

const express = require('express');
const { MoodDatabase } = require('../database/database');
const { PerformanceMonitor } = require('../utils/performance');
const {
  validateMoodEntry,
  validateDateParam,
  validateMoodListQuery,
  validateSecurity,
  validateContentType
} = require('../middleware/validation');

const router = express.Router();
const db = new MoodDatabase();
const monitor = new PerformanceMonitor();

// Initialize database connection
let dbInitialized = false;
const ensureDbInitialized = async () => {
  if (!dbInitialized) {
    await db.initialize();
    dbInitialized = true;
  }
};

// POST /api/moods - Create new mood entry
router.post('/', 
  validateContentType,
  validateSecurity,
  validateMoodEntry,
  async (req, res) => {
    const timer = monitor.startTimer('mood_entry');
    
    try {
      await ensureDbInitialized();
      
      const moodEntry = await db.createMoodEntry(req.body);
      
      monitor.endTimer(timer);
      
      // Constitutional performance validation
      if (!monitor.validateBudget(timer, 'mood_entry')) {
        console.warn(`Performance budget exceeded: ${timer.duration}ms`);
      }

      res.status(201).json(moodEntry.toJSON());
    } catch (error) {
      monitor.endTimer(timer);
      
      if (error.code === 'DUPLICATE_DATE') {
        return res.status(409).json({
          error: error.message,
          suggestion: error.suggestion
        });
      }
      
      console.error('Error creating mood entry:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
);

// GET /api/moods/:date - Get mood entry by date
router.get('/:date',
  validateSecurity,
  validateDateParam,
  async (req, res) => {
    const timer = monitor.startTimer('analytics');
    
    try {
      await ensureDbInitialized();
      
      const moodEntry = await db.getMoodEntryByDate(req.validatedDate);
      
      monitor.endTimer(timer);
      
      // Constitutional performance validation
      if (!monitor.validateBudget(timer, 'analytics')) {
        console.warn(`Performance budget exceeded: ${timer.duration}ms`);
      }

      if (!moodEntry) {
        return res.status(404).json({
          error: 'Mood entry not found',
          date: req.validatedDate
        });
      }

      res.json(moodEntry.toJSON());
    } catch (error) {
      monitor.endTimer(timer);
      
      console.error('Error fetching mood entry:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
);

// GET /api/moods - Get mood entries list with pagination
router.get('/',
  validateSecurity,
  validateMoodListQuery,
  async (req, res) => {
    const timer = monitor.startTimer('analytics');
    
    try {
      await ensureDbInitialized();
      
      const options = {
        limit: req.query.limit || 20,
        page: req.query.page || 1,
        from: req.query.from,
        to: req.query.to
      };

      const result = await db.getMoodEntries(options);
      
      monitor.endTimer(timer);
      
      // Constitutional performance validation
      if (!monitor.validateBudget(timer, 'analytics')) {
        console.warn(`Performance budget exceeded: ${timer.duration}ms`);
      }

      // Convert mood entries to JSON format
      const response = {
        moods: result.moods.map(mood => mood.toJSON()),
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages
      };

      res.json(response);
    } catch (error) {
      monitor.endTimer(timer);
      
      console.error('Error fetching mood entries:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
);

// DELETE /api/moods/:date - Delete mood entry by date
router.delete('/:date',
  validateSecurity,
  validateDateParam,
  async (req, res) => {
    const timer = monitor.startTimer('mood_entry');
    
    try {
      await ensureDbInitialized();
      
      const deletedEntry = await db.deleteMoodEntryByDate(req.validatedDate);
      
      monitor.endTimer(timer);
      
      // Constitutional performance validation
      if (!monitor.validateBudget(timer, 'mood_entry')) {
        console.warn(`Performance budget exceeded: ${timer.duration}ms`);
      }

      res.json({
        message: 'Mood entry deleted successfully',
        date: req.validatedDate,
        deleted: true,
        deletedEntry: deletedEntry.toJSON()
      });
    } catch (error) {
      monitor.endTimer(timer);
      
      if (error.code === 'NOT_FOUND') {
        return res.status(404).json({
          error: 'Mood entry not found',
          date: req.validatedDate,
          deleted: false
        });
      }
      
      console.error('Error deleting mood entry:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
);

// Health check endpoint
router.get('/health/check', async (req, res) => {
  try {
    await ensureDbInitialized();
    const health = await db.healthCheck();
    res.json({
      status: 'ok',
      database: health,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Statistics endpoint for analytics
router.get('/stats/summary', async (req, res) => {
  const timer = monitor.startTimer('analytics');
  
  try {
    await ensureDbInitialized();
    
    const days = parseInt(req.query.days) || 30;
    const stats = await db.getStatistics({ days });
    
    monitor.endTimer(timer);
    
    if (!monitor.validateBudget(timer, 'analytics')) {
      console.warn(`Performance budget exceeded: ${timer.duration}ms`);
    }

    res.json(stats);
  } catch (error) {
    monitor.endTimer(timer);
    
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Graceful shutdown handler
const shutdown = async () => {
  if (dbInitialized) {
    await db.close();
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

module.exports = router;