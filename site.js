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
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;

  const COLORS = ['232,208,150', '247,239,224', '212,162,74', '255,248,230', '196,140,70', '255,236,186'];
  const sprites = COLORS.map(rgb => {
    const tile = document.createElement('canvas');
    tile.width = tile.height = 72;
    const g = tile.getContext('2d');
    const glow = g.createRadialGradient(36, 36, 0, 36, 36, 36);
    glow.addColorStop(0, 'rgba(255,252,240,1)');
    glow.addColorStop(0.12, `rgba(${rgb},0.92)`);
    glow.addColorStop(0.36, `rgba(${rgb},0.24)`);
    glow.addColorStop(1, 'rgba(255,248,230,0)');
    g.fillStyle = glow;
    g.beginPath();
    g.arc(36, 36, 36, 0, Math.PI * 2);
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
  let far = [];
  let near = [];
  let veils = [];
  const falls = [];
  const columns = [];
  let nextFall = 2.4;
  let nextColumn = 1.6;
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
    const area = width * height;
    const compact = width < 720;
    const farCount = Math.round(Math.min(compact ? 820 : 2200, Math.max(compact ? 360 : 900, area / (compact ? 1100 : 580))));
    const nearCount = Math.round(Math.min(compact ? 36 : 90, Math.max(18, area / 18000)));
    far = Array.from({ length: farCount }, () => {
      const mass = Math.pow(rand(), 3.2);
      return {
        x: rand() * width,
        y: rand() * height,
        m: mass,
        c: mass > 0.62 ? 5 : mass > 0.38 ? 2 : mass > 0.18 ? 0 : 1,
        f1: 0.55 + rand() * 1.7,
        f2: 1.3 + rand() * 2.6,
        p: rand() * Math.PI * 2,
        vx: (rand() - 0.5) * 6,
        vy: -(2.2 + rand() * 7)
      };
    });
    near = Array.from({ length: nearCount }, () => {
      const mass = 0.35 + Math.pow(rand(), 1.8) * 0.65;
      return {
        x: rand() * width,
        y: rand() * height,
        m: mass,
        c: mass > 0.72 ? 5 : 3,
        f1: 0.35 + rand() * 0.9,
        f2: 0.8 + rand() * 1.6,
        p: rand() * Math.PI * 2,
        vx: (rand() - 0.5) * 11,
        vy: -(5 + rand() * 14)
      };
    });
    veils = Array.from({ length: compact ? 5 : 8 }, (_, i) => ({
      x: width * (0.08 + rand() * 0.84),
      y: height * (0.08 + rand() * 0.7),
      r: (compact ? 180 : 260) + rand() * (compact ? 220 : 380),
      a: 0.045 + rand() * 0.06,
      f: 0.07 + rand() * 0.11,
      p: rand() * Math.PI * 2,
      amp: 18 + rand() * 46,
      warm: i % 2 === 0
    }));
  };

  const drawBackdrop = t => {
    const night = ctx.createLinearGradient(0, 0, 0, height);
    night.addColorStop(0, '#070504');
    night.addColorStop(0.38, '#110c08');
    night.addColorStop(0.72, '#1a120c');
    night.addColorStop(1, '#24180f');
    ctx.fillStyle = night;
    ctx.fillRect(0, 0, width, height);

    const pulse = reduced ? 0.78 : 0.62 + 0.38 * Math.sin(t * 0.16);
    const source = ctx.createRadialGradient(width * 0.5, height * -0.02, 0, width * 0.5, height * -0.02, height * 1.05);
    source.addColorStop(0, `rgba(255,236,186,${0.62 * pulse})`);
    source.addColorStop(0.16, `rgba(232,196,110,${0.36 * pulse})`);
    source.addColorStop(0.42, `rgba(212,162,74,${0.14 * pulse})`);
    source.addColorStop(1, 'rgba(196,140,70,0)');
    ctx.fillStyle = source;
    ctx.fillRect(0, 0, width, height);

    const left = ctx.createRadialGradient(width * 0.14, height * 0.22, 0, width * 0.14, height * 0.22, height * 0.55);
    left.addColorStop(0, `rgba(212,162,74,${0.16 * pulse})`);
    left.addColorStop(1, 'rgba(212,162,74,0)');
    ctx.fillStyle = left;
    ctx.fillRect(0, 0, width, height);

    const right = ctx.createRadialGradient(width * 0.86, height * 0.3, 0, width * 0.86, height * 0.3, height * 0.48);
    right.addColorStop(0, `rgba(196,140,70,${0.12 * pulse})`);
    right.addColorStop(1, 'rgba(196,140,70,0)');
    ctx.fillStyle = right;
    ctx.fillRect(0, 0, width, height);

    const wash = ctx.createLinearGradient(0, height * 0.48, 0, height);
    wash.addColorStop(0, 'rgba(140,90,40,0)');
    wash.addColorStop(1, `rgba(150,96,42,${0.28 * pulse})`);
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, width, height);

    const horizon = ctx.createRadialGradient(width * 0.5, height * 1.16, 0, width * 0.5, height * 1.16, height * 0.95);
    horizon.addColorStop(0, `rgba(212,162,74,${0.5 * pulse})`);
    horizon.addColorStop(0.45, `rgba(196,140,70,${0.18 * pulse})`);
    horizon.addColorStop(1, 'rgba(196,140,70,0)');
    ctx.fillStyle = horizon;
    ctx.fillRect(0, 0, width, height);
  };

  const drawRays = t => {
    ctx.save();
    ctx.translate(width * 0.5, height * -0.06);
    ctx.globalCompositeOperation = 'lighter';
    const count = width < 720 ? 8 : 13;
    for (let i = 0; i < count; i += 1) {
      const base = -0.42 * Math.PI + (i / (count - 1)) * 0.84 * Math.PI;
      const sway = reduced ? 0 : Math.sin(t * 0.11 + i * 0.63) * 0.03;
      const pulse = reduced ? 0.7 : 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 0.19 + i * 0.95));
      ctx.save();
      ctx.rotate(base + sway);
      const len = height * 1.35;
      const half = 7 + (i % 4) * 9;
      const beam = ctx.createLinearGradient(0, 0, 0, len);
      beam.addColorStop(0, `rgba(255,248,230,${0.28 * pulse})`);
      beam.addColorStop(0.14, `rgba(232,196,110,${0.14 * pulse})`);
      beam.addColorStop(0.48, `rgba(212,162,74,${0.045 * pulse})`);
      beam.addColorStop(1, 'rgba(212,162,74,0)');
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(-half, 0);
      ctx.lineTo(half, 0);
      ctx.lineTo(half * 16, len);
      ctx.lineTo(-half * 16, len);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  };

  const drawVeils = t => {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const veil of veils) {
      const x = reduced ? veil.x : veil.x + Math.sin(t * veil.f + veil.p) * veil.amp;
      const y = reduced ? veil.y : veil.y + Math.cos(t * veil.f * 0.72 + veil.p) * veil.amp * 0.45;
      const cloud = ctx.createRadialGradient(x, y, 0, x, y, veil.r);
      const tone = veil.warm ? '232,196,110' : '255,236,186';
      cloud.addColorStop(0, `rgba(${tone},${veil.a})`);
      cloud.addColorStop(0.45, `rgba(196,140,70,${veil.a * 0.35})`);
      cloud.addColorStop(1, 'rgba(196,140,70,0)');
      ctx.fillStyle = cloud;
      ctx.fillRect(x - veil.r, y - veil.r, veil.r * 2, veil.r * 2);
    }
    ctx.restore();
  };

  const drawMotes = (list, t, scale) => {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const mote of list) {
      const x = reduced ? mote.x : ((mote.x + t * mote.vx) % width + width) % width;
      const y = reduced ? mote.y : ((mote.y + t * mote.vy) % height + height) % height;
      const twinkle = reduced
        ? 0.84
        : Math.max(0, 0.5 + 0.5 * Math.sin(t * mote.f1 + mote.p) * Math.sin(t * mote.f2 + mote.p * 1.35));
      const size = (scale.base + mote.m * scale.span) * (0.72 + 0.4 * twinkle);
      ctx.globalAlpha = Math.min(1, (scale.alpha + scale.gain * mote.m) * twinkle);
      ctx.drawImage(sprites[mote.c], x - size, y - size, size * 2, size * 2);
    }
    ctx.restore();
  };

  const spawnFall = t => {
    if (reduced || t < nextFall) return;
    falls.push({
      x: width * (0.12 + Math.random() * 0.76),
      y: -30,
      vx: (Math.random() - 0.5) * 22,
      vy: 85 + Math.random() * 70,
      life: 2.6 + Math.random() * 1.6,
      age: 0,
      len: 110 + Math.random() * 140
    });
    nextFall = t + 3.4 + Math.random() * 5.2;
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
      if (beam.age >= beam.life || beam.y > height * 0.94) {
        falls.splice(i, 1);
        continue;
      }
      const fade = Math.sin(Math.min(1, beam.age / beam.life) * Math.PI);
      const hyp = Math.hypot(beam.vx, beam.vy) || 1;
      const tailX = beam.x - (beam.vx / hyp) * beam.len * 0.32;
      const tailY = beam.y - beam.len;
      const streak = ctx.createLinearGradient(beam.x, beam.y, tailX, tailY);
      streak.addColorStop(0, `rgba(255,248,230,${fade})`);
      streak.addColorStop(0.3, `rgba(232,196,110,${0.7 * fade})`);
      streak.addColorStop(1, 'rgba(212,162,74,0)');
      ctx.strokeStyle = streak;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(beam.x, beam.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();
    }
    ctx.restore();
  };

  const spawnColumn = t => {
    if (reduced || t < nextColumn) return;
    columns.push({
      x: width * (0.1 + Math.random() * 0.8),
      w: 48 + Math.random() * 110,
      life: 5 + Math.random() * 5,
      age: 0,
      drift: (Math.random() - 0.5) * 8
    });
    nextColumn = t + 2.8 + Math.random() * 4.6;
  };

  const drawColumns = (dt, t) => {
    spawnColumn(t);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = columns.length - 1; i >= 0; i -= 1) {
      const col = columns[i];
      col.age += dt;
      col.x += col.drift * dt;
      if (col.age >= col.life) {
        columns.splice(i, 1);
        continue;
      }
      const fade = Math.sin(Math.min(1, col.age / col.life) * Math.PI);
      const shaft = ctx.createLinearGradient(col.x, 0, col.x, height);
      shaft.addColorStop(0, `rgba(255,248,230,${0.16 * fade})`);
      shaft.addColorStop(0.35, `rgba(232,196,110,${0.07 * fade})`);
      shaft.addColorStop(1, 'rgba(212,162,74,0)');
      ctx.fillStyle = shaft;
      ctx.fillRect(col.x - col.w * 0.5, 0, col.w, height);
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
    drawRays(time);
    drawVeils(time);
    drawColumns(dt, time);
    drawMotes(far, time, { base: 0.7, span: 4.8, alpha: 0.18, gain: 0.7 });
    drawFalls(dt, time);
    drawMotes(near, time, { base: 2.4, span: 16, alpha: 0.28, gain: 0.72 });
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
    drawRays(0);
    drawVeils(0);
    drawMotes(far, 0, { base: 0.7, span: 4.8, alpha: 0.18, gain: 0.7 });
    drawMotes(near, 0, { base: 2.4, span: 16, alpha: 0.28, gain: 0.72 });
  } else start();
})();
