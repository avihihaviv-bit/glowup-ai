import { z } from "zod";
import { aiEnabled, client, coachSystemPrompt, FALLBACK, MODEL } from "@/lib/ai/server";
import { errorMessage, errorResponse, noAI } from "@/lib/ai/http";
import { ProfileContext } from "@/lib/schemas";

export const maxDuration = 120;

const Body = z.object({
  profile: ProfileContext,
  context: z.string().max(4000).default(""),
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
    const stream = client().beta.messages.stream({
      model: MODEL,
      max_tokens: 8000,
      ...FALLBACK,
      output_config: { effort: "low" },
      system: coachSystemPrompt(body.profile, body.context),
      messages: msgs,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
          const final = await stream.finalMessage();
          if (final.stop_reason === "refusal") {
            controller.enqueue(encoder.encode("\n\n_לא אוכל לעזור בבקשה הזו. נסו לנסח אחרת._"));
          }
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
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
