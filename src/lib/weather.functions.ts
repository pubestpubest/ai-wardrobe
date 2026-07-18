import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// ─── Fetch current weather ─────────────────────────────────────────────────────

const WeatherInputSchema = z.object({
  lat: z.number(),
  lon: z.number(),
});

export const getWeather = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => WeatherInputSchema.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) throw new Error("OPENWEATHER_API_KEY ไม่ได้ตั้งค่า");

    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${data.lat}&lon=${data.lon}&appid=${apiKey}&units=metric&lang=th`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OpenWeatherMap request failed: ${res.status}`);

    const json = await res.json();
    return {
      temp: Math.round(json?.main?.temp ?? 0),
      description: json.weather?.[0]?.description ?? "",
      code: json.weather?.[0]?.id ?? 0,
      city: json.name ?? "",
    };
  });
