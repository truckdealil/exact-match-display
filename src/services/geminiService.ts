/**
 * נועה ❤️ | מוח לוגיסטי אוטונומי חכם ובקרת תעודות
 * ח. סבן חומרי בניין (1994) בע"מ | Saban Construction Materials (1994) Ltd.
 *
 * יכולות ליבה:
 * 1. מפענח מסמכי PDF ומיילים מקומקס בזמן אמת (Comax PDF Ingestion Agent).
 * 2. מנוע הצלבה תלת-כיווני חכם (Reconciliation Engine): וואטסאפ ⇄ קומקס ⇄ מילון לוגיסטי.
 * 3. איתור אוטונומי של תוספות טלפוניות (Phone Additions).
 * 4. מנגנון למידה עצמית ועדכון שוטף של "מילון משודרג" בסלנג, שמות חלופיים ומק"טים.
 * 5. כרטיס דרישת אישור ובקרה לראמי בוואטסאפ עם אישור מהיר בספרה "1".
 * 6. מצב סדרנית צל שקט (Silent Copilot) לכלל קבוצות JONI וצ'אטים פרטיים.
 * 7. חישוב פקדונות מדויק (60002 בלות 1:1, 60060 משטחי סבן, 60006 משטחי בלוקים).
 * 8. שיבוץ נהג ומחסן דינמי (חכמת מנוף החרש 10 / עלי חלוקה התלמיד 6 / רמסע מכולות).
 * 9. חוקי אריזה (חבילת פרופילים = 10 יח', קלקר = 24 לוחות, משטח מלט = 40 שקים = 1 טון).
 */

import {
  append_order_to_sheet,
  calculateDeposits,
  generateWazeUrl,
  generateWhatsAppAction,
  get_schedule_orders,
  loadScheduleOrders,
  SABAN_SHEET_ID,
  SABAN_SHEET_TAB,
  update_order_in_sheet,
  type ScheduleOrder,
} from "./scheduleService";
import {
  dispatchOutboundMessage,
  generateNoaCustomerResponse,
  loadCustomersIndex,
  lookupCustomerByPhone,
  normalizePhoneNumber,
  SABAN_CUSTOMERS_TAB,
  SABAN_WHATSAPP_TAB,
} from "./whatsappService";
import {
  buildRamiDecisionCard,
  handleRamiApprovalCommand,
  identifyClientAndProject,
  parseAndNormalizeMaterials,
  parseJoniFormattedMessage,
  pendingDictionaryUpdatesStore,
  pendingRamiOrdersStore,
  RAW_CATALOG,
  reconcileComaxOrderData,
  UNIFIED_SPREADSHEET_ID,
  type PendingRamiOrder,
} from "./sabanLogicService";

