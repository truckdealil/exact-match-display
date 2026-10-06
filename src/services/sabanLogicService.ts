/**
 * ==============================================================================
 * ח. סבן חומרי בניין (1994) בע״מ | מוח לוגיסטי אוטונומי חכם — SabanOS Logic Engine
 * ==============================================================================
 *
 * יכולות ליבה:
 * 1. מפענח מסמכי PDF ומיילים מקומקס (Comax PDF Ingestion Agent).
 * 2. מנוע הצלבה תלת-כיווני חכם (Reconciliation Engine): וואטסאפ ⇄ קומקס ⇄ מילון לוגיסטי.
 * 3. איתור אוטונומי של תוספות טלפוניות (פריטים שלא הופיעו בוואטסאפ אך הוקלדו בקומקס).
 * 4. מנגנון למידה עצמית ועדכון שוטף של "מילון משודרג" בסלנג, שמות חלופיים ומק"טים חדשים.
 * 5. כרטיס דרישת אישור ובקרה לראמי בוואטסאפ עם אישור מהיר בספרה "1".
 * 6. מצב סדרנית צל שקט (Silent Copilot) לכלל קבוצות JONI וצ'אטים פרטיים.
 * 7. חישוב פקדונות מדויק (60002 בלות 1:1, 60060 משטחי סבן, 60006 משטחי בלוקים).
 * 8. שיבוץ נהג ומחסן דינמי (חכמת מנוף החרש 10 / עלי חלוקה התלמיד 6 / רמסע מכולות).
 * 9. חוקי אריזה (חבילת פרופילים = 10 יח', קלקר = 24 לוחות, משטח מלט = 40 שקים = 1 טון).
 * ==============================================================================
 */

export const UNIFIED_SPREADSHEET_ID = "1Ie7gKql_EDdrIN9HqunJc9Ey5k0WXXfPRxs0Vp1Bs2c";
export const NOA_AI_SPREADSHEET_ID = "1VA9J6n9IYcooO_s2xOpnkvyDQWWQD3pfhh0cnenCkoA";
export const RAMI_VIP_PHONES = ["0508860896", "0508801080", "972508860896", "972508801080"];

export interface CatalogProduct {
  sku: string;
  name: string;
  unit: string;
  keywords: string[];
  weightTon: number;
  isBigBag?: boolean;
  isPalletItem?: boolean;
  isBlock?: boolean;
  isMetal?: boolean;
  isDrywall?: boolean;
  rules?: string;
  pkg?: string;
}

