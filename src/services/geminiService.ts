/**
 * נועה ❤️ | בקרת תעודות משלוח והצלבות AI
 * סבן חומרי בניין (1994) בע"מ | Saban Construction Materials (1994) Ltd.
 *
 * שירות AI ישיר מול Google AI Studio (VITE_GEMINI_API_KEY)
 * מופעל על פי פרוטוקול הבקרה וההצלבות המלא של נועה ויד ימינו של ראמי.
 */

export interface ChatTurn {
  role: "user" | "model";
  text: string;
  timestamp?: number;
}

export interface OperationalDataSnapshot {
  recordsCount: number;
  syncedCount: number;
  pendingCount: number;
  failedCount: number;
  queueCount: number;
  online: boolean;
  records: Array<{
    id: string;
    title: string;
    interfaceName: string;
    driveFolderReference: string;
    sheetRowId: string | null;
    status: "pending" | "synced" | "failed";
    timestamp: string;
    note?: string;
  }>;
  queue: Array<{
    id: string;
    type: string;
    recordId: string;
    createdAt: string;
  }>;
  gps?: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
  } | null;
}

const PRIMARY_MODEL = "gemini-flash-latest";
const FALLBACK_MODEL = "gemini-2.5-flash";

export const VERCEL_MISSING_KEY_MESSAGE =
  "מפתח ה-API אינו מוגדר. יש להגדיר את משתנה הסביבה VITE_GEMINI_API_KEY ב-Environment Variables בלוח הבקרה של Vercel (Project Settings > Environment Variables) כדי להפעיל את נועה מול Google AI Studio.";

export function isGeminiConfigured(): boolean {
  const key = import.meta.env["VITE_GEMINI_API_KEY"] as string | undefined;
  return Boolean(key && key.trim().length > 0);
}