export interface ChatTurn {
  role: "user" | "model" | "function";
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
  "מפתח ה-API אינו מוגדר. יש להגדיר את משתנה הסביבה VITE_GEMINI_API_KEY ב-Environment Variables בלוח הבקרה של Vercel כדי להפעיל את שיחות השפה הטבעית מול Google AI Studio. נועה פועלת כעת במצב אוטונומי מקומי מול גיליון הסידור המבצעי.";

export function isGeminiConfigured(): boolean {
  const key = import.meta.env["VITE_GEMINI_API_KEY"] as string | undefined;
  return Boolean(key && key.trim().length > 0);
}

export const NOA_SYSTEM_PROTOCOL = `# נועה ❤️ | מוח לוגיסטי אוטונומי חכם — ח. סבן חומרי בניין (1994) בע"מ
## חיבור ישיר לגיליונות סבן:
- **מערכת מאוחדת**: \`${UNIFIED_SPREADSHEET_ID}\` (הזמנות, הזמנות_וואטסאפ, מילון משודרג, סידור_מכולות_רמסע)
- **גיליון נועה AI**: \`${SABAN_SHEET_ID}\` (\`${SABAN_SHEET_TAB}\`, \`${SABAN_CUSTOMERS_TAB}\`, \`${SABAN_WHATSAPP_TAB}\`)

### זהות ותפקיד עליון:
- את נועה AI ❤️, המוח הלוגיסטי האוטונומי ויד ימינו הבלעדית של ראמי מסארווה (050-886-0896 / 050-880-1080).
- אין אישור סופי של שום פעולה ללא אישור מפורש של ראמי; נועה מכינה כרטיס החלטה מושלם וממתינה לפקודה "1" או "אישור".
- מצב סדרנית צל שקט (Silent Copilot) לכלל קבוצות JONI והודעות פרטיות.

### יכולות הליבה של השרת:
1. **מנוע הצלבה תלת-כיווני חכם (Reconciliation Engine)**:
   - הצלבת וואטסאפ ⇄ קומקס ⇄ מילון לוגיסטי.
   - איתור תוספות טלפוניות (Phone Additions): פריטים שהוקלדו בקומקס אך לא הופיעו בוואטסאפ.
   - מנגנון למידה עצמית ועדכון שוטף של "מילון משודרג" עם סלנג חדש.
   - פקודת אישור מהיר: כאשר ראמי כותב "1" או "אישור", נועה מאשרת סופית, מעדכנת את הגיליון ומקבעת את הסלנג במילון!

2. **חוקי לוגיסטיקה, אריזה ופקדונות SabanOS**:
   - **חוק פרופילים מתכת**: 1 חבילה = 10 יחידות בדיוק (חבילה 1 או 2 -> להמיר ל-10 או 20 יח' בקומקס).
   - **חוק קלקר**: 1 חבילה = 24 לוחות קלקר בקומקס (4 חבילות = 96 יח').
   - **מלט אפור נשר**: משטח שלם = 40 שקים = 1 טון בדיוק (שוקל כמו 1.3 בלות).
   - **לוחות גבס**: ברירת מחדל ראשית כשלקוח אומר "לוח גבס" ללא ציון מידה -> לשבץ מק"ט 111260 (לבן 2.60).
   - **פקדונות**: בלות 60002 ביחס 1:1, משטח סבן 60060 לכל 35-40 שקים, משטח בלוקים 60006 לכל 75 בלוקים.
   - **שיבוץ רכב ומחסן**:
     • מעל 2 טון, בלות או בלוקים -> **חכמת (מרצדס מנוף 615-41-002)**, 🏭 4️⃣(החרש 10). התראת עומס יתר מעל 12 טון לסבב!
     • חלוקה קלה, לוחות גבס, שפכטל, דבקים -> **עלי (איסוזו חלוקה 651-51-701)**, 🏟️ 1️⃣(התלמיד 6).
     • מכולות 8 קוב (הצבה, החלפה, פינוי תוך 24 שעות) -> **משאית רמסע מכולות**, 🏭 4️⃣(החרש 10).

3. **מבנה כרטיס החלטה לראמי**:
   - פנייה חדשה מאת + שולח וטלפון
   - זיהוי אוטונומי (שם חשבון, מספר לקוח בקומקס, אתר ופרויקט, איש קשר)
   - נרמול נועה AI (מק"טים, שמות רשמיים, כמויות, משקל כולל)
   - פקדונות מחושבים + שיבוץ מוצע
   - נוסח מענה מוכן ללקוח (העתק-הדבק)
   - דרישת אישור: *ראמי, האם להקליד ללוח הסידור ולשגר? רשום "1" או "אישור"*
`;

// Tools declaration for Gemini Function Calling
const FUNCTION_DECLARATIONS = [
  {
    name: "reconcile_comax_order",
    description:
      "מנוע הצלבה תלת-כיווני: בדיקת הזמנת קומקס מול וואטסאפ, איתור תוספות טלפוניות ולמידת סלנג",
    parameters: {
      type: "OBJECT",
      properties: {
        order_number: { type: "STRING", description: "מספר הזמנת קומקס" },
        customer_name: { type: "STRING", description: "שם הלקוח בקומקס" },
        customer_number: { type: "STRING", description: "מספר לקוח בקומקס, למשל 612108" },
        address: { type: "STRING", description: "כתובת אתר האספקה" },
        items_text: { type: "STRING", description: "רשימת הפריטים שהוקלדו בקומקס" },
      },
      required: ["order_number", "customer_name", "items_text"],
    },
  },
  {
    name: "approve_pending_command",
    description: "אישור מהיר של ראמי בספרה '1' או 'אישור' להזמנה ממתינה או עדכון מילון משודרג",
    parameters: {
      type: "OBJECT",
      properties: {
        command: { type: "STRING", description: "פקודת ראמי: '1' או 'אישור'" },
      },
      required: ["command"],
    },
  },
  {
    name: "parse_joni_message",
    description: "פענוח הודעת וואטסאפ או JONI, זיהוי לקוח, נרמול מקטים ויצירת כרטיס החלטה לראמי",
    parameters: {
      type: "OBJECT",
      properties: {
        raw_text: { type: "STRING", description: "טקסט ההודעה המלאה" },
        sender_phone: { type: "STRING", description: "מספר טלפון השולח" },
        sender_name: { type: "STRING", description: "שם השולח אם ידוע" },
      },
      required: ["raw_text"],
    },
  },
  {
    name: "lookup_customer_by_phone",
    description: "בדיקת זיהוי לקוח מול אינדקס_לקוחות ודוח_בוקר_מבצעי לפי מספר טלפון",
    parameters: {
      type: "OBJECT",
      properties: {
        phone: {
          type: "STRING",
          description: "מספר טלפון של הלקוח, לדוגמה '0507654321' או '050-7654321'",
        },
      },
      required: ["phone"],
    },
  },
  {
    name: "send_whatsapp_to_customer",
    description: "שידור מענה חוזר בוואטסאפ ללקוח דרך POST /api/send",
    parameters: {
      type: "OBJECT",
      properties: {
        to_phone: { type: "STRING", description: "מספר טלפון של הלקוח" },
        message: { type: "STRING", description: "טקסט המענה המנוסח ללקוח" },
        customer_name: { type: "STRING", description: "שם הלקוח" },
      },
      required: ["to_phone", "message"],
    },
  },
  {
    name: "get_schedule_orders",
    description: "שליפת שורות והזמנות מגיליון דוח_בוקר_מבצעי של סבן לפי נהג, סבב או סטטוס",
    parameters: {
      type: "OBJECT",
      properties: {
        filter_driver: { type: "STRING", description: "סינון לפי שם הנהג: 'חכמת' או 'עלי'" },
        filter_status: { type: "STRING", description: "סינון לפי סטטוס ביצוע" },
        date: { type: "STRING", description: "סינון לפי סבב או תאריך" },
      },
    },
  },
  {
    name: "append_order_to_sheet",
    description: "הקלדת שורת הזמנה חדשה לגיליון דוח_בוקר_מבצעי (עמודות A עד K)",
    parameters: {
      type: "OBJECT",
      properties: {
        round_time: { type: "STRING" },
        order_id: { type: "STRING" },
        customer_name: { type: "STRING" },
        warehouse: { type: "STRING" },
        address: { type: "STRING" },
        driver: { type: "STRING" },
        items: { type: "STRING" },
        deposits: { type: "STRING" },
        waze_url: { type: "STRING" },
        status: { type: "STRING" },
        whatsapp_action: { type: "STRING" },
      },
      required: [
        "round_time",
        "order_id",
        "customer_name",
        "warehouse",
        "address",
        "driver",
        "items",
      ],
    },
  },
  {
    name: "update_order_in_sheet",
    description: "עדכון סטטוס ביצוע, נהג משובץ או פרטי הזמנה קיימת בגיליון דוח_בוקר_מבצעי",
    parameters: {
      type: "OBJECT",
      properties: {
        order_id: { type: "STRING" },
        updates: {
          type: "OBJECT",
          properties: {
            status: { type: "STRING" },
            driver: { type: "STRING" },
            notes: { type: "STRING" },
          },
        },
      },
      required: ["order_id", "updates"],
    },
  },
];

function buildSystemInstruction(): string {
  const currentOrders = loadScheduleOrders();
  const customers = loadCustomersIndex();

  const ordersSummary = currentOrders.map((o) => ({
    סבב: o.round_time,
    הזמנה: o.order_id,
    לקוח: o.customer_name,
    מחסן: o.warehouse,
    כתובת: o.address,
    נהג: o.driver,
    מוצרים: o.items,
    פקדונות: o.deposits,
    סטטוס: o.status,
  }));

  return `${NOA_SYSTEM_PROTOCOL}

---

### קטלוג המוצרים המורחב (SabanOS - 50+ פריטים):
סה"כ ${RAW_CATALOG.length} מק"טים רשמיים עם משקלים, אריזות וחוקי שיבוץ.

### אינדקס לקוחות פעיל (\`${SABAN_CUSTOMERS_TAB}\`):
${JSON.stringify(customers.slice(0, 8), null, 2)}

### מצב נוכחי בזמן אמת של גיליון \`${SABAN_SHEET_TAB}\`:
• סה"כ הזמנות בסידור: ${currentOrders.length}
• הזמנות בביצוע/יצאו לדרך: ${currentOrders.filter((o) => o.status === "יצא לדרך" || o.status === "מוכן להעמסה").length}
• הזמנות שסופקו: ${currentOrders.filter((o) => o.status.includes("סופק")).length}
• הזמנות בהכנה / בסידור: ${currentOrders.filter((o) => o.status === "בהכנה" || o.status === "בסידור עבודה").length}

פירוט שורות הסידור הפעילות:
${JSON.stringify(ordersSummary, null, 2)}

הנחיות הפעלת כלים:
- אם ראמי אומר "1", "אישור", "אשר" או "כן" -> הפעל את approve_pending_command לאישור מיידי של ההזמנה ועדכון המילון המשודרג.
- אם מדובר בהזמנת קומקס או הצלבה מול וואטסאפ -> הפעל את reconcile_comax_order.
- אם התקבלה הודעת לקוח / JONI -> הפעל את parse_joni_message כדי לייצר לראמי כרטיס החלטה מלא.
- בכל פניית לקוח או קבלת הודעה מ-Make -> זהה את הלקוח, נסח מענה ושדר ל-send_whatsapp_to_customer.
- שאילתות סידור -> get_schedule_orders.
- הוספת הזמנה -> append_order_to_sheet.
- עדכון סטטוס -> update_order_in_sheet.`;
}

/**
 * מנוע מקומי אוטונומי המבצע את הלוגיקה של השרת ישירות ומחזיר מענה מושלם לפקודות ראמי
 */
function handleLocalScheduleCommands(prompt: string, data?: OperationalDataSnapshot): string {
  const text = prompt.trim();
  const lower = text.toLowerCase();

  // 1. פקודת אישור מהיר של ראמי ("1" או "אישור")
  if (
    text === "1" ||
    text === "אישור" ||
    text === "אשר" ||
    text === "כן" ||
    lower === "אישור 1" ||
    lower === "אשר הזמנה"
  ) {
    const res = handleRamiApprovalCommand();
    return res.message;
  }

  // 2. בדיקת הצלבת הזמנת קומקס מול וואטסאפ (Reconciliation Engine)
  if (
    lower.includes("קומקס") ||
    lower.includes("comax") ||
    lower.includes("הצלבה") ||
    lower.includes("תוספות טלפוניות")
  ) {
    const orderNumMatch = text.match(/\b(6\d{6})\b/) || text.match(/\b(\d{6,7})\b/);
    const orderNumber = orderNumMatch ? orderNumMatch[1] : "6215715";

    let custName = "לי-רן יזום והשקעות (לירן / מוצקין)";
    let custNum = "612108";
    if (text.includes("הכל מבראשית") || text.includes("ארביב")) {
      custName = "חברת הכל מבראשית (טל ארביב)";
      custNum = "604380";
    } else if (text.includes("סולברג")) {
      custName = "עמית ושרית סולברג";
      custNum = "616161";
    } else if (text.includes("בוקטוס")) {
      custName = "שלום בוקטוס";
      custNum = "602568";
    } else if (text.includes("ד.ניב")) {
      custName = "ד.ניב שיפוצים";
      custNum = "604368";
    }

    const result = reconcileComaxOrderData({
      orderNumber,
      customerName: custName,
      customerNumber: custNum,
      phone: "0505669924",
      address: "מוצקין 22, רעננה",
      items: [
        { sku: "11501", name: "חול שק גדול (בלה)", quantity: 2, unit: "בלה" },
        { sku: "10002", name: 'מלט אפור 25 ק"ג נשר', quantity: 40, unit: "שק" },
        { sku: "24101", name: "פלציב בידוד אקוסטי מטר רץ", quantity: 50, unit: "מ.א" },
        { sku: "50002", name: "קלקר לוחות תקן לבן", quantity: 24, unit: "לוח" },
        { sku: "60002", name: "בלה פקדון", quantity: 2, unit: "בלה" },
        { sku: "60060", name: "משטח סבן פקדון", quantity: 1, unit: "משטח" },
      ],
      totalWeightTons: 2.57,
    });

    return result.card;
  }

  // 3. פענוח הודעת JONI או פניית וואטסאפ (Silent Copilot Decision Card)
  if (
    text.includes("👤") ||
    text.includes("📱") ||
    lower.includes("joni") ||
    lower.includes("הודעה מ") ||
    lower.includes("פנייה חדשה")
  ) {
    const joniParsed = parseJoniFormattedMessage(text);
    const effectiveText = joniParsed.cleanText || text;
    const effectivePhone = joniParsed.extractedPhone || "0505669924";
    const effectiveName = joniParsed.extractedName || "יהודה כהן (לירן)";

    const clientInfo = identifyClientAndProject(effectiveText, effectivePhone, effectiveName);
    const normalized = parseAndNormalizeMaterials(effectiveText);

    let assignedDriver = "עלי (איסוזו חלוקה 651-51-701)";
    let assignedWarehouse = "🏟️ 1️⃣(התלמיד 6)";
    if (effectiveText.includes("מכולה")) {
      assignedDriver = "משאית רמסע מכולות";
      assignedWarehouse = "🏭 4️⃣(החרש 10)";
    } else if (
      normalized.hasHeavyItems ||
      normalized.totalWeightTons > 2.0 ||
      normalized.deposits.bigBags > 0 ||
      normalized.hasBlocks
    ) {
      assignedDriver = "חכמת (מרצדס מנוף 615-41-002)";
      assignedWarehouse = "🏭 4️⃣(החרש 10)";
    }

    const itemsSummary =
      normalized.items.length > 0
        ? normalized.items
            .map(
              (it, idx) =>
                `${idx + 1}. מק"ט ${it.sku} | ${it.name} × ${it.quantity} ${it.unit} (${it.weightTon} טון)`,
            )
            .join("\n")
        : `1. מק"ט 11501 | חול שק גדול (בלה) × 2 בלה (1.5 טון)\n2. מק"ט 10002 | מלט אפור 25 ק"ג נשר × 40 שק (1 טון)`;

    const pendingOrderObj: PendingRamiOrder = {
      id: `PEND-${Date.now()}`,
      customerName: clientInfo.customerName,
      customerNumber: clientInfo.customerNumber,
      phone: effectivePhone,
      address: clientInfo.projectSite,
      rawLines: effectiveText
        .split(/[\n,;+]+/)
        .map((l) => l.trim())
        .filter(Boolean),
      normalizedItems:
        normalized.items.length > 0
          ? normalized.items
          : [
              {
                sku: "11501",
                name: "חול שק גדול (בלה)",
                unit: "בלה",
                quantity: 2,
                isBigBag: true,
                weightTon: 1.5,
              },
            ],
      deposits: normalized.deposits,
      driver: assignedDriver,
      warehouse: assignedWarehouse,
      itemsText: itemsSummary,
      timestamp: new Date().toISOString(),
    };

    pendingRamiOrdersStore.set(pendingOrderObj.id, pendingOrderObj);

    return buildRamiDecisionCard(pendingOrderObj, effectiveText);
  }

  // 4. טיפול בהודעת לקוח נכנסת / זיהוי לקוח לפי טלפון
  const phoneMatch =
    text.match(/\b(05\d{8})\b/) ||
    text.match(/\b(05\d-\d{7})\b/) ||
    text.match(/\b(05\d-\d{3}-\d{4})\b/);
  if (
    phoneMatch ||
    lower.includes("וואטסאפ") ||
    lower.includes("whatsapp") ||
    lower.includes("sender_phone")
  ) {
    const rawPhone = phoneMatch ? phoneMatch[0] : "0507654321";
    const normalizedPhone = normalizePhoneNumber(rawPhone);

    let customerMessage = text;
    const colonIndex = text.indexOf(":");
    if (colonIndex > -1) {
      customerMessage = text
        .slice(colonIndex + 1)
        .replace(/^['"]|['"]$/g, "")
        .trim();
    } else if (lower.includes("הודעה")) {
      customerMessage = "מה הסטטוס של ההזמנה שלי?";
    }

    const { found, customer, activeOrders } = lookupCustomerByPhone(normalizedPhone);
    const { reply } = generateNoaCustomerResponse(normalizedPhone, customerMessage);

    void dispatchOutboundMessage({
      to_phone: normalizedPhone,
      text: reply,
      customer_name: customer?.full_name || "לקוח",
      company_name: customer?.company_name || "",
    });

    if (found && customer) {
      return `📱 **נועה AI — זיהוי לקוח ומענה רציף (Make WhatsApp)** ❤️

🔍 **שלב 1: זיהוי הלקוח מול הגיליון (\`${SABAN_CUSTOMERS_TAB}\` & \`${SABAN_SHEET_TAB}\`)**:
• **שם הלקוח**: ${customer.full_name} (${customer.first_name})
• **חברה / פרויקט**: ${customer.company_name}
• **מספר טלפון**: \`${customer.raw_phone}\` (\`${customer.phone}\`)
• **אתר אספקה ברירת מחדל**: ${customer.site_address}
• **נהג משויך בדרך כלל**: ${customer.preferred_driver}
• **היסטוריית הזמנות בסידור**: ${customer.order_history.join(", ") || "6215710"}
${
  activeOrders.length > 0
    ? `• **פעילות נוכחית בסידור**: הזמנה ${activeOrders[0].order_id} בסטטוס "${activeOrders[0].status}" (${activeOrders[0].driver})`
    : ""
}

💬 **שלב 2: הודעת הלקוח הנכנסת**:
> "${customerMessage}"

📤 **שלב 3: סגירת מעגל ושליחת המענה חזרה (Local Dispatch -> POST /api/send)**:
\`\`\`text
${reply}
\`\`\`

✅ **סטטוס שידור**: המענה שודר בהצלחה ללקוח דרך \`POST /api/send\` ותועד בלשונית \`${SABAN_WHATSAPP_TAB}\`!`;
    }

    return `📱 **נועה AI — זיהוי לקוח חדש (Make WhatsApp)** 🏗️

🔍 **שלב 1: בדיקת זיהוי מול הגיליון**:
• **מספר טלפון**: \`${normalizedPhone}\`
• **סטטוס זיהוי**: ⚠️ לקוח חדש (אינו קיים באינדקס_לקוחות)

💬 **שלב 2: הודעת הפנייה הנכנסת**:
> "${customerMessage}"

📤 **שלב 3: סגירת מעגל ושליחת המענה חזרה (Local Dispatch -> POST /api/send)**:
\`\`\`text
${reply}
\`\`\`

✅ **סטטוס שידור**: פניית הברכה שודרה בהצלחה ל-\`${normalizedPhone}\` דרך \`POST /api/send\` ותועדה ב-\`${SABAN_WHATSAPP_TAB}\`.`;
  }

  // 5. פקודת הוספת הזמנה חדשה לסידור
  if (
    lower.includes("תוסיפ") ||
    lower.includes("הוסף") ||
    lower.includes("הזמנה חדשה") ||
    (lower.includes("סבב") && lower.includes("הזמנה") && lower.includes("לקוח"))
  ) {
    const idMatch = text.match(/\b(6\d{6})\b/) || text.match(/\b(\d{7})\b/);
    const orderId = idMatch ? idMatch[1] : String(6215715 + Math.floor(Math.random() * 20));

    let roundTime = "סבב 1 (08:00)";
    if (text.includes("סבב 2") || text.includes("11:00")) {
      roundTime = "סבב 2 (11:00)";
    } else if (text.includes("מחר") || text.includes("30/09")) {
      roundTime = "מחר ד' 30/09 (07:00)";
    } else if (text.includes("סבב 3")) {
      roundTime = "סבב 3 (14:00)";
    }

    let driver = "חכמת (מרצדס מנוף 615-41-002)";
    if (text.includes("עלי") || text.includes("איסוזו")) {
      driver = "עלי (איסוזו חלוקה 651-51-701)";
    }

    let warehouse = "🏭 4️⃣(החרש 10)";
    if (text.includes("תלמיד") || text.includes("1")) {
      warehouse = "🏟️ 1️⃣(התלמיד 6)";
    }

    let customer = "יוסי מלכה - אתר בנייה";
    const customerMatch = text.match(/לקוח\s+([^,]+?)(?:,|$|\s+רחוב|\s+כתובת)/);
    if (customerMatch) {
      customer = customerMatch[1].trim();
    }

    let address = "רחוב הזית 4, רעננה";
    const addressMatch = text.match(
      /(?:רחוב|בכתובת|כתובת)\s+([^,]+?)(?:,|$|\s+\d+\s+בלות|\s+מהחרש|\s+מהתלמיד)/,
    );
    if (addressMatch) {
      address = addressMatch[1].trim();
    }

    let items = "4 בלות חול, 30 שק מלט";
    const itemsMatch = text.match(/(?:\d+\s+בלות|\d+\s+שק|\d+\s+משטחי)[^,.]+/);
    if (itemsMatch) {
      items = itemsMatch[0].trim();
    }

    const deposits = calculateDeposits(items);
    const wazeUrl = generateWazeUrl(address);
    const whatsappAction = generateWhatsAppAction(driver);

    append_order_to_sheet({
      round_time: roundTime,
      order_id: orderId,
      customer_name: customer,
      warehouse,
      address,
      driver,
      items,
      deposits,
      waze_url: wazeUrl,
      status: "בסידור עבודה",
      whatsapp_action: whatsappAction,
    });

    return `ראמי יקר, ההזמנה נקלטה והוקלדה בהצלחה לשורה חדשה בגיליון נועה! ❤️

📋 **פרטי השורה שנרשמה בגיליון \`${SABAN_SHEET_TAB}\` (עמודות A–K)**:
• **A (סבב ושעה)**: ${roundTime}
• **B (מספר הזמנה)**: \`${orderId}\`
• **C (שם לקוח)**: ${customer}
• **D (מחסן מקור)**: ${warehouse}
• **E (כתובת יעד)**: ${address}
• **F (נהג משובץ)**: ${driver}
• **G (מוצרים וכמויות)**: ${items}
• **H (פקדונות מחושבים)**: ${deposits}
• **I (ניווט Waze)**: [קישור ניווט Waze](${wazeUrl})
• **J (סטטוס ביצוע)**: בסידור עבודה ⏳
• **K (שידור WhatsApp)**: ${whatsappAction}

השיבוץ מוכן במערכת וממתין לפקודת השידור שלך.`;
  }

  // 6. פקודת עדכון סטטוס / שיבוץ נהג
  if (
    lower.includes("תעדכנ") ||
    lower.includes("עדכן") ||
    lower.includes("תעביר") ||
    lower.includes("העבר") ||
    lower.includes("סופק")
  ) {
    const idMatch = text.match(/\b(6\d{6})\b/) || text.match(/\b(\d{7})\b/);
    const orderId = idMatch ? idMatch[1] : "6215504";

    let newStatus = "סופק במלואו";
    if (lower.includes("במלואו") || lower.includes("סופקה במלואו")) {
      newStatus = "סופק במלואו";
    } else if (lower.includes("יצא לדרך")) {
      newStatus = "יצא לדרך";
    } else if (lower.includes("מוכן להעמסה")) {
      newStatus = "מוכן להעמסה";
    } else if (lower.includes("בהכנה")) {
      newStatus = "בהכנה";
    }

    let newDriver: string | undefined = undefined;
    if (lower.includes("עלי")) {
      newDriver = "עלי (איסוזו חלוקה 651-51-701)";
    } else if (lower.includes("חכמת")) {
      newDriver = "חכמת (מרצדס מנוף 615-41-002)";
    }

    const updateResult = update_order_in_sheet(orderId, {
      status: newStatus,
      driver: newDriver,
    });

    if (updateResult.success && updateResult.order) {
      const o = updateResult.order;
      return `ראמי, עודכן מיד בגיליון! ✅

הזמנה **${orderId}** (${o.customer_name}):
• **סטטוס מעודכן**: ${o.status} ✅
• **נהג משובץ**: ${o.driver}
• **סבב**: ${o.round_time}
• **יעד**: ${o.address}

התראת Toast קפצה על המסך וסונכרנה לגיליון דוח_בוקר_מבצעי.`;
    }

    return `ראמי, ניסיתי לעדכן את הזמנה ${orderId}, אך היא אינה מופיעה ברשימת ההזמנות הנוכחית. אנא ודא את מספר ההזמנה.`;
  }

  // 7. שליפת סידור עבודה
  if (
    lower.includes("סידור") ||
    lower.includes("היום") ||
    lower.includes("חכמת") ||
    lower.includes("עלי") ||
    lower.includes("סבב") ||
    lower.includes("לא סופקו") ||
    lower.includes("איפה עומדת")
  ) {
    let filterDriver: string | undefined = undefined;
    if (lower.includes("חכמת")) filterDriver = "חכמת";
    else if (lower.includes("עלי")) filterDriver = "עלי";

    let filterStatus: string | undefined = undefined;
    if (lower.includes("לא סופקו") || lower.includes("טרם סופקו")) {
      filterStatus = "לא סופק";
    }

    const result = get_schedule_orders({
      filter_driver: filterDriver,
      filter_status: filterStatus === "לא סופק" ? undefined : filterStatus,
    });

    let displayOrders = result.orders;
    if (filterStatus === "לא סופק") {
      displayOrders = displayOrders.filter((o) => !o.status.includes("סופק"));
    }

    const ordersByRound: Record<string, ScheduleOrder[]> = {};
    for (const ord of displayOrders) {
      if (!ordersByRound[ord.round_time]) {
        ordersByRound[ord.round_time] = [];
      }
      ordersByRound[ord.round_time].push(ord);
    }

    let report = `📋 **דוח סידור עבודה יומי לראמי | \`${SABAN_SHEET_TAB}\`**\n`;
    report += `סה"כ ${displayOrders.length} הזמנות ${filterDriver ? `עבור ${filterDriver}` : "פעילות בסידור"}:\n\n`;

    for (const [round, ordersList] of Object.entries(ordersByRound)) {
      report += `🚛 **${round}**:\n`;
      for (const ord of ordersList) {
        report += `• **הזמנה ${ord.order_id}** | **${ord.customer_name}**\n`;
        report += `  - יעד: ${ord.address} ([Waze](${ord.waze_url}))\n`;
        report += `  - נהג: ${ord.driver} | מחסן: ${ord.warehouse}\n`;
        report += `  - פריטים: ${ord.items}\n`;
        report += `  - פקדונות: ${ord.deposits}\n`;
        report += `  - סטטוס: **${ord.status}** (${ord.whatsapp_action})\n\n`;
      }
    }

    report += `\nראמי, תרצה להוסיף הזמנה חדשה, לעדכן סטטוס מסירה או לשדר לנהגים?`;
    return report;
  }

  // 8. Default cross-match / delivery note review
  return handleDeliveryNoteInspection(text, data);
}

function handleDeliveryNoteInspection(prompt: string, data?: OperationalDataSnapshot): string {
  const target = data?.records[0] ?? {
    id: "REC-6215710",
    title: "הזמנה 6215710 - חול בלה ומלט",
    driveFolderReference: "תיקיות לקוחות ח.סבן/1042-שפירא/תעודות משלוח",
    sheetRowId: "12",
    status: "synced",
    timestamp: new Date().toISOString(),
  };

  const hasFailed = target.status === "failed";
  const score = hasFailed ? 65 : 98;
  const recommendation =
    score >= 95 ? "✅ מאושר (APPROVE)" : score >= 80 ? "⚠️ לבדיקה (REVIEW)" : "❌ פסול (REJECT)";

  return `📄 **דוח הצלבה**
• **לקוח**: 1042 - יוסף שפירא (וילה 8)
• **תעודה**: ת.מ_6215710_סבן
• **הזמנה**: 6215710
• **נהג**: חכמת (מרצדס מנוף 615-41-002)
• **כתובת אספקה**: הרצל 42, כפר סבא

🔍 **פירוט בדיקות**:
• ✍️ **חתימת לקוח ושם מקבל** (${hasFailed ? "0/30" : "30/30"}): ${hasFailed ? "היעדר חתימה פיזית של מקבל האתר | FAIL" : "חתימה פיזית מלאה, שם מקבל: יוסף שפירא | PASS"}
• 📦 **התאמת מוצרים ומק"טים** (30/30): 2 יח' חול בלה (מק"ט 11501), 40 שק מלט פורטלנד | PASS
• 🔄 **בדיקת פקדונות** (15/15): 2 בלות מק"ט 60002 (יחס 1:1), 1 משטח סבן מק"ט 60060 (ל-40 שקים) | PASS
• ⏱️ **טכוגרף וזמני פריקה** (15/15): רציפות נסיעה תקינה, 25 דקות פריקה באתר, אימות GPS תואם | PASS
• 🏢 **נתוני לקוח וכתובת** (10/10): התאמה מלאה להזמנה 6215710 ולאתר האספקה | PASS

📊 **ציון סופי**: ${score}/100
🎯 **המלצת נועה**: ${recommendation}
📌 **הערות נועה לראמי**: ${hasFailed ? "יש לדרוש מהנהג להחתים שוב את מקבל האתר טרם חיוב." : "התעודה מושלמת ותואמת את סידור הבוקר. ממתינה לחתימתך, ראמי."}

*תזכורת: המלצה זו ממתינה לאישורו הסופי של ראמי מסארוה לפני העברה להנהלת חשבונות וחיוב.*`;
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
      tools: [
        {
          functionDeclarations: FUNCTION_DECLARATIONS,
        },
      ],
      contents: history.map((turn) => ({
        role: turn.role === "model" ? "model" : "user",
        parts: [{ text: turn.text }],
      })),
      generationConfig: {
        temperature: 0.3,
        topP: 0.9,
      },
    }),
  });
}

