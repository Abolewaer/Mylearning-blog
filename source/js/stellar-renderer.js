/* Continuous particle rotation with cached ring layers. No WebGL or network. */
((root) => {
  const RADIUS=38, SIZE=208;
  const tilt=.46, squash=.36;
  const cos=Math.cos(tilt), sin=Math.sin(tilt);
  function project(x,y,sway=0) {
    const flat=y*squash, a=x*cos-flat*sin, b=x*sin+flat*cos;
    if (!sway) return {x:a,y:b,depth:y};
    const c=Math.cos(sway), s=Math.sin(sway);
    return {x:a*c-b*s,y:a*s+b*c,depth:y};
  }
  function occluded(x,y,depth) { return depth<0 && x*x+y*y<RADIUS*RADIUS; }
  function random(seed) {
    let value=seed>>>0;
    return () => {value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};
  }
  function create(document,density=1) {
    const scale=Math.min(Math.max(density,1),2), rng=random(5129);
    const sphere=[];
    for(let i=0;i<3200;i++) {
      const y=1-2*(i+.5)/3200, longitude=i*2.399963229728653;
      const side=Math.sqrt(1-y*y);
      // Material features stay attached to each point as its position rotates.
      const band=.48+.3*Math.sin(y*29+Math.sin(longitude*3)*1.4)+.22*Math.sin(y*75+longitude*2);
      sphere.push({x:Math.cos(longitude)*side,y,z:Math.sin(longitude)*side,
        material:Math.max(.05,band),size:.75+rng()*.5});
    }
    function layer() {
      const canvas=document.createElement('canvas');
      canvas.width=canvas.height=Math.round(SIZE*scale);
      const context=canvas.getContext('2d');
      if(context) {context.scale(scale,scale);context.translate(SIZE/2,SIZE/2);}
      return {canvas,context};
    }
    const back=layer(),front=layer(),halo=layer();
    for(let i=0;i<2600;i++) {
      const angle=rng()*Math.PI*2, r=47+Math.pow(rng(),.8)*49;
      const p=project(Math.cos(angle)*r,Math.sin(angle)*r);
      if(occluded(p.x,p.y,p.depth)) continue;
      const alpha=(.2+rng()*.5)*(.4+.6*(.55+.45*Math.sin(r*1.9)))*(p.depth>0?1:.78);
      const context=p.depth<0?back.context:front.context;
      if(context) {context.fillStyle=`rgba(107,207,204,${alpha})`;context.fillRect(p.x,p.y,.65+rng()*.55,.65+rng()*.55);}
    }
    if(halo.context) {
      const gradient=halo.context.createRadialGradient(0,0,28,0,0,65);
      gradient.addColorStop(0,'rgba(80,218,201,0)');
      gradient.addColorStop(.25,'rgba(80,218,201,.1)');
      gradient.addColorStop(1,'rgba(80,218,201,0)');
      halo.context.fillStyle=gradient;halo.context.fillRect(-65,-65,130,130);
    }
    const tracers=Array.from({length:72},()=>({angle:rng()*Math.PI*2,radius:48+rng()*47,size:.6+rng()*.6}));
    const buckets=Array.from({length:16},()=>[]);
    function ringDust(ctx,now,frontSide) {
      ctx.fillStyle='rgba(142,239,222,.65)';
      for(const point of tracers) {
        const a=point.angle+now*.00022*Math.pow(60/point.radius,1.5);
        const p=project(Math.cos(a)*point.radius,Math.sin(a)*point.radius);
        if((p.depth>=0)!==frontSide || occluded(p.x,p.y,p.depth)) continue;
        ctx.fillRect(p.x,p.y,point.size,point.size);
      }
    }
    return {
      draw(ctx,now,sway=0,event=null) {
        const burst=event?.phase==='burst', age=event?.age || 0;
        const t=Math.max(0,Math.min(1,(age-1.5)/1.5));
        const birth=burst?t*t*(3-2*t):1;
        const debris=burst && age<1.3;
        const opacity=debris?Math.exp(-age*4):birth;
        const coreScale=debris ? .28+age*1.7 : .4+.6*birth;
        const ringOpacity=burst?birth+Math.max(0,.22-age*.8):1;
        ctx.save();ctx.rotate(sway);
        const flash=burst?Math.exp(-age*7)*.95:0;
        const charge=event?.phase==='collapse'?Math.min(.55,(age/1.8)**3*.55):0;
        ctx.globalAlpha=Math.min(1,flash+charge+birth*(.65+.25*Math.sin(now*.0015)));
        if(halo.context) ctx.drawImage(halo.canvas,-SIZE/2,-SIZE/2,SIZE,SIZE);
        ctx.globalAlpha=ringOpacity;
        if(back.context) ctx.drawImage(back.canvas,-SIZE/2,-SIZE/2,SIZE,SIZE);
        ringDust(ctx,now,false);
        ctx.globalAlpha=birth;
        if(!debris && birth>0) {ctx.fillStyle='#090f15';ctx.beginPath();ctx.arc(0,0,RADIUS*coreScale,0,Math.PI*2);ctx.fill();}
        ctx.globalAlpha=1;
        const angle=now*.0004, c=Math.cos(angle), s=Math.sin(angle);
        for(const bucket of buckets) bucket.length=0;
        for(const p of sphere) {
          const x=p.x*c+p.z*s, z=p.z*c-p.x*s;
          if(z<=0) continue;
          const light=Math.max(0,-.42*x-.55*p.y+.7*z),rim=(1-z)**3;
          const alpha=Math.min(.98,(.08+p.material*(.2+.65*light)+rim*.22)*1.35);
          const sx=x*RADIUS*coreScale,sy=p.y*RADIUS*coreScale;
          buckets[Math.min(15,Math.floor(alpha*16))].push(sx*cos-sy*sin,sx*sin+sy*cos,p.size);
        }
        // Batch brightness changes instead of creating a style string per point.
        for(let i=0;i<buckets.length;i++) {
          ctx.fillStyle=`rgba(91,220,199,${(i+.5)/16*opacity})`;
          const bucket=buckets[i];
          for(let j=0;j<bucket.length;j+=3) ctx.fillRect(bucket[j],bucket[j+1],bucket[j+2],bucket[j+2]);
        }
        if(!debris && birth>0) {
          ctx.strokeStyle=`rgba(139,244,219,${.25*birth})`;ctx.lineWidth=.5;
          ctx.beginPath();ctx.arc(0,0,RADIUS*coreScale,0,Math.PI*2);ctx.stroke();
        }
        ctx.globalAlpha=ringOpacity;
        if(front.context) ctx.drawImage(front.canvas,-SIZE/2,-SIZE/2,SIZE,SIZE);
        ringDust(ctx,now,true);
        ctx.restore();
      }
    };
  }
  const api={create,project,occluded,radius:RADIUS};
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
  else root.StellarRenderer=api;
})(typeof window==='undefined'?globalThis:window);
