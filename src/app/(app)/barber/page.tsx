"use client";
import { useRef, useState } from "react";
import { Scissors, Download, Trash2, Check } from "lucide-react";
import { toPng } from "html-to-image";
import { useStore } from "@/lib/store";
import { HAIRSTYLES } from "@/lib/knowledge";
import type { BarberBrief } from "@/lib/types";
import { saveImage } from "@/lib/images";
import { heDate, uid } from "@/lib/utils";
import { Button, Card, EmptyState, Field, Input, PageHeader, SectionTitle, Select, Textarea } from "@/components/ui";
import { ImageUploader } from "@/components/ImageUploader";
import { StoredImage, useImageUrl } from "@/components/StoredImage";

const FADES = ["בלי פייד", "טייפר עדין", "פייד נמוך", "פייד בינוני", "פייד גבוה", "סקין פייד"];

function BriefCard({ b, refEl }: { b: BarberBrief; refEl?: React.Ref<HTMLDivElement> }) {
  const url = useImageUrl(b.imageId);
  const rows: [string, string][] = [
    ["סוג שיער", b.hairType],
    ["אורך נוכחי", b.currentLength],
    ["אורך למעלה", b.topLength],
    ["צדדים", b.sideLength],
    ["פייד", b.fade],
    ["טקסטורה", b.texture],
    ["עיצוב", b.styling],
    ["תחזוקה", b.maintenance],
  ];
  return (
    <div ref={refEl} dir="rtl" className="w-[340px] rounded-[26px] bg-[#f5f9ff] p-5 text-[#172b4d]">
      <div className="flex items-center justify-between">
        <div className="text-[13px] font-extrabold" dir="ltr">GLOWUP <span className="text-[#2878f0]">AI</span></div>
        <div className="text-[11px] text-[#72829b]">כרטיס לספר · {heDate(b.createdAt.slice(0, 10))}</div>
      </div>
      <div className="mt-3 text-xl font-extrabold">{b.cutName}</div>
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="mt-3 aspect-[4/3] w-full rounded-2xl object-cover" />
      )}
      <div className="mt-3 space-y-1.5">
        {rows.filter(([, v]) => v).map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 rounded-xl bg-white px-3 py-2 text-[12px] shadow-sm">
            <span className="text-[#72829b]">{k}</span>
            <span className="text-end font-semibold">{v}</span>
          </div>
        ))}
      </div>
      {b.avoid && (
        <div className="mt-2 rounded-xl bg-white px-3 py-2 text-[12px] shadow-sm">
          <span className="font-bold text-[#174ea6]">לא לעשות: </span>
          {b.avoid}
        </div>
      )}
    </div>
  );
}

