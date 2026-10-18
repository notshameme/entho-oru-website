/* ============================================================
   DUKHAN LOUNGE · main.js (v4)
   preloader · cursor smoke in hero (WebGL) · vines · reveals ·
   flavours · kitchen · live fixtures
   ============================================================ */
(() => {
  "use strict";
  const root = document.documentElement;
  const REDUCED = root.classList.contains('reduced');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const STAR = '<svg aria-hidden="true"><use href="#star8"/></svg>';

  /* ============================================================
     HERO · the brand art is shown as-is (no effects on the logo)
     ============================================================ */
  function initHero() {
    const heroSec = document.getElementById('hero');
    if (heroSec) requestAnimationFrame(() => requestAnimationFrame(() => heroSec.classList.add('ready')));
    const vines = document.getElementById('heroFrame');
    if (vines) setTimeout(() => vines.classList.add('in'), 300);
    initCursorSmoke();
  }

  /* Cursor smoke (hero only). A small smoke simulation: each frame the
     smoke field drifts up and curls (curl noise), slowly fades, and the
     mouse path since the last frame is painted in as one smooth stroke.
     It only runs while there is smoke on screen. */
  function initCursorSmoke() {
    const canvas = document.getElementById('heroSmoke');
    const hero = document.getElementById('hero');
    if (!canvas || !hero || REDUCED || matchMedia('(hover: none)').matches) return;
    const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false, depth: false, powerPreference: 'low-power' });
    if (!gl) return;

    const VS = 'attribute vec2 p;varying vec2 uv;void main(){uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}';
    const NOISE = `
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}`;
    const SIM_FS = `precision highp float;varying vec2 uv;
uniform sampler2D src;uniform float t,dt,asp,amt,rad;uniform vec2 a,b;${NOISE}
void main(){
 vec2 q=vec2(uv.x*asp,uv.y)*2.2+vec2(0.,-t*.05);
 float e=.02;
 float dx=fbm(q+vec2(e,0.))-fbm(q-vec2(e,0.));
 float dy=fbm(q+vec2(0.,e))-fbm(q-vec2(0.,e));
 vec2 vel=vec2(dy,-dx)/(2.*e)*.0015+vec2(0.,.0017);
 vel.x/=asp;
 float d=texture2D(src,uv-vel*dt).r;
 d=max(d*pow(.995,dt)-.0005*dt,0.);
 vec2 P=vec2(uv.x*asp,uv.y),A=vec2(a.x*asp,a.y),B=vec2(b.x*asp,b.y);
 vec2 pa=P-A,ba=B-A;float k=clamp(dot(pa,ba)/max(dot(ba,ba),1e-7),0.,1.);
 float dist=length(pa-ba*k);
 d+=amt*exp(-dist*dist/(rad*rad));
 gl_FragColor=vec4(min(d,1.),0.,0.,1.);
}`;
    const OUT_FS = `precision mediump float;varying vec2 uv;
uniform sampler2D src;uniform float t,asp;${NOISE}
void main(){
 float d=texture2D(src,uv).r;
 vec2 q=vec2(uv.x*asp,uv.y)*11.+vec2(0.,-t*.16);
 float f=fbm(q+fbm(q*.7+t*.02)*1.6);
 float wisps=pow(1.-abs(f*2.-1.),3.2);
 float a=smoothstep(.0,.6,d)*(.1+1.1*wisps);
 a=clamp(a*.62,0.,.6);
 gl_FragColor=vec4(vec3(.97,.91,.85)*a,a);
}`;
    const compile = (fsrc) => {
      const mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; };
      const v = mk(gl.VERTEX_SHADER, VS), f = mk(gl.FRAGMENT_SHADER, fsrc);
      if (!v || !f) return null;
      const p = gl.createProgram(); gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p);
      return gl.getProgramParameter(p, gl.LINK_STATUS) ? p : null;
    };
    const sim = compile(SIM_FS), out = compile(OUT_FS);
    if (!sim || !out) return;
    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const bindQuad = (p) => { const l = gl.getAttribLocation(p, 'p'); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 2, gl.FLOAT, false, 0, 0); };
    const U = (p, n) => gl.getUniformLocation(p, n);

    let SW = 2, SH = 2, W = 1, H = 1, asp = 1, targets = [];
    const makeTarget = () => {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, SW, SH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      const fb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
      return { tex, fb };
    };
    const resize = () => {
      W = hero.clientWidth; H = hero.clientHeight; asp = W / Math.max(1, H);
      canvas.width = Math.max(2, Math.round(W * 0.5));
      canvas.height = Math.max(2, Math.round(H * 0.5));
      SW = Math.max(2, Math.round(W / 4)); SH = Math.max(2, Math.round(H / 4));
      targets.forEach(tg => { gl.deleteTexture(tg.tex); gl.deleteFramebuffer(tg.fb); });
      targets = [makeTarget(), makeTarget()];
    };
    resize();
    addEventListener('resize', resize, { passive: true });

    let mouse = null, prev = null, lastMove = 0, raf = 0, last = 0;
    const t0 = performance.now();
    const frame = (now) => {
      raf = 0;
      const dt = clamp((now - last) / 16.67, 0.5, 3); last = now;
      const t = (now - t0) / 1000;
      // stroke from where the mouse was last frame to where it is now
      let A = [-9, -9], B = [-9, -9], amt = 0;
      if (mouse && prev) {
        const len = Math.hypot((mouse[0] - prev[0]) * W, (mouse[1] - prev[1]) * H);
        if (len > 0.5) { A = prev; B = mouse; amt = clamp(len * 0.016, 0.05, 0.34); }
      }
      if (mouse) prev = mouse.slice();
      // simulate
      gl.useProgram(sim); bindQuad(sim);
      gl.bindFramebuffer(gl.FRAMEBUFFER, targets[1].fb);
      gl.viewport(0, 0, SW, SH);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, targets[0].tex);
      gl.uniform1i(U(sim, 'src'), 0);
      gl.uniform1f(U(sim, 't'), t); gl.uniform1f(U(sim, 'dt'), dt); gl.uniform1f(U(sim, 'asp'), asp);
      gl.uniform1f(U(sim, 'amt'), amt); gl.uniform1f(U(sim, 'rad'), 0.017);
      gl.uniform2f(U(sim, 'a'), A[0], A[1]); gl.uniform2f(U(sim, 'b'), B[0], B[1]);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      targets.reverse();
      // draw
      gl.useProgram(out); bindQuad(out);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.bindTexture(gl.TEXTURE_2D, targets[0].tex);
      gl.uniform1i(U(out, 'src'), 0);
      gl.uniform1f(U(out, 't'), t); gl.uniform1f(U(out, 'asp'), asp);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      // keep going while smoke is still fading out
      if (now - lastMove < 9000) raf = requestAnimationFrame(frame);
      else { gl.clear(gl.COLOR_BUFFER_BIT); targets.forEach(tg => { gl.bindFramebuffer(gl.FRAMEBUFFER, tg.fb); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT); }); mouse = prev = null; }
    };
    hero.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      const r = hero.getBoundingClientRect();
      mouse = [(e.clientX - r.left) / W, 1 - (e.clientY - r.top) / H];
      lastMove = performance.now();
      if (!raf) { last = lastMove; raf = requestAnimationFrame(frame); }
    }, { passive: true });
    hero.addEventListener('pointerleave', () => { prev = null; mouse = null; });
  }

  /* ============================================================
     VINES · measure every stroke so it can draw itself
     ============================================================ */
  function initVines() {
    document.querySelectorAll('.draw .stroke, .draw .leaf').forEach((p, i) => {
      let len = 300;
      try { len = Math.ceil(p.getTotalLength ? p.getTotalLength() : 300); } catch (_) {}
      if (!len || !isFinite(len)) len = 300;
      p.style.setProperty('--len', len);
      p.style.setProperty('--dd', (0.4 + (i % 9) * 0.12) + 's');
    });
  }

  /* ============================================================
     REVEALS
     ============================================================ */
  function initReveals() {
    document.querySelectorAll('.lines').forEach(h => {
      h.querySelectorAll('.ln > span').forEach((s, i) => s.style.setProperty('--i', i));
    });
    const targets = document.querySelectorAll('.lines, .fade:not(.hero .fade), .arch, .vine.draw:not(#heroFrame), .menu, .frieze');
    if (!('IntersectionObserver' in window) || REDUCED) { targets.forEach(t => t.classList.add('in')); return; }
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        io.unobserve(en.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px 4% 0px' });
    targets.forEach(t => io.observe(t));
  }

  /* ============================================================
     SCROLL FX · ghost Arabic drifts, sunlight crawls, nav hides
     ============================================================ */
  function initScrollFx() {
    const ghosts = [...document.querySelectorAll('[data-parallax]')];
    const suns = [...document.querySelectorAll('.sunlight__panes')];
    const nav = document.getElementById('nav');
    const links = [...document.querySelectorAll('.nav__links a')];
    const sections = links.map(a => document.querySelector(a.getAttribute('href')));
    let lastY = window.scrollY, ticking = false;
    const heroEl = document.getElementById('hero');
    let heroH = heroEl ? heroEl.offsetHeight : innerHeight;
    addEventListener('resize', () => { heroH = heroEl ? heroEl.offsetHeight : innerHeight; }, { passive: true });

    const update = () => {
      ticking = false;
      const y = window.scrollY, vh = innerHeight;
      nav.classList.toggle('scrolled', y > 40);
      nav.classList.toggle('past-hero', y > heroH * 0.65);
      if (!document.body.classList.contains('menu-open')) nav.classList.toggle('hidden', y > lastY && y > vh * 0.8);
      lastY = y;
      if (!REDUCED) {
        for (const g of ghosts) {
          const r = g.parentElement.getBoundingClientRect();
          if (r.bottom < 0 || r.top > vh) continue;
          const k = parseFloat(g.dataset.parallax);
          g.style.setProperty('--gx', ((r.top + r.height / 2 - vh / 2) * k).toFixed(1) + 'px');
        }
        for (const s of suns) {
          const r = s.closest('section').getBoundingClientRect();
          if (r.bottom < 0 || r.top > vh) continue;
          s.style.setProperty('--sun-shift', (r.top * -0.25).toFixed(1) + 'px');
        }
      }
      let current = -1;
      sections.forEach((s, i) => { if (s && s.getBoundingClientRect().top < vh * 0.4) current = i; });
      links.forEach((a, i) => a.classList.toggle('active', i === current));
    };
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  /* ============================================================
     NAV + MOBILE MENU
     ============================================================ */
  function initNav() {
    const toggle = document.getElementById('navToggle');
    const menu = document.getElementById('mobileMenu');
    const setOpen = open => {
      menu.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      document.body.classList.toggle('menu-open', open);
      menu.setAttribute('aria-hidden', String(!open));
    };
    toggle.addEventListener('click', () => setOpen(!menu.classList.contains('open')));
    menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setOpen(false)));
    window.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
  }

  /* ============================================================
     TABS (shared)
     ============================================================ */
  function renderTabs(container, cats, onPick) {
    cats.forEach((c, i) => {
      const b = document.createElement('button');
      b.className = 'tab' + (i === 0 ? ' active' : '');
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(i === 0));
      b.textContent = c;
      b.addEventListener('click', () => {
        if (b.classList.contains('active')) return;
        [...container.children].forEach(el => { el.classList.remove('active'); el.setAttribute('aria-selected', 'false'); });
        b.classList.add('active');
        b.setAttribute('aria-selected', 'true');
        onPick(c);
      });
      container.appendChild(b);
    });
  }

  /* ============================================================
     HOOKAH FLAVOURS · tasting cards, dealt like a hand
     ============================================================ */
  const FLAVORS = {
    Fruity: [
      { name: 'Melon Splash', int: 2, desc: 'Cool, crisp melon with a clean finish.' },
      { name: 'Berry Grape', int: 3, desc: 'Rich mixed berries in sweet grape.' },
      { name: 'Tropical Gold', int: 3, desc: 'Ripe mango, sun-warm and golden.' },
      { name: 'Watermelon Grape', int: 2, desc: 'Juicy watermelon, a touch of grape.' },
      { name: 'Peach Paradise', int: 2, desc: 'Soft, honeyed orchard peach.' },
      { name: 'Purple Rain', int: 3, desc: 'Deep blueberry with dark grape.' },
      { name: 'Mango Tango', int: 3, desc: 'Bold, ripe mango with tropical zing.' },
      { name: 'Summer Breeze', int: 2, desc: 'Light, sweet melon. All-day fresh.' },
      { name: 'Magic Berry', int: 3, desc: 'A playful blend of red berries.' },
      { name: 'Tropical Punch', int: 3, desc: 'Mango, pineapple and grape, bright.' }
    ],
    Mint: [
      { name: 'Watermelon Freeze', int: 3, desc: 'Melon and ice-cold mint. Brain-freeze cool.' },
      { name: 'Grape Mint', int: 3, desc: 'Sharp mint wrapped in sweet grape.' },
      { name: 'Mango Mint', int: 3, desc: 'Ripe mango lifted by crisp mint.' },
      { name: 'Melon Chill', int: 3, desc: 'Melon, blueberry and cool mint.' },
      { name: 'Blue Ice', int: 3, desc: 'Icy blue raspberry with a mint cut.' },
      { name: 'Peach Frost', int: 3, desc: 'Soft peach over a frozen mint base.' },
      { name: 'Arctic Grape', int: 3, desc: 'Deep grape with an icy mint finish.' },
      { name: 'Frozen Tropics', int: 3, desc: 'Mango ice, watermelon and cold mint.' },
      { name: 'Zesty Ice', int: 3, desc: 'Fizzy citrus tang with sharp mint.' },
      { name: 'Double Chill', int: 4, desc: 'Twice the mint, twice the cold.' }
    ],
    Paan: [
      { name: 'Royal Paan', int: 3, desc: 'Classic paan with ripe mango ice.' },
      { name: 'Blue Paan', int: 3, desc: 'Blueberry and grape over fresh paan.' },
      { name: 'Paan Paradise', int: 3, desc: 'A full orchard of fruit in paan.' },
      { name: 'Paan Frost', int: 3, desc: 'Paan, mango ice and a minty chill.' },
      { name: 'Mango Paan', int: 3, desc: 'Ripe mango wrapped in fresh paan.' },
      { name: 'Peach Paan', int: 2, desc: 'Soft peach with a fresh paan twist.' },
      { name: 'Berry Paan', int: 3, desc: 'Sweet berries in classic paan.' },
      { name: 'Paan Fusion', int: 3, desc: 'Paan, zesty citrus and mint.' },
      { name: 'Arabian Paan', int: 3, desc: 'Cardamom-spiced paan with a mint cut.' },
      { name: 'Paan Cooler', int: 2, desc: 'Light, fresh paan with a melon lift.' }
    ],
    Signature: [
      { name: 'Dukhan Special', int: 3, desc: 'Our house blend. Smooth, all evening.' },
      { name: 'Arabian Nights', int: 4, desc: 'Spiced double apple, deep and bold.' },
      { name: 'Blue Velvet', int: 4, desc: 'Blue raspberry, moody and smooth.' },
      { name: 'Zesty Rush', int: 3, desc: 'Citrus and watermelon, ice-cold.' },
      { name: 'Cowboy Cooler', int: 3, desc: 'Cowboy special over grape and mint.' },
      { name: 'Blackout', int: 4, desc: 'Dark double apple with a mint freeze.' },
      { name: 'Midnight Love', int: 4, desc: 'Rich dark berry, deep and smoky.' },
      { name: 'Royal Flush', int: 4, desc: 'Cowboy special with a grape finish.' },
      { name: 'Desert Rose', int: 3, desc: 'Smoky rose with a warm spice note.' },
      { name: 'Dukhan Royale', int: 5, desc: 'Our boldest reserve. Mango, apple and mint.' }
    ]
  };
  const FLAVOR_TINTS = {
    Fruity: ['#c25a4a', '#a83a5e', '#e7a85e'],
    Mint: ['#6f8f86', '#5e8a94', '#8fa08a'],
    Paan: ['#7a8a5c', '#8fa06a', '#5e8f78'],
    Signature: ['#c9a86a', '#8a2b2d', '#d4b07a']
  };


  function initFlavors() {
    const tabs = document.getElementById('flavorTabs');
    const grid = document.getElementById('flavorGrid');
    if (!tabs || !grid) return;
    const strength = n => `<span class="flavor__strength" aria-label="Strength ${n} of 5">` +
      [1, 2, 3, 4, 5].map(i => `<i class="${i <= n ? 'on' : ''}"></i>`).join('') + '</span>';
    const card = (f, i, cat) => {
      const tints = FLAVOR_TINTS[cat] || ['#c25a4a'];
      const tint = tints[i % tints.length];
      return `
      <article class="card flavor cartouche" style="--tint:${tint}">
        <div class="card__in">
          <svg class="flavor__wisp" viewBox="0 0 46 120" aria-hidden="true"><path d="M23,118 C14,100 32,88 22,70 C12,52 30,40 22,20 C18,10 24,4 28,0"/><path d="M27,118 C37,98 19,84 29,64 C37,48 21,34 31,14"/><path d="M19,118 C9,104 25,92 15,76 C7,62 19,52 13,36"/></svg>
          <div class="flavor__seal"><span class="flavor__icon">${STAR}</span><span class="flavor__sealright"><span class="flavor__strength">${[1,2,3,4,5].map(n => `<i class="${n <= f.int ? 'on' : ''}" style="--sd:${(n * 0.05).toFixed(2)}s"></i>`).join('')}</span></span></div>
          <h3 class="flavor__name">${f.name}</h3>
          <p class="flavor__desc">${f.desc || ''}</p>
        </div>
      </article>`;
    };

    const deal = (cat) => {
      grid.innerHTML = FLAVORS[cat].map((f, i) => card(f, i, cat)).join('');
      const cards = [...grid.children];
      // animate the card's inner pieces (not the card): text fades up, dots
      // scale in, stars rotate + fade from the side. Stagger per card.
      cards.forEach((c, i) => c.style.setProperty('--d', (i * 0.06).toFixed(2) + 's'));
      requestAnimationFrame(() => requestAnimationFrame(() => cards.forEach(c => c.classList.add('in'))));
    };

    renderTabs(tabs, Object.keys(FLAVORS), cat => {
      deal(cat);
    });
    deal(Object.keys(FLAVORS)[0]);
  }

  /* ============================================================
     KITCHEN
     ============================================================ */
  const MENU = {
    'Starters': [
      { name: 'Peri Peri Fries', desc: 'Hand-cut, twice-fried, house peri peri dust.', price: '180' },
      { name: 'Garlic Bread', desc: 'Charred baguette, smoked garlic butter, basil.', price: '220' },
      { name: 'Smoky BBQ Wings', desc: 'Eight wings, slow-glazed, honey chipotle.', price: '280' },
      { name: 'Nachos Supreme', desc: 'Corn tortillas, queso, beans, salsa, cream.', price: '290' },
      { name: 'Paneer Tikka Skewers', desc: 'Charred cottage cheese, mint chutney.', price: '300' },
      { name: 'Prawn Tempura', desc: 'Crisp prawns, lemon aioli on the side.', price: '360', star: true }
    ],
    'Mains': [
      { name: 'Margherita', desc: 'San Marzano tomato, fior di latte, fresh basil.', price: '390' },
      { name: 'Pepperoni', desc: 'Spicy cups of pepperoni, mozzarella, oregano.', price: '490' },
      { name: 'Truffle Mushroom Pasta', desc: 'Orecchiette, wild mushrooms, white truffle cream.', price: '430', star: true },
      { name: 'Grilled Chicken Steak', desc: 'Roasted peppers, herb butter, charred lemon.', price: '470' },
      { name: 'Baked Paneer Lasagna', desc: 'Layered, bechamel, mozzarella crust.', price: '400' },
      { name: 'Classic Club', desc: 'Triple-deck, chicken, bacon, lettuce, house dressing.', price: '360' },
      { name: 'Dukhan Burger', desc: 'Smoked patty, brioche, secret sauce, peri fries.', price: '340' },
      { name: 'Grilled Salmon', desc: 'Lemon butter, seasonal greens, pan jus.', price: '640' }
    ],
    'Desserts': [
      { name: 'Molten Chocolate Cake', desc: 'Dark centre, vanilla bean scoop.', price: '260', star: true },
      { name: 'Tiramisu', desc: 'Espresso-soaked savoiardi, mascarpone, cocoa.', price: '290' },
      { name: 'New York Cheesecake', desc: 'Baked, berry compote, graham crumb.', price: '300' },
      { name: 'Churros & Chocolate', desc: 'Cinnamon sugar, dark chocolate for dipping.', price: '240' }
    ],
    'Sips': [
      { name: 'House Cold Brew', desc: '18-hour steep, served over one big cube.', price: '180' },
      { name: 'Spiced Latte', desc: 'Cardamom, cinnamon, house milk foam.', price: '160' },
      { name: 'Virgin Mojito', desc: 'Mint, lime, cane sugar, soda.', price: '220' },
      { name: 'Dukhan Gold Fizz', desc: 'Mango, saffron tonic, a gold crown of foam.', price: '240', star: true }
    ]
  };

  function initMenu() {
    const tabs = document.getElementById('menuTabs');
    const grid = document.getElementById('menuGrid');
    if (!tabs || !grid) return;
    const render = cat => {
      grid.innerHTML = MENU[cat].map((m, i) => `
        <div class="menu__row" style="--d:${(i * 0.06).toFixed(2)}s">
          <p class="menu__name">${m.name}${m.star ? STAR.replace('<svg', '<svg role="img" aria-label="House favourite"') : ''}</p>
          <span class="menu__dots" aria-hidden="true"></span>
          <span class="menu__price">₹${m.price}</span>
          <p class="menu__desc">${m.desc}</p>
        </div>`).join('');
    };
    renderTabs(tabs, Object.keys(MENU), cat => {
      grid.classList.remove('in');
      setTimeout(() => { render(cat); requestAnimationFrame(() => requestAnimationFrame(() => grid.classList.add('in'))); }, 260);
    });
    render(Object.keys(MENU)[0]);
  }

  /* ============================================================
     MATCH NIGHTS · live fixtures
     TheSportsDB public free API (key '123', CORS open). Times
     are converted from UTC to IST; only kickoffs inside opening
     hours (3 PM to 3 AM IST) are listed.
     ============================================================ */
  const TSD_KEY = '123';
  const TSD = `https://www.thesportsdb.com/api/v1/json/${TSD_KEY}/`;
  const seasonNow = () => { const d = new Date(), m = d.getMonth() + 1, y = d.getFullYear(); return m >= 7 ? `${y}-${y + 1}` : `${y - 1}-${y}`; };
  const SEASON = seasonNow();
  const LIVE_SOURCES = [
    { url: 'eventsnextleague.php?id=4328' },                          // Premier League, next
    { url: `eventsseason.php?id=4791&s=${SEASON}` },                  // ISL, season
    { url: 'eventsnextleague.php?id=4791' },                          // ISL, next
    { url: 'eventsnextleague.php?id=4335', laLiga: true },            // La Liga, next
    { url: `eventsseason.php?id=4335&s=${SEASON}`, laLiga: true },    // La Liga, season slice
    { url: 'eventsnext.php?id=133739' },                              // Barcelona
    { url: 'eventsnext.php?id=133729' },                              // Atlético Madrid
    { url: 'eventsnext.php?id=133738' }                               // Real Madrid
  ];
  const BIG_CLUBS = ['barcelona', 'atletico madrid', 'real madrid'];
  const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const isBigClub = e => { const t = norm(e.strHomeTeam) + '|' + norm(e.strAwayTeam); return BIG_CLUBS.some(c => t.includes(c)); };
  const esc = s => (s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const LEAGUE_SHORT = {
    'english premier league': 'EPL', 'spanish la liga': 'La Liga', 'indian super league': 'ISL',
    'uefa champions league': 'UCL', 'uefa europa league': 'UEL', 'uefa europa conference league': 'UECL',
    'spanish copa del rey': 'Copa del Rey'
  };
  const leagueShort = l => LEAGUE_SHORT[norm(l)] || l || 'Football';

  const IST_FMT = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour12: false, weekday: 'short', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  function istOf(date) {
    const p = Object.fromEntries(IST_FMT.formatToParts(date).map(x => [x.type, x.value]));
    let h = parseInt(p.hour, 10); if (h === 24) h = 0;
    return { istWeekday: p.weekday, istDay: p.day, istMonth: p.month, h, m: parseInt(p.minute, 10) };
  }
  const fmtIST = date => { const p = istOf(date); return `${p.h % 12 || 12}:${String(p.m).padStart(2, '0')} ${p.h >= 12 ? 'PM' : 'AM'}`; };
  const inOpenHours = date => { const p = istOf(date); const t = p.h + p.m / 60; return t >= 15 || t < 3; };
  function parseEvent(e) {
    if (!e || !e.strTimestamp || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(e.strTimestamp)) return null;
    let iso = e.strTimestamp;
    if (iso.length === 16) iso += ':00';
    if (!/[zZ]|[+-]\d{2}:?\d{2}$/.test(iso)) iso += 'Z';
    const date = new Date(iso);
    return isNaN(date) ? null : { id: e.idEvent, date, home: e.strHomeTeam, away: e.strAwayTeam, league: e.strLeague };
  }

  const FALLBACK_FIXTURES = [
    { weekday: 'TUE', day: '17', league: 'EPL', home: 'Everton', away: 'Chelsea', time: '5:00 PM' },
    { weekday: 'TUE', day: '17', league: 'La Liga', home: 'Real Betis', away: 'Barcelona', time: '9:30 PM' },
    { weekday: 'WED', day: '18', league: 'ISL', home: 'SC Delhi', away: 'Mohun Bagan', time: '8:30 PM' },
    { weekday: 'WED', day: '18', league: 'La Liga', home: 'Real Madrid', away: 'Sevilla', time: '11:30 PM' }
  ];
  const isToday = f => { const t = istOf(new Date()); return f.istDay === t.istDay && f.istMonth === t.istMonth; };

  const liveRows = list => list.map((f, i) => ({
    day: f.istWeekday.toUpperCase(), league: esc(leagueShort(f.league)),
    teams: `${esc(f.home)} <i>vs</i> ${esc(f.away)}`,
    time: fmtIST(f.date) + (isToday(f) ? '' : ` <small>${f.istDay} ${f.istMonth}</small>`),
    first: i === 0
  }));
  const staticRows = () => FALLBACK_FIXTURES.map((f, i) => ({
    day: f.weekday, league: esc(f.league), teams: `${esc(f.home)} <i>vs</i> ${esc(f.away)}`, time: f.time, first: i === 0
  }));

  let NEXT_MATCH = null;
  function setTonightCard(f, live) {
    NEXT_MATCH = f ? { f, live } : null;
    const label = document.getElementById('tonightLabel');
    const lg = document.getElementById('tonightLeague');
    const tm = document.getElementById('tonightTeams');
    const tt = document.getElementById('tonightTime');
    if (!label) return;
    if (!f) {
      label.innerHTML = STAR + 'At Dukhan';
      lg.textContent = 'No fixture yet';
      tm.textContent = 'Quiet night, good smoke';
      tt.textContent = 'Check back soon';
      return;
    }
    const today = live ? isToday(f) : false;
    label.innerHTML = STAR + (today ? 'Tonight at Dukhan' : 'Next at Dukhan');
    lg.textContent = live ? (f.league || '') : f.league;
    tm.innerHTML = `${esc(f.home)} <i>vs</i> ${esc(f.away)}`;
    tt.textContent = live
      ? `Kickoff ${today ? '' : f.istWeekday + ' '}${fmtIST(f.date)} IST`
      : `Kickoff ${f.weekday} ${f.day}, ${f.time} IST`;
  }

  function renderMatches(rows, live, raw) {
    const ul = document.getElementById('fixtures');
    const status = document.getElementById('matchesStatus');
    if (!ul) return;
    if (!rows.length) {
      ul.innerHTML = `<li class="fix"><span class="fix__day">SOON</span><span class="fix__league"></span><span class="fix__teams">Nothing kicks off between 3 PM and 3 AM in the coming nights. The smoke stays on.</span><span></span></li>`;
      if (status) status.textContent = live ? 'Live · nothing in opening hours yet' : 'Sample schedule';
      setTonightCard(null, live);
      return;
    }
    ul.innerHTML = rows.map(r => `
      <li class="fix">
        <span class="fix__day">${r.day}</span>
        <span class="fix__league">${r.league}</span>
        <span class="fix__teams">${r.teams}</span>
        <span class="fix__time">${r.time}${r.first ? '<span class="fix__chip">Next up</span>' : ''}</span>
      </li>`).join('');
    if (status) status.textContent = live ? `Live · updated ${fmtIST(new Date())} IST` : 'Sample schedule · live feed unavailable';
    setTonightCard(raw && raw[0], live);
  }

  let matchesBusy = false;
  async function fetchMatches() {
    if (matchesBusy) return;
    matchesBusy = true;
    const btn = document.getElementById('matchRefresh');
    if (btn) btn.disabled = true;
    try {
      const results = await Promise.allSettled(LIVE_SOURCES.map(s =>
        fetch(TSD + s.url).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })));
      const seen = new Set(), all = [];
      results.forEach((r, i) => {
        if (r.status !== 'fulfilled') return;
        for (const e of (r.value.events || [])) {
          if (LIVE_SOURCES[i].laLiga && !isBigClub(e)) continue;
          const p = parseEvent(e);
          if (!p || seen.has(p.id)) continue;
          seen.add(p.id); all.push(p);
        }
      });
      if (!results.some(r => r.status === 'fulfilled')) throw new Error('offline');
      const now = Date.now();
      const list = all
        .filter(f => f.date.getTime() > now - 36e5 && f.date.getTime() < now + 30 * 864e5)
        .filter(f => inOpenHours(f.date))
        .sort((a, b) => a.date - b.date)
        .slice(0, 8)
        .map(f => Object.assign(f, istOf(f.date)));
      renderMatches(liveRows(list), true, list);
    } catch (err) {
      renderMatches(staticRows(), false, FALLBACK_FIXTURES);
    } finally {
      matchesBusy = false;
      if (btn) btn.disabled = false;
    }
  }
  function initMatches() {
    const btn = document.getElementById('matchRefresh');
    if (btn) btn.addEventListener('click', fetchMatches);
    fetchMatches();
    setInterval(() => { if (!document.hidden) fetchMatches(); }, 20 * 60 * 1000);
  }


  /* ============================================================
     RESERVATION SHEET
     Collects date, time, guests and occasion, then sends a
     ready-written message. Set the lounge's WhatsApp number
     (country code, digits only, e.g. '919876543210') to send
     on WhatsApp; until then the message is copied and Instagram
     DMs open.
     ============================================================ */
  const WHATSAPP_NUMBER = '';
  const IG_DM = 'https://ig.me/m/dukhanloungein';

  function toast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove('show'), 3400);
  }
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).catch(() => fallback());
    return Promise.resolve(fallback());
    function fallback() {
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (_) {}
      ta.remove();
    }
  }

  const RESERVE_SHEET = false; // set true to turn the reservation panel back on
  function initReserve() {
    if (!RESERVE_SHEET) return;
    const sheet = document.getElementById('rsv');
    const form = document.getElementById('rsvForm');
    if (!sheet || !form) return;
    const panel = sheet.querySelector('.rsv__panel');
    const dayChips = [...document.querySelectorAll('#rsvDay .chip[data-day]')];
    const dateChip = document.querySelector('#rsvDay .chip--date');
    const dateInput = document.getElementById('rsvDate');
    const dateLabel = document.getElementById('rsvDateLabel');
    const timeSel = document.getElementById('rsvTime');
    const guestsOut = document.getElementById('rsvGuests');
    const occChips = [...document.querySelectorAll('#rsvOccasion .chip')];
    const nameIn = document.getElementById('rsvName');
    const noteIn = document.getElementById('rsvNote');
    const summary = document.getElementById('rsvSummary');
    document.getElementById('rsvSendLabel').textContent = WHATSAPP_NUMBER ? 'Send on WhatsApp' : 'Send request';
    document.getElementById('rsvFine').textContent = WHATSAPP_NUMBER
      ? 'Opens WhatsApp with your request written out, ready to send.'
      : 'We copy your request and open Instagram, just paste it in the chat.';

    // times: every half hour from 3 PM to 2:30 AM
    const slots = [];
    for (let m = 15 * 60; m <= 26 * 60 + 30; m += 30) {
      const h24 = Math.floor(m / 60) % 24, mm = m % 60;
      slots.push({ v: `${String(h24).padStart(2, '0')}:${String(mm).padStart(2, '0')}`, t: `${h24 % 12 || 12}:${String(mm).padStart(2, '0')} ${h24 >= 12 ? 'PM' : 'AM'}` });
    }
    timeSel.innerHTML = slots.map(s => `<option value="${s.v}">${s.t}</option>`).join('');

    const pad = n => String(n).padStart(2, '0');
    const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const nice = d => d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    const st = { date: new Date(), guests: 2, occasion: 'Just us', match: '' };
    dateInput.min = iso(new Date());

    const setDay = (offset) => {
      const d = new Date(); d.setDate(d.getDate() + offset); st.date = d;
      dayChips.forEach(c => c.classList.toggle('is-on', +c.dataset.day === offset));
      dateChip.classList.remove('is-on'); dateLabel.textContent = 'Pick a date';
      update();
    };
    const setDate = (d) => {
      st.date = d;
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const diff = Math.round((new Date(d).setHours(0, 0, 0, 0) - today) / 864e5);
      if (diff === 0 || diff === 1) return setDay(diff);
      dayChips.forEach(c => c.classList.remove('is-on'));
      dateChip.classList.add('is-on'); dateLabel.textContent = nice(d); dateInput.value = iso(d);
      update();
    };
    const setTime = (hh, mm) => {
      const v = `${pad(hh)}:${pad(mm >= 30 ? 30 : 0)}`;
      if ([...timeSel.options].some(o => o.value === v)) timeSel.value = v;
    };
    const nextSlot = () => {
      const n = new Date(); let hh = n.getHours(), mm = n.getMinutes() > 30 ? 0 : 30;
      if (mm === 0) hh += 1;
      if (hh >= 3 && hh < 15) { hh = 19; mm = 0; }
      setTime(hh % 24, mm);
    };
    const setOcc = (label) => { st.occasion = label; occChips.forEach(c => c.classList.toggle('is-on', c.textContent === label)); update(); };
    const update = () => {
      const t = timeSel.options[timeSel.selectedIndex];
      summary.innerHTML = `Table for <b>${st.guests}</b> · <b>${nice(st.date)}</b> · <b>${t ? t.text : ''}</b>${st.occasion !== 'Just us' ? ' · ' + st.occasion : ''}`;
    };

    dayChips.forEach(c => c.addEventListener('click', () => setDay(+c.dataset.day)));
    dateInput.addEventListener('change', () => { if (dateInput.value) { const [y, m, d] = dateInput.value.split('-').map(Number); setDate(new Date(y, m - 1, d)); } });
    timeSel.addEventListener('change', update);
    sheet.querySelectorAll('[data-step]').forEach(b => b.addEventListener('click', () => {
      st.guests = clamp(st.guests + +b.dataset.step, 1, 30); guestsOut.textContent = st.guests; update();
    }));
    occChips.forEach(c => c.addEventListener('click', () => { st.match = ''; setOcc(c.textContent); }));

    let lastFocus = null;
    const focusables = () => [...panel.querySelectorAll('button, input, select, a[href]')].filter(el => !el.disabled && el.offsetParent !== null);
    const open = (prefill) => {
      lastFocus = document.activeElement;
      if (!prefill) { setDay(0); nextSlot(); st.match = ''; setOcc('Just us'); }
      else prefill();
      sheet.hidden = false;
      document.body.classList.add('rsv-open');
      requestAnimationFrame(() => requestAnimationFrame(() => sheet.classList.add('open')));
      setTimeout(() => nameIn.focus({ preventScroll: true }), 500);
      update();
    };
    const close = () => {
      sheet.classList.remove('open');
      document.body.classList.remove('rsv-open');
      setTimeout(() => { sheet.hidden = true; }, 700);
      if (lastFocus) lastFocus.focus({ preventScroll: true });
    };
    document.querySelectorAll('[data-reserve]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); open(); }));
    sheet.querySelectorAll('[data-rsv-close]').forEach(b => b.addEventListener('click', close));
    document.addEventListener('keydown', e => {
      if (sheet.hidden) return;
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') {
        const f = focusables(); if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    });

    // "Book a table for this match": date, a time before kickoff, occasion and teams pre-filled
    document.querySelectorAll('[data-reserve-match]').forEach(b => b.addEventListener('click', () => open(() => {
      const nm = NEXT_MATCH;
      st.guests = Math.max(st.guests, 4); guestsOut.textContent = st.guests;
      if (nm && nm.live && nm.f.date) {
        const p = istOf(nm.f.date);
        const d = new Date(nm.f.date.getTime() + (330 + nm.f.date.getTimezoneOffset()) * 60000);
        setDate(d);
        let mins = p.h * 60 + p.m - 30; if (mins < 0) mins += 1440;
        setTime(Math.floor(mins / 60), mins % 60);
        st.match = `${nm.f.home} vs ${nm.f.away}`;
      } else if (nm && !nm.live) {
        setDay(0); nextSlot(); st.match = `${nm.f.home} vs ${nm.f.away}`;
      } else { setDay(0); nextSlot(); }
      setOcc('Match night');
      if (st.match) noteIn.value = `For ${st.match}`;
    })));

    form.addEventListener('submit', e => {
      e.preventDefault();
      const t = timeSel.options[timeSel.selectedIndex].text;
      const lines = [
        'Hi Dukhan Lounge, I would like to reserve a table.',
        nameIn.value.trim() ? `Name: ${nameIn.value.trim()}` : null,
        `Date: ${nice(st.date)}`,
        `Time: ${t}`,
        `Guests: ${st.guests}`,
        st.occasion !== 'Just us' ? `Occasion: ${st.occasion}` : null,
        noteIn.value.trim() ? `Note: ${noteIn.value.trim()}` : null
      ].filter(Boolean);
      const msg = lines.join('\n');
      if (WHATSAPP_NUMBER) {
        window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
        close();
      } else {
        copyText(msg);
        toast('Request copied. Paste it in the Instagram chat.');
        setTimeout(() => window.open(IG_DM, '_blank', 'noopener'), 700);
        close();
      }
    });
  }

  /* hero Reserve button leans gently toward the cursor */
  function initMagnet() {
    if (REDUCED || matchMedia('(hover: none)').matches) return;
    document.querySelectorAll('.reserve--magnet').forEach(b => {
      const zone = 60;
      addEventListener('pointermove', e => {
        const r = b.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const dx = e.clientX - cx, dy = e.clientY - cy;
        const inside = Math.abs(dx) < r.width / 2 + zone && Math.abs(dy) < r.height / 2 + zone;
        b.style.setProperty('--mx', inside ? (dx * 0.12).toFixed(1) + 'px' : '0px');
        b.style.setProperty('--my', inside ? (dy * 0.18).toFixed(1) + 'px' : '0px');
      }, { passive: true });
    });
  }

  /* the ritual's smoke line draws itself as you scroll through the steps */
  function initRitual() {
    const line = document.querySelector('.ritual__line path');
    const sec = document.getElementById('ritual');
    if (!line || !sec) return;
    let len = 1400;
    try { len = line.getTotalLength(); } catch (_) {}
    line.style.setProperty('--rl', len);
    if (REDUCED) { line.style.setProperty('--rp', 1); return; }
    let tick = false;
    const upd = () => {
      tick = false;
      const r = sec.getBoundingClientRect();
      const p = clamp((innerHeight * 0.85 - r.top) / (r.height * 0.75), 0, 1);
      line.style.setProperty('--rp', p.toFixed(3));
    };
    addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(upd); } }, { passive: true });
    upd();
  }

  /* ---------------- boot ---------------- */
  function boot() {
    const y = document.getElementById('year');
    if (y) y.textContent = new Date().getFullYear();
    initVines();
    initNav();
    initFlavors();
    initMenu();
    initMatches();
    initReveals();
    initScrollFx();
    initHero();
    initReserve();
    initRitual();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
