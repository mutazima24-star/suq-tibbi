'use strict';
const menu = document.querySelector('.menu-toggle');
const nav = document.getElementById('site-nav');
function closeMenu() { menu.setAttribute('aria-expanded', 'false'); nav.classList.remove('is-open'); }
menu.addEventListener('click', () => { const open = menu.getAttribute('aria-expanded') !== 'true'; menu.setAttribute('aria-expanded', String(open)); nav.classList.toggle('is-open', open); });
nav.addEventListener('click', (event) => { if (event.target.closest('a')) closeMenu(); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') { closeMenu(); menu.focus(); } });

const examples = {
  market: [
    { title: 'كرسي متحرك يدوي', city: 'الرياض', meta: 'مستعمل · قطعة واحدة', price: '٦٥٠ ر.س', image: 'wheelchair', detail: 'كرسي متحرك يدوي بحالة جيدة. تُعرض حالة المنتج والكمية وطريقة التسليم قبل التواصل مع المعلن.' },
    { title: 'جهاز قياس ضغط رقمي', city: 'جدة', meta: 'جديد · قطعتان', price: '١٨٠ ر.س', image: 'monitor', detail: 'جهاز قياس ضغط رقمي. يتضمن الإعلان المقترح الماركة والموديل ومحتويات العبوة وحالة الضمان.' }
  ],
  donation: [
    { title: 'كرسي متحرك للتبرع', city: 'الدمام', meta: 'مستعمل · بحالة جيدة', price: 'تبرع', image: 'wheelchair', detail: 'مسار التبرع المقترح: وصف الحالة، مراجعة العرض، المطابقة مع الجهة المستفيدة، ثم تأكيد الاستلام.' },
    { title: 'فائض ضمادات مغلقة', city: 'الرياض', meta: 'عبوات مغلقة · ١٠ علب', price: 'تبرع', image: 'supplies', detail: 'يوضح العرض الكمية والصلاحية وسلامة العبوات وظروف التخزين، وتتم مراجعته قبل المطابقة مع جهة مستفيدة.' }
  ],
  jobs: [
    { title: 'أخصائي علاج طبيعي', city: 'الرياض', meta: 'دوام كامل · مركز تأهيل', price: 'فرصة مهنية', image: 'jobs', detail: 'مثال لإعلان يعرض التخصص والخبرة ونوع الدوام وبيانات المنشأة، مع تقديم يحافظ على خصوصية المتقدم.' },
    { title: 'فني أجهزة طبية', city: 'جدة', meta: 'دوام كامل · منشأة طبية', price: 'فرصة مهنية', image: 'jobs', detail: 'إعلان توضيحي لوظيفة فني أجهزة طبية. تعرض الصفحة المتطلبات والمسؤوليات وموقع العمل قبل التقديم.' }
  ]
};
const descriptions = { market: 'أسعار وبيانات توضيحية لشرح تجربة السوق.', donation: 'تبرعات توضيحية؛ المراجعة والمطابقة تسبقان الاستلام.', jobs: 'فرص مهنية توضيحية لشرح مسار التقديم.' };
const placeholders = { market: 'ابحث عن جهاز أو مستلزم', donation: 'ابحث في التبرعات', jobs: 'ابحث عن تخصص أو فرصة' };
const tabs = [...document.querySelectorAll('[data-mode]')];
const search = document.getElementById('preview-search');
const city = document.getElementById('preview-city');
const results = document.getElementById('preview-results');
let mode = 'market';
function normalize(value) { return value.replace(/[أإآ]/g, 'ا').replace(/[\u064B-\u065F\u0640]/g, '').toLowerCase().trim(); }
function render() {
  const query = normalize(search.value);
  const filtered = examples[mode].filter(item => (!city.value || item.city === city.value) && normalize(`${item.title} ${item.meta} ${item.city}`).includes(query));
  results.replaceChildren();
  for (const item of filtered) {
    const card = document.createElement('article'); card.className = 'listing-card';
    // All template values are fixed, local demonstration content; user input is only used for filtering.
    card.innerHTML = `<div class="listing-image"><img src="/assets/${item.image}.svg" width="260" height="190" alt="رسم توضيحي: ${item.title}"></div><div class="listing-body"><h3 class="mock-title">${item.title}</h3><p class="mock-meta">${item.meta}</p><p class="listing-location">${item.city}</p><div class="listing-foot"><strong class="mock-price">${item.price}</strong><button class="demo-details" type="button">التفاصيل<span class="sr-only">: ${item.title}</span></button></div></div>`;
    card.querySelector('button').addEventListener('click', () => {
      document.getElementById('demo-title').textContent = item.title;
      document.getElementById('demo-detail').textContent = item.detail;
      document.getElementById('demo-dialog').showModal();
    });
    results.append(card);
  }
  document.getElementById('preview-empty').hidden = filtered.length !== 0;
  document.getElementById('mode-note').textContent = `${filtered.length.toLocaleString('ar-SA')} نتائج · ${descriptions[mode]}`;
}
function activate(tab, focus = false) {
  mode = tab.dataset.mode;
  for (const button of tabs) { const selected = button === tab; button.classList.toggle('active', selected); button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1; }
  document.getElementById('preview-panel').setAttribute('aria-labelledby', tab.id);
  search.placeholder = placeholders[mode]; search.value = ''; city.value = '';
  render(); if (focus) tab.focus();
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => activate(tab));
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowLeft') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowRight') next = (index - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next !== undefined) { event.preventDefault(); activate(tabs[next], true); }
  });
});
search.addEventListener('input', render); city.addEventListener('change', render); render();

