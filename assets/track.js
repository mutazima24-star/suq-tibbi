/* Souq Tibbi demo — first-party visit measurement for the Respark console (no cookies, no third parties).
   One session per tab (sessionStorage), one visitor id per browser (localStorage). Sends: the route, the ad opened,
   visible time, how the visitor entered, the private invite (?v=slug) and whether feedback was sent.
   Place, device and browser are added by /api/track from request headers. */
(function () {
  "use strict";
  const END = "/api/track";
  const store = (s, k, v) => { try { if (v === undefined) return s.getItem(k); s.setItem(k, v); } catch {} return null; };
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
    (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)));
  const L = window.localStorage, S = window.sessionStorage;
  let vid = store(L, "st-vid"); if (!vid) { vid = uuid(); store(L, "st-vid", vid); }
  let sid = store(S, "st-sid"); const fresh = !sid; if (!sid) { sid = uuid(); store(S, "st-sid", sid); }

  const q = new URLSearchParams(location.search);
  const inv = (q.get("v") || "").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40);
  if (inv) { store(S, "st-inv", inv); store(L, "st-inv", inv); }
  const invite = store(S, "st-inv") || store(L, "st-inv") || "";

  let ms = Number(store(S, "st-ms")) || 0;
  let since = document.visibilityState === "visible" ? Date.now() : 0;
  const active = () => ms + (since ? Date.now() - since : 0);
  const save = () => store(S, "st-ms", String(active()));

  const route = () => {
    const h = location.hash.replace(/^#\/?/, "").split(/[/?]/)[0];
    return location.pathname.replace(/\.html$/, "").replace(/\/$/, "") + (h ? "#/" + h : "") || "/";
  };
  function send(kind, extra, beacon) {
    const body = JSON.stringify(Object.assign({ kind, sid, vid, invite, path: route() || "/", active_ms: active() }, extra || {}));
    if (beacon && navigator.sendBeacon) { try { if (navigator.sendBeacon(END, body)) return; } catch {} }
    try { fetch(END, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {}); } catch {}
  }

  const entryFlag = store(S, "st-entry");
  let refHost = "";
  try { refHost = document.referrer ? new URL(document.referrer).host : ""; } catch {}
  const internal = refHost === location.host;
  const utm = {};
  ["source", "medium", "campaign", "content", "term"].forEach((k) => { const v = q.get("utm_" + k); if (v) utm[k] = v.slice(0, 100); });
  // entry: how the visitor reached the market — after the 15s countdown, by skipping it, or straight to /market.
  // A session that starts on the intro and never leaves it keeps no entry.
  const onIntro = route() === "/";
  const entry = entryFlag || (onIntro ? undefined : internal ? "internal" : "direct");
  if (entryFlag) store(S, "st-entry", "");
  send(fresh ? "start" : "page", Object.assign(entry ? { entry } : {}, fresh ? {
    ref_host: internal ? "" : refHost, utm,
    screen: `${screen.width}x${screen.height}`, lang: (navigator.language || "").slice(0, 20),
  } : {}));

  let lastAd = "";
  function onRoute() {
    const m = location.hash.match(/^#\/?ad\/([A-Za-z0-9_-]{1,40})/);
    if (m && m[1] !== lastAd) { lastAd = m[1]; send("item", { item: "ad-" + m[1] }); }
    else if (!m) { lastAd = ""; send("page"); }
  }
  addEventListener("hashchange", onRoute);
  if (/^#\/?ad\//.test(location.hash)) onRoute();

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") { since = Date.now(); return; }
    ms = active(); since = 0; save(); send("ping", null, true);
  });
  addEventListener("pagehide", () => { save(); send("ping", null, true); });
  setInterval(() => { if (since) { save(); send("ping"); } }, 20000);

  window.stTrack = { entry: (how) => store(S, "st-entry", how), feedback: () => send("feedback") };
})();
