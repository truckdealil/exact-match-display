/**
 * Direct client-side Google AI Studio integration for Vercel deployment.
 * Connects directly to https://generativelanguage.googleapis.com
 * using import.meta.env.VITE_GEMINI_API_KEY.
 */

export interface ChatTurn {
  role: "user" | "model";
  text: string;
}

const MODEL = "gemini-2.5-flash";

export const VERCEL_MISSING_KEY_MESSAGE =
  "מפתח ה-API אינו מוגדר. יש להגדיר את משתנה הסביבה VITE_GEMINI_API_KEY ב-Environment Variables בלוח הבקרה של Vercel (Project Settings > Environment Variables) כדי להפעיל את העוזר.";

export function isGeminiConfigured(): boolean {
  const key = import.meta.env["VITE_GEMINI_API_KEY"] as string | undefined;
  return Boolean(key && key.trim().length > 0);
}

export async function* streamReply(history: ChatTurn[]): AsyncGenerator<string> {
  const apiKey = (import.meta.env["VITE_GEMINI_API_KEY"] as string | undefined)?.trim();

  // If VITE_GEMINI_API_KEY is not defined or empty, display clear Hebrew message explaining to set in Vercel
  if (!apiKey) {
    for (const word of VERCEL_MISSING_KEY_MESSAGE.split(" ")) {
      await new Promise((resolve) => setTimeout(resolve, 25));
      yield `${word} `;
    }
    return;
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: history.map((turn) => ({
          role: turn.role,
          parts: [{ text: turn.text }],
        })),
      }),
    });
  } catch {
    throw new Error("שגיאת רשת בעת הפנייה ל-Google AI Studio. בדוק את החיבור לרשת.");
  }

  if (!response.ok) {
    let errorMessage = `שגיאה (${response.status}) בפנייה ל-Google AI Studio.`;
    try {
      const errorJson = (await response.json()) as {
        error?: { message?: string; status?: string };
      };
      if (errorJson.error?.message) {
        if (response.status === 400 && errorJson.error.message.includes("API_KEY_INVALID")) {
          errorMessage =
            "מפתח ה-API שהוגדר ב-Vercel אינו תקין. אנא ודא את מפתח ה-API של Google AI Studio.";
        } else {
          errorMessage = `שגיאה מ-Google AI Studio: ${errorJson.error.message}`;
        }
      }
    } catch {
      /* ignore parsing error */
    }
    throw new Error(errorMessage);
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };

  const text =
    data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ??
    "לא התקבלה תשובה מ-Google AI Studio.";

  // Stream words smoothly for the chat UI
  const words = text.split(" ");
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    yield i === words.length - 1 ? word : `${word} `;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

export const QUICK_PROMPTS = [
  "סכם את הפעילות של היום",
  "אילו רשומות ממתינות לסנכרון?",
  "נסח עדכון סטטוס ללקוח",
  "הצע שיפור לתהליך התיעוד",
];
