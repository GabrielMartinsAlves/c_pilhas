#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <assert.h>
#include <time.h>
#include <math.h>

// Include the main calculator definitions
#define MAX_STACK_SIZE 100
#define MAX_INPUT_SIZE 1000
#define MAX_TOKEN_SIZE 50

// Stack structure and operations (copied from main file for testing)
typedef struct {
    double data[MAX_STACK_SIZE];
    int top;
} Stack;

typedef enum {
    TOKEN_NUMBER,
    TOKEN_OPERATOR,
    TOKEN_INVALID
} TokenType;

typedef struct {
    TokenType type;
    union {
        double number;
        char operator;
    } value;
} Token;

// Test result structure
typedef struct {
    char test_name[100];
    int passed;
    char error_message[200];
    double execution_time_ms;
} TestResult;

// Task monitoring structure
typedef struct {
    char task_id[50];
    char task_type[50];
    clock_t start_time;
    clock_t end_time;
    int status; // 0 = running, 1 = completed, -1 = failed
    char result[100];
    char error_message[200];
} TaskMonitor;

// Global test counters
static int total_tests = 0;
static int passed_tests = 0;
static int failed_tests = 0;

// Stack operations (simplified versions for testing)
void inicializaPilha(Stack* stack) {
    stack->top = -1;
}

int estaVazia(Stack* stack) {
    return stack->top == -1;
}

int estaCheia(Stack* stack) {
    return stack->top >= MAX_STACK_SIZE - 1;
}

int push(Stack* stack, double valor) {
    if (estaCheia(stack)) {
        return 0;
    }
    stack->data[++stack->top] = valor;
    return 1;
}

double pop(Stack* stack) {
    if (estaVazia(stack)) {
        printf("Erro: Stack underflow\n");
        exit(1);
    }
    return stack->data[stack->top--];
}

// Test utility functions
void start_test(const char* test_name) {
    printf("Running test: %s... ", test_name);
    fflush(stdout);
}

void end_test(int passed, const char* error_msg) {
    total_tests++;
    if (passed) {
        passed_tests++;
        printf("PASSED\n");
    } else {
        failed_tests++;
        printf("FAILED: %s\n", error_msg ? error_msg : "Unknown error");
    }
}

// Individual worker tests

// Test 1: Stack basic operations
TestResult test_stack_basic_operations() {
    TestResult result;
    strcpy(result.test_name, "Stack Basic Operations");
    clock_t start = clock();
    
    Stack stack;
    inicializaPilha(&stack);
    
    // Test empty stack
    if (!estaVazia(&stack)) {
        result.passed = 0;
        strcpy(result.error_message, "Empty stack check failed");
        result.execution_time_ms = ((double)(clock() - start)) / CLOCKS_PER_SEC * 1000;
        return result;
    }
    
    // Test push operation
    if (!push(&stack, 5.0)) {
        result.passed = 0;
        strcpy(result.error_message, "Push operation failed");
        result.execution_time_ms = ((double)(clock() - start)) / CLOCKS_PER_SEC * 1000;
        return result;
    }
    
    // Test non-empty stack
    if (estaVazia(&stack)) {
        result.passed = 0;
        strcpy(result.error_message, "Non-empty stack check failed");
        result.execution_time_ms = ((double)(clock() - start)) / CLOCKS_PER_SEC * 1000;
        return result;
    }
    
    // Test pop operation
    double value = pop(&stack);
    if (value != 5.0) {
        result.passed = 0;
        strcpy(result.error_message, "Pop operation returned wrong value");
        result.execution_time_ms = ((double)(clock() - start)) / CLOCKS_PER_SEC * 1000;
        return result;
    }
    
    result.passed = 1;
    strcpy(result.error_message, "");
    result.execution_time_ms = ((double)(clock() - start)) / CLOCKS_PER_SEC * 1000;
    return result;
}

// Test 2: Stack overflow protection
TestResult test_stack_overflow_protection() {
    TestResult result;
    strcpy(result.test_name, "Stack Overflow Protection");
    clock_t start = clock();
    
    Stack stack;
    inicializaPilha(&stack);
    
    // Fill stack to capacity
    for (int i = 0; i < MAX_STACK_SIZE; i++) {
        if (!push(&stack, (double)i)) {
            result.passed = 0;
            sprintf(result.error_message, "Push failed prematurely at element %d", i);
            result.execution_time_ms = ((double)(clock() - start)) / CLOCKS_PER_SEC * 1000;
            return result;
        }
    }
    
    // Try to push one more (should fail)
    if (push(&stack, 999.0)) {
        result.passed = 0;
        strcpy(result.error_message, "Stack overflow protection failed");
        result.execution_time_ms = ((double)(clock() - start)) / CLOCKS_PER_SEC * 1000;
        return result;
    }
    
    result.passed = 1;
    strcpy(result.error_message, "");
    result.execution_time_ms = ((double)(clock() - start)) / CLOCKS_PER_SEC * 1000;
    return result;
}

