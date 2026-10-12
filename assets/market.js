'use strict';
(function () {
  const { categories, cities, users, ads: seedAds } = window.MARKET;
  const app = document.getElementById('app');
  const PAGE = 12;

  // ---------- storage ----------
  const store = {
    get(key, fallback) { try { const v = localStorage.getItem('st-' + key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } },
    set(key, value) { try { localStorage.setItem('st-' + key, JSON.stringify(value)); } catch {} }
  };
  let favs = new Set(store.get('favs', []));
  let me = store.get('me', null);
  let myAds = store.get('my-ads', []);
  let extraComments = store.get('comments', {});
  let chats = store.get('chats', null);
  const loadedAt = Date.now();

  function allAds() { return [...myAds, ...seedAds]; }
  function findAd(id) { return allAds().find(a => String(a.id) === String(id)); }
  function catOf(id) { return categories.find(c => c.id === id); }

  // ---------- helpers ----------
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (id, cls = 'i') => `<svg class="${cls}" aria-hidden="true"><use href="#${id}"/></svg>`;
  const fmt = n => Number(n).toLocaleString('en-US');
  function minutesOf(ad) { return ad.createdAt ? Math.max(1, Math.round((Date.now() - ad.createdAt) / 60000)) : ad.minutes + Math.round((Date.now() - loadedAt) / 60000); }
  function ago(m) {
    if (m < 1) return 'الآن';
    if (m < 60) return m === 1 ? 'قبل دقيقة' : m === 2 ? 'قبل دقيقتين' : m <= 10 ? `قبل ${m} دقائق` : `قبل ${m} دقيقة`;
    const h = Math.floor(m / 60);
    if (h < 24) return h === 1 ? 'قبل ساعة' : h === 2 ? 'قبل ساعتين' : h <= 10 ? `قبل ${h} ساعات` : `قبل ${h} ساعة`;
    const d = Math.floor(h / 24);
    if (d < 30) return d === 1 ? 'قبل يوم' : d === 2 ? 'قبل يومين' : d <= 10 ? `قبل ${d} أيام` : `قبل ${d} يوم`;
    return 'قبل شهر';
  }
  function priceHtml(ad, cls = 'price') {
    if (ad.cat === 'donate' || ad.price === 0) return `<span class="${cls} free">مجاناً · تبرع</span>`;
    if (ad.price == null) return `<span class="${cls} ask">${ad.cat === 'jobs' ? 'الراتب حسب الخبرة' : 'السعر عند التواصل'}</span>`;
    return `<span class="${cls}">${fmt(ad.price)} ريال</span>`;
  }
  function imgSrc(img) { return typeof img === 'string' ? img : window.illo(img[0], img[1], img[2]); }
  const initial = name => esc(String(name).replace(/^(د\.|أبو|أم)\s*/, '').trim().charAt(0) || '؟');
  function userInfo(name) { return users[name] || { joined: 2026, rating: 5, reviews: 0 }; }
  const verifiedMark = name => userInfo(name).verified ? `<svg class="i verified" aria-label="حساب موثق"><use href="#i-check"/></svg>` : '';

  function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toast.timer); toast.timer = setTimeout(() => t.classList.remove('show'), 2400);
  }
  const dlg = document.getElementById('dlg');
  function openDialog(html, onMount) {
    document.getElementById('dlg-body').innerHTML = html;
    if (!dlg.open) dlg.showModal();
    onMount && onMount(document.getElementById('dlg-body'));
  }
  dlg.addEventListener('click', e => { if (e.target === dlg || e.target.closest('[data-close]')) dlg.close(); });

  // ---------- routing ----------
  function parseHash() {
    const raw = location.hash.replace(/^#\/?/, '');
    const [path, qs] = raw.split('?');
    return { parts: path.split('/').filter(Boolean).map(decodeURIComponent), params: new URLSearchParams(qs || '') };
  }
  function go(hash) { location.hash = hash; }
  function homeHash(f) {
    const p = new URLSearchParams();
    for (const k of ['cat', 'sub', 'city', 'q', 'sort', 'cond', 'min', 'max']) if (f[k]) p.set(k, f[k]);
    const s = p.toString();
    return '#/' + (s ? '?' + s : '');
  }

  function render() {
    const { parts, params } = parseHash();
    const [route, arg] = parts;
    document.querySelectorAll('.bnav a').forEach(a => a.classList.toggle('on', a.dataset.tab === (route || 'home') || (route === 'user' && a.dataset.tab === 'account' && me && arg === me.name)));
    updateLoginBtn();
    if (route !== undefined && route !== '') document.getElementById('q').value = '';
    switch (route) {
      case 'ad': return viewAd(arg);
      case 'new': return viewNew();
      case 'user': return viewUser(arg);
      case 'favorites': return viewFavorites();
      case 'messages': return viewMessages(arg);
      case 'account': return viewAccount();
      case 'about': return viewAbout();
      default: return viewHome(params);
    }
  }
  window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });

  // ---------- home ----------
  let shown = PAGE;
  let lastFilterKey = '';
  function readFilters(params) {
    const f = {}; for (const k of ['cat', 'sub', 'city', 'q', 'sort', 'cond', 'min', 'max']) f[k] = params.get(k) || '';
    return f;
  }
  function normalize(v) { return String(v).replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[ً-ٟـ]/g, '').toLowerCase().trim(); }
  function filterAds(f) {
    const q = normalize(f.q);
    const terms = q.split(/\s+/).filter(Boolean);
    let list = allAds().filter(a =>
      (!f.cat || a.cat === f.cat) && (!f.sub || a.sub === f.sub) && (!f.city || a.city === f.city) &&
      (!f.cond || a.condition === f.cond) &&
      (!f.min || (a.price != null && a.price >= +f.min)) && (!f.max || (a.price != null && a.price <= +f.max)) &&
      (!terms.length || terms.every(t => normalize(`${a.title} ${a.description} ${a.sub} ${a.city} ${a.user}`).includes(t)))
    );
    if (f.sort === 'low') list.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    else if (f.sort === 'high') list.sort((a, b) => (b.price ?? -1) - (a.price ?? -1));
    else list.sort((a, b) => (f.q || f.cat ? 0 : (b.pinned - a.pinned)) || (minutesOf(a) - minutesOf(b)));
    return list;
  }
  function postHtml(ad) {
    const cat = catOf(ad.cat);
    const fav = favs.has(String(ad.id));
    const isNew = minutesOf(ad) < 60;
    const replies = ad.comments.length + (extraComments[ad.id] || []).length;
    return `<article class="post">
      <div class="post-body">
        <h2 class="post-title"><a href="#/ad/${ad.id}">${esc(ad.title)}</a></h2>
        <div class="meta">
          <span>${icon('i-pin')}${esc(ad.city)}</span>
          <span>${icon('i-clock')}${ago(minutesOf(ad))}</span>
          <a class="user-link" href="#/user/${encodeURIComponent(ad.user)}"><span>${icon('i-user')}${esc(ad.user)} ${verifiedMark(ad.user)}</span></a>
          ${replies ? `<span>${icon('i-chat')}${replies} ردود</span>` : ''}
        </div>
        <div class="post-foot">
          ${priceHtml(ad)}
          ${ad.pinned ? '<span class="tag pin">مميز</span>' : ''}
          ${isNew ? '<span class="tag new">جديد</span>' : ''}
          <span class="tag">${esc(cat ? cat.name : '')}</span>
          <button type="button" class="fav-btn ${fav ? 'on' : ''}" data-fav="${ad.id}" aria-pressed="${fav}" aria-label="${fav ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}">${icon(fav ? 'i-heart-f' : 'i-heart')}</button>
        </div>
      </div>
      <div class="post-thumb"><img src="${imgSrc(ad.images[0])}" alt="" loading="lazy" width="132" height="104"><span class="n">${ad.images.length === 1 ? "صورة" : ad.images.length + " صور"}</span></div>
    </article>`;
  }

  function viewHome(params) {
    const f = readFilters(params);
    document.getElementById('q').value = f.q;
    const key = JSON.stringify(f);
    if (key !== lastFilterKey) { shown = PAGE; lastFilterKey = key; }
    const list = filterAds(f);
    const cat = catOf(f.cat);
    const advanced = ['cond', 'min', 'max'].filter(k => f[k]).length;
    document.title = (cat ? cat.name + ' | ' : '') + 'سوق طبي';

    app.innerHTML = `
      <section class="cats" aria-label="الأقسام">
        <div class="wrap">
          <div class="cats-row" role="toolbar" aria-label="الأقسام الرئيسية">
            <button type="button" class="cat" data-cat="" aria-pressed="${!f.cat}"><span class="ic">${icon('c-all')}</span>الكل</button>
            ${categories.map(c => `<button type="button" class="cat" data-cat="${c.id}" aria-pressed="${f.cat === c.id}"><span class="ic">${icon('c-' + c.icon)}</span>${c.name}</button>`).join('')}
          </div>
        </div>
      </section>
      <div class="wrap">
        ${cat ? `<div class="subs" role="toolbar" aria-label="الأقسام الفرعية">
          <button type="button" class="chip" data-sub="" aria-pressed="${!f.sub}">كل ${cat.name}</button>
          ${cat.subs.map(s => `<button type="button" class="chip" data-sub="${esc(s)}" aria-pressed="${f.sub === s}">${esc(s)}</button>`).join('')}
        </div>` : ''}
        <div class="toolbar">
          <label class="sel"><span class="sr-only">المدينة</span><select id="f-city">
            <option value="">كل المدن</option>${cities.map(c => `<option ${f.city === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select></label>
          <label class="sel"><span class="sr-only">الترتيب</span><select id="f-sort">
            <option value="">الأحدث</option><option value="low" ${f.sort === 'low' ? 'selected' : ''}>الأقل سعراً</option><option value="high" ${f.sort === 'high' ? 'selected' : ''}>الأعلى سعراً</option>
          </select></label>
          <button type="button" class="tool-btn" id="f-toggle" aria-expanded="false" aria-controls="f-panel" aria-pressed="${advanced > 0}">${icon('i-filter')}فلترة ${advanced ? `<span class="count">${advanced}</span>` : ''}</button>
          ${(f.cat || f.city || f.q || advanced) ? '<button type="button" class="tool-btn" data-action="clear">مسح الكل ✕</button>' : ''}
          <span class="result-count">${fmt(list.length)} إعلان${f.q ? ` عن «${esc(f.q)}»` : ''}</span>
        </div>
        <form class="filters-panel" id="f-panel" hidden>
          <div class="fgroup"><span class="flabel">الحالة</span><div class="seg">
            ${['', 'جديد', 'مستعمل'].map(c => `<button type="button" class="chip" data-cond="${c}" aria-pressed="${f.cond === c}">${c || 'الكل'}</button>`).join('')}
          </div></div>
          <div class="fgroup"><span class="flabel">السعر (ريال)</span><div class="price-range">
            <input class="input" name="min" type="number" inputmode="numeric" min="0" placeholder="من" value="${esc(f.min)}" aria-label="أقل سعر">
            <input class="input" name="max" type="number" inputmode="numeric" min="0" placeholder="إلى" value="${esc(f.max)}" aria-label="أعلى سعر">
          </div></div>
          <div class="fpanel-actions"><button class="btn btn-primary">تطبيق</button></div>
        </form>
        <div class="layout">
          <section aria-label="الإعلانات">
            <div class="feed">${list.slice(0, shown).map(postHtml).join('') || `<div class="empty"><b>لا توجد إعلانات مطابقة</b>جرّب تغيير المدينة أو كلمات البحث، أو <a href="#/new" style="color:var(--brand)">أضف إعلانك الآن</a>.</div>`}</div>
            ${list.length > shown ? `<button type="button" class="more-btn" data-action="more">عرض المزيد (${fmt(list.length - shown)})</button>` : ''}
          </section>
          <aside class="side" aria-label="معلومات جانبية">
            <div class="box promo"><h3>عندك جهاز ما تحتاجه؟</h3><p>أضف إعلانك مجاناً خلال دقيقة ووصّله لآلاف العيادات والمشترين.</p><a class="btn btn-block" href="#/new">${icon('i-plus')}أضف إعلان</a></div>
            <div class="box"><h3>سوق طبي بالأرقام</h3><div class="stats">
              <div class="stat"><b>12,480</b><span>إعلان نشط</span></div><div class="stat"><b>3,215</b><span>منشأة صحية</span></div>
              <div class="stat"><b>870</b><span>جهاز تم التبرع به</span></div><div class="stat"><b>15</b><span>مدينة</span></div></div></div>
            <div class="box"><h3>تصفح حسب المدينة</h3><div class="city-list">${cities.slice(0, 10).map(c => `<button type="button" class="chip" data-city="${c}" aria-pressed="${f.city === c}">${c}</button>`).join('')}</div></div>
            <div class="box"><h3>نصائح للتعامل الآمن</h3><p class="safety" style="background:none;padding:0">تأكد من تسجيل الجهاز في هيئة الغذاء والدواء، عاين قبل الدفع، واستخدم الرسائل داخل المنصة. <b>لا يُسمح ببيع الأدوية.</b></p></div>
          </aside>
        </div>
      </div>`;

    const set = patch => go(homeHash({ ...f, ...patch }));
    app.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => set({ cat: b.dataset.cat, sub: '' }));
    app.querySelectorAll('[data-sub]').forEach(b => b.onclick = () => set({ sub: b.dataset.sub }));
    app.querySelectorAll('[data-city]').forEach(b => b.onclick = () => set({ city: f.city === b.dataset.city ? '' : b.dataset.city }));
    app.querySelectorAll('[data-cond]').forEach(b => b.onclick = () => set({ cond: b.dataset.cond }));
    app.querySelector('#f-city').onchange = e => set({ city: e.target.value });
    app.querySelector('#f-sort').onchange = e => set({ sort: e.target.value });
    const panel = app.querySelector('#f-panel'), toggle = app.querySelector('#f-toggle');
    toggle.onclick = () => { panel.hidden = !panel.hidden; toggle.setAttribute('aria-expanded', String(!panel.hidden)); };
    if (advanced) { panel.hidden = false; toggle.setAttribute('aria-expanded', 'true'); }
    panel.onsubmit = e => { e.preventDefault(); set({ min: panel.min.value, max: panel.max.value }); };
    const more = app.querySelector('[data-action="more"]');
    if (more) more.onclick = () => { const y = window.scrollY; shown += PAGE; render(); window.scrollTo(0, y); };
    const clear = app.querySelector('[data-action="clear"]');
    if (clear) clear.onclick = () => go('#/');
    const pressed = app.querySelector('.cat[aria-pressed="true"]');
    if (pressed && pressed.dataset.cat) pressed.scrollIntoView({ block: 'nearest', inline: 'center' });
  }

  document.getElementById('search-form').addEventListener('submit', e => {
    e.preventDefault();
    const q = document.getElementById('q').value.trim();
    const { parts, params } = parseHash();
    const f = parts[0] ? {} : readFilters(params);
    go(homeHash({ ...f, q }));
  });

  // favorites toggling (delegated)
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-fav]');
    if (!b) return;
    e.preventDefault();
    const id = b.dataset.fav;
    const on = !favs.has(id);
    on ? favs.add(id) : favs.delete(id);
    store.set('favs', [...favs]);
    b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on));
    b.querySelector('use').setAttribute('href', on ? '#i-heart-f' : '#i-heart');
    if (b.dataset.label) b.lastChild.textContent = on ? ' في المفضلة' : ' أضف للمفضلة';
    toast(on ? 'أضيف الإعلان إلى المفضلة' : 'أزيل الإعلان من المفضلة');
    if (parseHash().parts[0] === 'favorites') render();
  });

  // ---------- ad page ----------
  function viewAd(id) {
    const ad = findAd(id);
    if (!ad) { app.innerHTML = `<div class="wrap page"><div class="empty"><b>الإعلان غير موجود</b>ربما تم حذفه. <a href="#/" style="color:var(--brand)">العودة للرئيسية</a></div></div>`; return; }
    const cat = catOf(ad.cat);
    const u = userInfo(ad.user);
    const fav = favs.has(String(ad.id));
    const comments = [...ad.comments, ...(extraComments[ad.id] || [])];
    const similar = allAds().filter(a => a.id !== ad.id && (a.sub === ad.sub || a.cat === ad.cat)).slice(0, 4);
    const userAdCount = allAds().filter(a => a.user === ad.user).length;
    const mine = me && ad.user === me.name;
    document.title = ad.title + ' | سوق طبي';
    const specs = [['القسم', cat ? cat.name : ''], ['النوع', ad.sub], ['الحالة', ad.condition], ['المدينة', ad.city], ['رقم الإعلان', '#' + ad.id], ['المشاهدات', fmt(ad.views || 1)]];
    const contactBtns = mine
      ? `<button class="btn btn-outline btn-block" data-action="delete-ad">حذف الإعلان</button>`
      : `<button class="btn btn-primary btn-block" data-action="message">${icon('i-chat')}مراسلة المعلن</button><button class="btn btn-green btn-block" data-action="call">${icon('i-phone')}إظهار رقم الجوال</button>`;

    app.innerHTML = `<div class="wrap ad-page">
      <nav class="crumbs" aria-label="مسار التنقل"><a href="#/">الرئيسية</a><span class="sep">‹</span><a href="#/?cat=${ad.cat}">${esc(cat ? cat.name : '')}</a><span class="sep">‹</span><a href="#/?cat=${ad.cat}&sub=${encodeURIComponent(ad.sub)}">${esc(ad.sub)}</a></nav>
      <div class="ad-grid">
        <div class="ad-main">
          <div class="box ad-head">
            <h1>${esc(ad.title)}</h1>
            <div class="meta"><span>${icon('i-pin')}${esc(ad.city)}</span><span>${icon('i-clock')}${ago(minutesOf(ad))}</span><span>${icon('i-eye')}${fmt(ad.views || 1)} مشاهدة</span>${ad.pinned ? '<span class="tag pin">مميز</span>' : ''}</div>
            ${priceHtml(ad, 'price m-price')}
          </div>
          <div class="gallery">
            <div class="gallery-main"><img id="g-main" src="${imgSrc(ad.images[0])}" alt="${esc(ad.title)}"></div>
            ${ad.images.length > 1 ? `<div class="thumbs">${ad.images.map((im, i) => `<button type="button" data-img="${i}" aria-current="${i === 0}" aria-label="الصورة ${i + 1}"><img src="${imgSrc(im)}" alt=""></button>`).join('')}</div>` : ''}
          </div>
          <div class="box">
            <h3>تفاصيل الإعلان</h3>
            <p class="ad-desc">${esc(ad.description)}</p>
            <div class="specs">${specs.map(([k, v]) => `<div class="spec"><span>${k}</span><b>${esc(v)}</b></div>`).join('')}</div>
          </div>
          <div class="ad-actions">
            <button type="button" class="btn btn-outline ${fav ? 'on' : ''}" data-fav="${ad.id}" data-label="1" aria-pressed="${fav}">${icon(fav ? 'i-heart-f' : 'i-heart')}<span> ${fav ? 'في المفضلة' : 'أضف للمفضلة'}</span></button>
            <button type="button" class="btn btn-outline" data-action="share">${icon('i-share')} مشاركة</button>
            <button type="button" class="btn btn-outline" data-action="report">${icon('i-flag')} بلاغ</button>
          </div>
          <div class="box">
            <h3>الردود (${comments.length})</h3>
            <div class="comments">${comments.map(c => `<div class="comment"><span class="av">${initial(c.who)}</span><div class="comment-body"><b>${esc(c.who)}</b>${c.owner ? '<span class="owner">صاحب الإعلان</span>' : ''} <time>${ago(c.createdAt ? minutesOf(c) : c.minutes)}</time><p>${esc(c.text)}</p></div></div>`).join('') || '<p class="hint">لا توجد ردود بعد. كن أول من يرد.</p>'}</div>
            <form class="comment-form" id="c-form"><input class="input" name="text" maxlength="300" placeholder="${me ? 'اكتب ردك…' : 'سجّل الدخول لكتابة رد'}" aria-label="اكتب رداً" required><button class="btn btn-primary">رد</button></form>
          </div>
          ${similar.length ? `<div><h3>إعلانات مشابهة</h3><div class="similar">${similar.map(miniHtml).join('')}</div></div>` : ''}
        </div>
        <aside class="ad-side" style="display:grid;gap:14px;position:sticky;top:calc(var(--hdr) + 16px)">
          <div class="box contact-box">
            ${priceHtml(ad, 'big-price')}
            ${contactBtns}
            <p class="safety"><b>تعامل بأمان:</b> عاين الجهاز قبل الدفع، وتأكد من تسجيله في هيئة الغذاء والدواء.</p>
          </div>
          <a class="box seller" href="#/user/${encodeURIComponent(ad.user)}">
            <span class="av">${initial(ad.user)}</span>
            <div><b>${esc(ad.user)} ${verifiedMark(ad.user)}</b><small>${u.store ? 'متجر' : 'عضو'} منذ ${u.joined} · ${userAdCount} إعلانات</small>
            <span class="stars">${icon('i-star')}${u.rating.toFixed(1)} <small style="display:inline;color:var(--muted);font-weight:400">(${u.reviews} تقييم)</small></span></div>
          </a>
        </aside>
      </div>
      ${mine ? '' : `<div class="contact-sticky"><button class="btn btn-primary" data-action="message">${icon('i-chat')}مراسلة</button><button class="btn btn-green" data-action="call">${icon('i-phone')}اتصال</button></div>`}
    </div>`;

    app.querySelectorAll('[data-img]').forEach(b => b.onclick = () => {
      app.querySelector('#g-main').src = imgSrc(ad.images[+b.dataset.img]);
      app.querySelectorAll('[data-img]').forEach(x => x.setAttribute('aria-current', String(x === b)));
    });
    app.querySelectorAll('[data-action="message"]').forEach(b => b.onclick = () => requireLogin(() => startChat(ad)));
    app.querySelectorAll('[data-action="call"]').forEach(b => b.onclick = () => requireLogin(() => openDialog(`
      <h2 id="dlg-title">التواصل مع ${esc(ad.user)}</h2>
      <p style="direction:ltr;text-align:center;font-size:26px;font-weight:700;letter-spacing:2px;color:var(--ink)">05• ••• ••${String(ad.id).slice(-2)}</p>
      <p class="hint" style="text-align:center">الرقم محجوب في النسخة التجريبية. في الإطلاق الفعلي يظهر رقم المعلن بعد تسجيل الدخول.</p>
      <button class="btn btn-primary btn-block" data-close>حسناً</button>`)));
    app.querySelector('[data-action="share"]').onclick = async () => {
      const url = location.href;
      try { if (navigator.share) await navigator.share({ title: ad.title, url }); else { await navigator.clipboard.writeText(url); toast('تم نسخ رابط الإعلان'); } } catch {}
    };
    app.querySelector('[data-action="report"]').onclick = () => openDialog(`
      <h2 id="dlg-title">الإبلاغ عن الإعلان</h2><p>ما سبب البلاغ؟</p>
      ${['إعلان مخالف أو منتج ممنوع (أدوية)', 'معلومات غير صحيحة', 'احتيال أو نصب', 'إعلان مكرر'].map((r, i) => `<label style="display:flex;gap:8px;align-items:center"><input type="radio" name="r" ${i ? '' : 'checked'}> ${r}</label>`).join('')}
      <button class="btn btn-primary btn-block" data-close data-toast="report">إرسال البلاغ</button>`, body => {
      body.querySelector('[data-toast]').addEventListener('click', () => toast('شكراً، سيتم مراجعة البلاغ من فريق سوق طبي'));
    });
    const del = app.querySelector('[data-action="delete-ad"]');
    if (del) del.onclick = () => { myAds = myAds.filter(a => a.id !== ad.id); store.set('my-ads', myAds); toast('تم حذف الإعلان'); go('#/account'); };
    const cform = app.querySelector('#c-form');
    cform.onsubmit = e => {
      e.preventDefault();
      requireLogin(() => {
        const text = cform.text.value.trim();
        if (!text) return;
        (extraComments[ad.id] ||= []).push({ who: me.name, text, createdAt: Date.now(), owner: me.name === ad.user });
        store.set('comments', extraComments);
        render(); toast('تم نشر ردك');
      });
    };
  }
  function miniHtml(a) {
    return `<a class="mini" href="#/ad/${a.id}"><img src="${imgSrc(a.images[0])}" alt="" loading="lazy"><div><b>${esc(a.title)}</b>${priceHtml(a)}<br><small>${esc(a.city)} · ${ago(minutesOf(a))}</small></div></a>`;
  }

  // ---------- login ----------
  function updateLoginBtn() {
    const b = document.getElementById('login-btn');
    b.innerHTML = me ? `<span class="av">${initial(me.name)}</span><span class="hide-sm">${esc(me.name)}</span>` : 'دخول';
  }
  function requireLogin(next) { if (me) return next(); openLogin(next); }
  function openLogin(next) {
    openDialog(`
      <h2 id="dlg-title">تسجيل الدخول</h2>
      <p>أدخل رقم جوالك وسنرسل لك رمز تحقق.</p>
      <form id="l1" style="display:grid;gap:12px">
        <input class="input" name="name" placeholder="الاسم الظاهر للمستخدمين" required maxlength="40" aria-label="الاسم">
        <input class="input" name="phone" type="tel" inputmode="numeric" placeholder="05XXXXXXXX" pattern="05[0-9]{8}" required style="direction:ltr;text-align:right" aria-label="رقم الجوال">
        <button class="btn btn-primary btn-block">إرسال رمز التحقق</button>
      </form>
      <button class="btn btn-outline btn-block" data-close>إلغاء</button>`, body => {
      const f = body.querySelector('#l1');
      f.onsubmit = e => {
        e.preventDefault();
        const name = f.name.value.trim();
        openDialog(`
          <h2 id="dlg-title">رمز التحقق</h2><p>أدخل أي 4 أرقام (نسخة تجريبية).</p>
          <form id="l2" style="display:grid;gap:14px"><div class="otp">${[0, 1, 2, 3].map(i => `<input class="input" inputmode="numeric" maxlength="1" aria-label="الرقم ${i + 1}" required>`).join('')}</div>
          <button class="btn btn-primary btn-block">تأكيد الدخول</button></form>`, b2 => {
          const ins = [...b2.querySelectorAll('.otp input')];
          ins[0].focus();
          ins.forEach((inp, i) => inp.addEventListener('input', () => { inp.value = inp.value.replace(/\D/g, ''); if (inp.value && ins[i + 1]) ins[i + 1].focus(); }));
          b2.querySelector('#l2').onsubmit = e2 => {
            e2.preventDefault();
            me = { name, phone: f.phone.value }; store.set('me', me);
            dlg.close(); toast(`أهلاً ${name}، تم تسجيل الدخول`); render(); next && next();
          };
        });
      };
    });
  }

  // ---------- add ad ----------
  let draft = null;
  function viewNew() {
    document.title = 'أضف إعلان | سوق طبي';
    if (!me) {
      app.innerHTML = `<div class="wrap page narrow"><div class="empty"><b>سجّل الدخول لإضافة إعلان</b>إضافة الإعلانات مجانية وتستغرق أقل من دقيقة.<br><br><button class="btn btn-primary" data-action="login">تسجيل الدخول</button></div></div>`;
      app.querySelector('[data-action="login"]').onclick = () => openLogin(() => render());
      return;
    }
    draft ||= { step: 1, cat: '', sub: '', images: [] };
    const step = draft.step;
    const cat = catOf(draft.cat);
    let body = '';
    if (step === 1) body = `<h2 style="margin:0">اختر القسم</h2><div class="pick-grid">${categories.map(c => `<button type="button" class="pick" data-pick="${c.id}" aria-pressed="${draft.cat === c.id}"><span class="ic">${icon('c-' + c.icon)}</span>${c.name}</button>`).join('')}</div>`;
    if (step === 2) body = `<h2 style="margin:0">اختر القسم الفرعي — ${esc(cat.name)}</h2><div class="pick-grid">${cat.subs.map(s => `<button type="button" class="pick" data-sub="${esc(s)}" aria-pressed="${draft.sub === s}">${esc(s)}</button>`).join('')}</div><button type="button" class="btn btn-outline" data-back>رجوع</button>`;
    if (step === 3) body = `<form id="ad-form" class="form-card">
      <h2 style="margin:0">تفاصيل الإعلان</h2>
      <div><label class="flabel" for="a-title">عنوان الإعلان</label><input id="a-title" class="input" name="title" required minlength="8" maxlength="90" placeholder="مثال: جهاز مراقبة مريض 6 مؤشرات بحالة ممتازة" value="${esc(draft.title)}"></div>
      <div class="row2">
        <div><label class="flabel" for="a-city">المدينة</label><span class="sel" style="display:block"><select id="a-city" name="city" required style="width:100%"><option value="">اختر المدينة</option>${cities.map(c => `<option ${draft.city === c ? 'selected' : ''}>${c}</option>`).join('')}</select></span></div>
        <div><label class="flabel" for="a-cond">الحالة</label><span class="sel" style="display:block"><select id="a-cond" name="condition" style="width:100%">${['جديد', 'مستعمل', 'خدمة', 'وظيفة', 'تقبيل', 'إيجار'].map(c => `<option ${draft.condition === c ? 'selected' : ''}>${c}</option>`).join('')}</select></span></div>
      </div>
      <div><label class="flabel" for="a-price">السعر (ريال)</label><input id="a-price" class="input" name="price" type="number" inputmode="numeric" min="0" placeholder="اتركه فارغاً لـ «السعر عند التواصل»" value="${esc(draft.price ?? '')}" ${draft.cat === 'donate' ? 'disabled' : ''}></div>
      <div><label class="flabel" for="a-desc">الوصف</label><textarea id="a-desc" class="input" name="description" required minlength="20" maxlength="1500" placeholder="اذكر الماركة والموديل وسنة الصنع والحالة وما يشمله البيع">${esc(draft.description)}</textarea></div>
      <div><span class="flabel">الصور (حتى 4)</span><label class="upload">${icon('i-camera')}<span>اضغط لإضافة صور الجهاز</span><input type="file" accept="image/*" multiple hidden id="a-files"></label><div class="previews" id="previews">${draft.images.map(s => `<img src="${s}" alt="">`).join('')}</div><p class="hint">بدون صور سنستخدم صورة توضيحية للقسم.</p></div>
      <label style="display:flex;gap:8px;align-items:start;font-size:13.5px"><input type="checkbox" required style="margin-top:5px"> أتعهد بأن الإعلان لا يتضمن أدوية أو منتجات ممنوعة، وأن المعلومات صحيحة.</label>
      <div style="display:flex;gap:8px"><button class="btn btn-primary" style="flex:1">نشر الإعلان</button><button type="button" class="btn btn-outline" data-back>رجوع</button></div>
    </form>`;
    app.innerHTML = `<div class="wrap page narrow"><h1 class="page-title">أضف إعلان</h1><div class="box form-card"><div class="steps">${[1, 2, 3].map(i => `<span class="${i <= step ? 'on' : ''}"></span>`).join('')}</div>${body}</div></div>`;
    app.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => { draft.cat = b.dataset.pick; draft.sub = ''; draft.step = 2; render(); });
    app.querySelectorAll('[data-sub]').forEach(b => b.onclick = () => { draft.sub = b.dataset.sub; draft.step = 3; render(); });
    app.querySelectorAll('[data-back]').forEach(b => b.onclick = () => { saveDraftFields(); draft.step--; render(); });
    const form = app.querySelector('#ad-form');
    if (!form) return;
    function saveDraftFields() {
      if (!form) return;
      Object.assign(draft, { title: form.title.value, city: form.city.value, condition: form.condition.value, price: form.price.value, description: form.description.value });
    }
    app.querySelector('#a-files').onchange = async e => {
      const files = [...e.target.files].slice(0, 4 - draft.images.length);
      for (const file of files) { try { draft.images.push(await shrink(file)); } catch {} }
      app.querySelector('#previews').innerHTML = draft.images.map(s => `<img src="${s}" alt="">`).join('');
    };
    form.onsubmit = e => {
      e.preventDefault(); saveDraftFields();
      const fallback = { devices: 'monitor', homecare: 'wheelchair', dental: 'dental', beauty: 'laser', supplies: 'gloves', clinics: 'clinic', jobs: 'job', services: 'service', donate: 'wheelchair' }[draft.cat];
      const ad = {
        id: Date.now() % 1e9, cat: draft.cat, sub: draft.sub, title: draft.title.trim(), city: draft.city,
        price: draft.cat === 'donate' ? 0 : (draft.price === '' ? null : Math.max(0, +draft.price)),
        user: me.name, createdAt: Date.now(), minutes: 0, condition: draft.condition, description: draft.description.trim(),
        images: draft.images.length ? draft.images : [[fallback, 0, false]], views: 1, comments: []
      };
      myAds.unshift(ad);
      try { store.set('my-ads', myAds); } catch {}
      draft = null; toast('تم نشر إعلانك بنجاح 🎉'); go('#/ad/' + ad.id);
    };
  }
  function shrink(file) {
    return new Promise((resolve, reject) => {
      const img = new Image(); const url = URL.createObjectURL(file);
      img.onload = () => {
        const scale = Math.min(1, 800 / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = img.width * scale; c.height = img.height * scale;
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', 0.72));
      };
      img.onerror = reject; img.src = url;
    });
  }

  // ---------- user profile ----------
  function viewUser(name) {
    const u = userInfo(name);
    const list = allAds().filter(a => a.user === name).sort((a, b) => minutesOf(a) - minutesOf(b));
    document.title = name + ' | سوق طبي';
    app.innerHTML = `<div class="wrap page"><div class="box">
      <div class="profile-head"><span class="av">${initial(name)}</span><div>
        <h1>${esc(name)} ${verifiedMark(name)}</h1>
        <div class="profile-stats"><span class="stars">${icon('i-star')}${u.rating.toFixed(1)}</span><span><b>${u.reviews}</b> تقييم</span><span><b>${list.length}</b> إعلان</span><span>عضو منذ <b>${u.joined}</b></span>${u.store ? '<span class="tag">متجر موثق</span>' : ''}</div>
      </div>${me && me.name === name ? '' : `<button class="btn btn-primary" style="margin-inline-start:auto" data-action="follow">متابعة</button>`}</div></div>
      <h2 class="page-title" style="margin-top:18px;font-size:18px">إعلانات ${esc(name)}</h2>
      <div class="feed">${list.map(postHtml).join('') || '<div class="empty"><b>لا توجد إعلانات</b></div>'}</div></div>`;
    const f = app.querySelector('[data-action="follow"]');
    if (f) f.onclick = () => { f.textContent = f.textContent === 'متابعة' ? 'تتابعه ✓' : 'متابعة'; toast(f.textContent === 'متابعة' ? 'تم إلغاء المتابعة' : 'ستصلك تنبيهات بإعلاناته الجديدة'); };
  }

  // ---------- favorites ----------
  function viewFavorites() {
    document.title = 'المفضلة | سوق طبي';
    const list = allAds().filter(a => favs.has(String(a.id)));
    app.innerHTML = `<div class="wrap page"><h1 class="page-title">${icon('i-heart')}المفضلة</h1>
      <div class="feed">${list.map(postHtml).join('') || '<div class="empty"><b>لا توجد إعلانات في المفضلة</b>اضغط على ♡ بجانب أي إعلان لحفظه هنا.</div>'}</div></div>`;
  }

  // ---------- account ----------
  function viewAccount() {
    document.title = 'حسابي | سوق طبي';
    if (!me) {
      app.innerHTML = `<div class="wrap page narrow"><div class="empty"><b>مرحباً بك في سوق طبي</b>سجّل الدخول لإدارة إعلاناتك ورسائلك ومفضلتك.<br><br><button class="btn btn-primary" data-action="login">تسجيل الدخول</button></div></div>`;
      app.querySelector('[data-action="login"]').onclick = () => openLogin(() => render());
      return;
    }
    const mine = myAds;
    app.innerHTML = `<div class="wrap page narrow">
      <div class="box"><div class="profile-head"><span class="av">${initial(me.name)}</span><div><h1>${esc(me.name)}</h1><div class="profile-stats"><span style="direction:ltr">${esc(me.phone)}</span><span><b>${mine.length}</b> إعلان</span><span><b>${favs.size}</b> في المفضلة</span></div></div></div></div>
      <div class="tabs" role="tablist"><button role="tab" aria-selected="true">إعلاناتي</button><a role="tab" href="#/favorites" style="padding:10px 14px;font-weight:600;color:var(--muted)">المفضلة</a><a role="tab" href="#/messages" style="padding:10px 14px;font-weight:600;color:var(--muted)">الرسائل</a></div>
      <div class="feed">${mine.map(postHtml).join('') || `<div class="empty"><b>لم تضف أي إعلان بعد</b><a class="btn btn-primary" href="#/new" style="margin-top:10px">${icon('i-plus')}أضف إعلانك الأول</a></div>`}</div>
      <div style="display:flex;gap:8px;margin-top:18px;flex-wrap:wrap"><button class="btn btn-outline" data-action="theme">${icon('i-moon')}تبديل الوضع الليلي</button><button class="btn btn-outline" data-action="logout">تسجيل الخروج</button></div>
    </div>`;
    app.querySelector('[data-action="logout"]').onclick = () => { me = null; store.set('me', null); toast('تم تسجيل الخروج'); go('#/'); };
  }

  // ---------- messages ----------
  function seedChats() {
    return [
      { id: 'c1', with: 'مؤسسة الشفاء للتجهيزات', ad: 102, msgs: [{ me: true, t: 'السلام عليكم، هل جهاز المراقبة متوفر؟', m: 50 }, { me: false, t: 'وعليكم السلام، نعم متوفر ويوجد منه 3 قطع.', m: 46 }, { me: false, t: 'السعر يشمل التركيب والتدريب داخل جدة.', m: 45 }] },
      { id: 'c2', with: 'أبو فيصل', ad: 101, msgs: [{ me: true, t: 'هل يوجد مجال في السعر؟', m: 300 }, { me: false, t: 'حياك الله، آخر سعر 3500 للجاد.', m: 280 }] }
    ];
  }
  function startChat(ad) {
    chats ||= seedChats();
    let c = chats.find(x => x.ad === ad.id);
    if (!c) { c = { id: 'c' + Date.now(), with: ad.user, ad: ad.id, msgs: [] }; chats.unshift(c); store.set('chats', chats); }
    go('#/messages/' + c.id);
  }
  function viewMessages(openId) {
    document.title = 'الرسائل | سوق طبي';
    if (!me) {
      app.innerHTML = `<div class="wrap page narrow"><div class="empty"><b>سجّل الدخول لعرض رسائلك</b><br><button class="btn btn-primary" data-action="login">تسجيل الدخول</button></div></div>`;
      app.querySelector('[data-action="login"]').onclick = () => openLogin(() => render());
      return;
    }
    chats ||= seedChats();
    const open = chats.find(c => c.id === openId);
    const lastText = c => c.msgs.length ? c.msgs[c.msgs.length - 1].t : 'محادثة جديدة';
    const openAd = open && findAd(open.ad);
    app.innerHTML = `<div class="wrap page"><h1 class="page-title">${icon('i-chat')}الرسائل</h1>
      <div class="chat-layout ${open ? 'has-open' : ''}">
        <div class="chat-list">${chats.map(c => `<a class="chat-item" href="#/messages/${c.id}" aria-current="${c === open}"><span class="av">${initial(c.with)}</span><div><b>${esc(c.with)}</b><small>${esc(lastText(c))}</small></div></a>`).join('')}</div>
        <div class="chat-pane">${open ? `
          <div class="chat-top"><a href="#/messages" aria-label="رجوع" style="display:grid">${icon('i-back')}</a><span class="av" style="width:36px;height:36px;font-size:14px">${initial(open.with)}</span><div><b>${esc(open.with)}</b>${openAd ? `<br><a href="#/ad/${openAd.id}">${esc(openAd.title)}</a>` : ''}</div></div>
          <div class="chat-msgs" id="msgs">${open.msgs.map(m => `<div class="bubble ${m.me ? 'me' : 'them'}">${esc(m.t)}<time>${m.at ? ago(Math.round((Date.now() - m.at) / 60000)) : ago(m.m)}</time></div>`).join('') || '<p class="hint" style="text-align:center">ابدأ المحادثة بسؤال عن الإعلان.</p>'}</div>
          <form class="chat-send" id="send"><input class="input" name="t" placeholder="اكتب رسالة…" autocomplete="off" required maxlength="500" aria-label="الرسالة"><button class="btn btn-primary">إرسال</button></form>`
          : '<div class="chat-empty">اختر محادثة لعرضها</div>'}</div>
      </div></div>`;
    const box = app.querySelector('#msgs');
    if (box) box.scrollTop = box.scrollHeight;
    const send = app.querySelector('#send');
    if (send) send.onsubmit = e => {
      e.preventDefault();
      const t = send.t.value.trim(); if (!t) return;
      open.msgs.push({ me: true, t, at: Date.now() }); store.set('chats', chats); render();
      setTimeout(() => {
        open.msgs.push({ me: false, t: 'شكراً لتواصلك، سأرد عليك بالتفاصيل قريباً بإذن الله. (رد تلقائي تجريبي)', at: Date.now() });
        store.set('chats', chats);
        if (parseHash().parts[1] === open.id) render();
      }, 1400);
    };
    app.querySelector('.chat-send input')?.focus();
  }

  // ---------- about ----------
  function viewAbout() {
    document.title = 'عن سوق طبي';
    app.innerHTML = `<div class="wrap page narrow"><div class="box" style="display:grid;gap:10px">
      <h1 class="page-title">عن سوق طبي</h1>
      <p>سوق طبي منصة إعلانات مبوبة متخصصة في القطاع الصحي بالمملكة: بيع وشراء الأجهزة والمستلزمات الطبية، تقبيل وتأجير العيادات، الوظائف الصحية، الخدمات الطبية، والتبرع بالأجهزة لمن يحتاجها.</p>
      <h3>شروط الاستخدام المختصرة</h3>
      <ul><li>يُمنع الإعلان عن الأدوية والمنتجات التي تتطلب ترخيصاً دون إرفاقه.</li><li>يجب أن تكون الأجهزة مسجلة لدى الجهات المختصة.</li><li>العمولة اختيارية على البيع وتدعم استمرار المنصة.</li></ul>
      <p class="hint">هذه نسخة عرض تجريبية أعدتها ريسبارك للحلول الرقمية. <a href="/concept.html" style="color:var(--brand)">اطّلع على التصور المبدئي للمشروع</a>.</p>
    </div></div>`;
  }

  // ---------- header actions ----------
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-action]');
    if (!a) return;
    const act = a.dataset.action;
    if (act === 'theme') {
      const root = document.documentElement;
      const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
      root.dataset.theme = dark ? 'light' : 'dark';
      try { localStorage.setItem('st-theme', root.dataset.theme); } catch {}
    } else if (act === 'account') {
      me ? go('#/account') : openLogin();
    } else if (act === 'hide-strip') {
      document.getElementById('demo-strip').remove(); store.set('strip', 'hidden');
    } else if (act === 'notifs') {
      openDialog(`<h2 id="dlg-title">التنبيهات</h2>
        <div><div class="notif"><span class="ic">${icon('c-pulse')}</span><div>إعلان جديد في «أجهزة مراقبة المرضى» بمدينة جدة<small>قبل 18 دقيقة</small></div></div>
        <div class="notif"><span class="ic">${icon('i-chat')}</span><div>ردت «مؤسسة الشفاء للتجهيزات» على رسالتك<small>قبل 45 دقيقة</small></div></div>
        <div class="notif"><span class="ic">${icon('c-heart')}</span><div>انخفض سعر «كرسي متحرك كهربائي قابل للطي» في مفضلتك<small>قبل ساعتين</small></div></div></div>
        <button class="btn btn-outline btn-block" data-close>إغلاق</button>`);
    }
  });
  if (store.get('strip', '') === 'hidden') document.getElementById('demo-strip')?.remove();

  render();
})();
