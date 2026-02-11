import { NextResponse } from "next/server";
import { runAgent, type AgentMode } from "@/lib/agent";
import { validateUiPlan } from "@/lib/ui-plan";

export const dynamic = "force-dynamic";

type IncomingBody = {
  mode?: AgentMode;
  message?: string;
  currentPlan?: unknown;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as IncomingBody;

    if (!body.message || !body.mode) {
      return NextResponse.json(
        { error: "Missing mode or message" },
        { status: 400 }
      );
    }

    const currentPlan = body.currentPlan ? validateUiPlan(body.currentPlan) : undefined;

    const result = await runAgent({
      mode: body.mode,
      message: body.message,
      currentPlan
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Agent error", error);
    return NextResponse.json(
      { error: "Agent failed to generate UI. See server logs for details." },
      { status: 500 }
    );
  }
}

