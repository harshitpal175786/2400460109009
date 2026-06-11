# Stage 1

## Notification System API Design

### Overview

The Campus Notification System allows students to receive real-time notifications related to:

- Placements
- Results
- Events

The system should support creating, retrieving, updating, and managing notifications efficiently while enabling real-time delivery.

---

## Authentication

All APIs require authentication.

### Headers

```http
Authorization: Bearer <token>
Content-Type: application/json
```

---

## 1. Get Notifications

Retrieve notifications for a student.

### Endpoint

```http
GET /api/v1/notifications
```

### Query Parameters

| Parameter | Type | Description |
|------------|--------|------------|
| page | number | Page number |
| limit | number | Records per page |
| notification_type | string | Event, Result, Placement |

### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "type": "Placement",
      "message": "Microsoft hiring drive announced",
      "isRead": false,
      "createdAt": "2026-06-11T10:00:00Z"
    }
  ]
}
```

---

## 2. Get Notification By ID

### Endpoint

```http
GET /api/v1/notifications/{id}
```

### Response

```json
{
  "success": true,
  "data": {
    "id": "1",
    "type": "Placement",
    "message": "Microsoft hiring drive announced",
    "isRead": false,
    "createdAt": "2026-06-11T10:00:00Z"
  }
}
```

---

## 3. Create Notification

### Endpoint

```http
POST /api/v1/notifications
```

### Request

```json
{
  "type": "Placement",
  "message": "Microsoft hiring drive announced"
}
```

### Response

```json
{
  "success": true,
  "message": "Notification created successfully"
}
```

---

## 4. Mark Notification As Read

### Endpoint

```http
PATCH /api/v1/notifications/{id}/read
```

### Response

```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

---

## 5. Mark All Notifications As Read

### Endpoint

```http
PATCH /api/v1/notifications/read-all
```

### Response

```json
{
  "success": true,
  "message": "All notifications marked as read"
}
```

---

## 6. Delete Notification

### Endpoint

```http
DELETE /api/v1/notifications/{id}
```

### Response

```json
{
  "success": true,
  "message": "Notification deleted successfully"
}
```

---

## Real-Time Notification Mechanism

To provide instant updates to students, WebSockets will be used.

### Flow

1. Student opens application.
2. Client establishes WebSocket connection.
3. New notification created.
4. Server pushes notification instantly.
5. Notification appears without page refresh.

### Benefits

- Real-time delivery
- Reduced polling
- Better user experience
- Lower API traffic

---