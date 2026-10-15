// ───────────────────────────────────────────────────────────────
//  화면: 지도 렌더링 · 패널 · 사건 모달 · 시작/결말
// ───────────────────────────────────────────────────────────────
(function(){
const D=window.GDATA, ENG=window.ENGINE, MAP=ENG.map;
const {W,H,N,cellId,PLON,PLAT,PAREA,PTER,PNAME}=MAP;
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
function setHTML(el,h){ if(el._h===h) return false; el._h=h; el.innerHTML=h; return true; }
const SPEEDS=[1,2,3,5,10,15,30], DPS=8; // 1배속 = 초당 8일
let G=null, speed=0, lastSpeed=1, ff=false, modalOpen=false, tab='state', sel=-1, mode='pol', selArmy=null;

// ── 형식 ──
const fy=y=>ENG.fmtYear(y);
const fdate=(g)=>`${fy(g.y)} ${g.m}월 ${g.d}일`;
const fpop=n=>ENG.fmtPop(n);
function fmoney(n){ const a=Math.abs(n), s=n<0?'−':''; if(a>=1e12) return s+(a/1e12).toFixed(1)+'조'; if(a>=1e8) return s+(a/1e8).toFixed(a>=1e10?0:1)+'억'; if(a>=1e4) return s+(a/1e4).toFixed(a>=1e6?0:1)+'만'; return s+Math.round(a); }
const pct=v=>(v*100).toFixed(0)+'%';
const FXN={tax:'세수',prod:'생산',mil:'군사력',def:'방어',res:'연구',lit:'문해율',life:'수명',stab:'안정',colon:'개척',naval:'항해',manp:'동원력',tfr:'출산율',growth:'인구 증가',demo:'인구 변천',corr:'부패'};
function fxStr(fx){ return Object.entries(fx||{}).filter(([k,v])=>v&&FXN[k]).map(([k,v])=>{ const sg=v>0?'+':'−', a=Math.abs(v);
  if(k==='life') return `${FXN[k]} ${sg}${a}년`; if(k==='naval') return `${FXN[k]} ${sg}${a}`; if(k==='stab') return `${FXN[k]} ${sg}${a}`; if(k==='tfr') return `${FXN[k]} ${sg}${a}`; if(k==='growth') return `${FXN[k]} ${sg}${(a*100).toFixed(1)}%p`; if(k==='corr') return `${FXN[k]} ${sg}${a}%p`;
  return `${FXN[k]} ${sg}${Math.round(a*100)}%`; }).join(' · '); }

// ── 색 ──
const cctx=document.createElement('canvas').getContext('2d');
const rgbCache=new Map();
function rgb(col){ if(rgbCache.has(col)) return rgbCache.get(col); cctx.fillStyle='#000'; cctx.fillStyle=col; const h=cctx.fillStyle; let r,g,b; if(h[0]==='#'){ r=parseInt(h.slice(1,3),16); g=parseInt(h.slice(3,5),16); b=parseInt(h.slice(5,7),16);} else { const m=h.match(/\d+/g); r=+m[0];g=+m[1];b=+m[2]; } const v=[r,g,b]; rgbCache.set(col,v); return v; }
const pack=(r,g,b)=>(255<<24)|(b<<16)|(g<<8)|r;
const mix=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
const OCEAN=[19,34,44], OCEAN32=pack(...OCEAN);
const TERR=[[72,78,66],[104,96,76],[92,98,100],[60,72,64],[58,74,58],[88,88,68]];
const GOLD=[214,169,79], SEAL=[196,69,47], BLK=[8,11,14];

// 지방별 셀 수와 중심 (셀 좌표)
const PCELLS=new Uint32Array(N), PCX=new Float32Array(N), PCY=new Float32Array(N);
for(let i=0;i<W*H;i++){ const id=cellId[i]; if(id&&id!==65535){ const p=id-1; PCELLS[p]++; PCX[p]+=i%W; PCY[p]+=(i/W)|0; } }
for(let p=0;p<N;p++){ if(PCELLS[p]){ PCX[p]/=PCELLS[p]; PCY[p]/=PCELLS[p]; } else { PCX[p]=(PLON[p]-MAP.lon0)/MAP.res; PCY[p]=(MAP.lat0-PLAT[p])/MAP.res; } }

// ── 지도 뷰 ──
class MapView{
  constructor(canvas,interactive){
    this.cv=canvas; this.ctx=canvas.getContext('2d'); this.inter=interactive;
    this.off=document.createElement('canvas'); this.off.width=W*2; this.off.height=H*2; this.octx=this.off.getContext('2d');
    this.img=this.octx.createImageData(W*2,H*2); this.d32=new Uint32Array(this.img.data.buffer);
    this.vx=W/2; this.vy=H/2.4; this.vs=1; this.ver=-1; this.mode=null; this.dirty=true; this.labels=[]; this.hl=null; this.hlP=-1; this.focusTag=null;
    if(interactive) this.bindInput();
    new ResizeObserver(()=>this.resize()).observe(canvas);
    this.resize();
  }
  resize(){ const r=this.cv.getBoundingClientRect(); const dpr=Math.min(2,window.devicePixelRatio||1); this.cw=r.width; this.ch=r.height; this.cv.width=Math.max(1,Math.round(r.width*dpr)); this.cv.height=Math.max(1,Math.round(r.height*dpr)); this.dpr=dpr; this.minS=Math.max(r.width/W, r.height/H*0.9); if(this.vs<this.minS) this.vs=this.minS; this.dirty=true; }
  fit(){ this.vs=this.minS; this.vx=W/2; this.vy=H/2.2; this.clampView(); this.dirty=true; }
  clampView(){ this.vs=clamp(this.vs,this.minS,40); const half=this.ch/2/this.vs; this.vy=clamp(this.vy,Math.min(half,H/2),Math.max(H-half,H/2)); this.vx=((this.vx%W)+W)%W; }
  focusOn(px,py,zoom){ this.vx=px; this.vy=py; if(zoom) this.vs=Math.max(this.minS,zoom); this.clampView(); this.dirty=true; }
  focusCountry(ci){ const ps=[]; for(let p=0;p<N;p++) if(G0().owner[p]===ci) ps.push(p); if(!ps.length) return;
    const c=G0().C[ci]; const cap=c.cap>=0?c.cap:ps[0];
    // 수도 주변 덩어리 기준
    const near=ps.filter(p=>Math.abs(PCX[p]-PCX[cap])<W/4);
    let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9; for(const p of near){ x0=Math.min(x0,PCX[p]);x1=Math.max(x1,PCX[p]);y0=Math.min(y0,PCY[p]);y1=Math.max(y1,PCY[p]); }
    const span=Math.max(x1-x0+30,(y1-y0+30)*this.cw/this.ch,40);
    this.focusOn((x0+x1)/2,(y0+y1)/2, clamp(this.cw/span/1.4,this.minS,14)); }
  build(g){
    const own=g.owner, d=this.d32, W2=W*2, mode=this.mode=mode_(this);
    const pc=new Uint32Array(N); const pcol=new Array(N);
    const P=g.player, exp=ENG.expectedTech(g.y);
    const ccol=g.C.map(c=>rgb(c.col));
    for(let p=0;p<N;p++){
      const o=own[p]; let c;
      if(mode==='pol'||mode==='start'){ c = o<0? TERR[PTER[p]] : ccol[o]; if(mode==='start'&&this.focusTag!=null&&o>=0&&o!==this.focusTag) c=mix(c,[30,38,44],0.55); }
      else if(mode==='pop'){ const dens=g.pop[p]/Math.max(200,PAREA[p]); const t=clamp((Math.log10(dens+0.01)+1)/3.6,0,1); c=mix([28,40,46],[240,207,134],Math.pow(t,0.9)); }
      else if(mode==='tech'){ if(o<0) c=[34,42,48]; else { const v=clamp((g.C[o].techs.size-exp)/12,-1,1); c= v<0? mix([120,124,126],[70,120,170],-v) : mix([120,124,126],[226,178,80],v); } }
      else if(mode==='log'){ const P_=g.C[P]; const lv=g.road?g.road[p]:0; const sp=P_._sup&&g.wars.some(w=>w.a===P||w.b===P)?P_._sup[p]:null;
        if(sp!=null) c=mix([150,60,48],[120,170,110],sp); else c= o<0? mix(TERR[PTER[p]],[20,28,34],0.5) : mix([34,44,52],[240,207,134],lv/5); }
      else if(mode==='res'){ const base=o<0? TERR[PTER[p]] : mix(ccol[o],[30,38,44],0.55); const rk=clamp(MAP.PSEIS[p]*120,0,1); c=mix(base,[150,60,48],rk*0.75); }
      else if(mode==='dip'){ if(o<0) c=[34,42,48]; else if(o===P) c=GOLD; else { const w=ENG.findWar(g,P,o); if(w) c=SEAL; else if(g.C[P].truce[o]>g.day) c=[120,104,150]; else c=[80,92,100]; } }
      pcol[p]=c; pc[p]=pack(c[0],c[1],c[2]);
    }
    const borderC=pack(...BLK), goldB=pack(...GOLD), coast=pack(10,16,20);
    const provB=new Uint32Array(N); for(let p=0;p<N;p++){ const c=mix(pcol[p],BLK,0.22); provB[p]=pack(c[0],c[1],c[2]); }
    const land0=pack(...TERR[0]);
    for(let y=0;y<H;y++){
      const row=y*W, r2=y*2*W2, r3=r2+W2;
      for(let x=0;x<W;x++){
        const id=cellId[row+x]; const x2=x*2;
        if(id===0){ d[r2+x2]=d[r2+x2+1]=d[r3+x2]=d[r3+x2+1]=OCEAN32; continue; }
        let p=id===65535?-1:id-1; const col=p<0?land0:pc[p]; const o=p<0?-9:own[p];
        const idR=cellId[row+(x+1)%W], idD=y<H-1?cellId[row+W+x]:0;
        const pR=idR===0?-2:idR===65535?-1:idR-1, pD=idD===0?-2:idD===65535?-1:idD-1;
        const oR=pR===-2?-8:pR<0?-9:own[pR], oD=pD===-2?-8:pD<0?-9:own[pD];
        let cr=col, cd=col;
        if(pR===-2) cr=coast; else if(oR!==o){ cr=(o===P||oR===P)&&o!==-1&&mode!=='start'?goldB:borderC; } else if(pR!==p&&p>=0&&o>=0) cr=provB[p];
        if(pD===-2) cd=coast; else if(oD!==o){ cd=(o===P||oD===P)&&o!==-1&&mode!=='start'?goldB:borderC; } else if(pD!==p&&p>=0&&o>=0) cd=provB[p];
        d[r2+x2]=col; d[r2+x2+1]=cr; d[r3+x2]=cd; d[r3+x2+1]=(cr!==col)?cr:cd;
      }
    }
    this.octx.putImageData(this.img,0,0);
    this.ver=g.ownVer; this.builtMode=mode; this.builtDay=g.day;
    this.computeLabels(g);
  }
  computeLabels(g){
    const own=g.owner; const L=[];
    for(const c of g.C){ if(!c.alive||c.prov===0) continue;
      const start=c.cap>=0&&own[c.cap]===c.i?c.cap:-1; if(start<0) continue;
      const seen=new Set([start]), q=[start]; let sx=0,sy=0,sc=0,x0=1e9,x1=-1e9;
      while(q.length){ const p=q.pop(); const w=PCELLS[p]; sx+=PCX[p]*w; sy+=PCY[p]*w; sc+=w; x0=Math.min(x0,PCX[p]); x1=Math.max(x1,PCX[p]);
        for(const r of MAP.ADJ[p]) if(!seen.has(r)&&own[r]===c.i){ seen.add(r); q.push(r);} }
      if(sc<6) continue;
      L.push({i:c.i,name:c.name.replace(/\s*\(.*\)$/,''),x:sx/sc,y:sy/sc,cells:sc,wid:Math.max(x1-x0,Math.sqrt(sc))});
    }
    this.labels=L;
  }
  setHighlight(p){
    if(p===this.hlP) return; this.hlP=p; this.hl=null; if(p<0) return;
    let x0=W,x1=0,y0=H,y1=0; for(let i=0;i<W*H;i++) if(cellId[i]===p+1){ const x=i%W,y=(i/W)|0; if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; }
    if(x1<x0) return; if(x1-x0>W/2){ this.hl=null; return; }
    const c=document.createElement('canvas'); c.width=(x1-x0+1)*2; c.height=(y1-y0+1)*2; const k=c.getContext('2d'); const im=k.createImageData(c.width,c.height); const dd=new Uint32Array(im.data.buffer);
    const fill=(255<<24)|(255<<16)|(255<<8)|255;
    for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++) if(cellId[y*W+x]===p+1){ const X=(x-x0)*2,Y=(y-y0)*2; const w=c.width; dd[Y*w+X]=dd[Y*w+X+1]=dd[(Y+1)*w+X]=dd[(Y+1)*w+X+1]=fill; }
    k.putImageData(im,0,0); this.hl={c,x0,y0};
  }
  toScreen(cx,cy){ let dx=cx-this.vx; if(dx>W/2) dx-=W; if(dx<-W/2) dx+=W; return [dx*this.vs+this.cw/2,(cy-this.vy)*this.vs+this.ch/2]; }
  toCell(sx,sy){ return [((sx-this.cw/2)/this.vs+this.vx+W*10)%W,(sy-this.ch/2)/this.vs+this.vy]; }
  draw(g){
    const ctx=this.ctx, s=this.vs, dpr=this.dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.fillStyle='#13222c'; ctx.fillRect(0,0,this.cw,this.ch);
    // 경위선
    ctx.strokeStyle='rgba(120,150,170,0.07)'; ctx.lineWidth=1; ctx.beginPath();
    for(let lon=-180;lon<=180;lon+=30){ const [sx]=this.toScreen((lon-MAP.lon0)/MAP.res,0); ctx.moveTo(sx,0); ctx.lineTo(sx,this.ch); }
    for(let lat=60;lat>=-60;lat-=30){ const [,sy]=this.toScreen(0,(MAP.lat0-lat)/MAP.res); ctx.moveTo(0,sy); ctx.lineTo(this.cw,sy); }
    ctx.stroke();
    ctx.imageSmoothingEnabled = s<3.2;
    const ox=(0-this.vx)*s+this.cw/2, oy=(0-this.vy)*s+this.ch/2;
    for(const k of [-1,0,1]){ const x=ox+k*W*s; if(x>this.cw||x+W*s<0) continue; ctx.drawImage(this.off,x,oy,W*s,H*s); }
    if(this.hl){ ctx.globalAlpha=0.28; for(const k of [-1,0,1]){ const [sx,sy]=this.toScreen(this.hl.x0+k*W,this.hl.y0); const xx=(this.hl.x0-this.vx+k*W)*s+this.cw/2; ctx.drawImage(this.hl.c,xx,sy,this.hl.c.width/2*s,this.hl.c.height/2*s); } ctx.globalAlpha=1; }
    if(!g) return;
    // 국가 이름
    ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.lineJoin='round';
    for(const l of this.labels){
      let f=0.42*Math.sqrt(l.cells)*s; f=Math.min(f, l.wid*s*1.6/Math.max(2,l.name.length)); if(f<9.5) continue; f=Math.min(f,44);
      const [x,y]=this.toScreen(l.x,l.y); if(x<-200||x>this.cw+200||y<-50||y>this.ch+50) continue;
      ctx.font=`700 ${f.toFixed(1)}px 'Noto Serif KR',serif`;
      ctx.lineWidth=Math.max(2,f/7); ctx.strokeStyle='rgba(8,11,14,0.6)'; ctx.strokeText(l.name,x,y);
      ctx.fillStyle= (this.inter&&l.i===g.player)?'#f6dc9c':'rgba(240,234,220,0.92)'; ctx.fillText(l.name,x,y);
    }
    if(!this.inter) return;
    const P=g.C[g.player];
    // 자원·화산 표시
    if(mode==='res' || mode==='log' || s>=6){
      const kn=id=>P.techs.has(id); const fs=Math.max(9,Math.min(13,s*2.2));
      ctx.font=`700 ${fs}px 'Noto Serif KR',serif`;
      for(let p=0;p<N;p++){ const rs=MAP.PRES[p]; if(!rs.length) continue; const [x,y]=this.toScreen(PCX[p],PCY[p]); if(x<-20||x>this.cw+20||y<-20||y>this.ch+20) continue;
        const uniq=[...new Set(rs)]; uniq.forEach((r,i)=>{ const R=D.RES[r]; const on=R.on(kn)>0; const xx=x+(i-(uniq.length-1)/2)*(fs+5);
          ctx.beginPath(); ctx.arc(xx,y,fs*0.72,0,7); ctx.fillStyle=on?R.col:'rgba(40,48,54,.85)'; ctx.fill(); ctx.lineWidth=1.5; ctx.strokeStyle=on?'rgba(8,11,14,.8)':R.col; ctx.stroke();
          ctx.fillStyle=on?'#0d1318':R.col; ctx.fillText(R.g,xx,y+0.5); }); }
      if(g.port){ ctx.font=`700 ${fs}px sans-serif`; for(let p=0;p<N;p++){ const lv=g.port[p]; if(!lv) continue; const [x,y]=this.toScreen(PCX[p],PCY[p]); if(x<-20||x>this.cw+20||y<-20||y>this.ch+20) continue; const yy=y+fs+4; ctx.lineWidth=3; ctx.strokeStyle='rgba(8,11,14,.8)'; ctx.strokeText('⚓'+(lv>1?lv:''),x,yy); ctx.fillStyle=g.owner[p]===g.player?'#9cc3e6':'#7f95a8'; ctx.fillText('⚓'+(lv>1?lv:''),x,yy); } }
      ctx.font=`700 ${Math.max(11,fs+2)}px sans-serif`;
      D.VOLCANOES.forEach(v=>{ const [x,y]=this.toScreen((v[1]-MAP.lon0)/MAP.res,(MAP.lat0-v[2])/MAP.res); if(x<-20||x>this.cw+20||y<-20||y>this.ch+20) return; ctx.strokeStyle='rgba(8,11,14,.8)'; ctx.lineWidth=3; ctx.strokeText('▲',x,y); ctx.fillStyle='#e0664f'; ctx.fillText('▲',x,y); });
    }
    // 수도
    if(P.cap>=0){ const [x,y]=this.toScreen(PCX[P.cap],PCY[P.cap]); ctx.fillStyle='#f0cf86'; ctx.strokeStyle='#1b1407'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(x,y,4.5,0,7); ctx.fill(); ctx.stroke(); }
    // 작전 표시
    const ring=(p,prog,color,glyph)=>{ const [x,y]=this.toScreen(PCX[p],PCY[p]); ctx.lineWidth=3; ctx.strokeStyle='rgba(8,11,14,.7)'; ctx.beginPath(); ctx.arc(x,y,10,0,7); ctx.stroke(); ctx.strokeStyle=color; ctx.beginPath(); ctx.arc(x,y,10,-Math.PI/2,-Math.PI/2+Math.PI*2*clamp(prog,0,1)); ctx.stroke(); ctx.fillStyle=color; ctx.font=`700 11px 'Noto Serif KR',serif`; ctx.fillText(glyph,x,y+0.5); };
    for(const op of g.ops) if(op.by===g.player) ring(op.p,op.prog,'#f0cf86','拓');
    for(const op of g.ops) if(op.by===g.player&&op.type==='road') ring(op.p,op.prog,'#c3bcac','路');
    for(const k in (g.sieges||{})){ const sg=g.sieges[k]; const pp=+k; if(sg.o===g.player) ring(pp,sg.prog,'#f0cf86','攻'); else if(g.owner[pp]===g.player) ring(pp,sg.prog,'#e0664f','危'); }
    this.drawArmies(g,ctx,s);
  }
  drawArmies(g,ctx,s){
    this.hits=[]; if(!g.armies) return;
    const P=g.player; const en=new Set(ENG.enemiesOf(g,P));
    const showAll=s>=3;
    const slot=new Map();
    // 경로
    for(const a of g.armies){ if(a.o!==P||!a.path.length) continue; const sel=selArmy===a.id; if(!sel&&a.auto) continue;
      ctx.strokeStyle=sel?'rgba(246,220,156,.9)':'rgba(214,169,79,.45)'; ctx.lineWidth=sel?2.5:1.5; ctx.setLineDash([6,5]); ctx.beginPath(); let [x,y]=this.toScreen(PCX[a.p],PCY[a.p]); ctx.moveTo(x,y);
      for(const st of a.path){ const [x2,y2]=this.toScreen(PCX[st.p],PCY[st.p]); if(Math.abs(x2-x)>this.cw) ctx.moveTo(x2,y2); else ctx.lineTo(x2,y2); x=x2; y=y2; } ctx.stroke(); ctx.setLineDash([]);
      const [dx,dy]=this.toScreen(PCX[a.path[a.path.length-1].p],PCY[a.path[a.path.length-1].p]); ctx.fillStyle='#f6dc9c'; ctx.beginPath(); ctx.arc(dx,dy,3.5,0,7); ctx.fill(); }
    // 전투
    ctx.font="700 16px 'Noto Serif KR',serif";
    for(const b of g.battles||[]){ if(!showAll&&b.ao!==P&&b.do!==P) continue; const [x,y]=this.toScreen(PCX[b.p],PCY[b.p]); ctx.lineWidth=3; ctx.strokeStyle='rgba(8,11,14,.8)'; ctx.strokeText('戰',x,y-22); ctx.fillStyle='#e0664f'; ctx.fillText('戰',x,y-22); }
    ctx.font="600 10.5px 'IBM Plex Mono',monospace";
    for(const a of g.armies){
      const mine=a.o===P, foe=en.has(a.o); if(!mine&&!foe&&!showAll) continue;
      let px=PCX[a.p], py=PCY[a.p];
      if(a.path.length){ const st=a.path[0]; const t=clamp(a.prog/Math.max(0.01,st.days),0,1); let nx=PCX[st.p]; if(Math.abs(nx-px)>W/2) nx+= nx>px?-W:W; px+=(nx-px)*t; py+=(PCY[st.p]-py)*t; }
      const k=slot.get(a.p)||0; slot.set(a.p,k+1);
      let [x,y]=this.toScreen(px,py); y+=k*18-6; if(x<-40||x>this.cw+40||y<-20||y>this.ch+20) continue;
      const label=armyShort(a.n); const w=ctx.measureText(label).width+16, h=16;
      const col=rgb(g.C[a.o].col);
      ctx.fillStyle=`rgb(${col[0]},${col[1]},${col[2]})`; ctx.strokeStyle= selArmy===a.id?'#ffffff':mine?'#f0cf86':foe?'#e0664f':'rgba(8,11,14,.8)'; ctx.lineWidth=selArmy===a.id?2.5:1.5;
      ctx.beginPath(); ctx.roundRect(x-w/2,y-h/2,w,h,3); ctx.fill(); ctx.stroke();
      ctx.fillStyle='rgba(8,11,14,.75)'; ctx.fillRect(x-w/2+3,y-h/2+3,4,h-6); ctx.fillStyle=a.mor>0.6?'#79b48a':a.mor>0.3?'#d9a441':'#d5604e'; ctx.fillRect(x-w/2+3,y-h/2+3+(h-6)*(1-a.mor),4,(h-6)*a.mor);
      ctx.fillStyle='#0d1318'; ctx.fillText(label,x+3,y+0.5);
      if(a.gen&&a.gen.fig){ ctx.fillStyle='#f0cf86'; ctx.fillText('★',x+w/2+6,y); }
      this.hits.push({id:a.id,x0:x-w/2,y0:y-h/2,x1:x+w/2,y1:y+h/2});
    }
  }
  bindInput(){
    const cv=this.cv; const pts=new Map(); let moved=0, last=null, pinch=null;
    cv.addEventListener('pointerdown',e=>{ cv.setPointerCapture(e.pointerId); pts.set(e.pointerId,[e.offsetX,e.offsetY]); moved=0; last=[e.offsetX,e.offsetY]; if(pts.size===2){ const [a,b]=[...pts.values()]; pinch={d:Math.hypot(a[0]-b[0],a[1]-b[1]),s:this.vs}; } cv.classList.add('drag'); });
    cv.addEventListener('pointermove',e=>{ if(!pts.has(e.pointerId)) return; pts.set(e.pointerId,[e.offsetX,e.offsetY]);
      if(pts.size===2&&pinch){ const [a,b]=[...pts.values()]; const d=Math.hypot(a[0]-b[0],a[1]-b[1]); this.vs=clamp(pinch.s*d/pinch.d,this.minS,40); this.clampView(); this.dirty=true; moved=99; return; }
      const dx=e.offsetX-last[0], dy=e.offsetY-last[1]; moved+=Math.abs(dx)+Math.abs(dy); last=[e.offsetX,e.offsetY]; this.vx-=dx/this.vs; this.vy-=dy/this.vs; this.clampView(); this.dirty=true; });
    const up=e=>{ const was=pts.has(e.pointerId); pts.delete(e.pointerId); if(pts.size<2) pinch=null; if(!pts.size) cv.classList.remove('drag'); if(was&&moved<6&&e.type==='pointerup') this.onClick(e.offsetX,e.offsetY); };
    cv.addEventListener('pointerup',up); cv.addEventListener('pointercancel',up);
    cv.addEventListener('wheel',e=>{ e.preventDefault(); const [cx,cy]=this.toCell(e.offsetX,e.offsetY); const f=Math.exp(-e.deltaY*0.0015); this.vs=clamp(this.vs*f,this.minS,40); const [nx,ny]=this.toCell(e.offsetX,e.offsetY); this.vx+=cx-nx; this.vy+=cy-ny; this.clampView(); this.dirty=true; },{passive:false});
  }
  onClick(sx,sy){
    const hit=(this.hits||[]).find(h=>sx>=h.x0-3&&sx<=h.x1+3&&sy>=h.y0-3&&sy<=h.y1+3);
    if(hit){ selectArmy(hit.id); return; }
    const [cx0,cy0]=this.toCell(sx,sy); const x0=Math.floor(cx0), y0=Math.floor(cy0);
    if(selArmy!=null&&G){ const a=G.armies.find(z=>z.id===selArmy); if(a&&a.o===G.player&&y0>=0&&y0<H){ const id=cellId[y0*W+x0]; if(id&&id!==65535){ orderArmy(a,id-1); return; } } }
    const [cx,cy]=this.toCell(sx,sy); const x=Math.floor(cx), y=Math.floor(cy); if(y<0||y>=H) return selectProv(-1); const id=cellId[y*W+x]; selectProv(id&&id!==65535?id-1:-1); }
}
function mode_(mv){ return mv.inter?mode:'start'; }
let gPreview=null; const G0=()=>G||gPreview;

// ── 시작 화면 ──
let sEra=4, sTag=null, smap=null, pvSeed=(Math.random()*1e9)|0;
function buildStart(){
  $('#eras').innerHTML=D.ERAS.map((e,i)=>`<button class="era${i===sEra?' on':''}" data-i="${i}"><div class="y">${esc(e.sub)}</div><div class="n">${esc(e.n)}</div></button>`).join('');
  $('#eras').onclick=e=>{ const b=e.target.closest('.era'); if(!b) return; sEra=+b.dataset.i; sTag=null; buildStart(); };
  $('#eradesc').textContent=D.ERAS[sEra].d1;
  gPreview=ENG.newGame(sEra,null,pvSeed);
  const cs=gPreview.C.filter(c=>c.alive&&c.prov>0).sort((a,b)=>(b.kr-a.kr)||(b.pop-a.pop));
  if(!sTag) sTag=cs[0].tag;
  $('#clist').innerHTML=cs.map(c=>`<button class="ci${c.tag===sTag?' on':''}" data-t="${c.tag}"><i style="background:${c.col}"></i><span>${esc(c.name)}${c.kr?'<span class="kr">한국사</span>':''}</span><span class="p">${fpop(c.pop)}</span></button>`).join('');
  $('#clist').onclick=e=>{ const b=e.target.closest('.ci'); if(!b) return; sTag=b.dataset.t; buildStart(); };
  const c=gPreview.C.find(x=>x.tag===sTag);
  $('#cdesc').textContent=c.desc||`${D.GOVS[c.gov].n} · 영토 ${c.prov}개 지방 · 인구 ${fpop(c.pop)} · 기술 ${c.techs.size}개`;
  $('#scap').textContent=`${D.ERAS[sEra].sub}의 세계 — ${gPreview.C.filter(x=>x.alive&&x.prov>0).length}개 세력. 나머지 땅은 아직 국가가 없는 공터다.`;
  if(!smap) smap=new MapView($('#smap'),false);
  smap.focusTag=c.i; smap.build(gPreview); smap.focusCountry(c.i); smap.vs=Math.max(smap.minS,smap.vs*0.6); smap.clampView(); smap.draw(gPreview);
  const sel=$('#clist .ci.on'); if(sel) sel.scrollIntoView({block:'nearest'});
}
$('#rand').onclick=()=>{ const cs=gPreview.C.filter(c=>c.alive&&c.prov>0); sTag=cs[Math.floor(Math.random()*cs.length)].tag; buildStart(); };
$('#go').onclick=()=>startGame(ENG.newGame(sEra,sTag,pvSeed), true);
$('#loadbtn').onclick=()=>{ const s=loadSave(); if(s) startGame(s,false); else toast('저장된 게임이 없습니다.'); };

// ── 게임 시작 ──
let mv=null;
function startGame(g,intro){
  G=g; gPreview=null; $('#start').hidden=true; $('#app').hidden=false;
  if(!mv) mv=new MapView($('#map'),true);
  mv.resize(); mv.ver=-1; mv.focusCountry(G.player); sel=-1; mv.setHighlight(-1);
  buildChrome(); speed=0; renderAll(true);
  if(intro){ const P=G.C[G.player]; const era=D.ERAS[G.era];
    showModal({glyph:'史', when:fdate(G), title:P.name, who:`${D.GOVS[P.gov].n} · ${P.ruler?P.ruler.name:''}`, body:`${P.desc?esc(P.desc)+'<br><br>':''}${esc(era.d1)}<br><br><span class="muted" style="font-size:13px">지도를 끌어 이동하고, 휠이나 두 손가락으로 확대한다. 땅을 누르면 개척·전쟁·개발을 명령할 수 있다. 오른쪽 패널에서 기술과 제도를 고른다. 스페이스바로 멈추고, 1~7 키로 속도를 바꾼다.</span>`,
      opts:[{t:'역사를 시작한다',tip:'1배속으로 시작합니다',h:false,go:()=>setSpeed(1)}]});
  }
}

// ── 상단 ──
function buildChrome(){
  $('#speeds').innerHTML=`<button class="pause" data-s="0" aria-label="일시정지">❚❚</button>`+SPEEDS.map(s=>`<button data-s="${s}">${s}×</button>`).join('');
  $('#speeds').onclick=e=>{ const b=e.target.closest('button'); if(b) setSpeed(+b.dataset.s); };
  $('#modes').innerHTML=[['pol','정치'],['pop','인구 밀도'],['tech','기술 수준'],['dip','외교'],['res','자원·재해'],['log','도로·병참']].map(([k,n])=>`<button data-m="${k}" class="${k===mode?'on':''}">${n}</button>`).join('');
  $('#modes').onclick=e=>{ const b=e.target.closest('button'); if(!b) return; mode=b.dataset.m; $('#modes').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b)); mv.ver=-1; renderLegend(); };
  const TABS=[['state','국정'],['tech','기술'],['inst','제도'],['dip','외교·전쟁'],['fig','인물'],['chron','연대기']];
  $('#tabs').innerHTML=TABS.map(([k,n])=>`<button data-t="${k}" class="${k===tab?'on':''}">${n}</button>`).join('');
  $('#tabs').onclick=e=>{ const b=e.target.closest('button'); if(!b) return; tab=b.dataset.t; $('#tabs').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b)); renderPane(true); };
  $('#zin').onclick=()=>{ mv.vs=clamp(mv.vs*1.5,mv.minS,40); mv.clampView(); mv.dirty=true; };
  $('#zout').onclick=()=>{ mv.vs=clamp(mv.vs/1.5,mv.minS,40); mv.clampView(); mv.dirty=true; };
  $('#zhome').onclick=()=>mv.focusCountry(G.player);
  $('#ff').onclick=()=>{ ff=!ff; if(ff&&speed===0) setSpeed(lastSpeed); updateTop(); };
  $('#menubtn').onclick=toggleMenu;
  renderLegend();
}
function renderLegend(){
  const L=$('#legend');
  if(mode==='pol'){ L.hidden=true; return; }
  L.hidden=false;
  if(mode==='pop') L.innerHTML=`인구 밀도 (명/km²)<div class="ramp" style="background:linear-gradient(90deg,#1c282e,#f0cf86)"></div><div class="ends"><span>0.1</span><span>10</span><span>1000+</span></div>`;
  if(mode==='tech') L.innerHTML=`실제 역사의 같은 해 대비 기술 수<div class="ramp" style="background:linear-gradient(90deg,#4678aa,#787c7e,#e2b250)"></div><div class="ends"><span>−12</span><span>역사 수준</span><span>+12</span></div>`;
  if(mode==='res') L.innerHTML=`<div style="margin-bottom:4px">지하자원 <span class="muted">(색이 채워진 것 = 지금 기술로 쓸 수 있음)</span></div><div style="display:grid;grid-template-columns:repeat(3,auto);gap:3px 10px">${Object.values(D.RES).map(r=>`<span><b style="color:${r.col};font-family:var(--f-display)">${r.g}</b> ${r.n}</span>`).join('')}</div><div style="margin-top:6px"><span style="color:#e0664f">▲</span> 화산 · <span style="display:inline-block;width:10px;height:10px;background:#96503c;vertical-align:middle"></span> 지진 위험이 높은 곳</div>`;
  if(mode==='log') L.innerHTML=G&&G.wars.some(w=>w.a===G.player||w.b===G.player)?`우리 군의 병참 지원률 (주요 지방에서 도로를 따라 잰 거리)<div class="ramp" style="background:linear-gradient(90deg,#963c30,#78aa6e)"></div><div class="ends"><span>끊김</span><span>50%</span><span>100%</span></div>`:`도로 등급<div class="ramp" style="background:linear-gradient(90deg,#222c34,#f0cf86)"></div><div class="ends"><span>오솔길</span><span>역참</span><span>고속도로</span></div><div style="margin-top:4px">⚓ 항구 (숫자 = 등급)</div>`;
  if(mode==='dip') L.innerHTML=`<div style="display:grid;grid-template-columns:12px 1fr;gap:4px 8px;align-items:center"><i style="width:12px;height:12px;background:#d6a94f"></i>우리 나라<i style="width:12px;height:12px;background:#c4452f"></i>교전국<i style="width:12px;height:12px;background:#786896"></i>휴전 중<i style="width:12px;height:12px;background:#505c64"></i>기타 국가</div>`;
}
function setSpeed(s){ if(s>0) lastSpeed=s; speed=s; if(s===0) ff=false; updateTop(); }
function updateTop(){
  if(!G) return; const P=G.C[G.player];
  $('#pflag').style.background=P.col; $('#pname').textContent=P.name; $('#pgov').textContent=`${D.GOVS[P.gov].n}${P.ruler?' · '+P.ruler.name:''}`;
  const dt=fdate(G); if($('#date').textContent!==dt) $('#date').textContent=dt;
  $('#speeds').querySelectorAll('button').forEach(b=>b.classList.toggle('on',+b.dataset.s===speed));
  $('#ff').textContent=ff?'■ 멈추기':'▶▶ 다음 사건'; $('#ff').classList.toggle('on',ff);
  const net=(P.income-P.expense)/12;
  const st=P.stab;
  const cur=P.cur?D.TECHS[P.cur]:null; const cp=cur?clamp(P.prog/(P._cost||ENG.techCost(G,P,P.cur)),0,1):0;
  const PW_={'인구':88,'국고':132,'비축':132,'병력':76,'안정도':56,'부패':50,'연구':124,'기온':62,'개변도':58};
  setHTML($('#stats'),[
    ['인구',fpop(P.pop)],
    [['tribe','chief'].includes(P.gov)?'비축':'국고',`${fmoney(P.gold)} <small class="${net>=0?'pos':'neg'}">${net>=0?'+':''}${fmoney(net)}/월</small>`],
    ['병력',`${fmoney(P.soldiers)}명`],
    ['안정도',`<span class="${st>=0.5?'pos':st<-0.5?'neg':''}">${st>=0?'+':''}${st.toFixed(1)}</span>`],
    ['연구',cur?`${esc(cur.n)} <small>${pct(cp)}</small>`:'<small>선택 없음</small>'],
    ['부패',`<span class="${P.corr>40?'neg':P.corr<15?'pos':''}">${Math.round(P.corr||0)}%</span>`],
    ['기온',`${(G.temp||0)>=0?'+':''}${(G.temp||0).toFixed(1)}°C`],
    ['개변도',`${G.div.toFixed(0)}%`]
  ].map(([k,v])=>`<div class="pill" style="width:${PW_[k]||80}px"><span class="k">${k}</span><span class="v">${v}</span></div>`).join(''));
  // 티커
  const ns=G.news.slice(-7).reverse();
  setHTML($('#ticker'),ns.map(n=>`<span class="tk"><b>${esc(n.g)}</b><span class="y">${n.y}</span>${esc(n.t)}</span>`).join(''));
}

