/**
 * Gemini service — connects to the server-side API proxy.
 * Calls Google AI Studio via server-side @google/genai with model gemini-3.8-flash.
 */

export interface ChatTurn {
  role: "user" | "model";
  text: string;
}

let configuredCache: boolean | null = null;

export async function checkGeminiConfigured(): Promise<boolean> {
  if (configuredCache !== null) return configuredCache;
  try {
    const res = await fetch("/api/gemini/status");
    if (res.ok) {
      const data = (await res.json()) as { configured?: boolean };
      configuredCache = Boolean(data.configured);
      return configuredCache;
    }
  } catch {
    /* ignore network errors */
  }
  return true;
}

export const isGeminiConfigured = () => {
  if (configuredCache !== null) return configuredCache;
  return true;
};

export async function* streamReply(history: ChatTurn[]): AsyncGenerator<string> {
  const response = await fetch("/api/gemini/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ history }),
  });

  if (!response.ok) {
    let errorMsg = `שגיאה בחיבור ל-Gemini (${response.status})`;
    try {
      const errData = (await response.json()) as { error?: string };
      if (errData.error) errorMsg = errData.error;
    } catch {
      /* ignore non-json errors */
    }
    throw new Error(errorMsg);
  }

  if (!response.body) {
    throw new Error("לא התקבל זרם נתונים מהשרת");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const json = JSON.parse(payload) as { text?: string; error?: string };
        if (json.error) {
          throw new Error(json.error);
        }
        if (json.text) {
          yield json.text;
        }
      } catch (e) {
        if (e instanceof Error && e.message && !e.message.includes("JSON")) {
          throw e;
        }
        /* ignore partial frames */
      }
    }
  }
}

export const QUICK_PROMPTS = [
  "סכם את הפעילות של היום",
  "אילו רשומות ממתינות לסנכרון?",
  "נסח עדכון סטטוס ללקוח",
  "הצע שיפור לתהליך התיעוד",
];
