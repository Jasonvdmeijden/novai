"use client";

import ReactMarkdown from "react-markdown";

interface StreamingTextProps {
  content: string;
}

export function StreamingText({ content }: StreamingTextProps) {
  if (!content) return null;

  return (
    <div className="flex gap-3 p-4 justify-start">
      <div className="max-w-[80%] rounded-lg px-4 py-3 bg-muted">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown>{content}</ReactMarkdown>
          <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-0.5" />
        </div>
      </div>
    </div>
  );
}
