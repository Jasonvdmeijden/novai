import { NextRequest } from "next/server";
import { buildSystemPrompt, buildContextSection } from "@/lib/prompts";
import { getDb } from "@/lib/db";
import { listVaultFiles } from "@/lib/vault";
import { v4 as uuid } from "uuid";
import type { WritingParameters, VaultFile } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Build vault tree string (max 2 levels deep)
function buildVaultTreeString(node: VaultFile, depth: number = 0, maxDepth: number = 2): string {
  const indent = "  ".repeat(depth);
  const lines: string[] = [];

  if (depth === 0) {
    // Root level - show all children
    if (node.children) {
      for (const child of node.children) {
        lines.push(buildVaultTreeString(child, 1, maxDepth));
      }
    }
  } else {
    // Non-root level
    const prefix = node.type === "directory" ? "📁 " : "📄 ";
    lines.push(`${indent}${prefix}${node.name}${node.type === "directory" ? "/" : ""}`);

    if (node.type === "directory" && node.children && depth < maxDepth) {
      for (const child of node.children) {
        lines.push(buildVaultTreeString(child, depth + 1, maxDepth));
      }
    }
  }

  return lines.join("\n");
}

// Get mode flavor instruction
function getModeFlavor(mode: string): string {
  const flavors: Record<string, string> = {
    review:
      "You are a critical reader. Identify pacing issues, plot holes, weak characterisation, and what is working well. Be honest and constructive.",
    editor:
      "You are a line editor. Focus on prose clarity, word choice, sentence rhythm, show-don't-tell, and consistency. Suggest specific rewrites.",
    creative:
      "You are a generative creative partner. Expand scenes with rich sensory detail, vivid dialogue, and atmosphere. Be expansive and imaginative.",
    structure:
      "You are a story architect. Focus on plot structure, story beats, chapter organisation, act breaks, and narrative momentum.",
    continuity:
      "You are a continuity editor. Cross-reference characters, timeline events, world rules, and facts. Flag any inconsistencies you find.",
    world: "You are a world-building specialist. Develop lore, geography, culture, history, and internal logic of the world in rich detail.",
  };
  return flavors[mode] || "";
}

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || "http://agent:8000";

export async function POST(request: NextRequest) {
  try {
    const { projectId, message, contextFiles = [], currentPath, mode = "chat", planMode = false } =
      await request.json();

    if (!message || !projectId) {
      return new Response(JSON.stringify({ error: "projectId and message required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const db = getDb();

    // Get writing parameters
    const params = db
      .prepare("SELECT * FROM writing_parameters WHERE project_id = ?")
      .get(projectId) as WritingParameters | undefined;

    // Get recent chat history
    const history = db
      .prepare(
        "SELECT role, content FROM chat_messages WHERE project_id = ? ORDER BY created_at DESC LIMIT 20"
      )
      .all(projectId) as Array<{ role: string; content: string }>;
    history.reverse();
    console.log(`[CHAT] Project ${projectId}: Found ${history.length} previous messages`);

    // Build system prompt
    let systemPrompt = buildSystemPrompt(params || null);

    // Add vault tree
    try {
      const vaultTree = listVaultFiles();
      if (vaultTree.length > 0) {
        // Create a root node wrapper
        const rootNode: VaultFile = {
          path: "/",
          name: "vault",
          type: "directory",
          children: vaultTree,
        };
        const treeString = buildVaultTreeString(rootNode);
        systemPrompt += `\n\n## Vault Structure\nUse this to determine where new files should be created:\n<vault_tree>\n${treeString}\n</vault_tree>`;
      }
    } catch (err) {
      console.error("Failed to build vault tree:", err);
    }

    // Add mode flavor if not default chat mode
    const modeFlavor = getModeFlavor(mode);
    if (modeFlavor) {
      systemPrompt += `\n\n[AI PERSONA: ${modeFlavor}]`;
    }

    // Add planning instruction if in plan mode
    if (planMode) {
      systemPrompt += `\n\nIMPORTANT: The user wants you to PLAN changes first. Do not write or modify any files yet. Analyse all relevant vault files, list every file you plan to change, describe exactly what you will do in each, then end your response with exactly: READY_TO_APPLY`;
    }

    if (currentPath) {
      systemPrompt += `\n\n[CURRENTLY VIEWING: ${currentPath}]`;
    }
    if (contextFiles.length > 0) {
      systemPrompt += buildContextSection(contextFiles);
    }

    // Save user message
    const userMsgId = uuid();
    db.prepare(
      "INSERT INTO chat_messages (id, project_id, role, content, context_files) VALUES (?, ?, 'user', ?, ?)"
    ).run(userMsgId, projectId, message, JSON.stringify(contextFiles.map((f: { path: string }) => f.path)));

    // Proxy to agent service chat endpoint
    const encoder = new TextEncoder();
    let fullResponse = "";

    const readable = new ReadableStream({
      async start(controller) {
        try {
          const agentRes = await fetch(`${AGENT_SERVICE_URL}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message,
              system: systemPrompt,
              history: history,
              vault_path: process.env.VAULT_PATH || "/vault",
              current_path: currentPath,
            }),
          });

          if (!agentRes.ok) {
            throw new Error(`Agent service error: ${agentRes.statusText}`);
          }

          if (!agentRes.body) {
            throw new Error("No response body from agent service");
          }

          const reader = agentRes.body.getReader();
          const decoder = new TextDecoder();

          // Read SSE stream from agent service
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = JSON.parse(line.slice(6));

                if (data.type === "text") {
                  fullResponse += data.content;
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: "text", content: data.content })}\n\n`)
                  );
                } else if (data.type === "error") {
                  throw new Error(data.error);
                }
              }
            }
          }

          // Save assistant message
          const assistantMsgId = uuid();
          db.prepare(
            "INSERT INTO chat_messages (id, project_id, role, content) VALUES (?, ?, 'assistant', ?)"
          ).run(assistantMsgId, projectId, fullResponse);

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "done", messageId: assistantMsgId })}\n\n`
            )
          );
          controller.close();
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : "Stream error";
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", error: errMsg })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
