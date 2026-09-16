/* Lightweight neural-network background. No external dependencies or tracking. */
(() => {
  'use strict';
  const canvas = document.getElementById('neural-background');
  const toggle = document.getElementById('neural-toggle');
  if (!canvas || !toggle) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = matchMedia('(pointer: coarse)');
  const storageKey = 'learning-blog:particles';
  let enabled = !reduced.matches;
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved !== null && !reduced.matches) enabled = saved === 'on';
  } catch { /* Storage is optional. */ }
  let width = 0, height = 0, nodes = [], frame = 0, last = 0;
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
      size: rand(1.1, 2.1), hue: Math.random() > 0.5 ? '42, 119, 159' : '40, 147, 143'
    }));
  }

  function line(a, b, alpha, color = '48, 125, 155') {
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
        if (distance < 145) line(node, nodes[j], (1 - distance / 145) * 0.28);
      }
      const distance = pointer.active ? Math.hypot(node.x - pointer.x, node.y - pointer.y) : Infinity;
      if (distance < 190) line(node, pointer, (1 - distance / 190) * 0.6, node.hue);
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.size + (distance < 190 ? 0.4 : 0), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${node.hue}, ${distance < 190 ? 0.72 : 0.40})`;
      ctx.fill();
    }
    frame = requestAnimationFrame(draw);
  }

  function sync() {
    cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
    canvas.hidden = !enabled;
    toggle.hidden = false;
    toggle.setAttribute('aria-pressed', String(enabled));
    toggle.textContent = enabled ? '粒子 · 开' : '粒子 · 关';
    toggle.setAttribute('aria-label', enabled ? '关闭粒子背景' : '开启粒子背景');
    if (enabled && !document.hidden) frame = requestAnimationFrame(draw);
  }
  toggle.addEventListener('click', () => {
    enabled = !enabled;
    try { localStorage.setItem(storageKey, enabled ? 'on' : 'off'); } catch { /* Optional. */ }
    sync();
  });
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
