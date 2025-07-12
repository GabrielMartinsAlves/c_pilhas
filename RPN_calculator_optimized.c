#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>
#include <math.h>
#include <time.h>

#define MAX_STACK_SIZE 100
#define MAX_INPUT_SIZE 1000
#define MAX_TOKEN_SIZE 50

// Estrutura da pilha
typedef struct {
    double data[MAX_STACK_SIZE];
    int top;
} Stack;

// Lookup table for operators - OPTIMIZATION 1
static const char operator_lookup[256] = {
    ['+']=1, ['-']=1, ['*']=1, ['/']=1, ['^']=1
};

// ========== IMPLEMENTAÇÃO DO TAD PILHA (unchanged) ==========

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
    printf("Pilha: [");
    for (int i = 0; i <= stack->top; i++) {
        printf("%.2f", stack->data[i]);
        if (i < stack->top) printf(", ");
    }
    printf("]\n");
}

// ========== OPTIMIZED PARSING FUNCTIONS ==========

// OPTIMIZATION 1: Fast operator check using lookup table - O(1)
static inline int isOperator(char c) {
    return operator_lookup[(unsigned char)c];
}

// OPTIMIZATION 2: Single-pass tokenizer that doesn't modify input string
typedef struct {
    const char* start;
    int length;
    int is_number;
    double number_value;
    char operator_value;
} FastToken;

// OPTIMIZATION 3: Parse token directly from position without copying strings
int parseNextToken(const char* expr, int* pos, FastToken* token) {
    // Skip whitespace - OPTIMIZATION: avoid strlen, direct indexing
    while (expr[*pos] && isspace(expr[*pos])) (*pos)++;
    
    if (!expr[*pos]) return 0; // End of expression
    
    token->start = &expr[*pos];
    
    // Check if it's an operator - OPTIMIZATION: single character check
    if (isOperator(expr[*pos]) && (expr[*pos + 1] == '\0' || isspace(expr[*pos + 1]))) {
        token->is_number = 0;
        token->operator_value = expr[*pos];
        token->length = 1;
        (*pos)++;
        return 1;
    }
    
    // Parse number directly - OPTIMIZATION: use strtod with position tracking
    char* endptr;
    token->number_value = strtod(&expr[*pos], &endptr);
    
    if (endptr == &expr[*pos]) {
        // Invalid token
        return -1;
    }
    
    token->is_number = 1;
    token->length = endptr - &expr[*pos];
    *pos = endptr - expr;
    
    return 1;
}

// ========== FUNÇÕES DE AVALIAÇÃO (optimized) ==========

double aplicaOperacao(double a, double b, char op) {
    switch (op) {
        case '+': return a + b;
        case '-': return a - b;
        case '*': return a * b;
        case '/':
            if (b == 0) {
                printf("Erro: Divisão por zero\n");
                exit(1);
            }
            return a / b;
        case '^': return pow(a, b);
        default:
            printf("Erro: Operador inválido '%c'\n", op);
            exit(1);
    }
}

// OPTIMIZATION 4: Single-pass evaluation without string modification
double avaliaRPN_optimized(const char* expressao, int verbose) {
    Stack pilha;
    inicializaPilha(&pilha);
    
    int pos = 0;
    FastToken token;
    
    if (verbose) {
        printf("\n=== AVALIAÇÃO PASSO A PASSO ===\n");
        printf("Expressão: %s\n", expressao);
        printf("--------------------------------\n");
    }
    
    while (1) {
        int result = parseNextToken(expressao, &pos, &token);
        
        if (result == 0) break; // End of expression
        if (result == -1) {
            printf("Erro: Token inválido na posição %d\n", pos);
            exit(1);
        }
        
        if (token.is_number) {
            push(&pilha, token.number_value);
            if (verbose) {
                printf("Push %.2f -> ", token.number_value);
                imprimePilha(&pilha);
            }
        }
        else {
            if (pilha.top < 1) {
                printf("Erro: Operandos insuficientes para operador '%c'\n", token.operator_value);
                exit(1);
            }
            
            double b = pop(&pilha);
            double a = pop(&pilha);
            double resultado = aplicaOperacao(a, b, token.operator_value);
            
            push(&pilha, resultado);
            
            if (verbose) {
                printf("%.2f %c %.2f = %.2f -> ", a, token.operator_value, b, resultado);
                imprimePilha(&pilha);
            }
        }
    }
    
    if (pilha.top != 0) {
        printf("Erro: Expressão mal formada (elementos restantes na pilha)\n");
        exit(1);
    }
    
    if (verbose) {
        printf("--------------------------------\n");
    }
    
    return peek(&pilha);
}

