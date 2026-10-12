'use strict';
// Original flat product illustrations for demo listings (no external images).
// Each returns SVG markup for a 400x300 canvas; `tint` sets the backdrop.
(function () {
  const tints = [
    ['#e8f1fe', '#d3e4fc'], ['#e9f7f3', '#cfeee4'], ['#fdf1e7', '#fbe0c9'],
    ['#f1edfd', '#e0d8fb'], ['#eef3f6', '#dae5ec'], ['#fdeef0', '#f9d7dc']
  ];
  const ink = '#26384a', steel = '#9fb1c1', light = '#ffffff', blue = '#2f6fdf', teal = '#14a38b', red = '#e5484d';

  const parts = {
    wheelchair: `
      <circle cx="175" cy="190" r="62" fill="none" stroke="${ink}" stroke-width="10"/>
      <circle cx="175" cy="190" r="48" fill="none" stroke="${steel}" stroke-width="3"/>
      <circle cx="175" cy="190" r="8" fill="${ink}"/>
      <path d="M150 85 L150 160 L250 160 L268 228" fill="none" stroke="${ink}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="150" y="135" width="105" height="22" rx="8" fill="${blue}"/>
      <rect x="135" y="80" width="26" height="70" rx="8" fill="${blue}"/>
      <path d="M150 85 L125 80" stroke="${ink}" stroke-width="8" stroke-linecap="round"/>
      <circle cx="272" cy="236" r="14" fill="none" stroke="${ink}" stroke-width="7"/>
      <path d="M255 160 L290 205" stroke="${ink}" stroke-width="7" stroke-linecap="round"/>
      <rect x="282" y="200" width="28" height="8" rx="4" fill="${ink}"/>`,
    bed: `
      <rect x="70" y="150" width="260" height="24" rx="8" fill="${steel}"/>
      <path d="M90 150 L90 120 Q90 108 104 108 L190 108 L230 140 L320 140 L320 150" fill="${light}" stroke="${ink}" stroke-width="5"/>
      <rect x="96" y="96" width="60" height="22" rx="10" fill="${blue}" opacity=".85"/>
      <rect x="60" y="88" width="14" height="120" rx="6" fill="${ink}"/>
      <rect x="326" y="110" width="14" height="98" rx="6" fill="${ink}"/>
      <rect x="140" y="120" width="120" height="8" rx="4" fill="${ink}" opacity=".5"/>
      <path d="M110 174 L110 220 M290 174 L290 220" stroke="${ink}" stroke-width="7"/>
      <circle cx="110" cy="228" r="10" fill="${ink}"/><circle cx="290" cy="228" r="10" fill="${ink}"/>
      <rect x="196" y="186" width="56" height="18" rx="6" fill="${teal}"/>
      <path d="M350 40 L350 210" stroke="${steel}" stroke-width="5"/><rect x="336" y="44" width="28" height="40" rx="10" fill="#cfe6ff" stroke="${blue}" stroke-width="3"/>`,
    bp: `
      <rect x="95" y="95" width="150" height="130" rx="22" fill="${light}" stroke="${ink}" stroke-width="5"/>
      <rect x="115" y="113" width="110" height="64" rx="10" fill="#dff5ec"/>
      <text x="170" y="145" text-anchor="middle" font-family="Arial" font-weight="700" font-size="24" fill="${ink}">120</text>
      <text x="170" y="170" text-anchor="middle" font-family="Arial" font-size="16" fill="${ink}">80 · 72</text>
      <circle cx="140" cy="200" r="10" fill="${blue}"/><circle cx="200" cy="200" r="10" fill="${red}"/>
      <path d="M245 150 C290 150 270 230 310 230" fill="none" stroke="${ink}" stroke-width="5"/>
      <rect x="280" y="190" width="70" height="60" rx="14" fill="${blue}" opacity=".9"/>
      <path d="M290 205 h50 M290 220 h50 M290 235 h50" stroke="#ffffff" stroke-width="3" opacity=".6"/>`,
    ultrasound: `
      <rect x="150" y="60" width="130" height="90" rx="10" fill="${ink}"/>
      <rect x="160" y="70" width="110" height="70" rx="6" fill="#0d1a26"/>
      <path d="M215 80 L185 132 Q215 140 245 132 Z" fill="#7f95a8" opacity=".75"/>
      <rect x="140" y="160" width="150" height="34" rx="8" fill="${light}" stroke="${ink}" stroke-width="4"/>
      <circle cx="160" cy="177" r="6" fill="${blue}"/><rect x="175" y="171" width="60" height="12" rx="4" fill="${steel}"/>
      <rect x="205" y="194" width="20" height="40" fill="${steel}"/>
      <rect x="160" y="232" width="110" height="12" rx="6" fill="${ink}"/>
      <circle cx="170" cy="250" r="8" fill="${ink}"/><circle cx="260" cy="250" r="8" fill="${ink}"/>
      <path d="M290 180 C330 180 330 120 300 110" fill="none" stroke="${ink}" stroke-width="4"/>
      <rect x="292" y="94" width="18" height="30" rx="8" fill="${teal}"/>`,
    dental: `
      <path d="M110 200 L150 140 L250 150 L300 120" fill="none" stroke="${ink}" stroke-width="0"/>
      <path d="M120 175 Q125 140 160 140 L240 150 Q255 152 262 140 L290 100 Q300 90 312 100 Q318 108 310 118 L270 175 Q262 188 245 188 L135 188 Q120 188 120 175Z" fill="${teal}"/>
      <rect x="175" y="188" width="30" height="40" fill="${steel}"/>
      <rect x="135" y="226" width="110" height="16" rx="8" fill="${ink}"/>
      <path d="M150 140 L120 60 L200 45" fill="none" stroke="${ink}" stroke-width="6" stroke-linecap="round"/>
      <ellipse cx="215" cy="48" rx="28" ry="16" fill="${light}" stroke="${ink}" stroke-width="5"/>
      <rect x="80" y="160" width="40" height="10" rx="5" fill="${ink}"/>
      <rect x="60" y="150" width="34" height="26" rx="6" fill="${light}" stroke="${ink}" stroke-width="4"/>`,
    laser: `
      <rect x="160" y="70" width="100" height="170" rx="20" fill="${light}" stroke="${ink}" stroke-width="5"/>
      <rect x="175" y="86" width="70" height="46" rx="8" fill="#1c2b3b"/>
      <path d="M185 115 l12 -12 l12 8 l14 -14 l12 10" fill="none" stroke="#5ee0c4" stroke-width="3"/>
      <circle cx="210" cy="160" r="14" fill="${blue}"/>
      <rect x="175" y="190" width="70" height="8" rx="4" fill="${steel}"/><rect x="175" y="206" width="70" height="8" rx="4" fill="${steel}"/>
      <path d="M260 120 C320 120 320 200 300 210" fill="none" stroke="${ink}" stroke-width="5"/>
      <rect x="284" y="196" width="26" height="54" rx="10" fill="${ink}" transform="rotate(-20 297 223)"/>
      <circle cx="175" cy="248" r="8" fill="${ink}"/><circle cx="245" cy="248" r="8" fill="${ink}"/>`,
    oxygen: `
      <rect x="140" y="70" width="120" height="160" rx="18" fill="${light}" stroke="${ink}" stroke-width="5"/>
      <rect x="158" y="88" width="84" height="34" rx="8" fill="#1c2b3b"/>
      <text x="200" y="112" text-anchor="middle" font-family="Arial" font-weight="700" font-size="18" fill="#5ee0c4">5 L</text>
      <path d="M158 140 h84 M158 152 h84 M158 164 h84 M158 176 h84" stroke="${steel}" stroke-width="4"/>
      <circle cx="200" cy="205" r="9" fill="${teal}"/>
      <circle cx="160" cy="240" r="9" fill="${ink}"/><circle cx="240" cy="240" r="9" fill="${ink}"/>
      <path d="M260 120 C330 110 340 190 300 200 C270 208 280 240 320 236" fill="none" stroke="#7cc3f5" stroke-width="5"/>`,
    microscope: `
      <rect x="130" y="230" width="150" height="18" rx="8" fill="${ink}"/>
      <path d="M250 230 Q250 150 210 120" fill="none" stroke="${ink}" stroke-width="16" stroke-linecap="round"/>
      <rect x="160" y="60" width="34" height="100" rx="10" fill="${blue}" transform="rotate(-25 177 110)"/>
      <rect x="150" y="160" width="80" height="12" rx="5" fill="${steel}"/>
      <rect x="182" y="150" width="14" height="22" fill="${ink}"/>
      <circle cx="252" cy="190" r="12" fill="${steel}"/>
      <rect x="138" y="44" width="30" height="16" rx="5" fill="${ink}" transform="rotate(-25 153 52)"/>`,
    monitor: `
      <rect x="95" y="65" width="210" height="150" rx="16" fill="${ink}"/>
      <rect x="110" y="80" width="180" height="120" rx="8" fill="#0b1520"/>
      <path d="M118 120 h30 l8 -22 l10 40 l8 -18 h28 l6 -10 l6 10 h70" fill="none" stroke="#3ee38d" stroke-width="3"/>
      <path d="M118 160 q15 -18 30 0 t30 0 t30 0 t30 0" fill="none" stroke="#5ab8ff" stroke-width="3"/>
      <text x="282" y="110" text-anchor="end" font-family="Arial" font-weight="700" font-size="18" fill="#3ee38d">78</text>
      <text x="282" y="186" text-anchor="end" font-family="Arial" font-weight="700" font-size="16" fill="#5ab8ff">98%</text>
      <rect x="185" y="215" width="30" height="22" fill="${steel}"/><rect x="150" y="235" width="100" height="12" rx="6" fill="${ink}"/>`,
    walker: `
      <path d="M140 90 L120 240 M260 90 L280 240 M140 90 L260 90" fill="none" stroke="${steel}" stroke-width="12" stroke-linecap="round"/>
      <path d="M130 165 L270 165" stroke="${steel}" stroke-width="8"/>
      <rect x="120" y="80" width="40" height="18" rx="9" fill="${ink}"/><rect x="240" y="80" width="40" height="18" rx="9" fill="${ink}"/>
      <circle cx="120" cy="246" r="12" fill="${ink}"/><circle cx="280" cy="246" r="12" fill="${ink}"/>
      <rect x="160" y="150" width="80" height="34" rx="8" fill="${blue}" opacity=".85"/>`,
    autoclave: `
      <rect x="90" y="85" width="220" height="150" rx="18" fill="${light}" stroke="${ink}" stroke-width="5"/>
      <circle cx="170" cy="160" r="52" fill="#e9eef3" stroke="${ink}" stroke-width="6"/>
      <circle cx="170" cy="160" r="36" fill="none" stroke="${steel}" stroke-width="4"/>
      <rect x="225" y="105" width="65" height="34" rx="6" fill="#1c2b3b"/>
      <text x="257" y="128" text-anchor="middle" font-family="Arial" font-weight="700" font-size="15" fill="#5ee0c4">134°</text>
      <circle cx="240" cy="165" r="8" fill="${teal}"/><circle cx="268" cy="165" r="8" fill="${red}"/>
      <rect x="225" y="190" width="65" height="10" rx="5" fill="${steel}"/>
      <rect x="110" y="235" width="30" height="10" fill="${ink}"/><rect x="260" y="235" width="30" height="10" fill="${ink}"/>`,
    centrifuge: `
      <rect x="100" y="140" width="200" height="95" rx="18" fill="${light}" stroke="${ink}" stroke-width="5"/>
      <ellipse cx="200" cy="140" rx="100" ry="36" fill="#dbe7f3" stroke="${ink}" stroke-width="5"/>
      <ellipse cx="200" cy="138" rx="60" ry="18" fill="${blue}" opacity=".35"/>
      <rect x="130" y="180" width="70" height="28" rx="6" fill="#1c2b3b"/>
      <text x="165" y="200" text-anchor="middle" font-family="Arial" font-weight="700" font-size="14" fill="#5ee0c4">4000</text>
      <circle cx="235" cy="194" r="9" fill="${teal}"/><circle cx="262" cy="194" r="9" fill="${steel}"/>`,
    gloves: `
      <rect x="90" y="120" width="220" height="120" rx="10" fill="${light}" stroke="${ink}" stroke-width="5"/>
      <path d="M90 150 h220" stroke="${steel}" stroke-width="4"/>
      <ellipse cx="200" cy="135" rx="50" ry="10" fill="#cfd9e2"/>
      <path d="M180 135 L176 70 Q176 60 184 60 Q192 60 192 70 L194 110 L196 52 Q197 42 205 42 Q213 42 213 52 L212 108 L218 60 Q220 50 228 52 Q235 55 233 65 L226 120 Q240 100 248 106 Q255 112 246 124 L224 150 Z" fill="#8ec5ff" stroke="${blue}" stroke-width="3"/>
      <rect x="120" y="180" width="160" height="16" rx="5" fill="${blue}"/>
      <text x="200" y="224" text-anchor="middle" font-family="Arial" font-weight="700" font-size="16" fill="${ink}">NITRILE · 100</text>`,
    syringe: `
      <g transform="rotate(-30 200 150)">
        <rect x="120" y="130" width="170" height="40" rx="8" fill="${light}" stroke="${ink}" stroke-width="5"/>
        <rect x="124" y="134" width="100" height="32" rx="5" fill="#9fd4ff" opacity=".8"/>
        <path d="M150 130 v12 M175 130 v12 M200 130 v12 M225 130 v12 M250 130 v12" stroke="${ink}" stroke-width="3"/>
        <rect x="290" y="140" width="22" height="20" rx="4" fill="${steel}"/>
        <path d="M312 150 h55" stroke="${ink}" stroke-width="4"/>
        <rect x="70" y="144" width="50" height="12" fill="${ink}"/>
        <rect x="58" y="122" width="14" height="56" rx="5" fill="${ink}"/>
      </g>`,
    scrubs: `
      <path d="M140 70 L175 60 Q200 90 225 60 L260 70 L310 120 L280 150 L260 132 L260 240 L140 240 L140 132 L120 150 L90 120 Z" fill="${teal}"/>
      <path d="M175 60 Q200 110 225 60" fill="none" stroke="#0e7d6b" stroke-width="5"/>
      <rect x="160" y="160" width="36" height="30" rx="4" fill="#0e7d6b" opacity=".6"/>
      <rect x="210" y="120" width="30" height="6" rx="3" fill="#ffffff" opacity=".8"/>`,
    stethoscope: `
      <path d="M150 60 Q130 60 130 90 L130 150 Q130 200 190 200 Q250 200 250 150 L250 90 Q250 60 230 60" fill="none" stroke="${ink}" stroke-width="8" stroke-linecap="round"/>
      <path d="M190 200 L190 220 Q190 262 240 262 Q290 262 290 220 L290 190" fill="none" stroke="${ink}" stroke-width="8"/>
      <circle cx="290" cy="170" r="28" fill="${steel}" stroke="${ink}" stroke-width="6"/><circle cx="290" cy="170" r="12" fill="${light}"/>
      <circle cx="150" cy="60" r="8" fill="${blue}"/><circle cx="230" cy="60" r="8" fill="${blue}"/>`,
    clinic: `
      <rect x="90" y="90" width="220" height="150" fill="${light}" stroke="${ink}" stroke-width="5"/>
      <rect x="80" y="76" width="240" height="22" rx="4" fill="${blue}"/>
      <rect x="180" y="40" width="40" height="40" rx="6" fill="${light}" stroke="${ink}" stroke-width="4"/>
      <path d="M200 48 v24 M188 60 h24" stroke="${red}" stroke-width="7" stroke-linecap="round"/>
      <rect x="110" y="115" width="40" height="34" fill="#cfe4fb"/><rect x="250" y="115" width="40" height="34" fill="#cfe4fb"/>
      <rect x="110" y="168" width="40" height="34" fill="#cfe4fb"/><rect x="250" y="168" width="40" height="34" fill="#cfe4fb"/>
      <rect x="175" y="170" width="50" height="70" fill="${teal}"/>
      <rect x="60" y="240" width="280" height="10" rx="5" fill="${steel}"/>`,
    job: `
      <rect x="120" y="60" width="160" height="200" rx="16" fill="${light}" stroke="${ink}" stroke-width="5"/>
      <rect x="180" y="48" width="40" height="22" rx="6" fill="${steel}"/>
      <circle cx="200" cy="125" r="32" fill="#cfe4fb"/>
      <circle cx="200" cy="115" r="14" fill="${ink}"/><path d="M174 150 Q200 125 226 150" fill="${ink}"/>
      <rect x="150" y="180" width="100" height="12" rx="6" fill="${ink}"/>
      <rect x="160" y="202" width="80" height="10" rx="5" fill="${steel}"/>
      <rect x="170" y="222" width="60" height="18" rx="9" fill="${teal}"/>`,
    service: `
      <circle cx="170" cy="150" r="58" fill="none" stroke="${steel}" stroke-width="22" stroke-dasharray="20 14"/>
      <circle cx="170" cy="150" r="30" fill="${light}" stroke="${ink}" stroke-width="5"/>
      <path d="M215 210 L290 135 Q300 110 320 108 L305 125 L312 140 L328 145 Q325 165 300 172 L228 225 Q218 232 210 224 Q203 217 215 210Z" fill="${ink}"/>`,
    xray: `
      <rect x="110" y="50" width="180" height="210" rx="10" fill="#0d1a26" stroke="${ink}" stroke-width="5"/>
      <path d="M200 70 v170" stroke="#c9d6e2" stroke-width="8"/>
      <path d="M200 100 q-50 0 -60 20 M200 120 q-55 0 -64 22 M200 140 q-55 0 -62 22 M200 160 q-50 0 -56 20 M200 100 q50 0 60 20 M200 120 q55 0 64 22 M200 140 q55 0 62 22 M200 160 q50 0 56 20" fill="none" stroke="#c9d6e2" stroke-width="5" stroke-linecap="round"/>
      <path d="M145 80 q55 -18 110 0" fill="none" stroke="#c9d6e2" stroke-width="6"/>`,
    crutches: `
      <g stroke-linecap="round">
        <path d="M150 60 L170 250 M190 60 L170 250" stroke="${steel}" stroke-width="10" fill="none"/>
        <rect x="140" y="50" width="60" height="16" rx="8" fill="${ink}"/><rect x="152" y="140" width="34" height="10" rx="5" fill="${ink}"/>
        <path d="M230 60 L250 250 M270 60 L250 250" stroke="${steel}" stroke-width="10" fill="none"/>
        <rect x="220" y="50" width="60" height="16" rx="8" fill="${ink}"/><rect x="232" y="140" width="34" height="10" rx="5" fill="${ink}"/>
      </g>`,
    pump: `
      <path d="M200 30 L200 270" stroke="${steel}" stroke-width="6"/>
      <rect x="170" y="36" width="60" height="70" rx="18" fill="#d9eeff" stroke="${blue}" stroke-width="4"/>
      <path d="M200 106 C200 130 230 130 230 150" fill="none" stroke="#7cc3f5" stroke-width="4"/>
      <rect x="140" y="140" width="130" height="90" rx="12" fill="${light}" stroke="${ink}" stroke-width="5"/>
      <rect x="152" y="152" width="80" height="34" rx="6" fill="#1c2b3b"/>
      <text x="192" y="175" text-anchor="middle" font-family="Arial" font-weight="700" font-size="15" fill="#5ee0c4">125 ml</text>
      <circle cx="250" cy="165" r="8" fill="${teal}"/><circle cx="250" cy="192" r="8" fill="${red}"/>
      <rect x="152" y="198" width="80" height="18" rx="5" fill="${steel}"/>`,
    glucose: `
      <rect x="140" y="70" width="110" height="170" rx="26" fill="${light}" stroke="${ink}" stroke-width="5"/>
      <rect x="156" y="92" width="78" height="62" rx="10" fill="#dff5ec"/>
      <text x="195" y="130" text-anchor="middle" font-family="Arial" font-weight="700" font-size="24" fill="${ink}">98</text>
      <text x="195" y="146" text-anchor="middle" font-family="Arial" font-size="11" fill="${ink}">mg/dL</text>
      <circle cx="195" cy="190" r="16" fill="${blue}"/>
      <rect x="182" y="40" width="26" height="40" rx="3" fill="${steel}"/>
      <rect x="265" y="150" width="60" height="90" rx="10" fill="${teal}"/><rect x="280" y="138" width="30" height="16" rx="4" fill="${ink}"/>`
  };

  function svg(type, tintIndex = 0, flip = false) {
    const [a, b] = tints[tintIndex % tints.length];
    const body = parts[type] || parts.monitor;
    const g = flip ? `<g transform="translate(400 0) scale(-1 1)">${body}</g>` : body;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="400" height="300" fill="url(#g)"/><ellipse cx="200" cy="262" rx="150" ry="14" fill="#000" opacity=".06"/>${g}</svg>`;
  }
  const cache = new Map();
  window.illo = function (type, tintIndex = 0, flip = false) {
    const key = `${type}|${tintIndex}|${flip}`;
    if (!cache.has(key)) cache.set(key, 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg(type, tintIndex, flip)));
    return cache.get(key);
  };
})();
