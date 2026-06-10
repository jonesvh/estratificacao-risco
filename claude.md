# CLAUDE.md

## Projeto

Sistema Web de Estratificação de Risco para Operadora de Saúde.

O objetivo do sistema é permitir a aplicação de questionários de estratificação de risco, armazenamento dos resultados, classificação automática dos beneficiários e exportação de dados para XLSX.

---

# Stack Obrigatória

## Frontend

* React
* TypeScript
* React Router
* React Hook Form
* TanStack Query

## Backend

* Node.js
* TypeScript
* Express

## Banco de Dados

* PostgreSQL

## ORM

* Prisma

## Infraestrutura

* Docker
* Docker Compose

Toda a aplicação deve rodar em containers.

---

# Arquitetura

Utilizar arquitetura simples e de fácil manutenção.

Evitar overengineering.

Prioridades:

1. Legibilidade
2. Simplicidade
3. Manutenção
4. Escalabilidade moderada

Não implementar padrões complexos sem necessidade.

Não utilizar microserviços.

Frontend e backend serão aplicações independentes.

---

# Regras Gerais

Sempre utilizar TypeScript.

Nunca utilizar JavaScript puro.

Nunca utilizar any sem justificativa.

Sempre criar tipos explícitos.

Sempre utilizar ESLint.

Sempre utilizar Prettier.

Sempre utilizar variáveis de ambiente para configurações.

Nunca armazenar segredos diretamente no código.

---

# Estrutura de Pastas

Utilizar sempre uma estrutura simples e consistente.

## Frontend

src/

* components
* pages
* layouts
* services
* hooks
* types
* routes
* utils

## Backend

src/

* controllers
* services
* repositories
* routes
* middlewares
* utils
* types
* prisma

Evitar criar camadas desnecessárias.

---

# Banco de Dados

Utilizar Prisma ORM.

Todas as tabelas devem possuir:

* id
* createdAt
* updatedAt

Utilizar UUID como chave primária.

Criar índices para campos frequentemente pesquisados.

---

# Autenticação

Existe apenas um usuário administrador.

Regras:

* Login obrigatório
* JWT Authentication
* Sem cadastro de usuários
* Sem recuperação de senha
* Sem múltiplos perfis
* Sem sistema de permissões

O administrador será criado manualmente através de seed.

---

# Beneficiários

Cada beneficiário possui:

* Nome completo
* CPF
* Data de nascimento
* Município
* Estado
* Telefone

CPF deve ser único.

---

# Questionários

Cada questionário deve armazenar:

* Beneficiário
* Data da aplicação
* Respostas
* Pontuação por resposta
* Pontuação por dimensão
* Pontuação total
* Classificação de risco
* Observações clínicas

As respostas devem permanecer armazenadas para consulta histórica.

---

# Estratificação de Risco

O sistema possui 20 perguntas divididas em 5 dimensões.

A pontuação não deve ser exibida durante o preenchimento.

O cálculo deve ocorrer automaticamente no backend.

Classificações:

## Baixo Risco

0 a 34 pontos

## Risco Moderado

35 a 60 pontos

## Alto Risco

61 a 95 pontos

## Muito Alto Risco

96 pontos ou mais

A classificação deve ser salva no banco.

---

# Interface

A identidade visual será definida posteriormente.

O sistema deve ser desenvolvido de forma que:

* cores
* tipografia
* logotipo
* componentes visuais

possam ser alterados facilmente.

Criar estrutura preparada para tema customizável.

Não utilizar estilos inline.

---

# Formulários

Utilizar React Hook Form.

Validação obrigatória.

Mensagens de erro amigáveis.

Máscara para CPF e telefone.

---

# API

Seguir padrão REST.

Utilizar:

* GET
* POST
* PUT
* DELETE

Retornos padronizados.

Tratamento global de erros.

---

# Exportação XLSX

Permitir exportação de questionários.

Filtros:

* Período
* Município
* Classificação de risco

Gerar arquivo XLSX compatível com Excel.

---

# Docker

Toda a aplicação deve subir utilizando:

docker compose up -d

Containers esperados:

* frontend
* backend
* postgres

Não depender de instalações locais.

---

# Código

Priorizar:

* clareza
* simplicidade
* manutenção

Evitar:

* abstrações desnecessárias
* código duplicado
* dependências sem necessidade

Sempre preferir soluções simples.

---

# Objetivo Final

Entregar uma aplicação web corporativa para área da saúde capaz de:

* autenticar administrador
* aplicar questionários
* calcular classificação de risco
* armazenar histórico
* consultar registros
* exportar dados XLSX

Executando integralmente em Docker com React, Node.js e PostgreSQL.
