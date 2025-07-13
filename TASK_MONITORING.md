# Task Monitoring System Documentation

## Overview

This document describes the task monitoring system implemented to address issue #58 - "Teste Worker Individual - Monitoramento de Task" (Individual Worker Testing - Task Monitoring).

## Problem Statement

The original system lacked proper monitoring and tracking of individual worker processes when executing RPN calculations. Each calculation request would spawn a C program process, but there was no way to:

- Track individual tasks with unique identifiers
- Monitor the status and lifecycle of worker processes
- Measure performance metrics
- Debug individual calculation failures
- View task history and statistics

## Solution Implemented

### 1. Unique Task Identification

Each calculation request now receives a unique task ID generated using crypto-random bytes:

```javascript
function generateTaskId() {
  return crypto.randomBytes(8).toString('hex');
}
```

**Example Task ID**: `b7b787e243036e71`

### 2. Task Status Tracking

Tasks progress through well-defined states:

- `CREATED`: Task has been initialized
- `RUNNING`: Worker process is executing
- `COMPLETED`: Task finished successfully  
- `FAILED`: Task encountered an error
- `TIMEOUT`: Task exceeded time limit

### 3. Process Monitoring

For each worker process, the system tracks:

- **Process ID (PID)**: For system-level monitoring
- **Start Time**: When the task began
- **Duration**: Total execution time in milliseconds
- **User**: Who initiated the task
- **Expression**: The RPN expression being calculated

### 4. Performance Metrics

The system calculates and displays:

- **Active Tasks**: Currently running calculations
- **Task History**: Recently completed tasks (last 100)
- **Average Duration**: Mean execution time across all tasks
- **Success/Failure Rates**: Visual indicators in the interface

### 5. Real-time Monitoring Interface

A new monitoring section in the web interface provides:

#### Statistics Display
```
📊 Tasks Ativas: 0 | 📈 Histórico: 5 | ⏱️ Tempo Médio: 5ms
```

#### Detailed Task History
```
🔄 TASKS ATIVAS:
Nenhuma task ativa

📋 HISTÓRICO RECENTE:
✅ [b7b787e243036e71] 3 4 + - 5ms
❌ [d1f42d91104f1812] 5 0 / - 3ms  
✅ [05f479b5d1bfa09e] 4 2 / - 4ms
✅ [babcea189c629656] 2 3 + - 4ms
✅ [eef7edd76de2fd44] 3 4 + - 7ms
```

### 6. Enhanced Error Handling

The system now distinguishes between different types of failures:

- **Timeout Errors**: Process exceeded 10-second limit
- **Execution Errors**: Failed to start or system errors
- **Calculation Errors**: Mathematical errors (division by zero, etc.)

Each error type receives appropriate logging and user feedback.

## Technical Implementation

### Server-Side Components

#### Task Storage
```javascript
const activeTasks = new Map();        // Currently running tasks
const taskHistory = [];               // Completed task history (max 100)
```

#### Monitoring API Endpoints

**GET /api/tasks**: Returns current monitoring data
```json
{
  "active": [],
  "history": [
    {
      "id": "b7b787e243036e71",
      "expression": "3 4 +",
      "status": "completed",
      "duration": 5,
      "user": "test-user"
    }
  ],
  "stats": {
    "totalActive": 0,
    "totalHistory": 5,
    "avgDuration": 5.2
  }
}
```

**POST /api/calculate**: Enhanced to return task IDs
```json
{
  "success": true,
  "output": "...",
  "taskId": "b7b787e243036e71"
}
```

### Client-Side Features

#### Auto-refresh Monitoring
- Automatic updates every 2 seconds when details view is active
- Manual refresh button for on-demand updates

#### Interactive Interface
- Toggle between summary and detailed views
- Real-time statistics updates
- Visual status indicators (✅ for success, ❌ for failure)

## Testing Results

The implementation has been thoroughly tested with a comprehensive test suite:

```
🔍 TASK MONITORING SYSTEM TEST SUITE
==================================================
🧪 API endpoints availability...           ✅ PASSED
🧪 Task creation and unique ID generation... ✅ PASSED  
🧪 Task status transitions and history...   ✅ PASSED
🧪 Verbose calculation mode...              ✅ PASSED
🧪 Error handling and task failure tracking... ✅ PASSED
🧪 Task statistics and performance metrics... ✅ PASSED
🧪 Invalid input validation...              ✅ PASSED

📊 TEST SUMMARY
✅ Passed: 7 | ❌ Failed: 0 | 📈 Success Rate: 100%
```

## Performance Impact

The monitoring system has minimal performance overhead:

- **Memory Usage**: ~1KB per task in history (max 100 tasks = 100KB)
- **CPU Overhead**: Negligible - only logging and Map operations
- **Network Impact**: Monitoring data fetched only on demand
- **Calculation Performance**: No impact on core RPN calculation speed

## Usage Examples

### Basic Monitoring
1. Navigate to the calculator interface
2. Perform any calculation
3. Observe the task statistics update automatically
4. Note the task ID displayed with results

### Detailed Monitoring  
1. Click "Mostrar Detalhes" in the monitoring section
2. View real-time active tasks and history
3. Observe automatic refresh every 2 seconds
4. Click "Ocultar Detalhes" to hide detailed view

### Error Tracking
1. Submit an invalid expression (e.g., "5 0 /")
2. Observe the error tracking in task history
3. Note the ❌ indicator and error classification

## Benefits Achieved

✅ **Individual Worker Testing**: Each calculation can be traced by unique ID
✅ **Task Monitoring**: Complete lifecycle tracking from creation to completion  
✅ **Performance Metrics**: Detailed timing and statistics
✅ **Error Diagnosis**: Enhanced error reporting with task context
✅ **System Visibility**: Real-time view of system activity
✅ **User Experience**: Task IDs help users track their requests
✅ **Debugging Support**: Comprehensive logging for troubleshooting

## Screenshot

![Task Monitoring Interface](https://github.com/user-attachments/assets/e373e4d7-6b7a-4be5-abbd-b0c84847bb7e)

The screenshot shows the monitoring interface in action, displaying:
- Task statistics (0 active, 5 in history, 5ms average)
- Recent task history with status indicators
- Task IDs and execution times
- Interactive monitoring controls

## Future Enhancements

Potential improvements for future versions:

1. **Task Filtering**: Filter history by status, user, or time range
2. **Metrics Export**: Export monitoring data to CSV/JSON
3. **Alert System**: Notifications for failed tasks or performance issues
4. **Resource Monitoring**: CPU and memory usage per task
5. **Task Queuing**: Queue management for high-load scenarios

## Conclusion

The task monitoring system successfully addresses the original issue by providing comprehensive individual worker testing and task monitoring capabilities. The implementation is lightweight, user-friendly, and provides valuable insights into system performance and reliability.