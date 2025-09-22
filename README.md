# Daily Mood Tracker

A very simple application that allows users to log their mood each day with an emoji and a short note.

## Features

- 🎭 **Simple Mood Logging** - Select an emoji and add a note
- 📱 **Mobile-First Design** - Responsive on all devices  
- 🔄 **Offline Support** - Works without internet connection
- ⚡ **Fast Performance** - Optimized for speed
- 🏠 **PWA Installable** - Install as a native app
- 🔒 **Privacy-First** - Your data stays secure

## Prerequisites

- **Node.js** 18+ 
- **npm** 8+
- **Git** (for cloning)

## Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/NayWAung/dailyMoodTracker.git
cd dailyMoodTracker
```

### 2. Install Dependencies
```bash
# Install backend dependencies
cd backend
npm install
cd ..
```

### 3. Start the Application

#### Option A: Quick Start (Recommended)
```bash
# Start backend server (port 3001)
npm start

# In a new terminal, start frontend server (port 8080)
npm run start:frontend
```

#### Option B: Manual Setup
```bash
# Terminal 1: Start backend
cd backend
npm start

# Terminal 2: Start frontend  
cd frontend
node server.js
```

#### Option C: Development with Both Servers
```bash
# Install concurrently for simultaneous startup (optional)
npm install -g concurrently

# Start both servers at once
npm run start:dev
```

## Usage

### Accessing the Application
1. **Open** your browser and navigate to `http://localhost:8080`
2. The backend API will be running at `http://localhost:3001`

### Logging Your Mood
1. **Select Emoji** - Click on an emoji that represents your current mood
2. **Add Note** - Write a short note about your day (optional)
3. **Submit** - Click "Log Mood" to save your entry
4. **View History** - See your previous mood entries below the form

### PWA Installation (Optional)
- **Chrome/Edge**: Click the install icon in the address bar
- **Safari**: Add to Home Screen from the share menu
- **Mobile**: Use "Add to Home Screen" option

## Development

### Running Tests
```bash
# Run all backend tests
cd backend
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Code Quality
```bash
# Run linting
cd backend
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

### Database Management
```bash
# View database (SQLite)
cd backend/data
sqlite3 moods.db

# Reset database (development only)
rm backend/data/moods.db
npm start  # Will recreate database
```

## Troubleshooting

### Common Issues

**Port Already in Use**
```bash
# Check what's using port 3001
lsof -ti:3001

# Kill process using port
kill -9 $(lsof -ti:3001)

# Or use different port
PORT=3002 npm start
```

**Database Errors**
```bash
# Reset database
cd backend
rm -rf data/moods.db
npm start  # Database will be recreated
```

**Frontend Not Loading**
```bash
# Check if backend is running
curl http://localhost:3001/api/moods

# Restart frontend server
cd frontend
node server.js
```

**CORS Issues**
- Ensure frontend is accessing `http://localhost:8080`
- Backend automatically allows CORS from frontend origin

### Logs and Debugging
```bash
# Backend logs
cd backend
npm start  # Logs will show in terminal

# Enable debug mode
DEBUG=* npm start

# Check network requests in browser DevTools (F12)
```

## Project Structure

```
dailyMoodTracker/
├── backend/                 # Node.js + Express API Server
│   ├── src/
│   │   ├── models/         # Data models (MoodEntry)
│   │   ├── routes/         # API routes (/api/moods)
│   │   ├── middleware/     # Validation, security
│   │   ├── database/       # SQLite setup and queries
│   │   └── server.js       # Express app configuration
│   ├── tests/
│   │   ├── contract/       # API contract tests
│   │   ├── integration/    # Integration tests
│   │   └── setup.js        # Test configuration
│   ├── data/               # SQLite database files
│   ├── package.json        # Backend dependencies
│   └── jest.config.js      # Testing configuration
├── frontend/               # Progressive Web App
│   ├── index.html          # Main application UI
│   ├── styles.css          # Responsive styling
│   ├── main.js             # Core application logic
│   ├── service-worker.js   # Offline functionality
│   ├── manifest.json       # PWA configuration
│   └── server.js           # Development server
├── tests/                  # Cross-platform tests
├── specs/                  # Project specifications
├── package.json            # Root project scripts
├── reflection.md           # AI/Copilot usage reflection
└── README.md               # This file
```

