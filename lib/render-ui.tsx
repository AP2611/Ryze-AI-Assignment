import React from "react";
import type { UiPlan, UiNode } from "./ui-plan";
import {
  Page,
  Stack,
  Section,
  Sidebar,
  Navbar,
  Card,
  Button,
  Input,
  Textarea,
  Table,
  EmptyState,
  Chart,
  Modal
} from "@/components/ui";

export function RenderPlan({ plan }: { plan: UiPlan }) {
  return <>{renderNode(plan.root)}</>;
}

function renderNode(node: UiNode): React.ReactNode {
  const props = node.props ?? {};
  const children = Array.isArray(node.children) ? node.children.map(renderNode) : null;

  switch (node.type) {
    case "page":
      return <Page {...props}>{children}</Page>;
    case "stack":
      return <Stack {...props}>{children}</Stack>;
    case "section":
      return <Section {...props}>{children}</Section>;
    case "sidebar":
      return <Sidebar {...props}>{children}</Sidebar>;
    case "navbar":
      return <Navbar {...props} />;
    case "card":
      return <Card {...props}>{children}</Card>;
    case "button":
      return <Button {...props} />;
    case "input":
      return <Input {...props} />;
    case "textarea":
      return <Textarea {...props} />;
    case "table":
      return <Table {...props} />;
    case "empty-state":
      return <EmptyState {...props} />;
    case "chart":
      return <Chart {...props} />;
    case "modal":
      return <Modal {...props} />;
    default:
      return null;
  }
}

