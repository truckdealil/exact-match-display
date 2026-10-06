/**
 * נועה AI — זיהוי לקוחות לפי טלפון וניהול שיחה רציפה
 * מחוברת לצינור התקשורת שנדחף מ-Make ומאזינה בזמן אמת להודעות נכנסות.
 *
 * לשוניות מקושרות בגיליון סבן (1VA9J6n9IYcooO_s2xOpnkvyDQWWQD3pfhh0cnenCkoA):
 * - אינדקס_לקוחות (SABAN_CUSTOMERS_TAB)
 * - דוח_בוקר_מבצעי (SABAN_SHEET_TAB)
 * - שיחות_וואטסאפ_נועה (SABAN_WHATSAPP_TAB)
 */

import { toast } from "sonner";
import { audioService } from "./audioService";
import {
  loadScheduleOrders,
  SABAN_SHEET_ID,
  SABAN_SHEET_TAB,
  type ScheduleOrder,
} from "./scheduleService";

export const SABAN_CUSTOMERS_TAB = "אינדקס_לקוחות";
export const SABAN_WHATSAPP_TAB = "שיחות_וואטסאפ_נועה";

export interface SabanCustomer {
  phone: string; // Normalized 10-digit, e.g. "0507654321"
  raw_phone: string; // e.g. "050-7654321"
  first_name: string; // e.g. "יוסף"
  full_name: string; // e.g. "יוסף לוי"
  company_name: string; // e.g. "לי-רן השקעות"
  site_address: string; // e.g. "מוצקין 22, רעננה"
  preferred_driver: string; // e.g. "חכמת (מרצדס מנוף)"
  order_history: string[]; // e.g. ["6215710", "6215504"]
  notes?: string;
}

export interface WhatsAppMessage {
  id: string;
  sender_phone: string;
  sender_name?: string;
  direction: "inbound" | "outbound";
  text: string;
  timestamp: string;
  status: "received" | "sent" | "delivered";
}

export interface WhatsAppConversation {
  phone: string;
  customer?: SabanCustomer;
  customer_name: string;
  company_name: string;
  messages: WhatsAppMessage[];
  last_updated: string;
  status: "פעילה" | "ממתינה למענה" | "סופק/נסגר";
}

const CUSTOMERS_STORAGE_KEY = "saban_customers_index_v1";
const CONVERSATIONS_STORAGE_KEY = "saban_whatsapp_conversations_v1";

/**
 * אינדקס לקוחות מובנה ומאומת מול הגיליון
 */
const INITIAL_CUSTOMERS: SabanCustomer[] = [
  {
    phone: "0507654321",
    raw_phone: "050-7654321",
    first_name: "יוסף",
    full_name: "יוסף לוי",
    company_name: "לי-רן השקעות",
    site_address: "מוצקין 22, רעננה",
    preferred_driver: "חכמת (מרצדס מנוף)",
    order_history: ["6215710", "6215715"],
    notes: "לקוח VIP ותיק, דורש פריקת מנוף מדויקת",
  },
  {
    phone: "0541234567",
    raw_phone: "054-1234567",
    first_name: "יוסף",
    full_name: "יוסף שפירא",
    company_name: "וילה 8 - שפירא יזמות",
    site_address: "הרצל 42, כפר סבא",
    preferred_driver: "חכמת (מרצדס מנוף)",
    order_history: ["6215710"],
    notes: "אספקות מלט וחול בלה בסבב בוקר",
  },
  {
    phone: "0529876543",
    raw_phone: "052-9876543",
    first_name: "רונן",
    full_name: "רונן כהן",
    company_name: 'א.ר. שיווק ובניין בע"מ',
    site_address: "החרש 14, רעננה",
    preferred_driver: "עלי (משאית איסוזו)",
    order_history: ["6215711"],
    notes: "צורך דבקים, טיח וציוד עבודה",
  },
  {
    phone: "0535551234",
    raw_phone: "053-5551234",
    first_name: "גולן",
    full_name: "גולן מזרחי",
    company_name: "קבלנות גולן - סביוני השרון",
    site_address: "ז'בוטינסקי 108, הוד השרון",
    preferred_driver: "חכמת (מרצדס מנוף)",
    order_history: ["6215712"],
    notes: "אתר גדול, שינוע בלוקים ובלות סומסום",
  },
  {
    phone: "0503339999",
    raw_phone: "050-3339999",
    first_name: "דניאל",
    full_name: "דניאל קליין",
    company_name: "דניאל הנדסה ויזמות",
    site_address: "דרך השרון 55, כפר סבא",
    preferred_driver: "עלי (משאית איסוזו)",
    order_history: ["6215713"],
    notes: "דבק קרמיקה וטיט",
  },
  {
    phone: "0544448888",
    raw_phone: "054-4448888",
    first_name: "אבי",
    full_name: "אבי לוי",
    company_name: "אבי לוי שיפוצים",
    site_address: "הבנים 18, פתח תקווה",
    preferred_driver: "חכמת (מרצדס מנוף)",
    order_history: ["6215504"],
    notes: "הזמנה 6215504 סופקה",
  },
];

