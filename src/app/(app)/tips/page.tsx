"use client";
import { useMemo, useState } from "react";
import { Library, Search, X, SlidersHorizontal } from "lucide-react";
import { DAILY_TIPS, EVIDENCE_LABEL, OUTING_TIPS, TIP_CATEGORY, type Evidence } from "@/data/tips";
import { useStore } from "@/lib/store";
import { Button, Card, EmptyState, Input, PageHeader, Segmented, Select } from "@/components/ui";
import { TipCard } from "@/components/TipCard";

type View = "all" | "favorites" | "done" | "hidden";
const PAGE = 24;

export default function TipsPage() {
  const favorites = useStore((s) => s.tipFavorites);
  const hidden = useStore((s) => s.tipHidden);
  const done = useStore((s) => s.tipDone);
  const [set, setSet] = useState<"daily" | "outing">("daily");
  const [view, setView] = useState<View>("all");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [time, setTime] = useState("any");
  const [diff, setDiff] = useState("any");
  const [imp, setImp] = useState("any");
  const [ev, setEv] = useState<"any" | Evidence>("any");
  const [prod, setProd] = useState("any");
  const [limit, setLimit] = useState(PAGE);
  const [showFilters, setShowFilters] = useState(false);

  const source = set === "daily" ? DAILY_TIPS : OUTING_TIPS;
  const cats = useMemo(() => [...new Set(source.map((t) => t.category))], [source]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return source.filter((t) => {
      if (view === "favorites" && !favorites.includes(t.id)) return false;
      if (view === "done" && !(done[t.id]?.length)) return false;
      if (view === "hidden" ? !hidden.includes(t.id) : hidden.includes(t.id)) return false;
      if (cat !== "all" && t.category !== cat) return false;
      if (time !== "any" && t.minutes > Number(time)) return false;
      if (diff !== "any" && t.difficulty !== diff) return false;
      if (imp !== "any" && t.importance !== imp) return false;
      if (ev !== "any" && t.evidence !== ev) return false;
      if (prod === "none" && t.products.length) return false;
      if (prod === "some" && !t.products.length) return false;
      if (needle && !`${t.title} ${t.description} ${t.subcategory} ${t.products.join(" ")}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [source, view, favorites, done, hidden, cat, time, diff, imp, ev, prod, q]);

  const reset = () => {
    setQ("");
    setCat("all");
    setTime("any");
    setDiff("any");
    setImp("any");
    setEv("any");
    setProd("any");
    setLimit(PAGE);
  };

  return (
    <div className="space-y-5">
      <PageHeader title="ספריית הטיפים" subtitle={`${DAILY_TIPS.length} טיפים יומיים ו-${OUTING_TIPS.length} טיפים ליציאה. כל טיפ מסומן לפי רמת הראיות, עם מקור כשיש טענה בריאותית.`} icon={<Library className="size-5" />} />
      <div className="flex flex-wrap gap-2">
        <Segmented<"daily" | "outing">
          value={set}
          onChange={(v) => {
            setSet(v);
            setCat("all");
            setLimit(PAGE);
          }}
          options={[
            { value: "daily", label: "יומיים" },
            { value: "outing", label: "ליציאה" },
          ]}
        />
        <Segmented<View>
          value={view}
          onChange={(v) => {
            setView(v);
            setLimit(PAGE);
          }}
          options={[
            { value: "all", label: "הכל" },
            { value: "favorites", label: `מועדפים (${favorites.length})` },
            { value: "done", label: "בוצעו" },
            { value: "hidden", label: "מוסתרים" },
          ]}
        />
      </div>

      <Card className="space-y-3 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-dim" />
          <Input id="tip-search" value={q} onChange={(e) => (setQ(e.target.value), setLimit(PAGE))} placeholder="חיפוש: קרם הגנה, תלתלים, נשימה…" className="ps-9" aria-label="חיפוש טיפים" />
        </div>
        <Button variant="secondary" size="sm" className="sm:hidden" icon={<SlidersHorizontal className="size-4" />} aria-expanded={showFilters} onClick={() => setShowFilters((x) => !x)}>
          {showFilters ? "הסתרת סינון" : "סינון"}
        </Button>
        <div className={`${showFilters ? "grid" : "hidden"} grid-cols-2 gap-2 sm:grid sm:grid-cols-3 lg:grid-cols-6`}>
          <Select aria-label="קטגוריה" value={cat} onChange={(e) => (setCat(e.target.value), setLimit(PAGE))}>
            <option value="all">כל הקטגוריות</option>
            {cats.map((c) => (
              <option key={c} value={c}>
                {TIP_CATEGORY[c] ?? c}
              </option>
            ))}
          </Select>
          <Select aria-label="זמן" value={time} onChange={(e) => setTime(e.target.value)}>
            <option value="any">כל משך</option>
            <option value="0">בלי זמן נוסף</option>
            <option value="2">עד 2 דק׳</option>
            <option value="5">עד 5 דק׳</option>
            <option value="15">עד 15 דק׳</option>
          </Select>
          <Select aria-label="קושי" value={diff} onChange={(e) => setDiff(e.target.value)}>
            <option value="any">כל קושי</option>
            <option value="easy">קל</option>
            <option value="medium">בינוני</option>
            <option value="hard">מאתגר</option>
          </Select>
          <Select aria-label="חשיבות" value={imp} onChange={(e) => setImp(e.target.value)}>
            <option value="any">כל חשיבות</option>
            <option value="high">גבוהה</option>
            <option value="medium">בינונית</option>
            <option value="low">נמוכה</option>
          </Select>
          <Select aria-label="רמת ראיות" value={ev} onChange={(e) => setEv(e.target.value as "any" | Evidence)}>
            <option value="any">כל רמת ראיות</option>
            {(Object.keys(EVIDENCE_LABEL) as Evidence[]).map((k) => (
              <option key={k} value={k}>
                {EVIDENCE_LABEL[k]}
              </option>
            ))}
          </Select>
          <Select aria-label="מוצרים" value={prod} onChange={(e) => setProd(e.target.value)}>
            <option value="any">עם או בלי מוצרים</option>
            <option value="none">בלי מוצרים</option>
            <option value="some">דורש מוצר</option>
          </Select>
        </div>
        <div className="flex items-center justify-between text-sm text-muted">
          <span>{list.length} טיפים</span>
          <Button variant="ghost" size="sm" icon={<X className="size-4" />} onClick={reset}>
            איפוס סינון
          </Button>
        </div>
      </Card>

      {list.length ? (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {list.slice(0, limit).map((t) => (
              <TipCard key={t.id} tip={t} />
            ))}
          </div>
          {limit < list.length && (
            <div className="flex justify-center">
              <Button variant="secondary" onClick={() => setLimit((l) => l + PAGE)}>
                עוד טיפים ({list.length - limit})
              </Button>
            </div>
          )}
        </>
      ) : (
        <EmptyState icon={<Library className="size-5" />} title="אין טיפים שמתאימים לסינון" text="נסו לשנות את החיפוש או לאפס את הסינון." />
      )}
    </div>
  );
}
