import express from 'express';
import { spawn } from 'child_process';
import { Readable } from 'stream';

const app = express();
const PORT = process.env.PORT || 4000;

// Disable Node.js HTTP timeout for long-running agent tasks
app.use((req, res, next) => {
  res.setTimeout(0);
  next();
});

app.use(express.json());

/**
 * POST /chat
 * Stream chat via Claude CLI
 * Request: { message, system?, history? }
 * Response: SSE stream with { type: "text"/"done"/"error" }
 */
app.post('/chat', async (req, res) => {
  const { message, system, history, vault_path } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'message is required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Connection', 'keep-alive');

  try {
    // Build conversation with history for claude CLI
    let systemPrompt = system || '';

    // Add vault context to system prompt if provided
    if (vault_path) {
      systemPrompt = `${systemPrompt}\n\n[CONTEXT: You are working with a project in ${vault_path}. Reference files and context from this project as needed.]`;
    }

    // Build full conversation including history
    let prompt = '';

    if (systemPrompt) {
      prompt = `[SYSTEM PROMPT]\n${systemPrompt}\n\n`;
    }

    // Add conversation history
    if (history && history.length > 0) {
      prompt += '[CONVERSATION HISTORY]\n';
      for (const msg of history) {
        const role = msg.role === 'user' ? 'User' : 'Assistant';
        prompt += `${role}: ${msg.content}\n\n`;
      }
      prompt += '[NEW MESSAGE]\n';
    }

    prompt += `User: ${message}`;

    let accumulated = '';
    let fileWrites = [];

    // Helper: Execute file write via web API
    async function writeFile(filePath, content) {
      try {
        const response = await fetch('http://web:3000/api/vault', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: filePath, content }),
        });
        if (!response.ok) {
          console.error(`Failed to write ${filePath}: ${response.statusText}`);
        } else {
          console.log(`[FILE WRITTEN] ${filePath}`);
          fileWrites.push(filePath);
        }
      } catch (err) {
        console.error(`Error writing ${filePath}:`, err.message);
      }
    }

    // Spawn claude CLI in the vault directory with permissions disabled
    const claude = spawn('claude', ['chat', '--dangerously-skip-permissions'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
      cwd: vault_path || 'C:\\Users\\Jason\\Documents\\NovAI-Vault',
      env: {
        ...process.env,
        CLAUDE_ALLOW_ALL_TOOLS: '1',
        CLAUDE_DANGEROUS: '1',
      },
    });

    // Track if we've already sent approval
    let approvalSent = false;

    // Handle stdout (response) - also check for permission prompts
    claude.stdout.on('data', (data) => {
      const text = data.toString();
      console.log('[CLAUDE STDOUT]', text.substring(0, 100));

      // Only detect ACTUAL system permission prompts from Claude Code CLI (not conversational)
      // System prompts have strict patterns like [y/n] or (yes/no)
      // Conversational questions should go to the user for response
      if (!approvalSent && (/\[y\/n\]/i.test(text) || /\(y\/n\)/i.test(text) || /\(yes\/no\)/i.test(text) || /\[Y\/n\]/.test(text))) {
        approvalSent = true;
        const requestText = text.trim();

        console.log('');
        console.log('╔════════════════════════════════════════════════════════════╗');
        console.log('║              SYSTEM PERMISSION PROMPT DETECTED             ║');
        console.log('╠════════════════════════════════════════════════════════════╣');
        console.log('║ PROMPT: ' + requestText.substring(0, 55));
        console.log('╠════════════════════════════════════════════════════════════╣');
        console.log('║ AUTO-APPROVING with YES                                    ║');
        console.log('╚════════════════════════════════════════════════════════════╝');
        console.log('');

        // Auto-approve system prompts by sending yes
        claude.stdin.write('yes\n');
        return;
      }

      // All other output (including conversational permission requests) goes to user
      accumulated += text;
      res.write(`data: ${JSON.stringify({ type: 'text', content: text })}\n\n`);
    });

    // Handle stderr (errors from claude)
    let stderrOutput = '';
    claude.stderr.on('data', (data) => {
      const text = data.toString();
      stderrOutput += text;
      console.error('[CLAUDE STDERR]', text.substring(0, 100));

      // Also check stderr for ACTUAL system permission prompts - strict patterns only
      if (!approvalSent && (/\[y\/n\]/i.test(text) || /\(y\/n\)/i.test(text) || /\(yes\/no\)/i.test(text) || /\[Y\/n\]/.test(text))) {
        approvalSent = true;
        const requestText = text.trim();

        console.log('');
        console.log('╔════════════════════════════════════════════════════════════╗');
        console.log('║              SYSTEM PERMISSION PROMPT DETECTED (STDERR)    ║');
        console.log('╠════════════════════════════════════════════════════════════╣');
        console.log('║ PROMPT: ' + requestText.substring(0, 55));
        console.log('╠════════════════════════════════════════════════════════════╣');
        console.log('║ AUTO-APPROVING with YES                                    ║');
        console.log('╚════════════════════════════════════════════════════════════╝');
        console.log('');

        // Auto-approve system prompts by sending yes
        claude.stdin.write('yes\n');
      }
    });

    // Handle process exit - parse file writes and execute them
    claude.on('close', async (code) => {
      // Parse @write-file commands from accumulated output
      const fileWriteRegex = /@write-file:\s*([^\n]+)\n([\s\S]*?)(?=@write-file:|$)/g;
      let match;
      while ((match = fileWriteRegex.exec(accumulated)) !== null) {
        const filePath = match[1].trim();
        const content = match[2].trim();
        if (filePath && content) {
          await writeFile(filePath, content);
        }
      }

      if (code === 0) {
        res.write(`data: ${JSON.stringify({ type: 'done', content: accumulated })}\n\n`);
      } else {
        const errorMsg = stderrOutput || `Claude CLI exited with code ${code}`;
        res.write(`data: ${JSON.stringify({ type: 'error', error: errorMsg })}\n\n`);
      }
      res.end();
    });

    // Handle process errors
    claude.on('error', (error) => {
      const errorMsg = error instanceof Error ? error.message : String(error);
      res.write(`data: ${JSON.stringify({ type: 'error', error: errorMsg })}\n\n`);
      res.end();
    });

    // Send message to claude
    setTimeout(() => {
      claude.stdin.write(prompt);
      claude.stdin.end();
    }, 100);

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    res.write(`data: ${JSON.stringify({ type: 'error', error: errorMsg })}\n\n`);
    res.end();
  }
});

/**
 * POST /run-agent
 * Not implemented yet - would be for agent tasks with tools
 */
app.post('/run-agent', async (req, res) => {
  res.status(501).json({ error: 'Agent mode not yet implemented' });
});

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`NovAI Host Proxy listening on port ${PORT}`);
  console.log(`Using Claude CLI for authentication`);
});
