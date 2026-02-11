---
name: deterministic-ui-agent
overview: Design and implement a Next.js-based AI agent that uses a fixed, deterministic React component library and a multi-step Ollama-powered pipeline (planner, generator, explainer) to turn natural language UI intent into working UI code with live preview, iteration, and rollback.
todos:
  - id: scaffold-nextjs-app
    content: Scaffold a Next.js app (App Router) and basic layout with left chat and right code/preview panels.
    status: pending
  - id: implement-ui-library
    content: Implement the fixed, deterministic UI component library in components/ui with CSS and documented props.
    status: pending
  - id: define-plan-and-schema
    content: Define TypeScript types and JSON schema for UiNode and UiPlan, plus validation utilities and component whitelist.
    status: pending
  - id: implement-codegen
    content: Implement deterministic codegen from UiPlan to React code string using only whitelisted components.
    status: pending
  - id: wire-ollama-planner
    content: Implement planner step using Ollama via a Next.js API route with strict JSON output and validation.
    status: pending
  - id: wire-explainer
    content: Implement explainer step using Ollama with clear, user-friendly explanations of changes.
    status: pending
  - id: build-agent-endpoint
    content: Create a high-level /api/agent endpoint that orchestrates planner, generator, explainer, manages session state, and stores version history.
    status: pending
  - id: hook-frontend-interactions
    content: Connect chat UI, code editor, and live preview to the agent endpoint, including generate, modify, regenerate, and rollback actions.
    status: pending
  - id: add-safety-validation
    content: Implement component whitelist enforcement, prompt-injection protections, and robust error handling for invalid plans and rendering.
    status: pending
  - id: manual-testing
    content: Manually test common flows (initial create, iterative edits, rollback) to ensure deterministic behavior and clear explanations.
    status: pending
isProject: false
---

# Deterministic UI Agent with Ollama (Planner → Generator → Explainer)

## Architecture Overview
- **Stack**: Next.js full-stack app (App Router) with React frontend and API routes as the backend.
- **AI Backend**: Ollama running locally, using the `qwen2.5:1.5b` model via the HTTP API (`/api/chat`), wrapped in a small TypeScript client.
- **Core Abstractions**:
  - **Component library**: Fixed React components in `components/ui/` with stable CSS and props.
  - **UI plan model**: Strongly-typed JSON representation of the layout and components (`UiPlan` / `UiNode`).
  - **Agent steps**: Separate planner, generator, and explainer functions, each with its own prompt template and data contracts.
  - **Versioning**: In-memory version history per session, storing `plan`, `code`, and metadata for rollback.

```mermaid
flowchart LR
  user[User] --> chatUI[ChatPanel]
  chatUI --> apiAgent[NextAPI /api/agent]

  subgraph agentPipeline[Agent Pipeline]
    planner[Planner (LLM)] --> planJson[Structured UiPlan JSON]
    planJson --> validator[Plan Validator]
    validator --> generator[Generator (Codegen)]
    planJson --> explainer[Explainer (LLM)]
  end

  apiAgent --> planner
  generator --> codeStr[React Code String]
  codeStr --> frontendState[Editor State]
  frontendState --> livePreview[Live Preview Renderer]
  explainer --> explanation[Explanation Text]

  apiAgent --> versionStore[Version History]
  versionStore --> rollback[Rollback Endpoint]
```

## Fixed Component Library Design
- **Location**: `[components/ui/*]` files in the Next.js app (e.g. `[components/ui/Button.tsx]`).
- **Core components** (implemented once, never touched by the LLM):
  - **Layout**: `Page`, `Stack`, `Grid`, `Sidebar`, `Navbar`, `Section`, `Card`.
  - **Inputs**: `Input`, `Textarea`, `Select`, `Checkbox`, `Toggle`, `SearchField`.
  - **Actions**: `Button`, `IconButton`.
  - **Data display**: `Table`, `Tag`, `Badge`, `Avatar`, `EmptyState`.
  - **Overlays**: `Modal`, `Drawer`.
  - **Visualization**: `Chart` (with mocked data prop options, e.g. `type`, `title`, `series`).
- **Styling constraints**:
  - All visual design lives in CSS modules or a single `ui.css` imported from `_app`/layout; **no inline styles**, no tailwind utility generation at runtime, and no LLM involvement in CSS.
  - Each component exposes a limited, documented prop surface (e.g. `variant`, `size`, `tone`, `icon`, `layout` booleans).
  - The LLM only ever sees the **component API contract and usage examples**, never the CSS source.
