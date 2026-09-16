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

  function resize() {
    width = innerWidth;
    height = innerHeight;
    const scale = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    const count = coarse.matches ? Math.min(28, Math.ceil(width * height / 24000))
      : Math.min(100, Math.max(30, Math.ceil(width * height / 15000)));
    nodes = Array.from({ length: count }, () => ({
      x: rand(0, width), y: rand(0, height), vx: rand(-0.22, 0.22), vy: rand(-0.22, 0.22),
      size: rand(1.1, 2.1), hue: Math.random() > 0.5 ? '92, 173, 255' : '68, 232, 210'
    }));
    stars = Array.from({ length: Math.min(150, Math.ceil(width * height / 6500)) }, () => ({
      x: rand(0, width), y: rand(0, height), size: Math.random() > .9 ? 3 : 2,
      phase: rand(0, Math.PI * 2), alpha: rand(.18, .55)
    }));
    meteors = [];
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
    // Limit mobile devices to 30fps, desktop to ~45fps.
    if (last && elapsed < (coarse.matches ? 33 : 22)) {
      frame = requestAnimationFrame(draw);
      return;
    }
    const dt = Math.min(elapsed / 16.67 || 1, 2.5);
    last = now;
    ctx.clearRect(0, 0, width, height);
    for (const star of stars) {
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
      if (pointer.active) {
        const dx = pointer.x - node.x, dy = pointer.y - node.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 190 && distance > 30) {
          const pull = (1 - distance / 190) * 0.03 * dt;
          node.vx += dx * pull / distance;
          node.vy += dy * pull / distance;
        } else if (distance < 30 && distance > 0.1) {
          node.vx -= dx / distance * 0.012 * dt;
          node.vy -= dy / distance * 0.012 * dt;
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
      for (let j = i + 1; j < nodes.length; j++) {
        const distance = Math.hypot(node.x - nodes[j].x, node.y - nodes[j].y);
        if (distance < 125) line(node, nodes[j], (1 - distance / 125) * 0.13);
      }
      const distance = pointer.active ? Math.hypot(node.x - pointer.x, node.y - pointer.y) : Infinity;
      if (distance < 190) line(node, pointer, (1 - distance / 190) * 0.6, node.hue);
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
  window.addEventListener('resize', resize, { passive: true });
  reduced.addEventListener('change', () => { enabled = !reduced.matches; sync(); });
  coarse.addEventListener('change', resize);
  resize();
  sync();
})();