// ── 지방 카드 ──
function selectProv(p){ sel=p; if(p>=0) selArmy=null; mv.setHighlight(p); mv.dirty=true; renderCard(); }
function provNature(p,P){
  const kn=id=>P.techs.has(id); let h='';
  { const t=D.WTERR[MAP.WT[p]]; const lv=G.road?G.road[p]:0; const R=D.ROADS[lv]; const fort=ENG.fortLv(G,p);
    const sup=P._sup?P._sup[p]:null; const own=G.owner[p]===G.player; const nx=D.ROADS[lv+1]; const mx=ENG.roadMax(P);
    const busy=G.ops.find(op=>op.p===p&&op.type==='road');
    h+=`<div class="sub" style="margin:-2px 0 4px;letter-spacing:.04em">전장과 도로</div>
    <div class="res-row">지형 ${t.n} <span class="muted" style="margin-left:auto">공격 ×${t.atk} · 방어 ×${t.def} · 이동 ×${t.mv}</span></div>
    <div class="res-row">도로 ${R.n} <span class="muted" style="margin-left:auto">이동·병참 ×${R.spd}${fort?` · 요새 ${fort.toFixed(1)}단계`:''}</span></div>
    ${sup!=null&&(G.wars.some(w=>w.a===G.player||w.b===G.player))?`<div class="res-row">우리 병참 지원 <span class="num" style="margin-left:auto;color:${sup>0.6?'var(--good)':sup>0.3?'var(--warn)':'var(--bad)'}">${pct(sup)}</span></div>`:''}
    ${own?(busy?`<div class="sub">${D.ROADS[busy.lv].n} 공사 중 ${pct(busy.prog)}</div>`: nx&&lv<mx?`<button class="btn" id="aRoad" style="width:100%;margin:4px 0" ${P.gold>=ENG.roadCost(G,P,p,lv+1)?'':'disabled'}>${nx.n} 건설 <small>${fmoney(ENG.roadCost(G,P,p,lv+1))} · ${Math.round(nx.days*(1+PAREA[p]/80000))}일</small></button>`: nx?`<div class="sub">${nx.n}을(를) 놓으려면 「${D.TECHS[nx.req].n}」 기술이 필요하다.</div>`:''):''}
    ${MAP.PCOAST[p]?(()=>{ const pl=G.port?G.port[p]:0; const PR=D.PORTS[pl]; const nx2=D.PORTS[pl+1]; const pm=ENG.portMax(P); const pb=G.ops.find(op=>op.p===p&&op.type==='port');
      return `<div class="res-row">⚓ 항구 ${PR.n} <span class="muted" style="margin-left:auto">적합도 ${Math.round(MAP.PSUIT[p]*100)}%</span></div>`+
      (own?(pb?`<div class="sub">${D.PORTS[pb.lv].n} 공사 중 ${pct(pb.prog)}</div>`: nx2&&pl<pm?`<button class="btn" id="aPort" style="width:100%;margin:4px 0" ${P.gold>=ENG.portCost(G,P,p,pl+1)?'':'disabled'}>${nx2.n} 건설 <small>${fmoney(ENG.portCost(G,P,p,pl+1))} · ${nx2.days}일</small></button>`: nx2?`<div class="sub">${nx2.n}을(를) 지으려면 「${D.TECHS[nx2.req].n}」 기술이 필요하다.</div>`:''):''); })():''}
    <div style="height:6px"></div>`; }
  const rs=MAP.PRES[p];
  if(rs.length){ h+=`<div class="sub" style="margin:-2px 0 4px;letter-spacing:.04em">지하자원</div>`+rs.map((r,i)=>{ const R=D.RES[r]; const on=R.on(kn)>0;
    return `<div class="res-row"><span class="g${on?'':' off'}" style="background:${R.col};color:${on?'#0d1318':R.col}">${R.g}</span><span>${esc(R.n)} <span class="muted">· ${esc(MAP.PRESN[p][i])}</span></span><span class="muted" style="margin-left:auto;font-size:11.5px">${on?'활용 가능':'아직 가치 없음'}</span></div>`; }).join(''); }
  const z=MAP.PSEISZ[p]; const vs=D.VOLCANOES.map((v,i)=>[v,MAP.hav(PLON[p],PLAT[p],v[1],v[2])]).filter(x=>x[1]<350).sort((a,b)=>a[1]-b[1]);
  if(z>=0||vs.length){ h+=`<div class="sub" style="margin:8px 0 4px;letter-spacing:.04em">재해 위험</div>`;
    if(z>=0){ const Z=D.SEISMIC[z]; h+=`<div class="res-row">지진대: ${esc(Z[0])} <span class="muted" style="margin-left:auto">권역 전체에서 대지진 약 ${Math.max(1,Math.round(1/Z[2]))}년에 한 번</span></div>`; }
    if(vs.length){ const [v,d]=vs[0]; h+=`<div class="res-row"><span style="color:#e0664f">▲</span> ${esc(v[0])} ${Math.round(d)}km <span class="muted" style="margin-left:auto">최대 VEI ${v[3]}</span></div>`; } }
  return h?`<div style="margin:0 0 10px">${h}</div>`:'';
}
function armyShort(n){ return n>=1e4?(n/1e4).toFixed(n<1e5?1:0)+'만':n>=1000?(n/1000).toFixed(1)+'천':String(Math.round(n)); }
function selectArmy(id){ selArmy=id; sel=-1; if(mv){ mv.setHighlight(-1); mv.dirty=true; } renderCard(); }
function orderArmy(a,p){
  const o=G.owner[p];
  if(o>=0&&o!==G.player&&!ENG.atWarIdx(G,G.player,o)){ toast(`${G.C[o].name}과(와)는 전쟁 중이 아니다. 먼저 선전포고해야 지나갈 수 있다.`); return; }
  const r=ENG.act.moveArmy(G,a.id,p);
  if(r==='battle') toast('전투 중인 군단은 움직일 수 없다.');
  else if(r) { const days=Math.round(a.path.reduce((s_,st)=>s_+st.days,0)); toast(`${a.name} → ${PNAME[p]} (약 ${days}일${a.path.some(st=>st.sea)?', 바다 건너 상륙':''})`); }
  else toast('그곳으로 가는 길이 없다. 바다를 건너려면 항해 기술이 필요하다.');
  mv.dirty=true; renderCard();
}
function armyCard(){
  const el=$('#pcard'); const a=G.armies.find(x=>x.id===selArmy); if(!a){ selArmy=null; el.hidden=true; return; }
  const c=G.C[a.o], mine=a.o===G.player; const t=MAP.WT[a.p]; const T=D.WTERR[t];
  const bt=(G.battles||[]).find(b=>b.att.includes(a.id)||b.def.includes(a.id)); const sg=G.sieges[a.p];
  const dest=a.path.length?a.path[a.path.length-1].p:-1; const eta=Math.round(a.path.reduce((s_,st)=>s_+st.days,0)-a.prog);
  const status= bt?`<span style="color:var(--seal2)">전투 중 — ${bt.day}일째</span>` : a.ret>G.day?'퇴각 중' : dest>=0?`${esc(PNAME[dest])}(으)로 이동 중 · ${eta}일` : sg&&sg.o===a.o?`포위 중 ${pct(sg.prog)}` : '대기';
  const same=G.armies.filter(x=>x!==a&&x.o===a.o&&x.p===a.p).length;
  el.hidden=false;
  if(!setHTML(el,`<button class="x" id="pcx" aria-label="닫기">×</button><h3>${esc(a.name)} <span class="muted" style="font-size:13px;font-family:var(--f-body)">${esc(c.name)}</span></h3>
   <div class="own">${a.gen.fig?'★ ':''}장수 ${esc(a.gen.n)} <span class="num" style="color:var(--gold2)">${'●'.repeat(a.gen.sk)}${'○'.repeat(6-a.gen.sk)}</span></div>
   <dl><dt>병력</dt><dd>${Math.round(a.n).toLocaleString()}명</dd><dt>사기</dt><dd>${pct(a.mor)}</dd><dt>병참 지원</dt><dd style="color:${a.sup>0.6?'var(--good)':a.sup>0.3?'var(--warn)':'var(--bad)'}">${pct(a.sup)}</dd>
   <dt>위치</dt><dd style="font-family:var(--f-body)">${esc(PNAME[a.p])}</dd><dt>지형</dt><dd style="font-family:var(--f-body)">${T.n} · 공격 ×${T.atk} · 방어 ×${T.def}</dd><dt>상태</dt><dd style="font-family:var(--f-body)">${status}</dd>
   ${a.land>G.day?`<dt>상륙</dt><dd style="color:var(--bad);font-family:var(--f-body)">상륙 직후 — 공격력 ×0.35</dd>`:''}</dl>
   ${mine?`<div class="sub" style="margin-bottom:8px">지도에서 땅을 누르면 그곳으로 진군한다. 적지에 머물면 포위하고, 적 군단과 같은 곳에 서면 전투가 벌어진다.</div>
   <div class="acts"><button class="btn" id="aAuto">${a.auto?'자동 지휘 켜짐 — 끄기':'자동 지휘 꺼짐 — 켜기'} <small>태세에 따라 AI가 지휘</small></button>
   <div class="row"><button class="btn" id="aStop" style="flex:1;justify-content:center">정지</button><button class="btn" id="aSplit" style="flex:1;justify-content:center" ${a.n<200||bt?'disabled':''}>나누기</button><button class="btn" id="aMerge" style="flex:1;justify-content:center" ${same&&!bt?'':'disabled'}>합치기</button></div>
   <button class="btn" id="aHome">수도로 귀환</button></div>`:''}`)) return;
  $('#pcx').onclick=()=>{ selArmy=null; renderCard(); mv.dirty=true; };
  const on=(id,fn)=>{ const b=document.getElementById(id); if(b) b.onclick=()=>{ fn(); armyCard(); mv.dirty=true; }; };
  on('aAuto',()=>ENG.act.toggleAuto(G,a.id)); on('aStop',()=>ENG.act.stopArmy(G,a.id));
  on('aSplit',()=>{ const b=ENG.act.splitArmy(G,a.id); if(b) toast(`${b.name} 창설`); });
  on('aMerge',()=>{ const n=ENG.act.mergeArmies(G,a.id); toast(`${n}개 군단을 합쳤다`); });
  on('aHome',()=>{ const P=G.C[G.player]; if(P.cap>=0) orderArmy(a,P.cap); });
}
function renderCard(){
  if(G&&selArmy!=null){ armyCard(); return; }
  const el=$('#pcard'); if(sel<0||!G){ el.hidden=true; return; }
  const p=sel, o=G.owner[p], P=G.C[G.player], c=o>=0?G.C[o]:null;
  const K=ENG.Kprov(G,p);
  let acts='';
  if(o<0){
    const can=ENG.canColonize(G,P,p), cost=ENG.colonizeCost(G,P,p), days=ENG.colonizeDays(G,P,p);
    const busy=G.ops.find(op=>op.p===p);
    acts+= busy? `<div class="sub">개척 진행 중 — ${pct(busy.prog)}</div>`:
      `<button class="btn" id="aCol" ${can&&P.gold>=cost?'':'disabled'}>공터 개척 <small>${fmoney(cost)} · ${days}일</small></button>${can?'':'<div class="sub">우리 땅과 맞닿아 있거나 항해 기술로 닿을 수 있어야 한다.</div>'}`;
  } else if(o===G.player){
    acts+=`<button class="btn" id="aDev" ${P.gold>=P.income*0.1?'':'disabled'}>개발 투자 (인구 +4%) <small>${fmoney(P.income*0.1)}</small></button>`;
  } else {
    const w=ENG.findWar(G,G.player,o);
    if(w){ acts+=`<div class="sub">교전 중인 적지다. 우리 군단을 선택한 뒤 이곳을 누르면 진군한다.</div>`; }
    else { const tr=P.truce[o]>G.day; const ratio=c.str/Math.max(1,P.str);
      acts+=`<button class="btn war" id="aWar" ${tr||P.exile?'disabled':''}>${esc(c.name)}에 선전포고 <small>${tr?'휴전 중':'적 전력 ×'+ratio.toFixed(1)}</small></button>`; }
  }
  el.hidden=false;
  if(!setHTML(el,`<button class="x" id="pcx" aria-label="닫기">×</button><h3>${esc(PNAME[p])}</h3>
   <div class="own">${c?`<i style="background:${c.col}"></i>${esc(c.name)}`:'<i style="background:#4a4f45"></i>주인 없는 땅 (원주민 거주)'}</div>
   <dl><dt>인구</dt><dd>${fpop(G.pop[p])}</dd><dt>부양 한계</dt><dd>${fpop(K)}</dd><dt>면적</dt><dd>${Math.round(PAREA[p]).toLocaleString()} km²</dd><dt>지형</dt><dd style="font-family:var(--f-body)">${D.TERRAIN[PTER[p]].n}${MAP.PCOAST[p]?' · 해안':''}</dd><dt>좌표</dt><dd>${PLAT[p].toFixed(1)}°, ${PLON[p].toFixed(1)}°</dd></dl>
   ${provNature(p,P)}
   <div class="acts">${acts}</div>`)) return;
  $('#pcx').onclick=()=>selectProv(-1);
  const on=(id,fn)=>{ const b=document.getElementById(id); if(b) b.onclick=fn; };
  on('aCol',()=>{ if(ENG.act.colonize(G,p)) toast(`${PNAME[p]} 개척을 시작했다.`); renderCard(); updateTop(); });
  on('aPort',()=>{ if(ENG.act.buildPort(G,p)) toast('항구 공사를 시작했다.'); renderCard(); updateTop(); });
  on('aRoad',()=>{ if(ENG.act.buildRoad(G,p)) toast('도로 공사를 시작했다.'); renderCard(); updateTop(); });
  on('aDev',()=>{ if(ENG.act.develop(G,p)) toast('개발에 투자했다. 인구 +4%'); renderCard(); updateTop(); });
  on('aTgt',()=>{ if(ENG.act.target(G,p)) toast(`공격 목표: ${PNAME[p]}`); });
  on('aWar',()=>confirmWar(o));
}
function confirmWar(o){
  const c=G.C[o], P=G.C[G.player];
  showModal({glyph:'戰',when:fdate(G),title:`${c.name}에 선전포고`,who:`적 병력 ${fmoney(c.soldiers)}명 · 우리 ${fmoney(P.soldiers)}명`,
    body:`전쟁은 안정도를 깎고 역사를 바꾼다(개변도 +2). 군단을 적지로 보내 포위하면 그 땅이 우리 것이 된다. 상대 전력은 우리의 ${(c.str/Math.max(1,P.str)).toFixed(1)}배다. 바다를 건너 상륙하면 첫 전투에서 공격력이 크게 떨어진다.`,
    opts:[{t:'선전포고한다',tip:'안정도 −0.5, 개변도 +2',go:()=>{ ENG.act.declareWar(G,o); renderCard(); renderPane(true);} },{t:'그만둔다',tip:'',go:()=>{}}]});
}

