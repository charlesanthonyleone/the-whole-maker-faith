(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const header = document.querySelector('header');
  const nav = header && header.querySelector('nav');

  if (header && nav && !header.querySelector('.menu-toggle')) {
    const button = document.createElement('button');
    button.className = 'menu-toggle';
    button.type = 'button';
    button.setAttribute('aria-expanded', 'false');
    button.textContent = 'Menu';
    header.insertBefore(button, nav);
    const close = () => {
      button.setAttribute('aria-expanded', 'false');
      nav.classList.remove('is-open');
      button.textContent = 'Menu';
    };
    button.addEventListener('click', () => {
      const open = button.getAttribute('aria-expanded') !== 'true';
      button.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('is-open', open);
      button.textContent = open ? 'Close' : 'Menu';
    });
    nav.addEventListener('click', event => { if (event.target.closest('a')) close(); });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') close();
    });
  }

  const canvas = document.createElement('canvas');
  canvas.className = 'faith-sky';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const COLORS = ['232,208,150', '247,239,224', '212,162,74', '255,248,230', '196,140,70'];
  const sprites = COLORS.map(rgb => {
    const tile = document.createElement('canvas');
    tile.width = tile.height = 64;
    const g = tile.getContext('2d');
    const glow = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    glow.addColorStop(0, 'rgba(255,252,240,1)');
    glow.addColorStop(0.14, `rgba(${rgb},0.85)`);
    glow.addColorStop(0.38, `rgba(${rgb},0.2)`);
    glow.addColorStop(1, 'rgba(255,248,230,0)');
    g.fillStyle = glow;
    g.beginPath();
    g.arc(32, 32, 32, 0, Math.PI * 2);
    g.fill();
    return tile;
  });

  const rng = seed => () => {
    seed |= 0;
    seed = seed + 1831565813 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };

  let width = 0;
  let height = 0;
  let dpr = 1;
  let motes = [];
  const falls = [];
  let nextFall = 3.2;
  let time = 0;
  let last = 0;
  let frameId = 0;

  const layout = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const rand = rng(23);
    const count = Math.round(Math.min(720, Math.max(240, width * height / 1900)));
    motes = Array.from({ length: count }, () => {
      const mass = Math.pow(rand(), 3.6);
      return {
        x: rand() * width,
        y: rand() * height,
        m: mass,
        c: mass > 0.55 ? 2 : mass > 0.28 ? 0 : 1,
        f1: 0.7 + rand() * 1.8,
        f2: 1.6 + rand() * 2.8,
        p: rand() * Math.PI * 2,
        vx: (rand() - 0.5) * 8,
        vy: -(4 + rand() * 10)
      };
    });
  };

  const drawBackdrop = t => {
    const night = ctx.createLinearGradient(0, 0, 0, height);
    night.addColorStop(0, '#0c0907');
    night.addColorStop(0.48, '#140f0c');
    night.addColorStop(1, '#1c140c');
    ctx.fillStyle = night;
    ctx.fillRect(0, 0, width, height);

    const pulse = reduced ? 0.7 : 0.58 + 0.42 * Math.sin(t * 0.18);
    const source = ctx.createRadialGradient(width * 0.5, height * 0.08, 0, width * 0.5, height * 0.08, height * 0.72);
    source.addColorStop(0, `rgba(232,196,110,${0.34 * pulse})`);
    source.addColorStop(0.38, `rgba(212,162,74,${0.13 * pulse})`);
    source.addColorStop(1, 'rgba(212,162,74,0)');
    ctx.fillStyle = source;
    ctx.fillRect(0, 0, width, height);

    const horizon = ctx.createRadialGradient(width * 0.5, height * 1.12, 0, width * 0.5, height * 1.12, height * 0.7);
    horizon.addColorStop(0, `rgba(196,140,70,${0.3 * pulse})`);
    horizon.addColorStop(1, 'rgba(196,140,70,0)');
    ctx.fillStyle = horizon;
    ctx.fillRect(0, 0, width, height);
  };

  const drawMotes = t => {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const mote of motes) {
      const x = reduced ? mote.x : ((mote.x + t * mote.vx) % width + width) % width;
      const y = reduced ? mote.y : ((mote.y + t * mote.vy) % height + height) % height;
      const twinkle = reduced
        ? 0.82
        : Math.max(0, 0.55 + 0.45 * Math.sin(t * mote.f1 + mote.p) * Math.sin(t * mote.f2 + mote.p * 1.4));
      const size = (1.15 + mote.m * 6.4) * (0.75 + 0.4 * twinkle);
      ctx.globalAlpha = Math.min(1, (0.22 + 0.78 * mote.m) * twinkle);
      ctx.drawImage(sprites[mote.c], x - size, y - size, size * 2, size * 2);
    }
    ctx.restore();
  };

  const spawnFall = t => {
    if (reduced || t < nextFall) return;
    falls.push({
      x: width * (0.15 + Math.random() * 0.7),
      y: -20,
      vx: (Math.random() - 0.5) * 18,
      vy: 70 + Math.random() * 50,
      life: 2.4 + Math.random() * 1.4,
      age: 0,
      len: 70 + Math.random() * 90
    });
    nextFall = t + 6 + Math.random() * 8;
  };

  const drawFalls = (dt, t) => {
    spawnFall(t);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (let i = falls.length - 1; i >= 0; i -= 1) {
      const beam = falls[i];
      beam.age += dt;
      beam.x += beam.vx * dt;
      beam.y += beam.vy * dt;
      if (beam.age >= beam.life || beam.y > height * 0.92) {
        falls.splice(i, 1);
        continue;
      }
      const fade = Math.sin(Math.min(1, beam.age / beam.life) * Math.PI);
      const tailX = beam.x - (beam.vx / (Math.hypot(beam.vx, beam.vy) || 1)) * beam.len * 0.35;
      const tailY = beam.y - beam.len;
      const streak = ctx.createLinearGradient(beam.x, beam.y, tailX, tailY);
      streak.addColorStop(0, `rgba(255,248,230,${fade})`);
      streak.addColorStop(0.35, `rgba(232,196,110,${0.55 * fade})`);
      streak.addColorStop(1, 'rgba(212,162,74,0)');
      ctx.strokeStyle = streak;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(beam.x, beam.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();
    }
    ctx.restore();
  };

  const frame = now => {
    if (!last) last = now;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    time += dt;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawBackdrop(time);
    drawMotes(time);
    drawFalls(dt, time);
    if (!reduced && !document.hidden) frameId = requestAnimationFrame(frame);
  };

  const start = () => {
    if (frameId || reduced) return;
    last = 0;
    frameId = requestAnimationFrame(frame);
  };

  layout();
  window.addEventListener('resize', layout);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(frameId);
      frameId = 0;
    } else start();
  });

  if (reduced) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawBackdrop(0);
    drawMotes(0);
  } else start();
})();
