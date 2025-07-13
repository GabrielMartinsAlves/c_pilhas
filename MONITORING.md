# Worker Testing and Task Monitoring Documentation

## Overview

This document describes the worker testing and task monitoring features implemented to address Issue #60 - "Individual Worker Test - Task Monitoring".

## Features Implemented

### 1. Worker Process Monitoring

The application now includes comprehensive monitoring of the RPN calculator worker process:

- **Task Execution Tracking**: Monitors total tasks executed, successful tasks, and failed tasks
- **Performance Metrics**: Tracks average execution time and individual execution times
- **Worker Status**: Real-time status monitoring (idle/busy)
- **Task Logging**: Detailed logging of each task with timestamps and execution details

### 2. Individual Worker Testing

A dedicated testing endpoint that validates the worker functionality:

- **Automated Test Suite**: Runs predefined test cases to validate worker functionality
- **Test Coverage**: Tests basic operations, complex expressions, and edge cases
- **Performance Testing**: Measures execution time for each test case
- **Pass/Fail Reporting**: Detailed test results with expected vs actual values

### 3. Health Check System

Comprehensive health monitoring for the application:

- **Worker Executable Validation**: Checks if worker binaries are available
- **System Health Status**: Overall application health assessment
- **Memory Usage Monitoring**: Tracks application memory consumption
- **Uptime Tracking**: Server uptime monitoring

### 4. Monitoring Dashboard

A dedicated web interface for monitoring:

- **Real-time Metrics**: Live updates of task statistics and performance
- **Auto-refresh Capability**: Automatic updates every 5 seconds
- **Visual Status Indicators**: Color-coded status indicators for quick assessment
- **Historical Data**: Maintains execution time history for trend analysis

## API Endpoints

### Task Monitoring

- **GET `/api/monitoring`**: Returns comprehensive monitoring data
- **GET `/api/health`**: Health check endpoint with system status
- **POST `/api/test-worker`**: Runs individual worker tests

### Monitoring Dashboard

- **GET `/monitoring`**: Web-based monitoring dashboard

## Implementation Details

### Worker Process Architecture

The application now uses two versions of the RPN calculator:

1. **Interactive Version (`rpn_calculator`)**: Original menu-driven interface
2. **CLI Version (`rpn_calculator_cli`)**: Command-line interface for API integration

### Task Logging

Each calculation is logged with:
```json
{
  "timestamp": "2025-07-13T10:02:01.312Z",
  "expression": "3 4 +",
  "success": true,
  "executionTime": 15,
  "error": null
}
```

### Monitoring State

The application maintains real-time monitoring state:
```json
{
  "tasksExecuted": 25,
  "tasksSuccessful": 24,
  "tasksFailed": 1,
  "averageExecutionTime": 12.5,
  "lastTaskTime": "2025-07-13T10:02:01.312Z",
  "workerStatus": "idle",
  "executionTimes": [10, 15, 8, 12, 18]
}
```

### Test Cases

The worker testing includes the following test cases:

1. **Simple Addition**: `3 4 +` → Expected: 7
2. **Complex Expression**: `5 1 2 + 4 * + 3 -` → Expected: 14
3. **Exponentiation**: `2 3 ^` → Expected: 8
4. **Division**: `10 2 /` → Expected: 5
5. **Advanced Expression**: `15 7 1 1 + - / 3 * 2 1 1 + + -` → Expected: 5

## Usage

### Running Tests

1. Access the calculator interface at `/calculator`
2. Click the "🧪 Testar Worker" button
3. View detailed test results including pass/fail status and execution times

### Monitoring

1. Navigate to `/monitoring` for the dashboard
2. Enable auto-refresh for real-time updates
3. Monitor task statistics, performance metrics, and system health

### Health Checks

The health endpoint can be used for:
- Application monitoring
- Load balancer health checks
- DevOps monitoring integration

## Error Handling

The system includes robust error handling:

- **Worker Process Failures**: Graceful handling of worker crashes
- **Timeout Management**: 10-second timeout for calculations
- **Resource Monitoring**: Memory usage tracking
- **Detailed Error Reporting**: Comprehensive error messages and logging

## Security

All monitoring and testing endpoints require authentication:
- Auth0 integration for secure access
- Protected routes using `requiresAuth()` middleware
- Safe execution of worker processes with timeout limits

## Performance Optimizations

- **Execution Time Tracking**: Maintains rolling average of last 50 executions
- **Non-blocking Operations**: Asynchronous worker process execution
- **Resource Management**: Automatic cleanup of completed processes
- **Efficient Monitoring**: Minimal overhead monitoring implementation