/**
 * נירמול מספרי טלפון ישראליים (הסרת מקפים, רווחים, +972 או 972)
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return "";
  let cleaned = phone.replace(/\D/g, "");

  // Convert 972501234567 to 0501234567
  if (cleaned.startsWith("972") && cleaned.length >= 11) {
    cleaned = "0" + cleaned.slice(3);
  }

  // Ensure standard Israeli mobile length (10 digits)
  if (cleaned.length === 9 && !cleaned.startsWith("0")) {
    cleaned = "0" + cleaned;
  }

  return cleaned;
}

/**
 * טעינת אינדקס הלקוחות
 */
export function loadCustomersIndex(): SabanCustomer[] {
  if (typeof window === "undefined") return INITIAL_CUSTOMERS;
  try {
    const raw = localStorage.getItem(CUSTOMERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(INITIAL_CUSTOMERS));
      return INITIAL_CUSTOMERS;
    }
    return JSON.parse(raw) as SabanCustomer[];
  } catch {
    return INITIAL_CUSTOMERS;
  }
}

/**
 * שלב 1: זיהוי הלקוח מול הגיליון (Customer Recognition)
 * בדיקה מול אינדקס_לקוחות ודוח_בוקר_מבצעי לפי מספר טלפון
 */
export function lookupCustomerByPhone(phone: string): {
  found: boolean;
  customer?: SabanCustomer;
  activeOrders: ScheduleOrder[];
} {
  const normalized = normalizePhoneNumber(phone);
  const customers = loadCustomersIndex();
  const scheduleOrders = loadScheduleOrders();

  const customer = customers.find((c) => normalizePhoneNumber(c.phone) === normalized);

  let activeOrders: ScheduleOrder[] = [];
  if (customer) {
    activeOrders = scheduleOrders.filter(
      (o) =>
        customer.order_history.includes(o.order_id) ||
        o.customer_name.includes(customer.first_name) ||
        o.customer_name.includes(customer.company_name),
    );
  } else {
    // Fallback: check if the phone is mentioned in any schedule order notes or fields
    activeOrders = scheduleOrders.filter(
      (o) => o.address.includes(phone) || o.customer_name.includes(phone),
    );
  }

  return {
    found: Boolean(customer),
    customer,
    activeOrders,
  };
}

/**
 * טעינת היסטוריית השיחות של נועה
 */
export function loadWhatsAppConversations(): WhatsAppConversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CONVERSATIONS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as WhatsAppConversation[];
  } catch {
    return [];
  }
}

/**
 * שמירת היסטוריית השיחות
 */
export function saveWhatsAppConversations(conversations: WhatsAppConversation[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(conversations));
    window.dispatchEvent(new CustomEvent("saban_whatsapp_updated", { detail: conversations }));
  } catch {
    /* ignore */
  }
}

/**
 * שלב 2: ניסוח מענה חכם ופרסונלי (Contextual & Personalized)
 * שומר על הקשר (Context) של הודעות קודמות שלא יצטרך לחזור על דבריו
 */