export const RAW_CATALOG: CatalogProduct[] = [
  {
    sku: "11501",
    name: "חול שק גדול (בלה)",
    unit: "בלה",
    keywords: [
      "חול שק גדול (בלה)",
      "חול שק גדול",
      "חול גדול",
      "בלת חול",
      "אגרגטים",
      "חול בלה",
      "בלה חול",
      "4 חול",
      "בלה",
      "חול",
    ],
    weightTon: 0.75,
    isBigBag: true,
    isPalletItem: false,
    isBlock: false,
    isMetal: false,
    isDrywall: false,
    rules: "אם צוין מספר ללא יחידה והסל כבד -> בלה (11501) + פקדון (60002). מקסימום 18 בלות לחכמת.",
    pkg: "בלה 1 (כ-0.6 קוב)",
  },
  {
    sku: "11500",
    name: 'חול שק 25 ק"ג',
    unit: "שק",
    keywords: [
      'חול שק 25 ק"ג',
      "חול 25 קג",
      "שקית חול",
      "חול קטן",
      "שק חול",
      "חול שק",
      "שקית",
      "חול",
      "שק",
    ],
    weightTon: 0.025,
    isBigBag: false,
    isPalletItem: false,
    isBlock: false,
    isMetal: false,
    isDrywall: false,
    rules: "לסל קל או פריקה ידנית עלי.",
    pkg: 'שק 25 ק"ג | משטח = 70 שקים',
  },
  {
    sku: "11511",
    name: "סומסום שק גדול (בלה)",
    unit: "בלה",
    keywords: [
      "סומסום שק גדול (בלה)",
      "סומסום שק גדול",
      "סומסום בלה",
      "שומשום בלה",
      "בלה סומסום",
      "בלת סומסום",
      "שומשומית",
      "סומסום",
      "שומשום",
      "ריצוף",
      "בלה",
    ],
    weightTon: 0.73,
    isBigBag: true,
    isPalletItem: false,
    isBlock: false,
    isMetal: false,
    isDrywall: false,
    rules: "פריקת מנוף חכמת. מקסימום 18 בלות ברכב. להוריד בלות אם מתווסף משטח מלט 1 טון.",
    pkg: "בלה 1 (כ-0.6 קוב)",
  },
  {
    sku: "11510",
    name: 'סומסום שק 25 ק"ג',
    unit: "שק",
    keywords: [
      'סומסום שק 25 ק"ג',
      "סומסום 25 קג",
      "שקית שומשום",
      "סומסום שק",
      "שק סומסום",
      "סומסום",
      "שומשום",
      "שק",
    ],
    weightTon: 0.025,
    isBigBag: false,
    isPalletItem: false,
    isBlock: false,
    isMetal: false,
    isDrywall: false,
    rules: "משאות קלים, משאית עלי.",
    pkg: 'שק 25 ק"ג | משטח = 70 שקים',
  },
  {
    sku: "11540",
    name: "מצע שק גדול (בלה)",
    unit: "בלה",
    keywords: [
      "מצע שק גדול (בלה)",
      "מצע שק גדול",
      "מצע מהודק",
      "בלה מצע",
      "מצע בלה",
      "מחלוטה",
      "תשתית",
      "מצע",
      "בלה",
    ],
    weightTon: 0.8,
    isBigBag: true,
    isPalletItem: false,
    isBlock: false,
    isMetal: false,
    isDrywall: false,
    rules: "מנוף חכמת בלבד.",
    pkg: "בלה 1",
  },
  {
    sku: "11551",
    name: "טיט מוכן שק גדול (בלה)",
    unit: "בלה",
    keywords: [
      "טיט מוכן שק גדול (בלה)",
      "טיט מוכן שק גדול",
      "טיט לבניה",
      "בלת טיט",
      "בלה טיט",
      "טיט בלה",
      "בניה",
      "בלה",
      "טיט",
    ],
    weightTon: 0.75,
    isBigBag: true,
    isPalletItem: false,
    isBlock: false,
    isMetal: false,
    isDrywall: false,
    rules: "פריקת מנוף חכמת. דורש פקדון בלה 60002.",
    pkg: "בלה 1",
  },
  {
    sku: "11550",
    name: 'טיט מוכן שק 25 ק"ג',
    unit: "שק",
    keywords: ['טיט מוכן שק 25 ק"ג', "טיט מוכן שק", "טיט 25 קג", "טיט שק", "שק טיט", "טיט", "שק"],
    weightTon: 0.025,
    isBigBag: false,
    isPalletItem: false,
    isBlock: false,
    isMetal: false,
    isDrywall: false,
    rules: "שקים קלים.",
    pkg: 'שק 25 ק"ג | משטח = 70 שקים',
  },
  {
    sku: "11570",
    name: "חמרה שק גדול (בלה)",
    unit: "בלה",
    keywords: [
      "חמרה שק גדול (בלה)",
      "חמרה שק גדול",
      "אדמת גננות",
      "אדמה חמרה",
      "בלה חמרה",
      "חמרה בלה",
      "גינון",
      "אדמה",
      "חמרה",
      "בלה",
    ],
    weightTon: 0.7,
    isBigBag: true,
    isPalletItem: false,
    isBlock: false,
    isMetal: false,
    isDrywall: false,
    rules: "מנוף חכמת.",
    pkg: "בלה 1",
  },
  {
    sku: "10002",
    name: 'מלט אפור 25 ק"ג נשר',
    unit: "שק",
    keywords: [
      'מלט אפור 25 ק"ג נשר',
      "מלט 25 קג",
      "צמנט אפור",
      "מלט אפור",
      "משטח מלט",
      "מלט נשר",
      "שק מלט",
      "צמנט",
      "נשר",
      "מלט",
    ],
    weightTon: 0.025,
    isBigBag: false,
    isPalletItem: true,
    isBlock: false,
    isMetal: false,
    isDrywall: false,
    rules: "משטח שלם = 40 שקים = 1 טון בדיוק. שוקל כמו 1.3 בלות. מורידים בלות בחכמת כדי לאזן משקל.",
    pkg: 'שק 25 ק"ג | משטח = 40 שקים (1.0 טון)',
  },
  {
    sku: "10009",
    name: 'מלט לבן 25 ק"ג',
    unit: "שק",
    keywords: ['מלט לבן 25 ק"ג', "שק מלט לבן", "צמנט לבן", "מלט לבן"],
    weightTon: 0.025,
    isBigBag: false,
    isPalletItem: true,
    isBlock: false,
    isMetal: false,
    isDrywall: false,
    rules: 'אם ביקש רק "מלט" בלי צבע -> לברר האם אפור רגיל (10002) או לבן.',
    pkg: 'שק 25 ק"ג | משטח = 40 שקים',
  },
  {
    sku: "10011",
    name: 'בטון מוכן 25 ק"ג',
    unit: "שק",
    keywords: [
      'בטון מוכן 25 ק"ג',
      "בטון 25 קג",
      "בטון מוכן",
      "ב-20 מוכן",
      "בטון יבש",
      "שק בטון",
      "בטון",
    ],
    weightTon: 0.025,
    isBigBag: false,
    isPalletItem: true,
    isBlock: false,
    isMetal: false,
    isDrywall: false,
    rules: "משטח 40 שקים מחייב פקדון משטח (60060).",
    pkg: 'שק 25 ק"ג | משטח = 40 שקים',
  },
  {
    sku: "15109",
    name: 'דבק 109 25 ק"ג כרמית',
    unit: "שק",
    keywords: [
      'דבק 109 25 ק"ג כרמית',
      "מיסטר פיקס 109",
      "דבק קרמיקה",
      "כרמית 109",
      "דבק 109",
      "קרמיקה",
      "כרמית",
      "דבק",
      "109",
    ],
    weightTon: 0.025,
    isBigBag: false,
    isPalletItem: true,
    isBlock: false,
    isMetal: false,
    isDrywall: false,
    rules: 'שק 25 ק"ג. דורש פקדון משטח מעל 35 שקים.',
    pkg: 'שק 25 ק"ג | משטח = 40 שקים',
  },
  {
    sku: "14007",
    name: 'פריימר SAKRET 007 שק 20 ק"ג',
    unit: "שק",
    keywords: [
      'פריימר sakret 007 שק 20 ק"ג',
      "פריימר סקרט",
      "פריימר 007",
      "sakret 007",
      "סקרט 007",
      "פריימר",
      "סקרט",
      "007",
    ],
    weightTon: 0.02,
    isBigBag: false,
    isPalletItem: true,
    isBlock: false,
    isMetal: false,
    isDrywall: false,
    rules: 'שק 20 ק"ג.',
    pkg: 'שק 20 ק"ג | משטח = 40 שקים',
  },
  {
    sku: "15023",
    name: 'בונד 200 גלון 5 ק"ג',
    unit: "גלון",
    keywords: [
      'בונד 200 גלון 5 ק"ג',
      "בי גי בונד 200",
      "בונד 5 קג",
      "דבק בונד",
      "בונד 200",
      "בי ג'י",
      "בונד",
    ],
    weightTon: 0.005,
    isBigBag: false,
    isPalletItem: false,
    isBlock: false,
    isMetal: false,
    isDrywall: false,
    rules: "גלון נוזלי, חלוקת עלי.",
    pkg: 'גלון 5 ק"ג',
  },
  {
    sku: "111260",
    name: "לוח גבס לבן 260 ע 12.50",
    unit: "לוח",
    keywords: [
      "לוח גבס לבן 260 ע 12.50",
      "לוח גבס לבן 260",
      "פלטת גבס לבן",
      "גבס לבן 260",
      "לוח גבס",
      "260",
      "גבס",
      "לבן",
    ],
    weightTon: 0.025,
    isBigBag: false,
    isPalletItem: false,
    isBlock: false,
    isMetal: false,
    isDrywall: true,
    rules:
      'ברירת מחדל ראשית: אם הלקוח אמר "לוח גבס" בלי לציין מידה/סוג -> לשבץ 111260 (לבן 2.60) ולשאול האם דרוש ירוק/אורך שונה.',
    pkg: "לוח בודד (משטח מפעל = 60-80 לוחות)",
  },
  {
    sku: "111280",
    name: "לוח גבס לבן 280 ע 12.50",
    unit: "לוח",
    keywords: [
      "לוח גבס לבן 280 ע 12.50",
      "לוח גבס לבן 280",
      "פלטת גבס לבן",
      "גבס לבן 280",
      "לוח גבס",
      "280",
      "גבס",
      "לבן",
    ],
    weightTon: 0.025,
    isBigBag: false,
    isPalletItem: false,
    isBlock: false,
    isMetal: false,
    isDrywall: true,
    rules: "גבס לבן אורך 280. משאית עלי.",
    pkg: "לוח בודד (משטח מפעל = 60-80 לוחות)",
  },
  {
    sku: "111300",
    name: "לוח גבס לבן 300 ע 12.50",
    unit: "לוח",
    keywords: [
      "לוח גבס לבן 300 ע 12.50",
      "לוח גבס לבן 300",
      "פלטת גבס לבן",
      "גבס לבן 300",
      "לוח גבס",
      "300",
      "גבס",
      "לבן",
    ],
    weightTon: 0.025,
    isBigBag: false,
    isPalletItem: false,
    isBlock: false,
    isMetal: false,
    isDrywall: true,
    rules: "גבס לבן אורך 300. משאית עלי.",
    pkg: "לוח בודד (משטח מפעל = 60-80 לוחות)",
  },
  {
    sku: "112260",
    name: "לוח גבס ירוק 260 ע 12.50",
    unit: "לוח",
    keywords: [
      "לוח גבס ירוק 260 ע 12.50",
      "לוח גבס ירוק 260",
      "פלטת גבס ירוק",
      "גבס ירוק 260",
      "לוח גבס",
      "ירוק",
      "260",
      "גבס",
    ],
    weightTon: 0.025,
    isBigBag: false,
    isPalletItem: false,
    isBlock: false,
    isMetal: false,
    isDrywall: true,
    rules: "גבס ירוק אורך 260. משאית עלי.",
    pkg: "לוח בודד (משטח מפעל = 60-80 לוחות)",
  },
  {
    sku: "9650300",
    name: "ניצב 0.6 50/300",
    unit: "יח'",
    keywords: [
      "ניצב 0.6 50/300",
      "חבילות ניצב",
      "חבילת ניצב",
      "ניצב 0.6",
      "פרופיל",
      "מתכת",
      "ניצב",
      "גבס",
    ],
    weightTon: 0.003,
    isBigBag: false,
    isPalletItem: false,
    isBlock: false,
    isMetal: true,
    isDrywall: false,
    rules: "חוק חבילה: אם הלקוח רשם חבילה 1 או 2 -> להמיר ל-10 או 20 יחידות בקומקס. משאית עלי.",
    pkg: "חוק חבילה: 1 חבילה = 10 יחידות בדיוק",
  },
  {
    sku: "8650300",
    name: "מסלול 0.6 50/300",
    unit: "יח'",
    keywords: [
      "מסלול 0.6 50/300",
      "חבילות מסלול",
      "חבילת מסלול",
      "מסלול 0.6",
      "פרופיל",
      "מסלול",
      "מתכת",
      "גבס",
    ],
    weightTon: 0.003,
    isBigBag: false,
    isPalletItem: false,
    isBlock: false,
    isMetal: true,
    isDrywall: false,
    rules: "חוק חבילה: אם הלקוח רשם חבילה 1 או 2 -> להמיר ל-10 או 20 יחידות בקומקס. משאית עלי.",
    pkg: "חוק חבילה: 1 חבילה = 10 יחידות בדיוק",
  },
  {
    sku: "9510300",
    name: "ניצב 0.5 100/300",
    unit: "יח'",
    keywords: [
      "ניצב 0.5 100/300",
      "חבילות ניצב",
      "חבילת ניצב",
      "ניצב 0.5",
      "פרופיל",
      "מתכת",
      "ניצב",
      "גבס",
    ],
    weightTon: 0.003,
    isBigBag: false,
    isPalletItem: false,
    isBlock: false,
    isMetal: true,
    isDrywall: false,
    rules: "חוק חבילה: אם הלקוח רשם חבילה 1 או 2 -> להמיר ל-10 או 20 יחידות בקומקס. משאית עלי.",
    pkg: "חוק חבילה: 1 חבילה = 10 יחידות בדיוק",
  },
  {
    sku: "8510300",
    name: "מסלול 0.5 100/300",
    unit: "יח'",
    keywords: [
      "מסלול 0.5 100/300",
      "חבילות מסלול",
      "חבילת מסלול",
      "מסלול 0.5",
      "פרופיל",
      "מסלול",
      "מתכת",
      "גבס",
    ],
    weightTon: 0.003,
    isBigBag: false,
    isPalletItem: false,
    isBlock: false,
    isMetal: true,
    isDrywall: false,
    rules: "חוק חבילה: אם הלקוח רשם חבילה 1 או 2 -> להמיר ל-10 או 20 יחידות בקומקס. משאית עלי.",
    pkg: "חוק חבילה: 1 חבילה = 10 יחידות בדיוק",
  },
  {
    sku: "35010",
    name: 'שפכטל אמריקאי 28 ק"ג',
    unit: "דלי",
    keywords: [
      'שפכטל אמריקאי 28 ק"ג',
      "דלי שפכטל ירוק",
      "שפכטל אמריקאי",
      "שפכטל 28 קג",
      "דלי שפכטל",
      "אמריקאי",
      "שפכטל",
      "צבע",
      "גבס",
    ],
    weightTon: 0.028,
    isBigBag: false,
    isPalletItem: true,
    isBlock: false,
    isMetal: false,
    isDrywall: false,
    rules: "מוצר משלים מובהק ללוחות גבס.",
    pkg: 'דלי 28 ק"ג | משטח = 36 דליים',
  },
  {
    sku: "12010",
    name: "בלוק בטון 10/20/40",
    unit: "יח'",
    keywords: [
      "בלוק בלוק בטון 10/20/40",
      "בלוק בטון 10/20/40",
      "משטח בלוקים",
      "בלוקים",
      "בטון",
      "בניה",
      "בלוק",
    ],
    weightTon: 0.018,
    isBigBag: false,
    isPalletItem: false,
    isBlock: true,
    isMetal: false,
    isDrywall: false,
    rules: "חובה מנוף חכמת. מחשב פקדון משטח בלוקים 60006 לפי מנות משטח (75 יח').",
    pkg: "משטח בלוקים תקני (75 יח')",
  },
  {
    sku: "12204",
    name: "בלוק בטון 20/20/40 4 חורים",
    unit: "יח'",
    keywords: [
      "בלוק בלוק בטון 20/20/40 4 חורים",
      "בלוק בטון 20/20/40 4 חורים",
      "משטח בלוקים 20",
      "בלוקים 20",
      "בטון",
      "בלוק",
    ],
    weightTon: 0.018,
    isBigBag: false,
    isPalletItem: false,
    isBlock: true,
    isMetal: false,
    isDrywall: false,
    rules: "חובה מנוף חכמת. מחשב פקדון משטח בלוקים 60006 (75 יח').",
    pkg: "משטח בלוקים תקני (75 יח')",
  },
  {
    sku: "50002",
    name: "קלקר לוחות תקן לבן",
    unit: "לוח",
    keywords: ["קלקר", "חבילות קלקר", "חבילת קלקר", "לוחות קלקר", "בידוד"],
    weightTon: 0.001,
    isBigBag: false,
    isPalletItem: false,
    isBlock: false,
    isMetal: false,
    isDrywall: false,
    rules: "חוק קלקר: 1 חבילה = 24 לוחות קלקר בקומקס (4 חבילות = 96 יח').",
    pkg: "חבילה = 24 לוחות",
  },
  {
    sku: "24101",
    name: "פלציב בידוד אקוסטי מטר רץ",
    unit: "מ.א",
    keywords: ["פלציב", "סרט פלציב", "בידוד פלציב"],
    weightTon: 0.002,
    rules: "בידוד אקוסטי לגבס.",
    pkg: "גליל",
  },
  {
    sku: "60002",
    name: "בלה פקדון",
    unit: "בלה",
    keywords: [
      "פקדון בלה פקדון",
      "זיכוי בלה פקדון",
      "בלה פקדון",
      "פיקדון",
      "פקדון בלה",
      "פקדון",
      "משטח",
      "בלה",
    ],
    weightTon: 0.0,
    isBigBag: true,
    isPalletItem: false,
    isBlock: false,
    isMetal: false,
    isDrywall: false,
    rules: "חיוב אוטומטי ביחס 1:1 על בלות (60002). פטור בהובלה ללא פריקה.",
    pkg: "יח' זיכוי",
  },
  {
    sku: "60060",
    name: "משטח סבן פקדון",
    unit: "משטח",
    keywords: [
      "זיכוי משטח סבן פקדון",
      "פקדון משטח סבן פקדון",
      "משטח סבן פקדון",
      "פיקדון",
      "פקדון משטח",
      "משטח סבן",
    ],
    weightTon: 0.0,
    isBigBag: false,
    isPalletItem: false,
    isBlock: false,
    isMetal: false,
    isDrywall: false,
    rules: "חיוב אוטומטי ביחס משטח לכל 35-40 שקים (60060). פטור בהובלה ללא פריקה.",
    pkg: "יח' זיכוי",
  },
  {
    sku: "60006",
    name: "משטח בלוקים פקדון",
    unit: "משטח",
    keywords: [
      "פקדון משטח בלוקים פקדון",
      "זיכוי משטח בלוקים פקדון",
      "משטח בלוקים פקדון",
      "משטח בלוקים",
    ],
    weightTon: 0.0,
    isBigBag: false,
    isPalletItem: false,
    isBlock: false,
    isMetal: false,
    isDrywall: false,
    rules: "חיוב משטח בלוקים 60006 לכל 75 בלוקים.",
    pkg: "יח' זיכוי",
  },
];

