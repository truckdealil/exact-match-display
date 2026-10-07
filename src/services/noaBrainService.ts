/**
 * ==============================================================================
 * ח. סבן חומרי בניין (1994) בע״מ | מוח נועה AI — שירות ניהול DNA ואימון המוח
 * ==============================================================================
 *
 * מנהל את 21 כללי הברזל, מחווני הטלמטיקה, מדד הדיוק (94%),
 * סימולטור הפינג-פונג ומערך ההתראות המבצעיות.
 */

import { toast } from "sonner";
import { playMobileChime } from "./audioService";

export type RuleCategory =
  "פקדונות 1:1" | "נהגים ושינוע" | "מחסנים ומגרשים" | "תמחור והזמנות" | "סגנון תקשורת ופינג-פונג";

export interface NoaDnaRule {
  id: string;
  category: RuleCategory;
  title: string;
  instruction: string;
  priority: "קריטי" | "גבוה" | "רגיל";
  example?: string;
  active: boolean;
  updatedAt: string;
}

export interface BrainKpis {
  operationalAccuracy: number; // 94%
  activeDnaRules: number; // 21
  verifiedCustomers: number; // 63
  dictionaryTermsCount: number; // 1,493
  activeHistoryOrders: number; // 73
}

export interface PushNotificationItem {
  id: string;
  type: "ceo" | "cash" | "dispatch" | "safety";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  metadata?: Record<string, string>;
}

const STORAGE_KEY_RULES = "saban_noa_dna_rules_v2";
const STORAGE_KEY_NOTIFS = "saban_noa_push_notifications_v2";

