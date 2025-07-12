#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>
#include <math.h>

#define MAX_STACK_SIZE 100
#define MAX_INPUT_SIZE 1000
#define MAX_TOKEN_SIZE 50

// Stack structure
typedef struct {
    double data[MAX_STACK_SIZE];
    int top;
} Stack;

// Structure to represent a token
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

// ========== STACK ADT IMPLEMENTATION ==========

void initializeStack(Stack* stack) {
    stack->top = -1;
}

int isEmpty(Stack* stack) {
    return stack->top == -1;
}

int isFull(Stack* stack) {
    return stack->top >= MAX_STACK_SIZE - 1;
}

int push(Stack* stack, double value) {
    if (isFull(stack)) {
        printf("Error: Stack overflow\n");
        return 0;
    }
    stack->data[++stack->top] = value;
    return 1;
}

double pop(Stack* stack) {
    if (isEmpty(stack)) {
        printf("Error: Stack underflow\n");
        exit(1);
    }
    return stack->data[stack->top--];
}

double peek(Stack* stack) {
    if (isEmpty(stack)) {
        printf("Error: Empty stack\n");
        exit(1);
    }
    return stack->data[stack->top];
}

void printStack(Stack* stack) {
    printf("Stack: [");
    for (int i = 0; i <= stack->top; i++) {
        printf("%.2f", stack->data[i]);
        if (i < stack->top) printf(", ");
    }
    printf("]\n");
}

// ========== TOKENIZATION FUNCTIONS ==========

int isOperator(char c) {
    return c == '+' || c == '-' || c == '*' || c == '/' || c == '^';
}

Token parseToken(char* tokenStr) {
    Token token;
    
    // Remove whitespace
    while (isspace(*tokenStr)) tokenStr++;
    
    if (strlen(tokenStr) == 0) {
        token.type = TOKEN_INVALID;
        return token;
    }
    
    // Check if it's an operator
    if (strlen(tokenStr) == 1 && isOperator(tokenStr[0])) {
        token.type = TOKEN_OPERATOR;
        token.value.operator = tokenStr[0];
        return token;
    }
    
    // Try to convert to number
    char* endptr;
    double num = strtod(tokenStr, &endptr);
    
    if (*endptr == '\0') {
        token.type = TOKEN_NUMBER;
        token.value.number = num;
    } else {
        token.type = TOKEN_INVALID;
    }
    
    return token;
}

// ========== EVALUATION FUNCTIONS ==========

double applyOperation(double a, double b, char op) {
    switch (op) {
        case '+': return a + b;
        case '-': return a - b;
        case '*': return a * b;
        case '/':
            if (b == 0) {
                printf("Error: Division by zero\n");
                exit(1);
            }
            return a / b;
        case '^': return pow(a, b);
        default:
            printf("Error: Invalid operator '%c'\n", op);
            exit(1);
    }
}

double evaluateRPN(char* expression, int verbose) {
    Stack stack;
    initializeStack(&stack);
    
    char* token = strtok(expression, " \t\n");
    
    if (verbose) {
        printf("\n=== STEP-BY-STEP EVALUATION ===\n");
        printf("Expression: %s\n", expression);
        printf("--------------------------------\n");
    }
    
    while (token != NULL) {
        Token t = parseToken(token);
        
        if (t.type == TOKEN_NUMBER) {
            push(&stack, t.value.number);
            if (verbose) {
                printf("Push %.2f -> ", t.value.number);
                printStack(&stack);
            }
        }
        else if (t.type == TOKEN_OPERATOR) {
            if (stack.top < 1) {
                printf("Error: Insufficient operands for operator '%c'\n", t.value.operator);
                exit(1);
            }
            
            double b = pop(&stack);
            double a = pop(&stack);
            double result = applyOperation(a, b, t.value.operator);
            
            push(&stack, result);
            
            if (verbose) {
                printf("%.2f %c %.2f = %.2f -> ", a, t.value.operator, b, result);
                printStack(&stack);
            }
        }
        else {
            printf("Error: Invalid token '%s'\n", token);
            exit(1);
        }
        
        token = strtok(NULL, " \t\n");
    }
    
    if (stack.top != 0) {
        printf("Error: Malformed expression (remaining elements in stack)\n");
        exit(1);
    }
    
    if (verbose) {
        printf("--------------------------------\n");
    }
    
    return peek(&stack);
}

// ========== INTERFACE FUNCTIONS ==========

void showExamples() {
    printf("\n=== USAGE EXAMPLES ===\n");
    printf("Infix expression: (3 + 4) * 5\n");
    printf("RPN expression:   3 4 + 5 *\n");
    printf("Result:           35\n\n");
    
    printf("Infix expression: 5 + ((1 + 2) * 4) - 3\n");
    printf("RPN expression:   5 1 2 + 4 * + 3 -\n");
    printf("Result:           14\n\n");
    
    printf("Other examples:\n");
    printf("  15 7 1 1 + - / 3 * 2 1 1 + + -  →  5\n");
    printf("  1 2 + 3 4 + *                   →  21\n");
    printf("  4 2 + 3 5 1 - * +               →  18\n");
}

void menu() {
    printf("\n========== RPN CALCULATOR ==========\n");
    printf("1. Calculate RPN expression\n");
    printf("2. Calculate with verbose mode\n");
    printf("3. Usage examples\n");
    printf("4. Exit\n");
    printf("===================================\n");
    printf("Choose an option: ");
}

// ========== MAIN FUNCTION ==========

int main() {
    char expression[MAX_INPUT_SIZE];
    char backup[MAX_INPUT_SIZE];
    int option;
    double result;
    
    printf("=== REVERSE POLISH NOTATION CALCULATOR ===\n");
    printf("Developed for RPN expression evaluation\n");
    
    while (1) {
        menu();
        
        if (scanf("%d", &option) != 1) {
            printf("Error: Invalid input\n");
            while (getchar() != '\n'); // Clear buffer
            continue;
        }
        
        getchar(); // Consume newline
        
        switch (option) {
            case 1:
            case 2:
                printf("\nEnter the RPN expression (numbers and operators separated by space):\n");
                printf("Example: 3 4 + 5 *\n");
                printf("Expression: ");
                
                if (fgets(expression, sizeof(expression), stdin) == NULL) {
                    printf("Error reading expression\n");
                    break;
                }
                
                // Remove newline from end
                expression[strcspn(expression, "\n")] = '\0';
                
                if (strlen(expression) == 0) {
                    printf("Empty expression!\n");
                    break;
                }
                
                // Create backup for verbose mode
                strcpy(backup, expression);
                
                printf("\nCalculating...\n");
                result = evaluateRPN(expression, option == 2);
                
                printf("\n=== RESULT ===\n");
                printf("Expression: %s\n", backup);
                printf("Result: %.6g\n", result);
                break;
                
            case 3:
                showExamples();
                break;
                
            case 4:
                printf("Closing RPN calculator...\n");
                return 0;
                
            default:
                printf("Invalid option! Try again.\n");
        }
        
        printf("\nPress Enter to continue...");
        getchar();
    }
    
    return 0;
}// Nova linha adicionada via API
