const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
function background(low = false, interactive = false) {
  const handlers = {}, frames = new Map(), populations = [];
  let id = 0;
  const classes = new Set();
  const ctx = Object.fromEntries(['setTransform','clearRect','fillRect','beginPath','moveTo','lineTo','stroke'].map(k => [k,()=>{}]));
  const orbitClasses = new Set();
  const orbit = {classList:{contains:k=>orbitClasses.has(k)}};
  let captured = 0;
  const canvas = { getContext: () => ctx };
  const document = {
    hidden: false,
    querySelector: selector => selector === '.main-inner.index' ? {} : !interactive ? null : selector === '.stellar-orbits' ? orbit : selector === '.stellar-vessel' ? {getBoundingClientRect:()=>({left:1920,top:1020,width:160,height:160})} : null,
    getElementById: id => id === 'neural-background' ? canvas : null,
    documentElement: { classList: { toggle(k,on) { on ? classes.add(k) : classes.delete(k); } } },
    addEventListener(k,fn) { (handlers[k] ||= []).push(fn); },
    dispatchEvent(e) { if(e.type === 'star-population') populations.push(e.detail); if(e.type === 'star-captured' && ++captured >= Math.ceil(populations.at(-1)/2)) orbitClasses.add('is-gathering'); for(const f of handlers[e.type] || []) f(e); }
  };
  const env = { document, navigator: {hardwareConcurrency:low ? 2 : 8,deviceMemory:low ? 2 : 8},
    innerWidth:4000,innerHeight:2200,devicePixelRatio:3,
    matchMedia:()=>({matches:false,addEventListener(){}}),performance:{now:()=>0},
    requestAnimationFrame(fn) { frames.set(++id,fn); return id; },cancelAnimationFrame(i){frames.delete(i);},
    CustomEvent:class { constructor(type,init){this.type=type;this.detail=init.detail;} },Event:class {constructor(type){this.type=type;}}
  };
  if (interactive) { env.Math=Object.create(Math); env.Math.random=()=>.5; }
  env.window={addEventListener:document.addEventListener.bind(document)};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../source/js/neural-background.js'),'utf8'),env);
  return {canvas,populations,classes,document,frames,get captured(){return captured;}, tick(t) {const f=[...frames.values()];frames.clear();for(const cb of f)cb(t);} };
}
test('particle count and resolution stay unchanged on all desktop hardware',()=>{
  for(const low of [false,true]) {
    const b=background(low);
    assert.equal(b.canvas.width,8000);
    assert.equal(b.canvas.height,4400);
    assert.equal(b.populations.at(-1),256);
    for(let i=1;i<=60;i++) b.tick(i*120);
    assert.equal(b.populations.at(-1),256);
  }
});
test('background stops in hidden tabs and resumes with one frame loop',()=>{
  const b=background();
  b.document.hidden=true;
  b.document.dispatchEvent({type:'visibilitychange'});
  assert.equal(b.frames.size,0);
  b.document.hidden=false;
  b.document.dispatchEvent({type:'visibilitychange'});
  assert.equal(b.frames.size,1);
});
test('content versions update local assets and leave external URLs alone',()=>{
  const {digest,versionHtml}=require('../lib/asset-versions.cjs');
  const versions=new Map([['css/main.css',digest('new styles')]]);
  const html='<link href="/blog/css/main.css?v=old"><a href="https://other/css/main.css">external</a>';
  const output=versionHtml(html,versions,'/blog/');
  assert.ok(output.includes('main.css?v='+digest('new styles')));
  assert.ok(output.includes('href="https://other/css/main.css"'));
  assert.notEqual(digest('new styles'),digest('old styles'));
});
test('assistant runtime is requested only on click and failed loads can retry',()=>{
  let click, requested=0;
  const children=[];
  const button={lastElementChild:{},addEventListener(t,f){click=f;}};
  const mount={dataset:{script:'/js/notebook-assistant.js'},append(){},querySelector(){return {click(){requested++;}};}};
  const document={getElementById:()=>mount,createElement:t=>t==='button'?button:{remove(){}},head:{append:s=>children.push(s)}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../source/js/assistant-loader.js'),'utf8'),{document});
  assert.equal(children.length,0);
  click();assert.equal(children.length,1);assert.equal(button.disabled,true);
  children[0].onerror();assert.equal(button.disabled,false);
  click();children[1].onload();assert.equal(requested,1);
});

test('hovering alone guides stars into orbit, stops at half, and cannot click-add',()=>{
  const b=background(false,true);
  b.tick(30);
  assert.equal(b.captured,0);
  b.document.dispatchEvent({type:'click',clientX:2000,clientY:1100});
  assert.equal(b.captured,0);
  b.document.dispatchEvent({type:'pointermove',pointerType:'mouse',clientX:2000,clientY:1100});
  b.tick(60);
  assert.equal(b.captured,128);
  b.tick(90);
  assert.equal(b.captured,128);
});
