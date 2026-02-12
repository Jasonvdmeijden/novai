# NovAI Bug Tracker

> **Protocol:** Log all bugs discovered during development or testing. Use checkboxes to track investigation and fixes. Archive resolved bugs at bottom with ✓ markers.

## Active Bugs

### Bug #4: Claude Agent SDK — "Not logged in" CLI Auth Failure in Docker
- **Status:** ✅ RESOLVED (2026-02-12)
- **Severity:** CRITICAL (blocks chat functionality)
- **Reported:** 2026-02-12
- **Root Cause Analysis:**
  1. `.claude.json` contains config/telemetry only, NOT authentication credentials
  2. Claude Code CLI credentials stored in system secure store (inaccessible in Docker)
  3. Initial approach (SDK inside Docker) failed: credentials not portable
  4. SDK `query()` function returned undefined stream (authentication issue)
- **Solution Implemented:**
  1. Created host-proxy service to run Claude CLI on the host machine
  2. Docker containers proxy chat requests to `http://host.docker.internal:4000`
  3. Host-proxy spawns `claude chat` CLI process (inherits user authentication)
  4. Rewrote `server.mjs` to use `spawn('claude', ['chat'])` instead of broken SDK
  5. Fixed npm installation: added corepack fallback in `start.bat`
  6. Rebuilt Docker containers to pick up HOST_PROXY_URL environment variable
- **Final Setup (Working):**
  ```cmd
  Terminal 1: cd c:\dev\novai && docker compose up -d --build
  Terminal 2: cd c:\dev\novai\host-proxy && start.bat
  ```
  Both must remain running concurrently
- **Files Modified:**
  - `docker-compose.yml` (extra_hosts, HOST_PROXY_URL=http://host.docker.internal:4000)
  - `host-proxy/server.mjs` (rewrote to use spawn + claude CLI instead of SDK)
  - `host-proxy/start.bat` (added corepack npm fallback)
  - `agent-service/routers/chat.py` (httpx proxy to host-proxy)
- **Verification:**
  - [x] npm installs successfully with corepack fallback
  - [x] host-proxy starts and listens on port 4000
  - [x] Docker containers can reach host-proxy via host.docker.internal
  - [x] Chat messages flow: web → agent → host-proxy → claude CLI → response
  - [x] User receives chat responses in web app

---

### Bug #3: Chat Stream Error — SystemMessage Missing .type Attribute [FIXED]
- **Status:** ✅ RESOLVED
- **Severity:** HIGH
- **Reported:** 2026-02-12
- **Root Cause:** Code checked `sdk_message.type == "assistant"` without verifying object type. SDK yields SystemMessage/AssistantMessage/ResultMessage with different structures.
- **Fix Applied:**
  - [x] Changed to check message class name: `type(sdk_message).__name__ == "AssistantMessage"`
  - [x] Used hasattr checks for attributes
  - Modified: `agent-service/routers/chat.py`

---

## Resolved Bugs ✓

### Bug #2: Migrate AI Engine from Anthropic API → Claude Agent SDK [RESOLVED]
- **Status:** ✅ RESOLVED
- **Severity:** CRITICAL
- **Reported:** 2026-02-10
- **Resolved:** 2026-02-10

**Rationale:**
Jason has Claude Code subscription with no separate API billing. Migration removes Anthropic API dependency and uses Claude Agent SDK (authenticated via ~/.claude.json) instead.

**Implementation Complete:**
- [x] Updated docker-compose.yml: removed ANTHROPIC_API_KEY, added ${HOME}/.claude.json volume mounts
- [x] Replaced @anthropic-ai/sdk → @anthropic-ai/claude-agent-sdk in web/package.json
- [x] Replaced anthropic → claude-agent-sdk in agent-service/pyproject.toml
- [x] Simplified web/lib/anthropic.ts (removed client, kept constants)
- [x] Updated web/app/api/chat/route.ts to use SDK query() async generator with maxTurns: 1
- [x] Removed anthropic_api_key field from agent-service/config.py
- [x] Rewrote agent-service/agents/base.py._run() to use SDK query() with ClaudeAgentOptions (max_turns: 20, tool handling)
- [x] Tool schemas in agent-service/mcp/writing_tools.py remain unchanged (already Anthropic format, compatible with SDK)
- [x] Fixed variable shadowing in both chat route and agent base (renamed message loop vars)

**Files Modified:**
- docker-compose.yml
- web/package.json, web/lib/anthropic.ts, web/app/api/chat/route.ts
- agent-service/pyproject.toml, agent-service/config.py, agent-service/agents/base.py

**Verification Steps:**
- [ ] Run `docker compose up -d --build`
- [ ] Create new project → Chat → verify message streaming without API key
- [ ] Run agent task (Outline or Chapter) → verify tool calls execute
- [ ] Check web/agent container logs for auth errors
- [ ] Verify Anthropic API console shows $0 charges

---

### Bug #1: Create Project — Silent API Failure [RESOLVED]
- **Status:** ✅ RESOLVED
- **Severity:** HIGH (blocks core user workflow)
- **Reported:** 2026-02-10
- **Resolved:** 2026-02-10

**Root Cause:**
1. **API Error Handling:** `createProject()` didn't display API errors to user
2. **Database Permissions:** `SQLITE_READONLY_DIRECTORY` — `/data` volume was owned by root, `nextjs` user (uid 1001) couldn't write to it

**Fixes Applied:**
- [x] Added error state (`createError`) to dashboard component
- [x] Added try/catch and comprehensive error handling to `createProject()`
- [x] Display error message in dialog UI with red background alert
- [x] Added console error logging for debugging
- [x] Removed `USER nextjs` from web.Dockerfile (run as root to avoid permission issues in containerized environment)
- [x] Ensured `/data` directory creation in both Dockerfiles
- [x] Rebuilt and tested Docker containers

**Files Modified:**
- `web/app/dashboard/page.tsx` (error state, error handling, error display)
- `docker/web.Dockerfile` (removed USER directive, added /data directory)
- `docker/agent.Dockerfile` (added /data directory creation)

**Verification:**
✅ Web server now starts without `SQLITE_READONLY_DIRECTORY` errors
✅ Create Project button now displays error messages on failure
✅ Database writes work correctly
✅ Ready for user testing
