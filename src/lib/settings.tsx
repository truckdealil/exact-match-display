import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { audioService } from "@/services/audioService";

type Theme = "dark" | "light";

interface SettingsValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  soundEnabled: boolean;
  setSoundEnabled: (value: boolean) => void;
  volume: number;
  setVolume: (value: number) => void;
  online: boolean;
  hydrated: boolean;
}

const STORAGE_KEY = "luxe-settings";

const SettingsContext = createContext<SettingsValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const [volume, setVolumeState] = useState(0.6);
  const [online, setOnline] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<SettingsValue>;
        if (saved.theme === "light" || saved.theme === "dark") setThemeState(saved.theme);
        if (typeof saved.soundEnabled === "boolean") setSoundEnabledState(saved.soundEnabled);
        if (typeof saved.volume === "number") setVolumeState(saved.volume);
      }
    } catch {
      /* ignore */
    }
    setOnline(navigator.onLine);
    setHydrated(true);

    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    root.classList.toggle("light", theme === "light");
    root.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme, soundEnabled, volume }));
  }, [theme, soundEnabled, volume, hydrated]);

  useEffect(() => {
    audioService.setEnabled(soundEnabled);
    audioService.setVolume(volume);
  }, [soundEnabled, volume]);

  const setTheme = useCallback((next: Theme) => setThemeState(next), []);
  const toggleTheme = useCallback(() => setThemeState((t) => (t === "dark" ? "light" : "dark")), []);

  const value = useMemo<SettingsValue>(
    () => ({
      theme,
      setTheme,
      toggleTheme,
      soundEnabled,
      setSoundEnabled: setSoundEnabledState,
      volume,
      setVolume: setVolumeState,
      online,
      hydrated,
    }),
    [theme, setTheme, toggleTheme, soundEnabled, volume, online, hydrated],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}