export default function BarberPage() {
  const briefs = useStore((s) => s.barberBriefs);
  const add = useStore((s) => s.addBarberBrief);
  const remove = useStore((s) => s.removeBarberBrief);
  const profileTexture = useStore((s) => s.analyses.find((a) => a.type === "hair")?.result?.texture as string | undefined);
  const [f, setF] = useState({ cutName: "", hairType: profileTexture ?? "", currentLength: "", topLength: "", sideLength: "", fade: FADES[0], texture: "", styling: "", avoid: "", maintenance: "כל 4-5 שבועות" });
  const [img, setImg] = useState<Blob | null>(null);
  const [current, setCurrent] = useState<BarberBrief | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  function fromGallery(id: string) {
    const h = HAIRSTYLES.find((x) => x.id === id);
    if (!h) return;
    setF((x) => ({ ...x, cutName: `${h.name} (${h.nameEn})`, texture: x.texture || "טקסטורה טבעית", styling: h.styling, maintenance: h.maintenance === "נמוכה" ? "כל 6-8 שבועות" : "כל 3-5 שבועות" }));
  }

  async function create() {
    const b: BarberBrief = { id: uid("bb"), createdAt: new Date().toISOString(), ...f, cutName: f.cutName.trim() || "תספורת", imageId: img ? await saveImage(img) : undefined };
    add(b);
    setCurrent(b);
    setImg(null);
  }

  async function exportPng() {
    if (!ref.current || !current) return;
    try {
      const dataUrl = await toPng(ref.current, { pixelRatio: 2, backgroundColor: "#f5f9ff" });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `barber-${current.id}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file] });
      else {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = file.name;
        a.click();
      }
      setMsg("הכרטיס מוכן");
    } catch {
      setMsg("הייצוא לא הצליח בדפדפן הזה");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Barber Brief" subtitle="כרטיס הוראות ברור לספר, וגלריה של תספורות רפרנס שלך." icon={<Scissors className="size-5" />} />
      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="space-y-3 lg:col-span-3">
          <SectionTitle>יצירת כרטיס</SectionTitle>
          <Field label="להתחיל מתספורת בגלריה (אופציונלי)">
            <Select id="bb-gallery" defaultValue="" onChange={(e) => fromGallery(e.target.value)}>
              <option value="">בחירה…</option>
              {HAIRSTYLES.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="שם התספורת"><Input id="bb-name" value={f.cutName} onChange={(e) => setF({ ...f, cutName: e.target.value })} maxLength={60} /></Field>
            <Field label="סוג שיער"><Input id="bb-type" value={f.hairType} onChange={(e) => setF({ ...f, hairType: e.target.value })} placeholder="חלק / גלי / מתולתל" maxLength={40} /></Field>
            <Field label="אורך נוכחי"><Input id="bb-cur" value={f.currentLength} onChange={(e) => setF({ ...f, currentLength: e.target.value })} placeholder="למשל: 6 ס״מ למעלה" maxLength={40} /></Field>
            <Field label="אורך למעלה"><Input id="bb-top" value={f.topLength} onChange={(e) => setF({ ...f, topLength: e.target.value })} placeholder="למשל: 4-5 ס״מ" maxLength={40} /></Field>
            <Field label="צדדים"><Input id="bb-side" value={f.sideLength} onChange={(e) => setF({ ...f, sideLength: e.target.value })} placeholder="למשל: מספר 2 עד 3" maxLength={40} /></Field>
            <Field label="פייד">
              <Select id="bb-fade" value={f.fade} onChange={(e) => setF({ ...f, fade: e.target.value })}>
                {FADES.map((x) => (<option key={x}>{x}</option>))}
              </Select>
            </Field>
            <Field label="טקסטורה"><Input id="bb-tex" value={f.texture} onChange={(e) => setF({ ...f, texture: e.target.value })} placeholder="למשל: point cutting למעלה" maxLength={60} /></Field>
            <Field label="תחזוקה"><Input id="bb-maint" value={f.maintenance} onChange={(e) => setF({ ...f, maintenance: e.target.value })} maxLength={40} /></Field>
          </div>
          <Field label="איך אני מעצב/ת"><Input id="bb-style" value={f.styling} onChange={(e) => setF({ ...f, styling: e.target.value })} maxLength={100} /></Field>
          <Field label="מה לא לעשות"><Textarea id="bb-avoid" value={f.avoid} onChange={(e) => setF({ ...f, avoid: e.target.value })} placeholder="למשל: לא לקצר את הפוני, לא קו חד מדי בעורף" className="min-h-16!" maxLength={200} /></Field>
          <div className="max-w-48"><ImageUploader value={img} onChange={setImg} hint="תמונת רפרנס (אופציונלי)" aspect="aspect-square" /></div>
          <Button className="w-full" size="lg" onClick={create}>יצירת הכרטיס</Button>
        </Card>
        <Card className="lg:col-span-2">
          <SectionTitle>הכרטיס</SectionTitle>
          {current ? (
            <div className="space-y-3">
              <div className="overflow-x-auto"><div className="mx-auto w-fit"><BriefCard b={current} refEl={ref} /></div></div>
              <Button className="w-full" icon={<Download className="size-4" />} onClick={exportPng}>הורדה / שיתוף</Button>
              {msg && <p className="flex items-center justify-center gap-1 text-sm text-muted"><Check className="size-4 text-green" /> {msg}</p>}
            </div>
          ) : (
            <p className="text-sm text-muted">מלאו את הפרטים וצרו כרטיס. אפשר להראות אותו לספר מהטלפון.</p>
          )}
        </Card>
      </div>
      <div>
        <SectionTitle>גלריית הרפרנסים שלי</SectionTitle>
        {briefs.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {briefs.map((b) => (
              <Card key={b.id} className="p-0">
                <button onClick={() => setCurrent(b)} className="block w-full text-start">
                  {b.imageId ? <StoredImage imageId={b.imageId} alt="" className="aspect-[4/3] w-full rounded-t-[22px]" /> : <div className="grid aspect-[4/3] place-items-center rounded-t-[22px] bg-accent-soft text-accent"><Scissors className="size-8" /></div>}
                  <div className="p-3">
                    <div className="font-semibold">{b.cutName}</div>
                    <div className="text-xs text-dim">{heDate(b.createdAt.slice(0, 10))} · {b.fade}</div>
                  </div>
                </button>
                <div className="flex justify-end px-2 pb-2">
                  <button onClick={() => remove(b.id)} className="grid size-9 place-items-center text-dim hover:text-danger" aria-label="מחיקה"><Trash2 className="size-4" /></button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState icon={<Scissors className="size-5" />} title="אין עדיין רפרנסים" text="כל כרטיס שתיצרו יישמר כאן." />
        )}
      </div>
    </div>
  );
}
