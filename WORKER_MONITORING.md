# Worker Monitoring System

## Overview

This document describes the worker monitoring system implemented to address the "Teste Worker Individual - Monitoramento de Task" issue.

## Features Implemented

### 1. Task Monitoring System
- **TaskMonitor Class**: Tracks all calculation tasks with unique IDs
- **Metrics Collection**: Records execution time, success/failure rates, and worker health
- **Task History**: Maintains history of recent tasks for analysis

### 2. Individual Worker Testing
- **Automated Test Suite**: 5 comprehensive tests covering different RPN operations
- **Validation**: Compares actual results with expected values
- **Performance Monitoring**: Tracks test execution times

### 3. Health Monitoring
- **Worker Health Status**: Tracks overall system health (healthy/degraded/unhealthy)
- **System Metrics**: Memory usage, uptime, executable status
- **Real-time Monitoring**: Live status updates and metrics

### 4. API Endpoints

#### `/api/health` (GET - Public)
Returns system health information:
```json
{
  "status": "healthy",
  "timestamp": "2025-07-13T10:09:45.000Z",
  "metrics": {
    "totalTasks": 19,
    "successfulTasks": 19,
    "failedTasks": 0,
    "averageExecutionTime": 7.32,
    "workerHealth": "healthy"
  },
  "system": {
    "calculatorExecutableExists": true,
    "uptime": 0.02,
    "memoryUsage": {...},
    "nodeVersion": "v20.19.3"
  }
}
```

#### `/api/worker-test` (POST - Auth Required)
Runs individual worker tests:
```json
{
  "success": true,
  "summary": {
    "total": 5,
    "passed": 5,
    "failed": 0,
    "successRate": 1.0
  },
  "testResults": [...]
}
```

#### `/api/tasks` (GET - Auth Required)
Returns recent task history:
```json
{
  "success": true,
  "tasks": [...],
  "metrics": {...}
}
```

#### `/api/tasks/:taskId` (GET - Auth Required)
Returns specific task details.

### 5. Web Interface Features

#### New Buttons:
- **"Testar Worker"**: Runs comprehensive worker tests
- **"Monitoramento"**: Displays real-time system monitoring

#### Enhanced Display:
- Task IDs for tracking calculations
- Detailed test results with pass/fail status
- System metrics and health status
- Recent task history with execution times

## Testing

### Automated Testing
Run the worker monitoring tests:
```bash
npm test
# or
npm run test:worker
```

### Manual Testing
1. Start the server: `npm start`
2. Open browser: `http://localhost:3000`
3. Click "Testar Worker" to run individual tests
4. Click "Monitoramento" to view system status

## Technical Implementation

### Task Lifecycle
1. Task creation with unique ID
2. Process monitoring with PID tracking
3. Execution time measurement
4. Success/failure tracking
5. Metrics update and health assessment

### Health Assessment Logic
- **Healthy**: Success rate ≥ 80%
- **Degraded**: Success rate 50-80%
- **Unhealthy**: Success rate < 50%

### Performance Monitoring
- Average execution time calculation
- Memory usage tracking
- System uptime monitoring
- Executable availability checking

## Development Mode

When Auth0 is not configured, the system runs in development mode with mock authentication, allowing full testing of worker monitoring features without external dependencies.

## Error Handling

- Comprehensive error tracking for worker processes
- Timeout handling for long-running tasks
- Graceful degradation when workers fail
- Detailed error reporting in monitoring interface