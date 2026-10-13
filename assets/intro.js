/* Intro: 15-second countdown (ring, number and 15 segments that switch off one per second),
   a particle network background, count-up numbers and a live mini feed in the phone.
   At zero it leaves with the Shadad exit (progress bar + page-out) into /market. */
"use strict";
(function () {
  const TOTAL = 15000;
  const TARGET = "/market";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (id) => document.getElementById(id);
  const intro = $("intro"), hud = document.querySelector(".hud"), num = $("num"), left = $("left"),
    ring = $("ring"), segsEl = $("segs"), pause = $("pause"), go = $("go"), sr = $("sr");
  const SECONDS = TOTAL / 1000;

  // ------------------------------------------------------------ words of the tagline
  document.querySelectorAll("[data-words]").forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute("aria-label", el.textContent.trim());
    el.innerHTML = words.map((w, i) => `<span class="w" aria-hidden="true" style="--i:${i}">${w}</span>`).join(" ");
  });

  // ------------------------------------------------------------ count-up numbers
  document.querySelectorAll("[data-count]").forEach((el, i) => {
    const to = +el.dataset.count;
    if (reduce) { el.textContent = to; return; }
    setTimeout(() => {
      const t0 = performance.now(), dur = 1200;
      const step = (t) => {
        const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(to * e);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, 4100 + i * 110);
  });

  // ------------------------------------------------------------ phone feed from the demo data
  function buildFeed() {
    const feed = $("feed");
    if (!feed || !window.MARKET || !window.illo) return;
    const ads = window.MARKET.ads.slice(0, 9);
    const price = (p) => (p == null ? "على السوم" : p.toLocaleString("en-US") + " ريال");
    const ago = (m) => (m < 60 ? `قبل ${m} دقيقة` : `قبل ${Math.round(m / 60)} ساعة`);
    const row = (a) => {
      const [type, tint, flip] = a.images[0];
      return `<div class="s-ad"><div><b>${a.title}</b><small>${a.city} · ${ago(a.minutes)}</small><em>${price(a.price)}</em>${a.pinned ? '<span class="pin">مميز</span>' : ""}</div><img src="${window.illo(type, tint, flip)}" alt=""></div>`;
    };
    const html = ads.map(row).join("");
    feed.innerHTML = html + html; // doubled for a seamless loop
  }
  buildFeed();

  // ------------------------------------------------------------ particle network
  (function particles() {
    const c = $("fx");
    if (!c || reduce) return;
    const ctx = c.getContext("2d");
    let w, h, dpr, pts = [], mx = -999, my = -999, running = true;
    function size() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = c.clientWidth; h = c.clientHeight;
      c.width = w * dpr; c.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(90, (w * h) / 16000));
      pts = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35, r: Math.random() * 1.6 + .6, g: Math.random() < .35 }));
    }
    function draw() {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
      }
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        for (let j = i + 1; j < pts.length; j++) {
          const b = pts[j], dx = a.x - b.x, dy = a.y - b.y, d = dx * dx + dy * dy;
          if (d < 15000) { ctx.strokeStyle = `rgba(252,184,86,${(1 - d / 15000) * .22})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
        }
        const md = (a.x - mx) ** 2 + (a.y - my) ** 2;
        if (md < 32000) { ctx.strokeStyle = `rgba(255,215,150,${(1 - md / 32000) * .5})`; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mx, my); ctx.stroke(); }
        ctx.fillStyle = a.g ? "rgba(252,184,86,.9)" : "rgba(170,220,230,.55)";
        ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2); ctx.fill();
      }
      requestAnimationFrame(draw);
    }
    size(); draw();
    addEventListener("resize", size);
    addEventListener("pointermove", (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
    document.addEventListener("visibilitychange", () => { running = !document.hidden; if (running) draw(); });
  })();

  // ------------------------------------------------------------ countdown
  segsEl.innerHTML = Array.from({ length: SECONDS }, () => "<i></i>").join("");
  const segs = [...segsEl.children];
  const unit = (n) => (n === 1 ? "ثانية واحدة" : n === 2 ? "ثانيتين" : n >= 3 && n <= 10 ? `${n} ثوانٍ` : `${n} ثانية`);
  let elapsed = 0, last = null, paused = false, shown = -1, leaving = false;

  function paint() {
    const rest = Math.max(0, TOTAL - elapsed);
    ring.style.strokeDashoffset = String(1 - rest / TOTAL);
    const sec = Math.ceil(rest / 1000);
    if (sec === shown) return;
    shown = sec;
    num.textContent = String(sec);
    left.textContent = unit(sec);
    segs.forEach((s, i) => s.classList.toggle("off", i >= sec));
    hud.classList.toggle("final", sec <= 3 && sec > 0);
    if (!reduce) { num.classList.remove("tick"); void num.offsetWidth; num.classList.add("tick"); }
    if (sec === 5) sr.textContent = "الانتقال إلى السوق بعد 5 ثوانٍ";
  }

  function frame(t) {
    if (leaving) return;
    if (last !== null && !paused) elapsed += Math.min(t - last, 100); // background-tab time does not count
    last = t;
    paint();
    if (elapsed >= TOTAL) return leave();
    requestAnimationFrame(frame);
  }

  function leave(how) {
    if (leaving) return;
    if (window.stTrack) window.stTrack.entry(how === "click" ? "intro_click" : "intro_auto");
    leaving = true;
    try { sessionStorage.setItem("st-enter", "1"); } catch {}
    if (reduce) { location.href = TARGET; return; }
    const p = $("pageProgress");
    p.classList.remove("run"); void p.offsetWidth; p.classList.add("run");
    intro.classList.add("leaving");
    document.body.classList.add("leaving");
    setTimeout(() => { location.href = TARGET; }, 150);
  }

  pause.addEventListener("click", () => {
    paused = !paused;
    pause.setAttribute("aria-pressed", String(paused));
    pause.setAttribute("aria-label", paused ? "استئناف العدّ" : "إيقاف العدّ مؤقتاً");
    hud.classList.toggle("paused", paused);
  });
  go.addEventListener("click", (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
    e.preventDefault();
    leave("click");
  });
  addEventListener("pageshow", (e) => {
    if (!e.persisted) return;
    leaving = false; elapsed = 0; last = null; shown = -1;
    intro.classList.remove("leaving"); document.body.classList.remove("leaving");
    requestAnimationFrame(frame);
  });

  requestAnimationFrame(frame);
})();
