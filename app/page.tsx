"use client";

import { useState } from "react";
import type { UiPlan } from "@/lib/ui-plan";
import { RenderPlan } from "@/lib/render-ui";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

type VersionSnapshot = {
  id: string;
  createdAt: string;
  label: string;
  plan: UiPlan;
  code: string;
  explanation: string;
};

type AgentMode = "initial" | "modify" | "regenerate";

export default function HomePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [currentPlan, setCurrentPlan] = useState<UiPlan | null>(null);
  const [code, setCode] = useState<string>("");
  const [codeDirty, setCodeDirty] = useState(false);
  const [versions, setVersions] = useState<VersionSnapshot[]>([]);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string>("Idle");
  const [error, setError] = useState<string | null>(null);

  const canSend = input.trim().length > 0 && !isLoading;

  async function callAgent(mode: AgentMode) {
    if (!input.trim()) return;
    setIsLoading(true);
    setError(null);
    setStatus("Planning → Generating → Explaining");

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim()
    };

    setMessages((prev) => [...prev, userMessage]);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          mode,
          message: input.trim(),
          currentPlan
        })
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || `Request failed with status ${res.status}`);
      }

      const data = (await res.json()) as {
        plan: UiPlan;
        code: string;
        explanation: string;
      };

      setCurrentPlan(data.plan);
      setCode(data.code);
      setCodeDirty(false);

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.explanation
      };
      setMessages((prev) => [...prev, assistantMessage]);

      const snapshot: VersionSnapshot = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        label:
          versions.length === 0
            ? "Initial"
            : `v${versions.length + 1}`,
        plan: data.plan,
        code: data.code,
        explanation: data.explanation
      };
      setVersions((prev) => [...prev, snapshot]);
      setActiveVersionId(snapshot.id);
      setStatus("Latest run successful");
      setInput("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      setStatus("Agent error");
    } finally {
      setIsLoading(false);
    }
  }

  function handleGenerate() {
    const mode: AgentMode = currentPlan ? "modify" : "initial";
    void callAgent(mode);
  }

  function handleRegenerate() {
    if (!currentPlan || messages.length === 0) return;
    void callAgent("regenerate");
  }

  function handleRollback(versionId: string) {
    const target = versions.find((v) => v.id === versionId);
    if (!target) return;

    setCurrentPlan(target.plan);
    setCode(target.code);
    setCodeDirty(false);
    setActiveVersionId(target.id);

    const rollbackMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: `Rolled back to version: ${target.label}`
    };
    setMessages((prev) => [...prev, rollbackMessage]);
  }

  return (
    <>
      <aside className="app-sidebar">
        <div className="app-sidebar-header">
          <div>
            <div className="app-sidebar-title">Deterministic UI Agent</div>
            <div className="app-sidebar-subtitle">
              Describe UIs in natural language. Get stable code and preview.
            </div>
          </div>
        </div>
        <div className="app-sidebar-chat">
          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="chat-message">
                <div className="chat-message-role">Assistant</div>
                <div className="chat-message-content">
                  Start by describing a UI, for example:
                  {"\n\n"}
                  “A minimal analytics dashboard with a navbar, sidebar, metrics cards, and a users
                  table.”
                </div>
              </div>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={
                  "chat-message" + (m.role === "user" ? " chat-message-user" : "")
                }
              >
                <div className="chat-message-role">
                  {m.role === "user" ? "You" : "Agent"}
                </div>
                <div className="chat-message-content">{m.content}</div>
              </div>
            ))}
          </div>
          <div className="chat-input-container">
            <textarea
              className="chat-textarea"
              placeholder="Describe the UI you want to build..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <div className="chat-actions">
              <div className="chat-primary-actions">
                <button
                  className="btn btn-sm"
                  disabled={!canSend}
                  onClick={handleGenerate}
                >
                  {currentPlan ? "Modify UI" : "Generate UI"}
                </button>
                <button
                  className="btn btn-sm btn-secondary"
                  disabled={!currentPlan || isLoading}
                  onClick={handleRegenerate}
                >
                  Regenerate
                </button>
              </div>
              <div className="status-text">
                <span className="badge-status-pill">
                  <span
                    className={
                      "badge-dot " +
                      (isLoading
                        ? ""
                        : error
                        ? "badge-dot-warning"
                        : "badge-dot-idle")
                    }
                  />
                  {isLoading ? "Running agent..." : status}
                </span>
              </div>
            </div>
            {error && <div className="error-box">{error}</div>}
            <div className="text-xs text-muted">
              AI changes regenerate the code from the plan and may overwrite manual edits.
            </div>
          </div>
        </div>
      </aside>

      <main className="app-main">
        <header className="app-main-header">
          <div>
            <div className="app-main-title">Workspace</div>
            <div className="app-main-subtitle">
              Chat on the left, deterministic React code and live preview on the right.
            </div>
          </div>
          <div className="app-main-header-right">
            <div className="badge-pill monospace">
              Ollama model: {process.env.OLLAMA_MODEL || "qwen2.5:1.5b"}
            </div>
          </div>
        </header>

        <section className="app-main-body">
          <section className="panel">
            <header className="panel-header">
              <div>
                <div className="panel-title">Generated React Code</div>
                <div className="panel-subtitle">
                  Deterministic, component-library-only JSX. You can inspect and edit it.
                </div>
              </div>
              <div className="stack-horizontal gap-2">
                <button
                  className="btn btn-xs btn-ghost"
                  disabled={!currentPlan || !codeDirty}
                  onClick={() => {
                    if (!currentPlan) return;
                    setCode(generateReadonlyCode(currentPlan));
                    setCodeDirty(false);
                  }}
                >
                  Reset to agent version
                </button>
              </div>
            </header>
            <div className="panel-body">
              <textarea
                className="code-editor"
                spellCheck={false}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setCodeDirty(true);
                }}
                placeholder="// Generated component will appear here after you run the agent."
              />
            </div>
          </section>

          <section className="panel">
            <header className="panel-header">
              <div>
                <div className="panel-title">Live Preview</div>
                <div className="panel-subtitle">
                  Rendered directly from the internal UI plan using the fixed component library.
                </div>
              </div>
              <div className="stack-vertical gap-1">
                <div className="versions-list">
                  {versions.map((v, idx) => (
                    <button
                      key={v.id}
                      className={
                        "version-pill" +
                        (v.id === activeVersionId ? " version-pill-active" : "")
                      }
                      onClick={() => handleRollback(v.id)}
                    >
                      {idx + 1}. {v.label}
                    </button>
                  ))}
                  {versions.length === 0 && (
                    <span className="text-xs text-muted">No versions yet</span>
                  )}
                </div>
                <div className="text-xs text-muted">
                  Select a version to roll back code and preview.
                </div>
              </div>
            </header>
            <div className="panel-body">
              <div className="preview-inner">
                {currentPlan ? (
                  <RenderPlan plan={currentPlan} />
                ) : (
                  <div className="preview-placeholder">
                    <div className="font-medium text-sm">No UI yet</div>
                    <div className="text-xs text-muted">
                      Describe a UI in the chat to generate your first layout.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </section>
      </main>
    </>
  );
}

function generateReadonlyCode(plan: UiPlan): string {
  // Lazy import via require to avoid circular deps in the browser bundle graph
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
  const { generateReactCode } = require("@/lib/codegen") as typeof import("@/lib/codegen");
  return generateReactCode(plan);
}

