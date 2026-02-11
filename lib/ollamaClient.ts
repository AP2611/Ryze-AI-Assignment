const DEFAULT_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:1.5b";
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434/api/chat";

export type OllamaMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function ollamaChat(
  messages: OllamaMessage[],
  options?: { model?: string }
): Promise<string> {
  const model = options?.model || DEFAULT_MODEL;

  const res = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages,
      stream: false
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ollama error ${res.status}: ${text}`);
  }

  const json = (await res.json()) as {
    message?: { content?: string };
  };

  return json.message?.content ?? "";
}

