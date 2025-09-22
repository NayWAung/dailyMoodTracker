# Daily Mood Tracker

A very simple application that allows users to log their mood each day with an emoji and a short note.

## Features

- 🎭 **Simple Mood Logging** - Select an emoji and add a note
- 📱 **Mobile-First Design** - Responsive on all devices  
- 🔄 **Offline Support** - Works without internet connection
- ⚡ **Fast Performance** - Optimized for speed
- 🏠 **PWA Installable** - Install as a native app
- 🔒 **Privacy-First** - Your data stays secure

## Quick Start

### Option 1: Start Backend Only
```bash
npm start
```
This starts the backend API server at `http://localhost:3000`

### Option 2: Start Frontend Only
```bash
npm run start:frontend
```
This starts the frontend server at `http://localhost:8080`

### Option 3: Manual Setup
```bash
# Start backend (Terminal 1)
cd backend
npm start

# Start frontend (Terminal 2)  
cd frontend
node server.js
```

## Usage

1. **Open** `http://localhost:8080` in your browser
2. **Select** your mood emoji 
3. **Write** a short note about your day
4. **Click** "Log Mood" to save
5. **View** your mood history below

## Project Structure

```
├── backend/           # Node.js + Express API
│   ├── src/          # Source code
│   ├── tests/        # Test files
│   └── package.json  # Backend dependencies
├── frontend/         # PWA Frontend
│   ├── index.html    # Main app
│   ├── styles.css    # Styling
│   ├── main.js       # App logic
│   └── manifest.json # PWA config
└── package.json      # Root scripts
```

## API Endpoints

- `GET /api/moods` - Get all mood entries
- `POST /api/moods` - Create new mood entry
- `DELETE /api/moods/:id` - Delete mood entry

## Tech Stack

- **Backend**: Node.js, Express.js, SQLite3
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Features**: PWA, Service Worker, Offline Support
- **Testing**: Jest (114 tests passing)

## Constitutional Requirements ✅

- ✅ Test-Driven Development (TDD)
- ✅ >90% Test Coverage
- ✅ <100ms Mood Entry Performance
- ✅ <500ms Analytics Performance  
- ✅ Privacy-by-Design
- ✅ Accessibility Compliant

---

*Built with ❤️ for simple, effective mood tracking*