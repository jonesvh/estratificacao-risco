@echo off
setlocal

echo [init-db] Inicializando banco de dados JSON...

REM Criar pasta MEDPREV se nao existir
if not exist "MEDPREV" (
    mkdir MEDPREV
    echo [init-db] Pasta MEDPREV criada.
)

REM Verificar se db.json ja existe
if exist "MEDPREV\db.json" (
    echo [init-db] MEDPREV\db.json ja existe. Nenhuma acao necessaria.
    echo [init-db] Para reinicializar, delete MEDPREV\db.json e execute novamente.
    goto :end
)

REM Verificar se Node.js esta disponivel
where node >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Node.js nao encontrado. Instale Node.js e tente novamente.
    exit /b 1
)

REM Executar seed
echo [init-db] Gerando db.json com dados iniciais...
node backend\scripts\seed-json.js

if errorlevel 1 (
    echo [ERRO] Falha ao gerar o banco. Verifique o erro acima.
    exit /b 1
)

echo [init-db] Banco inicializado com sucesso em MEDPREV\db.json

:end
endlocal
