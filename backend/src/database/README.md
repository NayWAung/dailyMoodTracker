# SQLCipher Configuration Guide

## Overview
This project uses SQLCipher to provide transparent encryption for the SQLite database, ensuring constitutional privacy requirements are met.

## Installation
SQLCipher is included as a Node.js dependency in package.json. If you encounter issues with the native compilation, try:

```bash
# macOS with Homebrew
brew install sqlcipher

# Rebuild native modules
npm rebuild
```

## Configuration

### Environment Variables
- `DB_ENCRYPTION_KEY`: The encryption key for the database (required in production)
- `DB_FILE`: Path to the database file (defaults to backend/data/moods.db)
- `NODE_ENV`: Set to 'test' for test database usage

### Development
In development, a default key is used. **Change this in production!**

### Production
Set the `DB_ENCRYPTION_KEY` environment variable:
```bash
export DB_ENCRYPTION_KEY="your-secure-32-character-key-here"
```

## Security Notes
1. The encryption key should be at least 32 characters
2. Never commit encryption keys to version control
3. In production, use a secure key management system
4. The database file is encrypted at rest
5. All constitutional privacy requirements are enforced at the database level

## Testing
Test databases use a predictable key for consistency. Test data is automatically cleaned up.

## Backup
Encrypted database files require the same encryption key to be readable. Store keys securely.