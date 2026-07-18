import { useWeather } from "@/hooks/use-weather";
import { weatherHint } from "@/lib/weather-hint";

export function WeatherCard() {
  const { weather, isLoading } = useWeather();

  if (isLoading) {
    return (
      <div className="pastel-card bg-sky text-sky-foreground mb-4">
        <p className="text-xs opacity-80">กำลังโหลดสภาพอากาศ...</p>
      </div>
    );
  }

  if (!weather) return null;

  const { emoji, hint } = weatherHint(weather.code, weather.temp);

  return (
    <div className="pastel-card bg-sky text-sky-foreground mb-4">
      <div className="flex items-center gap-3">
        <span className="text-3xl">{emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold leading-none">{weather.temp}°C</span>
            <span className="text-xs opacity-80 truncate">
              {weather.description} · {weather.city}
            </span>
          </div>
          <p className="text-xs mt-1.5 opacity-90">{hint}</p>
        </div>
      </div>
    </div>
  );
}
