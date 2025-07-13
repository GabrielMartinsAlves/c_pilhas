#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>
#include <math.h>

#define MAX_STACK_SIZE 100
#define MAX_INPUT_SIZE 1000
#define MAX_TOKEN_SIZE 50

// Estrutura da pilha
typedef struct {
    double data[MAX_STACK_SIZE];
    int top;
} Stack;

// Estrutura para representar um token
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

// ========== IMPLEMENTAÇÃO DO TAD PILHA ==========

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
        printf("Erro: Stack overflow\n");
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

double peek(Stack* stack) {
    if (estaVazia(stack)) {
        printf("Erro: Pilha vazia\n");
        exit(1);
    }
    return stack->data[stack->top];
}

void imprimePilha(Stack* stack) {
    if (estaVazia(stack)) {
        printf("[]");
        return;
    }
    
    printf("[");
    for (int i = 0; i <= stack->top; i++) {
        printf("%.2f", stack->data[i]);
        if (i < stack->top) printf(", ");
    }
    printf("]");
}

// ========== FUNÇÕES DE PARSING ==========

int isOperator(char c) {
    return c == '+' || c == '-' || c == '*' || c == '/' || c == '^';
}

Token parseToken(char* tokenStr) {
    Token token;
    char* endPtr;
    
    // Remove espaços no início
    while (isspace(*tokenStr)) tokenStr++;
    
    if (strlen(tokenStr) == 0) {
        token.type = TOKEN_INVALID;
        return token;
    }
    
    // Verifica se é operador
    if (strlen(tokenStr) == 1 && isOperator(tokenStr[0])) {
        token.type = TOKEN_OPERATOR;
        token.value.operator = tokenStr[0];
        return token;
    }
    
    // Tenta converter para número
    double num = strtod(tokenStr, &endPtr);
    if (*endPtr == '\0') {
        token.type = TOKEN_NUMBER;
        token.value.number = num;
        return token;
    }
    
    // Token inválido
    token.type = TOKEN_INVALID;
    return token;
}

// ========== FUNÇÃO DE APLICAÇÃO DE OPERAÇÃO ==========

double aplicaOperacao(double a, char operador, double b) {
    switch (operador) {
        case '+': return a + b;
        case '-': return a - b;
        case '*': return a * b;
        case '/': 
            if (b == 0) {
                printf("Erro: Divisão por zero\n");
                exit(1);
            }
            return a / b;
        case '^': 
            return pow(a, b);
        default:
            printf("Erro: Operador inválido '%c'\n", operador);
            exit(1);
    }
}

// ========== AVALIAÇÃO DE EXPRESSÃO RPN ==========

double avaliaRPN(char* expressao, int verbose) {
    Stack stack;
    inicializaPilha(&stack);
    
    char* token = strtok(expressao, " \t\n");
    
    if (verbose) {
        printf("\n=== MODO VERBOSE ===\n");
        printf("Avaliando expressão passo a passo:\n\n");
    }
    
    while (token != NULL) {
        Token t = parseToken(token);
        
        switch (t.type) {
            case TOKEN_NUMBER:
                push(&stack, t.value.number);
                if (verbose) {
                    printf("Push %.2f -> ", t.value.number);
                    imprimePilha(&stack);
                    printf("\n");
                }
                break;
                
            case TOKEN_OPERATOR:
                if (stack.top < 1) {
                    printf("Erro: Operandos insuficientes para operador '%c'\n", t.value.operator);
                    exit(1);
                }
                
                double b = pop(&stack);
                double a = pop(&stack);
                double resultado = aplicaOperacao(a, t.value.operator, b);
                push(&stack, resultado);
                
                if (verbose) {
                    printf("%.2f %c %.2f = %.2f -> ", a, t.value.operator, b, resultado);
                    imprimePilha(&stack);
                    printf("\n");
                }
                break;
                
            case TOKEN_INVALID:
                printf("Erro: Token inválido '%s'\n", token);
                exit(1);
        }
        
        token = strtok(NULL, " \t\n");
    }
    
    if (stack.top != 0) {
        printf("Erro: Expressão mal formada (elementos restantes na pilha)\n");
        exit(1);
    }
    
    return peek(&stack);
}

// ========== FUNÇÃO PRINCIPAL ==========

int main(int argc, char* argv[]) {
    if (argc < 2) {
        printf("Uso: %s \"<expressao_rpn>\" [verbose]\n", argv[0]);
        printf("Exemplo: %s \"3 4 +\"\n", argv[0]);
        printf("Exemplo verbose: %s \"3 4 +\" verbose\n", argv[0]);
        return 1;
    }
    
    int verbose = (argc > 2 && strcmp(argv[2], "verbose") == 0);
    
    // Cria uma cópia da expressão para não modificar o original
    char expressao[MAX_INPUT_SIZE];
    strncpy(expressao, argv[1], MAX_INPUT_SIZE - 1);
    expressao[MAX_INPUT_SIZE - 1] = '\0';
    
    double resultado = avaliaRPN(expressao, verbose);
    
    if (verbose) {
        printf("\n=== RESULTADO FINAL ===\n");
    }
    printf("Resultado: %.6g\n", resultado);
    
    return 0;
}