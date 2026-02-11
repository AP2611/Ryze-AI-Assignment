import type { UiPlan, UiNode } from "./ui-plan";

const HEADER_IMPORTS = [
  'import React from "react";',
  'import {',
  "  Page,",
  "  Stack,",
  "  Section,",
  "  Sidebar,",
  "  Navbar,",
  "  Card,",
  "  Button,",
  "  Input,",
  "  Textarea,",
  "  Table,",
  "  EmptyState,",
  "  Chart,",
  "  Modal",
  '} from "@/components/ui";'
].join("\n");

export function generateReactCode(plan: UiPlan): string {
  const lines: string[] = [];
  lines.push(HEADER_IMPORTS, "", "export function GeneratedUI() {", "  return (");
  renderNode(plan.root, lines, 4);
  lines.push("  );", "}", "");
  return lines.join("\n");
}

function renderNode(node: UiNode, lines: string[], indent: number): void {
  const spaces = " ".repeat(indent);
  const propsString = renderProps(node);

  switch (node.type) {
    case "page":
      lines.push(`${spaces}<Page${propsString}>`);
      renderChildren(node, lines, indent + 2);
      lines.push(`${spaces}</Page>`);
      break;
    case "stack":
      lines.push(`${spaces}<Stack${propsString}>`);
      renderChildren(node, lines, indent + 2);
      lines.push(`${spaces}</Stack>`);
      break;
    case "section":
      lines.push(`${spaces}<Section${propsString}>`);
      renderChildren(node, lines, indent + 2);
      lines.push(`${spaces}</Section>`);
      break;
    case "sidebar":
      lines.push(`${spaces}<Sidebar${propsString}>`);
      renderChildren(node, lines, indent + 2);
      lines.push(`${spaces}</Sidebar>`);
      break;
    case "navbar":
      lines.push(`${spaces}<Navbar${propsString} />`);
      break;
    case "card":
      lines.push(`${spaces}<Card${propsString}>`);
      renderChildren(node, lines, indent + 2);
      lines.push(`${spaces}</Card>`);
      break;
    case "button":
      lines.push(`${spaces}<Button${propsString} />`);
      break;
    case "input":
      lines.push(`${spaces}<Input${propsString} />`);
      break;
    case "textarea":
      lines.push(`${spaces}<Textarea${propsString} />`);
      break;
    case "table":
      lines.push(`${spaces}<Table${propsString} />`);
      break;
    case "empty-state":
      lines.push(`${spaces}<EmptyState${propsString} />`);
      break;
    case "chart":
      lines.push(`${spaces}<Chart${propsString} />`);
      break;
    case "modal":
      lines.push(`${spaces}<Modal${propsString} />`);
      break;
    default:
      lines.push(`${spaces}{/* Unsupported node type: ${node.type} */}`);
  }
}

function renderChildren(node: UiNode, lines: string[], indent: number) {
  if (!Array.isArray(node.children) || node.children.length === 0) return;
  node.children.forEach((child) => renderNode(child, lines, indent));
}

function renderProps(node: UiNode): string {
  const props = node.props ?? {};
  const entries = Object.entries(props).filter(([key, value]) => {
    if (value === undefined || value === null) return false;
    if (key === "id") return false;
    return true;
  });

  if (entries.length === 0) return "";

  const parts: string[] = [];
  for (const [key, value] of entries) {
    const safeKey = key;
    const rendered = renderPropValue(value);
    if (rendered !== null) {
      parts.push(`${safeKey}={${rendered}}`);
    }
  }

  if (parts.length === 0) return "";
  return " " + parts.join(" ");
}

function renderPropValue(value: unknown): string | null {
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    const inner = value.map((v) => renderPropValue(v) ?? "null").join(", ");
    return `[${inner}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${JSON.stringify(k)}: ${renderPropValue(v) ?? "null"}`);
    return `{ ${entries.join(", ")} }`;
  }
  return null;
}

