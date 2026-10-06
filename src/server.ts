import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { handleRamiApprovalCommand, reconcileComaxOrderData } from "./services/sabanLogicService";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// In-memory log of dispatched outbound WhatsApp messages
export interface DispatchedMessage {
  id: string;
  to: string;
  text: string;
  customer_name?: string;
  company_name?: string;
  timestamp: string;
}

export interface InboundWebhookPayload {
  sender_phone?: string;
  phone?: string;
  from?: string;
  text?: string;
  message?: string;
  body?: string;
  sender_name?: string;
}

const recentDispatchedMessages: DispatchedMessage[] = [
  {
    id: "MSG-INIT-1",
    to: "0507654321",
    text: "שלום יוסף (לי-רן השקעות)! תמיד שמחים לעזור ❤️ ראיתי שחכמת כבר בדרך אליך למוצקין 22 ברעננה. האם תרצה להוסיף משהו לסבב הבא, או שאתה צריך תיאום מכולה לאתר?",
    customer_name: "יוסף לוי",
    company_name: "לי-רן השקעות",
    timestamp: new Date().toISOString(),
  },
];

// In-memory customer index for server-side lookup
const SERVER_CUSTOMERS = [
  {
    phone: "0507654321",
    raw_phone: "050-7654321",
    first_name: "יוסף",
    full_name: "יוסף לוי",
    company_name: "לי-רן השקעות",
    site_address: "מוצקין 22, רעננה",
    preferred_driver: "חכמת (מרצדס מנוף)",
    order_history: ["6215710", "6215715"],
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
  },
];

function normalizePhone(phone: string): string {
  if (!phone) return "";
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("972") && cleaned.length >= 11) {
    cleaned = "0" + cleaned.slice(3);
  }
  if (cleaned.length === 9 && !cleaned.startsWith("0")) {
    cleaned = "0" + cleaned;
  }
  return cleaned;
}

function generateServerResponse(sender_phone: string, text: string) {
  const normalized = normalizePhone(sender_phone);
  const customer = SERVER_CUSTOMERS.find((c) => normalizePhone(c.phone) === normalized);
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  if (customer) {
    if (
      lower.includes("איפה") ||
      lower.includes("מתי") ||
      lower.includes("סטטוס") ||
      lower.includes("הזמנה")
    ) {
      return {
        reply: `שלום ${customer.first_name} (${customer.company_name})! תמיד שמחים לעזור ❤️\nראיתי ש${customer.preferred_driver} כבר בדרך אליך ל-${customer.site_address}. האם תרצה להוסיף משהו לסבב הבא, או שאתה צריך תיאום מכולה לאתר?`,
        customer,
        isRecognized: true,
      };
    }
    if (
      lower.includes("תוספת") ||
      lower.includes("בלה") ||
      lower.includes("שק") ||
      lower.includes("מלט") ||
      lower.includes("חול")
    ) {
      return {
        reply: `מעולה ${customer.first_name}! רשמתי מיד את הבקשה עבור ${customer.company_name}.\nאוכל לשבץ לך את זה בסבב הבא של ${customer.preferred_driver} ישירות ל-${customer.site_address}.\nכמה בלות או שקים נחוצים לך בדיוק, ורוצה שנצרף גם פקדונות בלה/משטחים לפי הצורך?`,
        customer,
        isRecognized: true,
      };
    }
    return {
      reply: `שלום ${customer.first_name} (${customer.company_name})! תמיד שמחים לעזור ❤️\nראיתי ש${customer.preferred_driver} כבר בדרך אליך ל-${customer.site_address}. האם תרצה להוסיף משהו לסבב הבא, או שאתה צריך תיאום מכולה לאתר?`,
      customer,
      isRecognized: true,
    };
  }

  return {
    reply: `שלום וברוך הבא לחברת ח. סבן חומרי בניין (1994) בע"מ! 🏗️\nשמי נועה, ואני כאן לעזור לך בכל צורך באספקת חומרי בניין, בלות, מלט, בלוקים והובלות מנוף.\nאשמח לדעת עם מי יש לי הכבוד ומה שם החברה או אתר הבנייה שלך, כדי שנוכל לתת לך שירות מדויק ומהיר?`,
    customer: null,
    isRecognized: false,
  };
}