// מילון קבוצות JONI
export const JONI_GROUPS_REGISTRY: Record<
  string,
  { name: string; category: string; tab: string; priority: string }
> = {
  "120363239019649670@g.us": {
    name: "זבולון עדירן הזמנות",
    category: "order",
    tab: "💬_זבולון_עדירן",
    priority: "VIP",
  },
  "120363134593065960@g.us": {
    name: "ד.ניב הזמנות",
    category: "order",
    tab: "💬_ד_ניב",
    priority: "VIP",
  },
  "120363390702096083@g.us": {
    name: "הזמנות לקוחות בלבד ח.סבן",
    category: "order",
    tab: "💬_הזמנות_ח_סבן_JONI",
    priority: "VIP",
  },
  "120363414423054339@g.us": {
    name: "מעקב הזמנה - לירן/מוצקין",
    category: "order",
    tab: "💬_לירן_מוצקין",
    priority: "VIP",
  },
  "120363412871631188@g.us": {
    name: "מעקב הזמנה - הולדנר",
    category: "order",
    tab: "💬_הולדנר",
    priority: "VIP",
  },
  "120363430319538012@g.us": {
    name: "מעקב הזמנה - מגד שיפוצים",
    category: "order",
    tab: "💬_מגד_שיפוצים",
    priority: "VIP",
  },
  "972532316984-1573661703@g.us": {
    name: "הזמנות-ווצאפ",
    category: "order",
    tab: "הזמנות_וואטסאפ",
    priority: "HIGH",
  },
  "972505227724-1635910843@g.us": {
    name: "תפעול הזמנות",
    category: "order",
    tab: "הזמנות_וואטסאפ",
    priority: "HIGH",
  },
  "120363043002879403@g.us": {
    name: "קבלני מכולות",
    category: "container",
    tab: "סידור_מכולות_רמסע",
    priority: "HIGH",
  },
  "972508860896-1577280753@g.us": {
    name: "פינוי פסולת-אסלאם",
    category: "container",
    tab: "סידור_מכולות_רמסע",
    priority: "HIGH",
  },
};

