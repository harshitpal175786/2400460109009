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
Stage 2

Database Selection

I recommend PostgreSQL as the primary database for the notification system.

Reasons

* ACID compliance ensures data consistency.
* Supports indexing for faster queries.
* Handles large datasets efficiently.
* Supports transactions.
* Easy to scale using partitioning and replication.

Database Schema

Students Table

Column	Type
id	UUID
name	VARCHAR
email	VARCHAR

Notifications Table

Column	Type
id	UUID
student_id	UUID
notification_type	VARCHAR
message	TEXT
is_read	BOOLEAN
created_at	TIMESTAMP
updated_at	TIMESTAMP

Relationship

Student (1) → Notifications (Many)

SQL Queries

Get Notifications

SELECT *
FROM notifications
WHERE student_id = ?
ORDER BY created_at DESC
LIMIT 20 OFFSET 0;

Mark Notification as Read

UPDATE notifications
SET is_read = TRUE
WHERE id = ?;

Mark All Notifications as Read

UPDATE notifications
SET is_read = TRUE
WHERE student_id = ?;

Create Notification

INSERT INTO notifications
(id, student_id, notification_type, message, is_read, created_at)
VALUES (?, ?, ?, ?, FALSE, NOW());

Delete Notification

DELETE FROM notifications
WHERE id = ?;

Scaling Challenges

* Slow query performance as notifications grow.
* Increased storage requirements.
* Higher API response times.
* Large table scans.
* Increased load during placement seasons.

Scaling Solutions

* Add indexes on frequently queried columns.
* Use pagination.
* Partition notification tables.
* Archive old notifications.
* Use Redis caching.
* Use read replicas for scaling.

Indexing Strategy

CREATE INDEX idx_notifications_student
ON notifications(student_id);
CREATE INDEX idx_notifications_created_at
ON notifications(created_at);
CREATE INDEX idx_notifications_student_read
ON notifications(student_id, is_read);

Conclusion

PostgreSQL with indexing, pagination, partitioning and caching provides a reliable and scalable storage solution for the campus notification platform.


Stage 3

Query Analysis

Given Query:

SELECT *
FROM notifications
WHERE studentID = 1042
AND isRead = false
ORDER BY createdAt ASC;

Is the Query Accurate?

The query correctly retrieves unread notifications for a student.

However, it may return a very large number of rows if the student has accumulated many unread notifications.

Why is the Query Slow?

* Table contains millions of notifications.
* Full table scan may occur if proper indexes are absent.
* Sorting by createdAt is expensive.
* Using SELECT * fetches unnecessary columns.
* No pagination is applied.

Recommended Query

SELECT id,
       notification_type,
       message,
       created_at
FROM notifications
WHERE student_id = 1042
AND is_read = FALSE
ORDER BY created_at DESC
LIMIT 50;

Improvements

* Fetch only required columns.
* Use pagination.
* Use descending order to show latest notifications first.
* Add composite indexes.

Index Strategy

Recommended Index:

CREATE INDEX idx_student_read_created
ON notifications(student_id, is_read, created_at);

This allows filtering and sorting using the same index.

Computation Cost

Without indexes:

O(N)

Database scans millions of rows.

With proper indexing:

O(log N)

Database directly locates matching records.

Should We Index Every Column?

No.

Problems:

* Increased storage consumption.
* Slower INSERT and UPDATE operations.
* Higher maintenance cost.
* Many indexes remain unused.

Indexes should only be added on frequently queried columns.

Query: Students Receiving Placement Notifications in Last 7 Days

SELECT DISTINCT student_id
FROM notifications
WHERE notification_type = 'Placement'
AND created_at >= NOW() - INTERVAL '7 days';

Conclusion

The primary performance issue is lack of indexing and pagination. A composite index on student_id, is_read, and created_at significantly improves query performance while avoiding unnecessary table scans.


# Stage 4

## Problem Statement

Notifications are being fetched on every page load for every student. As the number of students and notifications increases, the database experiences heavy load, resulting in slower response times and poor user experience.

---

## Proposed Solutions

### 1. Pagination

Instead of loading all notifications at once, fetch notifications in smaller chunks.

Example:

GET /api/v1/notifications?page=1&limit=20

#### Benefits

- Reduces database load
- Faster API responses
- Lower memory consumption
- Better user experience

#### Trade-Offs

- Requires multiple API calls for large datasets

---

### 2. Redis Caching

Store frequently accessed notifications in Redis.

Flow:

User Request
→ Redis Cache
→ Database (only if cache miss)

#### Benefits

- Extremely fast reads
- Reduces database traffic
- Improves scalability

#### Trade-Offs

- Additional infrastructure
- Cache invalidation complexity

---

### 3. WebSockets for Real-Time Updates

Instead of fetching notifications on every page refresh, maintain a persistent WebSocket connection.

Flow:

Server
→ WebSocket
→ Client

#### Benefits

- Real-time notification delivery
- Eliminates unnecessary polling
- Better user experience

#### Trade-Offs

- Increased server connection management

---

### 4. Database Read Replicas

Use read replicas for notification retrieval.

Architecture:

Client
    |
Application Server
    |
+--------------+
|              |
Primary DB   Read Replica

#### Benefits

- Distributes read load
- Improves query performance

#### Trade-Offs

- Replication lag
- Additional infrastructure cost

---

### 5. Notification Archiving

Move old notifications to archive tables.

Example:

notifications_active
notifications_archive

#### Benefits

- Smaller active tables
- Faster queries
- Better index efficiency

#### Trade-Offs

- More complex data management

---

## Recommended Architecture

Client
    |
Load Balancer
    |
Application Server
    |
+-------------------+
|                   |
Redis Cache      PostgreSQL
                    |
               Read Replica

Real-Time Updates:
Application Server
        |
    WebSocket
        |
      Client

---

## Final Recommendation

For optimal scalability and performance:

1. Implement Pagination
2. Add Redis Caching
3. Use WebSockets for real-time delivery
4. Configure Read Replicas
5. Archive old notifications periodically

This architecture minimizes database load, improves response time, and supports large-scale notification delivery.

