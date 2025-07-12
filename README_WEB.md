# RPN Calculator Web Application with Auth0

Esta aplicação web fornece uma interface moderna para a Calculadora de Notação Polonesa Reversa com autenticação segura via Auth0.

## 🔧 Configuração

### 1. Pré-requisitos
- Node.js (versão 14 ou superior)
- Conta Auth0
- GCC (para compilar o programa C)

### 2. Configuração do Auth0

1. Acesse o [Dashboard do Auth0](https://manage.auth0.com/)
2. Crie uma nova aplicação do tipo "Regular Web Application"
3. Configure as seguintes URLs:
   - **Allowed Callback URLs**: `http://localhost:3000/callback`
   - **Allowed Logout URLs**: `http://localhost:3000`
   - **Allowed Web Origins**: `http://localhost:3000`

### 3. Configuração do Ambiente

1. Copie o arquivo de exemplo:
   ```bash
   cp .env.example .env
   ```

2. Edite o arquivo `.env` com suas credenciais do Auth0:
   ```env
   AUTH0_SECRET='sua-chave-secreta-longa-e-aleatoria'
   AUTH0_BASE_URL='http://localhost:3000'
   AUTH0_CLIENT_ID='seu-client-id-do-auth0'
   AUTH0_ISSUER_BASE_URL='https://seu-dominio.auth0.com'
   ```

### 4. Instalação

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Compile o programa C:
   ```bash
   gcc -o rpn_calculator RPN_calculator.c -lm
   ```

### 5. Execução

```bash
npm start
```

A aplicação estará disponível em `http://localhost:3000`

## 🚀 Funcionalidades

### Autenticação
- ✅ Login seguro via Auth0
- ✅ Logout
- ✅ Proteção de rotas
- ✅ Informações do usuário

### Calculadora RPN
- ✅ Interface web intuitiva
- ✅ Avaliação de expressões RPN
- ✅ Modo verbose para debug
- ✅ Exemplos interativos
- ✅ Validação de entrada
- ✅ Tratamento de erros

### Operações Suportadas
- `+` Adição
- `-` Subtração
- `*` Multiplicação
- `/` Divisão
- `^` Exponenciação

## 📖 Como Usar

1. **Acesse a aplicação**: Vá para `http://localhost:3000`
2. **Faça login**: Clique em "Fazer Login" e autentique-se via Auth0
3. **Use a calculadora**: Digite expressões RPN como `3 4 + 5 *`
4. **Experimente o modo verbose**: Para ver o passo-a-passo da avaliação

### Exemplos de Expressões RPN

| Expressão Infixa | Expressão RPN | Resultado |
|------------------|---------------|-----------|
| (3 + 4) * 5 | `3 4 + 5 *` | 35 |
| 5 + ((1 + 2) * 4) - 3 | `5 1 2 + 4 * + 3 -` | 14 |
| 2^3 | `2 3 ^` | 8 |

## 🛡️ Segurança

- Todas as rotas da calculadora estão protegidas por autenticação
- Tokens JWT seguros via Auth0
- Validação de entrada para prevenir ataques
- Timeout na execução de cálculos

## 🔍 Desenvolvimento

Para desenvolvimento com auto-reload:
```bash
npm run dev
```

## 📝 Estrutura do Projeto

```
├── server.js              # Servidor Express principal
├── RPN_calculator.c       # Programa C original
├── package.json           # Dependências Node.js
├── .env.example          # Exemplo de configuração
├── .gitignore           # Arquivos ignorados pelo Git
└── README_WEB.md        # Este arquivo
```

## 🐛 Solução de Problemas

### Erro "Auth0 credentials missing"
- Verifique se o arquivo `.env` está configurado corretamente
- Confirme que todas as variáveis do Auth0 estão preenchidas

### Erro na compilação do C
- Instale o GCC: `sudo apt-get install gcc` (Ubuntu/Debian)
- Verifique se a biblioteca math está disponível

### Erro "Command not found: rpn_calculator"
- Compile novamente: `gcc -o rpn_calculator RPN_calculator.c -lm`
- Verifique se o arquivo executável foi criado

## 📄 Licença

MIT - Veja o arquivo LICENSE para detalhes.