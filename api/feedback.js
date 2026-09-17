const https = require("https");
const http = require("http");

const SUPABASE_URL = "https://ozcbyuftmfitkocrgfov.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

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

module.exports = async (req, res) => {
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

  // Save to Supabase (trigger sends Telegram)
  try {
    const payload = JSON.stringify({
      customer_name: body.name || "",
      contact: body.contact || "",
      note_type: body.type || "",
      section: body.section || "",
      detail: body.detail || "",
      priority: body.priority || "",
      page_url: body.page_url || "",
      user_agent: body.userAgent || "",
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

    console.log("Supabase:", result.status);
  } catch (err) {
    console.error("DB error:", err);
    return res.status(500).json({ error: "Failed to save" });
  }

  return res.status(200).json({ success: true, message: "ok" });
};
