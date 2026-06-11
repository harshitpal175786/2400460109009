# Campus Notification System

A robust, scalable campus notification platform designed to deliver real-time updates for Placements, Results, and Events. This project was developed as part of a multi-stage technical evaluation, covering system design, backend logic, and responsive frontend development.

## 🚀 Project Overview

The system features:
- **Priority Inbox**: A specialized view ranking notifications by type weight (Placement > Result > Event) and recency.
- **Real-time Simulation**: Interactive frontend with server-side proxying to external notification services.
- **Scalable Architecture**: Design documentation for handling 50,000+ simultaneous notifications using message queues and workers.
- **Observability**: Centralized logging middleware used across both backend and frontend components.

## 📁 Project Structure

```text
.
├── notification_system_design.md  # Comprehensive design documentation (Stages 1-7)
├── logging_middleware/            # Reusable logging utility (Shared)
├── notification_app_be/           # Backend components (Stage 6 Priority Logic)
└── notification_app_fe/           # Next.js Frontend (Stage 7 Implementation)
```

## 🛠️ Setup & Execution

### 1. Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### 2. Logging Middleware (Shared)
The logging middleware is a shared dependency.
```bash
cd logging_middleware
npm install
```

### 3. Backend Priority Logic (Stage 6)
To run the priority inbox algorithm independently:
```bash
cd notification_app_be
# Ensure dependencies are installed in the root or local node_modules
node stage6.js
```

### 4. Frontend Application (Stage 7)
The frontend is a responsive Next.js app running on `http://localhost:3000`.
```bash
cd notification_app_fe
npm install
npm run dev
```

## 📝 Key Features (Frontend)
- **Responsive UI**: Built with Material UI for mobile and desktop views.
- **Local viewed state**: Notifications are marked as "viewed" in the browser's local storage to distinguish between new and seen items.
- **Type Filtering**: Filter notifications by Placement, Result, or Event.
- **Customizable Priority**: View top 10, 15, or 20 most important notifications.

## 📐 System Design Highlights
For detailed architectural decisions, database schemas, and scalability strategies, please refer to [notification_system_design.md](./notification_system_design.md).

- **Database**: PostgreSQL with composite indexing for O(log N) retrieval.
- **Scaling**: Redis caching, Read Replicas, and Table Partitioning.
- **Reliability**: Asynchronous delivery using Message Queues (RabbitMQ/Kafka) with automated retry mechanisms.

---
*Developed for the Campus Hiring Evaluation.*
