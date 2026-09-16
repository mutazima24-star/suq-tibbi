import json
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from http.server import BaseHTTPRequestHandler

# Supabase
SUPABASE_URL = "https://ozcbyuftmfitkocrgfov.supabase.co"
SUPABASE_SERVICE_KEY = ""

# Email config
SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587
EMAIL_USER = "mutazima24@gmail.com"
EMAIL_PASS = ""  # App password
EMAIL_TO = "mutaz@respark-os.com"

def handler(request):
    if request.method == "OPTIONS":
        return ("", 204, {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        })
    
    if request.method != "POST":
        return (json.dumps({"error": "Method not allowed"}), 405, {"Content-Type": "application/json"})
    
    try:
        body = request.json()
    except:
        return (json.dumps({"error": "Invalid JSON"}), 400, {"Content-Type": "application/json"})
    
    if not body.get("detail"):
        return (json.dumps({"error": "detail is required"}), 400, {"Content-Type": "application/json"})
    
    # Save to Supabase
    try:
        import urllib.request
        payload = json.dumps({
            "customer_name": body.get("name", ""),
            "contact": body.get("contact", ""),
            "note_type": body.get("type", ""),
            "section": body.get("section", ""),
            "detail": body.get("detail", ""),
            "priority": body.get("priority", ""),
            "page_url": body.get("page_url", ""),
            "user_agent": body.get("user_agent", ""),
        }).encode()
        
        req = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/suq_tibbi_feedback",
            data=payload,
            method="POST",
            headers={
                "Content-Type": "application/json",
                "apikey": SUPABASE_SERVICE_KEY,
                "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                "Prefer": "return=minimal",
            }
        )
        urllib.request.urlopen(req, timeout=15)
    except Exception as e:
        return (json.dumps({"error": "DB error"}), 500, {"Content-Type": "application/json"})
    
    # Send email notification
    try:
        msg = MIMEMultipart()
        msg["From"] = EMAIL_USER
        msg["To"] = EMAIL_TO
        msg["Subject"] = f"ملاحظة جديدة — {body.get('type', 'عام')}"
        
        body_text = f"""
        ملاحظة جديدة على تصور سوق طبي — ريسبارك
        
        الاسم: {body.get('name', '-')}
        التواصل: {body.get('contact', '-')}
        نوع الملاحظة: {body.get('type', '-')}
        القسم: {body.get('section', '-')}
        الأولوية: {body.get('priority', '-')}
        
        التفصيل:
        {body.get('detail', '')}
        """
        
        msg.attach(MIMEText(body_text, "plain", "utf-8"))
        
        ctx = ssl.create_default_context()
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls(context=ctx)
            server.login(EMAIL_USER, EMAIL_PASS)
            server.send_message(msg)
    except Exception as e:
        # Log error but still return success to user
        print(f"Email error: {e}")
    
    return (json.dumps({"success": True, "message": "Feedback saved"}), 200, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
    })
