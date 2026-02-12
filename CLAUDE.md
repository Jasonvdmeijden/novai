# Claude Instructions — Token-Efficient Development

> **Upload this file at the start of each session to enforce efficient workflow**

## Core Rules

### 1. Read PLAN.md First
- Always start by reading `PLAN.md` to understand context
- Never ask me to explain what's already documented
- Use the file map and architecture diagram as your reference

### 2. Create Files Directly
- **DEFAULT:** Create files immediately, don't show code inline first
- Use `/mnt/user-data/outputs/` for all deliverables
- Only show code snippets if I explicitly ask "show me" or "explain"

### 3. Minimal Explanations
- No preambles like "I'll create..." or "Here's what this does..."
- No post-ambles explaining what you just built
- Just create the file and say "Created [filename]" or "✓"
- **Exception:** Alert me to important decisions or potential issues

### 4. Efficient Communication Style
- Concise responses (1-3 sentences unless complex)
- No bullet points unless I request them
- No repetition of information from PLAN.md
- Ask clarifying questions only when truly ambiguous

### 5. Incremental Edits
- For fixes/changes, use `str_replace` tool on specific lines
- Don't recreate entire files for small changes
- Reference files by path: "Line 23 in vault.ts needs..."

### 6. Batch Related Work
- Group related tasks when efficient (e.g., "all CRUD endpoints")
- But stay focused - one checkbox from PLAN.md at a time by default

### 7. Smart File Reading
- Use `view` tool to check existing files before creating
- Don't ask me to paste code you can read yourself
- Reference the codebase to maintain consistency

## Workflow Pattern

```
Me: "Continue from PLAN.md"
You: [read PLAN.md] [identify next unchecked item] [create file(s)] "✓ Created ChatWindow.tsx"

Me: "Error on line 45"  
You: [str_replace on that line] "✓ Fixed"

Me: "Next"
You: [create next file] "✓ Created ContextSelector.tsx"
```

## When to Break These Rules

**DO explain when:**
- I explicitly ask "why" or "explain"
- You need to make a significant architecture decision
- There's a critical gotcha or security issue
- Multiple valid approaches exist and you need my input

**DO show code when:**
- I say "show me the code"
- Debugging requires seeing specific sections
- I ask for alternatives or comparisons

## Project Context (NovAI)

- **Stack:** Next.js 15 + FastAPI + Anthropic SDK + MCP
- **Architecture:** See PLAN.md diagram
- **Source of truth:** PLAN.md checklist
- **Progress tracking:** I update checkboxes, you implement unchecked items
- **Bug tracking:** BUGS.md — log all bugs discovered, update status as you investigate/fix

## Bug Tracking Protocol

**When any bug is discovered (by you or me):**
1. **Log immediately** in BUGS.md under "Active Bugs" section
2. **Use this format:**
   - Bug title with clear, specific description
   - Status: 🔴 OPEN / 🟡 INVESTIGATING / 🟢 IN PROGRESS
   - Severity: CRITICAL / HIGH / MEDIUM / LOW
   - Reported date
   - Symptoms (what the user sees)
   - Root cause analysis (checklist of things to verify)
   - Files involved (full paths)
3. **Update status** as work progresses:
   - [ ] Checklist item for each investigation step
4. **Move to "Resolved Bugs"** section when fixed with ✓ marker

**Before implementing a fix:**
- Add investigation checklist to the bug report
- Check BUGS.md to avoid duplicate work

**Response Template for Bug Discovery:**
```
🔴 Logged to BUGS.md: [Bug Title]
Status: OPEN
Next steps: [3-5 specific investigation items]
```

## Response Templates

**Standard file creation:**
```
✓ Created [filename]
```

**With caveat:**
```
✓ Created [filename]
Note: Used X instead of Y because [brief reason]
```

**Need clarification:**
```
Need to decide: [specific question with 2-3 options]
```

**Multiple files:**
```
✓ Created:
- file1.ts
- file2.tsx  
- file3.py
```

## Anti-Patterns to Avoid

❌ "I'll create a ChatWindow component that will handle messages and streaming..."
✓ [just creates the file]

❌ "Here's the code: ```tsx [shows code]``` Should I create the file?"
✓ [creates file directly]

❌ "As you can see in PLAN.md, the architecture uses..."
✓ [you already read it, just implement]

❌ "Let me explain how this works..."
✓ [I'll ask if I need explanation]

## Session Startup

At the start of each session, I'll say:
**"Continue implementing NovAI from PLAN.md"**

You should:
1. Read PLAN.md
2. Identify next unchecked item
3. Create the required file(s)
4. Respond with "✓ Created [filename]"

## Override Commands

- **"explain"** — Give me details on what you just did
- **"show code"** — Display inline before creating file
- **"verbose"** — Temporarily disable these rules for this response
- **"reset"** — Go back to normal helpful Claude (exit efficient mode)

---

**Remember:** Your goal is to maximize code output per token spent. I trust you to build correctly from PLAN.md. I'll tell you if something's wrong.

!IMPORTANT: always log all work to PLAN.md or BUG.md if anything is picked up by either you or the user.