import { z } from "zod";
import { ProviderError } from "./errors";

const cache = new WeakMap<z.ZodType, Record<string, unknown>>();

/** JSON Schema for a Zod schema (draft 2020-12, without $schema). */
export function jsonSchemaOf(schema: z.ZodType): Record<string, unknown> {
  let s = cache.get(schema);
  if (!s) {
    s = z.toJSONSchema(schema, { unrepresentable: "any" }) as Record<string, unknown>;
    delete s.$schema;
    cache.set(schema, s);
  }
  return s;
}

/** Instruction used when the provider can't enforce the schema natively. */
export function schemaInstruction(schema: z.ZodType) {
  return `\n\nOutput format: reply with ONE JSON object only (no markdown, no code fences, no text before or after) that validates against this JSON Schema:\n${JSON.stringify(jsonSchemaOf(schema))}`;
}

/** Extract and validate JSON from model text. Throws invalid_output with a short reason. */
export function parseJson<T extends z.ZodType>(schema: T, text: string): z.infer<T> {
  let raw = text.trim();
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) raw = fence[1].trim();
  if (!raw.startsWith("{") && !raw.startsWith("[")) {
    const a = raw.indexOf("{");
    const b = raw.lastIndexOf("}");
    if (a >= 0 && b > a) raw = raw.slice(a, b + 1);
  }
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new ProviderError("invalid_output", "response was not valid JSON", { detail: "json_parse" });
  }
  const r = schema.safeParse(data);
  if (!r.success) {
    const issues = r.error.issues.slice(0, 4).map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ");
    throw new ProviderError("invalid_output", "response did not match the schema", { detail: issues });
  }
  return r.data;
}