// ── 패널 ──
let paneT=0;
function renderPane(force){
  if(!G) return;
  const pane=$('#pane');
  if(!force){ const a=document.activeElement; if(a&&pane.contains(a)&&(a.tagName==='INPUT'||a.tagName==='SELECT')) return; }
  const st=pane.scrollTop; const tw=pane.querySelector('.treewrap'); const tws=tw?[tw.scrollLeft,tw.scrollTop]:null;
  const P=G.C[G.player];
  let h='';
  if(tab==='state') h=paneState(P);
  else if(tab==='tech') h=paneTech(P);
  else if(tab==='inst') h=paneInst(P);
  else if(tab==='dip') h=paneDip(P);
  else if(tab==='fig') h=paneFig(P);
  else if(tab==='chron') h=paneChron();
  const parts=h.split('<!--§-->'); let secs=[...pane.children].filter(x=>x.classList.contains('sec'));
  if(pane._tab!==tab){ pane.innerHTML=''; secs=[]; pane._tab=tab; pane._chartLen=-1; }
  let created=false;
  parts.forEach((ph,i)=>{ let el=secs[i]; if(!el){ el=document.createElement('div'); el.className='sec'; pane.appendChild(el); created=true; } if(setHTML(el,ph)&&ph.includes('class="chart"')) created=true; });
  for(let i=parts.length;i<secs.length;i++) secs[i].remove();
  pane.scrollTop=st; pane._chartsDirty=created;
  const tw2=pane.querySelector('.treewrap'); if(tw2&&tws){ tw2.scrollLeft=tws[0]; tw2.scrollTop=tws[1]; } else if(tw2&&force){ const cur=tw2.querySelector('.tn.cur')||tw2.querySelector('.tn.avail'); if(cur) tw2.scrollLeft=Math.max(0,cur.offsetLeft-60); }
  bindPane(P);
}
function realRef(P){
  if(!P.kr) return null;
  if(P.tag==='ROK') return {n:'실제 대한민국',t:D.STATS.rokPop};
  if(P.tag==='DPRK') return null;
  return {n:'실제 한반도 인구 (추정)',t:D.STATS.koreaPop};
}
function paneNature(P){
  const kn=id=>P.techs.has(id); const rc=P.resCnt||{}; const keys=Object.keys(rc);
  const rows=keys.sort((a,b)=>(P.resVal[b]||0)-(P.resVal[a]||0)).map(r=>{ const R=D.RES[r]; const v=P.resVal[r]||0; const on=v>0;
    return `<div class="res-row"><span class="g${on?'':' off'}" style="background:${R.col};color:${on?'#0d1318':R.col}">${R.g}</span><span>${esc(R.n)} ×${rc[r]}</span><span class="${on?'num':'muted'}" style="margin-left:auto;font-size:12px">${on?'연 '+fmoney(v):'아직 쓸 수 없음'}</span></div>`; }).join('');
  const T=G.temp||0, TR=ENG.realTemp(G.y), cools=(G.cools||[]).filter(c=>c.until>G.day);
  const dis=(G.disasters||[]).slice().reverse().filter(d=>d.deaths>3000||G.owner[d.p]===G.player).slice(0,5);
  return `<h4>지하자원 <span class="s">자원 수입은 GDP의 ${P.gdp>0?((P.resIncome||0)/P.gdp*100).toFixed(1):0}%</span></h4>
  ${rows||'<p class="sub">영토 안에 알려진 큰 매장지가 없다. 이웃에게 있으면 교역으로 부족은 면한다.</p>'}
  ${P.short&&P.short.length?`<p class="factline" style="border-color:var(--seal)">자원 부족: ${P.short.map(esc).join(', ')}. 우리 땅과 이웃 어디에도 없어 군사력과 생산이 떨어진다. 해당 자원이 있는 땅을 개척하거나 차지하라.</p>`:''}
  <p class="sub">자원을 가진 나라는 관련 기술(청동기·철기·증기기관·내연기관·반도체 등)을 20% 싸게 연구한다.</p>
  <h4>기후 <span class="s">1850–1900년 평균 대비 세계 기온</span></h4>
  <table class="cmp"><tr><th></th><th>당신의 세계</th><th>실제 역사</th></tr><tr><td>기온 편차</td><td>${T>=0?'+':''}${T.toFixed(2)}°C</td><td class="r">${TR>=0?'+':''}${TR.toFixed(2)}°C</td></tr></table>
  ${cools.length?`<p class="sub">화산 냉각 중: ${cools.map(c=>`${esc(c.label)} ${c.dT}°C`).join(', ')}</p>`:''}
  <p class="sub">추우면 고위도의 부양력이, +1°C를 넘게 더우면 열대의 부양력이 줄어든다. 1850년 이후 기온은 세계 경제의 화석연료 의존도를 따라 실제 역사보다 빨라지거나 느려진다.</p>
<!--§--><div class="chart" id="ch3"></div><!--§-->
  ${dis.length?`<h4>최근 재해</h4>`+dis.map(d=>`<div class="res-row"><span style="color:${d.t==='화산'?'#e0664f':'#c3bcac'};font-family:var(--f-display);font-weight:700">${d.t==='화산'?'火':'震'}</span><span>${fy(d.y)} ${esc(d.name)} <span class="muted">${d.t==='화산'?'VEI '+d.M:'규모 '+d.M.toFixed(1)}</span></span><span class="num muted" style="margin-left:auto;font-size:12px">${fpop(d.deaths)}</span></div>`).join(''):''}`;
}
function paneState(P){
  const R=P.ruler, age=R?G.y-R.born:0;
  const yrsIn=Math.max(0,G.y-G.startY);
  const real=realRef(P);
  const wLE=ENG.interp(D.STATS.worldLE,G.y), wLit=ENG.interp(D.STATS.worldLit,G.y), wGdp=ENG.interp(D.STATS.worldGdp,G.y);
  const krLE = (P.kr&&G.y>=1945)?ENG.interp(D.STATS.koreaLE,G.y):null;
  const krTfr = (P.kr&&G.y>=1960&&G.y<=2024)?ENG.interp(D.STATS.koreaTFR,G.y):null;
  const myU5=clamp(0.5-(P.leS-24)*0.0085,0.003,0.5);
  const u5=ENG.interp(D.STATS.u5mort,G.y);
  const wp=ENG.worldPop(G), wr=ENG.interpLog(D.STATS.worldPop,G.y);
  return `
  <div class="ruler"><div class="seal">${esc((R&&R.name||'王')[0])}</div><div style="min-width:0"><div class="nm">${esc(R?R.name:'—')}</div>
    <div class="st"><span>${age}세</span><span>행정 <b>${R?R.adm:'-'}</b></span><span>외교 <b>${R?R.dip:'-'}</b></span><span>군사 <b>${R?R.mil:'-'}</b></span></div>
    <div class="sub">${R&&R.hist?'역사 속 실제 인물':'역사에 없던 인물'} · ${esc(D.GOVS[P.gov].n)}</div></div></div>
  ${P.exile?`<p class="factline">영토를 모두 잃었다. 망명 정부로 버티며 독립의 기회를 기다린다. 역사대로라면 광복이 온다.</p>`:''}
  <h4>나라의 숫자 <span class="s">괄호는 같은 해 실제 세계 평균</span></h4>
  <table class="cmp"><tr><th></th><th>우리 나라</th><th>실제 세계</th></tr>
   <tr><td>인구</td><td>${fpop(P.pop)}</td><td class="r">${real?fpop(ENG.interpLog(real.t,G.y)):'—'}</td></tr>
   <tr><td>1인당 GDP</td><td>$${Math.round(P.gdppc).toLocaleString()}</td><td class="r">$${Math.round(wGdp).toLocaleString()}</td></tr>
   <tr><td>기대수명</td><td>${P.leS.toFixed(1)}세</td><td class="r">${(krLE||wLE).toFixed(1)}세${krLE?' (한국)':''}</td></tr>
   <tr><td>문해율</td><td>${pct(P.lit)}</td><td class="r">${pct(wLit)}</td></tr>
   <tr><td>합계출산율</td><td>${P.tfrS.toFixed(2)}</td><td class="r">${krTfr?krTfr.toFixed(2)+' (한국)':'—'}</td></tr>
   <tr><td>영토</td><td>${P.prov}개 지방</td><td class="r">${Math.round(P.area/1000).toLocaleString()}천 km²</td></tr>
   <tr><td>연 수입 / 지출</td><td>${fmoney(P.income)}</td><td class="r">${fmoney(P.expense)}</td></tr>
  </table>
  <p class="factline">이 나라에서 태어난 아이 100명 중 <b>${Math.round(myU5*100)}명</b>은 다섯 살을 넘기지 못한다. 같은 해 실제 세계 평균은 ${Math.round(u5*100)}명이다.</p>
  ${real?`<p class="sub" style="margin:0 0 4px">「인구」 행의 오른쪽 칸은 ${real.n} 값이다.</p>`:''}
  <h4>부패 <span class="s">세수·생산·연구를 갉아먹는다</span></h4>
  <div class="cur"><div class="row" style="justify-content:space-between"><b class="serif" style="font-size:18px;color:${P.corr>40?'var(--bad)':P.corr>20?'var(--warn)':'var(--good)'}">${Math.round(P.corr||0)}%</b><span class="sub">이대로면 ${Math.round(P.corrT||0)}%로 수렴</span></div>
   <div class="bar"><i style="width:${Math.min(100,P.corr||0)}%;background:${P.corr>40?'var(--seal)':'var(--warn)'}"></i></div>
   <div class="sub" style="margin-top:6px">세수 −${Math.round((P.corr||0)*0.6)}% · 생산 −${Math.round((P.corr||0)*0.25)}% · 연구 −${Math.round((P.corr||0)*0.25)}%</div>
   <div class="sub">정체 기본 ${D.GOV_CORR[P.gov]||15}% + 영토 ${P.prov}곳 + 제도의 질 + 불안정 − 제도·기술·인물</div>
   <button class="btn" id="anticorr" style="width:100%;margin-top:8px" ${P.gold>=ENG.corrCost(P)?'':'disabled'}>부패 척결 (−8%p, 안정도 −0.2) <small>${fmoney(ENG.corrCost(P))}</small></button>
   <div class="sub" style="margin-top:4px">영토가 넓을수록 척결 비용이 커진다 (지방 ${P.prov}곳 → 비용 ×${(1+P.prov/12).toFixed(1)}).</div></div>
  <h4>항구 교역 <span class="s">GDP의 ${P.gdp>0?((P.portIncome||0)/P.gdp*100).toFixed(1):0}%</span></h4>
  <p class="sub" style="margin-top:0">항구 ${P.portN||0}곳 · 연 교역 수입 ${fmoney(P.portIncome||0)}. 항구 등급 × 적합도(해안선 길이, 바다 이웃, 결빙, 옛 항구 도시)만큼 수입이 생긴다. 항구가 있는 해안은 바다 건너 병참도 쉽다.</p>
  ${paneNature(P)}
  <h4>군대 <span class="s">인구 대비 상비 병력 비율</span></h4>
  <div class="slider"><div class="row"><span>동원율</span><b class="num" id="mobv">${(P.mob*100).toFixed(1)}%</b></div>
   <input type="range" id="mob" min="0.2" max="8" step="0.1" value="${(P.mob*100).toFixed(1)}" aria-label="동원율">
   <div class="row sub"><span>목표 병력 ${fmoney(P.pop*P.mob*Math.max(0.2,1+P.m.manp))}명</span><span>유지비 연 ${fmoney(P.soldiers*P.gdppc*2)}</span></div></div>
  <h4>인구 <span class="s">${real?`우리 나라 vs ${real.n}`:'우리 나라'}</span></h4>
<!--§--><div class="chart" id="ch1"></div><!--§-->
  <h4>세계 인구 <span class="s">당신의 세계 vs 실제 역사 (지금 ${fpop(wp)} / 실제 ${fpop(wr)})</span></h4>
<!--§--><div class="chart" id="ch2"></div><!--§-->
  <h4>역사 개변도 ${G.div.toFixed(0)}%</h4>
  <div class="bar"><i style="width:${G.div}%;background:var(--seal)"></i></div>
  <p class="sub">역사와 다른 선택, 전쟁, 정복이 쌓이면 올라간다. 55%를 넘으면 주요 역사적 사건이 일어나지 않을 수 있고, 30%를 넘으면 역사 인물이 태어나지 않을 수 있다. 역사대로 고른 선택 ${G.stats.choicesH}번, 역사와 다른 선택 ${G.stats.choicesA}번.</p>`;
}
function paneTech(P){
  const cur=P.cur?D.TECHS[P.cur]:null; const cost=cur?(P._cost||ENG.techCost(G,P,P.cur)):1; const rr=P._rr||0;
  const left=cur?Math.max(0,(cost-P.prog)/Math.max(0.01,rr)):0;
  const known=P.techs; const av=new Set(ENG.availableTechs(P));
  // 배치
  const CW=150, RH=40, top=30, left0=46;
  const catKeys=Object.keys(D.CATS); let y=top; const catY={}, pos={};
  for(const k of catKeys){ let rows=1; for(let e=0;e<7;e++){ const n=D.TECH_LIST.filter(t=>t.cat===k&&t.era===e).length; rows=Math.max(rows,n); } catY[k]=[y,rows]; y+=rows*RH+14; }
  for(const k of catKeys) for(let e=0;e<7;e++){ D.TECH_LIST.filter(t=>t.cat===k&&t.era===e).sort((a,b)=>a.h-b.h).forEach((t,i)=>{ pos[t.id]=[left0+e*CW, catY[k][0]+i*RH]; }); }
  const TW=left0+7*CW, TH=y;
  let lines='';
  for(const t of D.TECH_LIST) for(const r of t.req){ const [x1,y1]=pos[r],[x2,y2]=pos[t.id]; const a=known.has(r); const sx=x1+128, sy=y1+17, ex=x2, ey=y2+17; const mx=(sx+ex)/2; lines+=`<path d="M${sx} ${sy} C${mx} ${sy},${mx} ${ey},${ex} ${ey}" stroke="${a?'#6d5a2c':'#2b3740'}" stroke-width="1.2" fill="none"/>`; }
  let nodes='';
  for(const t of D.TECH_LIST){ const [x,yy]=pos[t.id]; const k=known.has(t.id)?'known':av.has(t.id)?'avail':'locked'; const isCur=P.cur===t.id;
    const p=isCur?Math.round(clamp(P.prog/cost,0,1)*100):0;
    nodes+=`<button class="tn ${k}${isCur?' cur':''}" style="left:${x}px;top:${yy}px;${isCur?`--p:${p}%`:''}" data-t="${t.id}" title="${esc(t.n)} — ${esc(t.d)} (${fy(t.h)}) ${esc(fxStr(t.fx))}"><span>${esc(t.n)}</span><small>${t.h<-9000?'선사':fy(t.h)}</small></button>`; }
  const eraH=D.ERA_NAMES.map((n,e)=>`<div class="eh" style="left:${left0+e*CW}px">${n}</div>`).join('');
  const catH=catKeys.map(k=>`<div class="ch" style="top:${catY[k][0]+4}px" title="${D.CATS[k].n}">${D.CATS[k].g}</div>`).join('');
  return `
  <div class="cur">${cur?`<div class="row" style="justify-content:space-between"><b class="serif">${esc(cur.n)}</b><span class="num sub">${pct(clamp(P.prog/cost,0,1))}</span></div>
    <div class="sub">${esc(cur.d)} · 실제 등장 ${fy(cur.h)}</div><div class="sub">${esc(fxStr(cur.fx))||'직접 효과 없음 (다음 기술로 가는 길)'}</div>
    <div class="bar"><i style="width:${clamp(P.prog/cost,0,1)*100}%"></i></div>
    <div class="sub" style="margin-top:4px">하루 연구 ${rr.toFixed(1)} · 남은 기간 약 ${left>730?(left/365).toFixed(1)+'년':Math.round(left)+'일'}</div>`:'<span class="sub">연구할 기술을 고르라. 고르지 않으면 「연구 방향」에 따라 자동으로 고른다.</span>'}</div>
  <h4>연구 방향 <span class="s">자동 선택 시 이 분야를 우선한다</span></h4>
  <div class="focus" id="focus"><button class="chip ${!P.focus?'on':''}" data-c="">균형</button>${Object.entries(D.CATS).map(([k,c])=>`<button class="chip ${P.focus===k?'on':''}" data-c="${k}">${c.g} ${c.n}</button>`).join('')}</div>
  <h4>기술 계보 <span class="s">보유 ${known.size} / ${D.TECH_LIST.length} · 금테 = 지금 연구할 수 있음 · 같은 해 역사 평균 ${ENG.expectedTech(G.y)}개</span></h4>
  <div class="treewrap"><div class="tree" style="width:${TW}px;height:${TH}px"><svg width="${TW}" height="${TH}">${lines}</svg>${eraH}${catH}${nodes}</div></div>
  <p class="sub">기술 비용은 실제 역사보다 앞선 기술일수록 크게 오르고, 이미 널리 퍼진 기술일수록 싸진다. 이웃이 아는 기술은 25% 싸다.</p>`;
}
function paneInst(P){
  const govs=ENG.availableGovs(G,P);
  const pols=ENG.availablePolicies(G,P);
  const cats=['경제','토지·조세','군사','사회'];
  const slots=D.GOVS[P.gov].slots;
  const all=Object.keys(D.POLICIES);
  const locked=all.length-pols.length;
  return `
  <h4>정체 <span class="s">바꾸면 안정도 −1.5, 반년치 수입이 든다</span></h4>
  <div class="cur"><div class="serif" style="font-weight:700;font-size:16px">${esc(D.GOVS[P.gov].n)}</div><div class="sub">${esc(D.GOVS[P.gov].d)}</div><div class="sub">${esc(fxStr(D.GOVS[P.gov].fx))} · 제도 슬롯 ${slots}</div>
   <div class="row" style="margin-top:8px"><select id="govsel" aria-label="정체 선택">${govs.map(g=>`<option value="${g}" ${g===P.gov?'selected':''}>${esc(D.GOVS[g].n)}</option>`).join('')}</select><button class="btn" id="govgo" style="flex:none">바꾸기 <small>${fmoney(P.income*0.5)}</small></button></div></div>
  <h4>제도와 경제 정책 <span class="slots">${Array.from({length:slots},(_,i)=>`<i class="${i<P.policies.length?'f':''}"></i>`).join('')}</span> <span class="s">${P.policies.length}/${slots} · 시행 비용 수입의 15%</span></h4>
  ${cats.map(cat=>{ const list=pols.filter(id=>D.POLICIES[id].cat===cat).sort((a,b)=>(P.policies.includes(b)-P.policies.includes(a))||((D.POLICIES[b].tags?1:0)-(D.POLICIES[a].tags?1:0)));
    if(!list.length) return ''; return `<div class="sub" style="margin:12px 0 6px;letter-spacing:.06em">${cat}</div>`+list.map(id=>{ const p=D.POLICIES[id]; const on=P.policies.includes(id);
      return `<div class="pol ${on?'on':''}"><div class="t">${esc(p.n)}${p.tags||p.flag?'<span class="kr">고유</span>':''}</div><div class="d">${esc(p.d)}</div><div class="fx">${esc(fxStr(p.fx))}</div><button data-p="${id}">${on?'폐지':'시행'}</button></div>`; }).join(''); }).join('')}
  <p class="sub">아직 조건이 맞지 않는 제도 ${locked}개가 있다. 기술을 익히거나 특정 국가·시대가 되면 열린다.</p>`;
}
function paneDip(P){
  const wars=G.wars.filter(w=>w.a===G.player||w.b===G.player);
  const ns=ENG.neighbors(G,P).map(i=>G.C[i]).filter(c=>c.alive).sort((a,b)=>b.str-a.str);
  const big=G.C.filter(c=>c.alive&&c.prov>0).sort((a,b)=>b.pop-a.pop).slice(0,8);
  const my=ENG.armiesOf(G,G.player);
  const logs=(G.battleLog||[]).filter(b=>b.ao===G.player||b.do===G.player).slice(-6).reverse();
  return `
  <h4>전쟁 <span class="s">${wars.length?`${wars.length}곳에서 교전 중`:'평화'}</span></h4>
  ${wars.map(w=>{ const mine=w.a===G.player; const e=G.C[mine?w.b:w.a]; const sc=mine?w.score:-w.score; const yrs=((G.day-w.since)/365).toFixed(1);
    const st=mine?w.sa:w.sb; const share=P.str/(P.str+e.str);
    const ea=ENG.armiesOf(G,e.i).reduce((s_,a)=>s_+a.n,0);
    return `<div class="war"><div class="h"><b>vs ${esc(e.name)}</b><span class="num sub">${yrs}년째 · 전과 ${sc>=0?'+':''}${sc}</span></div>
     <div class="meter"><i style="width:${share*100}%;background:var(--gold)"></i><i style="width:${(1-share)*100}%;background:var(--seal)"></i></div>
     <div class="row sub" style="justify-content:space-between"><span>우리 ${fmoney(P.soldiers)}명</span><span>적 ${fmoney(ea)}명</span></div>
     <div class="row" style="margin-top:8px;gap:6px"><button class="btn ${st==='off'?'gold':''}" style="flex:1;justify-content:center" data-st="off" data-e="${e.i}">공격 태세</button><button class="btn ${st==='def'?'gold':''}" style="flex:1;justify-content:center" data-st="def" data-e="${e.i}">방어 태세</button></div>
     <div class="sub" style="margin-top:4px">${st==='off'?'공격 시 전투력 ×1.1. 자동 지휘 군단은 적 군단과 적지를 찾아 진격한다.':'우리 땅에서 싸울 때 전투력 ×1.2. 자동 지휘 군단은 국경을 지키고 빼앗긴 땅을 되찾는다.'}</div>
     <button class="btn" style="margin-top:8px;width:100%" data-peace="${e.i}">강화를 제안한다 <small>점령지는 그대로 유지</small></button></div>`; }).join('')||'<p class="sub">지도에서 다른 나라의 땅을 눌러 선전포고할 수 있다.</p>'}
  <h4>군단 <span class="s">눌러서 선택 · 지도에서 땅을 누르면 진군</span></h4>
  ${my.map(a=>{ const bt=(G.battles||[]).some(b=>b.att.includes(a.id)||b.def.includes(a.id)); const sg=G.sieges[a.p]&&G.sieges[a.p].o===a.o;
    return `<div class="nb" style="grid-template-columns:12px 1fr auto auto;cursor:pointer" data-army="${a.id}"><i style="background:${a.mor>0.6?'#79b48a':a.mor>0.3?'#d9a441':'#d5604e'}"></i><span>${esc(a.name)} <span class="muted">· ${esc(a.gen.n)}${a.gen.fig?' ★':''} · ${esc(PNAME[a.p])}</span></span><span class="r">${armyShort(a.n)} · 병참 ${pct(a.sup)}</span><span class="r" style="color:${bt?'var(--seal2)':'var(--muted)'}">${bt?'전투':sg?'포위':a.path.length?'이동':a.auto?'자동':'대기'}</span></div>`; }).join('')||'<p class="sub">군단이 없다. 동원율을 높이면 수도에서 병력이 모인다.</p>'}
  <label class="row sub" style="margin-top:8px;gap:8px"><input type="checkbox" id="autobt" ${G.autoBattle?'checked':''}> 전투 전술을 장수에게 맡긴다 (전투 이벤트 창을 띄우지 않음)</label>
  ${logs.length?`<h4>최근 전투</h4>`+logs.map(b=>{ const won=b.win===G.player; const me=b.ao===G.player; const e=G.C[me?b.do:b.ao];
    return `<div class="res-row"><span style="color:${won?'var(--gold2)':'var(--seal2)'};font-family:var(--f-display);font-weight:700">${won?'勝':'敗'}</span><span>${fy(b.y)} ${esc(PNAME[b.p])} <span class="muted">vs ${esc(e.name)} · ${b.days}일</span></span><span class="num muted" style="margin-left:auto;font-size:11.5px">아군 −${armyShort(me?b.lossA:b.lossD)} / 적 −${armyShort(me?b.lossD:b.lossA)}</span></div>`; }).join(''):''}
  <h4>이웃 나라 <span class="s">전력은 우리 대비 배수</span></h4>
  ${ns.map(c=>{ const tr=P.truce[c.i]>G.day, at=!!ENG.findWar(G,G.player,c.i); return `<div class="nb"><i style="background:${c.col}"></i><span>${esc(c.name)}</span><span class="r">×${(c.str/Math.max(1,P.str)).toFixed(1)}</span><button data-war="${c.i}" ${tr||at||P.exile?'disabled':''}>${at?'교전 중':tr?'휴전':'선전포고'}</button></div>`; }).join('')||'<p class="sub">국경을 맞댄 나라가 없다.</p>'}
  <h4>세계의 강대국</h4>
  ${big.map(c=>`<div class="nb"><i style="background:${c.col}"></i><span>${esc(c.name)}${c.i===G.player?' (우리)':''}</span><span class="r">${fpop(c.pop)}</span><span class="r">${c.prov}곳</span></div>`).join('')}`;
}
function paneFig(P){
  const tagsNow=new Set([P.tag]);
  const rows=D.FIGS.map(f=>{ const s=G.figs[f.id]; const mine=f.tags.includes(P.tag); return {f,s,mine}; })
    .filter(r=>r.mine || (r.s&&r.s.st==='alive'));
  rows.sort((a,b)=>(b.mine-a.mine)||(a.f.b-b.f.b));
  const stOf=(r)=>{ const s=r.s, f=r.f; if(!s) return G.y<f.b?['아직 태어나지 않음',`${fy(f.b)} 출생 예정`,'']:['역사에서 사라짐','',''];
    if(s.st==='unborn') return ['태어나지 않음','역사가 달라졌다','dead'];
    if(s.st==='dead') return ['사망','','dead'];
    const act=G.y>=f.a[0]&&G.y<=f.a[1]; return [act?'활동 중':G.y<f.a[0]?'성장 중':'은퇴',`${G.y-f.b}세`,act?'act':'']; };
  return `<p class="sub" style="margin-top:0">역사 인물은 정해진 해에 태어나 활동기에 나라에 보너스를 준다. 그들의 업적은 사건으로 찾아온다. 역사가 크게 바뀌면 태어나지 않을 수도 있다.</p>
  ${rows.map(r=>{ const [s1,s2,cls]=stOf(r); return `<div class="fig ${cls==='dead'?'dim':''}"><div class="seal">${esc(r.f.g)}</div><div class="n">${esc(r.f.n)} <small>${esc(r.f.role)} · ${fy(r.f.b)}–${fy(r.f.d)}</small> <span class="badge ${cls}">${s1}</span>${r.mine?'':` <span class="badge">${esc((G.C[G.tag[r.s&&r.s.svc]]||{}).name||'세계')}</span>`}</div>
    <div class="x">${esc(r.f.x)}<br><span class="sub">${s2?s2+' · ':''}활동기 ${fy(r.f.a[0])}–${fy(r.f.a[1])} · ${esc(fxStr(r.f.fx))||'—'}</span>${r.mine&&cls==='act'?`<div class="row" style="gap:4px;margin-top:6px">${['adm','mil','sci'].map(k=>{ const cur=(r.s.role||ENG.defRole(r.f))===k; return `<button class="chip ${cur?'on':''}" data-role="${k}" data-f="${r.f.id}">${{adm:'재상',mil:'장수',sci:'학자'}[k]}</button>`; }).join('')}</div>`:''}</div></div>`; }).join('')||'<p class="sub">이 나라와 이어진 역사 인물이 없다.</p>'}`;
}
function paneChron(){
  const L=G.chron.slice().reverse();
  return `<ul class="chron">${L.map(c=>`<li><div class="g">${esc(c.g)}</div><div><div class="y">${fy(c.y)} ${c.m}월</div><div class="t">${esc(c.t)}</div>${c.x?`<div class="x">${esc(c.x)}</div>`:''}</div></li>`).join('')}</ul>`;
}
function bindPane(P){
  const pane=$('#pane');
  const mob=pane.querySelector('#mob'); if(mob){ mob.oninput=()=>{ ENG.act.setMob(G,+mob.value/100); pane.querySelector('#mobv').textContent=(+mob.value).toFixed(1)+'%'; }; mob.onchange=()=>{ mob.blur(); renderPane(true); }; }
  if(tab==='state'){ const L=G.hist.length; if(pane._chartsDirty||pane._chartLen!==L){ pane._chartLen=L; drawCharts(P); } }
  pane.querySelectorAll('.tn.avail,.tn.cur').forEach(b=>b.onclick=()=>{ ENG.act.setResearch(G,b.dataset.t); renderPane(); updateTop(); });
  const fc=pane.querySelector('#focus'); if(fc) fc.onclick=e=>{ const b=e.target.closest('.chip'); if(!b) return; ENG.act.setFocus(G,b.dataset.c||null); renderPane(); };
  const gg=pane.querySelector('#govgo'); if(gg) gg.onclick=()=>{ const v=pane.querySelector('#govsel').value; if(v===P.gov) return; if(ENG.act.setGov(G,v)) toast(`정체를 ${D.GOVS[v].n}(으)로 바꿨다.`); else toast('국고가 부족하다.'); renderPane(true); updateTop(); };
  pane.querySelectorAll('.pol button').forEach(b=>b.onclick=()=>{ const id=b.dataset.p; const on=P.policies.includes(id); if(ENG.act.togglePolicy(G,id)) toast(on?`${D.POLICIES[id].n} 폐지`:`${D.POLICIES[id].n} 시행`); else toast(P.policies.length>=D.GOVS[P.gov].slots?'제도 슬롯이 가득 찼다. 하나를 폐지하라.':'국고가 부족하다.'); renderPane(true); updateTop(); });
  pane.querySelectorAll('[data-peace]').forEach(b=>b.onclick=()=>{ const r=ENG.act.offerPeace(G,+b.dataset.peace); toast(r==='ok'?'강화가 성립했다.':r==='wait'?'반년 안에 다시 제안할 수 없다.':'상대가 강화를 거절했다.'); renderPane(true); });
  pane.querySelectorAll('[data-war]').forEach(b=>b.onclick=()=>confirmWar(+b.dataset.war));
  pane.querySelectorAll('[data-st]').forEach(b=>b.onclick=()=>{ ENG.act.setStance(G,+b.dataset.e,b.dataset.st); renderPane(true); });
  pane.querySelectorAll('[data-army]').forEach(b=>b.onclick=()=>{ const id=+b.dataset.army; const a=G.armies.find(x=>x.id===id); if(a){ mv.focusOn(PCX[a.p],PCY[a.p],Math.max(mv.vs,6)); } selectArmy(id); });
  const ac=pane.querySelector('#anticorr'); if(ac) ac.onclick=()=>{ if(ENG.act.antiCorruption(G)) toast('부패 척결에 나섰다.'); else toast('국고가 부족하다.'); renderPane(true); updateTop(); };
  pane.querySelectorAll('[data-role]').forEach(b=>b.onclick=()=>{ ENG.act.setFigRole(G,b.dataset.f,b.dataset.role); toast('직책을 바꿨다.'); renderPane(true); });
  const ab=pane.querySelector('#autobt'); if(ab) ab.onchange=()=>{ ENG.act.setAutoBattle(G,ab.checked); };
}