const form = document.getElementById('feedback-form');
const submit = document.getElementById('fb-submit');
const status = document.getElementById('fb-status');
const thanks = document.getElementById('ty-overlay');
function showStatus(message) { status.style.display = 'block'; status.textContent = message; }
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (submit.disabled) return;
  const detail = document.getElementById('fb-detail').value.trim();
  if (!detail) { showStatus('من فضلك اكتب تفصيل الملاحظة قبل الإرسال.'); document.getElementById('fb-detail').focus(); return; }
  submit.disabled = true; submit.textContent = 'جارٍ إرسال الملاحظة…'; form.setAttribute('aria-busy', 'true');
  status.style.display = 'none';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const data = Object.fromEntries(['name', 'contact', 'type', 'section', 'detail', 'priority', 'website'].map(key => [key, document.getElementById(`fb-${key}`).value.trim()]));
    if (data.website) { showStatus('تعذر إرسال الملاحظة.'); return; }
    const payload = { name: data.name || 'زائر الموقع', message: data.detail, contact: data.contact, type: data.type, section: data.section, priority: data.priority, _subject: 'ملاحظة جديدة — سوق طبي', _template: 'table', _captcha: 'false', _honey: data.website };
    const response = await fetch('https://formsubmit.co/ajax/mutazima24@gmail.com', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload), signal: controller.signal });
    const result = await response.json().catch(() => null);
    if (!response.ok || ![true, 'true'].includes(result?.success)) {
      if (/activat|confirm.*email/i.test(result?.message || '')) {
        showStatus('خدمة البريد بحاجة إلى تفعيل من إدارة الموقع. احتفظنا بملاحظتك هنا ولم نؤكد إرسالها.');
        return;
      }
      showStatus(response.status === 429 ? 'وصلت إلى حد المحاولات المتتابعة. انتظر دقيقة ثم حاول مجدداً.' : 'تعذر تأكيد إرسال الملاحظة. احتفظنا بالنص هنا؛ حاول مرة أخرى بعد قليل.');
      return;
    }
    form.reset(); thanks.showModal();
  } catch {
    showStatus('تعذر تأكيد وصول الملاحظة. احتفظنا بالنص هنا؛ تحقق من الاتصال قبل إعادة المحاولة.');
  } finally {
    clearTimeout(timer); submit.disabled = false; submit.textContent = 'إرسال الملاحظة لريسبارك'; form.removeAttribute('aria-busy');
  }
});
thanks.addEventListener('close', () => submit.focus());