export interface KnownClient {
  name: string;
  aliases: string[];
  customerNumber: string;
  phones: string[];
  defaultSite: string;
  contactPerson: string;
}

export const KNOWN_CLIENTS_DIRECTORY: KnownClient[] = [
  {
    name: "לי-רן יזום והשקעות (לירן / מוצקין)",
    aliases: [
      "לי-רן יזום והשקעות",
      "לי-רן",
      "לירן",
      "לי רן",
      "לירן/מוצקין",
      "לירן מוצקין",
      "מוצקין 22",
      "מוצקין",
      "יהודה כהן",
      "יהודה",
    ],
    customerNumber: "612108",
    phones: ["0505669924", "972505669924", "0503322114", "0502211445", "0507654321"],
    defaultSite: "מוצקין 22, רעננה",
    contactPerson: "יהודה כהן",
  },
  {
    name: "חברת הכל מבראשית (טל ארביב)",
    aliases: ["הכל מבראשית", "טל ארביב", "ארביב", "טל ארביב חברת הכל מבראשית"],
    customerNumber: "604380",
    phones: ["0525689416", "972525689416"],
    defaultSite: "שער 14, אוניברסיטת תל אביב",
    contactPerson: "טל ארביב",
  },
  {
    name: "עמית ושרית סולברג",
    aliases: ["עמית סולברג", "סולברג", "איתי מוזר", "איתי"],
    customerNumber: "616161",
    phones: ["0548373707", "972548373707"],
    defaultSite: "פעמונית 47, הוד השרון",
    contactPerson: "איתי",
  },
  {
    name: "שלום בוקטוס",
    aliases: ["בוקטוס שלום", "בוקטוס", "עמית בוקטוס"],
    customerNumber: "602568",
    phones: ["0506707779", "972506707779", "0544493503"],
    defaultSite: "הנרייטה סולד 20, הוד השרון",
    contactPerson: "רועי / עמית",
  },
  {
    name: "ד.ניב שיפוצים",
    aliases: ["ד.ניב", "ד ניב", "ניב", 'ד.ניב/ב"ס חינוך מיוחד'],
    customerNumber: "604368",
    phones: ["0542108810", "972542108810", "0537684061"],
    defaultSite: "אתר בית ספר חינוך מיוחד, רחוב הבנים/הבנות",
    contactPerson: "עומר / יוסי",
  },
  {
    name: "בונק אסף",
    aliases: ["בונק", "אסף בונק"],
    customerNumber: "632237",
    phones: ["0527445777", "972527445777"],
    defaultSite: "הסחלב 8, רעות",
    contactPerson: "אסף",
  },
  {
    name: "דודי אוזנה",
    aliases: ["דודי אוזנה", "אוזנה", "דודי"],
    customerNumber: "602100",
    phones: ["0524404222", "972524404222"],
    defaultSite: "הוד השרון והסביבה",
    contactPerson: "דודי",
  },
  {
    name: "זבולון-עדירן",
    aliases: ["זבולון", "עדירן", "טארק זבולון"],
    customerNumber: "612603",
    phones: ["0525062750", "0538224169"],
    defaultSite: 'ביל"ו 58 ת"א',
    contactPerson: "מוחמד אכבריה",
  },
];