// ── 차트 (SVG 선 그래프 + 십자선 툴팁) ──
function lineChart(el, series, yfmt, signed){
  const w=Math.max(260,el.clientWidth||360), h=150, ml=48, mr=8, mt=8, mb=22;
  const all=series.flatMap(s=>s.pts); if(all.length<2){ el.innerHTML='<p class="sub">기록이 쌓이면 그래프가 그려진다.</p>'; return; }
  const x0=Math.min(...all.map(p=>p[0])), x1=Math.max(...all.map(p=>p[0]));
  let ymax=Math.max(...all.map(p=>p[1])), ymin=signed?Math.min(0,...all.map(p=>p[1])):0; ymax=(signed?Math.max(ymax,0.5):ymax)*1.08||1;
  const span=ymax-ymin; const step=Math.pow(10,Math.floor(Math.log10(span/3))); const nice=[1,2,2.5,5,10].map(m=>m*step).find(v=>span/v<=4)||step*10;
  const lo=Math.floor(ymin/nice)*nice, hi=Math.ceil(ymax/nice)*nice;
  const sx=x=>ml+(x-x0)/Math.max(1,x1-x0)*(w-ml-mr), sy=y=>mt+(1-(y-lo)/(hi-lo))*(h-mt-mb);
  let g=''; for(let v=lo;v<=hi+1e-9;v+=nice){ const y=sy(v); g+=`<line x1="${ml}" x2="${w-mr}" y1="${y}" y2="${y}" stroke="#26333c" stroke-width="1"/><text x="${ml-6}" y="${y+3.5}" fill="#8a949b" font-size="10" text-anchor="end" font-family="IBM Plex Mono,monospace">${yfmt(v)}</text>`; }
  const xt=[x0,Math.round((x0+x1)/2),x1]; for(const x of xt) g+=`<text x="${sx(x)}" y="${h-6}" fill="#8a949b" font-size="10" text-anchor="${x===x0?'start':x===x1?'end':'middle'}" font-family="IBM Plex Mono,monospace">${x<0?'BC'+(-x):x}</text>`;
  const paths=series.map(s=>{ const d=s.pts.map((p,i)=>(i?'L':'M')+sx(p[0]).toFixed(1)+' '+sy(p[1]).toFixed(1)).join(''); const last=s.pts[s.pts.length-1];
    return `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2" ${s.dash?'stroke-dasharray="5 4"':''} stroke-linejoin="round"/>`+(s.dash?'':`<circle cx="${sx(last[0])}" cy="${sy(last[1])}" r="4" fill="${s.color}" stroke="#121a20" stroke-width="2"/>`); }).join('');
  el.innerHTML=`<div class="lg">${series.map(s=>`<span><i class="${s.dash?'d':''}" style="background:${s.color}"></i>${esc(s.name)}</span>`).join('')}</div>
   <svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(series.map(s=>s.name).join(', '))}">${g}${paths}<line class="xh" x1="0" x2="0" y1="${mt}" y2="${h-mb}" stroke="#c3bcac" stroke-width="1" opacity="0"/><rect x="${ml}" y="0" width="${w-ml-mr}" height="${h}" fill="transparent"/></svg><div class="tip" hidden></div>`;
  const svg=el.querySelector('svg'), tip=el.querySelector('.tip'), xh=el.querySelector('.xh');
  svg.onpointermove=e=>{ const r=svg.getBoundingClientRect(); const px=(e.clientX-r.left)*w/r.width; const x=x0+(px-ml)/(w-ml-mr)*(x1-x0);
    const vals=series.map(s=>{ let b=s.pts[0]; for(const p of s.pts) if(Math.abs(p[0]-x)<Math.abs(b[0]-x)) b=p; return [s,b]; });
    const X=vals[0][1][0]; xh.setAttribute('x1',sx(X)); xh.setAttribute('x2',sx(X)); xh.setAttribute('opacity',.5);
    tip.hidden=false; tip.innerHTML=`<div class="muted">${fy(X)}</div>`+vals.map(([s,p])=>`<div>${esc(s.name)} <b>${yfmt(p[1],true)}</b></div>`).join('');
    const tx=(sx(X)/w)*r.width; tip.style.left=Math.min(r.width-tip.offsetWidth-4,Math.max(0,tx+10))+'px'; tip.style.top='24px'; };
  svg.onpointerleave=()=>{ tip.hidden=true; xh.setAttribute('opacity',0); };
}
const popFmt=(v,full)=>full?fpop(v):(v>=1e8?(v/1e8).toFixed(v>=1e9?0:1)+'억':v>=1e4?Math.round(v/1e4)+'만':Math.round(v));
function drawCharts(P){
  const H_=G.hist.filter(h=>h.tag===P.tag||true);
  const step=Math.max(1,Math.floor(H_.length/160)); const S=H_.filter((h,i)=>i%step===0||i===H_.length-1);
  const real=realRef(P);
  const s1=[{name:P.name,color:'#d6a94f',pts:S.map(h=>[h.y,h.pp])}];
  if(real) s1.push({name:real.n,color:'#8a949b',dash:true,pts:S.filter(h=>h.y>=real.t[0][0]).map(h=>[h.y,ENG.interpLog(real.t,h.y)])});
  const c1=document.getElementById('ch1'); if(c1) lineChart(c1,s1,popFmt);
  const c3=document.getElementById('ch3'); if(c3) lineChart(c3,[{name:'당신의 세계',color:'#d6a94f',pts:S.map(h=>[h.y,h.tp||0])},{name:'실제 역사',color:'#8a949b',dash:true,pts:S.map(h=>[h.y,h.tr||0])}],(v,full)=>(v>=0?'+':'')+(+v).toFixed(full?2:1)+'°',true);
  const c2=document.getElementById('ch2'); if(c2) lineChart(c2,[{name:'당신의 세계',color:'#d6a94f',pts:S.map(h=>[h.y,h.wp])},{name:'실제 역사',color:'#8a949b',dash:true,pts:S.map(h=>[h.y,h.wr])}],popFmt);
}

