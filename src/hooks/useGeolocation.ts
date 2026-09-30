import { useCallback, useState } from "react";

export interface GeoPoint {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export type GeoStatus = "idle" | "requesting" | "granted" | "denied" | "unsupported";

export function useGeolocation() {
  const [position, setPosition] = useState<GeoPoint | null>(null);
  const [status, setStatus] = useState<GeoStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unsupported");
      return;
    }
    setStatus("requesting");
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        });
        setStatus("granted");
      },
      (err) => {
        setStatus("denied");
        setError(err.message);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  }, []);

  return { position, status, error, request };
}
