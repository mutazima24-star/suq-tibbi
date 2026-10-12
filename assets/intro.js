/* Intro countdown: 7 seconds, shown as a shrinking ring, bar and number, then a
   Shadad-style exit (progress bar + page-out) into the marketplace demo. */
"use strict";
(function () {
  const TOTAL = 7000;
  const TARGET = "/market";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (id) => document.getElementById(id);
  const intro = $("intro"), num = $("count-num"), unit = $("count-unit"), ring = $("ring-fg"),
    bar = $("count-bar"), pause = $("pause"), go = $("go"), sr = $("count-sr"), card = document.querySelector(".count-card");

  const units = (n) => (n === 1 ? "ثانية" : n === 2 ? "ثانيتان" : n >= 3 && n <= 10 ? "ثوانٍ" : "ثانية");
  let elapsed = 0, last = null, paused = false, shown = 7, leaving = false;

  function paint() {
    const left = Math.max(0, TOTAL - elapsed);
    const frac = left / TOTAL;
    ring.style.strokeDashoffset = String(1 - frac);
    bar.style.transform = `scaleX(${frac})`;
    const sec = Math.ceil(left / 1000);
    if (sec !== shown) {
      shown = sec;
      num.textContent = String(sec);
      unit.textContent = units(sec);
      if (!reduce) { num.classList.remove("tick"); void num.offsetWidth; num.classList.add("tick"); }
      if (sec === 3) sr.textContent = "الانتقال بعد 3 ثوانٍ";
    }
  }

  function frame(t) {
    if (leaving) return;
    if (last !== null && !paused) elapsed += Math.min(t - last, 100); // ignore time spent in a background tab
    last = t;
    paint();
    if (elapsed >= TOTAL) return leave();
    requestAnimationFrame(frame);
  }

  function leave() {
    if (leaving) return;
    leaving = true;
    try { sessionStorage.setItem("st-enter", "1"); } catch {}
    if (reduce) { location.href = TARGET; return; }
    const p = $("pageProgress");
    p.classList.remove("run"); void p.offsetWidth; p.classList.add("run");
    intro.classList.add("leaving");
    setTimeout(() => { location.href = TARGET; }, 150);
  }

  pause.addEventListener("click", () => {
    paused = !paused;
    pause.setAttribute("aria-pressed", String(paused));
    pause.textContent = paused ? "استئناف العدّ" : "إيقاف العدّ";
    card.classList.toggle("paused", paused);
  });
  go.addEventListener("click", (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
    e.preventDefault();
    leave();
  });
  // Coming back with the browser's back button restores this page from cache: restart the count.
  window.addEventListener("pageshow", (e) => {
    if (!e.persisted) return;
    leaving = false; elapsed = 0; last = null; shown = 8;
    intro.classList.remove("leaving");
    requestAnimationFrame(frame);
  });

  requestAnimationFrame(frame);
})();