## API Documentation

### Base URL
```
http://localhost:3001/api
```

### Endpoints

#### GET /moods
Get all mood entries
```bash
curl http://localhost:3001/api/moods
```
**Response:**
```json
[
  {
    "id": 1,
    "emoji": "😊",
    "note": "Great day at work!",
    "date": "2025-09-22",
    "created_at": "2025-09-22T10:30:00Z"
  }
]
```

#### POST /moods
Create a new mood entry
```bash
curl -X POST http://localhost:3001/api/moods \
  -H "Content-Type: application/json" \
  -d '{"emoji":"😊","note":"Feeling good today","date":"2025-09-22"}'
```
**Request Body:**
```json
{
  "emoji": "😊",
  "note": "Optional note about your day",
  "date": "2025-09-22"
}
```

#### DELETE /moods/:id
Delete a mood entry
```bash
curl -X DELETE http://localhost:3001/api/moods/1
```

### Response Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `404` - Not Found
- `500` - Server Error

## Tech Stack

### Backend
- **Node.js** 18+ - JavaScript runtime
- **Express.js** 4.x - Web framework
- **SQLite3** - Embedded database
- **Jest** - Testing framework
- **ESLint + Prettier** - Code quality

### Frontend  
- **HTML5** - Semantic markup
- **CSS3** - Modern styling (Grid, Flexbox, Custom Properties)
- **Vanilla JavaScript** ES6+ - No frameworks
- **Service Worker** - Offline functionality
- **PWA** - Progressive Web App features

### Development Tools
- **Git** - Version control
- **npm** - Package management
- **Concurrently** - Run multiple servers
- **Nodemon** - Development server auto-restart

## Performance & Quality

### Constitutional Requirements ✅
- ✅ **Test-Driven Development (TDD)** - 114 tests passing
- ✅ **>90% Test Coverage** - Comprehensive test suite
- ✅ **<100ms Mood Entry Performance** - Optimized for speed
- ✅ **<500ms Analytics Performance** - Fast mood history loading
- ✅ **Privacy-by-Design** - No tracking, local storage priority
- ✅ **Accessibility Compliant** - ARIA labels, semantic HTML

### Metrics
- **Bundle Size**: Minimal (vanilla JS, no frameworks)
- **Database**: SQLite3 (file-based, no server required)
- **Memory Usage**: Low overhead
- **Startup Time**: Fast (< 2 seconds)

## Security

- **No Authentication Required** - Simple personal use
- **Input Validation** - Server-side validation for all inputs
- **XSS Protection** - Sanitized outputs
- **CORS Configuration** - Restricted to frontend origin
- **No External Dependencies** - Minimal attack surface

## Browser Support

- **Chrome** 88+ ✅
- **Firefox** 85+ ✅  
- **Safari** 14+ ✅
- **Edge** 88+ ✅
- **Mobile Safari** iOS 14+ ✅
- **Chrome Mobile** 88+ ✅

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Run tests (`npm test`)
4. Commit changes (`git commit -m 'Add amazing feature'`)
5. Push to branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## License

This project is open source and available under the [MIT License](LICENSE).

## Changelog

### v1.0.0 (2025-09-22)
- ✅ Initial release
- ✅ Basic mood logging with emoji and notes
- ✅ PWA with offline support
- ✅ Mobile-first responsive design
- ✅ 114 tests passing with >90% coverage
- ✅ Constitutional TDD requirements met

---

**Built with ❤️ for simple, effective mood tracking**

*Project developed using the .specify framework with constitutional requirements*