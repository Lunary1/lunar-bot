# 🚀 Task Queue System Guide

## 📋 How the Task Queue Works

The new task queue system is built on **BullMQ** (Redis-based) and provides a robust, scalable solution for handling automated purchase tasks. Here's how it all works together:

### 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Next.js API   │    │   Worker        │
│   (Task UI)     │───▶│   Routes        │───▶│   Service       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   Redis Queue   │    │   Playwright    │
                       │   (BullMQ)     │    │   Bots         │
                       └─────────────────┘    └─────────────────┘
```

### 🔄 Task Flow

1. **Task Creation** → User creates task via TaskCreationWizard
2. **Task Queuing** → Task added to Redis queue via API
3. **Task Processing** → Worker picks up task and executes
4. **Bot Execution** → Playwright automation runs
5. **Status Updates** → Real-time updates via Supabase
6. **Completion** → Task marked as completed/failed

## 🛠️ Core Components

### 1. **TaskExecutor** (`src/workers/TaskExecutor.ts`)

- **Purpose**: Core task processing engine
- **Features**:
  - BullMQ queue management
  - Automatic retry logic (3 attempts with exponential backoff)
  - Bot integration (Dreamland, future stores)
  - Error handling and status tracking
  - Purchase history creation

### 2. **Worker Service** (`src/workers/worker-service.ts`)

- **Purpose**: Singleton service to manage workers
- **Features**:
  - Redis connection management
  - Graceful shutdown handling
  - Service status monitoring
  - Production-ready deployment

### 3. **Task API** (`src/app/api/tasks/execute/route.ts`)

- **Purpose**: RESTful endpoints for task management
- **Endpoints**:
  - `POST /api/tasks/execute` - Queue new task
  - `GET /api/tasks/execute?taskId=xxx` - Get task status

### 4. **Task Management UI** (`src/app/tasks/page.tsx`)

- **Purpose**: User interface for task management
- **Features**:
  - Real-time task monitoring
  - Advanced filtering and search
  - Task action controls (start, pause, delete)
  - Visual status indicators

## 🚀 How to Use the System

### Starting the Worker

```bash
# Start the background worker (in separate terminal)
npm run worker

# Start worker in development mode with auto-reload
npm run dev:worker
```

### Creating Tasks

1. **Via UI**: Use the TaskCreationWizard
2. **Via API**: POST to `/api/tasks/execute`

```typescript
// Example API call
const response = await fetch("/api/tasks/execute", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ taskId: "your-task-id" }),
});
```

### Task States

- **`queued`** - Task waiting in queue
- **`running`** - Task currently executing
- **`completed`** - Task finished successfully
- **`failed`** - Task failed with error
- **`cancelled`** - Task manually cancelled

## 🔧 Configuration

### Redis Setup

```bash
# Using Docker
docker run -d -p 6379:6379 redis:alpine

# Or install Redis locally
# macOS: brew install redis
# Ubuntu: sudo apt install redis-server
```

### Environment Variables

```env
REDIS_URL=redis://localhost:6379
```

## 📊 Monitoring & Debugging

### Real-time Updates

- Tasks update in real-time via Supabase subscriptions
- Status changes are immediately reflected in the UI
- Error messages are displayed for failed tasks

### Logging

- Worker logs all task processing steps
- Error details are captured and stored
- Purchase history is automatically created

### Queue Management

- BullMQ provides built-in queue monitoring
- Failed jobs are automatically retried
- Queue statistics are available via BullMQ dashboard

## 🎯 Key Features

### ✅ **Reliability**

- Automatic retry with exponential backoff
- Graceful error handling
- Queue persistence via Redis

### ✅ **Scalability**

- Multiple workers can run concurrently
- Queue can handle thousands of tasks
- Redis clustering support

### ✅ **Real-time**

- Live status updates
- Instant error notifications
- Progress tracking

### ✅ **Flexibility**

- Configurable retry attempts
- Priority-based task execution
- Custom delay settings

## 🚨 Important Notes

1. **Redis Required**: The system requires Redis to be running
2. **Worker Deployment**: Always run the worker service in production
3. **Bot Integration**: Tasks integrate with existing store bots
4. **Error Handling**: Comprehensive error tracking and user feedback
5. **Real-time Updates**: Tasks update via Supabase subscriptions

## 🔄 Next Steps

The task queue system is now ready for:

- **Milestone 4**: Pokémon Product Integration
- **Enhanced Bot Support**: More store integrations
- **Advanced Features**: Scheduled tasks, bulk operations
- **Monitoring**: Queue health and performance metrics

This system provides a solid foundation for automated Pokémon product purchasing with professional-grade reliability and scalability!
