#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <sys/time.h>

// Include the original calculator (we'll need to modify it to be testable)
double avaliaRPN_original(char* expressao, int verbose);

// Performance testing utilities
double get_time_diff(struct timeval start, struct timeval end) {
    return (end.tv_sec - start.tv_sec) + (end.tv_usec - start.tv_usec) / 1000000.0;
}

void test_performance() {
    // Test expressions of varying complexity
    char* test_expressions[] = {
        "3 4 +",                                    // Simple
        "5 1 2 + 4 * + 3 -",                      // Medium
        "15 7 1 1 + - / 3 * 2 1 1 + + -",        // Complex
        "1 2 + 3 4 + * 5 6 + 7 8 + * +",         // Very complex
        "10 5 + 2 * 3 / 4 + 5 - 6 * 7 / 8 + 9 - 1 +", // Long expression
    };
    
    int num_tests = sizeof(test_expressions) / sizeof(test_expressions[0]);
    int iterations_per_test = 10000;
    
    printf("=== PERFORMANCE BASELINE TEST ===\n");
    printf("Testing %d expressions with %d iterations each\n\n", num_tests, iterations_per_test);
    
    for (int i = 0; i < num_tests; i++) {
        printf("Expression %d: %s\n", i+1, test_expressions[i]);
        
        struct timeval start, end;
        gettimeofday(&start, NULL);
        
        for (int j = 0; j < iterations_per_test; j++) {
            char expr_copy[1000];
            strcpy(expr_copy, test_expressions[i]);
            avaliaRPN_original(expr_copy, 0);  // Non-verbose mode
        }
        
        gettimeofday(&end, NULL);
        double time_taken = get_time_diff(start, end);
        
        printf("Time: %.6f seconds (%.2f us per evaluation)\n", 
               time_taken, (time_taken * 1000000) / iterations_per_test);
        printf("Throughput: %.0f evaluations/second\n\n", iterations_per_test / time_taken);
    }
}

int main() {
    test_performance();
    return 0;
}