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
    printf("Pilha: [");
    for (int i = 0; i <= stack->top; i++) {
        printf("%.2f", stack->data[i]);
        if (i < stack->top) printf(", ");
    }
    printf("]\n");
}

// ========== FUNÇÕES DE TOKENIZAÇÃO ==========

int isOperator(char c) {
    return c == '+' || c == '-' || c == '*' || c == '/' || c == '^';
}

Token parseToken(char* tokenStr) {
    Token token;
    
    // Remove espaços em branco
    while (isspace(*tokenStr)) tokenStr++;
    
    if (strlen(tokenStr) == 0) {
        token.type = TOKEN_INVALID;
        return token;
    }
    
    // Verifica se é um operador
    if (strlen(tokenStr) == 1 && isOperator(tokenStr[0])) {
        token.type = TOKEN_OPERATOR;
        token.value.operator = tokenStr[0];
        return token;
    }
    
    // Tenta converter para número
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

// ========== FUNÇÕES DE AVALIAÇÃO ==========

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

double avaliaRPN(char* expressao, int verbose) {
    Stack pilha;
    inicializaPilha(&pilha);
    
    char* token = strtok(expressao, " \t\n");
    
    if (verbose) {
        printf("\n=== AVALIAÇÃO PASSO A PASSO ===\n");
        printf("Expressão: %s\n", expressao);
        printf("--------------------------------\n");
    }
    
    while (token != NULL) {
        Token t = parseToken(token);
        
        if (t.type == TOKEN_NUMBER) {
            push(&pilha, t.value.number);
            if (verbose) {
                printf("Push %.2f -> ", t.value.number);
                imprimePilha(&pilha);
            }
        }
        else if (t.type == TOKEN_OPERATOR) {
            if (pilha.top < 1) {
                printf("Erro: Operandos insuficientes para operador '%c'\n", t.value.operator);
                exit(1);
            }
            
            double b = pop(&pilha);
            double a = pop(&pilha);
            double resultado = aplicaOperacao(a, b, t.value.operator);
            
            push(&pilha, resultado);
            
            if (verbose) {
                printf("%.2f %c %.2f = %.2f -> ", a, t.value.operator, b, resultado);
                imprimePilha(&pilha);
            }
        }
        else {
            printf("Erro: Token inválido '%s'\n", token);
            exit(1);
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

// ========== FUNÇÕES DE INTERFACE ==========

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
    printf("\n========== CALCULADORA RPN ==========\n");
    printf("1. Calcular expressão RPN\n");
    printf("2. Calcular com modo verbose\n");
    printf("3. Exemplos de uso\n");
    printf("4. Sair\n");
    printf("====================================\n");
    printf("Escolha uma opção: ");
}

// ========== FUNÇÃO PRINCIPAL ==========

int main(int argc, char *argv[]) {
    char expressao[MAX_INPUT_SIZE];
    char backup[MAX_INPUT_SIZE];
    int opcao;
    double resultado;
    
    // Command-line mode for web interface integration
    if (argc >= 2) {
        // Construct expression from command line arguments
        strcpy(expressao, argv[1]);
        for (int i = 2; i < argc; i++) {
            strcat(expressao, " ");
            strcat(expressao, argv[i]);
        }
        
        // Check for verbose flag
        int verbose = 0;
        if (argc > 1 && strcmp(argv[argc-1], "--verbose") == 0) {
            verbose = 1;
            // Remove --verbose from expression
            char* lastSpace = strrchr(expressao, ' ');
            if (lastSpace && strcmp(lastSpace + 1, "--verbose") == 0) {
                *lastSpace = '\0';
            }
        }
        
        strcpy(backup, expressao);
        resultado = avaliaRPN(expressao, verbose);
        printf("%.6g\n", resultado);
        return 0;
    }
    
    printf("=== CALCULADORA DE NOTAÇÃO POLONESA REVERSA ===\n");
    printf("Desenvolvida para avaliação de expressões RPN\n");
    
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
                
                // Cria backup para modo verbose
                strcpy(backup, expressao);
                
                printf("\nCalculando...\n");
                resultado = avaliaRPN(expressao, opcao == 2);
                
                printf("\n=== RESULTADO ===\n");
                printf("Expressão: %s\n", backup);
                printf("Resultado: %.6g\n", resultado);
                break;
                
            case 3:
                exemploUso();
                break;
                
            case 4:
                printf("Encerrando calculadora RPN...\n");
                return 0;
                
            default:
                printf("Opção inválida! Tente novamente.\n");
        }
        
        printf("\nPressione Enter para continuar...");
        getchar();
    }
    
    return 0;
}
