# API Contract: Mood Entries

## POST /api/moods
Create or update a mood entry for a specific date.

### Request
```json
{
  "date": "2025-09-22",
  "emoji": "😊",
  "note": "Had a great day at work!"
}
```

### Request Schema
- `date` (string, required): Date in YYYY-MM-DD format
- `emoji` (string, required): One of [😢, 😐, 😊, 😄, 😍]
- `note` (string, optional): Text note, max 500 characters

### Response (201 Created / 200 Updated)
```json
{
  "success": true,
  "data": {
    "id": 1,
    "date": "2025-09-22",
    "emoji": "😊",
    "note": "Had a great day at work!",
    "created_at": "2025-09-22T10:30:00.000Z",
    "updated_at": "2025-09-22T10:30:00.000Z"
  }
}
```

### Error Response (400 Bad Request)
```json
{
  "success": false,
  "error": "Invalid emoji. Must be one of: 😢, 😐, 😊, 😄, 😍",
  "code": "INVALID_EMOJI"
}
```

### Validation Rules
- Date must be valid ISO date format
- Date cannot be in the future
- Emoji must be from predefined set
- Note length must not exceed 500 characters
- If entry exists for date, update instead of create

---

## GET /api/moods/:date
Get mood entry for a specific date.

### Request
- `date` (path parameter): Date in YYYY-MM-DD format

### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": 1,
    "date": "2025-09-22",
    "emoji": "😊",
    "note": "Had a great day at work!",
    "created_at": "2025-09-22T10:30:00.000Z",
    "updated_at": "2025-09-22T10:30:00.000Z"
  }
}
```

### Response (404 Not Found)
```json
{
  "success": false,
  "error": "No mood entry found for date 2025-09-22",
  "code": "ENTRY_NOT_FOUND"
}
```

---

## GET /api/moods
Get mood entries with optional filtering.

### Query Parameters
- `start_date` (optional): Start date in YYYY-MM-DD format
- `end_date` (optional): End date in YYYY-MM-DD format
- `limit` (optional): Maximum number of entries to return (default: 30)

### Request Examples
- `GET /api/moods` - Get recent 30 entries
- `GET /api/moods?limit=7` - Get recent 7 entries
- `GET /api/moods?start_date=2025-09-01&end_date=2025-09-30` - Get September entries

### Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": 2,
      "date": "2025-09-22",
      "emoji": "😊",
      "note": "Had a great day at work!",
      "created_at": "2025-09-22T10:30:00.000Z",
      "updated_at": "2025-09-22T10:30:00.000Z"
    },
    {
      "id": 1,
      "date": "2025-09-21",
      "emoji": "😐",
      "note": "",
      "created_at": "2025-09-21T18:45:00.000Z",
      "updated_at": "2025-09-21T18:45:00.000Z"
    }
  ],
  "meta": {
    "count": 2,
    "total": 15
  }
}
```

---

## DELETE /api/moods/:date
Delete mood entry for a specific date.

### Request
- `date` (path parameter): Date in YYYY-MM-DD format

### Response (200 OK)
```json
{
  "success": true,
  "message": "Mood entry for 2025-09-22 deleted successfully"
}
```

### Response (404 Not Found)
```json
{
  "success": false,
  "error": "No mood entry found for date 2025-09-22",
  "code": "ENTRY_NOT_FOUND"
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_DATE` | Date format is invalid or date is in the future |
| `INVALID_EMOJI` | Emoji is not in the allowed set |
| `NOTE_TOO_LONG` | Note exceeds 500 character limit |
| `ENTRY_NOT_FOUND` | No mood entry exists for the specified date |
| `SERVER_ERROR` | Internal server error occurred |