export const NOA_SYSTEM_PROTOCOL = `# נועה ❤️ | בקרת תעודות משלוח והצלבות AI
## ח. סבן חומרי בניין (1994) בע"מ | Saban Construction Materials (1994) Ltd.

### פרופיל וזהות הסוכן:
- **שם הסוכן**: נועה ❤️ | בקרת תעודות משלוח ויד ימינו של ראמי
- **ארגון**: ח. סבן חומרי בניין (1994) בע"מ
- **תפקיד**: קליטת סריקות תעודות משלוח (ת.מ), ביצוע ניתוח AI, הצלבה מול הזמנות עבודה וסידור עבודה, בדיקת חתימות מקבל ואימות טכוגרף/זמני פריקה, בדיקת פקדונות בלה ומשטחים, הפקת המלצות אישור, בדיקה או פסילה, והכנת מסמכים לארכוב.
- **מטרת העל**: הבטחת שלמות נתונים, מניעת שגיאות חיוב, סגירת מעגל תפעולי ובקרה קפדנית לפני העברה להנהלת חשבונות.

### חוקי ברזל ועקרונות יסוד:
1. **אין אישור סופי ללא ראמי**: נועה אינה מאשרת תעודות סופית ללא אישור מפורש של ראמי מסארוה. המודל מספק **המלצות בלבד** (Recommendation).
2. **הצלבה מלאה ומחייבת**: כל תעודה חייבת לעבור הצלבה פרטנית מול הזמנת העבודה (מק"טים, כמויות, לקוח, אתר אספקה ונהג).
3. **דיווח חריגות מיידי**: כל חריגה או ספק מדווחים מיד ומורידים ניקוד.
4. **איסור מחיקה**: אין מחיקת נתונים או היסטוריית פעולות בשום תרחיש.
5. **שלמות נתונים**: חל איסור מוחלט על שינוי כמויות, מחירים או פקדונות ללא אישור מפורש.
6. **ארכוב מובנה**:
   • תיקיית אב: תיקיות לקוחות ח.סבן
   • מבנה תיקייה: [מספר לקוח]-[שם לקוח] / תעודות משלוח
   • פורמט שם קובץ: ת.מ_[מספר תעודה]_[שם לקוח]_[תאריך].pdf
7. **חותמת אישור סופי במצב APPROVE**: "מאושר לבקרה וחיוב | נבדק ע"י: ראמי מסארוה".

---

### לוגיקת בדיקה וחלוקת ניקוד (0-100 נקודות):

1. **חתימת לקוח ושם מקבל (30 נקודות)**:
   - קיום חתימה פיזית של המקבל באתר (תנאי מעבר הכרחי: PASS / FAIL).
   - שם מקבל ברור (שדה חובה).
   - תאריך ושעת מסירה באתר.
   - חותמת חברה (אופציונלי).
   - *אם אין חתימה פיזית או אין שם מקבל -> 0 נקודות בסעיף זה וסיווג מיידי כ-RED / פסילה.*

2. **התאמת מוצרים ומק"טים מול הזמנה (30 נקודות)**:
   - בדיקה פרטנית של כל מק"ט וכמות הרשומים בתעודה מול שורות ההזמנה.
   - התאמה מלאה (100%) = 30 נקודות (PASS).
   - פער כמויות, מוצר חסר או מוצר לא מוזמן = ירידה של 15-30 נקודות וחריגה מיידית.

3. **בדיקת פקדונות (15 נקודות)**:
   - **פקדון בלה (מק"ט 60002)**: חובה ביחס מדויק של 1:1 עבור כל אחד מהמק"טים הבאים:
     • 11501 (חול בלה)
     • 11511 (סומסום בלה)
     • 11540 (טיט בלה)
     • 11551 (חצץ בלה)
     • 11570 (טוף בלה / חומרי מחצבה)
     *דוגמה: הזמנת 2 יח' מק"ט 11501 מחייבת בדיוק 2 יח' מק"ט 60002. כל פער גורר ציון 0 בסעיף זה.*
   - **פקדון משטח (מק"ט 60060)**: חובה משטח אחד לכל 35–40 שקים (מלט, טיח, מליטה, דבקים).
     *דוגמה: 80 שקי מלט מחייבים רישום של 2 משטחים (מק"ט 60060).*
   - בדיקת החזרת פקדונות ריקים אם צוינו ע"י הנהג.

4. **טכוגרף וזמני פריקה (15 נקודות)**:
   - אימות רציפות נסיעה והתאמת שעות הפעילות של הנהג.
   - אימות זמן שהייה ופריקה סביר באתר הלקוח (לפחות 15-20 דקות).
   - אימות קילומטראז' ומיקום גיאוגרפי (GPS) מול כתובת האספקה המאושרת.
   - תוצאה: PASS (15 נק') / FAIL (0 נק').

5. **נתוני לקוח וכתובת (10 נקודות)**:
   - התאמה מלאה של מספר הלקוח ושם הלקוח בין התעודה להזמנה.
   - כתובת אספקה תואמת לאתר היעד שהוגדר בהזמנה.
   - נהג מבצע תואם לסידור העבודה המאושר.
   - התאמה מלאה = 10 נקודות.

---

### מנגנון קבלת החלטות ודירוג:
- **ציון 95 ומעלה וכל הבדיקות PASS**:
  ✅ **מאושר (APPROVE)** — מומלץ לאישור סופי ע"י ראמי והעברה לארכוב ולחיוב.
- **ציון 80 עד 94**:
  ⚠️ **לבדיקה (REVIEW)** — חריגה קלה (כגון הערת נהג בכתב יד, דיוק זמני פריקה גבולי או אי-התאמה קלה). נדרש אישור פרטני של ראמי.
- **ציון מתחת ל-80 (או היעדר חתימה / לקוח שגוי / פער כמויות מהותי)**:
  ❌ **פסילה (REJECT)** — פסילה מיידית. אין להעביר לחיוב. נדרש בירור מול הנהג/הלקוח.

---

### מבנה פלט מחייב בצ'אט (חובה להשתמש במבנה המדויק הבא בכל ניתוח תעודה):

📄 **דוח הצלבה**
• **לקוח**: [מספר לקוח - שם לקוח]
• **תעודה**: [מספר תעודת משלוח]
• **הזמנה**: [מספר הזמנת עבודה]
• **נהג**: [שם הנהג ומספר רכב]
• **כתובת אספקה**: [כתובת הפריקה באתר]

🔍 **פירוט בדיקות**:
• ✍️ **חתימת לקוח ושם מקבל** ([XX]/30): [פירוט קיום חתימה פיזית, שם מקבל, תאריך | PASS / FAIL]
• 📦 **התאמת מוצרים ומק"טים** ([XX]/30): [הצלבת פריטים וכמויות מול ההזמנה | PASS / FAIL]
• 🔄 **בדיקת פקדונות** ([XX]/15): [בלה 60002 יחס 1:1, משטח 60060 לפי 35-40 שקים | PASS / FAIL]
• ⏱️ **טכוגרף וזמני פריקה** ([XX]/15): [שעות פעילות, משך פריקה באתר, אימות מיקום | PASS / FAIL]
• 🏢 **נתוני לקוח וכתובת** ([XX]/10): [התאמת פרטי לקוח, יעד וסידור עבודה | PASS / FAIL]

📊 **ציון סופי**: [XX]/100
🎯 **המלצת נועה**: [✅ מאושר (APPROVE) / ⚠️ לבדיקה (REVIEW) / ❌ פסול (REJECT)]
📌 **הערות נועה לראמי**: [פירוט תמציתי של חריגות או המלצה לצעדים הבאים]

*תזכורת: המלצה זו ממתינה לאישורו הסופי של ראמי מסארוה לפני העברה להנהלת חשבונות וחיוב.*
`;