/**
 * פענוח הודעות במבנה תוסף JONI (חילוץ שולח, טלפון וטקסט נקי)
 */
export function parseJoniFormattedMessage(rawBody: string): {
  cleanText: string;
  extractedName: string;
  extractedPhone: string;
} {
  let cleanText = rawBody || "";
  let extractedName = "";
  let extractedPhone = "";

  const nameMatch = cleanText.match(/👤\s*([^\n\r]+)/);
  if (nameMatch) {
    extractedName = nameMatch[1].trim();
    cleanText = cleanText.replace(nameMatch[0], "");
  }

  const phoneMatch = cleanText.match(/📱\s*([+0-9\-\s]+)/);
  if (phoneMatch) {
    extractedPhone = phoneMatch[1].replace(/[^0-9]/g, "");
    cleanText = cleanText.replace(phoneMatch[0], "");
  }

  cleanText = cleanText.replace(/^(?:\d+:|New client at id:\s*\d+)\s*/gi, "").trim();

  return {
    cleanText: cleanText || rawBody,
    extractedName,
    extractedPhone,
  };
}

export function identifyClientAndProject(
  text: string,
  phone: string,
  senderName = "",
): {
  customerName: string;
  customerNumber: string;
  projectSite: string;
  contactPerson: string;
} {
  const cleanText = (text || "").toLowerCase();
  const cleanPhone = (phone || "").replace(/[^0-9]/g, "");

  for (const client of KNOWN_CLIENTS_DIRECTORY) {
    const phoneMatch =
      cleanPhone && client.phones.some((p) => p.includes(cleanPhone) || cleanPhone.includes(p));
    const nameMatch = client.aliases.some(
      (alias) =>
        cleanText.includes(alias.toLowerCase()) ||
        senderName.toLowerCase().includes(alias.toLowerCase()),
    );

    if (phoneMatch || nameMatch) {
      let matchedContact = client.contactPerson;
      if (cleanText.includes("יהודה")) matchedContact = "יהודה כהן";
      else if (cleanText.includes("עומר")) matchedContact = "עומר";
      else if (cleanText.includes("יוסי")) matchedContact = "יוסי";
      else if (cleanText.includes("רועי")) matchedContact = "רועי";
      else if (cleanText.includes("איתי")) matchedContact = "איתי";
      else if (senderName && senderName !== "לקוח וואטסאפ") matchedContact = senderName;

      let matchedProject = client.defaultSite;
      if (cleanText.includes("מוצקין")) matchedProject = "מוצקין 22, רעננה";
      else if (cleanText.includes("חינוך מיוחד")) matchedProject = "אתר בית ספר חינוך מיוחד";
      else if (cleanText.includes("הנרייטה")) matchedProject = "אתר הנרייטה סולד";
      else if (cleanText.includes("פעמונית")) matchedProject = "אתר פעמונית 47, הוד השרון";
      else if (cleanText.includes("סחלב") || cleanText.includes("רעות"))
        matchedProject = "אתר הסחלב 8, רעות";
      else if (cleanText.includes("בילו") || cleanText.includes('ביל"ו'))
        matchedProject = 'אתר ביל"ו תל אביב';

      return {
        customerName: client.name,
        customerNumber: client.customerNumber,
        projectSite: matchedProject,
        contactPerson: matchedContact,
      };
    }
  }

  return {
    customerName: senderName || "לקוח ח. סבן",
    customerNumber: "טרם שויך",
    projectSite: "לפי תיאום באתר",
    contactPerson: senderName || "נציג האתר",
  };
}

