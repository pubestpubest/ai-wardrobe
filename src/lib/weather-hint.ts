// Pure emoji + clothing hint mapping (OpenWeatherMap condition code + °C).
// Kept out of the component file so WeatherCard.tsx only exports a component
// (react-refresh/only-export-components).

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
