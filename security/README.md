# Sistema de Verificação de Segurança

Este diretório contém um sistema abrangente de verificação de segurança para o projeto RPN Calculator, que inclui análise de dependências, análise estática de código e testes de penetração.

## 🎯 Visão Geral

O sistema de segurança implementa as três principais categorias de verificação solicitadas:

### 1. 📦 Análise de Dependências
- Verifica vulnerabilidades em dependências npm
- Analisa dependências do sistema (Node.js, GCC, etc.)
- Detecta padrões de dependências potencialmente perigosas
- Recomenda atualizações de segurança

### 2. 🔍 Análise Estática de Código
- Analisa código C em busca de vulnerabilidades de segurança
- Verifica código JavaScript para problemas de segurança
- Detecta padrões inseguros (buffer overflow, XSS, etc.)
- Avalia qualidade e segurança do código

### 3. 🕵️ Testes de Penetração
- Testa segurança da aplicação web
- Verifica cabeçalhos de segurança
- Testa validação de entrada
- Verifica bypasses de autenticação
- Testa limitação de taxa e travessia de diretório

## 🚀 Como Usar

### Execução Completa
```bash
# Executa todas as verificações de segurança
npm run security
```

### Execução Individual
```bash
# Apenas análise de dependências
npm run security:deps

# Apenas análise estática
npm run security:static

# Apenas testes de penetração
npm run security:pentest

# Apenas geração de relatório consolidado
npm run security:report
```

### Execução Direta
```bash
# Verificação completa
node security/run-security-check.js

# Análises individuais
node security/dependency-analysis.js
node security/static-analysis.js
node security/penetration-test.js
node security/security-report.js
```

## 📊 Relatórios Gerados

Todos os relatórios são salvos em `security/reports/`:

### Relatórios JSON (Dados Técnicos)
- `dependency-analysis.json` - Análise detalhada de dependências
- `static-analysis.json` - Resultados da análise estática
- `penetration-test.json` - Resultados dos testes de penetração
- `security-report-comprehensive.json` - Relatório consolidado completo

### Relatório HTML (Visualização)
- `security-report.html` - Relatório visual consolidado para stakeholders

## 🔧 Configuração

### Pré-requisitos
- Node.js (versão 14+)
- npm
- GCC (para compilação do código C)
- Aplicação web em execução (para testes de penetração)

### Variáveis de Ambiente
```bash
# Para testes de penetração em ambiente diferente
SECURITY_TARGET_URL=http://localhost:3000
```

## 📋 Critérios de Avaliação

### Níveis de Risco
- **CRITICAL**: Vulnerabilidades críticas que requerem correção imediata
- **HIGH**: Problemas de alta severidade
- **MEDIUM**: Problemas de severidade média
- **LOW**: Problemas menores ou informativos

### Score de Segurança
O sistema calcula um score de 0-100 baseado em:
- Vulnerabilidades de dependências (-5 pontos cada)
- Problemas críticos de código (-20 pontos cada)
- Problemas de alta severidade (-10 pontos cada)
- Falhas em testes de penetração (-15 pontos cada)

## 🛠️ Tecnologias Utilizadas

### Ferramentas de Análise
- **npm audit**: Verificação de vulnerabilidades em dependências
- **Análise de padrões regex**: Detecção de código inseguro
- **Testes HTTP**: Verificação de segurança web
- **Análise estática personalizada**: Padrões específicos de segurança

### Padrões de Segurança Verificados

#### Código C
- Uso de funções inseguras (`gets`, `strcpy`, `sprintf`)
- Verificação de retorno de `malloc`
- Liberação de memória sem definir ponteiro como NULL
- Divisão por zero

#### Código JavaScript
- Uso de `eval()` (risco de injeção de código)
- Manipulação insegura de DOM (XSS)
- Injeção de comandos
- Configurações inseguras

#### Aplicação Web
- Cabeçalhos de segurança ausentes
- Validação de entrada inadequada
- Vulnerabilidades de autenticação
- Limitação de taxa
- Travessia de diretório

## 📈 Interpretação dos Resultados

### Resumo Executivo
O relatório fornece uma visão geral com:
- Score de segurança geral
- Número total de vulnerabilidades
- Problemas críticos identificados
- Principais recomendações

### Recomendações Priorizadas
As recomendações são ordenadas por:
1. **Severidade** (crítico → alto → médio → baixo)
2. **Impacto** no sistema
3. **Facilidade de implementação**

### Plano de Ação
1. **Imediato**: Corrigir problemas críticos
2. **Curto prazo**: Resolver problemas de alta severidade
3. **Médio prazo**: Implementar melhorias de segurança gerais
4. **Longo prazo**: Monitoramento contínuo

## 🔄 Integração Contínua

### Automação
```bash
# Adicionar ao pipeline CI/CD
npm run security

# Verificar código de saída
if [ $? -ne 0 ]; then
    echo "Falhas de segurança detectadas"
    exit 1
fi
```

### Monitoramento Regular
- Execute verificações semanalmente
- Monitore atualizações de dependências
- Revise relatórios após mudanças no código
- Atualize critérios conforme necessário

## 📞 Suporte

Para questões técnicas sobre o sistema de segurança:
1. Verifique os logs detalhados nos arquivos JSON
2. Execute verificações individuais para isolamento
3. Consulte a documentação técnica no código-fonte
4. Ajuste os padrões de detecção conforme necessário

## 🔮 Expansões Futuras

### Melhorias Planejadas
- Integração com ferramentas externas (SonarQube, OWASP ZAP)
- Análise de compose de containers
- Verificação de configurações de infraestrutura
- Testes de segurança automatizados mais avançados
- Dashboard em tempo real

### Personalização
O sistema é projetado para ser extensível:
- Adicione novos padrões em `static-analysis.js`
- Expanda testes em `penetration-test.js`
- Customize relatórios em `security-report.js`
- Configure novos critérios de risco