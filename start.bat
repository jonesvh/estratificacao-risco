@echo off
setlocal enabledelayedexpansion
title ER - Estratificacao de Risco

echo.
echo  ================================================
echo   Estratificacao de Risco - Inicializacao
echo  ================================================
echo.

REM ── 1. Verificar Node.js ──────────────────────────────────────────────────────
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Node.js nao encontrado.
    echo.
    echo  Instale o Node.js LTS antes de continuar:
    echo  https://nodejs.org/en/download
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node --version') do echo [OK] Node.js %%v

REM ── 2. Garantir pasta MEDPREV ─────────────────────────────────────────────────
if not exist "MEDPREV" (
    mkdir MEDPREV
    echo [OK] Pasta MEDPREV criada.
)

REM ── 3. Instalar dependencias do backend ───────────────────────────────────────
echo.
echo [1/4] Instalando dependencias do backend...
cd backend
call npm install --prefer-offline
if errorlevel 1 (
    echo [ERRO] Falha ao instalar dependencias do backend.
    pause & exit /b 1
)

REM ── 4. Compilar o backend ─────────────────────────────────────────────────────
echo.
echo [2/4] Compilando backend...
call npm run build
if errorlevel 1 (
    echo [ERRO] Falha na compilacao do backend.
    pause & exit /b 1
)
cd ..

REM ── 5. Instalar dependencias e compilar o frontend ───────────────────────────
echo.
echo [3/4] Instalando dependencias do frontend...
cd frontend
call npm install --prefer-offline
if errorlevel 1 (
    echo [ERRO] Falha ao instalar dependencias do frontend.
    pause & exit /b 1
)

echo.
echo [4/4] Compilando frontend...
call npm run build
if errorlevel 1 (
    echo [ERRO] Falha na compilacao do frontend.
    pause & exit /b 1
)
cd ..

REM ── 6. Inicializar banco de dados ─────────────────────────────────────────────
if not exist "MEDPREV\db.json" (
    echo.
    echo [DB] Criando banco de dados inicial...
    node backend\scripts\seed-json.js
    if errorlevel 1 (
        echo [ERRO] Falha ao inicializar banco de dados.
        pause & exit /b 1
    )
    echo [DB] Banco inicializado com sucesso.
) else (
    echo [DB] Banco de dados existente encontrado.
)

REM ── 7. Iniciar servidor ───────────────────────────────────────────────────────
echo.
echo  ================================================
echo   Sistema pronto!
echo.
echo   Acesse: http://192.168.1.250:6001
echo   ou:     http://localhost:6001
echo.
echo   Para encerrar: pressione Ctrl+C
echo  ================================================
echo.

set PORT=6001
set JSON_DB_PATH=..\MEDPREV\db.json
set FRONTEND_DIST_PATH=..\frontend\dist
set NODE_ENV=production
set CORS_ORIGIN=http://192.168.1.250:6001
set LOG_LEVEL=info

cd backend
node dist\main.js
cd ..
