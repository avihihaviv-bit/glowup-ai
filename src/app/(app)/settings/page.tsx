"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Settings, Moon, Sun, Download, Upload, Trash2, ImageOff, ShieldCheck, Sparkles, FlaskConical, Check } from "lucide-react";
import { useStore } from "@/lib/store";
import { useAIStatus } from "@/lib/api";
import { saveImage, deleteImage } from "@/lib/images";
import { GOAL_LABELS } from "@/lib/plan";
import type { Gender, Goal } from "@/lib/types";
import { Badge, Button, Card, Chip, Field, Input, Modal, PageHeader, SectionTitle } from "@/components/ui";
import { Avatar } from "@/components/StoredImage";
import { ImageUploader } from "@/components/ImageUploader";

export default function SettingsPage() {
  const s = useStore();
  const profile = s.profile!;
  const ai = useAIStatus();
  const router = useRouter();
  const [name, setName] = useState(profile.name);
  const [age, setAge] = useState(profile.age);
  const [saved, setSaved] = useState(false);
  const [avatarModal, setAvatarModal] = useState(false);
  const [avatar, setAvatar] = useState<Blob | null>(null);
  const [confirm, setConfirm] = useState<null | "photos" | "all">(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function saveProfile() {
    s.updateProfile({ name: name.trim() || profile.name, age: Math.min(100, Math.max(10, age)) });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function exportData() {
    const { profile, plan, completions, customTasks, checkins, workouts, analyses, favorites, haircuts, products, photos, coach, manualFaceShape } = useStore.getState();
    const data = { version: 1, exportedAt: new Date().toISOString(), note: "התמונות עצמן לא נכללות בייצוא (נשמרות רק במכשיר).", profile, plan, completions, customTasks, checkins, workouts, analyses, favorites, haircuts, products, photos, coach, manualFaceShape };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `glowup-ai-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function importData(file?: File) {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data || typeof data !== "object" || !data.profile?.name) throw new Error();
      const keys = ["profile", "plan", "completions", "customTasks", "checkins", "workouts", "analyses", "favorites", "haircuts", "products", "photos", "coach", "manualFaceShape"] as const;
      const clean: Record<string, unknown> = {};
      for (const k of keys) if (k in data) clean[k] = data[k];
      s.importData(clean);
      setImportMsg("הנתונים יובאו בהצלחה ✓");
    } catch {
      setImportMsg("הקובץ אינו גיבוי תקין של GLOWUP AI.");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="הגדרות ופרטיות" icon={<Settings className="size-5" />} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-4">
          <SectionTitle>פרופיל</SectionTitle>
          <div className="flex items-center gap-4">
            <Avatar imageId={profile.avatarImageId} name={profile.name} size={64} />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => setAvatarModal(true)}>
                החלפת תמונה
              </Button>
              {profile.avatarImageId && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    deleteImage(profile.avatarImageId);
                    s.updateProfile({ avatarImageId: undefined });
                  }}
                >
                  הסרה
                </Button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="שם">
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
            </Field>
            <Field label="גיל">
              <Input type="number" min={10} max={100} value={age} onChange={(e) => setAge(Number(e.target.value))} />
            </Field>
          </div>
          <Field label="מגדר (להתאמת שיער וסטייל)">
            <div className="flex flex-wrap gap-2">
              {([
                ["male", "גבר"],
                ["female", "אישה"],
                ["other", "אחר"],
                ["", "לא צוין"],
              ] as [Gender, string][]).map(([v, l]) => (
                <Chip key={l} active={profile.gender === v} onClick={() => s.updateProfile({ gender: v })}>
                  {l}
                </Chip>
              ))}
            </div>
          </Field>
          <Field label="מטרות">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(GOAL_LABELS) as Goal[]).map((g) => (
                <Chip
                  key={g}
                  active={profile.goals.includes(g)}
                  onClick={() => s.updateProfile({ goals: profile.goals.includes(g) ? profile.goals.filter((x) => x !== g) : [...profile.goals, g] })}
                >
                  {GOAL_LABELS[g]}
                </Chip>
              ))}
            </div>
          </Field>
          <Field label={`זמן יומי: ${profile.minutesPerDay} דק׳`} hint="שינוי יחול על תוכנית חדשה">
            <input type="range" min={10} max={90} step={5} value={profile.minutesPerDay} onChange={(e) => s.updateProfile({ minutesPerDay: Number(e.target.value) })} className="w-full" />
          </Field>
          <Button onClick={saveProfile} icon={saved ? <Check className="size-4" /> : undefined}>
            {saved ? "נשמר" : "שמירת שינויים"}
          </Button>
        </Card>

        <div className="space-y-4">
          <Card>
            <SectionTitle>תצוגה</SectionTitle>
            <div className="flex gap-2">
              <Chip active={s.theme === "dark"} onClick={() => s.setTheme("dark")}>
                <span className="flex items-center gap-1.5">
                  <Moon className="size-4" /> כהה
                </span>
              </Chip>
              <Chip active={s.theme === "light"} onClick={() => s.setTheme("light")}>
                <span className="flex items-center gap-1.5">
                  <Sun className="size-4" /> בהיר
                </span>
              </Chip>
            </div>
          </Card>

          <Card>
            <SectionTitle action={ai.loading ? null : ai.aiEnabled ? <Badge tone="green">מחובר</Badge> : <Badge tone="warn">מצב דמו</Badge>}>
              <span className="flex items-center gap-2">
                {ai.aiEnabled ? <Sparkles className="size-4 text-accent" /> : <FlaskConical className="size-4 text-warn" />} חיבור AI
              </span>
            </SectionTitle>
            {ai.aiEnabled ? (
              <p className="text-sm text-muted">
                ה-AI מחובר בשרת (מודל: <code dir="ltr">{ai.model}</code>). המפתח שמור בשרת בלבד ואינו נחשף לדפדפן.
              </p>
            ) : (
              <div className="space-y-2 text-sm text-muted">
                <p>האפליקציה פועלת במצב דמו: כל התכונות עובדות, אבל התוצאות מבוססות על מאגר ידע וכללים — לא על AI, ולא על ניתוח התמונה. כל תוצאה מסומנת בבירור.</p>
                <p>להפעלת AI אמיתי — הוסיפו לקובץ <code dir="ltr">.env.local</code> (או ב-Vercel → Environment Variables):</p>
                <pre dir="ltr" className="overflow-x-auto rounded-lg bg-surface-2 p-3 text-xs text-fg">ANTHROPIC_API_KEY=sk-ant-...</pre>
                <p>ואז הפעילו מחדש את השרת.</p>
              </div>
            )}
          </Card>

          <Card className="space-y-3">
            <SectionTitle>
              <span className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-green" /> פרטיות ונתונים
              </span>
            </SectionTitle>
            <ul className="space-y-1.5 text-sm text-muted">
              <li>• כל הנתונים והתמונות נשמרים רק בדפדפן במכשיר הזה.</li>
              <li>• תמונה נשלחת לשרת רק כשמריצים ניתוח AI, לצורך אותו ניתוח בלבד, ואינה נשמרת בשרת.</li>
              <li>• תמונות התקדמות לעולם לא נשלחות לשום מקום.</li>
              <li>• אין פרסום, אין שיתוף, אין מעקב.</li>
            </ul>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button variant="secondary" icon={<Download className="size-4" />} onClick={exportData}>
                ייצוא גיבוי (JSON)
              </Button>
              <Button variant="secondary" icon={<Upload className="size-4" />} onClick={() => fileRef.current?.click()}>
                ייבוא גיבוי
              </Button>
              <Button variant="danger" icon={<ImageOff className="size-4" />} onClick={() => setConfirm("photos")}>
                מחיקת כל התמונות
              </Button>
              <Button variant="danger" icon={<Trash2 className="size-4" />} onClick={() => setConfirm("all")}>
                מחיקת כל הנתונים
              </Button>
            </div>
            {importMsg && <p className="text-sm text-accent">{importMsg}</p>}
            <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => (importData(e.target.files?.[0]), (e.target.value = ""))} />
          </Card>
        </div>
      </div>

      <Modal open={avatarModal} onClose={() => setAvatarModal(false)} title="תמונת פרופיל">
        <div className="mx-auto max-w-60">
          <ImageUploader value={avatar} onChange={setAvatar} hint="תמונה ריבועית" aspect="aspect-square" />
        </div>
        <Button
          className="mt-4 w-full"
          disabled={!avatar}
          onClick={async () => {
            if (!avatar) return;
            if (profile.avatarImageId) await deleteImage(profile.avatarImageId);
            s.updateProfile({ avatarImageId: await saveImage(avatar) });
            setAvatar(null);
            setAvatarModal(false);
          }}
        >
          שמירה
        </Button>
      </Modal>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title={confirm === "all" ? "למחוק את כל הנתונים?" : "למחוק את כל התמונות?"}>
        <p className="text-sm text-muted">
          {confirm === "all"
            ? "הפרופיל, התוכנית, ההיסטוריה, השיחות וכל התמונות יימחקו לצמיתות מהמכשיר. לא ניתן לשחזר (אלא אם ייצאתם גיבוי)."
            : "כל התמונות (פרופיל, ניתוחים, תספורות והתקדמות) יימחקו לצמיתות. שאר הנתונים יישמרו."}
        </p>
        <div className="mt-5 flex gap-2">
          <Button
            variant="danger"
            className="flex-1"
            onClick={async () => {
              if (confirm === "all") {
                await s.resetAll();
                router.replace("/onboarding");
              } else {
                await s.deleteAllPhotos();
              }
              setConfirm(null);
            }}
          >
            כן, למחוק
          </Button>
          <Button variant="secondary" onClick={() => setConfirm(null)}>
            ביטול
          </Button>
        </div>
      </Modal>
    </div>
  );
}
