export type ComponentType =
  | "page"
  | "stack"
  | "section"
  | "sidebar"
  | "navbar"
  | "card"
  | "button"
  | "input"
  | "textarea"
  | "table"
  | "empty-state"
  | "chart"
  | "modal";

export type UiNodeBase = {
  id: string;
  type: ComponentType;
  props?: Record<string, unknown>;
  children?: UiNode[];
};

export type UiNode = UiNodeBase;

export type UiPlanLayoutStyle = "dashboard" | "form" | "table" | "custom";

export type UiPlanChangeKind = "add" | "remove" | "update";

export type UiPlanChange = {
  kind: UiPlanChangeKind;
  targetId?: string;
  description: string;
};

export type UiPlan = {
  summary: string;
  layout: {
    hasSidebar?: boolean;
    hasNavbar?: boolean;
    layoutStyle: UiPlanLayoutStyle;
  };
  root: UiNode;
  changes?: UiPlanChange[];
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateUiPlan(raw: unknown): UiPlan {
  if (!isRecord(raw)) {
    throw new Error("UiPlan must be an object");
  }

  const summary = typeof raw.summary === "string" ? raw.summary : "";
  if (!isRecord(raw.layout)) {
    throw new Error("UiPlan.layout must be an object");
  }

  const layoutStyle = raw.layout.layoutStyle;
  if (
    layoutStyle !== "dashboard" &&
    layoutStyle !== "form" &&
    layoutStyle !== "table" &&
    layoutStyle !== "custom"
  ) {
    throw new Error("UiPlan.layout.layoutStyle must be one of dashboard|form|table|custom");
  }

  const hasSidebar =
    typeof raw.layout.hasSidebar === "boolean" ? raw.layout.hasSidebar : undefined;
  const hasNavbar = typeof raw.layout.hasNavbar === "boolean" ? raw.layout.hasNavbar : undefined;

  const root = validateUiNode(raw.root, "root");

  const changes: UiPlanChange[] | undefined = Array.isArray(raw.changes)
    ? raw.changes
        .map((c, index) => {
          if (!isRecord(c)) return null;
          const kind = c.kind;
          if (kind !== "add" && kind !== "remove" && kind !== "update") return null;
          if (typeof c.description !== "string" || !c.description.trim()) return null;
          const targetId = typeof c.targetId === "string" ? c.targetId : undefined;
          return { kind, targetId, description: c.description.trim() };
        })
        .filter((c): c is UiPlanChange => !!c)
    : undefined;

  return {
    summary,
    layout: {
      layoutStyle,
      hasSidebar,
      hasNavbar
    },
    root,
    changes
  };
}

export function validateUiNode(raw: unknown, path: string): UiNode {
  if (!isRecord(raw)) {
    throw new Error(`UiNode at ${path} must be an object`);
  }

  if (typeof raw.id !== "string" || !raw.id.trim()) {
    throw new Error(`UiNode at ${path} is missing a valid id`);
  }

  const id = raw.id.trim();
  const type = raw.type;

  if (
    type !== "page" &&
    type !== "stack" &&
    type !== "section" &&
    type !== "sidebar" &&
    type !== "navbar" &&
    type !== "card" &&
    type !== "button" &&
    type !== "input" &&
    type !== "textarea" &&
    type !== "table" &&
    type !== "empty-state" &&
    type !== "chart" &&
    type !== "modal"
  ) {
    throw new Error(`UiNode at ${path} has unsupported type "${String(type)}"`);
  }

  const props = isRecord(raw.props) ? raw.props : {};

  let children: UiNode[] | undefined;
  if (Array.isArray(raw.children)) {
    children = raw.children.map((child, index) =>
      validateUiNode(child, `${path}.children[${index}]`)
    );
  }

  return {
    id,
    type,
    props,
    children
  };
}

export function flattenNodes(root: UiNode): UiNode[] {
  const result: UiNode[] = [];
  function visit(node: UiNode) {
    result.push(node);
    if (Array.isArray(node.children)) {
      node.children.forEach(visit);
    }
  }
  visit(root);
  return result;
}

