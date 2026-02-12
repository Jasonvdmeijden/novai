# NovAI — Implementation Tracking

> **Purpose:** Track progress across sessions to minimize re-explanation. Read this file first in each new session.

## Architecture

```
Browser (localhost:3000)
    │
    ▼
┌─────────────────────────────────────┐
│  Next.js 15 (web:3000)              │
│  - UI (React + Tailwind + shadcn)   │
│  - API routes: chat (TS SDK + SSE)  │
│  - API routes: proxy to agent svc   │
│  - API routes: vault reads, CRUD    │
└────────────┬────────────────────────┘
             │ HTTP + SSE (internal Docker network)
             ▼
┌─────────────────────────────────────────┐
│  FastAPI Agent Service (agent:8000)     │
│  - Anthropic Python SDK                 │
│  - MCP Client → filesystem MCP (stdio)  │
│  - Custom writing tools (in-process)    │
│  - Long-running task management         │
└─────────────────────────────────────────┘
             │
             ▼
     Obsidian Vault (bind-mount) + SQLite (shared volume)
```

## Progress Checklist

### Phase 1: Project Scaffolding — DONE
- [x] `docker-compose.yml` (web + agent services, shared volumes)
- [x] `docker/web.Dockerfile` (Node 22, multi-stage)
- [x] `docker/agent.Dockerfile` (Python 3.13, Node for MCP)
- [x] `.env.example` (ANTHROPIC_API_KEY, VAULT_PATH)
- [x] Next.js scaffold: `web/package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`
- [x] App shell: `web/app/layout.tsx`, `web/app/page.tsx` (redirects to /dashboard), `web/app/globals.css`
- [x] `web/lib/utils.ts` (cn helper)
- [x] shadcn/ui components: button, card, input, textarea, badge, scroll-area, progress, tabs, dialog, select, label, separator, slider, tooltip
- [x] FastAPI scaffold: `agent-service/pyproject.toml`, `main.py`, `config.py`

### Phase 2: Database & Core Models — DONE
- [x] `web/types/index.ts` — All TS types (Project, WritingParameters, ChatMessage, AgentTask, TaskProgressEvent, VaultFile, VaultDocument, VaultMapping, VaultSnapshot, enums for genres/tones/etc.)
- [x] `web/lib/db.ts` — SQLite schema (projects, writing_parameters, chat_messages, agent_tasks, vault_mappings, vault_snapshots, user_preferences)
- [x] `agent-service/models/schemas.py` — Pydantic models (TaskType, TaskStatus, AgentTask, TaskSubmission, TaskProgressEvent, WritingParameters, VaultDocument)
- [x] `agent-service/tasks/store.py` — Task CRUD (init_db, create_task, get_task, update_task_status)

### Phase 3: Obsidian Vault Integration — DONE
- [x] Vault templates: `vault-template/00-05` folders with Synopsis, Outline, Themes, Timeline, Character Template, Geography, Culture, History, Chapter Template, Notes/.gitkeep, Reference/.gitkeep
- [x] `web/lib/vault.ts` — getVaultPath, listVaultFiles, readVaultFile, writeVaultFile, vaultFileExists, deleteVaultFile, getVaultStats (with path traversal protection)
- [x] `web/app/api/vault/route.ts` — GET (list/read/stats), PUT (write), DELETE
- [x] `web/app/api/vault/mappings/route.ts` — GET/PUT vault folder mappings per project
- [x] `agent-service/vault/__init__.py`, `reader.py`, `writer.py`

### Phase 4: Chat Interface — DONE
- [x] `web/lib/anthropic.ts` — SDK singleton, DEFAULT_MODEL, MAX_TOKENS
- [x] `web/lib/prompts.ts` — buildSystemPrompt(params), buildContextSection(files)
- [x] `web/app/api/chat/route.ts` — SSE streaming endpoint (POST)
- [x] `web/app/api/chat/history/route.ts` — GET/DELETE chat history
- [x] `web/hooks/useChat.ts` — SSE consumption hook
- [x] `web/components/chat/ChatMessage.tsx` — renders user/assistant messages with markdown
- [x] `web/components/chat/StreamingText.tsx` — streaming cursor display
- [x] `web/components/chat/ChatInput.tsx` — textarea with Enter-to-send
- [x] `web/components/chat/ContextSelector.tsx` — file picker for context injection
- [x] `web/components/chat/ChatWindow.tsx` — main chat container composing all chat components