export const INITIAL_DNA_RULES: NoaDnaRule[] = [
  // פקדונות 1:1
  {
    id: "dna-01",
    category: "פקדונות 1:1",
    title: "חוק פקדונות בלות 1:1 (מק״ט 60002)",
    instruction:
      "כל שק בלה של חול, סומסום, חצץ, טיט, חמרה או מצע מחייב פקדון שק בלה מק״ט 60002 ביחס 1:1 בדיוק. מקסימום 18 בלות למנוף של חכמת.",
    priority: "קריטי",
    example: "הוזמנו 4 בלות חול -> חובה להוסיף 4 פקדון 60002",
    active: true,
    updatedAt: "2026-10-06 07:00",
  },
  {
    id: "dna-02",
    category: "פקדונות 1:1",
    title: "חוק פקדונות משטחי עץ סבן (מק״ט 60060)",
    instruction:
      "כל 35-40 שקי מלט נשר, טיח חוץ או דבק קרמיקה מחייבים פקדון משטח עץ סבן מק״ט 60060. 40 שק = 1 משטח = 1.0 טון.",
    priority: "קריטי",
    example: "80 שקי מלט -> 2 משטחי סבן (60060)",
    active: true,
    updatedAt: "2026-10-06 07:00",
  },
  {
    id: "dna-03",
    category: "פקדונות 1:1",
    title: "פקדון משטחי בלוקים (מק״ט 60006)",
    instruction: "משטחי בלוקי פומיס, איטונג ובטון מחויבים בפקדון ייעודי למשטחי בלוקים מק״ט 60006.",
    priority: "גבוה",
    example: "12 משטחי בלוק 20 -> 12 פקדון 60006",
    active: true,
    updatedAt: "2026-10-06 07:00",
  },
  {
    id: "dna-04",
    category: "פקדונות 1:1",
    title: "פטור מהפקדה בהובלה ללא פריקה (מק״ט 818000)",
    instruction:
      "אספקה ללא פריקה או שחרור עצמי מהמגרש מוגדרת כפטורה מפקדונות תחת סעיף 818000 במערכת.",
    priority: "רגיל",
    example: "הובלה בלבד ללא מנוף -> פטור מפקדון",
    active: true,
    updatedAt: "2026-10-06 07:00",
  },

  // נהגים ושינוע
  {
    id: "dna-05",
    category: "נהגים ושינוע",
    title: "משאית מנוף מרצדס (חכמת | 615-41-002)",
    instruction:
      "מיועדת לפריקות מנוף כבדות לגובה, בלוקים ובלות. כושר העמסה 18 בלות / 26 טון. יציאה קבועה ב-07:00 לעקיפת פקקי איילון.",
    priority: "קריטי",
    example: "סל כבד עם בלות ובלוקים משובץ אוטומטית לחכמת",
    active: true,
    updatedAt: "2026-10-06 07:00",
  },
  {
    id: "dna-06",
    category: "נהגים ושינוע",
    title: "משאית איסוזו פלטה (עלי | 651-51-701)",
    instruction:
      "מיועדת לחלוקה מהירה, רחובות צרים, גבס, פרופילים, צבעים ופריקה ידנית. פריקה זריזה ללא מנוף.",
    priority: "גבוה",
    example: "שקים בודדים או לוחות גבס -> עלי איסוזו",
    active: true,
    updatedAt: "2026-10-06 07:00",
  },
  {
    id: "dna-07",
    category: "נהגים ושינוע",
    title: "משאית רמסע מכולות פסולת",
    instruction:
      "שינוע מכולות פסולת בניין בנפח 8 קוב. חל איסור מוחלט להעמיס אסבסט או חומרים דליקים.",
    priority: "רגיל",
    example: "הזמנת מכולה 8 קוב לרעננה -> שיבוץ רמסע",
    active: true,
    updatedAt: "2026-10-06 07:00",
  },
  {
    id: "dna-08",
    category: "נהגים ושינוע",
    title: "בטיחות פריקה וכבלי חשמל באתר",
    instruction:
      "התרעה מוקדמת לנהג בכל פריקת מנוף באתרים עם כבלי מתח גבוה או גישה בעייתית (כגון בר אילן רעננה ומוצקין 22).",
    priority: "קריטי",
    example: "אזהרה: כבלי חשמל מעל אתר מוצקין - פריקה זהירה",
    active: true,
    updatedAt: "2026-10-06 07:00",
  },

  // מחסנים ומגרשים
  {
    id: "dna-09",
    category: "מחסנים ומגרשים",
    title: "מגרש 4 החרש 10 (רעננה)",
    instruction:
      "מחסן מרכזי לשינוע כבד: אגרגטים בבלות, חול, חצץ, סומסום, ברזל בניין ובלוקים. נקודת יציאה למנוף מרצדס.",
    priority: "גבוה",
    example: "בלות וברזל יוצאים ממחסן 4 החרש",
    active: true,
    updatedAt: "2026-10-06 07:00",
  },
  {
    id: "dna-10",
    category: "מחסנים ומגרשים",
    title: "מגרש 1 התלמיד 6 (הוד השרון)",
    instruction:
      "מחסן חומרי גמר, דבקים, רובות, צבעים, לוחות גבס, פרופילים וכלי עבודה. נקודת טעינה למשאית איסוזו.",
    priority: "גבוה",
    example: "דבקים וגבס יוצאים ממגרש 1 התלמיד",
    active: true,
    updatedAt: "2026-10-06 07:00",
  },
  {
    id: "dna-11",
    category: "מחסנים ומגרשים",
    title: "אריזת פרופילי גבס ומוצרי בידוד",
    instruction:
      "חבילת פרופילים נסגרת ב-10 יחידות בדיוק (אין פירוק חבילה). קלקר F20 נמכר בחבילות של 24 לוחות.",
    priority: "רגיל",
    example: "דרישה ל-15 פרופילים תעוגל ל-2 חבילות (20 יח')",
    active: true,
    updatedAt: "2026-10-06 07:00",
  },

  // תמחור והזמנות
  {
    id: "dna-12",
    category: "תמחור והזמנות",
    title: "פרוטוקול מנכ״ל הראל אידלסון (050-5227724)",
    instruction:
      "הוראות ישירות ממנכ״ל הראל אידלסון מקבלות סטטוס קו אדום עליון (Priority 1) לביצוע מיידי ללא עיכוב.",
    priority: "קריטי",
    example: "פנייה מהראל -> הקפצת התראת מנכ״ל ושיבוץ בסבב הקרוב",
    active: true,
    updatedAt: "2026-10-06 07:00",
  },
  {
    id: "dna-13",
    category: "תמחור והזמנות",
    title: "הצלבה תלת-כיוונית (קומקס ⇄ וואטסאפ ⇄ מילון)",
    instruction:
      "הצלבת מסמכי הצעת מחיר/הזמנה מקומקס מול שיחות הוואטסאפ, איתור תוספות טלפוניות שלא נכתבו בהודעה.",
    priority: "קריטי",
    example: "איתור תוספת טלפונית של 2 שקי מלט שלא צוינו בהודעה",
    active: true,
    updatedAt: "2026-10-06 07:00",
  },
  {
    id: "dna-14",
    category: "תמחור והזמנות",
    title: "פקודת אישור מהיר ראמי (ספרה ״1״)",
    instruction:
      "הודעת אישור של ראמי בוואטסאפ המכילה '1' או 'אישור' מבצעת רישום מיידי בגיליון מערכת מאוחדת ומעדכנת את הסטטוס.",
    priority: "קריטי",
    example: "ראמי משיב '1' -> ההזמנה ננעלת בסידור",
    active: true,
    updatedAt: "2026-10-06 07:00",
  },
  {
    id: "dna-15",
    category: "תמחור והזמנות",
    title: "גביית מזומן מיידית באתר (1,817 ₪ בקריית אונו)",
    instruction:
      "לקוחות בסטטוס מזומן חייבים סגירת תשלום מול הנהג טרם הפריקה (כגון חוב 1,817 ₪ לאתר בקריית אונו).",
    priority: "קריטי",
    example: "הקפצת התראת גבייה לחכמת טרם פריקת משטח מלט",
    active: true,
    updatedAt: "2026-10-06 07:00",
  },
  {
    id: "dna-16",
    category: "תמחור והזמנות",
    title: "נרמול מונחי סלנג במילון משודרג",
    instruction:
      "זיהוי סלנג שטח (שומשום, טיט מוכן, ביט, פלציב, קלקר) והמרתו למק״ט קומקס 7 ספרות רשמי במילון המשודרג.",
    priority: "גבוה",
    example: "סלנג 'פלציב 5 מ״מ' מתורגם למק״ט 24101",
    active: true,
    updatedAt: "2026-10-06 07:00",
  },

  // סגנון תקשורת ופינג-פונג
  {
    id: "dna-17",
    category: "סגנון תקשורת ופינג-פונג",
    title: "כלל הפינג-פונג (מקסימום 2 משפטים + כדור חוזר)",
    instruction:
      "כל מענה של נועה בוואטסאפ חייב להיות קצר, תמציתי ומקצועי (עד 2 משפטים) ולהסתיים תמיד בשאלת המשך / כדור חוזר ללקוח.",
    priority: "קריטי",
    example: "ההזמנה ארוזה וחכמת יוצא ב-07:00. האם להוסיף שקי מלט לסבב?",
    active: true,
    updatedAt: "2026-10-06 07:00",
  },
  {
    id: "dna-18",
    category: "סגנון תקשורת ופינג-פונג",
    title: "כלל השפה הערבית (رد باللغة العربية)",
    instruction:
      "פנייה בוואטסאפ בשפה הערבית או מנהג/קבלן דובר ערבית נענית באדיבות שוטפת ומקצועית בערבית.",
    priority: "גבוה",
    example: "أهلاً بك! الشاحنة في طريقها إليك وتصل خلال 30 دقيقة. هل الموقع جاهז للتفريغ؟",
    active: true,
    updatedAt: "2026-10-06 07:00",
  },
  {
    id: "dna-19",
    category: "סגנון תקשורת ופינג-פונג",
    title: "סדרנית צל שקטה בקבוצות JONI",
    instruction:
      "נועה פועלת במצב Copilot שקט בקבוצות עבודה, מעבדת הזמנות ברקע ומקפיצה התראות רק על חריגות ואישורי ראמי.",
    priority: "רגיל",
    example: "איסוף הודעות קבוצה ללא הצפת הודעות סרק",
    active: true,
    updatedAt: "2026-10-06 07:00",
  },
  {
    id: "dna-20",
    category: "סגנון תקשורת ופינג-פונג",
    title: "שקיפות סטטוס וקישור Waze ישיר",
    instruction:
      "כל עדכון שיבוץ נהג מלווה בקישור Waze ישיר ומדויק לכתובת האתר כולל שם מנהל העבודה בשטח.",
    priority: "גבוה",
    example: "קישור ניווט ישיר לנהג: https://waze.com/ul?q=...",
    active: true,
    updatedAt: "2026-10-06 07:00",
  },
  {
    id: "dna-21",
    category: "סגנון תקשורת ופינג-פונג",
    title: "פרוטוקול תאימות לקוח VIP (לי-רן, ערוגת הבשם)",
    instruction:
      "זיהוי אוטומטי של לקוחות חוזרים מול איתוראן ותיק הלקוח, שליפת סל קבוע ואזהרות גישה מיוחדות לאתר.",
    priority: "קריטי",
    example: "זיהוי יוסף לוי (לי-רן השקעות) והצגת סל מלט וחול מועדף",
    active: true,
    updatedAt: "2026-10-06 07:00",
  },
];