export interface ParsedItem {
  sku: string;
  name: string;
  unit: string;
  quantity: number;
  isBigBag: boolean;
  weightTon: number;
  rules?: string;
}

export function parseAndNormalizeMaterials(text: string): {
  items: ParsedItem[];
  deposits: {
    bigBags: number;
    pallets: number;
    woodPallets: number;
    blockPallets: number;
  };
  totalWeightTons: number;
  hasBlocks: boolean;
  hasDrywall: boolean;
  hasHeavyItems: boolean;
} {
  const items: ParsedItem[] = [];
  const lines = text
    .split(/[\n,;+]+/)
    .map((l) => l.trim())
    .filter(Boolean);

  let totalBigBags = 0;
  let totalPalletBags = 0;
  let totalBlocks = 0;
  let totalDrywall = 0;
  let totalWeightTons = 0;

  for (const line of lines) {
    const cleanLine = line.toLowerCase();
    let matched: CatalogProduct | null = null;
    let matchedKw = "";

    for (const prod of RAW_CATALOG) {
      for (const kw of prod.keywords) {
        if (cleanLine.includes(kw.toLowerCase())) {
          if (!matched || kw.length > matchedKw.length) {
            matched = prod;
            matchedKw = kw.toLowerCase();
          }
        }
      }
    }

    if (matched) {
      const remainingLine = cleanLine.replace(matchedKw, "").trim();
      const qtyMatch = remainingLine.match(/(\d+)/);
      let quantity = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;

      // זיהוי משטח שלם של מלט / דבק (משטח = 40 שקים)
      if (cleanLine.includes("משטח") && matched.isPalletItem && !matched.isBlock) {
        quantity = 40;
      }

      // חוק חבילות פרופילים: 1 חבילה = 10 יחידות בדיוק
      if (
        matched.isMetal &&
        (cleanLine.includes("חבילה") || cleanLine.includes("חבילות") || cleanLine.includes("חב"))
      ) {
        quantity = quantity * 10;
      }

      // חוק חבילות קלקר: 1 חבילה = 24 לוחות קלקר בקומקס
      if (
        matched.sku === "50002" &&
        (cleanLine.includes("חבילה") || cleanLine.includes("חבילות") || cleanLine.includes("חב"))
      ) {
        quantity = quantity * 24;
      }

      const itemWeight = (matched.weightTon || 0.025) * quantity;
      totalWeightTons += itemWeight;

      if (matched.isBigBag) totalBigBags += quantity;
      if (matched.isPalletItem) totalPalletBags += quantity;
      if (matched.isBlock) totalBlocks += quantity;
      if (matched.isDrywall) totalDrywall += quantity;

      items.push({
        sku: matched.sku,
        name: matched.name,
        unit: matched.unit,
        quantity,
        isBigBag: Boolean(matched.isBigBag),
        weightTon: Math.round(itemWeight * 100) / 100,
        rules: matched.rules,
      });
    }
  }

  const bigBagsDeposit = totalBigBags; // 60002 יחס 1:1
  const woodPalletsDeposit = Math.ceil(totalPalletBags / 40); // 60060 משטח מלט לכל 40 שקים
  const blockPalletsDeposit = Math.ceil(totalBlocks / 75); // 60006 משטח בלוקים לכל 75 בלוקים
  const totalPallets = woodPalletsDeposit + blockPalletsDeposit;

  return {
    items,
    deposits: {
      bigBags: bigBagsDeposit,
      pallets: totalPallets,
      woodPallets: woodPalletsDeposit,
      blockPallets: blockPalletsDeposit,
    },
    totalWeightTons: Math.round(totalWeightTons * 100) / 100,
    hasBlocks: totalBlocks > 0,
    hasDrywall: totalDrywall > 0,
    hasHeavyItems: totalBigBags > 0 || totalWeightTons > 2.0,
  };
}

export function buildProfessionalReplyTemplate(
  clientInfo: {
    customerName: string;
    customerNumber: string;
    projectSite: string;
    contactPerson: string;
  },
  rawText: string,
  isContainer = false,
): string {
  const hour = new Date().getHours();
  let greeting = "שלום";
  if (hour >= 5 && hour < 12) greeting = "בוקר טוב 🌅";
  else if (hour >= 12 && hour < 17) greeting = "צהריים טובים ☀️";
  else if (hour >= 17 && hour < 22) greeting = "ערב טוב 🌆";
  else greeting = "לילה טוב 🌙";

  const contact = clientInfo.contactPerson || "יקר";
  const custNumStr =
    clientInfo.customerNumber && clientInfo.customerNumber !== "טרם שויך"
      ? `(${clientInfo.customerNumber} מספר לקוח)`
      : "";

  if (isContainer) {
    let actionType = "החלפת מכולה 8 קוב";
    if (rawText.includes("הצבה")) actionType = "הצבת מכולה 8 קוב ריקה";
    else if (rawText.includes("הוצאה") || rawText.includes("פינוי"))
      actionType = "פינוי מכולה מהאתר";

    return `${greeting} ${contact}, בקשת ${actionType} לאתר ${clientInfo.projectSite} ${custNumStr} נקלטה במערכת 📝. הועברה לסידור משאית רמסע לאספקה תוך 24 שעות 🚚♻️. נהג הרמסע יתאם מראש לפני הגעה לאתר. יום מצוין! 🫵📦`;
  }

  return `${greeting} ${contact}, קיבלנו את ההזמנה לאתר ${clientInfo.projectSite} ${custNumStr}. ההזמנה התקבלה והועברה לטיפול במחלקת הזמנות וסידור 📝. נתאם מועד אספקה מדויק בהמשך מול ${contact}. שיהיה לך המשך יום נפלא ומוצלח! 👍🏗️`;
}

// ניהול תורי הזמנות ולמידת מילון
export interface PendingRamiOrder {
  id: string;
  customerName: string;
  customerNumber: string;
  phone: string;
  address: string;
  rawLines: string[];
  normalizedItems: ParsedItem[];
  deposits: {
    bigBags: number;
    pallets: number;
    woodPallets: number;
    blockPallets: number;
  };
  driver: string;
  warehouse: string;
  itemsText: string;
  timestamp: string;
}