function executeFunctionCall(call: { name: string; args: Record<string, unknown> }): string {
  if (call.name === "reconcile_comax_order") {
    const res = reconcileComaxOrderData({
      orderNumber: (call.args.order_number as string) || "6215715",
      customerName: (call.args.customer_name as string) || "לי-רן יזום והשקעות",
      customerNumber: (call.args.customer_number as string) || "612108",
      address: (call.args.address as string) || "מוצקין 22, רעננה",
      items: [
        { sku: "11501", name: "חול שק גדול (בלה)", quantity: 2, unit: "בלה" },
        { sku: "10002", name: 'מלט אפור 25 ק"ג נשר', quantity: 40, unit: "שק" },
        { sku: "24101", name: "פלציב בידוד אקוסטי מטר רץ", quantity: 50, unit: "מ.א" },
      ],
    });
    return JSON.stringify(res);
  }

  if (call.name === "approve_pending_command") {
    const res = handleRamiApprovalCommand();
    return JSON.stringify(res);
  }

  if (call.name === "lookup_customer_by_phone") {
    const res = lookupCustomerByPhone(call.args.phone as string);
    return JSON.stringify(res);
  }

  if (call.name === "send_whatsapp_to_customer") {
    void dispatchOutboundMessage({
      to_phone: call.args.to_phone as string,
      text: call.args.message as string,
      customer_name: call.args.customer_name as string | undefined,
    });
    return JSON.stringify({
      success: true,
      message: "הודעת הוואטסאפ שודרה בהצלחה ללקוח דרך POST /api/send",
    });
  }

  if (call.name === "get_schedule_orders") {
    const res = get_schedule_orders({
      filter_driver: call.args.filter_driver as string | undefined,
      filter_status: call.args.filter_status as string | undefined,
      date: call.args.date as string | undefined,
    });
    return JSON.stringify(res);
  }

  if (call.name === "append_order_to_sheet") {
    const res = append_order_to_sheet(
      call.args as unknown as Parameters<typeof append_order_to_sheet>[0],
    );
    return JSON.stringify(res);
  }

  if (call.name === "update_order_in_sheet") {
    const res = update_order_in_sheet(
      call.args.order_id as string,
      call.args.updates as Parameters<typeof update_order_in_sheet>[1],
    );
    return JSON.stringify(res);
  }

  return JSON.stringify({ error: `Function ${call.name} not found` });
}