// ── 모달 ──
function showModal(o){
  modalOpen=true; const m=$('#modal');
  m.innerHTML=`<div class="ovl"><div class="evt" role="dialog" aria-modal="true" aria-labelledby="evt-t"><div class="hd"><div class="seal">${esc(o.glyph||'史')}</div><div><div class="when">${esc(o.when||'')}</div><h2 id="evt-t">${esc(o.title)}</h2>${o.who?`<div class="who">${esc(o.who)}</div>`:''}</div></div>
   <div class="body">${o.body}</div><div class="opts">${o.opts.map((x,i)=>`<button class="opt" data-i="${i}"><div class="l">${esc(String(x.t).replace(/\s*\(역사\)/,''))}${x.h?'<span class="h">역사</span>':''}</div>${x.tip?`<div class="tp">${esc(x.tip)}</div>`:''}${x.dv?`<div class="dv">역사 개변도 +${x.dv}</div>`:''}</button>`).join('')}</div></div></div>`;
  m.querySelectorAll('.opt').forEach(b=>b.onclick=()=>{ const x=o.opts[+b.dataset.i]; m.innerHTML=''; modalOpen=false; try{ x.go&&x.go(); }catch(e){ console.error(e); } renderAll(true); });
  const first=m.querySelector('.opt'); if(first) first.focus({preventScroll:true});
}
function showNext(){
  const q=G.queue.shift(); if(!q) return; const P=G.C[G.player];
  if(q.kind==='peace'){ const e=G.C[q.from]; if(!e.alive||!ENG.findWar(G,G.player,q.from)) return;
    showModal({glyph:'和',when:fdate(G),title:`${e.name}의 강화 제의`,who:`전쟁 ${((G.day-ENG.findWar(G,G.player,q.from).since)/365).toFixed(1)}년째`,body:`${esc(e.name)}의 사신이 왔다. 지금 점령한 땅을 서로 인정하고 전쟁을 끝내자고 한다.`,
      opts:[{t:'강화를 받아들인다',tip:'전쟁 종료, 5년 휴전',go:()=>ENG.makePeace(G,G.player,q.from)},{t:'거절하고 싸운다',tip:'전쟁 계속',go:()=>{}}]}); return; }
  if(q.kind==='figure'){ const f=D.FIGS.find(x=>x.id===q.id); if(!f) return; const R=ENG.ROLE_FX; const dr=ENG.defRole(f);
    const nm={adm:'재상으로 삼는다',mil:'장수로 삼는다',sci:'학자로 삼는다'}, ds={adm:'나라 살림과 감찰을 맡긴다',mil:'가장 큰 군단의 지휘를 맡긴다 (장수 역량 6)',sci:'학문과 기술 개발을 맡긴다'};
    showModal({glyph:f.g,when:fdate(G),title:`${f.n}, 역사의 무대에 서다`,who:`${f.role} · ${fy(f.b)}–${fy(f.d)}`,body:`${esc(f.x)}<br><br>고유 효과: ${esc(fxStr(f.fx))||'없음'}. 어떤 자리를 맡길 것인가? 직책에 따라 추가 효과가 붙는다. 인물 패널에서 언제든 바꿀 수 있다.`,
      opts:['adm','mil','sci'].map(r=>({t:nm[r],tip:`${ds[r]} — ${fxStr(R[r])}${r===dr?' · 이 인물에게 어울리는 자리':''}`,h:r===dr,go:()=>ENG.act.setFigRole(G,f.id,r)}))}); return; }
  if(q.kind==='stance'){ const w=q.war; if(!G.wars.includes(w)) return; const mine=w.a===G.player; const e=G.C[mine?w.b:w.a];
    showModal({glyph:'戰',when:fdate(G),title:`${e.name}과(와)의 전쟁`,who:`${mine?'우리가 선전포고했다':'적이 선전포고했다'} · 적 병력 ${fmoney(ENG.armiesOf(G,e.i).reduce((s_,a)=>s_+a.n,0))}명 · 우리 ${fmoney(P.soldiers)}명`,
      body:`전쟁의 태세를 정하라. 태세는 전쟁 패널에서 언제든 바꿀 수 있다.<br><br><b>공격 태세</b> — 공격할 때 전투력 ×1.1. 자동 지휘 군단이 적 군단을 찾아 싸우고 적지를 포위한다. 적지 깊이 들어갈수록 병참이 끊긴다.<br><b>방어 태세</b> — 우리 땅에서 싸울 때 전투력 ×1.2. 자동 지휘 군단은 국경과 수도를 지키고 빼앗긴 땅만 되찾는다.`,
      opts:[{t:'공격 태세',tip:'선제공격으로 적지를 빼앗는다',go:()=>ENG.act.setStance(G,e.i,'off')},{t:'방어 태세',tip:'험지와 요새에서 적을 맞는다',go:()=>ENG.act.setStance(G,e.i,'def')}]}); return; }
  if(q.kind==='battle'){ const b=(G.battles||[]).find(x=>x.id===q.id); if(!b) return; const side=b.ao===G.player?'att':'def'; const e=G.C[side==='att'?b.do:b.ao];
    const t=MAP.WT[b.p]; const T=D.WTERR[t]; const ctx_={terr:t,def:side==='def',know:id=>P.techs.has(id)};
    const mine=(side==='att'?b.att:b.def).map(id=>G.armies.find(a=>a.id===id)).filter(Boolean); const gen=mine.sort((x,y)=>y.gen.sk-x.gen.sk)[0];
    const avail=D.TACTICS.filter(x=>x.ok(ctx_)); const pick=[...avail.filter(x=>x.id!=='general').sort(()=>Math.random()-.5).slice(0,3), D.TACTICS.find(x=>x.id==='general')];
    const amph=mine.some(a=>a.land>G.day);
    showModal({glyph:'戰',when:fdate(G),title:`${PNAME[b.p]} 전투`,who:`${side==='att'?'공격':'방어'} · ${T.n} (공격 ×${T.atk}, 방어 ×${T.def})${amph?' · 상륙 직후 ×0.35':''}`,
      body:`아군 ${Math.round(side==='att'?b.n0A:b.n0D).toLocaleString()}명 대 ${esc(e.name)} ${Math.round(side==='att'?b.n0D:b.n0A).toLocaleString()}명. 지휘관 ${esc(gen?gen.gen.n:'—')} (역량 ${gen?gen.gen.sk:'-'}/6). 어떻게 싸울 것인가?`,
      opts:pick.map(x=>({t:x.n,tip:`${x.d} ${x.fx==='gen'?'':x.gamble?`성공 확률 ${Math.round(x.gamble*100)}%`:`전투력 ×${x.fx}`}${x.loss&&x.loss!==1?` · 아군 손실 ×${x.loss}`:''}`,go:()=>{ const r=ENG.battleTactic(G,b.id,x.id); if(r) toast(`${x.n}: ${r}`); }}))}); return; }
  if(q.kind==='relief'){
    showModal({glyph:q.type==='화산'?'火':'震',when:fdate(G),title:q.name,who:`${P.name} · ${q.type==='화산'?'VEI '+q.M:'규모 '+q.M.toFixed(1)}`,
      body:`${q.type==='화산'?'화산재와 화쇄류가 마을을 덮쳤다.':'땅이 갈라지고 집과 성벽이 무너졌다.'} 우리 백성 약 <b>${esc(fpop(q.deaths))}</b>이(가) 목숨을 잃었다. 살아남은 사람들이 조정을 바라보고 있다.`,
      opts:[{t:'창고를 열고 대대적으로 구호한다',tip:`국고 −${fmoney(P.income*0.25)}, 안정도 +0.4, 생산 +3% (2년, 재건)`,go:()=>ENG.act.relief(G,2)},
            {t:'최소한의 구호만 한다',tip:`국고 −${fmoney(P.income*0.08)}`,go:()=>ENG.act.relief(G,1)},
            {t:'스스로 일어서게 둔다',tip:'안정도 −0.6',go:()=>ENG.act.relief(G,0)}]}); return; }
  const ev=q.alt?q.ev.pAlt:q.ev; const opts=q.ask?q.ev.po:ev.o;
  const body=(q.ev.at&&q.ev.px&&!q.alt?`<p style="margin:0 0 10px;color:var(--gold2)">${esc(q.ev.px)}</p>`:'')+esc(ev.x||q.ev.x);
  const wasSpeed=speed;
  showModal({glyph:q.ev.cat||'史',when:fdate(G),title:ev.t||q.ev.t,who:P.name+(q.ev.chain?' · 앞선 선택의 결과':''),body,
    opts:opts.map(o=>({t:o.t,tip:o.tip,h:o.h&&!q.random,dv:(o.dv!=null?o.dv:(o.h?0:4))||0,go:()=>{
      ENG.applyOption(G,G._E||ENG.api(G),q.ev,o,q.subj,true); if(!q.random) ENG.runAfter(G,G._E,q.ev);
      ENG.chron(G,ev.t||q.ev.t,`${ev.x||q.ev.x} — 선택: ${o.t}`,q.ev.cat||'史'); ENG.news(G,ev.t||q.ev.t,q.ev.cat);
      if(wasSpeed===0&&!ff) setSpeed(0); }}))});
}
function showGameOver(){
  const P=G.C[G.player];
  if(G.gameOver.reason==='end') return showFinal();
  const alive=G.C.filter(c=>c.alive&&c.prov>0).sort((a,b)=>(b.kr-a.kr)||(b.pop-a.pop)).slice(0,14);
  modalOpen=true; setSpeed(0);
  $('#modal').innerHTML=`<div class="ovl"><div class="final"><div class="when muted num">${fdate(G)}</div><h2>${esc(P.name)}이(가) 멸망했다</h2>
   <p>영토를 모두 잃었다. 역사는 계속된다. 다른 나라를 이어서 이끌거나, 여기서 기록을 마칠 수 있다.</p>
   <div class="picklist">${alive.map(c=>`<button class="btn" data-c="${c.i}"><span><i style="display:inline-block;width:10px;height:10px;background:${c.col};border-radius:2px;margin-right:8px"></i>${esc(c.name)}${c.kr?' <span style="color:var(--seal2);font-size:11px">한국사</span>':''}</span><small>${fpop(c.pop)}</small></button>`).join('')}</div>
   <button class="btn gold" id="endnow" style="width:100%">기록을 마친다</button></div></div>`;
  $('#modal').querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{ ENG.act.switchTo(G,+b.dataset.c); $('#modal').innerHTML=''; modalOpen=false; mv.ver=-1; mv.focusCountry(G.player); renderAll(true); });
  $('#endnow').onclick=()=>{ G.gameOver={reason:'end',y:G.y}; G.over=true; showFinal(); };
}
function showFinal(){
  modalOpen=true; setSpeed(0);
  const P=G.C[G.player]; const wp=ENG.worldPop(G), wr=ENG.interpLog(D.STATS.worldPop,G.y);
  const first=G.hist[0]||{}; const real=realRef(P);
  const verdict = G.div<10?'역사는 거의 그대로 흘렀다.':G.div<30?'역사는 곳곳에서 비틀렸다.':G.div<60?'세계는 실제와 꽤 다른 모습이 되었다.':'이것은 완전히 다른 인류의 역사다.';
  $('#modal').innerHTML=`<div class="ovl"><div class="final"><div class="when muted num">${fdate(G)} · ${fy(G.startY)}부터 ${G.y-G.startY}년</div>
   <h2>${esc(P.name)}의 ${G.y>=2100?'2100년':fy(G.y)}</h2><p>${verdict} 역사 개변도 ${G.div.toFixed(0)}%. 역사대로 고른 선택 ${G.stats.choicesH}번, 역사와 다른 선택 ${G.stats.choicesA}번. 전쟁 ${G.stats.wars}번, 점령 ${G.stats.conquered}곳, 개척 ${G.stats.colonized}곳.</p>
   <div class="big"><div><div class="v">${fpop(P.pop)}</div><div class="k">인구${real?` (실제 ${fpop(ENG.interpLog(real.t,G.y))})`:''}</div></div>
    <div><div class="v">$${Math.round(P.gdppc).toLocaleString()}</div><div class="k">1인당 GDP (실제 세계 $${Math.round(ENG.interp(D.STATS.worldGdp,G.y)).toLocaleString()})</div></div>
    <div><div class="v">${P.leS.toFixed(1)}세</div><div class="k">기대수명 (실제 세계 ${ENG.interp(D.STATS.worldLE,G.y).toFixed(1)}세)</div></div>
    <div><div class="v">${fpop(wp)}</div><div class="k">세계 인구 (실제 ${fpop(wr)})</div></div>
    <div><div class="v">${P.prov}곳</div><div class="k">영토 (시작 ${first.prov||'—'}곳)</div></div>
    <div><div class="v">${P.techs.size}/${D.TECH_LIST.length}</div><div class="k">보유 기술</div></div>
    <div><div class="v">${(G.temp||0)>=0?'+':''}${(G.temp||0).toFixed(2)}°C</div><div class="k">세계 기온 (실제 ${ENG.realTemp(G.y)>=0?'+':''}${ENG.realTemp(G.y).toFixed(2)}°C)</div></div>
    <div><div class="v">${(G.disasters||[]).length}번</div><div class="k">큰 지진·화산 분화</div></div>
    <div><div class="v">${Object.keys(P.resCnt||{}).length}종</div><div class="k">보유 지하자원</div></div></div>
   <div class="chart" id="chF"></div>
   <h4 class="serif" style="margin:18px 0 6px">연대기에서</h4>
   <ul class="chron">${G.chron.filter(c=>c.g!=='統').slice(-8).reverse().map(c=>`<li><div class="g">${esc(c.g)}</div><div><div class="y">${fy(c.y)}</div><div class="t">${esc(c.t)}</div></div></li>`).join('')}</ul>
   <div class="row" style="margin-top:16px;flex-wrap:wrap">${G.y<2100&&P.alive?'<button class="btn" id="cont">계속 진행</button>':''}<button class="btn gold" id="newg" style="flex:1">새 역사 시작</button></div></div></div>`;
  const S=G.hist; lineChart(document.getElementById('chF'),[{name:'당신의 세계 인구',color:'#d6a94f',pts:S.map(h=>[h.y,h.wp])},{name:'실제 역사',color:'#8a949b',dash:true,pts:S.map(h=>[h.y,h.wr])}],popFmt);
  const c=$('#cont'); if(c) c.onclick=()=>{ G.gameOver=null; G.over=false; $('#modal').innerHTML=''; modalOpen=false; };
  $('#newg').onclick=()=>{ $('#modal').innerHTML=''; modalOpen=false; G=null; $('#app').hidden=true; $('#start').hidden=false; pvSeed=(Math.random()*1e9)|0; buildStart(); };
}