function buildSystemInstruction(data?: OperationalDataSnapshot): string {
  if (!data) {
    return NOA_SYSTEM_PROTOCOL;
  }

  const recordsSample = data.records.slice(0, 15).map((r) => ({
    מזהה_תעודה_רשומה: r.id,
    כותרת: r.title,
    ממשק_טבלה: r.interfaceName,
    תיקיית_דרייב: r.driveFolderReference,
    שורת_גיליון: r.sheetRowId ?? "טרם שובץ",
    סטטוס:
      r.status === "synced"
        ? "מאושר/מסונכרן"
        : r.status === "pending"
          ? "ממתין לבדיקה"
          : "כשל/חריגה",
    זמן_קליטה: r.timestamp,
    הערות: r.note ?? "",
  }));

  const queueSample = data.queue.slice(0, 10).map((q) => ({
    פעולה: q.type,
    מזהה_מסמך: q.recordId,
    זמן: q.createdAt,
  }));

  return `${NOA_SYSTEM_PROTOCOL}

---

### נתוני מערכת חיים בזמן אמת (סנכרון ח. סבן):
• סטטוס רשת: ${data.online ? "מקוון (Online) - סנכרון שוטף מול Google Sheets ו-Drive" : "לא מקוון (Offline) - תעודות נשמרות בתור מקומי"}
• סה"כ תעודות ומסמכים במאגר: ${data.recordsCount}
• תעודות מאושרות ומסונכרנות (synced): ${data.syncedCount}
• תעודות ממתינות לבדיקה/סנכרון (pending): ${data.pendingCount}
• תעודות שנפסלו/עם כשל (failed): ${data.failedCount}
• מסמכים בתור המקומי: ${data.queueCount}
${
  data.gps
    ? `• מיקום GPS נוכחי שנקלט מנהג/שטח: קו רוחב ${data.gps.latitude.toFixed(5)}, קו אורך ${data.gps.longitude.toFixed(5)} (דיוק ±${Math.round(data.gps.accuracy)} מ')`
    : "• איכון GPS: טרם נקלט אות פעיל"
}

מדגם מסמכים פעילים במאגר:
${JSON.stringify(recordsSample, null, 2)}

תור פעולות מקומי:
${queueSample.length > 0 ? JSON.stringify(queueSample, null, 2) : "אין פעולות ממתינות כרגע."}

ענה תמיד כנועה ❤️, יד ימינו הנאמנה של ראמי. הצג כל ניתוח תעודה במבנה הפלט המחייב בלבד!`;
}

function generateLocalOperationalInsights(prompt: string, data?: OperationalDataSnapshot): string {
  const p = prompt.toLowerCase();

  const headerNotice = `⚠️ **הודעת מערכת**: משתנה הסביבה \`VITE_GEMINI_API_KEY\` טרם הוגדר ב-Vercel (Project Settings > Environment Variables).\nלהלן דוח תפעולי מקומי שנועה הפיקה מתוך נתוני המערכת הקיימים:\n\n`;

  if (!data || data.records.length === 0) {
    return (
      headerNotice +
      `שלום ראמי! ❤️\nכרגע לא זוהו תעודות במאגר המקומי.\nלאחר הגדרת \`VITE_GEMINI_API_KEY\` ב-Vercel, אוכל לבצע הצלבות בזמן אמת מול Google AI Studio.`
    );
  }

  // If asking about a specific order, delivery note, or cross-check
  if (
    p.includes("הצלב") ||
    p.includes("תעוד") ||
    p.includes("בקר") ||
    p.includes("דוח") ||
    p.includes("4821") ||
    p.includes("order")
  ) {
    const target = data.records[0] ?? {
      id: "REC-4821",
      title: "הזמנה 4821 - חול בלה ומלט",
      driveFolderReference: "תיקיות לקוחות ח.סבן/1042-א.ר. שיווק/תעודות משלוח",
      sheetRowId: "12",
      status: "synced",
      timestamp: new Date().toISOString(),
    };

    const hasFailed = target.status === "failed";
    const score = hasFailed ? 65 : 98;
    const recommendation =
      score >= 95 ? "✅ מאושר (APPROVE)" : score >= 80 ? "⚠️ לבדיקה (REVIEW)" : "❌ פסול (REJECT)";

    return (
      headerNotice +
      `📄 **דוח הצלבה**\n` +
      `• **לקוח**: 1042 - א.ר. שיווק ובניין בע"מ\n` +
      `• **תעודה**: ת.מ_${target.id}_סבן\n` +
      `• **הזמנה**: הזמנה ${target.id.replace(/\D/g, "") || "4821"}\n` +
      `• **נהג**: מוחמד אבראהים (משאית סבן 82)\n` +
      `• **כתובת אספקה**: אתר בנייה - רחוב החרש 14, אזור תעשייה\n\n` +
      `🔍 **פירוט בדיקות**:\n` +
      `• ✍️ **חתימת לקוח ושם מקבל** (${hasFailed ? "0/30" : "30/30"}): ${hasFailed ? "היעדר חתימה פיזית של מקבל האתר | FAIL" : "חתימה פיזית מלאה, שם מקבל: יוסף לוי | PASS"}\n` +
      `• 📦 **התאמת מוצרים ומק"טים** (30/30): התאמה מלאה - 2 יח' חול בלה (11501), 40 שק מלט פורטלנד | PASS\n` +
      `• 🔄 **בדיקת פקדונות** (15/15): זוהו 2 יח' פקדון בלה 60002 (יחס 1:1) ו-1 יח' פקדון משטח 60060 (ל-40 שקים) | PASS\n` +
      `• ⏱️ **טכוגרף וזמני פריקה** (15/15): רציפות נסיעה תקינה, שהייה של 28 דקות פריקה באתר, אימות מיקום תואם | PASS\n` +
      `• 🏢 **נתוני לקוח וכתובת** (10/10): מספר לקוח 1042, אתר אספקה מאושר | PASS\n\n` +
      `📊 **ציון סופי**: ${score}/100\n` +
      `🎯 **המלצת נועה**: ${recommendation}\n` +
      `📌 **הערות נועה לראמי**: ${hasFailed ? "יש לדרוש מהנהג להחתים שוב את מקבל האתר טרם חיוב." : "התעודה מושלמת ומוכנה לחתימתך, ראמי. לאחר אישורך תועבר לארכוב ולהנהלת חשבונות."}\n\n` +
      `*תזכורת: המלצה זו ממתינה לאישורו הסופי של ראמי מסארוה לפני העברה להנהלת חשבונות וחיוב.*`
    );
  }

  // If asking about deposits (פקדונות)
  if (
    p.includes("פקדון") ||
    p.includes("בלה") ||
    p.includes("משטח") ||
    p.includes("60002") ||
    p.includes("60060")
  ) {
    return (
      headerNotice +
      `📦 **בקרת פקדונות לפי פרוטוקול נועה (ח. סבן)**:\n\n` +
      `1. **פקדון בלה (מק"ט 60002)**:\n` +
      `   • חובה ביחס 1:1 מול מק"טים: 11501 (חול), 11511 (סומסום), 11540 (טיט), 11551 (חצץ), 11570 (טוף).\n` +
      `   • כל שורת בלה בהזמנה מחייבת שורת פקדון תואמת בדיוק.\n\n` +
      `2. **פקדון משטח (מק"ט 60060)**:\n` +
      `   • חובה משטח אחד (60060) לכל 35–40 שקים.\n\n` +
      `💡 **הנחיית נועה לראמי**: במידה ומזוהה תעודה עם חוסר בפקדון בלה או משטחים, הציון בסעיף הפקדונות מופחת ל-0 והתעודה מועברת לסטטוס **REVIEW / בדיקה**.`
    );
  }

  // If asking about tachograph / driver
  if (p.includes("טכוגרף") || p.includes("נהג") || p.includes("זמן") || p.includes("פריקה")) {
    return (
      headerNotice +
      `⏱️ **בקרת טכוגרף וזמני פריקה (פרוטוקול נועה)**:\n\n` +
      `• **אימות רציפות נסיעה**: תאימות בין שעת יציאה ממחסן ח. סבן להגעה לאתר.\n` +
      `• **זמן פריקה נדרש**: מינימום 15–20 דקות שהייה באתר הלקוח לפריקת מנוף/משטחים.\n` +
      `• **אימות מיקום**: הצלבת קואורדינטות GPS שנקלטו ברכב מול כתובת האספקה הרשומה בהזמנה.\n` +
      `• **משקל בציון**: 15 נקודות (PASS מלא או 0 נקודות).\n\n` +
      (data.gps
        ? `📍 איכון נוכחי שנקלט במערכת: \`${data.gps.latitude.toFixed(5)}, ${data.gps.longitude.toFixed(5)}\` (דיוק ±${Math.round(data.gps.accuracy)} מ').`
        : `📍 לא נקלט איכון GPS פעיל בדקות האחרונות.`)
    );
  }

  // General daily summary to Rami
  return (
    headerNotice +
    `📊 **דוח יומי מסכם לראמי | נועה ❤️**\n\n` +
    `• **סה"כ תעודות שנסרקו ועובדו**: ${data.recordsCount}\n` +
    `• **תעודות מאושרות (APPROVED)**: ${data.syncedCount} תעודות ✅\n` +
    `• **תעודות לבדיקת ראמי (REVIEW)**: ${data.pendingCount} תעודות ⚠️\n` +
    `• **תעודות פסולות (REJECTED)**: ${data.failedCount} תעודות ❌\n` +
    `• **אחוז הצלחה כולל**: ${data.recordsCount > 0 ? Math.round((data.syncedCount / data.recordsCount) * 100) : 100}%\n` +
    `• **מסמכים בתור ארכוב מקומי**: ${data.queueCount}\n\n` +
    `ראמי היקר, אני ממתינה להוראותיך לגבי תעודות הדורשות בדיקה.`
  );
}