- **Whitelist enforcement**:
  - Define a `ComponentType` enum and a JSON schema for `UiNode` where `type` must be one of the whitelisted values.
  - At runtime, validate all planner outputs against this schema; reject/repair any unknown `type` or disallowed props before codegen.

## Data Models & Types
- **UiNode** (tree representation of the UI):
  - `id`: stable node id for diffing.
  - `type`: one of the whitelisted component types (e.g. `"button"`, `"card"`, `"table"`, `"modal"`).
  - `props`: serializable props allowed for that type (e.g. `label`, `variant`, `placeholder`, `columns`, `rows`, `isOpen`).
  - `children`: nested `UiNode[]` or typed slots (e.g. `header`, `body`, `footer`).
- **UiPlan** (planner output):
  - `summary`: 1–2 sentence plain English description of the layout.
  - `layout`: top-level layout metadata (e.g. `hasSidebar`, `hasNavbar`, `layoutStyle: "dashboard" | "form" | ...`).
  - `root`: the `UiNode` tree representing the UI.
  - `changes`: on iterations, a list of high-level change descriptions (e.g. `{"kind":"add","targetId":"settingsModal","description":"Added settings modal triggered from navbar"}`).
- **Agent artifacts**:
  - `AgentStepResult`: `{ plan: UiPlan; code: string; explanation: string; }`.
  - `VersionSnapshot`: `{ id, timestamp, userPrompt, plan, code, explanation }` stored per session.
- **Session model**:
  - Use a simple `sessionId` in a cookie or URL param.
  - Maintain an in-memory map `sessionId → SessionState` (with plan, current code, versions) on the API layer.

## Agent Pipeline: Planner, Generator, Explainer

### Planner Step (LLM)
- **Endpoint**: `[app/api/agent/plan/route.ts]` (or an internal helper used by a single `/api/agent` endpoint).
- **Inputs**:
  - Latest user message (intent or modification request).
  - Current `UiPlan` (if it exists) and a truncated history of prior user messages.
- **Prompt structure** (hard-coded in a `plannerPrompt.ts`):
  - **System**: Describe the fixed component library, whitelist rules, no new components, no inline styles, incremental-edit requirement, and the JSON schema to output.
  - **Developer**: Instructions to favor minimal diffs: reuse existing nodes, only add/remove or tweak props when explicitly requested; never discard the entire tree unless the user asks for a full redesign.
  - **User**: The human’s natural language instructions and a summary of the current UI.
- **Output**:
  - A **strict JSON** object conforming to the `UiPlan` schema (no free-form prose).
- **Validation & safety**:
  - Parse JSON; if parsing fails, attempt one retry with a stricter “return JSON only” instruction.
  - Validate against the `UiPlan` schema and whitelist; if invalid, respond with a structured error to the frontend instead of rendering.

### Generator Step (Deterministic Codegen)
- **Nature**: Pure TypeScript function, **not** an LLM call, for maximum determinism and whitelist enforcement.
- **Implementation** (`[lib/codegen.ts]`):
  - Input: a validated `UiPlan` (particularly the `root` tree).
  - Output: a React code string for a single, canonical component such as `GeneratedUI(props) { ... }`.
  - Deterministic mapping: for each `UiNode.type` / `props`, emit JSX using the fixed UI components, e.g. `<Button variant="primary">Save</Button>`.
  - Imports: generate a fixed set of import statements at the top from `components/ui/*` (e.g. `import { Button, Card, Table, Modal } from "@/components/ui";`).
  - Layout patterns (dashboard, form page, table page) are derived from `UiPlan.layout` fields to keep structure consistent across runs.
- **Incremental behavior**:
  - Because the planner maintains and minimally mutates the `UiPlan` tree, the generator naturally preserves existing component usage and layout and only updates the parts of the code affected by changed nodes.
  - The codegen function should preserve a stable ordering of children and props for consistent diffs between versions.

### Explainer Step (LLM)
- **Endpoint/helper**: `[app/api/agent/explain/route.ts]` or an internal helper.
- **Inputs**:
  - User’s latest instruction.
  - Previous `UiPlan` and new `UiPlan`.
  - Optional: a diff summary computed in code (list of added/removed/changed nodes).