export const INITIAL_NOTIFICATIONS: PushNotificationItem[] = [
  {
    id: "notif-1",
    type: "cash",
    title: "💰 התראת גביית מזומן — קריית אונו",
    message: "חוב פתוח של 1,817 ₪ באתר דרך השרון 14, קריית אונו. על חכמת לגבות מזומן במעמד הפריקה.",
    timestamp: "היום, 07:15",
    read: false,
    metadata: { amount: "1,817 ₪", driver: "חכמת", site: "קריית אונו" },
  },
  {
    id: "notif-2",
    type: "ceo",
    title: "🚨 משימת מנכ״ל דחופה — הראל אידלסון",
    message:
      "הראל אידלסון (050-5227724) אישר אספקה מיידית של 12 בלות חמרה לאתר ערוגת הבשם. סבב ראשון בעדיפות 1.",
    timestamp: "היום, 06:45",
    read: false,
    metadata: { phone: "050-5227724", priority: "Priority 1" },
  },
  {
    id: "notif-3",
    type: "dispatch",
    title: "🚚 עדכון פריקת משאית — חכמת",
    message:
      "חכמת מרצדס מנוף (615-41-002) השלים בהצלחה פריקת 18 בלות סומסום ברעננה. יוצא למחסן 4 החרש.",
    timestamp: "היום, 06:10",
    read: true,
    metadata: { driver: "חכמת", vehicle: "615-41-002" },
  },
  {
    id: "notif-4",
    type: "safety",
    title: "⚠️ אזהרת בטיחות כבלי חשמל",
    message:
      "אתר מוצקין 22, רעננה (לי-רן השקעות) — כבלי מתח גבוה בגובה 6 מטר בכניסה לחניה. הנחיית זהירות לחכמת.",
    timestamp: "אתמול, 16:30",
    read: true,
    metadata: { site: "מוצקין 22", risk: "כבלי חשמל" },
  },
];

