"use client";
/** Real weather from Open-Meteo (free, no API key). Fetched from the browser. */
export interface Weather {
  temp: number;
  max: number;
  min: number;
  rainChance: number;
  code: number;
  label: string;
  kind: "hot" | "mild" | "cold" | "rain";
}

export async function geocode(name: string): Promise<{ name: string; lat: number; lon: number } | null> {
  const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=he&format=json`);
  if (!r.ok) throw new Error("שירות המיקום לא זמין כרגע");
  const d = await r.json();
  const g = d?.results?.[0];
  return g ? { name: `${g.name}${g.country ? `, ${g.country}` : ""}`, lat: g.latitude, lon: g.longitude } : null;
}

const LABELS: [number[], string][] = [
  [[0], "בהיר"],
  [[1, 2], "מעונן חלקית"],
  [[3], "מעונן"],
  [[45, 48], "ערפל"],
  [[51, 53, 55, 56, 57], "טפטוף"],
  [[61, 63, 65, 66, 67, 80, 81, 82], "גשם"],
  [[71, 73, 75, 77, 85, 86], "שלג"],
  [[95, 96, 99], "סופת רעמים"],
];

export async function forecast(lat: number, lon: number): Promise<Weather> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=1`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("שירות מזג האוויר לא זמין כרגע");
  const d = await r.json();
  const temp = Math.round(d.current.temperature_2m);
  const code = d.current.weather_code as number;
  const rainChance = d.daily.precipitation_probability_max?.[0] ?? 0;
  const label = LABELS.find(([codes]) => codes.includes(code))?.[1] ?? "";
  const kind = rainChance >= 50 || (code >= 51 && code <= 82) ? "rain" : temp >= 27 ? "hot" : temp <= 14 ? "cold" : "mild";
  return { temp, max: Math.round(d.daily.temperature_2m_max[0]), min: Math.round(d.daily.temperature_2m_min[0]), rainChance, code, label, kind };
}
