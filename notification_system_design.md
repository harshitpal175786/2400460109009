# Campus Notification System - Technical Design Document

This document outlines the architectural decisions, database design, and implementation strategies for the Campus Notification System, developed across seven distinct stages of evaluation.

---

## Stage 1: API Design & Real-Time Strategy

### Overview
The system provides real-time notifications for students regarding **Placements**, **Results**, and **Events**. It supports full CRUD operations and emphasizes immediate delivery.

### Core Endpoints
All requests require a `Bearer` token in the `Authorization` header.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/notifications` | Fetch paginated notifications (Filters: `notification_type`) |
| `GET` | `/api/v1/notifications/{id}` | Retrieve specific notification details |
| `POST` | `/api/v1/notifications` | Create a new campus notification |
| `PATCH` | `/api/v1/notifications/{id}/read` | Mark a specific notification as viewed |
| `PATCH` | `/api/v1/notifications/read-all` | Mark all notifications for a student as viewed |
| `DELETE` | `/api/v1/notifications/{id}` | Remove a notification |

### Real-Time Mechanism
To minimize latency and reduce server overhead from polling, the system utilizes **WebSockets**.
- **Flow**: Client connects on app load -> Server pushes new notifications over the socket -> UI updates instantly.
- **Benefits**: Improved UX, reduced API traffic, and truly "instant" notification delivery.

---

## Stage 2: Database Architecture

### Technology Choice
**PostgreSQL** was selected for its ACID compliance, robust indexing capabilities, and ability to handle complex relational queries efficiently.

### Schema Design
#### Students Table
| Column | Type | Constraints |
| :--- | :--- | :--- |
| `id` | `UUID` | Primary Key |
| `name` | `VARCHAR` | Not Null |
| `email` | `VARCHAR` | Unique, Not Null |

#### Notifications Table
| Column | Type | Constraints |
| :--- | :--- | :--- |
| `id` | `UUID` | Primary Key |
| `student_id` | `UUID` | Foreign Key (Students) |
| `notification_type` | `ENUM` | 'Event', 'Result', 'Placement' |
| `message` | `TEXT` | Not Null |
| `is_read` | `BOOLEAN` | Default: False |
| `created_at` | `TIMESTAMP` | Default: NOW() |

---

## Stage 3: Query Analysis & Optimization

### Problem Statement
Queries fetching unread notifications (e.g., `WHERE studentID = ? AND isRead = false`) become slow as the dataset grows into the millions.

### Optimization Strategy
1. **Indexing**: Added a composite index: `CREATE INDEX idx_student_unread ON notifications(student_id, is_read, created_at DESC);`
2. **Selective Fetching**: Avoid `SELECT *`. Retrieve only necessary columns (ID, Type, Message, Date).
3. **Pagination**: Enforce `LIMIT` and `OFFSET` to prevent massive memory consumption on the application server.

### Performance Comparison
- **Before Optimization**: Full table scan (`O(N)`), high latency.
- **After Optimization**: Index seek (`O(log N)`), sub-millisecond responses.

---

## Stage 4: Scalability Solutions

To handle peak loads (e.g., placement season), the following strategies are implemented:

1. **Redis Caching**: Store the latest notifications for active users in memory.
2. **Read Replicas**: Distribute read load across multiple database instances.
3. **Table Partitioning**: Partition the `notifications` table by `created_at` (e.g., monthly) to keep active indices small.
4. **Data Archiving**: Move notifications older than 6 months to a cold storage/archival table.

---

## Stage 5: High-Volume Asynchronous Delivery

### Scenario
HR triggers a "Notify All" for 50,000 students.

### The Problem with Sequential Loops
- **Timeout**: The HTTP request will time out before completion.
- **Fragility**: One failure (e.g., Email API error) can stop the entire process.
- **Latency**: Sequential API calls for 50,000 users would take hours.

### The Solution: Decoupled Architecture
1. **Producer**: The HR request immediately saves the notification metadata to the DB and pushes a "batch job" to a **Message Queue** (e.g., RabbitMQ or Kafka).
2. **Workers**: Multiple background workers consume messages from the queue.
3. **Fault Tolerance**: Workers implement a **Retry Strategy** with exponential backoff and **Dead Letter Queues (DLQ)** for permanently failed deliveries.

---

## Stage 6: Priority Inbox Implementation

### Priority Logic
Notifications are ranked based on a combination of **Weight** and **Recency**.
- **Weights**: Placement (3) > Result (2) > Event (1).
- **Ranking**: A newer notification of the same type ranks higher; however, any Placement notification always ranks higher than a Result notification, regardless of time.

### Technical Implementation
- **Algorithm**: Uses a **Min-Heap** of size `N` (e.g., 10). 
- **Complexity**: `O(N log K)`, where `N` is the number of notifications and `K` is the heap size. This is significantly more efficient than a full `O(N log N)` sort.
- **Deliverable**: `notification_app_be/stage6.js`

---

## Stage 7: Frontend Application

### Implementation Details
Developed using **Next.js** and **Material UI (MUI)**.
- **State Management**: Uses React hooks for filtering and `localStorage` to persist "viewed" states across sessions.
- **UX Design**: Responsive layout that prioritizes clarity and distinguishes "New" vs. "Viewed" notifications using visual cues.
- **Integration**: Communicates with a custom Backend Proxy to securely fetch notifications and log frontend events.

### Running the Project
1. **Frontend**:
   ```bash
   cd notification_app_fe
   npm install
   npm run dev
   ```
2. **Backend Logic (Stage 6)**:
   ```bash
   cd notification_app_be
   node stage6.js
   ```

---
*End of Design Document*