// Test 3: Multiple push/pop operations
TestResult test_multiple_push_pop() {
    TestResult result;
    strcpy(result.test_name, "Multiple Push/Pop Operations");
    clock_t start = clock();
    
    Stack stack;
    inicializaPilha(&stack);
    
    double test_values[] = {1.5, 2.7, 3.14159, -5.2, 0.0};
    int num_values = sizeof(test_values) / sizeof(test_values[0]);
    
    // Push all values
    for (int i = 0; i < num_values; i++) {
        if (!push(&stack, test_values[i])) {
            result.passed = 0;
            sprintf(result.error_message, "Push failed for value %f", test_values[i]);
            result.execution_time_ms = ((double)(clock() - start)) / CLOCKS_PER_SEC * 1000;
            return result;
        }
    }
    
    // Pop all values and verify (LIFO order)
    for (int i = num_values - 1; i >= 0; i--) {
        double popped = pop(&stack);
        if (fabs(popped - test_values[i]) > 1e-10) {
            result.passed = 0;
            sprintf(result.error_message, "Pop returned wrong value: expected %f, got %f", test_values[i], popped);
            result.execution_time_ms = ((double)(clock() - start)) / CLOCKS_PER_SEC * 1000;
            return result;
        }
    }
    
    // Stack should be empty now
    if (!estaVazia(&stack)) {
        result.passed = 0;
        strcpy(result.error_message, "Stack not empty after popping all elements");
        result.execution_time_ms = ((double)(clock() - start)) / CLOCKS_PER_SEC * 1000;
        return result;
    }
    
    result.passed = 1;
    strcpy(result.error_message, "");
    result.execution_time_ms = ((double)(clock() - start)) / CLOCKS_PER_SEC * 1000;
    return result;
}

// Task monitoring functions

TaskMonitor* create_task_monitor(const char* task_id, const char* task_type) {
    TaskMonitor* monitor = malloc(sizeof(TaskMonitor));
    if (!monitor) return NULL;
    
    strcpy(monitor->task_id, task_id);
    strcpy(monitor->task_type, task_type);
    monitor->start_time = clock();
    monitor->end_time = 0;
    monitor->status = 0; // running
    strcpy(monitor->result, "");
    strcpy(monitor->error_message, "");
    
    return monitor;
}

void complete_task_monitor(TaskMonitor* monitor, const char* result) {
    if (!monitor) return;
    
    monitor->end_time = clock();
    monitor->status = 1; // completed
    strcpy(monitor->result, result);
}

void fail_task_monitor(TaskMonitor* monitor, const char* error_message) {
    if (!monitor) return;
    
    monitor->end_time = clock();
    monitor->status = -1; // failed
    strcpy(monitor->error_message, error_message);
}

void print_task_monitor(TaskMonitor* monitor) {
    if (!monitor) return;
    
    double execution_time = ((double)(monitor->end_time - monitor->start_time)) / CLOCKS_PER_SEC * 1000;
    
    printf("=== TASK MONITOR ===\n");
    printf("Task ID: %s\n", monitor->task_id);
    printf("Task Type: %s\n", monitor->task_type);
    printf("Status: %s\n", 
           monitor->status == 0 ? "RUNNING" : 
           monitor->status == 1 ? "COMPLETED" : "FAILED");
    printf("Execution Time: %.2f ms\n", execution_time);
    
    if (monitor->status == 1) {
        printf("Result: %s\n", monitor->result);
    } else if (monitor->status == -1) {
        printf("Error: %s\n", monitor->error_message);
    }
    printf("==================\n");
}

void free_task_monitor(TaskMonitor* monitor) {
    if (monitor) {
        free(monitor);
    }
}

// Main test runner
void run_individual_worker_tests() {
    printf("\n=== INDIVIDUAL WORKER TESTS ===\n");
    printf("Testing individual components of the RPN Calculator\n\n");
    
    TestResult results[10];
    int test_count = 0;
    
    // Run stack tests
    results[test_count++] = test_stack_basic_operations();
    results[test_count++] = test_stack_overflow_protection();
    results[test_count++] = test_multiple_push_pop();
    
    // Print results summary
    printf("\n=== TEST RESULTS SUMMARY ===\n");
    int total_passed = 0;
    double total_time = 0;
    
    for (int i = 0; i < test_count; i++) {
        printf("Test: %-30s Status: %s", 
               results[i].test_name,
               results[i].passed ? "PASSED" : "FAILED");
        printf(" (%.2f ms)\n", results[i].execution_time_ms);
        
        if (!results[i].passed) {
            printf("    Error: %s\n", results[i].error_message);
        }
        
        total_passed += results[i].passed;
        total_time += results[i].execution_time_ms;
    }
    
    printf("\nSummary: %d/%d tests passed (%.1f%%)\n", 
           total_passed, test_count, 
           (double)total_passed / test_count * 100);
    printf("Total execution time: %.2f ms\n", total_time);
    printf("============================\n\n");
}

// Example task monitoring usage
void demonstrate_task_monitoring() {
    printf("=== TASK MONITORING DEMONSTRATION ===\n");
    
    // Create a task monitor for a calculation
    TaskMonitor* calc_monitor = create_task_monitor("CALC_001", "RPN_CALCULATION");
    
    printf("Starting monitored calculation task...\n");
    
    // Simulate a calculation task
    Stack stack;
    inicializaPilha(&stack);
    
    // Simulate calculation: 3 4 +
    push(&stack, 3.0);
    push(&stack, 4.0);
    double b = pop(&stack);
    double a = pop(&stack);
    double result = a + b;
    push(&stack, result);
    
    // Complete the task
    char result_str[50];
    sprintf(result_str, "%.6g", result);
    complete_task_monitor(calc_monitor, result_str);
    
    print_task_monitor(calc_monitor);
    
    // Create a task that fails
    TaskMonitor* fail_monitor = create_task_monitor("CALC_002", "RPN_CALCULATION");
    fail_task_monitor(fail_monitor, "Division by zero");
    print_task_monitor(fail_monitor);
    
    // Cleanup
    free_task_monitor(calc_monitor);
    free_task_monitor(fail_monitor);
    
    printf("=====================================\n\n");
}

int main() {
    printf("RPN Calculator - Individual Worker Testing and Task Monitoring\n");
    printf("============================================================\n");
    
    // Run individual worker tests
    run_individual_worker_tests();
    
    // Demonstrate task monitoring
    demonstrate_task_monitoring();
    
    return 0;
}