- **Prompt structure**:
  - **System**: Explain changes to a front-end engineer in clear language, referencing layout and components, and do not contradict the deterministic library rules.
  - **Developer**: Instructions to:
    - Reference particular components and sections (e.g. “Added a `Modal` called `Settings` opened by a `Button` in the `Navbar`).
    - Call out what was preserved (e.g. main table layout) vs what changed.
  - **User**: latest instruction and (if helpful) a short, human-friendly summary of the old vs new UI.
- **Output**:
  - Concise Markdown explanation used in the chat thread and shown alongside each version.

## Frontend UI: Claude-Style Workspace

### Layout & Panels
- **Route**: `[app/page.tsx]` serves a single-page workspace.
- **Structure**:
  - **Left panel**: Chat-style interface showing user messages, AI explanations, and agent step summaries.
  - **Right panel (top)**: Read/write code editor showing the latest generated React code string.
  - **Right panel (bottom)**: Live preview area rendering the UI described by the current `UiPlan`.
- **Implementation details**:
  - Use simple flex/grid layout defined in global CSS or a layout component; no inline styles.
  - Code editor can initially be a `textarea` with monospaced font and basic controls (copy, reset to last AI version).
  - Show agent step status: e.g. a small timeline “Planner ✓ → Generator ✓ → Explainer ✓” per message.

### Interactions & Controls
- **Generate UI**:
  - User types an initial description and hits **Generate**.
  - Frontend posts to `/api/agent` with `mode: "initial"`; server runs planner → validate → generator → explainer.
  - On success, update chat, code editor content, preview, and version history.
- **Modify existing UI via chat**:
  - User adds a follow-up like “Make this more minimal and add a settings modal.”
  - Frontend sends the new message along with the current `UiPlan`/version id.
  - Planner receives current plan, produces a minimally updated plan; generator and explainer run as usual.
- **Regenerate**:
  - Button to rerun planner+generator+explainer for the latest instruction (e.g. if an earlier step failed), using the current plan as base.
- **Rollback**:
  - A version list (e.g. on the right or in a small sidebar) showing snapshots.
  - Selecting a snapshot sets it as the current state (plan + code + preview) and annotates chat with a “Rolled back to version N” event.

### Live Preview Behavior
- **Source of truth**:
  - The canonical source of truth is **`UiPlan`**, not the raw code string.
  - Preview is rendered by a React component that directly traverses the `UiNode` tree and instantiates the corresponding UI components.
- **Code editing**:
  - The code editor is fully editable for the user (for inspection or experiments).
  - By default, AI-driven edits always regenerate from the `UiPlan`, which may overwrite manual code edits; clearly indicate this behavior in the UI (e.g. a small note near the editor).
  - Optional enhancement (if time allows): “Apply manual edits” button that tries to parse a subset of the code and update the plan, with clear error messaging when parsing fails.

## Safety, Validation, and Prompt-Engineering Protections
- **Component whitelist enforcement**:
  - Validate all planner outputs against the `UiPlan` JSON schema.
  - Fail fast on unknown component `type`, unknown props for a given type, or attempts to specify inline CSS-like props.
  - Generator only accepts a validated `UiPlan` and can’t emit arbitrary imports or component names.
- **Prompt injection defenses**:
  - System prompts for planner and explainer explicitly state that user instructions cannot change core rules (no new components, no CSS, no inline styles, no ignoring system messages).
  - Strip or ignore segments of user input that explicitly say things like “ignore previous instructions” in the LLM-facing prompts.
- **Error handling**:
  - On LLM JSON parse failure, show a clear error in the chat and allow retry.
  - On validation failure, show which node/prop violated rules.
  - On preview rendering errors, catch and display a non-breaking error message in the preview area.

## Integration with Ollama
- **Config**:
  - Create a small client in `[lib/ollamaClient.ts]` that wraps calls to `http://localhost:11434/api/chat`.
  - Read `OLLAMA_MODEL` from env, defaulting to `"qwen2.5:1.5b"`.
- **Usage**:
  - Planner and explainer helpers use this client with distinct system/developer prompts.
  - Optionally support streaming responses from Ollama if time allows, but initial version can be request/response.

## Testing & Validation Strategy
- **Unit-level**:
  - Tests for `codegen` to ensure stable, deterministic output given a `UiPlan`.
  - Tests for `validatePlan` to assert that invalid component types/props are rejected.
- **Manual flows**:
  - Initial layout creation for common patterns (dashboard, CRUD table, settings form).
  - Incremental edits like “tighten spacing”, “add a settings modal”, “move filters into sidebar” and verify minimal changes.
  - Rollback between multiple versions and confirm preview + code sync correctly.

