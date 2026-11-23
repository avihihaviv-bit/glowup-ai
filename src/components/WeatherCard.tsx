"use client";
import { useEffect, useState } from "react";
import { CloudSun, MapPin, RefreshCw } from "lucide-react";
import { useStore } from "@/lib/store";
import { forecast, geocode, type Weather } from "@/lib/weather";
import { Button, Card, Input } from "./ui";

export function useWeather() {
  const loc = useStore((s) => s.location);
  const [w, setW] = useState<Weather | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!loc) return;
    let alive = true;
    forecast(loc.lat, loc.lon)
      .then((x) => alive && (setW(x), setErr(null)))
      .catch((e) => alive && setErr((e as Error).message));
    return () => {
      alive = false;
    };
  }, [loc, n]);
  return { weather: loc ? w : null, error: err, refresh: () => setN((x) => x + 1), location: loc };
}

/** City picker + current conditions. Uses real data only; nothing is shown without a location. */
export function WeatherCard({ compact }: { compact?: boolean }) {
  const setLocation = useStore((s) => s.setLocation);
  const { weather, error, refresh, location } = useWeather();
  const [city, setCity] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const g = await geocode(city.trim());
      if (!g) setMsg("לא נמצאה עיר בשם הזה.");
      else setLocation(g);
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className={compact ? "p-4" : undefined}>
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-2 font-semibold">
          <CloudSun className="size-4 text-accent" /> מזג אוויר
        </span>
        {location && (
          <button onClick={refresh} className="grid size-9 place-items-center text-dim hover:text-fg" aria-label="רענון מזג אוויר">
            <RefreshCw className="size-4" />
          </button>
        )}
      </div>
      {location && weather ? (
        <div className="flex items-end justify-between">
          <div>
            <div className="text-3xl font-extrabold tabular-nums">{weather.temp}°</div>
            <div className="text-sm text-muted">
              {weather.label} · {weather.min}°-{weather.max}° · גשם {weather.rainChance}%
            </div>
          </div>
          <button onClick={() => setLocation(null)} className="flex items-center gap-1 text-xs text-dim hover:text-fg">
            <MapPin className="size-3" /> {location.name}
          </button>
        </div>
      ) : location && error ? (
        <p className="text-sm text-warn">{error}</p>
      ) : location ? (
        <p className="text-sm text-muted">טוען…</p>
      ) : (
        <div className="flex gap-2">
          <Input id="weather-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="עיר, למשל: תל אביב" aria-label="עיר" />
          <Button disabled={!city.trim()} loading={busy} onClick={save}>
            שמירה
          </Button>
        </div>
      )}
      {msg && <p className="mt-2 text-sm text-warn">{msg}</p>}
      <p className="mt-2 text-[11px] text-dim">נתונים מ-Open-Meteo.</p>
    </Card>
  );
}
