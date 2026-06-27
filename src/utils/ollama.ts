import { Message, PullStatus } from "../types";

/**
 * Splits assistant message content into reasoning (inside <think> tags) and actual response content.
 */
export function parseReasoningContent(text: string): { reasoning: string; content: string } {
  const thinkStart = text.indexOf("<think>");
  if (thinkStart === -1) {
    return { reasoning: "", content: text };
  }

  const thinkEnd = text.indexOf("</think>");
  if (thinkEnd === -1) {
    // Thought process started but not finished
    const reasoning = text.slice(thinkStart + 7);
    return { reasoning, content: "" };
  }

  const reasoning = text.slice(thinkStart + 7, thinkEnd);
  const content = text.slice(thinkEnd + 8);
  return { reasoning, content };
}

/**
 * Parses NDJSON chunks from a streaming fetch reader.
 * Calls onChunk whenever a new chunk is received.
 */
export async function readOllamaStream(
  response: Response,
  onChunk: (json: any) => void,
  onComplete?: (stats: Partial<Message>) => void
): Promise<void> {
  if (!response.body) {
    throw new Error("No response body available for streaming");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");

      // Keep the last incomplete line in the buffer
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const json = JSON.parse(line);
          onChunk(json);

          // If the stream is finished, it returns stats
          if (json.done && onComplete) {
            onComplete({
              total_duration: json.total_duration,
              load_duration: json.load_duration,
              prompt_eval_count: json.prompt_eval_count,
              prompt_eval_duration: json.prompt_eval_duration,
              eval_count: json.eval_count,
              eval_duration: json.eval_duration,
            });
          }
        } catch (e) {
          console.warn("Failed to parse NDJSON line:", line, e);
        }
      }
    }

    // Process any remaining buffer
    if (buffer.trim()) {
      try {
        const json = JSON.parse(buffer);
        onChunk(json);
      } catch (e) {
        console.warn("Failed to parse remaining NDJSON buffer:", buffer, e);
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Format bytes to a human-readable size
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

/**
 * Format duration from nanoseconds to human readable
 */
export function formatDuration(nanoseconds?: number): string {
  if (!nanoseconds) return "";
  const milliseconds = nanoseconds / 1_000_000;
  if (milliseconds < 1000) {
    return `${milliseconds.toFixed(0)}ms`;
  }
  const seconds = milliseconds / 1000;
  return `${seconds.toFixed(2)}s`;
}
