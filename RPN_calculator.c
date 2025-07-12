#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>
#include <math.h>

#define MAX_TAMANHO_PILHA 100
#define MAX_TAMANHO_ENTRADA 1000
#define MAX_TAMANHO_SIMBOLO 50

// Estrutura da pilha
typedef struct {
    double dados[MAX_TAMANHO_PILHA];
    int topo;
} Pilha;

// Estrutura para representar um token
typedef enum {
    TOKEN_NUMERO,
    TOKEN_OPERADOR,
    TOKEN_INVALIDO
} TipoToken;

typedef struct {
    TipoToken tipo;
    union {
        double numero;
        char operador;
    } valor;
} Simbolo;

// ========== IMPLEMENTAÇÃO DO TAD PILHA ==========

void inicializaPilha(Pilha* pilha) {
    pilha->topo = -1;
}

int estaVazia(Pilha* pilha) {
    return pilha->topo == -1;
}

int estaCheia(Pilha* pilha) {
    return pilha->topo >= MAX_TAMANHO_PILHA - 1;
}

int empilhar(Pilha* pilha, double valor) {
    if (estaCheia(pilha)) {
        printf("Erro: Estouro de pilha\n");
        return 0;
    }
    pilha->dados[++pilha->topo] = valor;
    return 1;
}

double desempilhar(Pilha* pilha) {
    if (estaVazia(pilha)) {
        printf("Erro: Pilha vazia (underflow)\n");
        exit(1);
    }
    return pilha->dados[pilha->topo--];
}

double topo(Pilha* pilha) {
    if (estaVazia(pilha)) {
        printf("Erro: Pilha vazia\n");
        exit(1);
    }
    return pilha->dados[pilha->topo];
}

void imprimePilha(Pilha* pilha) {
    printf("Pilha: [");
    for (int i = 0; i <= pilha->topo; i++) {
        printf("%.2f", pilha->dados[i]);
        if (i < pilha->topo) printf(", ");
    }
    printf("]\n");
}

// ========== FUNÇÕES DE SIMBOLIZAÇÃO ==========

int ehOperador(char c) {
    return c == '+' || c == '-' || c == '*' || c == '/' || c == '^';
}

Simbolo analisarToken(char* simboloStr) {
    Simbolo simbolo;
    
    // Remove espaços em branco
    while (isspace(*simboloStr)) simboloStr++;
    
    if (strlen(simboloStr) == 0) {
        simbolo.tipo = TOKEN_INVALIDO;
        return simbolo;
    }
    
    // Verifica se é um operador
    if (strlen(simboloStr) == 1 && ehOperador(simboloStr[0])) {
        simbolo.tipo = TOKEN_OPERADOR;
        simbolo.valor.operador = simboloStr[0];
        return simbolo;
    }
    
    // Tenta converter para número
    char* endptr;
    double num = strtod(simboloStr, &endptr);
    
    if (*endptr == '\0') {
        simbolo.tipo = TOKEN_NUMERO;
        simbolo.valor.numero = num;
    } else {
        simbolo.tipo = TOKEN_INVALIDO;
    }
    
    return simbolo;
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
    Pilha pilha;
    inicializaPilha(&pilha);
    
    char* simbolo = strtok(expressao, " \t\n");
    
    if (verbose) {
        printf("\n=== AVALIAÇÃO PASSO A PASSO ===\n");
        printf("Expressão: %s\n", expressao);
        printf("--------------------------------\n");
    }
    
    while (simbolo != NULL) {
        Simbolo t = analisarToken(simbolo);
        
        if (t.tipo == TOKEN_NUMERO) {
            empilhar(&pilha, t.valor.numero);
            if (verbose) {
                printf("Empilhar %.2f -> ", t.valor.numero);
                imprimePilha(&pilha);
            }
        }
        else if (t.tipo == TOKEN_OPERADOR) {
            if (pilha.topo < 1) {
                printf("Erro: Operandos insuficientes para operador '%c'\n", t.valor.operador);
                exit(1);
            }
            
            double b = desempilhar(&pilha);
            double a = desempilhar(&pilha);
            double resultado = aplicaOperacao(a, b, t.valor.operador);
            
            empilhar(&pilha, resultado);
            
            if (verbose) {
                printf("%.2f %c %.2f = %.2f -> ", a, t.valor.operador, b, resultado);
                imprimePilha(&pilha);
            }
        }
        else {
            printf("Erro: Símbolo inválido '%s'\n", simbolo);
            exit(1);
        }
        
        simbolo = strtok(NULL, " \t\n");
    }
    
    if (pilha.topo != 0) {
        printf("Erro: Expressão mal formada (elementos restantes na pilha)\n");
        exit(1);
    }
    
    if (verbose) {
        printf("--------------------------------\n");
    }
    
    return topo(&pilha);
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

int main() {
    char expressao[MAX_TAMANHO_ENTRADA];
    char backup[MAX_TAMANHO_ENTRADA];
    int opcao;
    double resultado;
    
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
}// Nova linha adicionada via API
