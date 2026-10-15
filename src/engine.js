// ───────────────────────────────────────────────────────────────
//  시뮬레이션 엔진 (DOM 없음 — 노드에서도 실행 가능)
// ───────────────────────────────────────────────────────────────
(function(root){
const D = root.GDATA, M = root.MAPDATA;
const ENG = root.ENGINE = {};

// ── 지도 디코딩 ──
const W = M.W, Hh = M.H, N = M.provs.length;
const cellId = new Uint16Array(W*Hh);
(function(){
  let bin;
  if (typeof atob === 'function') { const s = atob(M.rle); bin = new Uint8Array(s.length); for (let i=0;i<s.length;i++) bin[i]=s.charCodeAt(i); }
  else bin = new Uint8Array(Buffer.from(M.rle,'base64'));
  const runs = new Uint16Array(bin.buffer, 0, bin.length>>1);
  let k=0; for (let i=0;i<runs.length;i+=2){ cellId.fill(runs[i],k,k+runs[i+1]); k+=runs[i+1]; }
})();
const PFR = new Int8Array(N).fill(-1);
const PLON = new Float32Array(N), PLAT = new Float32Array(N), PAREA = new Float32Array(N), PTER = new Uint8Array(N), PCOAST = new Uint8Array(N), PW = new Float32Array(N);
M.provs.forEach((p,i)=>{ PLON[i]=p[0]; PLAT[i]=p[1]; PAREA[i]=p[2]; PTER[i]=p[3]; PCOAST[i]=p[4]; });
const ADJ = M.adj, SEA = M.sea;
let WSUM = 0;
for (let i=0;i<N;i++){
  let h = 1;
  for (const [lo,la,r,w] of D.HOT){ const dx=(PLON[i]-lo)*Math.cos(la*Math.PI/180), dy=PLAT[i]-la; h += w*Math.exp(-(dx*dx+dy*dy)/(2*r*r)); }
  let low=1; for(const b of D.LOWBOX) if(PLON[i]>=b[0]&&PLAT[i]>=b[1]&&PLON[i]<=b[2]&&PLAT[i]<=b[3]) low*=b[4];
  PW[i] = Math.max(50, PAREA[i]) * D.TERRAIN[PTER[i]].f * h * low;
  D.FRONTIER.forEach((f,k)=>{ const b=f.box; if(PLON[i]>=b[0]&&PLAT[i]>=b[1]&&PLON[i]<=b[2]&&PLAT[i]<=b[3]) PFR[i]=k; });
}
let WSUM_Y=null, WSUM_V=0;
function wsum(y){ if(WSUM_Y===y) return WSUM_V; const fr=D.FRONTIER.map(f=>interp(f.t,y)); let s=0; for(let i=0;i<N;i++) s+=PW[i]*(PFR[i]>=0?fr[PFR[i]]:1); WSUM_Y=y; WSUM_V=s; return s; }
function pw(i,y){ return PFR[i]>=0? PW[i]*interp(D.FRONTIER[PFR[i]].t,y) : PW[i]; }
function hav(lo1,la1,lo2,la2){ const R=6371,r=Math.PI/180; const dla=(la2-la1)*r, dlo=(lo2-lo1)*r; const a=Math.sin(dla/2)**2+Math.cos(la1*r)*Math.cos(la2*r)*Math.sin(dlo/2)**2; return 2*R*Math.asin(Math.sqrt(a)); }
const pdist = (a,b)=>hav(PLON[a],PLAT[a],PLON[b],PLAT[b]);
function nearestProv(lon,lat,maxKm){ let b=-1,bd=1e9; for(let i=0;i<N;i++){ if(Math.abs(PLAT[i]-lat)>12) continue; const d=hav(lon,lat,PLON[i],PLAT[i]); if(d<bd){bd=d;b=i;} } return bd<=(maxKm||600)?b:-1; }
const inBox = (i,b)=> PLON[i]>=b[0] && PLAT[i]>=b[1] && PLON[i]<=b[2] && PLAT[i]<=b[3];

// ── 도시 이름 (지방 이름용) ──
const CITIES = `서울(한성),126.98,37.57;평양,125.75,39.03;개경,126.55,37.97;경주,129.22,35.84;부여,126.91,36.28;공주,127.12,36.46;전주,127.15,35.82;광주,126.85,35.16;대구,128.6,35.87;부산,129.07,35.18;김해,128.88,35.23;원산,127.44,39.15;함흥,127.54,39.92;의주,124.55,40.2;강릉,128.9,37.75;청주,127.49,36.64;제주,126.53,33.5;회령,129.75,42.44;강계,126.6,40.97;춘천,127.73,37.88;안동,128.73,36.57;목포,126.39,34.81;해주,125.7,38.04;청진,129.78,41.8;혜산,128.18,41.4;원주,127.95,37.34;진주,128.08,35.18;순천,127.49,34.95;충주,127.93,36.97;
국내성,126.19,41.12;졸본,125.36,41.27;요양,123.17,41.27;심양,123.43,41.8;장춘,125.32,43.88;하얼빈,126.63,45.75;동모산,128.23,43.37;상경 용천부,129.33,44.33;블라디보스토크,131.9,43.1;베이징,116.4,39.9;장안,108.94,34.34;뤄양,112.45,34.62;카이펑,114.3,34.8;난징,118.8,32.06;항저우,120.15,30.27;상하이,121.47,31.23;광저우,113.26,23.13;청두,104.07,30.67;우한,114.3,30.59;창사,112.94,28.23;쿤밍,102.83,25.02;다리,100.23,25.6;란저우,103.83,36.06;둔황,94.66,40.14;카슈가르,75.99,39.47;투르판,89.18,42.95;라싸,91.11,29.65;지난,117,36.67;타이위안,112.55,37.87;다퉁,113.3,40.09;후허하오터,111.75,40.84;카라코룸,102.83,47.2;울란바토르,106.9,47.9;타이베이,121.56,25.03;홍콩,114.17,22.32;푸저우,119.3,26.08;
교토,135.77,35.01;오사카,135.5,34.69;에도(도쿄),139.69,35.69;가마쿠라,139.55,35.32;하카타,130.4,33.59;센다이,140.87,38.27;삿포로,141.35,43.06;가고시마,130.55,31.6;히로시마,132.46,34.39;나가사키,129.87,32.75;니가타,139.02,37.9;
하노이,105.85,21.03;후에,107.59,16.46;사이공,106.66,10.76;앙코르,103.87,13.41;아유타야,100.57,14.35;양곤,96.16,16.87;바간,94.86,21.17;믈라카,102.25,2.19;자카르타,106.85,-6.21;마닐라,120.98,14.6;수라바야,112.75,-7.25;
델리,77.21,28.61;아그라,78.01,27.18;파탈리푸트라,85.14,25.6;콜카타,88.36,22.57;뭄바이,72.88,19.08;첸나이,80.27,13.08;함피,76.46,15.33;하라파,72.86,30.63;모헨조다로,68.14,27.33;라호르,74.34,31.55;카불,69.21,34.56;칸다하르,65.7,31.6;
바그다드,44.36,33.31;바빌론,44.42,32.54;우르,46.1,30.96;니네베,43.15,36.36;다마스쿠스,36.29,33.51;예루살렘,35.21,31.77;메카,39.83,21.42;메디나,39.61,24.47;페르세폴리스,52.89,29.94;이스파한,51.67,32.65;테헤란,51.39,35.69;타브리즈,46.29,38.08;메르브,61.84,37.66;사마르칸트,66.96,39.65;부하라,64.42,39.77;콘스탄티노폴리스,28.98,41.01;앙카라,32.85,39.93;안티오키아,36.16,36.2;트레비존드,39.72,41;코니아,32.48,37.87;무스카트,58.4,23.6;아덴,45.03,12.8;사나,44.2,15.35;
멤피스(카이로),31.24,30.04;테베,32.64,25.7;알렉산드리아,29.92,31.2;카르타고,10.32,36.85;페스,-4.99,34.03;마라케시,-7.99,31.63;알제,3.06,36.75;트리폴리,13.18,32.89;메로에,33.75,16.93;악숨,38.72,14.13;아디스아바바,38.75,9.03;팀북투,-3,16.77;가오,-0.04,16.27;쿰비살레,-7.98,15.77;니아니,-8.37,11.37;카노,8.52,12;라고스,3.38,6.52;킨샤사,15.3,-4.32;나이로비,36.82,-1.29;킬와,39.5,-8.96;그레이트짐바브웨,30.93,-20.27;케이프타운,18.42,-33.92;다카르,-17.44,14.69;아크라,-0.19,5.6;하르툼,32.53,15.5;모가디슈,45.32,2.05;루안다,13.23,-8.84;안타나나리보,47.52,-18.88;요하네스버그,28.04,-26.2;은자메나,15.04,12.13;
로마,12.5,41.9;아테네,23.73,37.98;펠라,22.52,40.76;나폴리,14.27,40.85;밀라노,9.19,45.46;베네치아,12.33,45.44;피렌체,11.25,43.77;파리,2.35,48.86;아헨,6.08,50.78;리옹,4.83,45.76;마르세유,5.37,43.3;런던,-0.13,51.51;요크,-1.08,53.96;에든버러,-3.19,55.95;더블린,-6.26,53.35;톨레도,-4.02,39.86;코르도바,-4.78,37.89;그라나다,-3.6,37.18;리스본,-9.14,38.72;바르셀로나,2.17,41.39;빈,16.37,48.21;프라하,14.42,50.08;베를린,13.4,52.52;함부르크,9.99,53.55;쾰른,6.96,50.94;뮌헨,11.58,48.14;크라쿠프,19.94,50.06;바르샤바,21.01,52.23;부다,19.04,47.5;베오그라드,20.46,44.82;소피아,23.32,42.7;부쿠레슈티,26.1,44.43;키예프,30.52,50.45;모스크바,37.62,55.76;노브고로드,31.27,58.52;상트페테르부르크,30.32,59.93;빌뉴스,25.28,54.69;리가,24.1,56.95;코펜하겐,12.57,55.68;스톡홀름,18.07,59.33;오슬로,10.75,59.91;헬싱키,24.94,60.17;암스테르담,4.9,52.37;브뤼셀,4.35,50.85;카잔,49.12,55.79;사라이,46,48.6;아스트라한,48.03,46.35;트빌리시,44.79,41.72;예레반,44.51,40.18;바쿠,49.87,40.41;
노보시비르스크,82.9,55;이르쿠츠크,104.3,52.3;야쿠츠크,129.7,62;토볼스크,68.25,58.2;오호츠크,143.2,59.4;마가단,150.8,59.6;하바롭스크,135.07,48.48;알마티,76.95,43.24;타슈켄트,69.24,41.3;
테노치티틀란,-99.13,19.43;치첸이트사,-88.57,20.68;티칼,-89.62,17.22;몬테알반,-96.77,17.04;쿠스코,-71.97,-13.53;찬찬,-79.07,-8.11;티와나쿠,-68.67,-16.55;카랄,-77.52,-10.89;리마,-77.04,-12.05;보고타,-74.07,4.71;키토,-78.47,-0.18;카라카스,-66.9,10.48;아바나,-82.37,23.11;산토도밍고,-69.93,18.49;리우데자네이루,-43.17,-22.91;상파울루,-46.63,-23.55;사우바도르,-38.5,-12.97;부에노스아이레스,-58.38,-34.6;산티아고,-70.67,-33.45;마나우스,-60.02,-3.12;카호키아,-90.06,38.66;워싱턴,-77.04,38.9;뉴욕,-74,40.71;보스턴,-71.06,42.36;퀘벡,-71.21,46.81;시카고,-87.63,41.88;뉴올리언스,-90.07,29.95;휴스턴,-95.37,29.76;덴버,-104.99,39.74;샌프란시스코,-122.42,37.77;로스앤젤레스,-118.24,34.05;시애틀,-122.33,47.6;위니펙,-97.14,49.9;앵커리지,-149.9,61.2;과테말라,-90.5,14.6;파나마,-79.5,8.98;
시드니,151.21,-33.87;멜버른,144.96,-37.81;퍼스,115.86,-31.95;앨리스스프링스,133.88,-23.7;브리즈번,153.03,-27.47;오클랜드,174.76,-36.85;다윈,130.84,-12.46`;
const PNAME = new Array(N).fill(null);
(function(){
  const taken = new Map();
  CITIES.replace(/\n/g,'').split(';').forEach(s=>{ const [n,lo,la]=s.split(','); if(!n) return; const p=nearestProv(+lo,+la,260); if(p<0) return; const d=hav(+lo,+la,PLON[p],PLAT[p]); if(!taken.has(p)||taken.get(p)>d){ taken.set(p,d); PNAME[p]=n; } });
  const dirs=['북','북동','동','남동','남','남서','서','북서'];
  for(let i=0;i<N;i++) if(!PNAME[i]){
    // 가까운 이름 있는 지방 기준 방향 표기
    let b=-1,bd=1e9; for(let j=0;j<N;j++){ if(!PNAME[j]||taken.get(j)===undefined) continue; if(Math.abs(PLAT[j]-PLAT[i])>15) continue; const d=pdist(i,j); if(d<bd){bd=d;b=j;} }
    const ter = D.TERRAIN[PTER[i]].n;
    if(b>=0 && bd<900){ const ang=Math.atan2(PLAT[i]-PLAT[b],(PLON[i]-PLON[b])*Math.cos(PLAT[i]*Math.PI/180)); const k=Math.round(((Math.PI/2-ang)/(Math.PI*2))*8+8)%8; PNAME[i]=PNAME[b].replace(/\(.*\)/,'')+' '+dirs[k]+'방 '+ter; }
    else PNAME[i]=`${ter} 지대 (${Math.abs(PLAT[i]).toFixed(0)}°${PLAT[i]>=0?'N':'S'} ${Math.abs(PLON[i]).toFixed(0)}°${PLON[i]>=0?'E':'W'})`;
  }
})();

ENG.map = {W, H:Hh, N, cellId, PLON, PLAT, PAREA, PTER, PCOAST, ADJ, SEA, PNAME, lon0:M.lon0, lat0:M.lat0, res:M.res, nearestProv, hav};

// ── 유틸 ──
function interp(tab, y){ if(y<=tab[0][0]) return tab[0][1]; for(let i=1;i<tab.length;i++){ if(y<=tab[i][0]){ const [x0,v0]=tab[i-1],[x1,v1]=tab[i]; return v0+(v1-v0)*(y-x0)/(x1-x0); } } return tab[tab.length-1][1]; }
function interpLog(tab,y){ if(y<=tab[0][0]) return tab[0][1]; for(let i=1;i<tab.length;i++){ if(y<=tab[i][0]){ const [x0,v0]=tab[i-1],[x1,v1]=tab[i]; return Math.exp(Math.log(v0)+(Math.log(v1)-Math.log(v0))*(y-x0)/(x1-x0)); } } return tab[tab.length-1][1]; }
ENG.interp = interp; ENG.interpLog = interpLog;
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const MDAYS=[31,28,31,30,31,30,31,31,30,31,30,31];
const TECHS = D.TECHS, TL = D.TECH_LIST;
const TECH_H_SORTED = TL.map(t=>t.h).sort((a,b)=>a-b);
function expectedTech(y){ let lo=0,hi=TECH_H_SORTED.length; while(lo<hi){const m=(lo+hi)>>1; if(TECH_H_SORTED[m]<=y) lo=m+1; else hi=m;} return lo; }
function eraT(y){ return y< -1000?600 : y<500?220 : y<1450?110 : y<1750?55 : y<1900?28 : 18; }
function fmtYear(y){ return y<0?`기원전 ${-y}년`:`${y}년`; }
ENG.fmtYear = fmtYear;

// ── 난수 ──
function rng(G){ let t = G.seed = (G.seed + 0x6D2B79F5)|0; t = Math.imul(t ^ t>>>15, t|1); t ^= t + Math.imul(t ^ t>>>7, t|61); return ((t ^ t>>>14)>>>0)/4294967296; }

const GOV_INST={republic:.08,constmon:.06,socialist:-.12,junta:-.06,absolut:-.03,exile:0};
const POL_INST={export:.08,neolib:.04,planned:-.08,juche:-.15,songun:-.08,publicedu:.04,suffrage:.03,landreform:.05,openness:.04,censor:-.05,fiveyear:.05,saemaul:.03,heavychem:.04,abolish:.03,freetrade:.03,welfarep:.02};
// ── 국가 생성 ──
function hashCol(tag){ let h=0; for(const ch of tag) h=(h*31+ch.charCodeAt(0))>>>0; const hue=h%360, s=28+(h>>9)%22, l=44+(h>>14)%16; return `hsl(${hue},${s}%,${l}%)`; }
function newCountry(G, tag, name, opt){
  opt = opt||{};
  const c = { i:G.C.length, tag, name, col:opt.col||hashCol(tag), gov:opt.gov||'tribe', kr:!!opt.kr, cul:opt.cul||'eu', alive:true, exile:false,
    techs:new Set(), cur:null, prog:0, gold:0, stab:1, soldiers:0, mob:0.01, policies:[], tmods:[], perm:{lit:0,life:0,def:0}, flags:{},
    cap:-1, prov:0, pop:0, gdp:0, gdppc:0, income:0, expense:0, str:0, lit:0, le:28, tfr:6, focus:null, aggr:0.5+rng(G), ruler:null, born:G.day,
    inst:clamp(0.55+0.45*rng(G),0.35,1.15), desc:opt.desc||'', truce:{}, lastPeaceAsk:-999, fx:null, techDirty:true, histTag:tag };
  G.C.push(c); G.tag[tag]=c.i; return c;
}
function giveInitialTechs(G,c,year,lag){
  for(const t of TL) if(t.h <= year-lag) c.techs.add(t.id);
  // 선행 기술 보정
  let changed=true; while(changed){ changed=false; for(const id of [...c.techs]) for(const r of TECHS[id].req) if(!c.techs.has(r)){ c.techs.add(r); changed=true; } }
  c.techDirty=true;
}

// ── 영토 배정 (다중 출발 다익스트라) ──
// srcs: [{ci, prov, r, box}] ; allow(prov, ci) → bool
function claimMulti(G, srcs, allow, maxSea){
  const best = new Float32Array(N).fill(1e9), who = new Int32Array(N).fill(-1);
  const heap=[]; const push=(d,p,ci,r,box)=>{ heap.push([d,p,ci,r,box]); let i=heap.length-1; while(i>0){const pa=(i-1)>>1; if(heap[pa][0]<=heap[i][0])break; [heap[pa],heap[i]]=[heap[i],heap[pa]]; i=pa;} };
  const pop=()=>{ const top=heap[0], last=heap.pop(); if(heap.length){ heap[0]=last; let i=0; for(;;){ const l=2*i+1,r=l+1; let m=i; if(l<heap.length&&heap[l][0]<heap[m][0])m=l; if(r<heap.length&&heap[r][0]<heap[m][0])m=r; if(m===i)break; [heap[m],heap[i]]=[heap[i],heap[m]]; i=m; } } return top; };
  for(const s of srcs) if(s.prov>=0) push(0,s.prov,s.ci,s.r,s.box);
  const out=[];
  while(heap.length){
    const [d,p,ci,r,box]=pop();
    if(who[p]>=0 || d>r) continue;
    if(box && !inBox(p,box)) continue;
    if(!allow(p,ci)) continue;
    who[p]=ci; out.push([p,ci]);
    for(const q of ADJ[p]) if(who[q]<0){ const nd=d+pdist(p,q); if(nd<best[q]&&nd<=r){ best[q]=nd; push(nd,q,ci,r,box);} }
    if(maxSea) for(const q of SEA[p]) if(who[q]<0){ const nd=d+pdist(p,q)*1.6; if(nd<best[q]&&nd<=r){ best[q]=nd; push(nd,q,ci,r,box);} }
  }
  return out;
}

// ── 게임 초기화 ──
ENG.newGame = function(eraIdx, playerTag, seed){
  const era = D.ERAS[eraIdx];
  const G = { v:1, era:eraIdx, y:era.y, m:era.m, d:era.d, day:0, seed:seed||((Math.random()*1e9)|0),
    owner:new Int16Array(N).fill(-1), pop:new Float64Array(N), C:[], tag:{}, player:-1, div:0, evPtr:0, fired:{}, figs:{},
    wars:[], ops:[], news:[], chron:[], hist:[], ownVer:1, queue:[], over:false, gameOver:null, stats:{conquered:0,colonized:0,wars:0,choicesH:0,choicesA:0},
    startY:era.y };
  // 국가 생성 + 영토
  const srcs=[];
  era.C.forEach(([tag,name,anchors,gov,tl,opt])=>{
    const c=newCountry(G,tag,name,Object.assign({gov},opt)); c.tl=tl; c.armyMul=opt.army||1;
    giveInitialTechs(G,c,era.y,era.lag[tl]);
    for(const [lo,la,r] of anchors){ const p=nearestProv(lo,la,400); if(p>=0) srcs.push({ci:c.i,prov:p,r:Math.max(r,1),box:opt.box}); }
    c.capAnchor = anchors[0];
  });
  const res = claimMulti(G, srcs, ()=>true, true);
  for(const [p,ci] of res) G.owner[p]=ci;
  for(const c of G.C){ const p=nearestProv(c.capAnchor[0],c.capAnchor[1],400); c.cap = (p>=0&&G.owner[p]===c.i)?p:-1; }
  // 인구 (시작 시점 세계 인구가 실제 통계와 같도록 보정)
  G.kscale=1; let ks=0; for(let p=0;p<N;p++) ks+=Kprov(G,p);
  G.kscale = interpLog(D.STATS.worldPop,G.y)*headroom(G.y)/ks;
  for(let p=0;p<N;p++) G.pop[p] = Kprov(G,p)/headroom(G.y);
  G.C.forEach(c=>{ c.inst=clamp(c.inst+[-0.08,0.08,0.3][c.tl],0.35,1.15); c.eff = era.y>=1800 ? [0.33,0.6,1][c.tl] : [0.85,0.95,1][c.tl]; recalc(G,c); c.soldiers = c.pop*0.01*c.armyMul; c.gold = c.income*0.5; autoPolicies(G,c); c.stab=1; recalc(G,c); c._rr=resRate(G,c); });
  // 플레이어
  const pc = playerTag ? G.C.find(c=>c.tag===playerTag) : null;
  G.player = pc ? pc.i : G.C[Math.floor(rng(G)*G.C.length)].i;
  const P=G.C[G.player]; P.mob=0.012; P.ruler=null; ensureRuler(G,P,true);
  // 이미 지난 사건은 건너뛴다
  const key=dkey(G.y,G.m,G.d); G.evPtr=0; while(G.evPtr<EVS.length && EVS[G.evPtr].k<key) G.evPtr++;
  // 인물: 이미 태어난 사람
  for(const f of D.FIGS){ if(f.b<G.y && f.d>=G.y){ const owner=f.tags.find(t=>has(G,t)); G.figs[f.id]={st: owner||f.tags.length===0?'alive':'unborn', dy:f.d, svc:owner||null}; } }
  chron(G, `${P.name}의 역사가 시작된다.`, era.d1, '史');
  recordHist(G);
  return G;
};
const dkey=(y,m,d)=>y*10000+m*100+d;
const EVS = D.EVENTS.map((e,i)=>Object.assign(e,{k:dkey(e.y,e.m,e.d),idx:i})).sort((a,b)=>a.k-b.k);
ENG.EVS = EVS;

function has(G,tag){ const i=G.tag[tag]; return i!==undefined && G.C[i].alive; }
function C(G,tag){ const i=G.tag[tag]; return i===undefined?null:G.C[i]; }

// ── 인구 부양력 ──
function techFactor(G,c){ const k=G.y<1750?0.045:G.y<1900?0.025:0.012; return clamp(Math.exp(k*(c.techs.size - expectedTech(G.y))), 0.18, 3.5); }
function Kprov(G,p){
  const o=G.owner[p]; const real=interpLog(D.STATS.worldPop, G.y);
  let f; if(o<0){ f = G.y< -2000?0.9 : G.y<500?0.45 : G.y<1500?0.35 : G.y<1900?0.25 : 0.4; } else { const c=G.C[o]; f = c._tf!==undefined?c._tf:techFactor(G,c); }
  return real*pw(p,G.y)/wsum(G.y)*f*headroom(G.y)*(G.kscale||1);
}

function headroom(y){ return interp([[-5000,1.15],[1750,1.15],[1850,1.35],[1920,1.8],[1960,2.4],[2100,2.4]],y); }
// ── 효과 합산 ──
const FXKEYS=['tax','prod','mil','def','res','lit','life','stab','colon','naval','demo','manp','tfr','growth'];
function techFx(c){ const s={}; FXKEYS.forEach(k=>s[k]=0); let gdp=650; for(const id of c.techs){ const t=TECHS[id]; for(const k in t.fx) s[k]+=t.fx[k]; gdp*=1+D.ERA_GDP_G[t.era]; } s.gdpBase=gdp; return s; }
function mods(G,c){
  if(c.techDirty||!c.fx){ c.fx=techFx(c); c.techDirty=false; c._tf=techFactor(G,c); }
  const s={}; FXKEYS.forEach(k=>s[k]=c.fx[k]);
  const add=(fx)=>{ for(const k in fx) if(k in s) s[k]+=fx[k]; };
  add(D.GOVS[c.gov].fx);
  for(const id of c.policies){ const p=D.POLICIES[id]; if(p) add(p.fx); }
  for(const t of c.tmods) if(t.until>G.day) s[t.k]=(s[t.k]||0)+t.v;
  for(const f of D.FIGS){ const st=G.figs[f.id]; if(st&&st.st==='alive'&&G.y>=f.a[0]&&G.y<=f.a[1]&&st.svc===c.tag) add(f.fx); }
  if(c.ruler){ s.tax+=(c.ruler.adm-3)*0.03; s.stab+=(c.ruler.adm-3)*0.08; s.mil+=(c.ruler.mil-3)*0.04; s.res+=(c.ruler.adm-3)*0.02; }
  s.lit+=c.perm.lit; s.life+=c.perm.life; s.def+=c.perm.def;
  return s;
}
ENG.mods = mods;

function recalc(G,c){
  let pop=0,n=0,area=0,coast=0;
  for(let p=0;p<N;p++) if(G.owner[p]===c.i){ pop+=G.pop[p]; n++; area+=PAREA[p]; if(PCOAST[p]) coast++; }
  c.pop=pop; c.prov=n; c.area=area; c.coast=coast;
  const s=mods(G,c); c.m=s;
  c.lit=clamp(s.lit,0,0.99);
  const effn=clamp(((c.eff==null?1:c.eff)-0.2)/0.8,0,1);
  const demo=clamp(s.demo*1.25,0,1)*clamp(0.3+0.7*effn,0,1); c.dev=demo;
  c.le=clamp(24+s.life*(0.78+0.22*effn)+26*demo,20,99);
  const dT=clamp(s.demo*1.25,0,1); const tRich=1.5+4.8*Math.pow(1-dT,1.8), tPoor=1.5+4.8*Math.pow(1-dT*0.55,1.2); let tfr=tPoor+(tRich-tPoor)*Math.pow(effn,0.8); if(['kr','jp','cn'].includes(c.cul)&&demo>0.75) tfr-=0.55; if(c.kr&&G.y>2000) tfr-=0.25; tfr+=s.tfr; c.tfr=clamp(tfr,0.6,7.5);
  if(c.tfrS==null) c.tfrS=c.tfr; if(c.leS==null) c.leS=c.le; if(c.eff==null) c.eff=1;
  c.gdppc = c.fx.gdpBase*Math.max(0.3,1+0.5*s.prod)*(0.85+0.05*c.stab)*c.eff;
  c.gdp = pop*c.gdppc;
  c.income = c.exile?0: c.gdp*0.07*Math.max(0.05,1+s.tax);
  c.expense = c.exile?0: c.income*0.42 + c.soldiers*c.gdppc*2 + c.policies.length*c.gdp*0.0025 + (c.gold<0?-c.gold*0.08:0);
  const q = (1+s.mil)*(0.7+0.1*(c.stab+3)/2)*(1+ (c.m.mil>0?0:0));
  c.qual=q; c.str = c.soldiers*q*(1+0.15*c.techs.size/40);
  c.slots = D.GOVS[c.gov].slots;
  return c;
}
ENG.recalc=recalc;

function autoPolicies(G,c){
  const av = availablePolicies(G,c).filter(id=>!c.policies.includes(id));
  // 고유 제도 우선
  av.sort((a,b)=>(D.POLICIES[b].tags?1:0)-(D.POLICIES[a].tags?1:0) || (rng(G)-.5));
  while(c.policies.length<c.slots && av.length) c.policies.push(av.shift());
}
function availablePolicies(G,c){
  return Object.keys(D.POLICIES).filter(id=>{ const p=D.POLICIES[id];
    if(p.req && !c.techs.has(p.req) && !(D.GOVS[p.req]&&c.gov===p.req)) { if(!(p.req==='chief'&&['chief','monarchy','empire','central','feudal','theocracy','aristo','absolut'].includes(c.gov))&&!(p.req==='monarchy'&&c.gov!=='tribe')) return false; }
    if(p.tags && !p.tags.includes(c.tag)) return false;
    if(p.y && (G.y<p.y[0]||G.y>p.y[1])) return false;
    if(p.flag && !c.flags[p.flag]) return false;
    return true; });
}
ENG.availablePolicies=availablePolicies;
function availableGovs(G,c){ return Object.keys(D.GOVS).filter(id=>id!=='exile'&&(!D.GOVS[id].req||c.techs.has(D.GOVS[id].req))); }
ENG.availableGovs=availableGovs;

// ── 연구 ──
function techCost(G,c,id){
  const t=TECHS[id]; const T=eraT(G.y);
  let m = D.ERA_COST[t.era];
  if(t.h>G.y) m*=Math.exp((t.h-G.y)/T); else m*=Math.max(0.12,Math.exp(-(G.y-t.h)/(2*T)));
  let know=0,alive=0; for(const o of G.C){ if(!o.alive) continue; alive++; if(o.techs.has(id)) know++; }
  m*=1-0.55*(know/Math.max(1,alive));
  if(c._nbKnow && c._nbKnow.has(id)) m*=0.75;
  return m;
}
ENG.techCost=techCost;
function availableTechs(c){ return TL.filter(t=>!c.techs.has(t.id) && t.req.every(r=>c.techs.has(r))).map(t=>t.id); }
ENG.availableTechs=availableTechs;
function resRate(G,c){ if(c.exile) return 0.3; return (0.5+0.5*Math.sqrt(c.pop/1e6))*(1+c.lit)*Math.pow(Math.max(0.2,1+c.m.res),0.6)*(0.85+0.05*(c.stab+3)) * (c.i===G.player?1.15:1); }
ENG.resRate=resRate;
function pickTech(G,c){
  const av=availableTechs(c); if(!av.length) return null;
  const sc=av.map(id=>{ let v=techCost(G,c,id)*(0.8+0.4*rng(G)); if(c.focus&&TECHS[id].cat===c.focus) v*=0.5; return [v,id]; }).sort((a,b)=>a[0]-b[0]);
  return sc[0][1];
}
function grantTech(G,c,id){
  if(c.techs.has(id)) return false;
  const add=(x)=>{ if(c.techs.has(x)) return; for(const r of TECHS[x].req) add(r); c.techs.add(x); };
  add(id); c.techDirty=true;
  if(c.cur && c.techs.has(c.cur)){ c.cur=null; c.prog=0; }
  return true;
}

// ── 군주 ──
const NAMEPOOL = D.NAMES;
function genRuler(G,c){
  const r=(a)=>a[Math.floor(rng(G)*a.length)];
  let name;
  const cul=c.cul;
  if(c.kr){
    if(['republic','junta','socialist'].includes(c.gov)) name=r(NAMEPOOL.kr)+r(NAMEPOOL.krGiven)+r(NAMEPOOL.krGiven);
    else name=r(NAMEPOOL.krTemple)+(['central','absolut','constmon','empire'].includes(c.gov)?(rng(G)<.5?'종':'조'):'왕');
  } else if(cul==='cn') name=r(NAMEPOOL.cn)+r(NAMEPOOL.cnGiven);
  else if(NAMEPOOL[cul]) { const base=r(NAMEPOOL[cul]); const n=(c._rn=(c._rn||{}),c._rn[base]=(c._rn[base]||0)+1); name= ['republic','socialist','junta'].includes(c.gov)?base:`${base} ${n}세`; }
  else name='군주';
  const age=18+Math.floor(rng(G)*25);
  return {name, born:G.y-age, adm:1+Math.floor(rng(G)*6), dip:1+Math.floor(rng(G)*6), mil:1+Math.floor(rng(G)*6), hist:false, since:G.y};
}
function histRuler(G,c){
  const L=D.RULERS[c.tag]; if(!L||G.div>35) return null;
  return L.find(r=>G.y>=r[1]&&G.y<r[2])||null;
}
function ensureRuler(G,c,init){
  const h=histRuler(G,c);
  if(h){ if(!c.ruler||c.ruler.name!==h[0]){ const old=c.ruler; c.ruler={name:h[0],born:h[3],adm:h[4],dip:h[5],mil:h[6],hist:true,since:h[1],until:h[2]}; if(!init&&c.i===G.player) chron(G,`${c.ruler.name} 즉위`,`${old?old.name+'의 뒤를 이어 ':''}${c.ruler.name}이(가) ${c.name}의 지도자가 되었다.`,'王'); } return; }
  if(!c.ruler || (c.ruler.hist && c.ruler.until && G.y>=c.ruler.until)){ c.ruler=genRuler(G,c); if(!init&&c.i===G.player) chron(G,`${c.ruler.name} 즉위`,`새 지도자 ${c.ruler.name}(${G.y-c.ruler.born}세)이(가) 나라를 이끈다.`,'王'); }
}
function mortality(age, le){ const shift=Math.max(0,(le-30))*0.55; return clamp(0.006*Math.exp(0.085*(age-30-shift)),0.002,0.6); }
ENG.mortality=mortality;

// ── 기록 ──
function chron(G,t,x,g){ G.chron.push({y:G.y,m:G.m,d:G.d,t,x,g}); if(G.chron.length>400) G.chron.shift(); }
function news(G,t,g){ G.news.push({y:G.y,m:G.m,t,g:g||'報'}); if(G.news.length>(G._newsMax||120)) G.news.shift(); }
ENG.chron=chron; ENG.news=news;
function recordHist(G){
  let wp=0; for(let p=0;p<N;p++) wp+=G.pop[p];
  const P=G.C[G.player];
  G.hist.push({y:G.y, wp, wr:interpLog(D.STATS.worldPop,G.y), pp:P.pop, gdp:P.gdppc, le:P.leS, lit:P.lit, tfr:P.tfrS, prov:P.prov, tag:P.tag});
  if(G.hist.length>2500) G.hist.splice(0, G.hist.length-2500);
}

// ── 소유권 이전 ──
function setOwner(G,p,ci){
  const o=G.owner[p]; if(o===ci) return;
  G.owner[p]=ci; G.ownVer++;
  // 진행 중 작전 정리
  G.ops=G.ops.filter(op=>!(op.p===p&&op.type==='col'));
  if(o>=0){ const c=G.C[o]; if(c.cap===p){ c.cap=-1; } }
  if(ci>=0){ const c=G.C[ci]; if(c.cap<0) c.cap=p; if(c.exile){ c.exile=false; if(c.gov==='exile') c.gov='republic'; } }
}
function fixCapitals(G){
  for(const c of G.C){ if(!c.alive) continue; if(c.cap<0||G.owner[c.cap]!==c.i){ let b=-1,bp=-1; for(let p=0;p<N;p++) if(G.owner[p]===c.i&&G.pop[p]>bp){bp=G.pop[p];b=p;} c.cap=b; } }
}
function checkDeaths(G){
  const cnt=new Int32Array(G.C.length); for(let p=0;p<N;p++) if(G.owner[p]>=0) cnt[G.owner[p]]++;
  for(const c of G.C){ if(!c.alive) continue; c.prov=cnt[c.i];
    if(cnt[c.i]===0 && !c.exile){ c.alive=false; G.wars=G.wars.filter(w=>w.a!==c.i&&w.b!==c.i);
      if(c.i===G.player){ G.gameOver={reason:'fall', y:G.y}; }
      else news(G,`${c.name} 멸망`,'亡'); } }
}

// ── 엔진 API (사건 스크립트용) ──
function api(G){
  const E = {
    get y(){ return G.y; }, get ptag(){ return G.C[G.player].tag; }, ctx:{},
    has:t=>has(G,t), isP:t=>{ const i=G.tag[t]; return i!==undefined&&i===G.player&&G.C[i].alive; }, c:t=>C(G,t),
    rnd:()=>rng(G),
    str:t=>{ const c=C(G,t); return c&&c.alive?c.str*(1+c.m.def*0.5):0; },
    stab:t=>{ const c=C(G,t); return c?c.stab:0; },
    tfr:t=>{ const c=C(G,t); return c?c.tfr:2; },
    gov_:t=>{ const c=C(G,t); return c?c.gov:null; },
    knows:(t,id)=>{ const c=C(G,t); return c&&c.techs.has(id); },
    ruler:t=>{ const c=C(G,t); if(!c) return null; if(!c.ruler){ const h=histRuler(G,c); return h?h[0]:null; } return c.ruler.name; },
    fig:id=>{ const s=G.figs[id]; const f=D.FIGS.find(x=>x.id===id); return !!(s&&s.st==='alive'&&f&&G.y>=f.a[0]-1&&G.y<=f.a[1]+1); },
    killFig:id=>{ if(G.figs[id]) G.figs[id].st='dead'; },
    flag:(t,f)=>{ const c=C(G,t); if(c) c.flags[f]=1; }, hf:(t,f)=>{ const c=C(G,t); return !!(c&&c.alive&&c.flags[f]); },
    krTag:()=>{ const P=G.C[G.player]; if(P.kr&&P.alive&&['KOREMP','JOSEON','KPG','ROK','DPRK','GORYEO'].includes(P.tag)) return P.tag; for(const t of ['KOREMP','JOSEON','KPG','ROK']) if(has(G,t)) return t; return null; },
    isExile:t=>{ const c=C(G,t); return !!(c&&c.alive&&c.exile); },
    coastal:t=>{ const c=C(G,t); return c&&c.coast>0; },
    neighbors:t=>neighbors(G,C(G,t)).map(i=>G.C[i].tag),
    weakestNeighbor:t=>{ const c=C(G,t); const ns=neighbors(G,c); if(!ns.length) return null; ns.sort((a,b)=>G.C[a].str-G.C[b].str); return G.C[ns[0]].tag; },
    atWar:(a,b)=>{ const x=C(G,a),y=C(G,b); return !!(x&&y&&findWar(G,x.i,y.i)); },
    provsIn:(t,box)=>{ const c=C(G,t); if(!c||!c.alive) return 0; let n=0; for(let p=0;p<N;p++) if(G.owner[p]===c.i&&inBox(p,box)) n++; return n; },
    news:s=>news(G,s),
    all:fn=>{ for(const c of G.C) if(c.alive) fn(c.tag); },
    mod:(t,o)=>{ const c=C(G,t); if(!c||!c.alive) return; recalc(G,c);
      if(o.gold) c.gold+=o.gold*Math.max(c.income, c.gdp*0.02);
      if(o.stab) c.stab=clamp(c.stab+o.stab,-3,3);
      if(o.army) c.soldiers=Math.max(0,c.soldiers*(1+o.army));
      if(o.pop) for(let p=0;p<N;p++) if(G.owner[p]===c.i) G.pop[p]*=Math.max(0,1+o.pop);
      if(o.lit) c.perm.lit+=o.lit; if(o.life) c.perm.life+=o.life; if(o.def) c.perm.def+=o.def;
      if(o.res){ if(!c.cur) c.cur=pickTech(G,c); if(c.cur) c.prog+=o.res*techCost(G,c,c.cur); }
    },
    tmod:(t,k,v,yrs,label)=>{ const c=C(G,t); if(!c) return; c.tmods.push({k,v,until:G.day+Math.round(yrs*365),label:label||''}); },
    tech:(t,id)=>{ const c=C(G,t); if(c&&c.alive) grantTech(G,c,id); },
    gov:(t,id)=>{ const c=C(G,t); if(!c) return; c.gov=id; c.slots=D.GOVS[id].slots; while(c.policies.length>c.slots) c.policies.pop(); if(c.i!==G.player) autoPolicies(G,c); },
    pol:(t,id)=>{ const c=C(G,t); if(!c||!c.alive||c.policies.includes(id)) return; if(c.policies.length>=D.GOVS[c.gov].slots) c.policies.shift(); c.policies.push(id); },
    unpol:(t,id)=>{ const c=C(G,t); if(c) c.policies=c.policies.filter(x=>x!==id); },
    rename:(t,name)=>{ const c=C(G,t); if(c){ news(G,`${c.name} → ${name}`,'名'); c.name=name; } },
    retag:(o,n,name,opt)=>{ const c=C(G,o); if(!c||!c.alive) return; opt=opt||{}; if(n!==o){ delete G.tag[o]; G.tag[n]=c.i; c.tag=n; }
      if(name&&name!==c.name){ news(G,`${c.name} → ${name}`,'名'); c.name=name; } if(opt.gov){ E.gov(n,opt.gov); } if(opt.col) c.col=opt.col; if(c.i===G.player){ c.ruler=null; ensureRuler(G,c); } G.ownVer++; },
    capital:(t,ll)=>{ const c=C(G,t); if(!c) return; const p=nearestProv(ll[0],ll[1],200); if(p>=0&&G.owner[p]===c.i) c.cap=p; },
    spawn:(tag,name,anchors,opt)=>spawn(G,E,tag,name,anchors,opt||{}),
    claimFree:(t,box,frac)=>{ const c=C(G,t); if(!c||!c.alive) return; const ps=[]; for(let p=0;p<N;p++) if(G.owner[p]<0&&inBox(p,box)) ps.push(p);
      const ref=c.cap>=0?c.cap:ps[0]; ps.sort((a,b)=>pdist(a,ref)-pdist(b,ref)); const k=Math.round(ps.length*(frac==null?1:frac)); for(let i=0;i<k;i++) setOwner(G,ps[i],c.i); },
    give:(f,t,box)=>{ const a=C(G,f),b=C(G,t); if(!a||!b||!a.alive) return; if(!b.alive){ b.alive=true; } for(let p=0;p<N;p++) if(G.owner[p]===a.i&&inBox(p,box)) setOwner(G,p,b.i); checkDeaths(G); },
    conquer:(att,def,o)=>conquer(G,E,att,def,o||{}),
    conquerNear:(att,ll,km,o)=>{ o=o||{}; const a=C(G,att); if(!a||!a.alive) return; const p0=nearestProv(ll[0],ll[1],400); if(p0<0) return;
      const fromC=o.from==null?null:C(G,o.from);
      const targets=[]; for(let p=0;p<N;p++){ const ow=G.owner[p]; if(ow===a.i) continue; if(fromC&&ow!==fromC.i) continue; if(pdist(p,p0)>km) continue; targets.push(p); }
      if(!targets.length) return;
      const owners=new Set(targets.map(p=>G.owner[p]).filter(x=>x>=0));
      if(!o.peaceful){ if(a.i===G.player){ for(const ow of owners) declareWar(G,a.i,ow,o.boost); return; } if(owners.has(G.player)){ declareWar(G,a.i,G.player,o.boost); } }
      for(const p of targets) if(o.peaceful||G.owner[p]!==G.player) setOwner(G,p,a.i);
      checkDeaths(G); },
    war:(a,b,o)=>{ const x=C(G,a),y=C(G,b); if(x&&y&&x.alive&&y.alive&&x!==y) declareWar(G,x.i,y.i,o&&o.boost); },
    peace:(a,b)=>{ const x=C(G,a),y=C(G,b); if(x&&y) makePeace(G,x.i,y.i,true); },
    peaceAll:(t)=>{ const c=C(G,t); if(c) for(const w of [...G.wars]) if(w.a===c.i||w.b===c.i) makePeace(G,w.a,w.b,true); },
    plague:(box,pct,sp,spct)=>{ const spc=sp?C(G,sp):null; for(let p=0;p<N;p++) if(inBox(p,box)){ const own=G.owner[p]; const k=(spc&&own===spc.i)?spct:pct; G.pop[p]*=1-k*(0.6+0.8*rng(G)); } },
    annexTo:(into,from)=>{ const a=C(G,into),b=C(G,from); if(!a||!b||!a.alive||!b.alive) return; for(let p=0;p<N;p++) if(G.owner[p]===b.i) setOwner(G,p,a.i);
      for(const id of b.techs) a.techs.add(id); a.techDirty=true;
      if(G.player===b.i){ G.player=a.i; a.mob=b.mob; a.ruler=null; ensureRuler(G,a); chron(G,`${a.name}의 일원이 되다`,`${b.name}은(는) ${a.name}에 합쳐졌다. 이제 ${a.name}을(를) 이끈다.`,'合'); }
      b.alive=false; G.wars=G.wars.filter(w=>w.a!==b.i&&w.b!==b.i); },
    exile:(t,to)=>{ const c=C(G,t),d=C(G,to); if(!c) return; for(let p=0;p<N;p++) if(G.owner[p]===c.i) setOwner(G,p,d?d.i:-1); c.exile=true; c.gov='exile'; c.soldiers=c.soldiers*0.05; G.wars=G.wars.filter(w=>w.a!==c.i&&w.b!==c.i);
      if(c.i===G.player) chron(G,'나라를 잃다',`${c.name}의 영토가 모두 ${d?d.name:'적'}에게 넘어갔다. 독립운동의 길이 시작된다.`,'亡'); },
    div:n=>{ G.div=clamp(G.div+n,0,100); }
  };
  return E;
}
ENG.api=api;

function spawn(G,E,tag,name,anchors,opt){
  if(has(G,tag)) return C(G,tag);
  let from = opt.from||'any';
  const fromIdx = Array.isArray(from)? new Set(from.filter(t=>t!=='free').map(t=>G.tag[t]).filter(x=>x!==undefined)) : null;
  const allowFree = from==='any'||from==='free'||(Array.isArray(from)&&from.includes('free'));
  const takeP = !!E.ctx.takeP;
  const allow=(p)=>{ const o=G.owner[p]; if(o<0) return allowFree; if(o===G.player&&!takeP) return false; if(from==='free') return false; if(from==='any') return true; return fromIdx.has(o); };
  // 기존 국가 객체 재사용 (같은 태그로 부활)
  let c = C(G,tag);
  if(c){ c.alive=true; c.name=name; c.exile=false; }
  else c = newCountry(G,tag,name,{gov:opt.gov,kr:opt.kr,cul:opt.cul,col:opt.col});
  c.gov=opt.gov||c.gov;
  const srcs=[]; for(const [lo,la,r] of anchors){ const p=nearestProv(lo,la,400); if(p>=0) srcs.push({ci:c.i,prov:p,r,box:opt.box}); }
  const res=claimMulti(G,srcs,(p)=>allow(p),true);
  if(!res.length){ c.alive=false; return null; }
  const losers=new Set();
  for(const [p] of res){ if(G.owner[p]>=0) losers.add(G.owner[p]); setOwner(G,p,c.i); }
  // 기술: 부모 또는 원 소유자의 기술 계승
  const parent = opt.techsFrom? C(G,opt.techsFrom) : (losers.size? G.C[[...losers][0]] : null);
  if(parent) for(const id of parent.techs) c.techs.add(id); else giveInitialTechs(G,c,G.y,300);
  c.techDirty=true; if(parent){ c.eff=parent.eff*0.9; c.tfrS=parent.tfrS; c.leS=parent.leS; c.inst=clamp(parent.inst+(rng(G)-.6)*0.25,0.35,1.15); }
  recalc(G,c); c.soldiers=c.pop*0.012*(opt.army||1); c.gold=c.income*0.4; c.stab=1; autoPolicies(G,c);
  const p0=nearestProv(anchors[0][0],anchors[0][1],400); c.cap=(p0>=0&&G.owner[p0]===c.i)?p0:res[0][0];
  checkDeaths(G); fixCapitals(G);
  if(losers.has(G.player)) chron(G,`${name}의 독립`,`${name}이(가) 우리 영토 일부에서 일어섰다.`,'裂');
  news(G,`${name} 등장`,'興');
  return c;
}
function conquer(G,E,att,def,o){
  const a=C(G,att), d=C(G,def); if(!a||!d||!a.alive||!d.alive||a===d) return;
  if(d.i===G.player || a.i===G.player){ declareWar(G,a.i,d.i,o.boost); return; }
  let ps=[]; for(let p=0;p<N;p++) if(G.owner[p]===d.i && (!o.box||inBox(p,o.box))) ps.push(p);
  if(o.share!=null && !o.box){ const ref=a.cap>=0?a.cap:ps[0]; ps.sort((x,y)=>pdist(x,ref)-pdist(y,ref)); ps=ps.slice(0,Math.round(ps.length*o.share)); }
  for(const p of ps){ setOwner(G,p,a.i); G.pop[p]*=0.93; }
  if(ps.length) news(G,`${a.name}, ${d.name}의 영토 ${ps.length}곳 장악`,'戰');
  checkDeaths(G); fixCapitals(G);
}

// ── 이웃 ──
function neighbors(G,c){
  if(!c) return [];
  const s=new Set(); const nav=c.m?c.m.naval:0;
  for(let p=0;p<N;p++) if(G.owner[p]===c.i){ for(const q of ADJ[p]){ const o=G.owner[q]; if(o>=0&&o!==c.i) s.add(o);} if(nav>=1) for(const q of SEA[p]){ const o=G.owner[q]; if(o>=0&&o!==c.i) s.add(o);} }
  return [...s];
}
ENG.neighbors=neighbors;

// ── 전쟁 ──
function findWar(G,a,b){ return G.wars.find(w=>(w.a===a&&w.b===b)||(w.a===b&&w.b===a)); }
ENG.findWar=findWar;
function declareWar(G,a,b,boost){
  if(a===b||findWar(G,a,b)) return;
  const A=G.C[a],B=G.C[b]; if(!A.alive||!B.alive||A.exile||B.exile) return;
  const w={a,b,since:G.day,score:0,ta:-1,tb:-1,pa:0,pb:0,ex:0};
  G.wars.push(w);
  if(boost&&boost>1) A.tmods.push({k:'mil',v:boost-1,until:G.day+365*4,label:'원정군'});
  if(a===G.player||b===G.player){ G.stats.wars++; chron(G,`${A.name} ↔ ${B.name} 전쟁`,`${A.name}이(가) ${B.name}에 선전포고했다.`,'戰'); }
  news(G,`${A.name}, ${B.name}에 선전포고`,'戰');
}
function makePeace(G,a,b,silent){
  const w=findWar(G,a,b); if(!w) return;
  G.wars=G.wars.filter(x=>x!==w);
  G.C[a].truce[b]=G.day+365*5; G.C[b].truce[a]=G.day+365*5;
  if(a===G.player||b===G.player) chron(G,`${G.C[a].name}·${G.C[b].name} 강화`,`전쟁이 끝났다.`,'和');
  news(G,`${G.C[a].name}·${G.C[b].name} 강화`,'和');
}
ENG.declareWar=declareWar; ENG.makePeace=makePeace;
function frontTargets(G,att,def){
  const A=G.C[att]; const nav=A.m?A.m.naval:0; const out=new Set();
  let coastOwn=false;
  for(let p=0;p<N;p++) if(G.owner[p]===att){ if(PCOAST[p]) coastOwn=true; for(const q of ADJ[p]) if(G.owner[q]===def) out.add(q); if(nav>=1) for(const q of SEA[p]) if(G.owner[q]===def) out.add(q); }
  if(!out.size && nav>=3 && coastOwn){ for(let p=0;p<N;p++) if(G.owner[p]===def&&PCOAST[p]) out.add(p); }
  return [...out];
}
ENG.frontTargets=frontTargets;
function pickTarget(G,att,def){
  const f=frontTargets(G,att,def); if(!f.length) return -1;
  const A=G.C[att]; const ref=A.cap>=0?A.cap:f[0];
  f.sort((x,y)=>pdist(x,ref)-pdist(y,ref));
  return f[Math.floor(rng(G)*Math.min(3,f.length))];
}
function warDay(G){
  if(!G.wars.length) return;
  const nW=new Int32Array(G.C.length); for(const w of G.wars){ nW[w.a]++; nW[w.b]++; }
  for(const w of [...G.wars]){
    const A=G.C[w.a],B=G.C[w.b]; if(!A.alive||!B.alive){ G.wars=G.wars.filter(x=>x!==w); continue; }
    const Sa=Math.max(1,A.str/nW[w.a]), Sb=Math.max(1,B.str/nW[w.b]);
    // 공방 진척
    for(const side of [0,1]){
      const att=side?w.b:w.a, def=side?w.a:w.b, Sx=side?Sb:Sa, Sy=side?Sa:Sb; const D_=G.C[def];
      let t=side?w.tb:w.ta;
      if(t<0||G.owner[t]!==def){ t=pickTarget(G,att,def); if(side) {w.tb=t; w.pb=0;} else {w.ta=t; w.pa=0;} }
      if(t<0) continue;
      const dfn=Math.max(0,D_.m.def);
      const a_=Math.pow(Sx,0.6), b_=Math.pow(Sy*(1+dfn)*1.15,0.6);
      const ratio=a_/(a_+b_);
      let pr=0.06*ratio*ratio*2/(1+PAREA[t]/80000)/(1+0.5*dfn);
      if(side) w.pb+=pr; else w.pa+=pr;
      if((side?w.pb:w.pa)>=1){
        setOwner(G,t,att); G.pop[t]*=0.94;
        w.score+= side?-1:1;
        if(att===G.player) G.stats.conquered++;
        if(side){w.tb=-1;w.pb=0;} else {w.ta=-1;w.pa=0;}
        if(att===G.player||def===G.player) news(G,`${G.C[att].name}, ${PNAME[t]} 점령`,'戰');
        G.C[def].soldiers*=0.97;
        if(w.limited && !side){ w.got=(w.got||0)+1; if(w.got>=w.limited || G.C[def].prov<=1){ checkDeaths(G); fixCapitals(G); makePeace(G,w.a,w.b); continue; } }
        checkDeaths(G); fixCapitals(G);
        if(!G.C[def].alive) return;
      }
    }
    // 소모
    const la=0.0008*Math.sqrt(clamp(Sb/Sa,0.2,5)), lb=0.0006*Math.sqrt(clamp(Sa/Sb,0.2,5));
    A.soldiers*=1-la; B.soldiers*=1-lb;
  }
}

// ── 개척 ──
function canColonize(G,c,p){
  if(G.owner[p]!==-1) return false;
  if(G.ops.some(o=>o.p===p)) return false;
  const nav=c.m?c.m.naval:0;
  for(const q of ADJ[p]) if(G.owner[q]===c.i) return true;
  if(nav>=1) for(const q of SEA[p]) if(G.owner[q]===c.i) return true;
  if(nav>=3 && PCOAST[p] && c.coast>0 && (c.i===G.player || (G.y>=1450&&G.y<1914))) return true;
  return false;
}
function colonizeCost(G,c,p){ return Math.max(c.income*0.12, c.gdp*0.004) * (1+PAREA[p]/60000); }
function colonizeDays(G,c,p){ const native=G.pop[p]/(Kprov(G,p)+1); return Math.round(150*(1+PAREA[p]/50000)*(1+native*0.6)/Math.max(0.3,1+c.m.colon)); }
ENG.canColonize=canColonize; ENG.colonizeCost=colonizeCost; ENG.colonizeDays=colonizeDays;
function startColonize(G,c,p){
  if(!canColonize(G,c,p)) return false; const cost=colonizeCost(G,c,p); if(c.gold<cost) return false;
  c.gold-=cost; G.ops.push({type:'col',p,by:c.i,prog:0,days:colonizeDays(G,c,p)}); return true;
}
ENG.startColonize=startColonize;
function opsDay(G){
  for(const op of [...G.ops]){
    if(op.type!=='col') continue;
    if(G.owner[op.p]!==-1||!G.C[op.by].alive){ G.ops=G.ops.filter(x=>x!==op); continue; }
    op.prog+=1/op.days;
    if(op.prog>=1){ setOwner(G,op.p,op.by); G.ops=G.ops.filter(x=>x!==op); if(op.by===G.player){ G.stats.colonized++; news(G,`${PNAME[op.p]} 개척 완료`,'拓'); } }
  }
}

// ── AI ──
function aiMonth(G,c){
  if(c.i===G.player||!c.alive||c.exile) return;
  // 동원율
  c.mob = (0.008 + 0.006*c.aggr + (G.wars.some(w=>w.a===c.i||w.b===c.i)?0.006:0))*(c.gold<0?0.7:1);
  if(c.gold<-c.income && c.policies.length>1 && rng(G)<0.1) c.policies.pop();
  // 정책
  if(c.policies.length<c.slots && rng(G)<0.05) autoPolicies(G,c);
  // 개척
  const yr=G.y; const eraF = yr<-1500?0.6: yr<1450?0.35 : yr<1914?1.2 : 0.05;
  if(c.gold>0 && rng(G)<0.04*eraF*(1+c.m.colon) && G.ops.filter(o=>o.by===c.i).length<2){
    const pre=G.y<1550, cap=pre? 14+c.techs.size/3 : 1e9;
    const cand=[]; if(c.prov<cap) for(let p=0;p<N;p++) if(G.owner[p]===-1 && (!pre || (PTER[p]!==2&&PTER[p]!==3&&PTER[p]!==1&&Math.abs(PLAT[p])<55)) && canColonize(G,c,p)) cand.push(p);
    if(cand.length){ const ref=c.cap>=0?c.cap:cand[0]; cand.sort((a,b)=>pdist(a,ref)-pdist(b,ref)); startColonize(G,c,cand[Math.floor(rng(G)*Math.min(4,cand.length))]); }
  }
  // 전쟁 선포
  const myWars=G.wars.filter(w=>w.a===c.i||w.b===c.i);
  if(!myWars.length && rng(G) < 0.0006*(0.3+c.aggr)*(G.div<15?0.5:1+G.div/15)*(G.y>1950?0.25:1)){
    const ns=neighbors(G,c).filter(o=>!(c.truce[o]>G.day)&&!G.C[o].exile);
    const weak=ns.filter(o=>G.C[o].str*(1+G.C[o].m.def)*2 < c.str && (o!==G.player || rng(G)<0.5));
    if(weak.length){ const t=weak[Math.floor(rng(G)*weak.length)]; declareWar(G,c.i,t); const w=findWar(G,c.i,t); if(w) w.limited=Math.max(1,Math.floor(G.C[t].prov*(0.15+0.25*rng(G)))); }
  }
  // 강화
  for(const w of myWars){
    const other = w.a===c.i?w.b:w.a; if(other===G.player) continue;
    const yrs=(G.day-w.since)/365; const my = w.a===c.i?w.score:-w.score;
    if(rng(G) < 0.012+0.012*yrs+(my<-3?0.05:0)+(my>=2+G.C[other].prov/8?0.12:0)) makePeace(G,w.a,w.b);
  }
}
// AI가 플레이어에게 강화를 제의
function aiOfferPeace(G){
  for(const w of G.wars){
    if(w.a!==G.player&&w.b!==G.player) continue;
    const ai = w.a===G.player?w.b:w.a; const aiScore = w.a===ai?w.score:-w.score; const yrs=(G.day-w.since)/365;
    if((aiScore<=-2 && rng(G)<0.08) || (yrs>3 && rng(G)<0.04)) { G.queue.push({kind:'peace', from:ai}); return; }
  }
}
ENG.playerPeaceAccept = function(G, ai){
  const w=findWar(G,G.player,ai); if(!w) return true;
  const aiScore = w.a===ai?w.score:-w.score; const yrs=(G.day-w.since)/365;
  const A=G.C[ai], P=G.C[G.player];
  let p=0.15+0.12*yrs-0.08*aiScore+(P.str>A.str?0.15:-0.1);
  return rng(G)<clamp(p,0.03,0.95);
};

// ── 인물 ──
function figMonth(G){
  for(const f of D.FIGS){
    let s=G.figs[f.id];
    if(!s){
      if(G.y>=f.b && G.y<f.d){
        const owner=f.tags.find(t=>has(G,t));
        if(!owner && f.tags.length){ G.figs[f.id]={st:'unborn'}; continue; }
        const okP = G.div<30 || rng(G) > (G.div-30)/90;
        if(!okP){ G.figs[f.id]={st:'unborn'}; if(owner&&G.tag[owner]===G.player) news(G,`역사가 달라져 ${f.n}은(는) 태어나지 않았다`,'人'); continue; }
        const dy = G.div<40 ? f.d : f.d + Math.round((rng(G)-0.5)*20);
        G.figs[f.id]={st:'alive',dy,svc:owner||null};
        const P=G.C[G.player];
        if(owner===P.tag) chron(G,`${f.n} 탄생`,`${f.n}이(가) 태어났다. 훗날 ${f.role}(으)로 이름을 남길 아이다. ${f.x}`,f.g);
        else if(!f.tags.length || (G.C[G.tag[owner]]&&G.C[G.tag[owner]].pop>3e6)) news(G,`${f.n} 탄생 (${owner?G.C[G.tag[owner]].name:'세계'})`,'人');
      }
      continue;
    }
    if(s.st==='alive'){
      // 소속 갱신 (국가가 개칭·멸망한 경우)
      if(!s.svc||!has(G,s.svc)){ s.svc=f.tags.find(t=>has(G,t))||null; }
      if(G.y>=s.dy){ s.st='dead'; const P=G.C[G.player]; if(s.svc===P.tag) chron(G,`${f.n} 사망`,`${f.n}이(가) 세상을 떠났다.`,f.g); }
      else if(G.y===f.a[0] && G.m===1 && s.svc===G.C[G.player].tag) chron(G,`${f.n}, 역사의 무대에 서다`,f.x,f.g);
    }
  }
}

// ── 사건 처리 ──
function resolveTag(G,E,t){ if(t==='*KOREA') return E.krTag(); return t; }
function evSubject(G,E,ev){
  if(ev.at){ const p=nearestProv(ev.at[0],ev.at[1],300); return p>=0&&G.owner[p]>=0?G.C[G.owner[p]].tag:null; }
  return ev.tag?resolveTag(G,E,ev.tag):null;
}
function applyOption(G,E,ev,opt,subj,byPlayer){
  try { E.ctx.takeP = byPlayer && ev.at && opt.h; opt.fx(E,subj); } catch(e){ console.warn('event fx',ev.t,e); }
  E.ctx.takeP=false;
  if(byPlayer){ const dv = opt.dv!=null?opt.dv:(opt.h?0:4); if(dv) E.div(dv); if(opt.h) G.stats.choicesH++; else G.stats.choicesA++; }
  checkDeaths(G); fixCapitals(G);
}
ENG.applyOption=applyOption;
function runAfter(G,E,ev){ if(ev.after){ try{ ev.after(E); }catch(e){ console.warn(e); } checkDeaths(G); } }
ENG.runAfter=runAfter;
function processEvent(G,E,ev){
  // 조건
  let ok=true; try{ ok = !ev.cond || ev.cond(E); }catch(e){ ok=false; }
  if(!ok) return;
  if(ev.maj && G.div>55 && rng(G) < (G.div-55)/45){ news(G,`역사의 흐름이 바뀌어 「${ev.t}」은(는) 일어나지 않았다`,'變'); return; }
  const P=G.C[G.player];
  // 플레이어가 방어자인 경우의 대체 사건
  if(ev.pAlt){ const pt=resolveTag(G,E,ev.pAlt.tag); if(pt && pt===P.tag){ G.queue.push({kind:'event',ev,alt:true,subj:pt}); return; } }
  const subj=evSubject(G,E,ev);
  if(subj && subj===P.tag){ G.queue.push({kind:'event',ev,subj}); return; }
  if(ev.ask && P.alive && P.prov>0){
    const affected = ev.ask==='all' || (()=>{ for(let p=0;p<N;p++) if(G.owner[p]===G.player&&inBox(p,ev.ask)) return true; return false; })();
    if(affected){ G.queue.push({kind:'event',ev,ask:true,subj:P.tag}); return; }
  }
  // AI 또는 세계 사건: 역사적 선택 자동 적용
  if(ev.tag && !ev.at && !ev.tag.startsWith('*') && !has(G,ev.tag)) return;
  if(ev.tag==='*KOREA' && !subj) return;
  const opt = ev.o.find(o=>o.h)||ev.o[0];
  applyOption(G,E,ev,opt,subj,false);
  runAfter(G,E,ev);
  const big = ev.maj || !ev.tag;
  if(big) chron(G, ev.t, ev.x, ev.cat);
  news(G, ev.t, ev.cat);
}

function randomEvent(G,E){
  const P=G.C[G.player]; if(!P.alive||P.exile) return;
  const pool=D.RANDOM.filter(r=>(!r.minY||G.y>=r.minY)&&(!r.maxY||G.y<=r.maxY)&&(!r.c||(()=>{try{return r.c(E);}catch(e){return false;}})()));
  if(!pool.length) return;
  let tot=pool.reduce((a,r)=>a+r.w,0), x=rng(G)*tot; let pick=pool[0];
  for(const r of pool){ x-=r.w; if(x<=0){pick=r;break;} }
  G.queue.push({kind:'event',ev:pick,random:true,subj:P.tag});
}

// ── 일·월·년 진행 ──
ENG.tick = function(G){
  if(G.over) return;
  const E=G._E||(G._E=api(G));
  // 날짜
  G.d++; G.day++;
  let newMonth=false,newYear=false;
  if(G.d>MDAYS[G.m-1]){ G.d=1; G.m++; newMonth=true; if(G.m>12){ G.m=1; G.y++; if(G.y===0) G.y=1; newYear=true; } }
  // 연구 (매일)
  for(const c of G.C){
    if(!c.alive||!c.m) continue;
    if(!c.cur || c.techs.has(c.cur)){ c.cur = (c.i===G.player && c.queueT && c.queueT.length)? c.queueT.shift() : pickTech(G,c); c.prog=0; c._cost=null; }
    if(!c.cur) continue;
    c.prog += c._rr||0;
    if(c._cost==null) c._cost=techCost(G,c,c.cur);
    if(c.prog>=c._cost){ const t=TECHS[c.cur]; c.techs.add(c.cur); c.techDirty=true; c.prog=0; c._cost=null;
      if(c.i===G.player){ chron(G,`${t.n} 습득`,t.d,D.CATS[t.cat].g); news(G,`기술 습득: ${t.n}`,'技'); }
      else if(t.h>G.y+30 && c.pop>2e6) news(G,`${c.name}, 시대를 앞선 기술 「${t.n}」 습득`,'技');
      c.cur=null; }
  }
  opsDay(G);
  warDay(G);
  // 사건
  const key=dkey(G.y,G.m,G.d);
  while(G.evPtr<EVS.length && EVS[G.evPtr].k<=key){ processEvent(G,E,EVS[G.evPtr]); G.evPtr++; }
  if(newMonth) monthly(G,E);
  if(newYear) yearly(G,E);
  if(G.y>=2100 && !G.over){ G.over=true; G.gameOver={reason:'end',y:2100}; }
};

function monthly(G,E){
  const yr=G.y;
  // 이웃의 지식 (기술 확산)
  for(const c of G.C){ if(!c.alive) continue; recalc(G,c); }
  // 인구
  for(let p=0;p<N;p++){
    const o=G.owner[p]; const K=Kprov(G,p); let r;
    if(o>=0){ const c=G.C[o]; const surv=clamp(0.64+(c.leS-28)*0.011,0.3,0.995); const gen=26+30*c.dev*c.dev; r=Math.log(c.tfrS*surv/2.05)/gen + (c.m.growth||0); }
    else r=0.008;
    let P=G.pop[p];
    if(r>0){ if(P<K) P+=P*r*(1-(P/K)*(P/K))/12; else P-=(P-K)*0.04/12; }
    else { P+=P*r/12; if(P>K) P-=(P-K)*0.04/12; }
    G.pop[p]=Math.max(10,P);
  }
  // 국가 경제·군대·안정
  for(const c of G.C){
    if(!c.alive) continue;
    c.tmods=c.tmods.filter(t=>t.until>G.day);
    recalc(G,c);
    c.tfrS+=(c.tfr-c.tfrS)*0.006; c.leS+=(c.le-c.leS)*0.008;
    const inst = clamp((c.i===G.player?Math.max(c.inst,0.9):c.inst) + (GOV_INST[c.gov]||0) + c.policies.reduce((a,id)=>a+(POL_INST[id]||0),0),0.3,1.25);
    c.instE=inst;
    const effT = G.y<1800 ? 0.85+0.15*c.lit : clamp(inst*(0.2+0.8*c.lit*c.lit)+0.03*c.stab,0.12,1.2);
    c.eff+=(effT-c.eff)*(effT>c.eff?0.0035:0.002);
    c._rr=resRate(G,c);
    c.gold += (c.income-c.expense)/12;
    const atWar=G.wars.some(w=>w.a===c.i||w.b===c.i);
    const target=c.pop*c.mob*Math.max(0.2,1+c.m.manp);
    if(c.soldiers<target){ if(c.gold>0||c.soldiers<target*0.4) c.soldiers+=(target-c.soldiers)*0.06; }
    if(c.gold< -3*Math.max(c.income,1)){ c.gold=0; c.stab=clamp(c.stab-1,-3,3); if(c.i===G.player) chron(G,'국가 파산','빚을 갚지 못해 채무를 탕감했다. 신용과 민심이 크게 흔들린다.','債'); }
    else c.soldiers-=(c.soldiers-target)*0.08;
    let stT = c.m.stab + (atWar?-0.4:0) + (c.gold< -c.income?-0.8:0) - Math.max(0,(c.prov-25)/60) + (c.exile?0.5:0);
    stT=clamp(stT,-3,3);
    c.stab += (stT-c.stab)*0.03;
    c.stab=clamp(c.stab,-3,3);
    if(c.i!==G.player) aiMonth(G,c);
    // AI 반란
    if(c.i!==G.player && c.stab<-1.8 && c.prov>6 && rng(G)<0.01){ rebel(G,c); }
  }
  // 이웃 지식 캐시 (분기마다)
  if(G.m%3===0){ for(const c of G.C){ if(!c.alive) continue; const s=new Set(); for(const n of neighbors(G,c)) for(const id of G.C[n].techs) s.add(id); c._nbKnow=s; } }
  // 플레이어 군주
  const P=G.C[G.player];
  if(P.alive){
    ensureRuler(G,P);
    const R=P.ruler;
    if(R && !R.hist){ const age=G.y-R.born; const rep=['republic','junta','socialist'].includes(P.gov)&&!P.kr?1:0;
      if(rng(G) < mortality(age,P.leS)/12 || (['republic'].includes(P.gov) && G.y-R.since>=5 && G.m===3)){
        const old=R.name; P.ruler=genRuler(G,P); chron(G,`${P.ruler.name}, 지도자가 되다`, P.gov==='republic'?`${old}의 임기가 끝나고 ${P.ruler.name}이(가) 선출되었다.`:`${old}이(가) ${age}세로 세상을 떠났다. ${P.ruler.name}이(가) 뒤를 잇는다.`,'王'); }
    }
  }
  figMonth(G);
  aiOfferPeace(G);
  // 무작위 사건 (평균 약 2년에 1번)
  if(rng(G)<(1/28)*(G.y<-1000?0.08:G.y<500?0.3:G.y<1500?0.6:1)) randomEvent(G,E);
  fixCapitals(G);
}
function rebel(G,c){
  const ps=[]; for(let p=0;p<N;p++) if(G.owner[p]===c.i&&p!==c.cap) ps.push(p);
  if(ps.length<4) return;
  const far=ps.sort((a,b)=>pdist(b,c.cap)-pdist(a,c.cap)).slice(0,Math.max(2,Math.floor(ps.length*0.2)));
  const tag='REB'+G.C.length; const r=newCountry(G,tag,`${c.name.replace(/\s*\(.*\)/,'')} 반란 세력`,{gov:'monarchy',cul:c.cul,kr:c.kr});
  for(const id of c.techs) r.techs.add(id); r.techDirty=true;
  for(const p of far) setOwner(G,p,r.i);
  recalc(G,r); r.soldiers=r.pop*0.015; r.cap=far[0]; c.stab=Math.min(3,c.stab+1.5);
  news(G,`${c.name}에서 반란 — ${r.name} 독립`,'亂');
}
function renormK(G){
  // 세계 부양력 총합 = 실제 인구 × 여유 × (세계 평균 기술 계수)
  const save=G.kscale; G.kscale=1; let ks=0, tfw=0, pw_=0;
  for(let p=0;p<N;p++){ ks+=Kprov(G,p); const o=G.owner[p]; if(o>=0){ const c=G.C[o]; tfw+=G.pop[p]*(c._tf||1); pw_+=G.pop[p]; } }
  const avgTF = pw_>0? clamp(tfw/pw_,0.5,2.5):1;
  G.kscale = interpLog(D.STATS.worldPop,G.y)*headroom(G.y)*avgTF/ks;
  if(!isFinite(G.kscale)) G.kscale=save;
}
ENG.renormK=renormK;
function yearly(G,E){
  renormK(G);
  recordHist(G);
  const P=G.C[G.player];
  // 1in8b 풍 통계 문장 (10년마다)
  if(G.y%10===0 && P.alive && P.pop>0){
    const u5=interp(D.STATS.u5mort,G.y);
    const myU5 = clamp(0.5-(P.leS-24)*0.0085,0.003,0.5);
    chron(G,`${fmtYear(G.y)}의 ${P.name}`, `인구 ${fmtPop(P.pop)}. 기대수명 ${P.leS.toFixed(0)}세, 글을 읽는 사람 ${(P.lit*100).toFixed(0)}%. 이 나라에서 태어난 아이 100명 중 ${Math.round(myU5*100)}명은 다섯 살을 넘기지 못한다 (실제 세계 평균 ${Math.round(u5*100)}명).`,'統');
  }
  // 오래된 교전 정리
}
function fmtPop(n){ if(n>=1e8) return (n/1e8).toFixed(n>=1e9?1:2).replace(/\.?0+$/,'')+'억 명'; if(n>=1e4) return Math.round(n/1e4).toLocaleString()+'만 명'; return Math.round(n).toLocaleString()+'명'; }
ENG.fmtPop=fmtPop;

// ── 플레이어 행동 ──
ENG.act = {
  setResearch(G,id){ const P=G.C[G.player]; if(availableTechs(P).includes(id)){ if(P.cur!==id){ P.cur=id; P.prog=0; P._cost=null; } return true; } return false; },
  setFocus(G,cat){ G.C[G.player].focus=cat; },
  setMob(G,v){ G.C[G.player].mob=v; },
  setGov(G,id){ const P=G.C[G.player]; if(!availableGovs(G,P).includes(id)||P.gov===id) return false; const cost=P.income*0.5; if(P.gold<cost) return false; P.gold-=cost; P.gov=id; P.stab=clamp(P.stab-1.5,-3,3); P.slots=D.GOVS[id].slots; while(P.policies.length>P.slots) P.policies.pop(); chron(G,`정체 변경: ${D.GOVS[id].n}`,D.GOVS[id].d,'政'); G.div=clamp(G.div+2,0,100); recalc(G,P); return true; },
  togglePolicy(G,id){ const P=G.C[G.player]; if(P.policies.includes(id)){ P.policies=P.policies.filter(x=>x!==id); P.stab=clamp(P.stab-0.3,-3,3); return true; }
    if(P.policies.length>=D.GOVS[P.gov].slots) return false; if(!availablePolicies(G,P).includes(id)) return false; const cost=P.income*0.15; if(P.gold<cost) return false; P.gold-=cost; P.policies.push(id); chron(G,`제도 시행: ${D.POLICIES[id].n}`,D.POLICIES[id].d,'政'); recalc(G,P); return true; },
  colonize(G,p){ const P=G.C[G.player]; const ok=startColonize(G,P,p); if(ok){ G.div=clamp(G.div+0.15,0,100); } return ok; },
  declareWar(G,ti){ const P=G.C[G.player]; if(P.truce[ti]>G.day) return false; if(findWar(G,G.player,ti)) return false; declareWar(G,G.player,ti); P.stab=clamp(P.stab-0.5,-3,3); G.div=clamp(G.div+2,0,100); return true; },
  target(G,p){ const o=G.owner[p]; const w=findWar(G,G.player,o); if(!w) return false; const side = w.a===G.player?0:1; if(!frontTargets(G,G.player,o).includes(p)) return false; if(side){ w.tb=p; w.pb=0; } else { w.ta=p; w.pa=0; } return true; },
  offerPeace(G,ti){ const P=G.C[G.player]; if(P.lastPeaceAsk>G.day-180) return 'wait'; P.lastPeaceAsk=G.day; if(ENG.playerPeaceAccept(G,ti)){ makePeace(G,G.player,ti); return 'ok'; } return 'no'; },
  develop(G,p){ const P=G.C[G.player]; if(G.owner[p]!==G.player) return false; const cost=P.income*0.1; if(P.gold<cost) return false; P.gold-=cost; G.pop[p]*=1.04; return true; },
  switchTo(G,ci){ G.player=ci; const c=G.C[ci]; c.ruler=null; ensureRuler(G,c,true); c.mob=c.mob||0.012; G.gameOver=null; G.over=false; chron(G,`${c.name}으로 이어가다`,`새로운 나라의 역사를 이끈다.`,'史'); }
};

// ── 지표 ──
ENG.worldPop=function(G){ let s=0; for(let p=0;p<N;p++) s+=G.pop[p]; return s; };
ENG.provPop=(G,p)=>G.pop[p];
ENG.Kprov=Kprov;
ENG.has=has; ENG.C=C; ENG.rng=rng; ENG.inBox=inBox; ENG.expectedTech=expectedTech;

// ── 저장 / 불러오기 ──
ENG.save=function(G){
  const o=Object.assign({},G); delete o._E;
  o.owner=Array.from(G.owner); o.pop=Array.from(G.pop,v=>Math.round(v));
  o.C=G.C.map(c=>{ const x=Object.assign({},c); x.techs=[...c.techs]; delete x.fx; delete x.m; delete x._nbKnow; return x; });
  o.queue=G.queue.filter(q=>q.kind==='peace');
  return JSON.stringify(o);
};
ENG.load=function(s){
  const o=JSON.parse(s); o.owner=Int16Array.from(o.owner); o.pop=Float64Array.from(o.pop);
  o.C.forEach(c=>{ c.techs=new Set(c.techs); c.techDirty=true; });
  o.queue=o.queue||[];
  for(const c of o.C) if(c.alive) recalc(o,c);
  return o;
};
})(typeof window!=='undefined'?window:globalThis);