// ── 메뉴 · 저장 ──
function toggleMenu(){
  const ex=document.querySelector('.menu'); if(ex){ ex.remove(); return; }
  const m=document.createElement('div'); m.className='menu';
  m.innerHTML=`<button data-a="save">게임 저장</button><button data-a="load">저장한 게임 불러오기</button><button data-a="final">지금까지의 결산 보기</button><button data-a="new">새 게임 (처음 화면)</button><button data-a="help">조작 방법</button>`;
  $('#app').appendChild(m);
  m.onclick=e=>{ const a=e.target.dataset.a; m.remove(); if(!a) return;
    if(a==='save'){ try{ localStorage.setItem('althist.save',ENG.save(G)); toast('저장했다. 이 브라우저에만 보관된다.'); }catch(err){ toast('저장하지 못했다. 브라우저 저장소가 막혀 있다.'); } }
    if(a==='load'){ const s=loadSave(); if(s){ startGame(s,false); toast('불러왔다.'); } else toast('저장된 게임이 없다.'); }
    if(a==='final') showFinal();
    if(a==='new'){ setSpeed(0); G=null; $('#app').hidden=true; $('#start').hidden=false; buildStart(); }
    if(a==='help') showModal({glyph:'助',title:'조작 방법',body:`<b>시간</b> — 하루 단위로 흐른다. 1×는 초당 8일. 스페이스바로 멈추고 1~7 키로 1·2·3·5·10·15·30배속. 「다음 사건」은 다음 결정이 올 때까지 빨리 감는다.<br><b>지도</b> — 끌어서 이동, 휠·두 손가락으로 확대. 땅을 누르면 정보와 명령(개척·선전포고·공격 목표·개발)이 나온다.<br><b>기술</b> — 계보에서 금테 기술을 눌러 연구한다. 시대를 앞선 기술은 비싸다.<br><b>제도</b> — 정체와 정책을 고른다. 한국사 국가에는 고유 제도(범금 8조, 진대법, 대동법, 새마을운동 등)가 있다.<br><b>사건</b> — 역사적 사건이 날짜에 맞춰 찾아온다. 「역사」 표시가 실제로 일어난 선택이다. 다른 선택을 하면 역사 개변도가 오른다.`,opts:[{t:'닫기',go:()=>{}}]});
  };
}
function loadSave(){ try{ const s=localStorage.getItem('althist.save'); return s?ENG.load(s):null; }catch(e){ return null; } }
let toastT=0; function toast(t){ let el=document.querySelector('.toast'); if(!el){ el=document.createElement('div'); el.className='toast'; document.body.appendChild(el); } el.textContent=t; el.hidden=false; clearTimeout(toastT); toastT=setTimeout(()=>el.hidden=true,2400); }