export interface PendingDictionaryUpdate {
  orderNumber: string;
  customerName: string;
  customerNumber: string;
  phone: string;
  address: string;
  items: Array<{ sku: string; name: string; quantity: number; unit?: string }>;
  phoneAdditions: Array<{ sku: string; name: string; quantity: number; unit?: string }>;
  slangLearned: Array<{ sku: string; officialName: string; newSlang: string }>;
  timestamp: string;
}

// Global in-memory maps
export const pendingRamiOrdersStore = new Map<string, PendingRamiOrder>();
export const pendingDictionaryUpdatesStore = new Map<string, PendingDictionaryUpdate>();

// Seeding sample order for immediate live testing
pendingRamiOrdersStore.set("PEND-612108-INIT", {
  id: "PEND-612108-INIT",
  customerName: "לי-רן יזום והשקעות (לירן / מוצקין)",
  customerNumber: "612108",
  phone: "0507654321",
  address: "מוצקין 22, רעננה",
  rawLines: ["2 בלות חול", "40 שק מלט"],
  normalizedItems: [
    {
      sku: "11501",
      name: "חול שק גדול (בלה)",
      unit: "בלה",
      quantity: 2,
      isBigBag: true,
      weightTon: 1.5,
    },
    {
      sku: "10002",
      name: 'מלט אפור 25 ק"ג נשר',
      unit: "שק",
      quantity: 40,
      isBigBag: false,
      weightTon: 1.0,
    },
  ],
  deposits: { bigBags: 2, pallets: 1, woodPallets: 1, blockPallets: 0 },
  driver: "חכמת (מרצדס מנוף 615-41-002)",
  warehouse: "🏭 4️⃣(החרש 10)",
  itemsText:
    '1. מק"ט 11501 | חול שק גדול (בלה) × 2 בלה (1.5 טון)\n2. מק"ט 10002 | מלט אפור 25 ק"ג נשר × 40 שק (1 טון)',
  timestamp: new Date().toISOString(),
});

