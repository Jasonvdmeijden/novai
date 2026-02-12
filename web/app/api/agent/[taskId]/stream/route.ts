import { NextRequest, NextResponse } from "next/server";

const AGENT_URL = process.env.AGENT_SERVICE_URL || "http://agent:8000";

function extractTaskId(req: NextRequest): string {
  // URL pattern: /api/agent/[taskId]/stream
  const segments = req.nextUrl.pathname.split("/");
  return segments[segments.length - 2] ?? "";
}

// GET /api/agent/[taskId]/stream — proxy SSE stream for a running task
export async function GET(req: NextRequest) {
  const taskId = extractTaskId(req);

  const res = await fetch(`${AGENT_URL}/tasks/${taskId}/stream`, {
    headers: { Accept: "text/event-stream" },
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: `Agent service returned ${res.status}` },
      { status: res.status }
    );
  }

  return new NextResponse(res.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}

// POST /api/agent/[taskId]/stream — cancel a running task
export async function POST(req: NextRequest) {
  const taskId = extractTaskId(req);

  const res = await fetch(`${AGENT_URL}/tasks/${taskId}/cancel`, {
    method: "POST",
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