export function getDnaRules(): NoaDnaRule[] {
  if (typeof window === "undefined") return INITIAL_DNA_RULES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RULES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_RULES, JSON.stringify(INITIAL_DNA_RULES));
      return INITIAL_DNA_RULES;
    }
    const parsed = JSON.parse(raw) as NoaDnaRule[];
    return parsed.length > 0 ? parsed : INITIAL_DNA_RULES;
  } catch {
    return INITIAL_DNA_RULES;
  }
}

export function saveDnaRules(rules: NoaDnaRule[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_RULES, JSON.stringify(rules));
    window.dispatchEvent(new CustomEvent("saban_dna_rules_updated", { detail: rules }));
  } catch {
    /* ignore */
  }
}

export function addDnaRule(rule: Omit<NoaDnaRule, "id" | "updatedAt">): NoaDnaRule {
  const current = getDnaRules();
  const newRule: NoaDnaRule = {
    ...rule,
    id: `dna-${Date.now().toString(36)}`,
    updatedAt: new Date().toLocaleDateString("he-IL", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
  const updated = [newRule, ...current];
  saveDnaRules(updated);
  playMobileChime();
  toast.success("כלל ה-DNA נצרב בהצלחה בזיכרון של נועה AI!");
  return newRule;
}

export function updateDnaRule(id: string, updates: Partial<NoaDnaRule>): boolean {
  const current = getDnaRules();
  const idx = current.findIndex((r) => r.id === id);
  if (idx === -1) return false;
  current[idx] = {
    ...current[idx],
    ...updates,
    updatedAt: new Date().toLocaleDateString("he-IL", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
  saveDnaRules(current);
  toast.success("הכלל עודכן בזיכרון של נועה!");
  return true;
}

export function deleteDnaRule(id: string): boolean {
  const current = getDnaRules();
  const filtered = current.filter((r) => r.id !== id);
  saveDnaRules(filtered);
  toast.success("הכלל הוסר מזיכרון נועה");
  return true;
}

export function resetToDefaultDnaRules(): NoaDnaRule[] {
  saveDnaRules(INITIAL_DNA_RULES);
  toast.success("שוחזרו 21 כללי הברזל המקוריים של נועה AI");
  return INITIAL_DNA_RULES;
}

export function exportRulesAsJsonString(): string {
  const rules = getDnaRules();
  return JSON.stringify(
    {
      agent: "Noa AI - Saban Logistics Brain",
      version: "2.5.0-PWA",
      business: "ח. סבן חומרי בניין (1994) בע״מ",
      kpis: {
        operationalAccuracy: "94%",
        rulesCount: rules.length,
      },
      dnaRules: rules,
      exportedAt: new Date().toISOString(),
    },
    null,
    2,
  );
}

export function getBrainKpis(): BrainKpis {
  const rules = getDnaRules();
  return {
    operationalAccuracy: 94,
    activeDnaRules: rules.filter((r) => r.active).length,
    verifiedCustomers: 63,
    dictionaryTermsCount: 1493,
    activeHistoryOrders: 73,
  };
}

export function getPushNotifications(): PushNotificationItem[] {
  if (typeof window === "undefined") return INITIAL_NOTIFICATIONS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NOTIFS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify(INITIAL_NOTIFICATIONS));
      return INITIAL_NOTIFICATIONS;
    }
    return JSON.parse(raw) as PushNotificationItem[];
  } catch {
    return INITIAL_NOTIFICATIONS;
  }
}

export function savePushNotifications(items: PushNotificationItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("saban_notifs_updated", { detail: items }));
  } catch {
    /* ignore */
  }
}