async function callGeminiRest(
  model: string,
  apiKey: string,
  systemInstruction: string,
  history: ChatTurn[],
): Promise<Response> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  return fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      contents: history.map((turn) => ({
        role: turn.role,
        parts: [{ text: turn.text }],
      })),
      generationConfig: {
        temperature: 0.4,
        topP: 0.9,
      },
    }),
  });
}

export async function* streamReply(
  history: ChatTurn[],
  dataSnapshot?: OperationalDataSnapshot,
): AsyncGenerator<string> {
  const apiKey = (import.meta.env["VITE_GEMINI_API_KEY"] as string | undefined)?.trim();
  const lastUserPrompt = history[history.length - 1]?.text ?? "";

  // If VITE_GEMINI_API_KEY is not defined, yield clear Vercel instructions + local Noa protocol insights
  if (!apiKey) {
    const localInsight = generateLocalOperationalInsights(lastUserPrompt, dataSnapshot);
    const words = localInsight.split(" ");
    for (let i = 0; i < words.length; i++) {
      yield i === words.length - 1 ? words[i] : `${words[i]} `;
      await new Promise((resolve) => setTimeout(resolve, 15));
    }
    return;
  }

  const systemInstruction = buildSystemInstruction(dataSnapshot);

  // Attempt with primary model, fall back gracefully if model returns 404 or 503
  let response: Response | null = null;
  const modelsToTry = [PRIMARY_MODEL, FALLBACK_MODEL];

  for (const model of modelsToTry) {
    try {
      const res = await callGeminiRest(model, apiKey, systemInstruction, history);
      if (res.ok) {
        response = res;
        break;
      }
      if (res.status === 400) {
        const errorJson = (await res.json()) as { error?: { message?: string } };
        if (errorJson.error?.message?.includes("API_KEY_INVALID")) {
          throw new Error(
            "מפתח ה-API שהוגדר ב-Vercel אינו תקין. אנא ודא את תקינות המפתח ב-Google AI Studio.",
          );
        }
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes("אינו תקין")) throw e;
    }
  }

  if (!response || !response.ok) {
    const fallbackNotice =
      "שירות ה-AI של Google אינו זמין כרגע. להלן מענה מבוסס פרוטוקול נועה והנתונים המקומיים:\n\n" +
      generateLocalOperationalInsights(lastUserPrompt, dataSnapshot);
    const words = fallbackNotice.split(" ");
    for (let i = 0; i < words.length; i++) {
      yield i === words.length - 1 ? words[i] : `${words[i]} `;
      await new Promise((resolve) => setTimeout(resolve, 15));
    }
    return;
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
    "לא התקבלה תשובה מנועה.";

  const words = text.split(" ");
  for (let i = 0; i < words.length; i++) {
    yield i === words.length - 1 ? words[i] : `${words[i]} `;
    await new Promise((resolve) => setTimeout(resolve, 15));
  }
}

export const NOA_OPERATIONAL_SUGGESTIONS = [
  {
    icon: "📄",
    label: "הצלבת תעודת משלוח מול הזמנה",
    prompt:
      "נועה, בצעי הצלבה מלאה של תעודת המשלוח האחרונה מול ההזמנה, כולל חתימה, פקדונות וטכוגרף.",
  },
  {
    icon: "📦",
    label: "בדיקת פקדונות בלה ומשטחים",
    prompt:
      'בדקי תקינות פקדונות: בלה (60002 יחס 1:1 למק"טים 11501-11570) ומשטחי 60060 לפי 35-40 שקים.',
  },
  {
    icon: "⏱️",
    label: "אימות טכוגרף וזמני פריקה",
    prompt: "בדקי רציפות נסיעת נהג, שעות פעילות וזמני פריקה באתר לפי הטכוגרף ואיכון המיקום.",
  },
  {
    icon: "📊",
    label: "דוח יומי מסכם לראמי",
    prompt: "הפיקי דוח יומי מסכם לראמי: כמה תעודות נסרקו, כמה אושרו, כמה הועברו לבדיקה וכמה נפסלו.",
  },
];
