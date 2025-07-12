# Otimizações Implementadas na Calculadora RPN

## Resumo das Melhorias
O algoritmo da calculadora RPN foi otimizado significativamente, resultando em uma melhoria média de **60.5%** no desempenho (speedup de 1.61x).

## Otimizações Realizadas

### 1. Detecção de Operadores O(1) - Lookup Table
**Antes:** `isOperator()` usava múltiplas comparações sequenciais
```c
int isOperator(char c) {
    return c == '+' || c == '-' || c == '*' || c == '/' || c == '^';
}
```

**Depois:** Lookup table com acesso direto O(1)
```c
static const char operator_lookup[256] = {
    ['+']=1, ['-']=1, ['*']=1, ['/']=1, ['^']=1
};

static inline int isOperator(char c) {
    return operator_lookup[(unsigned char)c];
}
```

### 2. Tokenização Otimizada - Single-Pass Parsing
**Antes:** `strtok()` modificava a string original e fazia múltiplas passadas
- Complexidade: O(n*m) onde n = número de tokens, m = tamanho médio do token
- Requeria cópia da string de entrada
- Múltiplas chamadas para `strlen()`

**Depois:** Parser single-pass que não modifica a entrada
```c
typedef struct {
    const char* start;
    int length;
    int is_number;
    double number_value;
    char operator_value;
} FastToken;

int parseNextToken(const char* expr, int* pos, FastToken* token);
```
- Complexidade: O(n) onde n = número de caracteres
- Não modifica a string original
- Elimina chamadas redundantes para `strlen()`

### 3. Eliminação de Operações Desnecessárias
- **Remoção de cópias de string:** A versão original copiava a expressão para usar com `strtok()`
- **Parsing direto:** Números e operadores são identificados em uma única passada
- **Menos chamadas de função:** Redução significativa no overhead de chamadas

### 4. Melhor Localidade de Referência
- Uso de estruturas de dados mais compactas
- Acesso sequencial à string de entrada
- Redução de fragmentação de memória

## Resultados de Performance

### Benchmark Detalhado
```
Expressão 1: 3 4 +
Original:   0.006158 segundos (0.12 μs por avaliação)
Otimizada:  0.003969 segundos (0.08 μs por avaliação)
Speedup:    1.55x mais rápida

Expressão 2: 5 1 2 + 4 * + 3 -
Original:   0.016269 segundos (0.33 μs por avaliação)
Otimizada:  0.010090 segundos (0.20 μs por avaliação)
Speedup:    1.61x mais rápida

Expressão 3: 15 7 1 1 + - / 3 * 2 1 1 + + -
Original:   0.026750 segundos (0.54 μs por avaliação)
Otimizada:  0.016258 segundos (0.33 μs por avaliação)
Speedup:    1.65x mais rápida

Expressão 4: 1 2 + 3 4 + * 5 6 + 7 8 + * +
Original:   0.026631 segundos (0.53 μs por avaliação)
Otimizada:  0.016872 segundos (0.34 μs por avaliação)
Speedup:    1.58x mais rápida

Expressão 5: 10 5 + 2 * 3 / 4 + 5 - 6 * 7 / 8 + 9 - 1 +
Original:   0.037661 segundos (0.75 μs por avaliação)
Otimizada:  0.022989 segundos (0.46 μs por avaliação)
Speedup:    1.64x mais rápida
```

### Resumo Final
- **Speedup médio:** 1.61x
- **Melhoria percentual:** 60.5% mais rápida
- **Redução de complexidade:** De O(n*m) para O(n)

## Análise de Complexidade

### Complexidade Temporal
- **Original:** O(n*m) onde n = número de tokens, m = tamanho médio do token
- **Otimizada:** O(n) onde n = número de caracteres na expressão

### Complexidade Espacial
- **Original:** O(n) para cópia da string + O(h) para pilha
- **Otimizada:** O(h) apenas para pilha (sem cópia da string)

## Funcionalidades Mantidas
- ✅ Todas as operações aritméticas (+, -, *, /, ^)
- ✅ Tratamento robusto de erros
- ✅ Modo verbose para debug
- ✅ Suporte a números decimais
- ✅ Interface interativa
- ✅ Compatibilidade total com a versão anterior

## Novas Funcionalidades
- ✅ Teste de performance integrado
- ✅ Comparação entre versões original e otimizada
- ✅ Métricas detalhadas de desempenho

## Compilação
```bash
gcc -O3 -Wall -Wextra -o rpn_calculator RPN_calculator.c -lm
```

## Uso
O programa mantém a mesma interface, mas agora usa automaticamente a versão otimizada por padrão. A versão original ainda está disponível para comparação através da opção 5 no menu.