# Typeflow

A visual workflow automation platform built with Next.js. Focus on typescript / node ecosystem 

## Setup

Create a `.env` file in the root directory with the following variables:

```env
DATABASE_URL='postgresql://user:password@host:5432/database?sslmode=require'
ENCRYPTION_KEY='your-32-byte-encryption-key-here-change-this-in-production'

# Worker Queue (optional - enables async workflow execution)
ENABLE_WORKER_QUEUE='true'
REDIS_URL='redis://localhost:6379'
WORKER_CONCURRENCY='5'
```

## Worker System (Optional)

Typeflow supports scalable workflow execution via BullMQ workers and Redis queue.

### Benefits
- **Parallel Execution**: Run multiple workflows simultaneously
- **Retry Logic**: Automatic retry with exponential backoff
- **Scalability**: Run multiple worker instances
- **Job Tracking**: Monitor job status and progress

### Setup

1. **Start Redis**:
   ```bash
   # Using Docker Compose (recommended)
   docker-compose up -d
   
   # Or using Docker directly
   docker run -d -p 6379:6379 redis:alpine
   ```

2. **Enable in `.env`**:
   ```env
   ENABLE_WORKER_QUEUE='true'
   REDIS_URL='redis://localhost:6379'
   ```

3. **Start Worker**:
   ```bash
   npm run worker:dev
   ```

### Job Status API

```bash
GET /api/jobs/{jobId}
```

## Preview

![Type-Safe Development](public/typesafe.png)

![TypeScript Type Definitions](public/types.png)

![NPM Package Management](public/packages.png)

![Workflow Editor Overview](public/overview.png)

![Visual Debugging](public/debugging.png)