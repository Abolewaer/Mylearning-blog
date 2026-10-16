const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const {project,occluded}=require('../source/js/stellar-renderer.js');
test('inclined rings have depth and a flattened perspective',()=>{
  const front=project(0,80), back=project(0,-80);
  assert.ok(front.depth>0 && back.depth<0);
  assert.ok(Math.hypot(front.x,front.y)<40);
  assert.equal(occluded(back.x,back.y,back.depth),true);
  assert.equal(occluded(front.x,front.y,front.depth),false);
  const side=project(80,0);
  assert.ok(Math.abs(Math.hypot(side.x,side.y)-80)<.001);
});
test('continuous rotation moves surface points, keeps ring textures cached, and bounds drawing work',()=>{
  const {create}=require('../source/js/stellar-renderer.js');
  const canvases=[];
  let cachedDots=0;
  const cached={scale(){},translate(){},fillRect(){cachedDots++;},createRadialGradient(){return {addColorStop(){}};}};
  const document={createElement(){const c={getContext:()=>cached};canvases.push(c);return c;}};
  const globe=create(document,2);
  assert.equal(canvases.length,3);
  assert.ok(canvases.reduce((sum,c)=>sum+c.width*c.height*4,0)<3*1024*1024);
  const before=cachedDots;
  const positions=[];
  let blits=0,styles=0;
  const ctx={save(){},restore(){},rotate(){},beginPath(){},arc(){},fill(){},stroke(){},
    drawImage(){blits++;},fillRect(x,y,size){positions.push([x,y,size]);},set fillStyle(v){styles++;}};
  globe.draw(ctx,1000);
  const first=positions.slice();
  positions.length=0;
  globe.draw(ctx,1500);
  assert.notDeepEqual(positions.slice(0,64),first.slice(0,64));
  assert.ok(positions.length<1900);
  assert.ok(styles<45); // At most ~20 style changes per frame.
  assert.equal(cachedDots,before);
  assert.equal(blits,6);
});
test('mouse sway preserves ring depth and sphere occlusion',()=>{
  const base=project(40,-50), tilted=project(40,-50,.1);
  assert.equal(base.depth,tilted.depth);
  assert.ok(Math.abs(Math.hypot(base.x,base.y)-Math.hypot(tilted.x,tilted.y))<1e-9);
  assert.notEqual(base.y,tilted.y);
});

test('burst fragments fade before the core reforms, without a growing outline circle',()=>{
  const {create}=require('../source/js/stellar-renderer.js');
  const cached={scale(){},translate(){},fillRect(){},createRadialGradient(){return {addColorStop(){}};}};
  const globe=create({createElement:()=>({getContext:()=>cached})});
  let arcs=0, alphas=[];
  const ctx={save(){},restore(){},rotate(){},beginPath(){},arc(){arcs++;},fill(){},stroke(){},drawImage(){},fillRect(){},
    set fillStyle(v){if(v.startsWith('rgba(91,220,199,')) alphas.push(Number(v.slice(16,-1)));}};
  globe.draw(ctx,1000,0,{phase:'burst',age:.6});
  assert.equal(arcs,0);
  const fragmentAlpha=Math.max(...alphas);
  alphas=[];
  globe.draw(ctx,3400,0,{phase:'burst',age:3});
  assert.ok(arcs>0);
  assert.ok(Math.max(...alphas)>fragmentAlpha*5);
});