// Keep original function for comparison
double avaliaRPN_original(char* expressao, int verbose) {
    Stack pilha;
    inicializaPilha(&pilha);
    
    char* token = strtok(expressao, " \t\n");
    
    if (verbose) {
        printf("\n=== AVALIAÇÃO PASSO A PASSO ===\n");
        printf("Expressão: %s\n", expressao);
        printf("--------------------------------\n");
    }
    
    while (token != NULL) {
        // Remove espaços em branco
        while (isspace(*token)) token++;
        
        if (strlen(token) == 0) {
            token = strtok(NULL, " \t\n");
            continue;
        }
        
        // Verifica se é um operador
        if (strlen(token) == 1 && isOperator(token[0])) {
            if (pilha.top < 1) {
                printf("Erro: Operandos insuficientes para operador '%c'\n", token[0]);
                exit(1);
            }
            
            double b = pop(&pilha);
            double a = pop(&pilha);
            double resultado = aplicaOperacao(a, b, token[0]);
            
            push(&pilha, resultado);
            
            if (verbose) {
                printf("%.2f %c %.2f = %.2f -> ", a, token[0], b, resultado);
                imprimePilha(&pilha);
            }
        }
        else {
            // Tenta converter para número
            char* endptr;
            double num = strtod(token, &endptr);
            
            if (*endptr == '\0') {
                push(&pilha, num);
                if (verbose) {
                    printf("Push %.2f -> ", num);
                    imprimePilha(&pilha);
                }
            } else {
                printf("Erro: Token inválido '%s'\n", token);
                exit(1);
            }
        }
        
        token = strtok(NULL, " \t\n");
    }
    
    if (pilha.top != 0) {
        printf("Erro: Expressão mal formada (elementos restantes na pilha)\n");
        exit(1);
    }
    
    if (verbose) {
        printf("--------------------------------\n");
    }
    
    return peek(&pilha);
}

// ========== FUNÇÕES DE INTERFACE (unchanged) ==========

void exemploUso() {
    printf("\n=== EXEMPLOS DE USO ===\n");
    printf("Expressão infixa: (3 + 4) * 5\n");
    printf("Expressão RPN:    3 4 + 5 *\n");
    printf("Resultado:        35\n\n");
    
    printf("Expressão infixa: 5 + ((1 + 2) * 4) - 3\n");
    printf("Expressão RPN:    5 1 2 + 4 * + 3 -\n");
    printf("Resultado:        14\n\n");
    
    printf("Outros exemplos:\n");
    printf("  15 7 1 1 + - / 3 * 2 1 1 + + -  →  5\n");
    printf("  1 2 + 3 4 + *                   →  21\n");
    printf("  4 2 + 3 5 1 - * +               →  18\n");
}

void menu() {
    printf("\n========== CALCULADORA RPN OTIMIZADA ==========\n");
    printf("1. Calcular expressão RPN (versão otimizada)\n");
    printf("2. Calcular com modo verbose (versão otimizada)\n");
    printf("3. Exemplos de uso\n");
    printf("4. Teste de performance\n");
    printf("5. Sair\n");
    printf("===============================================\n");
    printf("Escolha uma opção: ");
}

