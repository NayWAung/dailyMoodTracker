// MoodEntry model - Core data model for mood tracking
// Implements constitutional validation rules and data integrity

class MoodEntry {
  constructor({ id = null, date, emoji, note = null, created_at = null, updated_at = null }) {
    this.id = id;
    this.date = date;
    this.emoji = emoji;
    // Convert empty string to null for consistency
    this.note = (note === '' || note === undefined) ? null : note;
    this.created_at = created_at || new Date().toISOString();
    this.updated_at = updated_at || new Date().toISOString();
    
    // Validate on construction
    this.validate();
  }

  // Constitutional validation rules
  validate() {
    const errors = [];

    // Date validation
    if (!this.date) {
      errors.push('Date is required');
    } else if (!this.isValidDate(this.date)) {
      errors.push('date must be in YYYY-MM-DD format');  // lowercase for test compatibility
    }

    // Emoji validation - constitutional constraint
    const allowedEmojis = ['😢', '😐', '😊', '😄', '😍'];
    if (!this.emoji) {
      errors.push('Emoji is required');
    } else if (!allowedEmojis.includes(this.emoji)) {
      errors.push(`emoji must be one of: ${allowedEmojis.join(', ')}`);  // lowercase for test compatibility
    }

    // Note validation - constitutional constraint (500 char limit)
    if (this.note !== null && typeof this.note === 'string' && this.note.length > 500) {
      errors.push('note must be 500 characters or less');  // lowercase for test compatibility
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join('; '));
    }
  }

  isValidDate(dateString) {
    // Check YYYY-MM-DD format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
      return false;
    }

    // Check if it's a valid date
    const date = new Date(dateString);
    const [year, month, day] = dateString.split('-').map(Number);
    
    return date.getFullYear() === year &&
           date.getMonth() + 1 === month &&
           date.getDate() === day;
  }

  // Convert to database format
  toDbFormat() {
    return {
      id: this.id,
      date: this.date,
      emoji: this.emoji,
      note: this.note,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }

  // Convert to API response format
  toJSON() {
    return {
      id: this.id,
      date: this.date,
      emoji: this.emoji,
      note: this.note,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }

  // Create from database row
  static fromDbRow(row) {
    return new MoodEntry({
      id: row.id,
      date: row.date,
      emoji: row.emoji,
      note: row.note,
      created_at: row.created_at,
      updated_at: row.updated_at
    });
  }

  // Update timestamps
  touch() {
    this.updated_at = new Date().toISOString();
  }

  // Static validation method for middleware use
  static validateInput(data) {
    const errors = [];

    // Required fields
    if (!data.date) {
      errors.push('Date is required');
    }
    if (!data.emoji) {
      errors.push('Emoji is required');
    }

    // Type validation
    if (data.date && typeof data.date !== 'string') {
      errors.push('date must be a string');  // lowercase for test compatibility
    }
    if (data.emoji && typeof data.emoji !== 'string') {
      errors.push('Emoji must be a string');
    }
    if (data.note !== undefined && data.note !== null && typeof data.note !== 'string') {
      errors.push('note must be a string');  // lowercase for test compatibility
    }

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    // Create temporary instance to validate business rules
    try {
      new MoodEntry({
        date: data.date,
        emoji: data.emoji,
        note: data.note
      });
      return { isValid: true, errors: [] };
    } catch (error) {
      return { isValid: false, errors: [error.message] };
    }
  }
}

// Custom validation error class
class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

module.exports = { MoodEntry, ValidationError };