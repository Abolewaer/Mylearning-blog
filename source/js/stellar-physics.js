/* A bounded, damped orbital field. Units: CSS pixels and seconds. */
((root) => {
  function step(p, cx, cy, radius, seconds) {
    const duration = Math.min(Math.max(seconds, 0), .05);
    const steps = Math.max(1, Math.ceil(duration * 120));
    const dt = duration / steps;
    for (let i = 0; i < steps; i++) {
      let dx = p.x - cx, dy = p.y - cy;
      const distance = Math.hypot(dx, dy);
      if (distance < .001) { dx = 1; dy = 0; }
      const inverse = 1 / Math.max(distance, .001);
      const nx = distance < .001 ? 1 : dx * inverse;
      const ny = distance < .001 ? 0 : dy * inverse;
      const radial = Math.max(-90, Math.min(90, (radius - distance) * 2.5));
      const tangent = Math.sqrt(radius) * 5;
      const ax = (nx * radial - ny * tangent - p.ox) * 5;
      const ay = (ny * radial + nx * tangent - p.oy) * 5;
      const scale = Math.min(1, 420 / Math.max(1, Math.hypot(ax, ay)));
      p.ox += ax * scale * dt;
      p.oy += ay * scale * dt;
      p.x += p.ox * dt;
      p.y += p.oy * dt;
    }
  }
  function eject(p, cx, cy, width, height, fraction) {
    const angle = Math.atan2(p.y - cy, p.x - cx);
    const dx = Math.cos(angle), dy = Math.sin(angle);
    const edgeX = Math.abs(dx) < 1e-6 ? Infinity : (dx > 0 ? width - p.x : -p.x) / dx;
    const edgeY = Math.abs(dy) < 1e-6 ? Infinity : (dy > 0 ? height - p.y : -p.y) / dy;
    const distance = Math.max(0, Math.min(edgeX, edgeY)) * fraction;
    const speed = distance * 1.5 / (1 - Math.exp(-1.5 * 3.8));
    p.ox = dx * speed; p.oy = dy * speed;
    p.orbit = false; p.counted = false; p.ejected = true;
  }
  function coast(p, seconds, width, height) {
    const dt = Math.min(Math.max(seconds, 0), .05);
    const drag = Math.exp(-1.5 * dt);
    // Exact exponential integration avoids frame-rate-dependent travel distance.
    p.x += p.ox * (1 - drag) / 1.5;
    p.y += p.oy * (1 - drag) / 1.5;
    p.ox *= drag; p.oy *= drag;
    if (p.x < 0 || p.x > width) { p.x = Math.max(0, Math.min(width, p.x)); p.ox *= -1; }
    if (p.y < 0 || p.y > height) { p.y = Math.max(0, Math.min(height, p.y)); p.oy *= -1; }
  }
  const api = { step, eject, coast, threshold: 188 };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.StellarPhysics = api;
})(typeof window === 'undefined' ? globalThis : window);
