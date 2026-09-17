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
  const api = { step };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.StellarPhysics = api;
})(typeof window === 'undefined' ? globalThis : window);
