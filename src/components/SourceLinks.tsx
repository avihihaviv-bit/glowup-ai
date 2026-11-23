import { ExternalLink } from "lucide-react";
import { SOURCES, TOPIC_SOURCES, type SourceKey } from "@/data/sources";

/** Lists verified sources for a topic (or explicit keys). Links open in a new tab. */
export function SourceLinks({ topic, keys }: { topic?: string; keys?: SourceKey[] }) {
  const list = keys ?? (topic ? TOPIC_SOURCES[topic] : []) ?? [];
  if (!list.length) return null;
  return (
    <div className="mt-4 border-t border-line pt-3">
      <div className="mb-1.5 text-xs font-medium text-dim">מקורות</div>
      <ul className="flex flex-wrap gap-1.5">
        {list.map((k) => {
          const s = SOURCES[k];
          return (
            <li key={k}>
              <a href={s.url} target="_blank" rel="noopener noreferrer" dir="ltr" className="inline-flex min-h-8 items-center gap-1 rounded-full border border-line bg-white px-2.5 text-[11px] text-muted hover:border-accent hover:text-accent">
                {s.org} · {s.title} <ExternalLink className="size-3" />
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
