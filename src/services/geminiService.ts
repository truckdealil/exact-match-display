/**
 * Gemini engine placeholder — wired for Google AI Studio.
 * Set VITE_GEMINI_API_KEY to enable live answers; otherwise the assistant
 * responds with a clearly-labelled local demo reply.
 */

const API_KEY = import.meta.env["VITE_GEMINI_API_KEY"] as string | undefined;
const MODEL = "gemini-2.5-flash";

export const isGeminiConfigured = () => Boolean(API_KEY);

export interface ChatTurn {
  role: "user" | "model";
  text: string;
}

export async function* streamReply(history: ChatTurn[]): AsyncGenerator<string> {
  const prompt = history[history.length - 1]?.text ?? "";

  if (!API_KEY) {
    const demo = `מצב הדגמה: מפתח Gemini עדיין לא הוגדר.\n\nשאלת: "${prompt}"\nברגע שיוגדר VITE_GEMINI_API_KEY, התשובות יגיעו ישירות מ-Google AI Studio בזרימה חיה.`;
    for (const chunk of demo.split(" ")) {
      await new Promise((r) => setTimeout(r, 35));
      yield `${chunk} `;
    }
    return;
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:streamGenerateContent?alt=sse&key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: history.map((turn) => ({ role: turn.role, parts: [{ text: turn.text }] })),
      }),
    },
  );

  if (!response.ok || !response.body) throw new Error(`Gemini error ${response.status}`);

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
        const json = JSON.parse(payload) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
        if (text) yield text;
      } catch {
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
