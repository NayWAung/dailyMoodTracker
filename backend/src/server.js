// Express server for Daily Mood Tracker
// Implements constitutional requirements for performance and security

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const moodRoutes = require('./routes/moods');

function createApp() {
  const app = express();

  // Basic middleware
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // CORS configuration
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:8080',
    credentials: true
  }));

  // Logging
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined'));
  }

  // API routes
  app.use('/api/moods', moodRoutes);

  // Health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  });

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      error: 'Route not found',
      path: req.originalUrl,
      method: req.method
    });
  });

  // Global error handler
  app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({
        error: 'Invalid JSON format'
      });
    }

    res.status(500).json({
      error: 'Internal server error'
    });
  });

  return app;
}

module.exports = { createApp };

// Start server if this file is run directly
if (require.main === module) {
  const app = createApp();
  const PORT = process.env.PORT || 3001;
  
  app.listen(PORT, () => {
    console.log(`Daily Mood Tracker server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}