### Phase 5: Agent Service (Python) — DONE
- [x] `agent-service/mcp/__init__.py`
- [x] `agent-service/mcp/filesystem_config.py` — MCP filesystem server spawn config
- [x] `agent-service/mcp/writing_tools.py` — Custom tools: get_writing_parameters, save_chapter, update_progress, check_continuity + execute_tool dispatcher + CUSTOM_TOOLS registry
- [x] `agent-service/agents/__init__.py`
- [x] `agent-service/agents/base.py` — BaseAgent ABC with agentic loop (tool use cycle), progress events, cancel support
- [x] `agent-service/agents/chapter_writer.py`
- [x] `agent-service/agents/character_developer.py`
- [x] `agent-service/agents/worldbuilder.py`
- [x] `agent-service/agents/outliner.py`
- [x] `agent-service/agents/prose_editor.py`
- [x] `agent-service/agents/researcher.py`
- [x] `agent-service/tasks/manager.py` — Agent registry, run_task async generator, cancel_task, one-task-per-project queue
- [x] `agent-service/routers/__init__.py`
- [x] `agent-service/routers/tasks.py` — POST /{task_type} (SSE stream), GET /{task_id}/status, POST /{task_id}/cancel

### Phase 6: Frontend Pages & UI — DONE
- [x] `web/components/layout/Sidebar.tsx` — main nav sidebar (Dashboard, Chat, Outline, Chapters, Characters, Worldbuilding, Notes, Settings)
- [x] `web/components/layout/Header.tsx` — top bar with project name
- [x] `web/components/layout/ProjectSidebar.tsx` — project-specific nav
- [x] `web/app/dashboard/page.tsx` — project list + create project
- [x] `web/app/api/projects/route.ts` — project CRUD API
- [x] `web/app/api/projects/params/route.ts` — writing parameters GET/PUT (added)
- [x] `web/app/projects/[projectId]/layout.tsx` — project layout with sidebar
- [x] `web/app/projects/[projectId]/page.tsx` — project overview (stats, progress)
- [x] `web/app/projects/[projectId]/chat/page.tsx` — chat page
- [x] `web/app/projects/[projectId]/outline/page.tsx` — outline builder
- [x] `web/app/projects/[projectId]/chapters/page.tsx` — chapter list
- [x] `web/app/projects/[projectId]/chapters/[chapterId]/page.tsx` — chapter editor + AI panel
- [x] `web/app/projects/[projectId]/characters/page.tsx` — character gallery
- [x] `web/app/projects/[projectId]/characters/[characterId]/page.tsx` — character profile editor
- [x] `web/app/projects/[projectId]/worldbuilding/page.tsx` — topic browser
- [x] `web/app/projects/[projectId]/worldbuilding/[topicId]/page.tsx` — topic editor
- [x] `web/app/projects/[projectId]/notes/page.tsx` — vault file tree
- [x] `web/app/projects/[projectId]/notes/[...noteId]/page.tsx` — note viewer (added)
- [x] `web/app/projects/[projectId]/settings/page.tsx` — writing params config
- [x] `web/app/api/agent/route.ts` — proxy to agent service
- [x] `web/app/api/agent/[taskId]/stream/route.ts` — proxy SSE stream
- [x] `web/components/vault/VaultFileView.tsx` — reusable markdown viewer/editor (added)

### Phase 7: Writing Parameters System — DONE
- [x] Settings UI with progressive disclosure (Core / Style / Advanced / Prompt Preview tabs)
- [x] Per-task parameter overrides (`web/components/writing/ParameterOverridePanel.tsx`)
- [x] System prompt construction: TS (`web/lib/prompts.ts`) + preview API (`/api/projects/prompt`)
- [x] `web/app/api/projects/prompt/route.ts` — renders and returns the live system prompt