// ── 키보드 ──
document.addEventListener('keydown',e=>{ if(!G||modalOpen||e.target.closest('input,select,textarea')) return;
  if(e.code==='Space'){ e.preventDefault(); setSpeed(speed?0:lastSpeed); }
  const n=+e.key; if(n>=1&&n<=7) setSpeed(SPEEDS[n-1]);
  if(e.key==='Escape'){ selArmy=null; selectProv(-1); } });

// ── 메인 루프 ──
let lastT=performance.now(), acc=0, uiT=0, paneTick=0;
function renderAll(force){ if(!G) return; updateTop(); renderPane(force); renderCard(); }
function frame(t){
  const dt=Math.min(0.25,(t-lastT)/1000); lastT=t;
  if(G && !modalOpen && !G.gameOver){
    if(ff){ const t0=performance.now(); const y0=G.y; while(performance.now()-t0<28){ for(let i=0;i<40;i++){ ENG.tick(G); if(G.queue.length||G.gameOver) break; } if(G.queue.length||G.gameOver||G.y-y0>60) break; } if(G.queue.length||G.gameOver){ ff=false; } }
    else if(speed>0){ acc+=dt*speed*DPS; let n=Math.min(Math.floor(acc),400); acc-=Math.floor(acc); for(let i=0;i<n;i++){ ENG.tick(G); if(G.queue.length||G.gameOver){ acc=0; break; } } }
    if(G.queue.length) showNext();
    else if(G.gameOver) showGameOver();
  }
  if(!G && smap && gPreview && smap.dirty){ smap.draw(gPreview); smap.dirty=false; }
  if(G && mv){
    const needBuild = mv.ver!==G.ownVer || mv.builtMode!==mode || (mode!=='pol'&&G.day-mv.builtDay>60);
    if(needBuild && (t-(mv._bt||0)>220 || mv.ver===-1)){ mv.build(G); mv._bt=t; mv.dirty=true; }
    if(mv.dirty || speed>0 || ff){ mv.draw(G); mv.dirty=false; }
    if(t-uiT>180){ uiT=t; updateTop(); if(++paneTick%4===0||speed===0&&paneTick%2===0) renderPane(); if((sel>=0||selArmy!=null)&&paneTick%3===0) renderCard(); }
  }
  requestAnimationFrame(frame);
}

// ── 부팅 (+ 뷰어 핫 업데이트 시 상태 보존) ──
function boot(data){
  buildStart();
  if(data&&data.save){ try{ const g=ENG.load(data.save); startGame(g,false); }catch(e){} }
  requestAnimationFrame(frame);
}
window.claude?.hot?.snapshot?.(()=>G?{save:ENG.save(G)}:{});
if(window.claude?.hot?.ready) window.claude.hot.ready(boot); else boot(window.claude?.hot?.data??{});
})();
