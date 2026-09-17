/* Lightweight neural-network background. No external dependencies or tracking. */
(() => {
  'use strict';
  const home = document.querySelector('.main-inner.index');
  const template = document.getElementById('observatory-template');
  if (home && template) home.prepend(template.content.cloneNode(true));
  const canvas = document.getElementById('neural-background');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = matchMedia('(pointer: coarse)');
  let enabled = !reduced.matches;
  let width = 0, height = 0, nodes = [], frame = 0, last = 0;
  let stars = [], meteors = [], nextMeteor = 0;
  const pointer = { x: 0, y: 0, active: false };
  const rand = (min, max) => min + Math.random() * (max - min);
  let orbit = null, orbitBox = null;
  let phase = 'orbit', phaseAge = 0, claimed = 0, collected = 0;
  let pool = [];
  const physics = window.StellarPhysics;
  const GRAVITY_RADIUS = 140;
  const glow = ctx.createRadialGradient(0, 0, 1, 0, 0, 24);
  glow.addColorStop(0, 'rgba(210, 239, 216, .45)');
  glow.addColorStop(.22, 'rgba(161, 216, 180, .15)');
  glow.addColorStop(1, 'rgba(161, 216, 180, 0)');
  function measureOrbit() {
    orbit = document.querySelector('.stellar-orbits');
    const previous = orbitBox;
    orbitBox = document.querySelector('.stellar-vessel')?.getBoundingClientRect() || null;
    // Keep satellites attached to their physical center when the document scrolls.
    if (previous && orbitBox) for (const p of pool) if (p.orbit) {
      p.x += orbitBox.left - previous.left;
      p.y += orbitBox.top - previous.top;
    }
  }
  const population = () => document.dispatchEvent(new CustomEvent('star-population', { detail: stars.length + nodes.length }));

  function resize() {
    if (nodes.length) {
      const sx = innerWidth / width, sy = innerHeight / height;
      for (const p of [...nodes, ...stars]) { p.x *= sx; p.y *= sy; }
    }
    width = innerWidth;
    height = innerHeight;
    const scale = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    const count = coarse.matches ? Math.min(28, Math.ceil(width * height / 24000))
      : Math.min(100, Math.max(30, Math.ceil(width * height / 15000)));
    if (!nodes.length) nodes = Array.from({ length: count }, () => ({
      x: rand(0, width), y: rand(0, height), vx: rand(-0.22, 0.22), vy: rand(-0.22, 0.22),
      size: rand(1.1, 2.1), hue: Math.random() > 0.5 ? '92, 173, 255' : '68, 232, 210'
    }));
    if (!stars.length) stars = Array.from({ length: Math.min(150, Math.ceil(width * height / 6500)) + (home ? 6 : 0) }, () => ({
      x: rand(0, width), y: rand(0, height), size: Math.random() > .9 ? 3 : 2,
      phase: rand(0, Math.PI * 2), alpha: rand(.18, .55)
    }));
    meteors = [];
    pool = [...nodes, ...stars];
    population();
    measureOrbit();
  }

  function line(a, b, alpha, color = '73, 188, 220') {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = `rgba(${color}, ${alpha})`;
    ctx.lineWidth = 0.7;
    ctx.stroke();
  }

  function draw(now) {
    frame = 0;
    if (!enabled || document.hidden) return;
    const elapsed = now - last;
    if (last && elapsed < (coarse.matches ? 33 : 22)) {
      frame = requestAnimationFrame(draw);
      return;
    }
    const dt = Math.min(elapsed / 16.67 || 1, 2.5);
    last = now;
    const seconds = Math.min(elapsed / 1000 || 1 / 60, .05);
    if (orbitBox && orbitBox.bottom > 0 && orbitBox.top < height) {
      phaseAge += seconds;
      advancePhase();
    }
    ctx.clearRect(0, 0, width, height);
    drawSun();
    for (const star of stars) {
      const guided = updateOrbit(star, seconds);
      if (!guided && pointer.active) {
        const dx = pointer.x - star.x, dy = pointer.y - star.y;
        if (dx * dx + dy * dy < 190 * 190) {
          const pull = Math.min(.035 * dt, 1);
          star.x += dx * pull; star.y += dy * pull;
        }
      }
      ctx.fillStyle = `rgba(174, 216, 205, ${star.alpha * (.75 + .25 * Math.sin(now / 1800 + star.phase))})`;
      ctx.fillRect(Math.round(star.x / 2) * 2, Math.round(star.y / 2) * 2, star.size, star.size);
    }
    if (now > nextMeteor) {
      meteors.push({ x: rand(width * .25, width * 1.05), y: rand(-60, height * .3), age: 0 });
      nextMeteor = now + rand(4500, 8500);
    }
    meteors = meteors.filter(m => m.age < 110 && m.y < height + 100 && m.x > -180);
    for (const meteor of meteors) {
      meteor.x -= 6 * dt; meteor.y += 3.3 * dt; meteor.age += dt;
      for (let tail = 18; tail >= 0; tail--) {
        const alpha = (1 - tail / 19) * Math.min(meteor.age / 8, 1) * Math.min((110 - meteor.age) / 20, 1);
        ctx.fillStyle = `rgba(${tail < 2 ? '221, 255, 233' : '108, 223, 171'}, ${alpha})`;
        ctx.fillRect(Math.round((meteor.x + tail * 8) / 4) * 4, Math.round((meteor.y - tail * 4.4) / 4) * 4, tail < 3 ? 4 : 3, tail < 3 ? 4 : 3);
      }
    }
    for (const node of nodes) {
      if (updateOrbit(node, seconds)) continue;
      if (pointer.active) {
        const dx = pointer.x - node.x, dy = pointer.y - node.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 190 && distance > 2) {
          const pull = (1 - distance / 190) * 0.03 * dt;
          node.vx += dx * pull / distance;
          node.vy += dy * pull / distance;
        }
      }
      const speed = Math.hypot(node.vx, node.vy);
      if (speed > 0.7) { node.vx *= 0.7 / speed; node.vy *= 0.7 / speed; }
      node.x += node.vx * dt;
      node.y += node.vy * dt;
      if (node.x < 0 || node.x > width) node.vx *= -1;
      if (node.y < 0 || node.y > height) node.vy *= -1;
      node.x = Math.max(0, Math.min(width, node.x));
      node.y = Math.max(0, Math.min(height, node.y));
    }
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];

      for (let j = i + 1; !node.orbit && j < nodes.length; j++) {
        if (nodes[j].orbit) continue;
        const dx = node.x - nodes[j].x, dy = node.y - nodes[j].y;
        const squared = dx * dx + dy * dy;
        if (squared < 15625) line(node, nodes[j], (1 - Math.sqrt(squared) / 125) * 0.13);
      }
      const distance = pointer.active ? Math.hypot(node.x - pointer.x, node.y - pointer.y) : Infinity;
      if (!node.orbit && distance < 190) line(node, pointer, (1 - distance / 190) * 0.6, node.hue);
      ctx.fillStyle = `rgba(${node.hue}, ${distance < 190 ? 0.72 : 0.40})`;
      const pixelSize = distance < 190 ? 3 : 2;
      ctx.fillRect(Math.round(node.x), Math.round(node.y), pixelSize, pixelSize);
    }
    frame = requestAnimationFrame(draw);
  }

  function sync() {
    cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
    canvas.hidden = !enabled;
    document.documentElement.classList.toggle('space-paused', !enabled);
    if (enabled && !document.hidden) frame = requestAnimationFrame(draw);
  }
  document.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch') return;
    pointer.x = event.clientX; pointer.y = event.clientY; pointer.active = true;
  }, { passive: true });
  document.addEventListener('pointerout', event => { if (!event.relatedTarget) pointer.active = false; });
  window.addEventListener('blur', () => { pointer.active = false; });
  document.addEventListener('visibilitychange', sync);
  document.addEventListener('star-population-request', population);
  document.addEventListener('star-orbit-ready', measureOrbit);
  window.addEventListener('scroll', measureOrbit, { passive: true });
  function updateOrbit(p, seconds) {
    if (!physics || !orbitBox || orbitBox.bottom <= 0 || orbitBox.top >= height) return !!p.orbit;
    const cx = orbitBox.left + orbitBox.width / 2, cy = orbitBox.top + orbitBox.height / 2;
    if (!p.orbit && phase === 'orbit' && claimed < Math.ceil(pool.length / 2) && pointer.active &&
        (pointer.x-cx)**2 + (pointer.y-cy)**2 < 220**2 && (p.x-cx)**2 + (p.y-cy)**2 < GRAVITY_RADIUS**2) {
      // Preserve position and initial velocity; no remove/recreate or phase jump.
      p.orbit = true; p.radius = 18 + (claimed++ % 8) * 8;
      p.ox = (p.vx || 0) * 60; p.oy = (p.vy || 0) * 60; p.age = 0;
    }
    if (!p.orbit) return false;
    const old = { x: p.x, y: p.y };
    p.age += seconds;
    if (phase === 'burst') {
      p.x += p.ox * seconds; p.y += p.oy * seconds;
      const drag = Math.exp(-1.1 * seconds);
      p.ox *= drag; p.oy *= drag;
    } else {
      const radius = phase === 'collapse' ? Math.max(1, p.radius * (1 - Math.min(phaseAge / 1.5, 1))**2) : p.radius;
      physics.step(p, cx, cy, radius, seconds);
      if (!p.counted && phase === 'orbit' && p.age > .4 && Math.abs(Math.hypot(p.x-cx,p.y-cy)-p.radius)<8) {
        p.counted = true;
        collected++;
        document.dispatchEvent(new CustomEvent('stellar-progress', {detail:collected}));
        if (collected >= Math.ceil(pool.length / 2)) { phase = 'collapse'; phaseAge = 0; }
      }
    }
    line(old, p, phase === 'burst' ? Math.max(0, .6-phaseAge*.17) : .4, '174, 216, 193');
    return true;
  }
  function advancePhase() {
    if (phase === 'collapse' && phaseAge >= 1.8) {
      phase = 'burst'; phaseAge = 0;
      const cx = orbitBox.left + orbitBox.width / 2, cy = orbitBox.top + orbitBox.height / 2;
      for (const p of pool) if (p.orbit) {
        const angle = Math.atan2(p.y-cy,p.x-cx);
        const speed = rand(65, 155);
        p.ox = Math.cos(angle)*speed; p.oy = Math.sin(angle)*speed;
      }
      document.dispatchEvent(new CustomEvent('stellar-message', {detail:'放松结束，现在是学习时间'}));
    } else if (phase === 'burst' && phaseAge >= 3.8) {
      phase = 'orbit'; phaseAge = 0; collected = 0; claimed = 0;
      nodes = []; stars = []; resize();
    } else if (phase === 'orbit' && phaseAge > 4 && collected === 0) {
      if (phaseAge < 4.1) document.dispatchEvent(new CustomEvent('stellar-message', {detail:''}));
    }
  }
  function drawSun() {
    if (!orbitBox || orbitBox.bottom <= 0 || orbitBox.top >= height) return;
    ctx.save();
    ctx.translate(orbitBox.left + orbitBox.width/2, orbitBox.top + orbitBox.height/2);
    ctx.strokeStyle = 'rgba(139,174,157,.14)'; ctx.lineWidth = .6;
    for (let i=0;i<8;i++) { ctx.beginPath(); ctx.arc(0,0,18+i*8,0,Math.PI*2); ctx.stroke(); }
    ctx.fillStyle = glow; ctx.fillRect(-24,-24,48,48);
    ctx.fillStyle = '#d2e9d5'; ctx.beginPath(); ctx.arc(0,0,phase==='collapse'?4+phaseAge:4,0,Math.PI*2); ctx.fill();
    if (phase === 'burst') {
      ctx.strokeStyle = `rgba(174,216,193,${Math.max(0,.35-phaseAge*.15)})`;
      ctx.beginPath(); ctx.arc(0,0,8+phaseAge*65,0,Math.PI*2); ctx.stroke();
    }
    ctx.restore();
  }
  window.addEventListener('resize', resize, { passive: true });
  reduced.addEventListener('change', () => { enabled = !reduced.matches; sync(); });
  coarse.addEventListener('change', resize);
  resize();
  sync();
})();

