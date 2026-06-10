# Estratificação de Risco

Sistema web para aplicação de questionários de estratificação de risco em beneficiários de operadora de saúde. Permite cadastrar beneficiários, aplicar questionários, calcular classificação de risco automaticamente e exportar os dados em XLSX.

**Stack:** React · TypeScript · Node.js/Express · PostgreSQL · Nginx · Docker

---

## Pré-requisitos

| Requisito | Versão mínima |
|---|---|
| Docker Engine | 24+ |
| Docker Compose plugin | v2 (`docker compose`, sem hífen) |
| Git | qualquer |

A porta **80** do servidor deve estar livre (configurável via `HTTP_PORT`).

---

## Início rápido

```bash
git clone https://github.com/jonesvh/estratificacao-risco.git
cd estratificacao-risco
cp .env.example .env
```

Abra o `.env` e preencha as variáveis obrigatórias (ver seção abaixo), depois:

```bash
docker compose up -d
```

Na primeira execução o Docker vai compilar as imagens — aguarde ~2 minutos. Quando todos os containers estiverem saudáveis, acesse `http://IP_DO_SERVIDOR` no navegador.

---

## Configuração do `.env`

Copie `.env.example` para `.env` e edite os valores. As variáveis marcadas como **obrigatórias** causam erro de inicialização se estiverem com o valor padrão do exemplo.

| Variável | Obrigatória | Padrão | Descrição |
|---|:---:|---|---|
| `NODE_ENV` | — | `production` | Manter `production` em produção |
| `HTTP_PORT` | — | `80` | Porta do host exposta pelo nginx |
| `POSTGRES_DB` | — | `estratificacao` | Nome do banco de dados |
| `POSTGRES_USER` | — | `eruser` | Usuário do PostgreSQL |
| `POSTGRES_PASSWORD` | **sim** | — | Senha do banco — use letras, números e `!`, `_`, `-` (não use `@` ou `#`) |
| `JWT_SECRET` | **sim** | — | Chave JWT, mínimo 32 caracteres |
| `JWT_EXPIRES_IN` | — | `8h` | Validade do token de sessão |
| `ADMIN_EMAIL` | **sim** | — | E-mail do administrador |
| `ADMIN_PASSWORD` | **sim** | — | Senha do administrador |
| `CORS_ORIGIN` | — | `http://localhost` | URL de acesso dos usuários (ex: `https://app.empresa.com`) |
| `LOG_LEVEL` | — | `info` | Nível de log: `trace` · `debug` · `info` · `warn` · `error` |

### Gerar um JWT_SECRET seguro

```bash
openssl rand -hex 32
```

Cole o resultado no campo `JWT_SECRET` do `.env`.

---

## O que acontece na primeira inicialização

Ao subir pela primeira vez, o backend executa automaticamente:

1. **Migração do banco** — cria todas as tabelas via `prisma migrate deploy`
2. **Seed do administrador** — cria o usuário com `ADMIN_EMAIL` / `ADMIN_PASSWORD` (operação idempotente; se já existir, ignora)
3. **Seed do questionário** — insere o questionário padrão de estratificação de risco (idempotente)
4. **Início do servidor** — API disponível na porta 4000 (interna)

O PostgreSQL passa por um healthcheck antes de o backend iniciar; nas primeiras execuções isso pode levar até 30 segundos.

---

## Verificar se está funcionando

```bash
# Ver status dos 4 containers
docker compose ps

# Acompanhar logs do backend (inclui output do entrypoint)
docker compose logs backend --tail=50

# Logs em tempo real de todos os serviços
docker compose logs -f
```

Todos os containers devem estar com status `running` ou `healthy`:

| Container | Status esperado |
|---|---|
| `er_nginx` | running |
| `er_frontend` | running |
| `er_backend` | healthy |
| `er_postgres` | healthy |

---

## Primeiro acesso

- **URL:** `http://IP_DO_SERVIDOR` (ou o domínio configurado em `CORS_ORIGIN`)
- **Login:** e-mail e senha definidos em `ADMIN_EMAIL` / `ADMIN_PASSWORD`

---

## Arquitetura dos containers

```
Internet
    │
    ▼
er_nginx  (:80 no host)
    ├── /api/*   ──▶  er_backend  (:4000 interno)
    │                      │
    │                      ▼
    │               er_postgres  (:5432 interno)
    │
    └── /*       ──▶  er_frontend  (:80 interno)
```

Apenas o `er_nginx` expõe porta no host. Os demais serviços comunicam-se pela rede interna `er_internal` e não são acessíveis diretamente de fora.

Os dados do PostgreSQL são persistidos no volume Docker `postgres_data`.

---

## Domínio próprio e HTTPS

1. Aponte o DNS do domínio para o IP do servidor
2. Altere `CORS_ORIGIN=https://seu.dominio.com` no `.env`
3. Reinicie: `docker compose up -d`

Para HTTPS, coloque um proxy com terminação TLS na frente da porta 80. Opções:

- **Caddy** (mais simples, HTTPS automático via Let's Encrypt)
- **Nginx externo** com Certbot
- **Cloudflare Tunnel** (não exige abrir porta no firewall)

---

## Comandos úteis

```bash
# Subir em background
docker compose up -d

# Parar sem remover volumes
docker compose down

# Parar e remover TODOS os dados (cuidado — apaga o banco)
docker compose down -v

# Rebuild após atualizar o código
git pull
docker compose build
docker compose up -d

# Reiniciar um serviço específico
docker compose restart backend

# Acessar o shell do container do backend
docker exec -it er_backend sh

# Abrir o Prisma Studio (visualizar o banco — use com cautela em prod)
docker exec -it er_backend ./node_modules/.bin/prisma studio
```

---

## Backup do banco de dados

```bash
# Criar dump
docker exec er_postgres pg_dump -U eruser estratificacao > backup_$(date +%Y%m%d_%H%M).sql

# Restaurar dump
cat backup_YYYYMMDD_HHMM.sql | docker exec -i er_postgres psql -U eruser -d estratificacao
```

Recomenda-se automatizar o dump com cron e enviar para armazenamento externo (S3, Google Drive, etc.).

---

## Resolução de problemas

### Container `er_backend` em estado `restarting`
```bash
docker compose logs backend
```
Causas comuns: variável obrigatória ausente no `.env`, banco ainda iniciando (aguarde ~30s e tente novamente), erro de compilação.

### `POSTGRES_PASSWORD is required`
O arquivo `.env` não foi criado ou está faltando a variável. Verifique:
```bash
cat .env | grep POSTGRES_PASSWORD
```

### Porta 80 já está em uso
Altere `HTTP_PORT` no `.env` para outra porta (ex: `8080`) e reinicie:
```bash
docker compose down && docker compose up -d
```

### Banco não conecta após restart
O volume `postgres_data` existe, mas o banco pode levar alguns segundos para estar pronto. Aguarde o healthcheck passar:
```bash
docker compose ps   # coluna STATUS deve mostrar "healthy"
```

### Mudanças no código não aparecem
Alterações no código-fonte exigem rebuild da imagem:
```bash
docker compose build backend   # ou frontend
docker compose up -d
```

### Resetar tudo e começar do zero
```bash
docker compose down -v          # remove containers + volumes
docker compose up -d            # recria tudo do zero
```
> **Atenção:** o comando acima apaga todos os dados do banco.