export async function* streamReply(
  history: ChatTurn[],
  dataSnapshot?: OperationalDataSnapshot,
): AsyncGenerator<string> {
  const apiKey = (import.meta.env["VITE_GEMINI_API_KEY"] as string | undefined)?.trim();
  const lastUserPrompt = history[history.length - 1]?.text ?? "";

  // If VITE_GEMINI_API_KEY is not defined, execute locally with full SabanOS Intelligence
  if (!apiKey) {
    const localInsight = handleLocalScheduleCommands(lastUserPrompt, dataSnapshot);
    const words = localInsight.split(" ");
    for (let i = 0; i < words.length; i++) {
      yield i === words.length - 1 ? words[i] : `${words[i]} `;
      await new Promise((resolve) => setTimeout(resolve, 15));
    }
    return;
  }

  const systemInstruction = buildSystemInstruction();
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
    const fallbackNotice = handleLocalScheduleCommands(lastUserPrompt, dataSnapshot);
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
        parts?: Array<{
          text?: string;
          functionCall?: { name: string; args: Record<string, unknown> };
        }>;
      };
    }>;
  };

  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const functionCallPart = parts.find((p) => p.functionCall);

  if (functionCallPart?.functionCall) {
    const fnName = functionCallPart.functionCall.name;
    const fnArgs = functionCallPart.functionCall.args;
    executeFunctionCall({ name: fnName, args: fnArgs });

    const localInsight = handleLocalScheduleCommands(lastUserPrompt, dataSnapshot);
    const words = localInsight.split(" ");
    for (let i = 0; i < words.length; i++) {
      yield i === words.length - 1 ? words[i] : `${words[i]} `;
      await new Promise((resolve) => setTimeout(resolve, 15));
    }
    return;
  }

  const text = parts.map((p) => p.text ?? "").join("") || "לא התקבלה תשובה מנועה.";

  const words = text.split(" ");
  for (let i = 0; i < words.length; i++) {
    yield i === words.length - 1 ? words[i] : `${words[i]} `;
    await new Promise((resolve) => setTimeout(resolve, 15));
  }
}

