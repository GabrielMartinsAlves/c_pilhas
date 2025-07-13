# Individual Worker Tests and Task Monitoring

## Overview

This document describes the implementation of Individual Worker Testing and Task Monitoring features for the RPN Calculator, addressing the bug report #122 requesting "Teste Worker Individual - Monitoramento de Task".

## Features Implemented

### 1. Individual Worker Testing (`worker_tests.c`)

A comprehensive testing module that validates individual components of the RPN Calculator:

#### Test Categories:
- **Stack Basic Operations**: Tests push, pop, empty/full checks
- **Stack Overflow Protection**: Validates protection against stack overflow
- **Multiple Push/Pop Operations**: Tests LIFO behavior with multiple values

#### Test Results Format:
```
=== INDIVIDUAL WORKER TESTS ===
Testing individual components of the RPN Calculator

=== TEST RESULTS SUMMARY ===
Test: Stack Basic Operations         Status: PASSED (0.00 ms)
Test: Stack Overflow Protection      Status: PASSED (0.00 ms)
Test: Multiple Push/Pop Operations   Status: PASSED (0.00 ms)

Summary: 3/3 tests passed (100.0%)
Total execution time: 0.01 ms
```

#### Usage:
```bash
# Compile and run worker tests
gcc -o worker_tests worker_tests.c -lm
./worker_tests
```

### 2. Task Monitoring System

A real-time monitoring system that tracks calculation operations:

#### Core Components:

**TaskMonitor Class (Node.js)**
- Tracks task lifecycle (running → completed/failed)
- Records execution time and results
- Associates tasks with users
- Provides statistics and history

**Task Properties:**
- `id`: Unique task identifier
- `type`: Task type (RPN_CALCULATION, WORKER_TESTS)
- `userId`: Associated user
- `startTime`: Task start timestamp
- `endTime`: Task completion timestamp
- `status`: running | completed | failed
- `result`: Task output (if successful)
- `error`: Error message (if failed)
- `executionTime`: Duration in milliseconds

#### API Endpoints:

1. **POST /api/calculate** - Enhanced with task monitoring
   - Creates monitored task for each calculation
   - Tracks success/failure with detailed logging
   
2. **GET /api/task/:taskId** - Get specific task details
   - Returns task status and results
   - User access control (users only see their tasks)
   
3. **GET /api/tasks** - Get user's task history
   - Returns all tasks for authenticated user
   - Sorted by creation time (newest first)
   
4. **GET /api/task-stats** - Get system statistics
   - Total, completed, failed, running task counts
   - Average execution time calculation
   
5. **POST /api/run-worker-tests** - Execute worker tests
   - Runs C worker tests as monitored task
   - Returns test results with monitoring data

### 3. Task Monitoring Dashboard

A web-based dashboard accessible at `/monitor` with real-time monitoring:

#### Features:
- **Task Statistics**: Live counts and performance metrics
- **Recent Tasks**: Real-time task history with status indicators
- **Auto-refresh**: Updates every 30 seconds
- **User-specific**: Shows only authenticated user's tasks

#### Dashboard Sections:

**Statistics Panel:**
- Total Tasks
- Completed Tasks  
- Failed Tasks
- Average Execution Time

**Task History Panel:**
- Task ID and type
- Status (COMPLETED/FAILED/RUNNING)
- Start time and duration
- Results or error messages
- Color-coded status indicators

### 4. Web Interface Integration

Enhanced calculator interface with new testing capabilities:

#### New Features:
- **Tests Button**: Runs individual worker tests via web interface
- **Monitor Link**: Quick access to monitoring dashboard
- **Task IDs**: Each calculation returns unique task ID for tracking

#### Button Layout:
```
[Calcular] [Calcular (Verbose)] [🔧 Testes] [Limpar]
```

## Technical Implementation

### C Components

**worker_tests.c Structure:**
```c
// Test result tracking
typedef struct {
    char test_name[100];
    int passed;
    char error_message[200];
    double execution_time_ms;
} TestResult;

// Task monitoring for C operations
typedef struct {
    char task_id[50];
    char task_type[50];
    clock_t start_time;
    clock_t end_time;
    int status;
    char result[100];
    char error_message[200];
} TaskMonitor;
```

**Test Functions:**
- `test_stack_basic_operations()`
- `test_stack_overflow_protection()`
- `test_multiple_push_pop()`
- `run_individual_worker_tests()`
- `demonstrate_task_monitoring()`

### Node.js Components

**TaskMonitor Class Methods:**
```javascript
createTask(taskType, userId)     // Create new monitored task
completeTask(taskId, result)     // Mark task as completed
failTask(taskId, error)          // Mark task as failed
getTask(taskId)                  // Get specific task
getUserTasks(userId)             // Get user's tasks
getAllTasks()                    // Get all tasks
getTaskStats()                   // Get system statistics
```

### Logging and Monitoring

**Console Logging:**
```
[TASK MONITOR] Started task TASK_1_1704952874534 for user user@example.com: 3 4 +
[TASK MONITOR] Completed task TASK_1_1704952874534 successfully
```

**Task Status Tracking:**
- Real-time status updates
- Performance metrics collection
- Error tracking and reporting
- User activity monitoring

## Usage Examples

### Running Individual Tests

```bash
# Direct execution
./worker_tests

# Via web interface
# Click "🔧 Testes" button in calculator
# View results in task monitor dashboard
```

### Monitoring Calculations

```bash
# Start web server
npm start

# Access calculator at http://localhost:3000/calculator
# Perform calculations
# View monitoring at http://localhost:3000/monitor
```

### API Usage

```javascript
// Get task statistics
fetch('/api/task-stats')
  .then(response => response.json())
  .then(data => console.log(data.stats));

// Get user tasks
fetch('/api/tasks')
  .then(response => response.json())
  .then(data => console.log(data.tasks));
```

## Benefits

1. **Quality Assurance**: Individual component testing ensures reliability
2. **Performance Monitoring**: Real-time tracking of operation performance
3. **User Experience**: Transparent progress tracking and error reporting
4. **Debugging**: Detailed logs for troubleshooting issues
5. **Analytics**: Usage patterns and performance metrics
6. **Scalability**: Foundation for advanced monitoring features

## Files Modified/Created

**New Files:**
- `worker_tests.c` - Individual worker testing module
- `run_tests.sh` - Comprehensive test runner script

**Modified Files:**
- `server.js` - Added TaskMonitor class and monitoring endpoints
- Enhanced calculator interface with testing integration
- Added monitoring dashboard route

## Testing

The solution includes comprehensive testing:

1. **Unit Tests**: Individual component validation
2. **Integration Tests**: End-to-end calculation testing  
3. **Performance Tests**: Execution time monitoring
4. **Error Handling Tests**: Failure case validation
5. **Web Interface Tests**: Full-stack functionality validation

## Future Enhancements

Potential improvements for the monitoring system:

1. **Database Persistence**: Store task history permanently
2. **Advanced Analytics**: Trend analysis and reporting
3. **Alerting**: Notification system for failures
4. **Load Testing**: Performance under high load
5. **Export Functionality**: Data export capabilities
6. **Real-time Updates**: WebSocket-based live updates