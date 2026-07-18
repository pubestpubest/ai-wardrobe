import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getWeather } from "@/lib/weather.functions";

const BANGKOK_FALLBACK = { lat: 13.75, lon: 100.5 };

export function useWeather() {
  const [coords, setCoords] = useState(BANGKOK_FALLBACK);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => setCoords(BANGKOK_FALLBACK),
      { timeout: 10000, maximumAge: 600000 },
    );
  }, []);

  const fetchFn = useServerFn(getWeather);

  const { data: weather, isLoading } = useQuery({
    queryKey: ["weather", coords.lat, coords.lon],
    queryFn: () => fetchFn({ data: coords }),
    staleTime: 600_000,
  });

  return { weather, isLoading };
}