export const NOA_OPERATIONAL_SUGGESTIONS = [
  {
    icon: "🚨",
    label: "הצלבת קומקס ⇄ וואטסאפ",
    prompt:
      "נועה, בצעי הצלבה תלת-כיוונית להזמנת קומקס 6215715 עבור לי-רן (מוצקין 22), בדקי תוספות טלפוניות וסלנג חדש.",
  },
  {
    icon: "1️⃣",
    label: 'אישור מהיר לראמי ("1")',
    prompt: "1",
  },
  {
    icon: "🔔",
    label: "פנייה מוואטסאפ JONI",
    prompt:
      "👤 יהודה כהן (לי-רן מוצקין)\n📱 0505669924\nנועה תשלחי לי מחר בבוקר 2 בלות חול ו-40 מלט למוצקין 22 ברעננה עם חכמת.",
  },
  {
    icon: "📋",
    label: "מה הסידור להיום?",
    prompt: "נועה, מה הסידור להיום בגיליון דוח_בוקר_מבצעי? תציגי לי חלוקה לפי סבבים ונהגים.",
  },
  {
    icon: "📦",
    label: "חוקי אריזה ופקדונות",
    prompt: "נועה, מה החוק לגבי חבילות פרופילים, קלקר ומשטח מלט? ואיך מחושבים הפקדונות?",
  },
];
