import { NextRequest, NextResponse } from "next/server";

const AGENT_URL = process.env.AGENT_SERVICE_URL || "http://agent:8000";

// POST /api/agent?type= — proxy a task submission to the agent service
// Returns the task_id so the client can connect to the SSE stream separately.
export async function POST(req: NextRequest) {
  const taskType = req.nextUrl.searchParams.get("type");
  if (!taskType) {
    return NextResponse.json({ error: "type query param required" }, { status: 400 });
  }

  const body = await req.text();

  const res = await fetch(`${AGENT_URL}/tasks/${taskType}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    // duplex required by some runtimes when sending a body
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: `Agent service error: ${text}` },
      { status: res.status }
    );
  }

  // The agent service streams SSE — return the first event which contains
  // the task_id, then the client reconnects via /api/agent/[taskId]/stream.
  // For simplicity we pass the full stream through here.
  return new NextResponse(res.body, {
    status: res.status,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}

// GET /api/agent?taskId= — proxy task status poll
export async function GET(req: NextRequest) {
  const taskId = req.nextUrl.searchParams.get("taskId");
  if (!taskId) {
    return NextResponse.json({ error: "taskId required" }, { status: 400 });
  }

  const res = await fetch(`${AGENT_URL}/tasks/${taskId}/status`);
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