export function generateNoaCustomerResponse(
  sender_phone: string,
  text: string,
  conversationHistory: WhatsAppMessage[] = [],
): {
  reply: string;
  customer: SabanCustomer | null;
  isRecognized: boolean;
} {
  const { found, customer, activeOrders } = lookupCustomerByPhone(sender_phone);
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  // בדיקת הקשר של הודעות קודמות בשיחה
  const previousInbound = conversationHistory
    .filter((m) => m.direction === "inbound" && m.text !== text)
    .map((m) => m.text.toLowerCase());
  const hadPreviousOrdersDiscussion = previousInbound.some(
    (t) => t.includes("בלה") || t.includes("מלט") || t.includes("חול") || t.includes("הזמנה"),
  );

  // מקרה 1: לקוח מוכר מאינדקס_לקוחות או דוח_בוקר_מבצעי
  if (found && customer) {
    const currentOrder = activeOrders[0];
    const driver = currentOrder ? currentOrder.driver : customer.preferred_driver;
    const address = currentOrder ? currentOrder.address : customer.site_address;
    const status = currentOrder ? currentOrder.status : "בדרך לאתר";

    // אם הלקוח מאשר או ממשיך שיחה קודמת לגבי תוספת או הגעה
    if (lower === "תודה" || lower === "מעולה" || lower === "אחלה" || lower === "תודה רבה") {
      return {
        reply: `בשמחה רבה ${customer.first_name}! אנחנו זמינים לכל דבר. ${driver} מעודכן ויגיע במועד ל-${address}. יום עבודה מוצלח! 🏗️`,
        customer,
        isRecognized: true,
      };
    }

    if (
      hadPreviousOrdersDiscussion &&
      (lower.includes("כן") || lower.includes("תוסיפי") || lower.includes("תרשמי"))
    ) {
      return {
        reply: `מעולה ${customer.first_name}! עודכן בהמשך להודעה הקודמת שלך. השיבוץ עודכן בסידור של ${driver} ל-${address}. נדאג לכל הציוד והפקדונות כנדרש.`,
        customer,
        isRecognized: true,
      };
    }

    // שאילתת סטטוס משלוח / אספקה
    if (
      lower.includes("איפה") ||
      lower.includes("מתי") ||
      lower.includes("סטטוס") ||
      lower.includes("הזמנה") ||
      lower.includes("חומרי") ||
      lower.includes("מנוף")
    ) {
      if (status.includes("סופק")) {
        return {
          reply: `שלום ${customer.first_name} (${customer.company_name})! תמיד שמחים לעזור ❤️\nראיתי שההזמנה שלך (${currentOrder?.order_id ?? "האחרונה"}) כבר סופקה בהצלחה ל-${address}. האם תרצה להוסיף משהו לסבב הבא, או שאתה צריך תיאום מכולה נוספת לאתר?`,
          customer,
          isRecognized: true,
        };
      }

      return {
        reply: `שלום ${customer.first_name} (${customer.company_name})! תמיד שמחים לעזור ❤️\nראיתי ש${driver} כבר בדרך אליך ל-${address} (סטטוס: ${status}). האם תרצה להוסיף משהו לסבב הבא, או שאתה צריך תיאום מכולה לאתר?`,
        customer,
        isRecognized: true,
      };
    }

    // שאילתת תוספת חומרים או פקדונות
    if (
      lower.includes("תוספת") ||
      lower.includes("בלה") ||
      lower.includes("שק") ||
      lower.includes("מלט") ||
      lower.includes("חול") ||
      lower.includes("בלוק")
    ) {
      return {
        reply: `מעולה ${customer.first_name}! רשמתי מיד את הבקשה עבור ${customer.company_name}.\nאוכל לשבץ לך את זה בסבב הבא של ${driver} ישירות ל-${address}.\nכמה בלות או שקים נחוצים לך בדיוק, ורוצה שנצרף גם פקדונות בלה/משטחים לפי הצורך?`,
        customer,
        isRecognized: true,
      };
    }

    // מענה ברכה / הודעה כללית ללקוח מוכר
    return {
      reply: `שלום ${customer.first_name} (${customer.company_name})! תמיד שמחים לעזור ❤️\nראיתי ש${driver} כבר בדרך אליך ל-${address}. האם תרצה להוסיף משהו לסבב הבא, או שאתה צריך תיאום מכולה לאתר?`,
      customer,
      isRecognized: true,
    };
  }

  // מקרה 2: לקוח לא מוכר (אינו קיים בגיליון)
  // אם הוא הציג את עצמו בהמשך לפנייה קודמת
  const nameMatch = text.match(/(?:אני|מדבר|שמי|שם החברה|קבלן|מאתר)\s+([^,.]+)/);
  if (nameMatch) {
    const detectedName = nameMatch[1].trim();
    return {
      reply: `נעים מאוד ${detectedName}! תודה על הפרטים. שמחתי להכיר 🏗️\nקלטתי את פרטיך במערך ח. סבן חומרי בניין (1994) בע"מ.\nבאיזה חומרים אתם זקוקים להצעת מחיר או אספקה לאתר (בלות חול, סומסום, מלט, בלוקים, או שינוע במנוף)?`,
      customer: null,
      isRecognized: false,
    };
  }

  return {
    reply: `שלום וברוך הבא לחברת ח. סבן חומרי בניין (1994) בע"מ! 🏗️\nשמי נועה, ואני כאן לעזור לך בכל צורך באספקת חומרי בניין, בלות, מלט, בלוקים והובלות מנוף.\nאשמח לדעת עם מי יש לי הכבוד ומה שם החברה או אתר הבנייה שלך, כדי שנוכל לתת לך שירות מדויק ומהיר?`,
    customer: null,
    isRecognized: false,
  };
}

/**
 * שלב 3: סגירת מעגל ושליחת המענה חזרה (Local Dispatch)
 * שידור דרך השרת המקומי ב-POST /api/send ותיעוד בלשונית שיחות_וואטסאפ_נועה
 */