async function handleApiSend(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as {
      to?: string;
      text?: string;
      customer_name?: string;
      company_name?: string;
      message_id?: string;
    };

    const messageId = body.message_id || `MSG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const record: DispatchedMessage = {
      id: messageId,
      to: body.to || "",
      text: body.text || "",
      customer_name: body.customer_name || "לקוח",
      company_name: body.company_name || "",
      timestamp: new Date().toISOString(),
    };

    recentDispatchedMessages.unshift(record);
    if (recentDispatchedMessages.length > 50) {
      recentDispatchedMessages.pop();
    }

    // Forward to Make outbound webhook if configured
    const makeWebhook =
      process.env["MAKE_OUTBOUND_WEBHOOK_URL"] || process.env["VITE_MAKE_WEBHOOK_URL"];
    if (makeWebhook && makeWebhook.startsWith("http")) {
      void fetch(makeWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "outbound_whatsapp_message",
          payload: record,
        }),
      }).catch((err) => console.error("Make outbound forwarding error:", err));
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "הודעת הוואטסאפ שודרה בהצלחה ללקוח (Local Dispatch)",
        message_id: messageId,
        destination: record.to,
        customer_name: record.customer_name,
        timestamp: record.timestamp,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        success: false,
        error: String(err),
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }
}

async function handleMakeWebhook(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as InboundWebhookPayload;
    const rawPhone = body.sender_phone || body.phone || body.from || "0507654321";
    const text = body.text || body.message || body.body || "שלום נועה";
    const normalized = normalizePhone(rawPhone);

    const { reply, customer, isRecognized } = generateServerResponse(normalized, text);
    const messageId = `MSG-MAKE-${Date.now()}`;
    const timestamp = new Date().toISOString();

    const record: DispatchedMessage = {
      id: messageId,
      to: normalized,
      text: reply,
      customer_name: customer?.full_name || body.sender_name || "לקוח",
      company_name: customer?.company_name || "",
      timestamp,
    };

    recentDispatchedMessages.unshift(record);
    if (recentDispatchedMessages.length > 50) {
      recentDispatchedMessages.pop();
    }

    // Forward to Make outbound webhook if configured
    const makeWebhook =
      process.env["MAKE_OUTBOUND_WEBHOOK_URL"] || process.env["VITE_MAKE_WEBHOOK_URL"];
    if (makeWebhook && makeWebhook.startsWith("http")) {
      void fetch(makeWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "outbound_whatsapp_message",
          payload: record,
        }),
      }).catch((err) => console.error("Make outbound forwarding error:", err));
    }

    return new Response(
      JSON.stringify({
        success: true,
        pipeline: "Make Inbound -> Noa AI Recognition -> Local Dispatch",
        isRecognized,
        customer: customer
          ? {
              full_name: customer.full_name,
              first_name: customer.first_name,
              company: customer.company_name,
              site_address: customer.site_address,
              preferred_driver: customer.preferred_driver,
            }
          : null,
        sender_phone: normalized,
        inbound_text: text,
        reply,
        dispatched_message_id: messageId,
        timestamp,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        success: false,
        error: String(err),
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

async function handleComaxPdf(request: Request): Promise<Response> {
  try {
    const comaxData = (await request.json()) as {
      orderNumber: string;
      customerName: string;
      customerNumber: string;
      phone?: string;
      address: string;
      items: Array<{ sku: string; name: string; quantity: number; unit?: string }>;
      totalWeightTons?: number;
    };

    if (!comaxData || !comaxData.orderNumber) {
      return new Response(JSON.stringify({ error: "Missing comax order data" }), {
        status: 400,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const result = reconcileComaxOrderData(comaxData);
    return new Response(
      JSON.stringify({
        success: true,
        message: "Comax order reconciled successfully",
        card: result.card,
        phoneAdditions: result.phoneAdditions,
        slangLearned: result.slangLearned,
        updateKey: result.updateKey,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}

async function handleRamiCommand(request: Request): Promise<Response> {
  try {
    await request.json().catch(() => ({}));
    const res = handleRamiApprovalCommand();
    return new Response(JSON.stringify(res), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const url = new URL(request.url);

    // Handle OPTIONS CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    // Inbound Comax PDF / Data Reconciliation: POST /api/comax-pdf
    if (url.pathname === "/api/comax-pdf" && request.method === "POST") {
      return handleComaxPdf(request);
    }

    // Rami Quick Command ("1" / "אישור"): POST /api/rami-command
    if (url.pathname === "/api/rami-command" && request.method === "POST") {
      return handleRamiCommand(request);
    }

    // Inbound Make Webhook: POST /api/webhook/make or /api/incoming
    if (
      (url.pathname === "/api/webhook/make" || url.pathname === "/api/incoming") &&
      request.method === "POST"
    ) {
      return handleMakeWebhook(request);
    }

    // Local Dispatch Route: POST /api/send
    if (url.pathname === "/api/send" && request.method === "POST") {
      return handleApiSend(request);
    }

    // Outbound messages list: GET /api/send
    if (url.pathname === "/api/send" && request.method === "GET") {
      return new Response(
        JSON.stringify({
          success: true,
          messages: recentDispatchedMessages,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
