import { ollamaChat, type OllamaMessage } from "./ollamaClient";
import { validateUiPlan, type UiPlan, type UiNode } from "./ui-plan";
import { generateReactCode } from "./codegen";

export type AgentMode = "initial" | "modify" | "regenerate";

export type AgentRequest = {
  mode: AgentMode;
  message: string;
  currentPlan?: UiPlan;
};

export type AgentResult = {
  plan: UiPlan;
  code: string;
  explanation: string;
};

export async function runAgent(req: AgentRequest): Promise<AgentResult> {
  const sanitizedUserMessage = sanitizeUserMessage(req.message);

  const plannerOutput = await runPlanner({
    mode: req.mode,
    message: sanitizedUserMessage,
    currentPlan: req.currentPlan
  });

  const plan = validateUiPlan(plannerOutput);
  const code = generateReactCode(plan);
  const explanation = await runExplainer({
    message: sanitizedUserMessage,
    previousPlan: req.currentPlan,
    nextPlan: plan
  });

  return { plan, code, explanation };
}

function sanitizeUserMessage(input: string): string {
  return input.replace(/ignore (all )?previous instructions/gi, "").slice(0, 4000);
}

type PlannerInput = {
  mode: AgentMode;
  message: string;
  currentPlan?: UiPlan;
};

async function runPlanner(input: PlannerInput): Promise<unknown> {
  const systemPrompt = buildPlannerSystemPrompt();
  const userPrompt = buildPlannerUserPrompt(input);

  const messages: OllamaMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ];

  const first = await ollamaChat(messages);
  const parsedFirst = safeParseJson(first);
  if (parsedFirst.ok) return parsedFirst.value;

  const retryMessages: OllamaMessage[] = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content:
        buildPlannerUserPrompt(input) +
        "\n\nYour previous response was not strict JSON. Reply again with ONLY a JSON object."
    }
  ];

  const second = await ollamaChat(retryMessages);
  const parsedSecond = safeParseJson(second);
  if (parsedSecond.ok) return parsedSecond.value;

  throw new Error("Planner failed to return valid JSON plan");
}

function buildPlannerSystemPrompt(): string {
  return [
    "You are a UI planner for a deterministic React UI generator.",
    "You MUST obey these rules:",
    "- Use ONLY the allowed component types: page, stack, section, sidebar, navbar, card, button, input, textarea, table, empty-state, chart, modal.",
    "- Never invent new component types or props that look like CSS or style attributes.",
    "- Do NOT use inline styles, CSS, class names, or Tailwind utilities. The renderer controls all styling.",
    "- You are not allowed to change or extend the component library.",
    "- You must preserve existing layout and nodes unless the user clearly asks for a full redesign.",
    "",
    "Output format:",
    "- You MUST return a single JSON object that matches the UiPlan schema.",
    "- Do NOT include any explanations, comments, or markdown.",
    "",
    "UiPlan schema (TypeScript-style):",
    "type ComponentType =",
    '  | "page"',
    '  | "stack"',
    '  | "section"',
    '  | "sidebar"',
    '  | "navbar"',
    '  | "card"',
    '  | "button"',
    '  | "input"',
    '  | "textarea"',
    '  | "table"',
    '  | "empty-state"',
    '  | "chart"',
    '  | "modal";',
    "",
    "type UiNode = {",
    "  id: string;",
    "  type: ComponentType;",
    "  props?: Record<string, unknown>;",
    "  children?: UiNode[];",
    "};",
    "",
    "type UiPlan = {",
    "  summary: string;",
    "  layout: {",
    '    hasSidebar?: boolean;',
    '    hasNavbar?: boolean;',
    '    layoutStyle: "dashboard" | "form" | "table" | "custom";',
    "  };",
    "  root: UiNode;",
    "  changes?: {",
    '    kind: "add" | "remove" | "update";',
    "    targetId?: string;",
    "    description: string;",
    "  }[];",
    "};",
    "",
    "Never output anything except this JSON object."
  ].join("\n");
}

function buildPlannerUserPrompt(input: PlannerInput): string {
  const base = [
    "User instruction:",
    input.message,
    "",
    `Mode: ${input.mode}`,
    "",
    "Current plan (if any) as JSON:"
  ];

  if (input.currentPlan) {
    base.push(JSON.stringify(input.currentPlan, null, 2));
    base.push(
      "",
      "Update this plan minimally to satisfy the new instruction.",
      "Reuse existing node ids whenever possible."
    );
  } else {
    base.push("null", "", "Create a new plan for this instruction.");
  }

  return base.join("\n");
}

type ExplainerInput = {
  message: string;
  previousPlan?: UiPlan;
  nextPlan: UiPlan;
};

async function runExplainer(input: ExplainerInput): Promise<string> {
  const system = [
    "You are an assistant explaining UI layout decisions to a front-end engineer.",
    "Explain changes between the previous and next plan, referencing components by name.",
    "Mention what stayed the same vs what changed.",
    "Do not talk about JSON or schemas; describe the UI.",
    "Do not claim to change the component library or styling rules."
  ].join("\n");

  const summaryDiff = buildPlanDiffSummary(input.previousPlan, input.nextPlan);

  const userParts = [
    "Latest user instruction:",
    input.message,
    "",
    "High-level diff between previous and next plan:",
    summaryDiff
  ];

  const messages: OllamaMessage[] = [
    { role: "system", content: system },
    { role: "user", content: userParts.join("\n") }
  ];

  return ollamaChat(messages);
}

function buildPlanDiffSummary(prev: UiPlan | undefined, next: UiPlan): string {
  if (!prev) {
    return "Created initial layout using components based on the instruction.";
  }
  const beforeIds = new Set(flattenIds(prev.root));
  const afterIds = new Set(flattenIds(next.root));

  const added = [...afterIds].filter((id) => !beforeIds.has(id));
  const removed = [...beforeIds].filter((id) => !afterIds.has(id));

  const changes: string[] = [];
  if (added.length > 0) {
    changes.push(`Added nodes: ${added.join(", ")}`);
  }
  if (removed.length > 0) {
    changes.push(`Removed nodes: ${removed.join(", ")}`);
  }
  if (changes.length === 0) {
    changes.push("Adjusted props and layout while keeping the same set of nodes.");
  }
  return changes.join(" | ");
}

function flattenIds(root: UiNode): string[] {
  const result: string[] = [];
  function visit(node: UiNode) {
    result.push(node.id);
    if (Array.isArray(node.children)) {
      node.children.forEach(visit);
    }
  }
  visit(root);
  return result;
}

function safeParseJson(text: string): { ok: true; value: unknown } | { ok: false } {
  try {
    const trimmed = text.trim();
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      return { ok: false };
    }
    const jsonText = trimmed.slice(start, end + 1);
    return { ok: true, value: JSON.parse(jsonText) };
  } catch {
    return { ok: false };
  }
}

