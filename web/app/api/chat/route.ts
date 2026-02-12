import { NextRequest } from "next/server";
import { buildSystemPrompt, buildContextSection } from "@/lib/prompts";
import { getDb } from "@/lib/db";
import { v4 as uuid } from "uuid";
import type { WritingParameters } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || "http://agent:8000";

export async function POST(request: NextRequest) {
  try {
    const { projectId, message, contextFiles = [] } = await request.json();

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
