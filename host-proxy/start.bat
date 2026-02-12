@echo off
REM NovAI Host Proxy Startup Script
REM Reads ..\\.env for MODEL if set, auto-installs deps, runs proxy

cd /d "%~dp0"

REM Use corepack npm if available (fixes npm installation issues)
set NPM_CMD=npm
if exist "%USERPROFILE%\AppData\Local\node\corepack\v1\npm\11.10.0\bin\npm.cmd" (
    set NPM_CMD=%USERPROFILE%\AppData\Local\node\corepack\v1\npm\11.10.0\bin\npm.cmd
)

REM Check if node_modules exists, if not install dependencies
if not exist "node_modules" (
    echo Installing dependencies...
    call %NPM_CMD% install
    if errorlevel 1 (
        echo Failed to install dependencies
        exit /b 1
    )
)

REM Read .env if it exists
if exist "..\\.env" (
    for /f "tokens=1,2 delims==" %%a in (..\\.env) do (
        if "%%a"=="MODEL" set MODEL=%%b
    )
)

REM Set default model if not specified
if not defined MODEL (
    set MODEL=claude-sonnet-4-5-20250929
)

REM Set agent service URL for tool execution callbacks
if not defined AGENT_URL (
    set AGENT_URL=http://localhost:8000
)

REM Disable Claude Code permission prompts for local file access
set CLAUDE_ALLOW_ALL_TOOLS=1
set CLAUDE_DANGEROUS=1

echo Starting NovAI Host Proxy...
echo Model: %MODEL%
echo Agent URL: %AGENT_URL%
echo Permissions: Dangerous mode enabled

node server.mjs