// Performance test function
void test_performance() {
    char* test_expressions[] = {
        "3 4 +",                                    // Simple
        "5 1 2 + 4 * + 3 -",                      // Medium
        "15 7 1 1 + - / 3 * 2 1 1 + + -",        // Complex
        "1 2 + 3 4 + * 5 6 + 7 8 + * +",         // Very complex
        "10 5 + 2 * 3 / 4 + 5 - 6 * 7 / 8 + 9 - 1 +", // Long expression
    };
    
    int num_tests = sizeof(test_expressions) / sizeof(test_expressions[0]);
    int iterations_per_test = 100000;
    
    printf("\n=== TESTE DE PERFORMANCE ===\n");
    printf("Comparando versão original vs otimizada\n");
    printf("Testando %d expressões com %d iterações cada\n\n", num_tests, iterations_per_test);
    
    for (int i = 0; i < num_tests; i++) {
        printf("Expressão %d: %s\n", i+1, test_expressions[i]);
        
        // Test original version
        clock_t start = clock();
        for (int j = 0; j < iterations_per_test; j++) {
            char expr_copy[1000];
            strcpy(expr_copy, test_expressions[i]);
            avaliaRPN_original(expr_copy, 0);
        }
        clock_t end = clock();
        double time_original = ((double)(end - start)) / CLOCKS_PER_SEC;
        
        // Test optimized version
        start = clock();
        for (int j = 0; j < iterations_per_test; j++) {
            avaliaRPN_optimized(test_expressions[i], 0);
        }
        end = clock();
        double time_optimized = ((double)(end - start)) / CLOCKS_PER_SEC;
        
        double speedup = time_original / time_optimized;
        
        printf("Original:   %.6f segundos (%.2f μs por avaliação)\n", 
               time_original, (time_original * 1000000) / iterations_per_test);
        printf("Otimizada:  %.6f segundos (%.2f μs por avaliação)\n", 
               time_optimized, (time_optimized * 1000000) / iterations_per_test);
        printf("Speedup:    %.2fx mais rápida\n\n", speedup);
    }
}

// ========== FUNÇÃO PRINCIPAL ==========

int main() {
    char expressao[MAX_INPUT_SIZE];
    int opcao;
    double resultado;
    
    printf("=== CALCULADORA RPN OTIMIZADA ===\n");
    printf("Versão com algoritmo otimizado para melhor performance\n");
    
    while (1) {
        menu();
        
        if (scanf("%d", &opcao) != 1) {
            printf("Erro: Entrada inválida\n");
            while (getchar() != '\n'); // Limpa buffer
            continue;
        }
        
        getchar(); // Consome newline
        
        switch (opcao) {
            case 1:
            case 2:
                printf("\nDigite a expressão RPN (números e operadores separados por espaço):\n");
                printf("Exemplo: 3 4 + 5 *\n");
                printf("Expressão: ");
                
                if (fgets(expressao, sizeof(expressao), stdin) == NULL) {
                    printf("Erro na leitura da expressão\n");
                    break;
                }
                
                // Remove newline do final
                expressao[strcspn(expressao, "\n")] = '\0';
                
                if (strlen(expressao) == 0) {
                    printf("Expressão vazia!\n");
                    break;
                }
                
                printf("\nCalculando...\n");
                resultado = avaliaRPN_optimized(expressao, opcao == 2);
                
                printf("\n=== RESULTADO ===\n");
                printf("Expressão: %s\n", expressao);
                printf("Resultado: %.6g\n", resultado);
                break;
                
            case 3:
                exemploUso();
                break;
                
            case 4:
                test_performance();
                break;
                
            case 5:
                printf("Encerrando calculadora RPN otimizada...\n");
                return 0;
                
            default:
                printf("Opção inválida! Tente novamente.\n");
        }
        
        printf("\nPressione Enter para continuar...");
        getchar();
    }
    
    return 0;
}