export function markNotificationAsRead(id: string): void {
  const current = getPushNotifications();
  const next = current.map((n) => (n.id === id ? { ...n, read: true } : n));
  savePushNotifications(next);
}

/**
 * מנוע סימולטור פינג-פונג:
 * מענה קצר עד 2 משפטים עם כדור חוזר + תמיכה בשפה הערבית ופרוטוקול מנכ"ל
 */
export function generateSimulatorPingPongReply(prompt: string): string {
  const clean = prompt.trim();
  const lower = clean.toLowerCase();

  // 1. בדיקת ערבית (Arabic Rule)
  const isArabic = /[\u0600-\u06FF]/.test(clean);
  if (isArabic) {
    if (
      clean.includes("حكمت") ||
      clean.includes("شاحنة") ||
      clean.includes("وين") ||
      clean.includes("متى")
    ) {
      return "أهلاً بك! حكمت مع مرسيدس رافعة في طريقه لموقعك ويصل خلال 25 دقيقة. هل الموقع جاهز للتفريغ الآن؟ 🚚";
    }
    return "أهلاً وسهلاً بك في شركة صبان لمواد البناء! طلبك مسجل لدينا بالسجلات. هل تحتاج أي إضافة أخرى مع الشحنة؟ ❤️";
  }

  // 2. פרוטוקול מנכ"ל הראל אידלסון
  if (
    lower.includes("הראל") ||
    lower.includes("אידלסון") ||
    lower.includes("מנכל") ||
    lower.includes("מנכ״ל")
  ) {
    return "קיבלתי, הוראת מנכ״ל הראל אידלסון (050-5227724) הוגדרה בקו אדום עליון ויוצאת בסבב הקרוב. האם לתאם פריקת מנוף מול מנהל האתר ישירות?";
  }

  // 3. אישור "1" של ראמי
  if (clean === "1" || lower.includes("אישור 1") || lower === "אישור") {
    return "פקודתך בוצעה המפקד! 🫡 ההזמנה ננעלה בגיליון מערכת מאוחדת וסונכרנה לחכמת. להכין תעודת משלוח דיגיטלית לחתימת שטח?";
  }

  // 4. מה לירן רוכש?
  if (lower.includes("לירן") || lower.includes("לי-רן")) {
    return "לי-רן רוכש סל קבוע של 2 בלות סומסום, 3 בלות חול ומשטח מלט למוצקין 22 ברעננה, עם אזהרת כבלי חשמל. האם לשריין לו את חכמת לסבב 07:00 מחר?";
  }

  // 5. מתי חכמת יוצא?
  if (lower.includes("חכמת") || (lower.includes("יוצא") && lower.includes("מנוף"))) {
    return "חכמת מרצדס מנוף (615-41-002) מעמיס במחסן 4 החרש ויוצא ב-07:00 בדיוק לעקיפת פקקי איילון. האם להעביר אליו את תעודת המשלוח החתומה לוואטסאפ?";
  }

  // 6. ערוגת הבשם
  if (lower.includes("ערוגת הבשם") || lower.includes("בשם")) {
    return "בהזמנה האחרונה לערוגת הבשם סופקו 12 בלות חמרה ו-20 שקי מלט נשר על משטח סבן (60060). האם הלקוח מבקש סבב השלמה להיום?";
  }

  // 7. גביית מזומן / קריית אונו
  if (lower.includes("מזומן") || lower.includes("קריית אונו") || lower.includes("קרית אונו")) {
    return "בקריית אונו פתוחה דרישת גביית מזומן של 1,817 ₪ לחכמת לפני פריקה. האם לתזכר את מנהל האתר בהודעת תשלום לפני הגעת המשאית?";
  }

  // 8. שאלת פקדונות
  if (lower.includes("פקדון") || lower.includes("בלה") || lower.includes("משטח")) {
    return "אנו מחייבים בלות 60002 ביחס 1:1 בדיוק ומשטחי עץ 60060 (1 לכל 40 שק מלט), עם פטור בהובלה ללא פריקה 818000. האם להוסיף את שורת הפקדון להזמנה הנוכחית?";
  }

  // ברירת מחדל חוק הפינג-פונג: מקסימום 2 משפטים + כדור חוזר
  return `בדקתי במילון הלוגיסטי ובמערכת מאוחדת, הפרטים תואמים להזמנות מחסן 4 החרש 10. האם תרצה שאשריין את המשאית עכשיו או לעדכן את ראמי?`;
}
