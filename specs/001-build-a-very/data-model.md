# Data Model: Daily Mood Logging

## Entity: MoodEntry

### Fields
- **id**: Integer, Primary Key, Auto-increment
  - Unique identifier for each mood entry
  - Database-generated sequential ID

- **date**: Date (YYYY-MM-DD format)
  - The calendar date for the mood entry
  - Unique constraint (one entry per day)
  - Indexed for query performance

- **emoji**: String (Unicode emoji character)
  - Selected mood emoji from predefined set
  - Not null, required field
  - Validation: Must be one of [😢, 😐, 😊, 😄, 😍]

- **note**: String (max 500 characters)
  - Optional text note accompanying the mood
  - Nullable, can be empty string
  - Validation: Maximum 500 characters

- **created_at**: Timestamp (ISO 8601)
  - When the entry was first created
  - Auto-generated, not null
  - Used for audit trail

- **updated_at**: Timestamp (ISO 8601)
  - When the entry was last modified
  - Auto-generated, updated on save
  - Used for tracking changes

### Validation Rules

#### Business Rules
1. **One Entry Per Day**: Each date can have only one mood entry
2. **Required Emoji**: Every entry must have an emoji selected
3. **Note Length**: Notes cannot exceed 500 characters
4. **Valid Emoji**: Emoji must be from predefined set
5. **Date Constraint**: Date cannot be in the future

#### Database Constraints
```sql
CREATE TABLE mood_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL UNIQUE,
    emoji TEXT NOT NULL CHECK (emoji IN ('😢', '😐', '😊', '😄', '😍')),
    note TEXT CHECK (length(note) <= 500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_mood_entries_date ON mood_entries(date);
```

### State Transitions

#### Creation Flow
1. **New Entry**: User selects date (defaults to today)
2. **Emoji Selection**: User selects emoji (required)
3. **Note Addition**: User optionally adds note
4. **Validation**: System validates all constraints
5. **Save**: Entry created with timestamps

#### Update Flow
1. **Existing Check**: System checks if entry exists for date
2. **Modification**: User updates emoji and/or note
3. **Validation**: System re-validates constraints
4. **Update**: Entry updated with new updated_at timestamp

#### Query Patterns
- **Today's Entry**: `SELECT * FROM mood_entries WHERE date = CURRENT_DATE`
- **Date Range**: `SELECT * FROM mood_entries WHERE date BETWEEN ? AND ? ORDER BY date DESC`
- **Recent Entries**: `SELECT * FROM mood_entries ORDER BY date DESC LIMIT ?`

## Related Entities

### Future Considerations
While not in scope for the simple application, the data model supports future extensions:
- **MoodCategories**: Predefined emoji mappings with labels
- **UserSettings**: Preferences for emoji sets, note prompts
- **MoodAnalytics**: Computed statistics and trends

The current design maintains simplicity while allowing for natural evolution.