/* Feedback widget for the marketplace demo. A floating button opens a full page (Shadad-style
   page-in motion) with a form. Submissions go to /api/market-feedback, which files them as a
   request on the Souq Tibbi client page in the Respark dashboard; a copy is emailed through
   FormSubmit from the browser. */
"use strict";
(function () {
  const EMAIL_ENDPOINT = "https://formsubmit.co/ajax/mutaz@respark-os.com";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const SECTIONS = [
    ["home", "الرئيسية والفلاتر"], ["ad", "صفحة الإعلان"], ["new", "إضافة إعلان"], ["messages", "الرسائل"],
    ["account", "الحساب والمفضلة"], ["design", "التصميم العام والألوان"], ["other", "أخرى"],
  ];
  const TYPES = [["note", "ملاحظة"], ["feature", "إضافة مقترحة"], ["bug", "مشكلة"]];

  function sectionFromHash() {
    const h = location.hash || "#/";
    if (h.startsWith("#/ad/")) return "ad";
    if (h.startsWith("#/new")) return "new";
    if (h.startsWith("#/messages")) return "messages";
    if (/^#\/(account|favorites|user)/.test(h)) return "account";
    return "home";
  }
  function me() { try { return JSON.parse(localStorage.getItem("st-me") || "null") || {}; } catch { return {}; } }

  // ---------------------------------------------------------------- floating button
  const fab = document.createElement("button");
  fab.type = "button";
  fab.className = "fb-fab";
  fab.setAttribute("aria-haspopup", "dialog");
  fab.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M8 9.5h8M8 12.5h5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><span>ملاحظاتك</span>';
  document.body.append(fab);
  const raise = () => fab.classList.toggle("raised", (location.hash || "").startsWith("#/ad/"));
  window.addEventListener("hashchange", raise); raise();

  // ---------------------------------------------------------------- page
  const page = document.createElement("section");
  page.className = "fb";
  page.hidden = true;
  page.setAttribute("role", "dialog");
  page.setAttribute("aria-modal", "true");
  page.setAttribute("aria-labelledby", "fb-title");
  document.body.append(page);
  const progress = document.createElement("div");
  progress.className = "fb-progress";
  progress.setAttribute("aria-hidden", "true");
  document.body.append(progress);

  let opener = null;

  function formHtml() {
    const u = me();
    const cur = sectionFromHash();
    return `
    <div class="fb-in">
      <div class="fb-top rv" style="--i:0">
        <button type="button" class="fb-x" data-fb="close" aria-label="إغلاق والعودة للسوق"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg> العودة للسوق</button>
        <img src="/assets/brand/respark-full.svg" class="fb-rs" alt="Respark" width="96" height="38">
      </div>
      <h2 id="fb-title" class="rv" style="--i:1">شاركنا ملاحظاتك على سوق طبي</h2>
      <p class="fb-lead rv" style="--i:2">رأيك يصل مباشرة إلى فريق ريسبارك ويُسجَّل في لوحة المشروع. اكتب ما لاحظته أو ما تتمنى إضافته.</p>
      <form class="fb-form" id="fb-form" novalidate>
        <fieldset class="fb-types rv" style="--i:3"><legend>نوع الملاحظة</legend>
          ${TYPES.map(([v, l], i) => `<label><input type="radio" name="type" value="${v}" ${i === 0 ? "checked" : ""}><span>${l}</span></label>`).join("")}
        </fieldset>
        <div class="fb-row rv" style="--i:4">
          <label class="fb-f"><span>القسم</span>
            <select name="section">${SECTIONS.map(([v, l]) => `<option value="${v}" ${v === cur ? "selected" : ""}>${l}</option>`).join("")}</select></label>
          <label class="fb-f"><span>الأولوية</span>
            <select name="priority"><option value="normal">عادية</option><option value="urgent">عاجلة</option></select></label>
        </div>
        <label class="fb-f rv" style="--i:5"><span>التفاصيل <b aria-hidden="true">*</b></span>
          <textarea name="detail" rows="6" maxlength="5000" required placeholder="مثال: أتمنى إضافة فلتر حسب الضمان في قسم الأجهزة الطبية."></textarea>
          <small class="fb-err" id="fb-detail-err" hidden>اكتب الملاحظة أولاً (5 أحرف على الأقل).</small></label>
        <div class="fb-row rv" style="--i:6">
          <label class="fb-f"><span>الاسم</span><input name="name" maxlength="120" autocomplete="name" value="${esc(u.name || "")}"></label>
          <label class="fb-f"><span>جوال أو بريد للتواصل</span><input name="contact" maxlength="200" autocomplete="email" dir="ltr" value="${esc(u.phone || "")}"></label>
        </div>
        <input type="text" name="website" class="fb-hp" tabindex="-1" autocomplete="off" aria-hidden="true">
        <div class="fb-actions rv" style="--i:7">
          <button type="submit" class="fb-send">اعتماد وإرسال</button>
          <button type="button" class="fb-cancel" data-fb="close">إلغاء</button>
        </div>
        <p class="fb-status" id="fb-status" role="status" aria-live="polite"></p>
      </form>
    </div>`;
  }

  function doneHtml(ok) {
    return `
    <div class="fb-in fb-done">
      <div class="fb-check rv" style="--i:0" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m6.5 12.5 3.5 3.5 7.5-8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
      <h2 id="fb-title" class="rv" style="--i:1">شكراً، وصلت ملاحظتك</h2>
      <p class="fb-lead rv" style="--i:2">${ok}</p>
      <div class="fb-actions rv" style="--i:3">
        <button type="button" class="fb-send" data-fb="close">العودة للسوق</button>
        <button type="button" class="fb-cancel" data-fb="again">إرسال ملاحظة أخرى</button>
      </div>
    </div>`;
  }

  function run(el, cls) { el.classList.remove("enter-fwd", "leaving", "run"); if (reduce) return; void el.offsetWidth; el.classList.add(cls); }

  function render(html) {
    page.innerHTML = html;
    run(page, "enter-fwd");
    const f = page.querySelector("textarea, .fb-send");
    if (f) f.focus({ preventScroll: true });
  }

  function open() {
    if (!page.hidden) return;
    opener = document.activeElement;
    run(progress, "run");
    page.hidden = false;
    document.documentElement.classList.add("fb-open");
    page.scrollTop = 0;
    render(formHtml());
  }
  function close() {
    if (page.hidden) return;
    const finish = () => {
      page.hidden = true; page.classList.remove("leaving"); page.innerHTML = "";
      document.documentElement.classList.remove("fb-open");
      if (opener && opener.focus) opener.focus({ preventScroll: true });
    };
    if (reduce) return finish();
    run(progress, "run");
    page.classList.add("leaving");
    setTimeout(finish, 150);
  }

  fab.addEventListener("click", open);
  page.addEventListener("click", (e) => {
    const a = e.target.closest("[data-fb]");
    if (!a) return;
    if (a.dataset.fb === "close") close();
    if (a.dataset.fb === "again") render(formHtml());
  });
  document.addEventListener("keydown", (e) => {
    if (page.hidden) return;
    if (e.key === "Escape") { e.preventDefault(); close(); return; }
    if (e.key === "Tab") { // keep focus inside the page
      const items = [...page.querySelectorAll("button, input:not(.fb-hp), select, textarea, a[href]")].filter((x) => !x.disabled);
      if (!items.length) return;
      const first = items[0], lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
    }
  });

  // ---------------------------------------------------------------- submit
  function label(list, v) { const x = list.find(([k]) => k === v); return x ? x[1] : v; }

  async function sendEmail(d, requestId) {
    const body = {
      _subject: `ملاحظة جديدة على سوق طبي: ${label(TYPES, d.type)}${requestId ? ` (طلب #${requestId})` : ""}`,
      _template: "table", _captcha: "false",
      "النوع": label(TYPES, d.type), "القسم": label(SECTIONS, d.section),
      "الأولوية": d.priority === "urgent" ? "عاجلة" : "عادية",
      message: d.detail, name: d.name || "زائر", "وسيلة التواصل": d.contact || "لم تُذكر",
      "الصفحة": location.href, "رقم الطلب في لوحة ريسبارك": requestId ? `#${requestId}` : "لم يُحفظ",
    };
    if (/@/.test(d.contact)) body._replyto = d.contact;
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 10000);
    try {
      const r = await fetch(EMAIL_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(body), signal: ctrl.signal });
      const j = await r.json().catch(() => ({}));
      return r.ok && (j.success === true || j.success === "true");
    } catch { return false; } finally { clearTimeout(t); }
  }

  async function saveRequest(d) {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 12000);
    try {
      const r = await fetch("/api/market-feedback", {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: ctrl.signal,
        body: JSON.stringify({ ...d, page: location.href.slice(0, 500) }),
      });
      const j = await r.json().catch(() => ({}));
      return r.ok && j.success ? j.id || true : null;
    } catch { return null; } finally { clearTimeout(t); }
  }

  page.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const fd = new FormData(form);
    const d = {
      type: fd.get("type") || "note", section: fd.get("section") || "other", priority: fd.get("priority") || "normal",
      detail: String(fd.get("detail") || "").trim(), name: String(fd.get("name") || "").trim(),
      contact: String(fd.get("contact") || "").trim(), website: String(fd.get("website") || ""),
    };
    const err = page.querySelector("#fb-detail-err");
    if (d.detail.length < 5) { err.hidden = false; form.detail.setAttribute("aria-invalid", "true"); form.detail.focus(); return; }
    err.hidden = true; form.detail.removeAttribute("aria-invalid");
    if (d.website) return;
    const btn = form.querySelector(".fb-send"), status = page.querySelector("#fb-status");
    btn.disabled = true; btn.textContent = "جارٍ الإرسال…"; status.textContent = "";

    const id = await saveRequest(d);
    if (id && window.stTrack) window.stTrack.feedback();
    const mailed = await sendEmail(d, typeof id === "number" ? id : null);
    if (!id && !mailed) {
      btn.disabled = false; btn.textContent = "اعتماد وإرسال";
      status.textContent = "تعذّر الإرسال الآن. تحقق من الاتصال وحاول مرة أخرى؛ ما كتبته محفوظ في النموذج.";
      status.classList.add("bad");
      return;
    }
    const msg = id
      ? "سُجّلت ملاحظتك في لوحة ريسبارك تحت صفحة مشروع سوق طبي" + (typeof id === "number" ? ` برقم #${id}` : "") + (mailed ? "، وأُرسلت نسخة منها إلى فريق ريسبارك بالبريد." : ".")
      : "أُرسلت ملاحظتك إلى فريق ريسبارك بالبريد.";
    render(doneHtml(esc(msg)));
  });
})();