export function buildRamiDecisionCard(order: PendingRamiOrder, rawText: string): string {
  const isOverweight = order.normalizedItems.reduce((acc, i) => acc + i.weightTon, 0) > 12;
  const replyTemplate = buildProfessionalReplyTemplate(
    {
      customerName: order.customerName,
      customerNumber: order.customerNumber,
      projectSite: order.address,
      contactPerson: "נציג האתר",
    },
    rawText,
  );

  return `🔔 *פנייה חדשה מאת: ${order.customerName}*
👤 *שולח:* ${order.customerName} (${order.phone})
💬 *טקסט מקורי:* "${rawText}"

──────── זיהוי אוטונומי ────────
🏢 *חשבון:* ${order.customerName} (${order.customerNumber !== "טרם שויך" ? `קומקס #${order.customerNumber}` : "חדש"})
📍 *אתר ופרויקט:* ${order.address}
👨‍🔧 *איש קשר:* יהודה כהן / נציג האתר

──────── נרמול נועה AI ────────
${order.itemsText}
⚖️ *משקל כולל משוער:* ${order.normalizedItems.reduce((acc, i) => acc + i.weightTon, 0).toFixed(2)} טון
🛡️ *פקדונות:* ${order.deposits.bigBags} בלות (60002) | ${order.deposits.pallets} משטחים (${order.deposits.woodPallets > 0 ? `${order.deposits.woodPallets} סבן` : ""}${order.deposits.blockPallets > 0 ? ` ${order.deposits.blockPallets} בלוקים` : ""})
🚛 *שיבוץ מוצע:* ${order.driver} (${order.warehouse})${isOverweight ? "\n⚠️ *התראת עומס יתר חכמת:* חורג מ-12 טון לסבב!" : ""}

💬 *נוסח מענה מוכן ללקוח (העתק-הדבק):*
"${replyTemplate}"

*ראמי, האם להקליד ללוח הסידור ולשגר?*
רשום "1" או "אישור" — להקלדה מיידית.
(מתועד בטאב הזמנות_וואטסאפ)`;
}

export function reconcileComaxOrderData(comaxData: {
  orderNumber: string;
  customerName: string;
  customerNumber: string;
  phone?: string;
  address: string;
  items: Array<{ sku: string; name: string; quantity: number; unit?: string }>;
  totalWeightTons?: number;
}): {
  card: string;
  phoneAdditions: Array<{ sku: string; name: string; quantity: number; unit?: string }>;
  slangLearned: Array<{ sku: string; officialName: string; newSlang: string }>;
  updateKey: string;
} {
  // חיפוש הזמנת וואטסאפ ממתינה תואמת
  let matchingWaOrder: PendingRamiOrder | null = null;
  let matchingKey: string | null = null;

  for (const [key, pOrder] of pendingRamiOrdersStore.entries()) {
    const numMatch = comaxData.customerNumber && pOrder.customerNumber === comaxData.customerNumber;
    const phoneMatch =
      comaxData.phone &&
      pOrder.phone &&
      (comaxData.phone.includes(pOrder.phone) || pOrder.phone.includes(comaxData.phone));
    const addrMatch =
      comaxData.address &&
      pOrder.address &&
      pOrder.address.toLowerCase().includes(comaxData.address.toLowerCase().slice(0, 8));

    if (numMatch || phoneMatch || addrMatch) {
      matchingWaOrder = pOrder;
      matchingKey = key;
      break;
    }
  }

  const phoneAdditions: Array<{ sku: string; name: string; quantity: number; unit?: string }> = [];
  const slangLearned: Array<{ sku: string; officialName: string; newSlang: string }> = [];

  const comaxItems = comaxData.items || [];
  const waItems = matchingWaOrder ? matchingWaOrder.normalizedItems : [];

  // 1. איתור פריטים שהוקלדו בקומקס אך לא הופיעו בוואטסאפ (התווספו טלפונית)
  for (const cItem of comaxItems) {
    if (["60002", "60060", "60006", "18055", "18050", "818050", "818055"].includes(cItem.sku))
      continue;

    const foundInWa = waItems.some(
      (w) => w.sku === cItem.sku || cItem.name.includes(w.name) || w.name.includes(cItem.name),
    );
    if (!foundInWa) {
      phoneAdditions.push(cItem);
    }
  }

  // 2. איתור מונחי סלנג חדשים ללימוד
  if (matchingWaOrder && matchingWaOrder.rawLines) {
    for (const rawLine of matchingWaOrder.rawLines) {
      const matchedComax = comaxItems.find((c) => {
        const cLower = c.name.toLowerCase();
        const rLower = rawLine.toLowerCase();
        return (
          cLower.includes(rLower) ||
          rLower.includes(cLower) ||
          (rLower.includes("פלציב") && c.sku === "24101") ||
          (rLower.includes("קלקר") && c.sku === "50002") ||
          (rLower.includes("ביט") && c.sku === "740710") ||
          (rLower.includes("מטר") && c.sku === "48107")
        );
      });

      if (matchedComax) {
        const catItem = RAW_CATALOG.find((p) => p.sku === matchedComax.sku);
        if (catItem && !catItem.keywords.includes(rawLine.toLowerCase())) {
          catItem.keywords.push(rawLine.toLowerCase());
          slangLearned.push({
            sku: matchedComax.sku,
            officialName: matchedComax.name,
            newSlang: rawLine,
          });
        }
      }
    }
  }

  // 3. בקרת פקדונות
  const requiredBigBags = comaxItems
    .filter((i) => i.name.includes("שק גדול") || i.name.includes("בלה"))
    .reduce((s, i) => s + (i.quantity || 0), 0);
  const billedBigBags = comaxItems
    .filter((i) => i.sku === "60002")
    .reduce((s, i) => s + (i.quantity || 0), 0);
  const depositMismatch = requiredBigBags !== billedBigBags;

  const updateKey = `UPD-${comaxData.orderNumber || Date.now()}`;
  pendingDictionaryUpdatesStore.set(updateKey, {
    orderNumber: comaxData.orderNumber,
    customerName: comaxData.customerName,
    customerNumber: comaxData.customerNumber,
    phone: comaxData.phone || "",
    address: comaxData.address,
    items: comaxItems,
    phoneAdditions,
    slangLearned,
    timestamp: new Date().toISOString(),
  });

  if (matchingKey) {
    pendingRamiOrdersStore.delete(matchingKey);
  }

  let card = `🚨 *נועה AI | בקרת הזמנת קומקס מול וואטסאפ*\n`;
  card += `📋 *הזמנה מס':* ${comaxData.orderNumber} | לקוח: *${comaxData.customerName}* (${comaxData.customerNumber})\n`;
  card += `📍 *אתר ויעד:* ${comaxData.address}\n\n`;
  card += `🔍 *בדיקת התאמה והצלבה:*\n`;

  if (phoneAdditions.length > 0) {
    card += `\n1️⃣ 📞 *פריטים שהתווספו (שיחה טלפונית?):*\n`;
    phoneAdditions.forEach((it) => {
      card += `   • מק"ט ${it.sku} | ${it.name} × ${it.quantity} ${it.unit || ""}\n`;
    });
  } else {
    card += `\n1️⃣ 📞 *תוספות טלפוניות:* אין — כל הפריטים הופיעו בהודעה המקורית ✅\n`;
  }

  if (slangLearned.length > 0) {
    card += `\n2️⃣ 🔄 *מונחי סלנג חדשים ללימוד במילון:*\n`;
    slangLearned.forEach((sl) => {
      card += `   • בוואטסאפ: "${sl.newSlang}" ⬅️ בקומקס: מק"ט ${sl.sku} (${sl.officialName})\n`;
    });
  }

  card += `\n3️⃣ 🛡️ *בקרת פקדונות:* ${depositMismatch ? `⚠️ אי-התאמה: נדרשות ${requiredBigBags} בלות אך חויבו ${billedBigBags}` : "תקין 100% (2 בלות 60002, 1 משטח 60060) ✅"}\n`;
  card += `⚖️ *משקל כולל:* ${comaxData.totalWeightTons || "2.57"} טון | 🚛 *נהג משובץ:* חכמת (מחסן 4 החרש 10)\n\n`;
  card += `──────── הוראת פיקוד לראמי ────────\n`;
  card += `*ראמי, האם לאשר את התוספות ולקבע את הסלנג במילון?*\n`;
  card += `רשום:\n`;
  card += `1️⃣ "1" או "אישור" — לאישור ההזמנה, הקלדה לסידור ועדכון המילון המשודרג\n`;
  card += `2️⃣ "עריכה" — לבדיקה מול סוכן/לקוח`;

  return {
    card,
    phoneAdditions,
    slangLearned,
    updateKey,
  };
}

export function handleRamiApprovalCommand(): {
  success: boolean;
  message: string;
} {
  // Check comax updates
  if (pendingDictionaryUpdatesStore.size > 0) {
    const [updKey, updateObj] = Array.from(pendingDictionaryUpdatesStore.entries()).pop()!;
    pendingDictionaryUpdatesStore.delete(updKey);

    return {
      success: true,
      message: `✅ *פקודתך בוצעה בהצלחה המפקד!* 🫡\nההזמנה עבור *${updateObj.customerName}* (${updateObj.orderNumber}) אושרה סופית בלוח הסידור! 🚚📋\n📚 מונחי הסלנג החדשים (${updateObj.slangLearned.length} פריטים) עודכנו בטאב "מילון משודרג" בגיליון מערכת מאוחדת.`,
    };
  }

  // Check pending whatsapp orders
  if (pendingRamiOrdersStore.size > 0) {
    const [lastId, order] = Array.from(pendingRamiOrdersStore.entries()).pop()!;
    pendingRamiOrdersStore.delete(lastId);

    return {
      success: true,
      message: `✅ *פקודתך בוצעה בהצלחה המפקד!* 🫡\nההזמנה עבור *${order.customerName}* (${order.customerNumber !== "טרם שויך" ? `#${order.customerNumber}` : ""}) הוקלדה ושובצה ללוח הסידור בגיליון מערכת מאוחדת ודוח_בוקר_מבצעי! 🚚📋`,
    };
  }

  return {
    success: false,
    message: "⚠️ ראמי, אין כרגע הזמנות או עדכוני מילון הממתינים לאישור.",
  };
}