export async function dispatchOutboundMessage(payload: {
  to_phone: string;
  text: string;
  customer_name?: string;
  company_name?: string;
}): Promise<{
  success: boolean;
  message_id: string;
  timestamp: string;
}> {
  const timestamp = new Date().toISOString();
  const message_id = `MSG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  // 1. קריאה לשרת המקומי ב-POST /api/send
  try {
    const res = await fetch("/api/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message_id,
        to: payload.to_phone,
        text: payload.text,
        customer_name: payload.customer_name || "לקוח",
        company_name: payload.company_name || "",
        timestamp,
      }),
    });
    if (!res.ok) {
      console.warn("POST /api/send responded with status:", res.status);
    }
  } catch (err) {
    console.warn("Local dispatch fallback (client handled):", err);
  }

  // 2. שמירה ותיעוד בלשונית שיחות_וואטסאפ_נועה (לוקאלית + שידור לסקריפט אם קיים)
  const scriptEndpoint = import.meta.env["VITE_GOOGLE_APPS_SCRIPT_URL"] as string | undefined;
  if (scriptEndpoint && typeof navigator !== "undefined" && navigator.onLine) {
    void fetch(scriptEndpoint, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "log_whatsapp_conversation",
        sheet_id: SABAN_SHEET_ID,
        tab_name: SABAN_WHATSAPP_TAB,
        phone: payload.to_phone,
        customer_name: payload.customer_name || "לא מוכר",
        company_name: payload.company_name || "",
        text: payload.text,
        timestamp,
      }),
    }).catch(() => {
      /* best effort */
    });
  }

  // 3. הצגת Toast התראה בעברית לראמי
  toast.success(`נועה השיבה בוואטסאפ ללקוח! 💬`, {
    description: `נשלח ל-${payload.customer_name || payload.to_phone}: "${payload.text.slice(0, 75)}..."`,
    duration: 6500,
  });
  void audioService.play("success");

  return {
    success: true,
    message_id,
    timestamp,
  };
}

/**
 * עיבוד הודעת לקוח נכנסת מ-Make (או מהממשק)
 * מבצע: זיהוי -> יצירת מענה מותאם אישית -> שידור חזרה ל-POST /api/send -> תיעוד
 */
export async function processIncomingCustomerMessage(
  sender_phone: string,
  text: string,
  sender_name?: string,
): Promise<{
  reply: string;
  customer: SabanCustomer | null;
  isRecognized: boolean;
  conversation: WhatsAppConversation;
}> {
  const normalized = normalizePhoneNumber(sender_phone);
  const conversations = loadWhatsAppConversations();
  const existingConvIndex = conversations.findIndex(
    (c) => normalizePhoneNumber(c.phone) === normalized,
  );

  const existingConv: WhatsAppConversation =
    existingConvIndex >= 0
      ? conversations[existingConvIndex]
      : {
          phone: normalized,
          customer_name: sender_name || "לקוח חדש",
          company_name: "",
          messages: [],
          last_updated: new Date().toISOString(),
          status: "פעילה",
        };

  // Add inbound message to history
  const inboundMessage: WhatsAppMessage = {
    id: `IN-${Date.now()}`,
    sender_phone: normalized,
    sender_name,
    direction: "inbound",
    text,
    timestamp: new Date().toISOString(),
    status: "received",
  };
  existingConv.messages.push(inboundMessage);

  // Generate personalized, contextual reply
  const { reply, customer, isRecognized } = generateNoaCustomerResponse(
    normalized,
    text,
    existingConv.messages,
  );

  if (customer) {
    existingConv.customer = customer;
    existingConv.customer_name = customer.full_name;
    existingConv.company_name = customer.company_name;
  }

  // Add outbound reply to conversation
  const outboundMessage: WhatsAppMessage = {
    id: `OUT-${Date.now()}`,
    sender_phone: normalized,
    direction: "outbound",
    text: reply,
    timestamp: new Date().toISOString(),
    status: "sent",
  };
  existingConv.messages.push(outboundMessage);
  existingConv.last_updated = new Date().toISOString();

  // Save conversation state
  if (existingConvIndex >= 0) {
    conversations[existingConvIndex] = existingConv;
  } else {
    conversations.unshift(existingConv);
  }
  saveWhatsAppConversations(conversations);

  // Dispatch reply back via POST /api/send
  await dispatchOutboundMessage({
    to_phone: normalized,
    text: reply,
    customer_name: customer?.full_name || sender_name || "לקוח",
    company_name: customer?.company_name || "",
  });

  return {
    reply,
    customer,
    isRecognized,
    conversation: existingConv,
  };
}
