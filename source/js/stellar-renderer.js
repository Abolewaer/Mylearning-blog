/* Particle sphere + inclined ring. Cached locally; no WebGL, textures or network. */
((root) => {
  const RADIUS = 38, SIZE = 208, FRAMES = 12;
  const tilt = .46, cos = Math.cos(tilt), sin = Math.sin(tilt), squash = .36;
  function project(x, y) {
    const flatY = y * squash;
    return { x: x*cos-flatY*sin, y: x*sin+flatY*cos, depth: y };
  }
  function occluded(x, y, depth) { return depth < 0 && x*x+y*y < RADIUS*RADIUS; }
  function random(seed) {
    let value = seed >>> 0;
    return () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296; };
  }
  function raster(context, angle) {
    const rng = random(5129);
    const sphere = [], back = [], front = [];
    for (let i=0;i<3600;i++) {
      const v = 1-2*(i+.5)/3600, phi = i*2.399963229728653+angle;
      const side = Math.sqrt(1-v*v);
      const x = Math.cos(phi)*side, z = Math.sin(phi)*side;
      if (z <= 0) continue;
      const band = .48+.3*Math.sin(v*29+Math.sin(phi*3)*.9)+.22*Math.sin(v*75+phi);
      const light = Math.max(0, -.42*x-.55*v+.7*z);
      const rim = (1-z)**3;
      const alpha = Math.min(.95, .08+Math.max(0,band)*(.2+.65*light)+rim*.22);
      const sx=x*RADIUS, sy=v*RADIUS;
      sphere.push({x:sx*cos-sy*sin,y:sx*sin+sy*cos,alpha:Math.min(1,alpha*1.35),size:.75+rng()*.5});
    }
    for (let i=0;i<2600;i++) {
      const a=rng()*Math.PI*2;
      const r=47+Math.pow(rng(),.8)*49;
      const p=project(Math.cos(a)*r,Math.sin(a)*r);
      if (occluded(p.x,p.y,p.depth)) continue;
      const grooves=.55+.45*Math.sin(r*1.9);
      p.alpha=(.2+rng()*.5)*(.4+.6*grooves)*(p.depth>0?1:.78);
      p.size=.65+rng()*.55;
      (p.depth<0?back:front).push(p);
    }
    function dots(points) {
      for(const p of points) {
        context.fillStyle=`rgba(211,204,170,${p.alpha})`;
        context.fillRect(p.x,p.y,p.size,p.size);
      }
    }
    dots(back);
    // Opaque silhouette also masks unrelated background stars behind the globe.
    context.fillStyle='#090f15'; context.beginPath(); context.arc(0,0,RADIUS,0,Math.PI*2); context.fill();
    dots(sphere);
    context.strokeStyle='rgba(222,216,184,.18)'; context.lineWidth=.5;
    context.beginPath(); context.arc(0,0,RADIUS,0,Math.PI*2); context.stroke();
    dots(front);
  }
  function create(document, density=1) {
    const scale=Math.min(Math.max(density,1),2);
    const frames=new Array(FRAMES);
    let built=0;
    function buildNext() {
      const canvas=document.createElement('canvas');
      canvas.width=canvas.height=Math.round(SIZE*scale);
      const context=canvas.getContext('2d');
      if (!context) return;
      context.scale(scale,scale); context.translate(SIZE/2,SIZE/2);
      raster(context,built/FRAMES*Math.PI*2);
      frames[built++]=canvas;
    }
    // One synchronous frame, then one per idle callback; no large startup task.
    buildNext();
    function prepare() {
      if(built>=FRAMES) return;
      buildNext();
      if(built<FRAMES) schedule(prepare);
    }
    const schedule=callback => typeof root.requestIdleCallback==='function'
      ? root.requestIdleCallback(callback,{timeout:300}) : root.setTimeout(callback,40);
    schedule(prepare);
    return {
      draw(ctx,now) {
        if(!frames[0]) return;
        const t=(now/1400)%FRAMES, index=Math.floor(t), blend=t-index;
        const a=frames[index]||frames[0], b=frames[(index+1)%FRAMES]||a;
        ctx.drawImage(a,-SIZE/2,-SIZE/2,SIZE,SIZE);
        if(a!==b && blend>0) { ctx.globalAlpha=blend; ctx.drawImage(b,-SIZE/2,-SIZE/2,SIZE,SIZE); ctx.globalAlpha=1; }
      }
    };
  }
  const api={create,project,occluded,radius:RADIUS};
  if(typeof module!=='undefined' && module.exports) module.exports=api;
  else root.StellarRenderer=api;
})(typeof window==='undefined'?globalThis:window);
