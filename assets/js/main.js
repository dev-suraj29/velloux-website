/* Velloux — shared behaviour for every page.
   Preloader (once per session) → page hero animation → scroll reveals → form + menu. */
(function () {
  'use strict';
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isBot = /bot|crawl|spider|lighthouse|headless|prerender/i.test(navigator.userAgent);
  const skipAnim = reduceMotion || isBot;
  const hasG = !!window.gsap;
  if (!hasG) root.classList.remove('js');
  else if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  /* ---------- Mobile menu ---------- */
  const toggle = document.getElementById('mobile-toggle'), menu = document.getElementById('mobile-menu');
  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      const open = menu.classList.toggle('hidden') === false;
      toggle.setAttribute('aria-expanded', open);
    });
    menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => { menu.classList.add('hidden'); toggle.setAttribute('aria-expanded', false); }));
  }

  /* ---------- Sticky nav styling ---------- */
  const nav = document.getElementById('main-nav');
  const navClasses = ['bg-ink/85', 'backdrop-blur-lg', 'border-b', 'border-white/10'];
  const onScroll = () => { const on = window.scrollY > 50; navClasses.forEach(c => nav && nav.classList.toggle(c, on)); };
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ---------- Home hero: code types → page renders → scores hit 100 (~3s) ---------- */
  const CODE = '<section class="hero">\n  <h1>Built to convert.</h1>\n  <p>Fast. Findable. Yours.</p>\n  <a href="#book">Book a call</a>\n</section>';
  const esc = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const hl = t => esc(t).replace(/(&lt;\/?)([a-z0-9]+)|("[^"]*")|\b(class|href)\b/g,
    (m, a, b, c, d) => a ? a + '<span class="code-tag">' + b + '</span>' : c ? '<span class="code-str">' + c + '</span>' : '<span class="code-kw">' + d + '</span>');
  const codeEl = document.getElementById('code-typer');
  const swEl = document.getElementById('stopwatch');
  const statusEl = document.getElementById('build-status');
  const isHome = !!codeEl;
  const rings = hasG ? gsap.utils.toArray('.ring') : [];

  function heroFinal() {
    if (!hasG) return;
    gsap.set('.hero-in, .line-inner', { autoAlpha: 1, y: 0, yPercent: 0, clearProps: 'transform' });
    if (!isHome) return;
    gsap.set('#preview, #preview-btn', { autoAlpha: 1, y: 0, scale: 1, clearProps: 'transform' });
    gsap.set('#skeleton', { autoAlpha: 0 });
    codeEl.innerHTML = hl(CODE);
    rings.forEach(r => { r.querySelector('.ring-fg').style.strokeDashoffset = 0; r.querySelector('.ring-num').textContent = 100; });
    swEl.textContent = '3.0s · you stayed ✓'; statusEl.textContent = 'live'; statusEl.style.color = '#7CE0C0';
  }

  function innerHero() {
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .fromTo('.line-inner', { yPercent: 110, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.6, stagger: 0.1 }, 0)
      .fromTo('.hero-in', { y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, stagger: 0.06 }, 0.1);
  }

  function homeHero() {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.fromTo('.line-inner', { yPercent: 110, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.6, stagger: 0.1 }, 0)
      .fromTo('.hero-in', { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, stagger: 0.06 }, 0.1)
      .to({ v: 0 }, { v: 3, duration: 3, ease: 'none',
          onUpdate() { swEl.textContent = this.targets()[0].v.toFixed(1) + 's'; },
          onComplete() { swEl.textContent = '3.0s · you stayed ✓'; } }, 0.2)
      .to({ n: 0 }, { n: CODE.length, duration: 1.3, ease: 'none',
          onUpdate() { codeEl.innerHTML = hl(CODE.slice(0, Math.round(this.targets()[0].n))) + '<span class="caret"></span>'; },
          onComplete() { codeEl.innerHTML = hl(CODE); } }, 0.3)
      .to('#skeleton', { autoAlpha: 0, duration: 0.25 }, 1.6)
      .fromTo('#preview', { y: 10, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.45 }, 1.6)
      .fromTo('#preview-btn', { scale: 0.85 }, { scale: 1, duration: 0.5, ease: 'back.out(2.2)' }, 1.9)
      .to('.ring-fg', { strokeDashoffset: 0, duration: 0.9, stagger: 0.08, ease: 'power2.out' }, 1.9)
      .to({ k: 0 }, { k: 100, duration: 0.9, ease: 'power2.out',
          onUpdate() { const v = Math.round(this.targets()[0].k); rings.forEach(r => r.querySelector('.ring-num').textContent = v); } }, 1.9)
      .add(() => { statusEl.textContent = 'live'; statusEl.style.color = '#7CE0C0'; }, 2.8);
  }

  let heroStarted = false;
  function startHero() {
    if (heroStarted || !hasG) return; heroStarted = true;
    if (skipAnim) { heroFinal(); return; }
    if (isHome) homeHero(); else innerHero();
  }

  /* ---------- Preloader: ~1.3s, waits for fonts, once per session ---------- */
  function endIntro() { root.classList.add('no-pl'); startHero(); }

  function runPreloader() {
    const cnt = document.getElementById('pl-count'), bar = document.getElementById('pl-bar'), txt = document.getElementById('pl-text');
    const steps = [[0, 'Writing markup'], [30, 'Tuning performance'], [60, 'Adding schema'], [92, 'Ready']];
    let fontsReady = false;
    const fr = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    Promise.race([fr, new Promise(r => setTimeout(r, 2200))]).then(() => { fontsReady = true; });

    const st = { v: 0 };
    const tl = gsap.timeline();
    tl.fromTo('.pl-char', { yPercent: 115 }, { yPercent: 0, duration: 0.55, stagger: 0.045, ease: 'power3.out' }, 0)
      .to(st, { v: 100, duration: 1.1, ease: 'power2.inOut',
          onUpdate() {
            const v = Math.round(st.v);
            cnt.textContent = String(v).padStart(3, '0');
            bar.style.transform = 'scaleX(' + (st.v / 100) + ')';
            for (const s of steps) if (v >= s[0]) txt.textContent = s[1];
          } }, 0.1)
      .add(function waitForFonts() {
          tl.pause();
          const t = setInterval(() => { if (fontsReady) { clearInterval(t); tl.resume(); } }, 40);
      })
      .to('.pl-inner', { autoAlpha: 0, y: -12, duration: 0.3, ease: 'power2.in' })
      .to('.pl-top', { yPercent: -100, duration: 0.75, ease: 'expo.inOut' }, '>-=0.05')
      .to('.pl-bot', { yPercent: 100, duration: 0.75, ease: 'expo.inOut' }, '<')
      .add(startHero, '<+=0.3')
      .add(endIntro);
    setTimeout(endIntro, 4500); // failsafe
  }

  if (hasG) {
    if (root.classList.contains('no-pl') || !root.classList.contains('js') || skipAnim) { root.classList.add('no-pl'); startHero(); }
    else runPreloader();

    if (!skipAnim && window.ScrollTrigger) {
      gsap.utils.toArray('.scroll-reveal').forEach(el => {
        gsap.from(el, { scrollTrigger: { trigger: el, start: 'top 90%' }, opacity: 0, y: 30, duration: 0.7, ease: 'power3.out' });
      });
    }
  }

  /* ---------- Contact form → WhatsApp with the enquiry pre-filled ---------- */
  const form = document.getElementById('quote-form'), note = document.getElementById('form-note');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const f = new FormData(form);
      const msg = 'Hi Velloux, I would like a quote.\nName: ' + f.get('name') + '\nProject: ' + f.get('type') + '\nWhatsApp/Phone: ' + f.get('phone') + '\nEmail: ' + (f.get('email') || '-') + '\nDetails: ' + (f.get('vision') || '-');
      window.open('https://wa.me/910000000000?text=' + encodeURIComponent(msg), '_blank', 'noopener');
      note.textContent = 'Thanks, ' + f.get('name') + '. WhatsApp has opened with your enquiry. Send it and we will reply within one business day.';
    });
  }
})();
