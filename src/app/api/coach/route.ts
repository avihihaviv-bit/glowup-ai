import { z } from "zod";
import { aiEnabled, coachSystemPrompt } from "@/lib/ai/server";
import { getRouter } from "@/lib/ai/router";
import { errorMessage, errorResponse, noAI } from "@/lib/ai/http";
import { ProfileContext } from "@/lib/schemas";

export const maxDuration = 120;

const Body = z.object({
  profile: ProfileContext,
  context: z.string().max(4000).default(""),
  focus: z.string().max(3000).optional(),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(6000) }))
    .min(1)
    .max(40),
});

export async function POST(req: Request) {
  if (!aiEnabled()) return noAI();
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (err) {
    return errorResponse(err);
  }
  // Conversation must start with a user turn.
  const msgs = body.messages.slice(body.messages.findIndex((m) => m.role === "user"));

  try {
    // Router picks the provider; failover is possible until the first token arrives.
    const stream = await getRouter().streamText({
      task: "coach",
      system: coachSystemPrompt(body.profile, body.context, body.focus),
      messages: msgs,
      tier: "balanced",
      effort: "low",
      maxTokens: 8000,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const text of stream.chunks) controller.enqueue(encoder.encode(text));
          const final = await stream.done;
          if (final.refusal) controller.enqueue(encoder.encode("\n\n_לא אוכל לעזור בבקשה הזו. נסו לנסח אחרת._"));
        } catch (err) {
          controller.enqueue(encoder.encode(`\n\n_⚠️ ${await errorMessage(err)}_`));
        } finally {
          controller.close();
        }
      },
      cancel() {
        stream.abort();
      },
    });
    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-AI-Provider": stream.provider },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
