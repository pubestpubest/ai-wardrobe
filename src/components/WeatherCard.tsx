import { useWeather } from "@/hooks/use-weather";

// ─── Pure emoji + clothing hint mapping (OWM condition code + °C) ────────────

function tempHint(temp: number): string {
  if (temp <= 20) return "อากาศเย็น — พกเสื้อกันหนาว";
  if (temp >= 33) return "อากาศร้อน — เสื้อผ้าโปร่งสบาย";
  return "อากาศกำลังสบาย";
}

export function weatherHint(code: number, temp: number): { emoji: string; hint: string } {
  if (code >= 200 && code < 300) {
    return { emoji: "⛈", hint: "พายุฝนฟ้าคะนอง — เลี่ยงออกนอกบ้าน พกร่ม" };
  }
  if ((code >= 300 && code < 400) || (code >= 500 && code < 600)) {
    return { emoji: "🌧", hint: "ฝนตก — พกร่มไว้ดีกว่า" };
  }
  if (code >= 600 && code < 700) {
    return { emoji: "❄️", hint: "อากาศหนาวจัด — ใส่เสื้อกันหนาว" };
  }
  if (code >= 700 && code < 800) {
    return { emoji: "🌫", hint: "ทัศนวิสัยต่ำ — ระวังการเดินทาง" };
  }
  if (code === 800) {
    return {
      emoji: "☀️",
      hint: temp >= 32 ? "แดดแรง — ใส่เสื้อบางเบา พกแว่นกันแดด" : "อากาศแจ่มใส",
    };
  }
  if (code > 800 && code < 900) {
    return { emoji: "☁️", hint: tempHint(temp) };
  }
  return { emoji: "🌡️", hint: tempHint(temp) };
}

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