### Phase 8: Task Progress UX — DONE
- [x] `web/components/writing/TaskProgressCard.tsx` — real-time SSE progress display
- [x] `web/hooks/useAgentTask.ts` — task submission + SSE hook
- [x] `web/components/writing/TaskWizard.tsx` — 3-step wizard (configure → review → watch)
- [x] `web/components/writing/DiffView.tsx` — line-level before/after comparison (no deps)
- [x] `web/app/api/vault/snapshots/route.ts` — list snapshots + restore (undo)
- [x] `web/components/writing/SnapshotHistory.tsx` — history panel with diff + restore button
- [x] Chapter editor wired: TaskWizard + SnapshotHistory in header actions

## Key Design Decisions
| Decision | Choice | Why |
|----------|--------|-----|
| Chat streaming | SSE (not WebSocket) | Unidirectional, auto-reconnect, Next.js native |
| Agent tasks | Async POST → SSE progress | Non-blocking, real-time, cancellable |
| MCP transport | stdio (child process) | Simplest, no networking |
| Database | SQLite (shared volume) | Single-user, zero config |
| Existing vault support | Mapping file, not restructuring | Non-destructive |

## File Map (quick reference)
```
novai/
├── docker-compose.yml
├── docker/web.Dockerfile, agent.Dockerfile
├── .env.example
├── vault-template/          # Template vault structure
├── web/
│   ├── app/
│   │   ├── api/chat/        # SSE streaming chat
│   │   ├── api/vault/       # Vault file CRUD
│   │   ├── api/projects/    # (TODO) Project CRUD
│   │   ├── api/agent/       # (TODO) Proxy to agent service
│   │   ├── dashboard/       # (TODO) Project list
│   │   └── projects/[id]/   # (TODO) All project pages
│   ├── components/
│   │   ├── ui/              # shadcn components (done)
│   │   ├── chat/            # Chat components (partial)
│   │   ├── layout/          # (TODO) Sidebar, Header
│   │   └── writing/         # (TODO) TaskProgressCard, DiffView
│   ├── hooks/               # useChat (done), useAgentTask (TODO)
│   ├── lib/                 # db, vault, anthropic, prompts, utils
│   └── types/index.ts       # All shared types
└── agent-service/
    ├── main.py              # FastAPI app
    ├── config.py            # Settings
    ├── models/schemas.py    # Pydantic models
    ├── tasks/store.py       # SQLite task CRUD
    ├── tasks/manager.py     # (TODO) Task lifecycle
    ├── vault/reader.py, writer.py
    ├── mcp/                 # (TODO) MCP config + custom tools
    ├── agents/              # (TODO) All agent types
    └── routers/tasks.py     # (TODO) FastAPI endpoints
```

## Phase 9: Host-Proxy Integration — DONE
- [x] `host-proxy/package.json` (Express + @anthropic-ai/claude-code)
- [x] `host-proxy/server.mjs` (Express server, /chat + /run-agent endpoints, SSE streaming)
- [x] `host-proxy/start.bat` (Windows startup script with .env support)
- [x] `docker-compose.yml` — Added extra_hosts, HOST_PROXY_URL env, ports to agent service
- [x] `agent-service/config.py` — Added host_proxy_url field
- [x] `agent-service/pyproject.toml` — Replaced claude-agent-sdk with httpx
- [x] `agent-service/routers/chat.py` — Rewrote for httpx SSE pass-through to host-proxy
- [x] `agent-service/agents/base.py` — Rewrote for httpx SSE consumer with tool callbacks
- [x] `agent-service/routers/internal.py` — NEW: Tool execution callback endpoint
- [x] `agent-service/main.py` — Registered internal_router

## Resume Instructions
When resuming work, say: "Continue implementing NovAI from PLAN.md" — then read this file and pick up from the first unchecked item.
