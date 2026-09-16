const https = require("https");
const http = require("http");

const SUPABASE_URL = "https://ozcbyuftmfitkocrgfov.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const EMAIL_USER = process.env.EMAIL_USER || "mutazima24@gmail.com";
const EMAIL_TO = "mutaz@respark-os.com";

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http;
    const req = mod.request(url, options, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    });
    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function sendEmail({ type, name, contact, section, detail, priority }) {
  const subject = `ملاحظة جديدة على تصور سوق طبي — ${type || "عام"}`;
  const bodyText = `
ملاحظة جديدة على تصور سوق طبي — ريسبارك

الاسم: ${name || "-"}
التواصل: ${contact || "-"}
نوع الملاحظة: ${type || "-"}
القسم: ${section || "-"}
الأولوية: ${priority || "-"}

التفصيل:
${detail}
  `;

  // Send via FormSubmit (free, reliable for static sites)
  const formData = new URLSearchParams();
  formData.append("_subject", subject);
  formData.append("_captcha", "false");
  formData.append("_template", "table");
  formData.append("_autoresponse", "شكراً لملاحظتك! ستُراجع من قبل فريق ريسبارك.");
  formData.append("الاسم", name || "-");
  formData.append("التواصل", contact || "-");
  formData.append("النوع", type || "-");
  formData.append("القسم", section || "-");
  formData.append("الأولوية", priority || "-");
  formData.append("التفصيل", detail);

  try {
    const result = await makeRequest("https://formsubmit.co/mutaz@respark-os.com", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });
    console.log("FormSubmit response:", result.status, result.body.substring(0, 100));
    return result.status === 200 || result.status === 302;
  } catch (err) {
    console.error("FormSubmit error:", err);
    return false;
  }
}

async function saveToSupabase(data) {
  try {
    const payload = JSON.stringify({
      customer_name: data.name || "",
      contact: data.contact || "",
      note_type: data.type || "",
      section: data.section || "",
      detail: data.detail || "",
      priority: data.priority || "",
      page_url: data.page_url || "",
      user_agent: data.userAgent || "",
    });

    const result = await makeRequest(`${SUPABASE_URL}/rest/v1/suq_tibbi_feedback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        Prefer: "return=minimal",
      },
      body: payload,
    });

    console.log("Supabase response:", result.status);
    return result.status === 201;
  } catch (err) {
    console.error("Supabase error:", err);
    return false;
  }
}

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = req.body;

  if (!body || !body.detail || !body.detail.trim()) {
    return res.status(400).json({ error: "detail is required" });
  }

  // Save to Supabase
  const dbOk = await saveToSupabase(body);

  // Send email via FormSubmit
  const emailOk = await sendEmail(body);

  if (dbOk || emailOk) {
    return res.status(200).json({
      success: true,
      message: "Feedback saved",
      db: dbOk,
      email: emailOk,
    });
  } else {
    return res.status(500).json({ error: "Failed to save feedback" });
  }
};
