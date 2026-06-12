# Estratificação de Risco

Sistema web para aplicação de questionários de estratificação de risco em beneficiários de operadora de saúde. Permite cadastrar beneficiários, aplicar questionários, calcular classificação de risco automaticamente e exportar os dados em XLSX.

**Stack:** React · TypeScript · Node.js/Express · JSON file store · Nginx · Docker

---

## Modos de implantação

| Modo | Quando usar |
|---|---|
| **Windows direto** (recomendado) | Servidor Windows sem Docker — clonar e executar um `.bat` |
| **Docker** | Servidor Linux com Docker instalado |

---

## Modo Windows (sem Docker)

### Pré-requisitos

- [Node.js LTS 20+](https://nodejs.org/en/download) instalado no servidor
- Git

### Início rápido

```bat
git clone https://github.com/jonesvh/estratificacao-risco.git
cd estratificacao-risco
start.bat
```

O script `start.bat` faz tudo automaticamente:

1. Verifica se o Node.js está instalado
2. Instala as dependências do backend e do frontend
3. Compila backend (TypeScript → JS) e frontend (Vite build)
4. Cria `MEDPREV\db.json` com o questionário inicial (apenas na primeira execução)
5. Inicia o servidor na porta **6001**

Aguarde a mensagem `Sistema pronto!` e acesse `http://192.168.1.250:6001` no navegador.

### Parar o servidor

Pressione `Ctrl+C` na janela do terminal.

### Atualizar após `git pull`

Execute `start.bat` novamente. O banco de dados existente (`MEDPREV\db.json`) é preservado.

### Dados

Os dados ficam em `MEDPREV\db.json`, na raiz do projeto. Faça cópias regulares desse arquivo para backup.

---

## Modo Docker

### Pré-requisitos

| Requisito | Versão mínima |
|---|---|
| Docker Engine | 24+ |
| Docker Compose plugin | v2 (`docker compose`, sem hífen) |
| Git | qualquer |

### Início rápido

```bash
git clone https://github.com/jonesvh/estratificacao-risco.git
cd estratificacao-risco
docker compose up -d
```

Na primeira execução as imagens são compiladas — aguarde ~2 minutos. Quando os containers estiverem saudáveis, acesse `http://192.168.1.250:6001`.

### Configuração do `.env`

| Variável | Padrão | Descrição |
|---|---|---|
| `NODE_ENV` | `production` | Manter `production` em produção |
| `HTTP_PORT` | `6001` | Porta exposta pelo nginx no host |
| `CORS_ORIGIN` | `http://192.168.1.250:6001` | URL de acesso dos usuários |
| `LOG_LEVEL` | `info` | Nível de log: `trace` · `debug` · `info` · `warn` · `error` |

### O que acontece na primeira inicialização

1. O backend verifica se `MEDPREV/db.json` existe
2. Se não existir, executa `seed-json.js` — cria o questionário padrão
3. O servidor inicia na porta 4000 (interna); o nginx expõe na porta configurada em `HTTP_PORT`

### Arquitetura dos containers

```
Internet
    │
    ▼
er_nginx  (:6001 no host)
    ├── /api/*   ──▶  er_backend  (:4000 interno)
    └── /*       ──▶  er_frontend  (:80 interno)
```

Os dados são persistidos em `./MEDPREV/db.json` (volume montado no host).

### Verificar se está funcionando

```bash
docker compose ps

# Logs do backend
docker compose logs backend --tail=50

# Logs em tempo real
docker compose logs -f
```

| Container | Status esperado |
|---|---|
| `er_nginx` | running |
| `er_frontend` | running |
| `er_backend` | healthy |

### Comandos úteis

```bash
# Subir em background
docker compose up -d

# Parar sem remover dados
docker compose down

# Rebuild após atualizar o código
git pull
docker compose build
docker compose up -d

# Reiniciar um serviço específico
docker compose restart backend

# Shell do container do backend
docker exec -it er_backend sh
```

---

## Banco de dados (JSON)

O sistema armazena todos os dados em um único arquivo JSON: `MEDPREV/db.json`.

- **Sem PostgreSQL, sem configuração de banco**
- O arquivo é criado automaticamente na primeira execução (via `start.bat` ou `entrypoint.sh`)
- Nunca commite `MEDPREV/db.json` no git — ele contém dados de produção

### Backup

Copie o arquivo `MEDPREV/db.json` regularmente para armazenamento externo.

No Windows, um script simples para agendar com o Agendador de Tarefas:

```bat
copy MEDPREV\db.json MEDPREV\backup\db_%date:~-4,4%%date:~-7,2%%date:~0,2%.json
```

---

## Resolução de problemas

### `start.bat` não abre ou fecha imediatamente

Execute via `cmd.exe` para ver a mensagem de erro:

```
Iniciar → cmd → cd C:\caminho\do\projeto → start.bat
```

### `Node.js nao encontrado`

Instale o Node.js LTS em https://nodejs.org/en/download e execute `start.bat` novamente.

### Falha na compilação do backend ou frontend

Verifique a conexão com a internet — `npm install` precisa baixar pacotes na primeira execução. Em redes restritas, configure o proxy do npm:

```bat
npm config set proxy http://proxy.empresa.com:porta
npm config set https-proxy http://proxy.empresa.com:porta
```

### Porta 6001 já está em uso

No `start.bat`, altere a linha `set PORT=6001` para outra porta e atualize a linha `set CORS_ORIGIN=` com a nova porta.

### Container `er_backend` em estado `restarting` (Docker)

```bash
docker compose logs backend
```

Causa comum: erro na compilação ou caminho do volume `MEDPREV` sem permissão de escrita.

### Resetar o banco de dados

Apague (ou renomeie) o arquivo `MEDPREV\db.json` e execute `start.bat` novamente — o questionário padrão será recriado do zero.

> **Atenção:** todos os beneficiários e respostas serão perdidos.
