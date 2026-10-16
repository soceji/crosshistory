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
  const taken = new Map(); ENG._taken=taken;
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

const PNAME_CITY=new Set(ENG._taken.keys());
// ── 지하자원 배치 (실제 매장지 → 가장 가까운 지방) ──
const PRES = Array.from({length:N},()=>[]);
const PRESN = Array.from({length:N},()=>[]);
for(const [r,lo,la,nm] of D.DEPOSITS){ const p=nearestProv(lo,la,320); if(p>=0){ PRES[p].push(r); PRESN[p].push(nm); } }
// ── 지진대·화산 ──
const PSEIS = new Float32Array(N), PSEISZ = new Int16Array(N).fill(-1);
D.SEISMIC.forEach(([nm,b,rate],k)=>{ let n=0; for(let i=0;i<N;i++) if(inBox(i,b)) n++; for(let i=0;i<N;i++) if(inBox(i,b)){ const v=rate/Math.max(1,n); if(v>PSEIS[i]){ PSEIS[i]=v; PSEISZ[i]=k; } } });
const VPROV = D.VOLCANOES.map(v=>nearestProv(v[1],v[2],300));
// ── 항구 적합도: 해안선 길이 · 바다 이웃 · 위도(결빙) · 역사적 도시 ──
const PSUIT = new Float32Array(N), PCOASTLEN=new Uint16Array(N);
for(let i=0;i<W*Hh;i++){ const id=cellId[i]; if(!id||id===65535) continue; const x=i%W,y=(i/W)|0; const nb=[y*W+(x+1)%W,y*W+(x-1+W)%W,y>0?i-W:-1,y<Hh-1?i+W:-1]; if(nb.some(j=>j>=0&&cellId[j]===0)) PCOASTLEN[id-1]++; }
for(let p=0;p<N;p++){ if(!PCOAST[p]){ PSUIT[p]=0; continue; } const a=Math.abs(PLAT[p]);
  let v=0.2+Math.min(1,PCOASTLEN[p]/22)*0.4+Math.min(6,SEA[p].length)*0.05+(PNAME_CITY.has(p)?0.15:0)-(a>62?0.35:a>52?0.12:0)-(PTER[p]===1?0.05:0);
  PSUIT[p]=Math.max(0.05,Math.min(1,v)); }
ENG.map = {W, H:Hh, N, cellId, PLON, PLAT, PAREA, PTER, PCOAST, ADJ, SEA, PNAME, PRES, PRESN, PSEIS, PSEISZ, VPROV, PSUIT, lon0:M.lon0, lat0:M.lat0, res:M.res, nearestProv, hav};

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

// 중세 이후 동아시아(중국 본토·일본 열도)의 공터를 가까운 나라로 채운다
const GAP_BOXES=[[97,20,123,42.5],[129.5,30.5,142.5,41.6]];
// 중세 이후: 일본 열도(쓰시마·남쪽 섬·홋카이도 포함)는 일본, 제주도는 고려·조선·대한민국
function fixIslands(G,eraIdx){
  const jp={2:'HEIAN',3:'MUROMACHI',4:'JAPAN',5:'JAPAN'}[eraIdx], kr={2:'GORYEO',3:'JOSEON',4:'JOSEON',5:'ROK'}[eraIdx];
  const J=C(G,jp), K=C(G,kr);
  for(let p=0;p<N;p++){ const lo=PLON[p], la=PLAT[p];
    const isJp=(lo>=129.6&&la>=29.5&&la<=41.6&&!(lo<130.5&&la>35))||(lo>=139.3&&la>41.6&&la<=45.7)||(lo>=129.1&&lo<=129.6&&la>=34&&la<=34.8);
    if(J&&isJp&&G.owner[p]!==J.i){ const o=G.owner[p]; if(o<0||!['RUSSIA','USSR','JURCHEN','QING','CCP','ROC','JOSEON','GORYEO','ROK','DPRK'].includes(G.C[o].tag)) G.owner[p]=J.i; }
    if(K&&lo>=126&&lo<=127.1&&la>=33&&la<=33.7) G.owner[p]=K.i; }
}
function fillGaps(G){
  for(const box of GAP_BOXES){
    let frontier=[]; for(let p=0;p<N;p++) if(G.owner[p]>=0&&inBox(p,box)) frontier.push(p);
    for(let it=0;it<60&&frontier.length;it++){ const nf=[];
      for(const p of frontier){ for(const q of ADJ[p].concat(SEA[p])) if(G.owner[q]<0&&inBox(q,box)){ G.owner[q]=G.owner[p]; nf.push(q); } }
      frontier=nf; }
  }
}
// ── 게임 초기화 ──
ENG.newGame = function(eraIdx, playerTag, seed){
  const era = D.ERAS[eraIdx];
  const G = { v:1, era:eraIdx, y:era.y, m:era.m, d:era.d, day:0, seed:seed||((Math.random()*1e9)|0),
    owner:new Int16Array(N).fill(-1), pop:new Float64Array(N), C:[], tag:{}, player:-1, armies:[], nextArmy:1, battles:[], sieges:{}, autoBattle:false, div:0, evPtr:0, fired:{}, figs:{},
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
  G.C.forEach(c=>{ c.inst=clamp(c.inst+[-0.08,0.08,0.3][c.tl],0.35,1.15); c.eff = era.y>=1800 ? [0.33,0.6,1][c.tl] : [0.85,0.95,1][c.tl]; recalc(G,c); c.soldiers = c.pop*0.0055*c.armyMul; c.gold = c.income*0.5; autoPolicies(G,c); c.stab=1; recalc(G,c); c._rr=resRate(G,c); });
  // 기후 초기값 (시작 시점까지는 실제 역사대로 배출했다고 본다)
  G.cools=[]; G.disasters=[]; G.ce=0; G.ceR=0;
  for(let y=1850;y<G.y;y++){ const v=interpLog(D.STATS.worldPop,y)*interp(D.STATS.worldGdp,y)*interp(D.CLIMATE.fossil,y); G.ce+=v; G.ceR+=v; }
  computeTemp(G);
  if(eraIdx>=2){ fillGaps(G); fixIslands(G,eraIdx); }
  initRoads(G); initPorts(G); initHeritage(G);
  for(const c of G.C) resetArmies(G,c);
  // 플레이어
  const pc = playerTag ? G.C.find(c=>c.tag===playerTag) : null;
  G.player = pc ? pc.i : G.C[Math.floor(rng(G)*G.C.length)].i;
  const P=G.C[G.player]; P.mob=0.006; P.ruler=null; ensureRuler(G,P,true);
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
  return real*pw(p,G.y)/wsum(G.y)*f*headroom(G.y)*(G.kscale||1)*(G._noClim?1:climF(p,G.temp||0));
}

function climF(p,T){
  const a=Math.abs(PLAT[p]); let f=1;
  if(T<0 && a>35) f=1+0.15*T;
  if(T>1){ if(a<30) f=1-0.06*(T-1); else if(a>50) f=1+0.04*(T-1); }
  return clamp(f,0.6,1.2);
}
ENG.climF=climF;
function headroom(y){ return interp([[-5000,1.15],[1750,1.15],[1850,1.35],[1920,1.8],[1960,2.4],[2100,2.4]],y); }
// 역사 인물의 직책: 재상(adm)·장수(mil)·학자(sci)
const ROLE_FX={adm:{tax:.05,stab:.1,corr:-5},mil:{mil:.06,manp:.05},sci:{res:.08,lit:.01,prod:.02}};
ENG.ROLE_FX=ROLE_FX;
function defRole(f){ const x=f.fx; if((x.mil||0)+(x.def||0)>=0.15) return 'mil'; if((x.res||0)+(x.lit||0)*3>=0.08) return 'sci'; return 'adm'; }
ENG.defRole=defRole;
// ── 효과 합산 ──
const FXKEYS=['tax','prod','mil','def','res','lit','life','stab','colon','naval','demo','manp','tfr','growth','corr','san'];
function techFx(c){ const s={}; FXKEYS.forEach(k=>s[k]=0); let gdp=650; for(const id of c.techs){ const t=TECHS[id]; for(const k in t.fx) s[k]+=t.fx[k]; gdp*=1+D.ERA_GDP_G[t.era]; } s.gdpBase=gdp; return s; }
const WMAP={}; for(const w of D.WONDERS) WMAP[w.id]=w; const RMAP={}; for(const r of D.RELICS) RMAP[r.id]=r;
function mods(G,c){
  if(c.techDirty||!c.fx){ c.fx=techFx(c); c.techDirty=false; c._tf=techFactor(G,c); }
  const s={}; FXKEYS.forEach(k=>s[k]=c.fx[k]);
  const add=(fx)=>{ for(const k in fx) if(k in s) s[k]+=fx[k]; };
  add(D.GOVS[c.gov].fx);
  for(const id of c.policies){ const p=D.POLICIES[id]; if(p) add(p.fx); }
  for(const t of c.tmods) if(t.until>G.day) s[t.k]=(s[t.k]||0)+t.v;
  for(const f of D.FIGS){ const st=G.figs[f.id]; if(st&&st.st==='alive'&&G.y>=f.a[0]&&G.y<=f.a[1]&&st.svc===c.tag){ add(f.fx); const rb=ROLE_FX[st.role||defRole(f)]; if(rb) add(rb); } }
  if(G.wond) for(const id in G.wond){ if(G.owner[G.wond[id].p]===c.i){ const w=WMAP[id]; if(w) add(w.fx); } }
  if(G.relics) for(const id in G.relics){ if(G.relics[id].o===c.i){ const r=RMAP[id]; if(r) add(r.fx); } }
  if(c.ruler){ s.tax+=(c.ruler.adm-3)*0.03; s.stab+=(c.ruler.adm-3)*0.08; s.mil+=(c.ruler.mil-3)*0.04; s.res+=(c.ruler.adm-3)*0.02; }
  s.lit+=c.perm.lit; s.life+=c.perm.life; s.def+=c.perm.def;
  return s;
}
ENG.mods = mods;

// 무기: 냉병기에서 화약 무기, 근대 소총, 기계화로 넘어갈 때마다 공격력·방어력이 크게 뛴다
const WEAP=[['bronze',1.35,1.3],['iron',1.35,1.3],['stirrup',1.15,1],['crossbow',1.1,1.25],['castle',1,1.15],['gunpowder',1.1,1.05],['cannon',1.35,1.1],
  ['firearms',2.3,2.4],['milrev',1.3,1.3],['rifle',2,2.2],['steel',1.15,1.15],['combust',1.15,1.1],['armor',1.7,1.4],['flight',1.5,1.3],['rocket',1.2,1.2],['computer',1.2,1.25],['ai',1.3,1.3]];
function weaponFx(c){ if(c._wv===c.techs.size) return; c._wv=c.techs.size; let a=1,d=1; for(const [id,x,y] of WEAP) if(c.techs.has(id)){ a*=x; d*=y; }
  c.wAtk=a; c.wDef=d; const k=id=>c.techs.has(id);
  c.wLabel=k('ai')||k('computer')?'첨단 정밀 무기':k('armor')||k('flight')?'기계화 무기':k('rifle')?'근대 소총·대포':k('firearms')?'화약 무기 (화승총·화포)':k('gunpowder')?'냉병기 + 초기 화약':k('iron')?'냉병기 (철기)':k('bronze')?'냉병기 (청동기)':'석기·목기'; }
ENG.weaponFx=weaponFx;
function corrCost(c){ return Math.max(c.income,c.gdp*0.01)*0.12*(1+c.prov/12); }
ENG.corrCost=corrCost;
function sanCost(c){ return Math.max(c.income,c.gdp*0.01)*(0.3+0.25*(c.sanInv||0))*(1+c.prov/30); }
ENG.sanCost=sanCost;
function recalc(G,c){
  let pop=0,n=0,area=0,coast=0; const rc={};
  let rw=0,pw=0,pn=0; for(let p=0;p<N;p++) if(G.owner[p]===c.i){ pop+=G.pop[p]; n++; area+=PAREA[p]; if(PCOAST[p]) coast++; for(const r of PRES[p]) rc[r]=(rc[r]||0)+1; if(G.road) rw+=G.pop[p]*G.road[p]; if(G.port&&G.port[p]){ pw+=G.port[p]*PSUIT[p]; pn++; } }
  c.pop=pop; c.prov=n; c.area=area; c.coast=coast; c.resCnt=rc; c.roadAvg=pop>0?rw/pop:0; c.portW=pw; c.portN=pn;
  const s=mods(G,c); c.m=s; s.prod+=0.015*c.roadAvg; s.tax+=0.01*c.roadAvg;
  // 자원 부족 (우리 땅과 이웃 어디에도 없을 때)
  const kn=id=>c.techs.has(id);
  c.short=[];
  for(const sh of D.SHORT){ if(!kn(sh.need)||(sh.until&&kn(sh.until))) continue; const have=sh.res.some(r=>rc[r]||(c._nbRes&&c._nbRes.has(r))); if(!have){ c.short.push(sh.n); for(const k in sh.fx) s[k]=(s[k]||0)+sh.fx[k]; } }
  // 자원 수입: 매장지 1곳 = 세계 평균 생산 × (units × 세계인구/78억 × 100만 명)
  const ws=interpLog(D.STATS.worldPop,G.y)/7.8e9*1e6*900*Math.sqrt(interp(D.STATS.worldGdp,G.y)/900);
  let ri=0; c.resVal={};
  for(const r in rc){ const R=D.RES[r]; const on=R.on(kn); if(!on) continue; const v=R.units*on*Math.pow(rc[r],0.85)*ws; c.resVal[r]=v; ri+=v; }
  c.resIncome=ri;
  // 항구 교역: 등급 × 적합도 (교역 기술이 있을수록 크다)
  const trade=1.2*(1+(kn('compass')?0.5:0)+(kn('jointst')?0.5:0)+(kn('container')?1:0));
  c.portIncome=c.portW*trade*ws;
  // 부패
  if(c.corr==null) c.corr=(D.GOV_CORR[c.gov]||15);
  const cf=clamp(c.corr,0,90)/100;
  c.san=clamp(s.san+(c.sanInv||0),0,5);
  c.lit=clamp(s.lit,0,0.99);
  const effn=clamp(((c.eff==null?1:c.eff)-0.2)/0.8,0,1);
  const demo=clamp(s.demo*1.25,0,1)*clamp(0.3+0.7*effn,0,1); c.dev=demo;
  c.le=clamp(24+s.life*(0.78+0.22*effn)+26*demo,20,99);
  const dT=clamp(s.demo*1.25,0,1); const tRich=1.5+4.8*Math.pow(1-dT,1.8), tPoor=1.5+4.8*Math.pow(1-dT*0.55,1.2); let tfr=tPoor+(tRich-tPoor)*Math.pow(effn,0.8); if(['kr','jp','cn'].includes(c.cul)&&demo>0.75) tfr-=0.55; if(c.kr&&G.y>2000) tfr-=0.25; tfr+=s.tfr; c.tfr=clamp(tfr,0.6,7.5);
  if(c.tfrS==null) c.tfrS=c.tfr; if(c.leS==null) c.leS=c.le; if(c.eff==null) c.eff=1;
  c.gdppc = c.fx.gdpBase*Math.max(0.3,1+0.5*s.prod)*(0.85+0.05*c.stab)*c.eff;
  c.gdppc*=1-0.25*cf;
  c.gdp = pop*c.gdppc + (c.resIncome+c.portIncome)*(0.85+0.05*c.stab)*(1-0.3*cf);
  c.income = c.exile?0: c.gdp*0.07*Math.max(0.05,1+s.tax)*(1-0.6*cf);
  c.armyMul_=1+cf+4*cf*cf; c.armyCost=c.soldiers*c.gdppc*(['tribe','chief'].includes(c.gov)?0.7:2)*c.armyMul_;
  c.expense = c.exile?0: c.income*0.42 + c.armyCost + c.policies.length*c.gdp*0.0025 + (c.sanInv>0?c.sanInv*c.gdp*0.0015:0) + (c.gold<0?-c.gold*0.08:0);
  const q = (1+s.mil)*(0.7+0.1*(c.stab+3)/2)*(1+ (c.m.mil>0?0:0));
  weaponFx(c); c.qual=q; c.str = c.soldiers*q*Math.sqrt(c.wAtk*c.wDef);
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
  const tr=D.TECH_RES[id]; if(tr&&c.resCnt){ if(tr.every(r=>c.resCnt[r])) m*=0.8; else if(!tr.some(r=>c.resCnt[r]||(c._nbRes&&c._nbRes.has(r)))) m*=1.15; }
  return m;
}
ENG.techCost=techCost;
function availableTechs(c){ return TL.filter(t=>!c.techs.has(t.id) && t.req.every(r=>c.techs.has(r))).map(t=>t.id); }
ENG.availableTechs=availableTechs;
function resRate(G,c){ if(c.exile) return 0.3; return (1-0.25*clamp(c.corr||0,0,90)/100)*(0.5+0.5*Math.sqrt(c.pop/1e6))*(1+c.lit)*Math.pow(Math.max(0.2,1+c.m.res),0.6)*(0.85+0.05*(c.stab+3)) * (c.i===G.player?1.15:1); }
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
  G.hist.push({y:G.y, wp, wr:interpLog(D.STATS.worldPop,G.y), pp:P.pop, gdp:P.gdppc, le:P.leS, lit:P.lit, tfr:P.tfrS, prov:P.prov, tag:P.tag, tp:G.temp||0, tr:realTemp(G.y)});
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
    if(cnt[c.i]===0 && !c.exile){ c.alive=false; G.wars=G.wars.filter(w=>w.a!==c.i&&w.b!==c.i); if(G.armies) G.armies=G.armies.filter(a=>a.o!==c.i); if(G.battles) G.battles=G.battles.filter(b=>b.ao!==c.i&&b.do!==c.i);
      if(c.i===G.player){ G.gameOver={reason:'fall', y:G.y}; }
      else news(G,`${c.name} 멸망`,'亡'); } }
}

// ── 기후·재해 ──
function realTemp(y){ return interp(D.CLIMATE.temp,y); }
ENG.realTemp=realTemp;
function coolSum(G){ let s=0; for(const c of (G.cools||[])) if(c.until>G.day) s+=c.dT; return s; }
function computeTemp(G){
  let base;
  if(G.y<1850) base=realTemp(G.y);
  else { const b0=realTemp(1850); const ratio=G.ceR>0?clamp(G.ce/G.ceR,0,3):1; base=b0+(realTemp(G.y)-b0)*ratio; }
  G.tempBase=base; G.temp=base+coolSum(G);
}
ENG.computeTemp=computeTemp;
function yearlyEmissions(G){
  if(G.y<1850) return;
  const realWorld=interpLog(D.STATS.worldPop,G.y)*interp(D.STATS.worldGdp,G.y);
  let tot=0,fos=0; for(const c of G.C){ if(!c.alive) continue; tot+=c.gdp; const k=id=>c.techs.has(id); const sh=!k('steam')?0.05:k('carbon')?0.2:k('renew')?0.65:1; fos+=c.gdp*sh; }
  G.ce=(G.ce||0)+(tot>0?fos/tot:1)*realWorld;
  G.ceR=(G.ceR||0)+realWorld*interp(D.CLIMATE.fossil,G.y);
}
function addCool(G,dT,years,label){ (G.cools=G.cools||[]).push({dT,until:G.day+Math.round(years*365),label}); G.cools=G.cools.filter(c=>c.until>G.day); computeTemp(G); }
function logDisaster(G,o){ (G.disasters=G.disasters||[]).push(Object.assign({y:G.y,m:G.m},o)); if(G.disasters.length>150) G.disasters.shift(); }
function quake(G,lon,lat,M,name,share){
  const p0=nearestProv(lon,lat,400); if(p0<0) return;
  const r=60*Math.pow(1.8,M-7);
  let deaths=0; const owners=new Map();
  for(let p=0;p<N;p++){ const d=pdist(p,p0); if(p!==p0&&d>r) continue;
    const o=G.owner[p]; const c=o>=0?G.C[o]:null;
    const resil = c&&c.techs.has('steel')&&c.eff>0.7 ? 0.35 : c&&c.techs.has('masonry')?1:0.7;
    let k = share!=null ? (p===p0?share:share*0.25*(1-d/r)) : 0.0006*Math.pow(3,M-7)*(p===p0?1:0.25*(1-d/r)) * (G.y<1900?1.5:1);
    k=clamp(k*resil,0,0.6); const lost=G.pop[p]*k; G.pop[p]-=lost; deaths+=lost;
    if(o>=0) owners.set(o,(owners.get(o)||0)+lost);
  }
  name=name||`${PNAME[p0].replace(/\s.*$/,'')} 지진`;
  logDisaster(G,{t:'지진',name,M,deaths,p:p0});
  for(const [o,l] of owners){ const c=G.C[o]; if(l>c.pop*0.002){ c.stab=clamp(c.stab-Math.min(1,l/c.pop*30),-3,3); c.tmods.push({k:'prod',v:-Math.min(0.15,l/c.pop*5),until:G.day+365,label:name}); } }
  if(deaths>2000||owners.has(G.player)) news(G,`${name} (규모 ${M.toFixed(1)}) — 사망 약 ${fmtPop(deaths)}`,'震');
  if(owners.has(G.player)&&owners.get(G.player)>50) G.queue.push({kind:'relief',type:'지진',name,deaths:owners.get(G.player),M});
}
function erupt(G,vname,vei){
  const vi=typeof vname==='number'?vname:D.VOLCANOES.findIndex(v=>v[0]===vname); if(vi<0) return; const v=D.VOLCANOES[vi];
  const p0=VPROV[vi]; const r=40*Math.pow(2,vei-4);
  let deaths=0; const owners=new Map();
  if(p0>=0) for(let p=0;p<N;p++){ const d=pdist(p,p0); if(p!==p0&&d>r) continue; const c_=G.owner[p]>=0?G.C[G.owner[p]]:null; const k=clamp(0.002*Math.pow(2,vei-4)*(p===p0?3:(1-d/r))*(c_&&c_.techs.has('radio')?0.4:1),0,0.5); const lost=G.pop[p]*k; G.pop[p]-=lost; deaths+=lost; const o=G.owner[p]; if(o>=0) owners.set(o,(owners.get(o)||0)+lost); }
  const cool={5:[-0.08,1],6:[-0.35,2],7:[-0.8,3],8:[-2,6]}[vei];
  if(cool){ addCool(G,cool[0],cool[1],`${v[0]} 분화`); if(cool[0]<=-0.35) ENG.api(G).plague([-180,35,180,72],0.015*Math.abs(cool[0])/0.35); }
  logDisaster(G,{t:'화산',name:`${v[0]} 분화`,M:vei,deaths,p:p0});
  for(const [o,l] of owners){ const c=G.C[o]; c.stab=clamp(c.stab-Math.min(1,l/Math.max(1,c.pop)*20),-3,3); }
  if(vei>=6||owners.has(G.player)) news(G,`${v[0]} 분화 (VEI ${vei})${cool&&cool[0]<-0.2?` — 세계 기온 ${cool[0]}°C`:''}`,'火');
  if(owners.has(G.player)&&owners.get(G.player)>50) G.queue.push({kind:'relief',type:'화산',name:`${v[0]} 분화`,deaths:owners.get(G.player),M:vei});
}
ENG.quake=quake; ENG.erupt=erupt;
function natureMonth(G){
  // 지진대
  D.SEISMIC.forEach(([nm,b,rate],k)=>{ if(rng(G)<rate/12){ const ps=[]; for(let p=0;p<N;p++) if(PSEISZ[p]===k) ps.push(p); if(!ps.length) return; const p=ps[Math.floor(rng(G)*ps.length)];
    const sub=['일본 해구','순다·필리핀 해구','안데스','알래스카·알류샨','캄차카','멕시코·중앙아메리카'].includes(nm); const M = nm.startsWith('한반도') ? 5+rng(G)*1.6 : Math.min(sub?9.3:8.2,7-Math.log(1-rng(G))*(sub?0.45:0.3)); quake(G,PLON[p],PLAT[p],M,null); } });
  // 화산
  D.VOLCANOES.forEach((v,i)=>{ if(rng(G)<v[4]/12){ const r=rng(G); let vei=r<.7?4:r<.94?5:r<.99?6:r<.999?7:8; vei=Math.min(vei,v[3]); erupt(G,i,vei); } });
}
// ── 전염병 ──
// G.epi: [{id,d,n,R,attack,cfr,vb(처녀지 상자),inf{p:개월},done{p:1},deaths,byC{ci:사망},y0,hitP}]
const EPI_MAX=5;
function diseaseOK(G,d){ const x=D.DISEASES[d]; return x&&!(G.erad&&G.erad[d]); }
function startEpi(G,d,p0,o){
  if(p0<0||!diseaseOK(G,d)) return null; o=o||{}; const x=D.DISEASES[d];
  G.epi=G.epi||[];
  const same=G.epi.find(e=>e.d===d); if(same){ if(!same.inf[p0]&&!same.done[p0]) same.inf[p0]=0; return same; }
  if(G.epi.length>=EPI_MAX) G.epi.shift();
  const e={id:(G.epiN=(G.epiN||0)+1),d,n:x.n,R:o.R||x.R,attack:(o.attack||1)*x.attack,cfr:o.cfr||x.cfr,vb:o.virginBox||null,inf:{},done:{},deaths:0,byC:{},y0:G.y,big:!!o.big,loc:o.local?1:0};
  e.inf[p0]=0; G.epi.push(e);
  const c=G.owner[p0]>=0?G.C[G.owner[p0]]:null;
  if(e.big||(c&&c.pop>3e6)) news(G,`${PNAME[p0].replace(/\s.*$/,'')}에서 ${x.n} 유행 시작`,'疫');
  return e;
}
function epiProv(G,tag){ const c=C(G,tag); if(!c||!c.alive) return -1; if(c.cap>=0&&G.owner[c.cap]===c.i&&rng(G)<0.6) return c.cap; let best=-1,bp=-1; for(let p=0;p<N;p++) if(G.owner[p]===c.i){ const v=G.pop[p]*(0.5+rng(G)); if(v>bp){ bp=v; best=p; } } return best; }
function pickDisease(G,c){ const ks=Object.keys(D.DISEASES).filter(k=>{ const x=D.DISEASES[k]; return k!=='covid'&&G.y>=x.from&&G.y<=x.to&&diseaseOK(G,k); }); if(!ks.length) return null;
  const w=ks.map(k=>({smallpox:3,plague:0.3,typhoid:3,cholera:2.5,measles:3,typhus:c&&atWarAny(G,c.i)?5:1.5,flu:2.5}[k]||1)); let t=w.reduce((a,b)=>a+b,0)*rng(G); for(let i=0;i<ks.length;i++){ t-=w[i]; if(t<=0) return ks[i]; } return ks[0]; }
function atWarAny(G,ci){ return G.wars.some(w=>w.a===ci||w.b===ci); }
function epiM(G,c,k){ const m=c&&c.epiM; return m&&m.until>G.day&&m[k]!=null?m[k]:1; }
// 위생·기술에 따른 배수
function epiFx(G,c,x){
  if(!c) return {inf:1,cfr:1,sp:1};
  const s=c.san||0, kn=id=>id&&c.techs.has(id);
  let inf=Math.max(0.12,1-(x.water?0.16:x.air?0.07:0.11)*s), cfr=Math.max(0.3,1-0.08*s), sp=Math.max(0.25,1-(x.water?0.12:x.air?0.05:0.09)*s);
  if(kn(x.vac)){ inf*=x.vac==='genome'?0.35:0.12; sp*=0.5; }
  if(kn(x.cure)) cfr*=0.2;
  if(kn('medicine')) cfr*=0.9;
  return {inf,cfr,sp};
}
function epiMonth(G){
  if(!G.epi) G.epi=[];
  // 풍토병의 새 유행 (평균 수 년에 한 번, 인구가 많고 붐빌수록 잦다)
  const wp=interpLog(D.STATS.worldPop,G.y); const rate=clamp(Math.log10(Math.max(1e6,wp)/1e6)/3.2,0.05,1)*0.04;
  if(G.epi.length<3&&rng(G)<rate){ const cs=G.C.filter(c=>c.alive&&c.pop>0); let t=cs.reduce((a,c)=>a+Math.sqrt(c.pop),0)*rng(G); let pick=cs[0]; for(const c of cs){ t-=Math.sqrt(c.pop); if(t<=0){ pick=c; break; } }
    if(pick){ const d=pickDisease(G,pick); if(d) startEpi(G,d,epiProv(G,pick.tag),{attack:0.4+0.5*rng(G),R:D.DISEASES[d].R*(0.55+0.35*rng(G)),local:1}); } }
  const P=G.C[G.player]; const died=new Map();
  for(const e of G.epi){
    const x=D.DISEASES[e.d]; const mo=x.months; const add=[];
    for(const k in e.inf){ const p=+k; const t=e.inf[k]; const o=G.owner[p]; const c=o>=0?G.C[o]:null; const f=epiFx(G,c,x);
      const vg=e.vb&&inBox(p,e.vb)?(x.virgin||1.5):1;
      const w=Math.sin(Math.PI*(t+0.5)/mo)*Math.PI/(2*mo);
      const ia=Math.min(0.9,e.attack*vg*f.inf*epiM(G,c,'inf')), cf=Math.min(0.9,e.cfr*Math.sqrt(vg)*f.cfr*epiM(G,c,'dm'));
      const lost=G.pop[p]*ia*w*cf; G.pop[p]=Math.max(10,G.pop[p]-lost); e.deaths+=lost; if(o>=0){ e.byC[o]=(e.byC[o]||0)+lost; died.set(o,(died.get(o)||0)+lost); }
      // 전파
      if(t>=1&&t<mo-1){
        const war=x.war&&c&&atWarAny(G,c.i)?1.6:1;
        const base=0.11*e.R*f.sp*epiM(G,c,'sp')*war*(t<mo/2?1.2:0.6)*(e.loc?0.5:1);
        const rl=G.road?G.road[p]:0;
        const tryQ=(q,k_)=>{ if(e.inf[q]!=null||e.done[q]) return; const oq=G.owner[q]; const cq=oq>=0?G.C[oq]:null; let pr=k_*epiFx(G,cq,x).sp; if(cq&&cq!==c) pr*=epiM(G,cq,'in'); if(G.pop[q]<500) pr*=0.3; if(rng(G)<pr) add.push(q); };
        for(const q of ADJ[p]) tryQ(q,base*(1+0.25*rl));
        const pl=G.port?G.port[p]:0; if(pl) for(const q of SEA[p]) tryQ(q,base*0.5*(0.5+0.3*pl));
        // 먼 바닷길 · 하늘길
        const fl=c&&c.techs.has('flight'), st=c&&c.techs.has('steam'); const jump=(fl?0.3:pl>=2&&st?0.12*pl:pl>=3?0.04*pl:0)*e.R/2.2*f.sp;
        if(jump>0&&rng(G)<jump){ for(let k2=0;k2<6;k2++){ const q=Math.floor(rng(G)*N); const oq=G.owner[q]; if(oq<0) continue; const cq=G.C[oq]; if((fl&&cq.techs.has('flight'))||(G.port&&G.port[q]>=2)){ tryQ(q,1); break; } } }
      }
      if(t+1>=mo){ delete e.inf[k]; e.done[k]=1; } else e.inf[k]=t+1;
    }
    for(const q of add) if(e.inf[q]==null&&!e.done[q]) e.inf[q]=0;
    // 플레이어에게 닿음
    if(!e.hitP&&P.alive&&(e.big||Object.keys(e.inf).length+Object.keys(e.done).length>=5||e.deaths>5e4)&&Object.keys(e.inf).some(k=>G.owner[+k]===G.player)){ e.hitP=true; if(!(P._epiQ>G.day-365*3)||e.big){ P._epiQ=G.day; G.queue.push({kind:'epi',id:e.id,d:e.d}); } else news(G,`${e.n} 유행이 우리 땅에 번졌다`,'疫'); }
  }
  // 나라별 피해: 안정도·생산
  for(const [o,l] of died){ const c=G.C[o]; if(!c.alive||c.pop<=0) continue; const r=l/c.pop; c.epiDeaths=(c.epiDeaths||0)+l; if(r>0.0008){ c.stab=clamp(c.stab-Math.min(0.4,r*25),-3,3); } if(r>0.003) c.tmods.push({k:'prod',v:-Math.min(0.08,r*4),until:G.day+120,label:'역병'}); }
  // 끝난 유행
  const ended=G.epi.filter(e=>!Object.keys(e.inf).length); G.epi=G.epi.filter(e=>Object.keys(e.inf).length);
  for(const e of ended){ const tot=e.deaths; const mine=e.byC[G.player]||0; const p0=+Object.keys(e.done)[0];
    logDisaster(G,{t:'역병',name:`${e.n} 유행 (${fmtYear(e.y0)}~)`,M:0,deaths:tot,p:p0});
    if(tot>2e4||mine>0) news(G,`${e.n} 유행이 끝났다 — 사망 약 ${fmtPop(tot)}${mine>0?`, 우리 백성 ${fmtPop(mine)}`:''}`,'疫');
    if(mine>P.pop*0.003) chron(G,`${e.n}이 지나가다`,`${fmtYear(e.y0)}부터 번진 ${e.n}으로 우리 백성 약 ${fmtPop(mine)}이(가) 목숨을 잃었다. 세계 전체로는 약 ${fmtPop(tot)}.`,'疫'); }
}
function epiInfo(G,p){ const r=[]; for(const e of (G.epi||[])) if(e.inf[p]!=null) r.push({n:e.n,t:e.inf[p],mo:D.DISEASES[e.d].months}); return r; }
ENG.epiInfo=epiInfo; ENG.epiFx=epiFx;
function epiAction(G,id,eid){ const P=G.C[G.player]; const a=D.EPI_ACTIONS.find(x=>x.id===id); if(!a) return;
  P.gold-=P.income*a.cost; if(a.prod) P.tmods.push({k:'prod',v:a.prod,until:G.day+365,label:a.n}); if(a.stab) P.stab=clamp(P.stab+a.stab,-3,3);
  const m=P.epiM&&P.epiM.until>G.day?P.epiM:{sp:1,dm:1,in:1,inf:1}; m.until=G.day+365;
  if(id==='quarantine'){ m.sp*=0.35; m.in*=0.6; } if(id==='medics') m.dm*=0.6; if(id==='closed') m.in*=0.15; if(id==='testing'){ m.sp*=0.3; m.in*=0.5; m.dm*=0.8; m.inf*=0.7; }
  P.epiM=m; const e=(G.epi||[]).find(x=>x.id===eid); chron(G,`${e?e.n:'역병'} 대책: ${a.n}`,a.d,'醫'); }
ENG.epiAction=epiAction;
// AI 대책
function epiAI(G){ for(const e of (G.epi||[])){ const hit=new Set(Object.keys(e.inf).map(k=>G.owner[+k]).filter(o=>o>=0&&o!==G.player)); for(const o of hit){ const c=G.C[o]; if(c.epiM&&c.epiM.until>G.day) continue; if(rng(G)<0.15+0.06*(c.san||0)){ c.epiM={sp:c.techs.has('computer')?0.3:0.45,dm:0.75,in:0.6,inf:1,until:G.day+365}; } } } }

// ── 인력 ──
// 인력 상한 = 인구 × 3% × 동원력. 매달 상한의 1/24이 차오른다 (안정도가 높을수록 빠르다).
// 군단은 정원(max)까지 인력을 끌어와 충원되고, 충원 속도는 그 자리의 병참 지원률을 따른다.
function manpowerMonth(G,c,target){
  const mf=Math.max(0.2,1+c.m.manp);
  c.mpMax=c.pop*0.03*mf; if(c.mp==null) c.mp=c.mpMax*0.7;
  c.mpGain=c.exile?c.mpMax/120:c.mpMax/24*clamp(0.75+0.1*c.stab,0.4,1.1);
  c.mp=Math.min(c.mpMax,c.mp+c.mpGain);
  let as=armiesOf(G,c.i); for(const a of as) if(a.max==null) a.max=a.n;
  const sumMax=as.reduce((s,a)=>s+a.max,0);
  const pay=c.gold>0||c.soldiers<target*0.4;
  if(target>sumMax*1.02&&pay&&c.cap>=0){
    // 새 병력 모집: 모은 만큼 정원과 병력이 함께 는다
    const free=a=>!G.battles.some(b=>b.p===a.p);
    let h=as.find(a=>a.home&&free(a)&&G.owner[a.p]===c.i)||as.find(a=>G.owner[a.p]===c.i&&free(a))||(as.length>=6?as.slice().sort((x,y)=>y.max-x.max)[0]:null);
    if(!h){ h=newArmy(G,c,c.cap,0,{home:true,max:0}); as=armiesOf(G,c.i); }
    const add=Math.min(c.mp,(target-sumMax)*0.25); h.n+=add; h.max+=add; c.mp-=add;
  } else if(target<sumMax*0.95){
    const cut=(sumMax-target)*0.15;
    for(const a of as){ const k=a.max/Math.max(1,sumMax); a.max-=cut*k; const dn=Math.max(0,a.n-a.max); if(dn>0){ a.n-=dn; c.mp=Math.min(c.mpMax,c.mp+dn*0.8); } }
  }
  c.reinf=0;
  if(pay) for(const a of as){ const def=a.max-a.n; if(def<=1) continue; const sup=a.sup==null?1:a.sup; const fight=G.battles.some(b=>b.p===a.p);
    const want=def*0.4*sup*(fight?0.3:1); const take=Math.min(want,c.mp); a.n+=take; c.mp-=take; c.reinf+=take; }
  syncSoldiers(G,c);
}
ENG.manpowerMonth=manpowerMonth;
// 소모율 = 1 − 병력/정원. 80%를 넘으면 군단은 흩어진다.
function wipeArmy(G,a,why){ const c=G.C[a.o]; const lost=a.n; a.n=0; if(a.o===G.player){ chron(G,`${a.name} 소멸`,`${a.name}이(가) ${why}. 남은 병력 ${fmtPop(lost)}도 흩어졌다.`,'敗'); news(G,`${a.name} 소멸 — ${why}`,'戰'); }
  else if(enemiesOf(G,G.player).includes(a.o)) news(G,`${c.name} ${a.name} 소멸 — ${why}`,'戰'); }
function attritionCheck(G){ for(const a of G.armies){ if(a.n<=0||!a.max) continue; if(a.n<a.max*0.2) wipeArmy(G,a,'소모율 80%를 넘어 와해되었다'); } }
ENG.attrition=a=>a.max?clamp(1-a.n/a.max,0,1):0;

// ── 역사적 건물 ──
const WPROV={}; for(const w of D.WONDERS) WPROV[w.id]=nearestProv(w.loc[0],w.loc[1],400);
ENG.WPROV=WPROV;
function wonderOwner(G,id){ const w=G.wond&&G.wond[id]; if(!w) return -1; return G.owner[w.p]; }
ENG.wonderOwner=wonderOwner;
function wonderCost(c,w){ return Math.max(c.income,c.gdp*0.02)*w.cost; }
ENG.wonderCost=wonderCost;
function startWonder(G,c,id,mul){
  const w=D.WONDERS.find(x=>x.id===id); if(!w||!c||!c.alive) return false; const p=WPROV[id]; if(p<0||G.owner[p]!==c.i) return false;
  if((G.wond||{})[id]||(G.wb||[]).some(x=>x.id===id)) return false;
  c.gold-=wonderCost(c,w)*(mul||1); (G.wb=G.wb||[]).push({id,o:c.i,p,prog:0,days:w.days});
  if(c.i===G.player) chron(G,`${w.n} 착공`,w.d,'工'); return true; }
function finishWonder(G,id,ci){ const w=D.WONDERS.find(x=>x.id===id); const p=WPROV[id]; (G.wond=G.wond||{})[id]={p,y:G.y,by:ci}; G.wb=(G.wb||[]).filter(x=>x.id!==id);
  if(ci===G.player){ chron(G,`${w.n} 완공`,`${w.d} 효과: 이 땅을 가진 나라에 계속 남는다.`,'工'); G.queue.push({kind:'wonderDone',id}); } news(G,`${G.C[ci]?G.C[ci].name+', ':''}${w.n} 완공`,'工'); }
function wonderMonth(G){
  for(const x of [...(G.wb||[])]){ if(G.owner[x.p]!==x.o){ G.wb=G.wb.filter(y=>y!==x); if(x.o===G.player) news(G,`${D.WONDERS.find(w=>w.id===x.id).n} 공사가 중단되었다 (땅을 잃음)`,'工'); continue; }
    x.prog+=30/x.days; if(x.prog>=1) finishWonder(G,x.id,x.o); }
  // AI: 역사적 연도가 지났는데 아직 짓지 않은 건물을 가끔 짓는다
  if(G.m===6) for(const w of D.WONDERS){ if(G.y<w.y||(G.wond||{})[w.id]||(G.wb||[]).some(x=>x.id===w.id)) continue; const o=G.owner[WPROV[w.id]]; if(o<0||o===G.player) continue; const c=G.C[o]; if(w.req&&!c.techs.has(w.req)) continue; if(c.gold>wonderCost(c,w)*1.5&&rng(G)<0.08) startWonder(G,c,w.id); }
}
// ── 역사적 유물 ──
function relicSvc(G,r){ const s=G.figs[r.fig]; if(s&&s.svc&&has(G,s.svc)) return C(G,s.svc); const p=nearestProv(r.loc[0],r.loc[1],400); return p>=0&&G.owner[p]>=0?G.C[G.owner[p]]:null; }
function giveRelic(G,id,c){ const r=D.RELICS.find(x=>x.id===id); if(!r||!c) return; (G.relics=G.relics||{})[id]={o:c.i,y:G.y}; G.relicSt[id]='made';
  if(c.i===G.player) chron(G,`「${r.n}」`,`${r.d} (${r.kind})`,'文'); else if(c.pop>5e6) news(G,`${c.name}: 「${r.n}」 완성`,'文'); }
function innovate(G,id,c,r){ if(!c) return; G.relicSt[r.id]='tech'; const t=id&&TECHS[id];
  if(t&&!c.techs.has(id)&&t.req.every(q=>c.techs.has(q))){ grantTech(G,c,id); if(c.i===G.player) chron(G,`${t.n} 혁신`,`${D.FIGS.find(f=>f.id===r.fig).n}이(가) 「${r.n}」 대신 기술 혁신에 매달려 ${t.n}을(를) 앞당겼다.`,'技'); }
  else { c.tmods.push({k:'res',v:0.2,until:G.day+365*15,label:'혁신'}); if(!c.cur) c.cur=pickTech(G,c); if(c.cur){ c.prog+=techCost(G,c,c.cur)*0.8; } if(c.i===G.player) chron(G,'기술 혁신',`${D.FIGS.find(f=>f.id===r.fig).n}의 연구로 연구 속도 +20% (15년).`,'技'); } }
function relicMonth(G){
  const E=G._E; const P=G.C[G.player];
  for(const r of D.RELICS){ if(G.relicSt[r.id]) continue; const f=D.FIGS.find(x=>x.id===r.fig); const s=G.figs[r.fig]; if(!s||s.st!=='alive') continue;
    const y0=Math.max(f.a[0],Math.min(r.y,f.a[1])); if(G.y<y0) continue;
    const c=relicSvc(G,r); if(!c||!c.alive) continue; G.relicSt[r.id]='asked';
    const t=r.tech&&TECHS[r.tech];
    const ev={relic:r.id,t:`${f.n}의 「${r.n}」`,x:`${f.n}(${f.role})이(가) 「${r.n}」을(를) 만들려 한다. ${r.d}`,cat:'文',
      o:[{t:`「${r.n}」을(를) 완성하게 한다`,tip:`유물 (${r.kind}): ${fxText(r.fx)}. 나라가 가지는 동안 계속 효과`,h:true,fx:(E_,tag)=>giveRelic(G,r.id,C(G,tag))},
         {t:t?`${t.n} 혁신에 매달리게 한다`:'학문 연구에 매달리게 한다',tip:t?(c.techs.has(r.tech)?'이미 아는 기술 — 연구 속도 +20% (15년)':t.req.every(q=>c.techs.has(q))?`「${t.n}」 즉시 습득`:'선행 기술이 모자라 연구 속도 +20% (15년)'):'연구 속도 +20% (15년)',h:false,dv:3,fx:(E_,tag)=>innovate(G,r.tech,C(G,tag),r)}]};
    if(c.i===G.player) G.queue.push({kind:'event',ev,subj:c.tag}); else applyOption(G,E,ev,ev.o[0],c.tag,false);
  }
  // 주인이 사라진 유물은 그 수도 자리를 가진 나라로
  for(const id in (G.relics||{})){ const x=G.relics[id]; const c=G.C[x.o]; if(c&&c.alive&&c.prov>0) continue; const r=D.RELICS.find(z=>z.id===id); const p=c&&c.cap>=0?c.cap:nearestProv(r.loc[0],r.loc[1],400); const o=p>=0?G.owner[p]:-1; if(o>=0) x.o=o; else delete G.relics[id]; }
}
function plunderRelic(G,from,to){ const ids=Object.keys(G.relics||{}).filter(id=>G.relics[id].o===from); if(!ids.length||rng(G)>0.6) return; const id=ids[Math.floor(rng(G)*ids.length)]; G.relics[id].o=to; const r=D.RELICS.find(z=>z.id===id);
  if(from===G.player||to===G.player) { chron(G,`「${r.n}」 ${to===G.player?'노획':'약탈당함'}`,`${G.C[to].name}이(가) ${G.C[from].name}의 수도에서 「${r.n}」을(를) 가져갔다.`,'戰'); news(G,`「${r.n}」 → ${G.C[to].name}`,'戰'); } }
const FXN_={tax:'세수',prod:'생산',mil:'군사력',def:'방어',res:'연구',lit:'문해율',life:'수명',stab:'안정',colon:'개척',naval:'항해',manp:'동원력',tfr:'출산율',growth:'인구 증가',demo:'인구 변천',corr:'부패',san:'위생'};
function fxText(fx){ return Object.entries(fx||{}).map(([k,v])=>`${FXN_[k]||k} ${v>0?'+':''}${k==='life'?v+'년':k==='corr'?v+'%p':['stab','naval','san'].includes(k)?v:Math.round(v*1000)/10+'%'}`).join(', '); }
ENG.fxText=fxText;
function initHeritage(G){
  G.wond={}; G.wb=[]; G.relics={}; G.relicSt={};
  for(const w of D.WONDERS){ const p=WPROV[w.id]; if(p<0) continue; const start=Math.round(w.y-Math.min(w.days/365,40));
    if(w.y<G.y) G.wond[w.id]={p,y:w.y,by:G.owner[p]};
    else if(start<G.y&&G.owner[p]>=0){ const c=G.C[G.owner[p]]; if(!w.req||c.techs.has(w.req)) G.wb.push({id:w.id,o:c.i,p,prog:(G.y-start)/(w.y-start+0.01),days:w.days}); } }
  for(const r of D.RELICS){ if(r.y<G.y){ G.relicSt[r.id]='old'; const p=nearestProv(r.loc[0],r.loc[1],400); if(p>=0&&G.owner[p]>=0&&rng(G)<0.85) G.relics[r.id]={o:G.owner[p],y:r.y}; } }
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
      if(o.army) setSoldiers(G,c,c.soldiers*(1+o.army));
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
      G.armies=G.armies.filter(x=>x.o!==b.i); b.alive=false; G.wars=G.wars.filter(w=>w.a!==b.i&&w.b!==b.i); },
    exile:(t,to)=>{ const c=C(G,t),d=C(G,to); if(!c) return; for(let p=0;p<N;p++) if(G.owner[p]===c.i) setOwner(G,p,d?d.i:-1); c.exile=true; c.gov='exile'; G.armies=G.armies.filter(a=>a.o!==c.i); c.soldiers=c.soldiers*0.05; G.wars=G.wars.filter(w=>w.a!==c.i&&w.b!==c.i);
      if(c.i===G.player) chron(G,'나라를 잃다',`${c.name}의 영토가 모두 ${d?d.name:'적'}에게 넘어갔다. 독립운동의 길이 시작된다.`,'亡'); },
    div:n=>{ G.div=clamp(G.div+n,0,100); },
    chain:(id,yrs,tag)=>{ (G.pend=G.pend||[]).push({id,day:G.day+Math.max(1,Math.round(yrs*365)),tag}); },
    corr:(t,v)=>{ const c=C(G,t); if(c) c.corr=clamp((c.corr||0)+v,0,95); },
    krPre:()=>{ for(const t of ['GOJOSEON','KR_NEO']) if(has(G,t)) return t; return null; },
    quake:(lo,la,M,name,share)=>quake(G,lo,la,M,name,share),
    erupt:(v,vei)=>erupt(G,v,vei),
    cool:(dT,yrs,label)=>addCool(G,dT,yrs,label),
    wonderBuilt:id=>!!(G.wond&&G.wond[id])||(G.wb||[]).some(x=>x.id===id),
    buildWonder:(id,t)=>{ const c=C(G,t); if(c) startWonder(G,c,id); },
    wonderNow:(id,t)=>{ const c=C(G,t); if(c&&!(G.wond&&G.wond[id])&&G.owner[WPROV[id]]===c.i) finishWonder(G,id,c.i); },
    relic:(id,t)=>giveRelic(G,id,C(G,t)),
    outbreak:(d,lo,la,o)=>startEpi(G,d,nearestProv(lo,la,600),Object.assign({big:1},o||{})),
    outbreakAt:(d,t,o)=>{ const c=C(G,t); if(!c||!c.alive) return; d=d||pickDisease(G,c); if(d) startEpi(G,d,epiProv(G,t),o); },
    san:(t,v)=>{ const c=C(G,t); if(c) c.sanInv=clamp((c.sanInv||0)+v,-1.5,3); },
    epiShield:(t,yrs,k)=>{ const c=C(G,t); if(!c) return; const m=c.epiM&&c.epiM.until>G.day?c.epiM:{sp:1,dm:1,in:1,inf:1}; m.in*=k; m.until=Math.max(m.until||0,G.day+Math.round(yrs*365)); c.epiM=m; },
    eradicate:d=>{ (G.erad=G.erad||{})[d]=1; G.epi=(G.epi||[]).filter(e=>e.d!==d); }
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
  resetArmies(G,c);
  for(let p=0;p<N;p++) if(G.owner[p]===c.i){ G.road[p]=Math.min(G.road[p],roadMax(c)); G.port[p]=Math.min(G.port[p],portMax(c)); }
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

// ── 전쟁: 군단 · 전투 · 포위 · 병참 · 도로 ──
function findWar(G,a,b){ return G.wars.find(w=>(w.a===a&&w.b===b)||(w.a===b&&w.b===a)); }
ENG.findWar=findWar;
const atWar=(G,a,b)=>a!==b&&a>=0&&b>=0&&!!findWar(G,a,b);
ENG.atWarIdx=atWar;
function enemiesOf(G,ci){ const s=[]; for(const w of G.wars){ if(w.a===ci) s.push(w.b); else if(w.b===ci) s.push(w.a); } return s; }
ENG.enemiesOf=enemiesOf;
function stanceOf(G,ci,w){ w=w||G.wars.find(x=>x.a===ci||x.b===ci); if(!w) return 'def'; return (w.a===ci?w.sa:w.sb)||'off'; }
ENG.stanceOf=stanceOf;

// 전투 지형
const WT=new Uint8Array(N);
for(let i=0;i<N;i++){ let t=PTER[i]; for(const b of D.HILLS) if(inBox(i,b)) t=6; for(const b of D.MOUNTAINS) if(inBox(i,b)) t=7; WT[i]=t; }
ENG.map.WT=WT;

// 도로
function roadMax(c){ let m=0; D.ROADS.forEach((r,i)=>{ if(!r.req||c.techs.has(r.req)) m=i; }); return m; }
ENG.roadMax=roadMax;
const rspd=(G,p)=>D.ROADS[G.road[p]||0].spd;
function initRoads(G){
  G.road=new Uint8Array(N);
  for(const c of G.C){ if(!c.alive) continue; const L=roadMax(c); const ps=[]; for(let p=0;p<N;p++) if(G.owner[p]===c.i) ps.push(p);
    ps.sort((a,b)=>G.pop[b]/Math.max(200,PAREA[b])-G.pop[a]/Math.max(200,PAREA[a]));
    ps.forEach((p,k)=>{ const r=k/Math.max(1,ps.length); G.road[p]= p===c.cap?L : r<0.3?Math.max(0,L-1) : Math.max(0,L-2); }); }
}
ENG.initRoads=initRoads;
function portMax(c){ let m=0; D.PORTS.forEach((r,i)=>{ if(!r.req||c.techs.has(r.req)) m=i; }); return m; }
ENG.portMax=portMax;
function initPorts(G){
  G.port=new Uint8Array(N);
  for(const c of G.C){ if(!c.alive) continue; const L=portMax(c); if(!L) continue;
    for(let p=0;p<N;p++) if(G.owner[p]===c.i&&PCOAST[p]){ const v=PSUIT[p]*(p===c.cap?1.3:1)*(0.6+0.4*Math.min(1,G.pop[p]/3e5)); G.port[p]=Math.min(L,Math.max(0,Math.round(L*v*0.85-0.3))); } }
}
ENG.initPorts=initPorts;
function portCost(G,c,p,lv){ return Math.max(c.income*0.03,c.gdp*0.001)*D.PORTS[lv].cost*(1.5-PSUIT[p]*0.6); }
ENG.portCost=portCost;
function startPort(G,c,p){
  if(G.owner[p]!==c.i||!PCOAST[p]) return false; const lv=(G.port[p]||0)+1; if(lv>portMax(c)) return false;
  if(G.ops.some(o=>o.p===p&&o.type==='port')) return false;
  const cost=portCost(G,c,p,lv); if(c.gold<cost) return false;
  c.gold-=cost; G.ops.push({type:'port',p,by:c.i,lv,prog:0,days:D.PORTS[lv].days}); return true;
}
ENG.startPort=startPort;
function roadCost(G,c,p,lv){ return Math.max(c.income*0.02,c.gdp*0.0008)*D.ROADS[lv].cost*(1+PAREA[p]/60000); }
ENG.roadCost=roadCost;
function startRoad(G,c,p){
  if(G.owner[p]!==c.i) return false; const lv=(G.road[p]||0)+1; if(lv>roadMax(c)) return false;
  if(G.ops.some(o=>o.p===p&&o.type==='road')) return false;
  const cost=roadCost(G,c,p,lv); if(c.gold<cost) return false;
  c.gold-=cost; G.ops.push({type:'road',p,by:c.i,lv,prog:0,days:Math.round(D.ROADS[lv].days*(1+PAREA[p]/80000))}); return true;
}
ENG.startRoad=startRoad;

// 요새
function fortLv(G,p){ const o=G.owner[p]; if(o<0) return 0; const c=G.C[o]; let f=0; if(c.techs.has('masonry')) f+=0.5; if(c.techs.has('castle')) f+=1; if(c.policies.includes('fort')) f+=1; if(c.cap===p) f+=1; if(c.techs.has('rifle')) f*=0.6; return f; }
ENG.fortLv=fortLv;

// 장수 이름
function genName(G,c){ const r=a=>a[Math.floor(rng(G)*a.length)]; if(c.kr||c.cul==='kr') return r(NAMEPOOL.kr)+r(NAMEPOOL.krGiven)+r(NAMEPOOL.krGiven); if(c.cul==='cn') return r(NAMEPOOL.cn)+r(NAMEPOOL.cnGiven); if(NAMEPOOL[c.cul]) return r(NAMEPOOL[c.cul]); return '장군'; }
const NUMK=['제1군','제2군','제3군','제4군','제5군','제6군','제7군','제8군','제9군'];
function newArmy(G,c,p,n,opt){
  const k=G.armies.filter(a=>a.o===c.i).length;
  const a=Object.assign({id:G.nextArmy++,o:c.i,p,n,mor:1,gen:{n:genName(G,c),sk:2+Math.floor(rng(G)*3)},path:[],prog:0,auto:true,land:0,sup:1,name:NUMK[k]||`제${k+1}군`,home:false},opt||{});
  if(a.max==null) a.max=a.n; G.armies.push(a); return a;
}
function armiesOf(G,ci){ return G.armies.filter(a=>a.o===ci); }
ENG.armiesOf=armiesOf;
function syncSoldiers(G,c){ let s=0; for(const a of G.armies) if(a.o===c.i) s+=a.n; c.soldiers=s; }
function setSoldiers(G,c,v){
  v=Math.max(0,v); const as=armiesOf(G,c.i); const cur=as.reduce((s,a)=>s+a.n,0);
  if(c.cap<0||!c.alive){ G.armies=G.armies.filter(a=>a.o!==c.i); c.soldiers=v; return; }
  if(!as.length){ newArmy(G,c,c.cap,v,{home:true}); c.soldiers=v; return; }
  if(v>=cur){ let h=as.find(a=>G.owner[a.p]===c.i&&a.home)||as.find(a=>G.owner[a.p]===c.i); if(!h){ h=newArmy(G,c,c.cap,0,{home:true}); } h.n+=v-cur; h.max=Math.max(h.max||0,h.n); }
  else { const k=cur>0?v/cur:0; for(const a of as){ a.n*=k; if(a.max) a.max*=k; } }
  c.soldiers=v;
}
ENG.setSoldiers=setSoldiers;
function resetArmies(G,c){ const v=c.soldiers; G.armies=G.armies.filter(a=>a.o!==c.i); if(c.alive&&c.cap>=0&&v>0) newArmy(G,c,c.cap,v,{home:true}); }
ENG.resetArmies=resetArmies;

// 이동 가능 여부: 자국·공터·교전국 땅만 지나간다
function passable(G,ci,p){ const o=G.owner[p]; return o<0||o===ci||atWar(G,ci,o); }
function baseSpeed(c){ let s=16; if(c.techs.has('horse')) s*=1.15; if(c.techs.has('combust')) s*=1.4; return s; }
function seaSpeed(c){ return c.techs.has('steamship')?90:c.techs.has('sail')?45:25; }
function edgeDays(G,c,p,q,sea){ const d=pdist(p,q); if(sea) return 4+d/seaSpeed(c); const rs=(rspd(G,p)+rspd(G,q))/2; return d/(baseSpeed(c)*rs*D.WTERR[WT[q]].mv); }
// 경로: [{p, days, sea}]
function findPath(G,a,dest){
  const c=G.C[a.o]; const nav=c.m?c.m.naval:0;
  if(dest===a.p) return [];
  if(!passable(G,a.o,dest)) return null;
  const dist=new Float64Array(N).fill(1e12), prev=new Int32Array(N).fill(-1), viaSea=new Uint8Array(N);
  const heap=[[0,a.p]]; dist[a.p]=0;
  const push=(d,p)=>{ heap.push([d,p]); let i=heap.length-1; while(i>0){ const pa=(i-1)>>1; if(heap[pa][0]<=heap[i][0]) break; [heap[pa],heap[i]]=[heap[i],heap[pa]]; i=pa; } };
  const pop=()=>{ const t=heap[0], l=heap.pop(); if(heap.length){ heap[0]=l; let i=0; for(;;){ const L=2*i+1,R=L+1; let m=i; if(L<heap.length&&heap[L][0]<heap[m][0]) m=L; if(R<heap.length&&heap[R][0]<heap[m][0]) m=R; if(m===i) break; [heap[m],heap[i]]=[heap[i],heap[m]]; i=m; } } return t; };
  while(heap.length){ const [d,p]=pop(); if(d>dist[p]) continue; if(p===dest) break;
    const relax=(q,sea)=>{ if(!passable(G,a.o,q)) return; const nd=d+edgeDays(G,c,p,q,sea); if(nd<dist[q]){ dist[q]=nd; prev[q]=p; viaSea[q]=sea?1:0; push(nd,q); } };
    for(const q of ADJ[p]) relax(q,false);
    if(nav>=1) for(const q of SEA[p]) relax(q,true);
  }
  if(prev[dest]<0){
    // 원양 수송: 항해 기술이 있으면 해안에서 해안으로 직접
    if(nav>=3&&PCOAST[dest]&&PCOAST[a.p]) return [{p:dest,days:4+pdist(a.p,dest)/seaSpeed(c),sea:true}];
    return null;
  }
  const out=[]; let q=dest; while(q!==a.p){ const p=prev[q]; out.unshift({p:q,days:edgeDays(G,c,p,q,viaSea[q]),sea:!!viaSea[q]}); q=p; }
  return out;
}
ENG.findPath=findPath;
function orderMove(G,a,dest){ const path=findPath(G,a,dest); if(!path) return false; const keep=a.path.length&&path.length&&a.path[0].p===path[0].p?a.prog:0; a.path=path; a.prog=keep; a.dest=dest; a.tot=path.reduce((s_,x)=>s_+x.days,0); a.done=keep; return true; }
ENG.orderMove=orderMove;

// 병참: 주요 지방(수도+인구 상위 5곳)에서 도로망을 따라 거리를 잰다
function supplyRange(c){ const k=id=>c.techs.has(id); return 260+(k('roads')?120:0)+(k('bureau')?80:0)+(k('rail')?500:0)+(k('combust')?400:0)+(k('flight')?250:0); }
function computeSupply(G,c){
  const sup=new Float32Array(N); const dist=new Float64Array(N).fill(1e12);
  const srcs=[]; for(let p=0;p<N;p++) if(G.owner[p]===c.i) srcs.push(p);
  if(!srcs.length){ c._sup=sup; return; }
  srcs.sort((a,b)=>G.pop[b]-G.pop[a]); const major=new Set(srcs.slice(0,5)); if(c.cap>=0) major.add(c.cap);
  const heap=[]; const push=(d,p)=>{ heap.push([d,p]); let i=heap.length-1; while(i>0){ const pa=(i-1)>>1; if(heap[pa][0]<=heap[i][0]) break; [heap[pa],heap[i]]=[heap[i],heap[pa]]; i=pa; } };
  const pop=()=>{ const t=heap[0], l=heap.pop(); if(heap.length){ heap[0]=l; let i=0; for(;;){ const L=2*i+1,R=L+1; let m=i; if(L<heap.length&&heap[L][0]<heap[m][0]) m=L; if(R<heap.length&&heap[R][0]<heap[m][0]) m=R; if(m===i) break; [heap[m],heap[i]]=[heap[i],heap[m]]; i=m; } } return t; };
  for(const p of major){ dist[p]=0; push(0,p); }
  const nav=c.m?c.m.naval:0; const seaMul=c.techs.has('steamship')?1.6:3.2;
  while(heap.length){ const [d,p]=pop(); if(d>dist[p]) continue;
    const step=(q,sea)=>{ const o=G.owner[q]; const hostile=o>=0&&o!==c.i; const km=pdist(p,q)*(sea?seaMul*(G.port&&G.port[p]>=2&&G.owner[p]===c.i?0.55:1):1)/(sea?1:(rspd(G,p)+rspd(G,q))/2)/(sea?1:D.WTERR[WT[q]].mv)*(hostile?1.4:1); const nd=d+km; if(nd<dist[q]){ dist[q]=nd; push(nd,q); } };
    for(const q of ADJ[p]) step(q,false); if(nav>=1) for(const q of SEA[p]) step(q,true); }
  const R=supplyRange(c);
  for(let p=0;p<N;p++){ let v=clamp(1-dist[p]/R,0.08,1); if(G.owner[p]===c.i) v=Math.max(v,0.7); sup[p]=v; }
  c._sup=sup;
}
ENG.computeSupply=computeSupply;

// 전쟁 선포·강화
function declareWar(G,a,b,boost){
  if(a===b||findWar(G,a,b)) return;
  const A=G.C[a],B=G.C[b]; if(!A.alive||!B.alive||A.exile||B.exile) return;
  const w={a,b,since:G.day,score:0,sa:'off',sb:'def'};
  G.wars.push(w);
  if(boost&&boost>1) A.tmods.push({k:'mil',v:boost-1,until:G.day+365*4,label:'원정군'});
  for(const ci of [a,b]){ const c=G.C[ci]; if(ci!==G.player) w[ci===a?'sa':'sb']= c.str*1.0 >= G.C[ci===a?b:a].str*0.8 ? 'off':'def'; prepArmies(G,c); computeSupply(G,c); }
  if(a===G.player||b===G.player){ G.stats.wars++; chron(G,`${A.name} ↔ ${B.name} 전쟁`,`${A.name}이(가) ${B.name}에 선전포고했다.`,'戰'); G.queue.push({kind:'stance',war:w}); }
  news(G,`${A.name}, ${B.name}에 선전포고`,'戰');
}
// 전쟁 대비: 군단이 하나뿐이면 수비군과 원정군으로 나눈다
function prepArmies(G,c){
  const as=armiesOf(G,c.i); if(!as.length){ if(c.cap>=0&&c.soldiers>0) newArmy(G,c,c.cap,c.soldiers,{home:true}); return; }
  if(as.length===1&&as[0].n>3000){ const h=as[0]; h.home=true; const k=c.i===G.player?0.5:0.6; const f=newArmy(G,c,h.p,h.n*k); h.n-=f.n; }
}
function makePeace(G,a,b,silent){
  const w=findWar(G,a,b); if(!w) return;
  G.wars=G.wars.filter(x=>x!==w);
  G.C[a].truce[b]=G.day+365*5; G.C[b].truce[a]=G.day+365*5;
  // 상대 땅에 남은 군단은 귀국
  for(const ar of G.armies){ const o=G.owner[ar.p]; if((ar.o===a&&o===b)||(ar.o===b&&o===a)) sendHome(G,ar,true); }
  for(const k in G.sieges){ const s=G.sieges[k]; if((s.o===a&&G.owner[k]===b)||(s.o===b&&G.owner[k]===a)) delete G.sieges[k]; }
  if(a===G.player||b===G.player) chron(G,`${G.C[a].name}·${G.C[b].name} 강화`,`전쟁이 끝났다.`,'和');
  news(G,`${G.C[a].name}·${G.C[b].name} 강화`,'和');
}
ENG.declareWar=declareWar; ENG.makePeace=makePeace;
function nearestOwn(G,ci,p){ let b=-1,bd=1e9; for(let q=0;q<N;q++) if(G.owner[q]===ci){ const d=pdist(p,q); if(d<bd){ bd=d; b=q; } } return b; }
function sendHome(G,a,teleport){ const q=nearestOwn(G,a.o,a.p); if(q<0){ a.n=0; return; } if(teleport){ a.p=q; a.path=[]; a.prog=0; } else if(!orderMove(G,a,q)){ a.p=q; a.path=[]; } }

// 전투
function armyPow(G,a,side,b){
  const c=G.C[a.o]; const p=b.p; const t=D.WTERR[WT[p]];
  weaponFx(c); let f=a.n*(side==='att'?c.wAtk:c.wDef)*(1+Math.max(-0.5,c.m.mil))*(0.35+0.65*a.mor)*(0.4+0.6*a.sup)*(1+0.07*(a.gen.sk-3));
  if(side==='att'){ f*=t.atk; if(a.land>G.day) f*=0.35; if(stanceOf(G,a.o)==='off') f*=1.1; }
  else { f*=t.def*(1+0.12*fortLv(G,p)*(G.owner[p]===a.o?1:0)); if(G.owner[p]===a.o&&stanceOf(G,a.o)==='def') f*=1.2; }
  return f;
}
function tacticMul(b,side){ const t=side==='att'?b.tA:b.tD; return t?t.mul:1; }
function startBattles(G){
  const byProv=new Map(); for(const a of G.armies){ if(a.n<1||a.ret>G.day) continue; if(!byProv.has(a.p)) byProv.set(a.p,[]); byProv.get(a.p).push(a); }
  for(const [p,as] of byProv){
    if(as.length<2||G.battles.some(b=>b.p===p)) continue;
    const owners=[...new Set(as.map(a=>a.o))]; let pair=null;
    for(let i=0;i<owners.length&&!pair;i++) for(let j=i+1;j<owners.length;j++) if(atWar(G,owners[i],owners[j])){ pair=[owners[i],owners[j]]; break; }
    if(!pair) continue;
    let [x,y]=pair; let def = G.owner[p]===x?x:G.owner[p]===y?y:null;
    if(def===null){ const ax=Math.min(...as.filter(a=>a.o===x).map(a=>a.arr||0)), ay=Math.min(...as.filter(a=>a.o===y).map(a=>a.arr||0)); def= ax<=ay?x:y; }
    const att= def===x?y:x;
    const b={id:G.nextArmy++,p,ao:att,do:def,att:as.filter(a=>a.o===att).map(a=>a.id),def:as.filter(a=>a.o===def).map(a=>a.id),day:0,tA:null,tD:null,
      n0A:as.filter(a=>a.o===att).reduce((s,a)=>s+a.n,0), n0D:as.filter(a=>a.o===def).reduce((s,a)=>s+a.n,0), lossA:0, lossD:0};
    G.battles.push(b);
    delete G.sieges[p];
    if((att===G.player||def===G.player) && !G.autoBattle){ const mine=att===G.player?b.n0A:b.n0D; if(mine>=Math.max(2000,G.C[G.player].soldiers*0.15)) G.queue.push({kind:'battle',id:b.id}); }
  }
}
function battleDay(G){
  for(const b of [...G.battles]){
    const A=b.att.map(id=>G.armies.find(a=>a.id===id)).filter(a=>a&&a.n>0&&a.p===b.p&&!(a.ret>G.day));
    const Dd=b.def.map(id=>G.armies.find(a=>a.id===id)).filter(a=>a&&a.n>0&&a.p===b.p&&!(a.ret>G.day));
    // 같은 지방에 새로 도착한 아군 합류
    for(const a of G.armies){ if(a.p!==b.p||a.n<=0||a.ret>G.day) continue; if(a.o===b.ao&&!b.att.includes(a.id)){ b.att.push(a.id); A.push(a); } if(a.o===b.do&&!b.def.includes(a.id)){ b.def.push(a.id); Dd.push(a); } }
    if(!A.length||!Dd.length||!atWar(G,b.ao,b.do)){ endBattle(G,b,A.length?'att':'def',A,Dd); continue; }
    b.day++;
    let pA=A.reduce((s,a)=>s+armyPow(G,a,'att',b),0)*tacticMul(b,'att'), pD=Dd.reduce((s,a)=>s+armyPow(G,a,'def',b),0)*tacticMul(b,'def');
    const nA=A.reduce((s,a)=>s+a.n,0), nD=Dd.reduce((s,a)=>s+a.n,0);
    const rA=Math.pow(pD/Math.max(1,pA),0.8), rD=Math.pow(pA/Math.max(1,pD),0.8);
    const lfA=clamp(0.016*rA,0.002,0.09)*(b.tA?b.tA.loss:1), lfD=clamp(0.016*rD,0.002,0.09)*(b.tD?b.tD.loss:1);
    for(const a of A){ const l=a.n*lfA; a.n-=l; b.lossA+=l; a.mor=clamp(a.mor-0.045*rA,0,1); }
    for(const a of Dd){ const l=a.n*lfD; a.n-=l; b.lossD+=l; a.mor=clamp(a.mor-0.045*rD,0,1); }
    const mA=A.reduce((s,a)=>s+a.mor*a.n,0)/Math.max(1,A.reduce((s,a)=>s+a.n,0)), mD=Dd.reduce((s,a)=>s+a.mor*a.n,0)/Math.max(1,Dd.reduce((s,a)=>s+a.n,0));
    if(mA<0.22||nA<b.n0A*0.05||b.day>40&&mA<mD) endBattle(G,b,'def',A,Dd);
    else if(mD<0.22||nD<b.n0D*0.05||b.day>40) endBattle(G,b,'att',A,Dd);
  }
  for(const c of G.C) if(c.alive) syncSoldiers(G,c);
  G.armies=G.armies.filter(a=>a.n>=1);
}
function endBattle(G,b,winner,A,Dd){
  G.battles=G.battles.filter(x=>x!==b);
  const losers= winner==='att'?Dd:A, wo= winner==='att'?b.ao:b.do, lo= winner==='att'?b.do:b.ao;
  const wt=winner==='att'?b.tA:b.tD; const trap=wt&&wt.trap||0;
  const blocked=q=>{ const o=G.owner[q]; return G.armies.some(x=>x.p===q&&x.o===wo&&x.n>300)||(o>=0&&o!==losers[0].o&&atWar(G,losers[0].o,o)); };
  const wN=(winner==='att'?A:Dd).reduce((s_,a)=>s_+a.n,0), lN=losers.reduce((s_,a)=>s_+a.n,0);
  const encircled=losers.length&&wN>lN*1.3&&ADJ[b.p].length>0&&ADJ[b.p].every(blocked)&&!(G.port&&G.port[b.p]&&G.owner[b.p]===losers[0].o);
  for(const a of losers){ a.mor=Math.min(a.mor,0.2); a.ret=G.day+20;
    if(trap>0&&rng(G)<trap){ wipeArmy(G,a,`${PNAME[b.p]}에서 ${wt.id==='ambush'?'매복에 걸려':wt.id==='encircle'?'포위되어':'계략에 빠져'} 궤멸했다`); continue; }
    if(encircled&&rng(G)<0.5){ wipeArmy(G,a,`${PNAME[b.p]}에서 퇴로가 끊겨 항복했다`); continue; }
    if(a.max&&a.n<a.max*0.2){ wipeArmy(G,a,'소모율 80%를 넘어 와해되었다'); continue; }
    let q=-1,bd=1e9; for(let x=0;x<N;x++) if(G.owner[x]===a.o&&x!==b.p&&!G.battles.some(bb=>bb.p===x)){ const d=pdist(x,b.p); if(d<bd){ bd=d; q=x; } }
    if(q<0){ wipeArmy(G,a,'퇴각할 땅이 없어 흩어졌다'); continue; }
    if(!orderMove(G,a,q)){ a.n*=0.5; a.p=q; a.path=[]; if(a.max&&a.n<a.max*0.2) wipeArmy(G,a,'퇴로를 뚫다 와해되었다'); } }
  const w=findWar(G,b.ao,b.do); const big=b.lossA+b.lossD>Math.max(800,(b.n0A+b.n0D)*0.05);
  if(w&&big){ w.score+= (wo===w.a?1:-1); }
  const rec={y:G.y,m:G.m,p:b.p,ao:b.ao,do:b.do,win:wo,lossA:Math.round(b.lossA),lossD:Math.round(b.lossD),n0A:Math.round(b.n0A),n0D:Math.round(b.n0D),days:b.day};
  (G.battleLog=G.battleLog||[]).push(rec); if(G.battleLog.length>80) G.battleLog.shift();
  if(b.ao===G.player||b.do===G.player){ const won=wo===G.player; const P=G.C[G.player]; const E=G.C[won?lo:wo];
    chron(G,`${PNAME[b.p]} 전투 ${won?'승리':'패배'}`,`${b.day}일간의 전투. 아군 손실 ${fmtPop((b.ao===G.player?b.lossA:b.lossD))}, ${E.name} 손실 ${fmtPop((b.ao===G.player?b.lossD:b.lossA))}.`,'戰');
    news(G,`${PNAME[b.p]} 전투 — ${won?'승리':'패배'}`,'戰'); }
  else if(big&&b.lossA+b.lossD>20000) news(G,`${PNAME[b.p]} 전투: ${G.C[wo].name} 승리`,'戰');
}
ENG.battleTactic=function(G,bid,tid){
  const b=G.battles.find(x=>x.id===bid); if(!b) return; const T=D.TACTICS.find(t=>t.id===tid); if(!T) return;
  const side=b.ao===G.player?'att':'def'; const as=(side==='att'?b.att:b.def).map(id=>G.armies.find(a=>a.id===id)).filter(Boolean);
  let mul=1, loss=T.loss||1, msg='';
  if(T.fx==='gen'){ const sk=Math.max(...as.map(a=>a.gen.sk),1); mul=1+0.06*(sk-2); }
  else if(T.gamble){ if(rng(G)<T.gamble){ mul=T.fx; if(T.mor){ const en=(side==='att'?b.def:b.att).map(id=>G.armies.find(a=>a.id===id)).filter(Boolean); en.forEach(a=>a.mor=clamp(a.mor+T.mor,0,1)); } msg='성공'; } else { mul=T.fail||1; if(T.failMor) as.forEach(a=>a.mor=clamp(a.mor+T.failMor,0,1)); msg='실패'; } }
  else mul=T.fx;
  const t={id:tid,mul,loss,msg,trap:(msg!=='실패'&&T.trap)||0}; if(side==='att') b.tA=t; else b.tD=t;
  return msg;
};
// AI 전술 (플레이어가 아닌 쪽)
function aiTactic(G,b){ for(const side of ['att','def']){ const o=side==='att'?b.ao:b.do; if(o===G.player&&!G.autoBattle) continue; if(side==='att'?b.tA:b.tD) continue;
  const as=(side==='att'?b.att:b.def).map(id=>G.armies.find(a=>a.id===id)).filter(Boolean); const sk=as.length?Math.max(...as.map(a=>a.gen.sk)):3;
  const t={id:'ai',mul:1+0.05*(sk-3)+(rng(G)-0.5)*0.15,loss:1,trap:sk>=5&&rng(G)<0.3?0.35:0}; if(side==='att') b.tA=t; else b.tD=t; } }

// 포위
function siegeDay(G){
  const busy=new Set(G.battles.map(b=>b.p));
  const here=new Map(); for(const a of G.armies){ if(a.path.length||busy.has(a.p)||a.ret>G.day) continue; const o=G.owner[a.p]; if(o<0||!atWar(G,a.o,o)) continue; const k=a.p; if(!here.has(k)) here.set(k,[]); here.get(k).push(a); }
  for(const k in G.sieges) if(!here.has(+k)) delete G.sieges[k];
  for(const [p,as] of here){
    const o=as[0].o; const mine=as.filter(a=>a.o===o); const n=mine.reduce((s,a)=>s+a.n,0); const sup=mine.reduce((s,a)=>s+a.sup*a.n,0)/Math.max(1,n);
    const c=G.C[o]; const art=(c.techs.has('cannon')?0.7:0)+(c.techs.has('rifle')?0.4:0)+(c.techs.has('flight')?0.4:0);
    const fe=Math.max(0,fortLv(G,p)-art); const need=Math.max(1500,G.pop[p]*0.004);
    const days=25*(1+fe)*(1+PAREA[p]/120000)/clamp(n/need,0.25,2.5)*(mine.some(a=>a.land>G.day)?2:1)/(0.5+0.5*sup);
    const s=G.sieges[p]||(G.sieges[p]={o,prog:0}); if(s.o!==o){ s.o=o; s.prog=0; }
    s.prog+=1/days;
    if(s.prog>=1){ delete G.sieges[p]; const def=G.owner[p]; const w=findWar(G,o,def); const wasCap=G.C[def].cap===p;
      if(wasCap) plunderRelic(G,def,o); setOwner(G,p,o); G.pop[p]*=0.95; if(w) w.score+=(o===w.a?1:-1)*(wasCap?3:1);
      if(o===G.player) G.stats.conquered++;
      if(o===G.player||def===G.player) news(G,`${G.C[o].name}, ${PNAME[p]} 점령`,'戰');
      checkDeaths(G); fixCapitals(G); }
  }
}
// 이동
function moveDay(G){
  const busy=new Set(G.battles.map(b=>b.p));
  for(const a of G.armies){
    if(busy.has(a.p)&&G.battles.some(b=>b.p===a.p&&(b.att.includes(a.id)||b.def.includes(a.id)))) continue;
    if(!a.path.length) continue;
    const st=a.path[0];
    if(!passable(G,a.o,st.p)){ a.path=[]; continue; }
    a.prog+=1; a.done=(a.done||0)+1;
    if(a.prog>=st.days){ a.prog=0; a.path.shift(); const hostile=G.owner[st.p]>=0&&G.owner[st.p]!==a.o; if(st.sea&&hostile) a.land=G.day+20; a.p=st.p; a.arr=G.day; }
  }
}
// 소모·사기·병참
function armyUpkeepDay(G){
  for(const a of G.armies){
    const c=G.C[a.o]; a.sup = c._sup? c._sup[a.p] : (G.owner[a.p]===a.o?1:0.5);
    const own=G.owner[a.p]===a.o; const t=D.WTERR[WT[a.p]];
    const attr = own&&a.sup>0.6 ? 0 : 0.003*Math.pow(1-a.sup,2)+t.attr;
    if(attr>0) a.n*=1-attr;
    if(!G.battles.some(b=>b.p===a.p)) a.mor=clamp(a.mor+0.012*(0.3+0.7*a.sup),0,1);
  }
}
// 역사 인물 장수 배치
function assignGenerals(G){
  for(const f of D.FIGS){ const s=G.figs[f.id]; if(!s||s.st!=='alive'||!s.svc||!has(G,s.svc)) continue; if((s.role||defRole(f))!=='mil') continue; if(G.y<f.a[0]||G.y>f.a[1]) continue;
    const c=C(G,s.svc); if(G.armies.some(a=>a.gen.fig===f.id)) continue; const as=armiesOf(G,c.i).sort((x,y)=>y.n-x.n); if(!as.length) continue;
    const a=as.find(x=>!x.gen.fig)||as[0]; a.gen={n:f.n,sk:6,fig:f.id}; if(c.i===G.player) news(G,`${f.n}, ${a.name} 지휘`,'將'); }
  for(const a of G.armies) if(a.gen.fig){ const s=G.figs[a.gen.fig]; if(!s||s.st!=='alive'){ a.gen={n:genName(G,G.C[a.o]),sk:3}; } }
}
// AI 지휘 (플레이어의 자동 군단 포함)
function armyAI(G,a){
  const c=G.C[a.o]; const en=enemiesOf(G,a.o);
  if(!en.length){ if(G.owner[a.p]!==a.o&&!a.path.length) sendHome(G,a,false); return; }
  if(a.path.length){ const d=a.path[a.path.length-1].p; const o=G.owner[d]; if(o===a.o||o<0||en.includes(o)) return; }
  if(a.ret>G.day) return;
  const stance=stanceOf(G,a.o);
  const myPow=a.n*(c.wAtk||1)*(1+c.m.mil)*(0.35+0.65*a.mor);
  // 우리 땅에 들어온 적
  const intr=G.armies.filter(e=>en.includes(e.o)&&G.owner[e.p]===a.o&&!(e.ret>G.day));
  if(intr.length){ intr.sort((x,y)=>pdist(x.p,a.p)-pdist(y.p,a.p)); const t=intr[0]; const ep=t.n*(G.C[t.o].wDef||1)*(1+G.C[t.o].m.mil)*(0.35+0.65*t.mor);
    if(myPow>=ep*0.7){ orderMove(G,a,t.p); return; } if(a.home&&c.cap>=0&&a.p!==c.cap){ orderMove(G,a,c.cap); return; } }
  if(a.home&&c.cap>=0){ if(a.p!==c.cap&&!a.path.length) orderMove(G,a,c.cap); if(stance==='def'||c.prov<6) return; }
  if(stance==='def'){ // 방어: 잃은 땅을 되찾고, 국경을 지킨다
    let best=-1,bd=1e9; for(let p=0;p<N;p++){ const o=G.owner[p]; if(o>=0&&en.includes(o)&&ADJ[p].some(q=>G.owner[q]===a.o)){ const d=pdist(a.p,p); const guard=G.armies.filter(e=>e.p===p&&e.o===o).reduce((s_,e)=>s_+e.n,0); if(guard<a.n*0.6&&d<bd){ bd=d; best=p; } } }
    if(best>=0&&bd<600&&rng(G)<0.35) orderMove(G,a,best); return; }
  // 공격: 약한 적 군단이나 가까운 적 지방
  if(G.sieges[a.p]&&G.sieges[a.p].o===a.o&&!a.path.length) return;
  const foes=G.armies.filter(e=>en.includes(e.o)&&pdist(e.p,a.p)<700&&!(e.ret>G.day));
  for(const e of foes.sort((x,y)=>pdist(x.p,a.p)-pdist(y.p,a.p))){ const ep=e.n*(G.C[e.o].wDef||1)*(1+G.C[e.o].m.mil)*(0.35+0.65*e.mor)*D.WTERR[WT[e.p]].def; if(myPow*D.WTERR[WT[e.p]].atk>ep*1.2&&passable(G,a.o,e.p)){ if(orderMove(G,a,e.p)) return; } }
  let best=-1,bd=1e9; for(let p=0;p<N;p++){ const o=G.owner[p]; if(o<0||!en.includes(o)) continue; if(G.sieges[p]&&G.sieges[p].o===a.o&&G.armies.some(x=>x.p===p&&x.o===a.o&&x!==a)) continue; const d=pdist(a.p,p)*(c.cap===p?0.7:1)*(G.C[o].cap===p?0.8:1); if(d<bd){ bd=d; best=p; } }
  if(best>=0&&best!==a.p) orderMove(G,a,best);
}
function warDay(G){
  if(!G.armies) return;
  moveDay(G);
  startBattles(G);
  for(const b of G.battles) aiTactic(G,b);
  battleDay(G);
  siegeDay(G);
  armyUpkeepDay(G);
  attritionCheck(G); G.armies=G.armies.filter(a=>a.n>=1);
  if(G.wars.length && G.day%5===0) for(const a of G.armies){ if(a.o===G.player&&!a.auto) continue; armyAI(G,a); }
  else if(G.day%15===0) for(const a of G.armies){ if(a.o!==G.player&&!G.wars.some(w=>w.a===a.o||w.b===a.o)&&G.owner[a.p]!==a.o&&!a.path.length) sendHome(G,a,false); }
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
    if(op.type==='port'){ if(G.owner[op.p]!==op.by){ G.ops=G.ops.filter(x=>x!==op); continue; } op.prog+=1/op.days; if(op.prog>=1){ G.port[op.p]=Math.max(G.port[op.p],op.lv); G.ops=G.ops.filter(x=>x!==op); if(op.by===G.player) news(G,`${PNAME[op.p]}: ${D.PORTS[op.lv].n} 완공`,'港'); } continue; }
    if(op.type==='road'){ if(G.owner[op.p]!==op.by){ G.ops=G.ops.filter(x=>x!==op); continue; } op.prog+=1/op.days; if(op.prog>=1){ G.road[op.p]=Math.max(G.road[op.p],op.lv); G.ops=G.ops.filter(x=>x!==op); if(op.by===G.player) news(G,`${PNAME[op.p]}: ${D.ROADS[op.lv].n} 완공`,'路'); } continue; }
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
  c.mob = (0.003 + 0.002*c.aggr + (G.wars.some(w=>w.a===c.i||w.b===c.i)?0.003:0))*(c.gold<0?0.7:1);
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
  // 도로 건설
  if(rng(G)<0.05){ const L=roadMax(c); let best=-1,bp=-1; for(let p=0;p<N;p++) if(G.owner[p]===c.i&&G.road[p]<L){ const v=G.pop[p]*(1+rng(G)); if(v>bp){ bp=v; best=p; } } if(best>=0){ const cost=roadCost(G,c,best,G.road[best]+1); if(c.gold>cost*2){ c.gold-=cost; G.road[best]++; } } }
  if(rng(G)<0.03){ const L=portMax(c); let best=-1,bv=0; for(let p=0;p<N;p++) if(G.owner[p]===c.i&&PCOAST[p]&&G.port[p]<L){ const v=PSUIT[p]*(1+rng(G))/(1+G.port[p]); if(v>bv){ bv=v; best=p; } } if(best>=0){ const cost=portCost(G,c,best,G.port[best]+1); if(c.gold>cost*2){ c.gold-=cost; G.port[best]++; } } }
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
        if(owner===P.tag) chron(G,`${f.n} 탄생`,`${f.n}이(가) 태어났다. 훗날 ${f.role}(으)로 이름을 남길 아이다. ${f.x}`,'人');
        else if(!f.tags.length || (G.C[G.tag[owner]]&&G.C[G.tag[owner]].pop>3e6)) news(G,`${f.n} 탄생 (${owner?G.C[G.tag[owner]].name:'세계'})`,'人');
      }
      continue;
    }
    if(s.st==='alive'){
      // 소속 갱신 (국가가 개칭·멸망한 경우)
      if(!s.svc||!has(G,s.svc)){ s.svc=f.tags.find(t=>has(G,t))||null; }
      if(G.y>=s.dy){ s.st='dead'; const P=G.C[G.player]; if(s.svc===P.tag) chron(G,`${f.n} 사망`,`${f.n}이(가) 세상을 떠났다.`,'人'); }
      else if(G.y===f.a[0] && G.m===1 && s.svc===G.C[G.player].tag){ chron(G,`${f.n}, 역사의 무대에 서다`,f.x,'人'); if(!s.roleAsked){ s.roleAsked=1; G.queue.push({kind:'figure',id:f.id}); } }
    }
  }
}

// ── 사건 처리 ──
function resolveTag(G,E,t){ if(t==='*KOREA') return E.krTag(); if(t==='*KRPRE') return E.krPre(); return t; }
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
  if(ev.tag && ev.tag.startsWith('*') && !subj) return;
  const opt = ev.o.find(o=>o.h)||ev.o[0];
  applyOption(G,E,ev,opt,subj,false);
  runAfter(G,E,ev);
  const big = ev.maj || !ev.tag;
  if(big) chron(G, ev.t, ev.x, ev.cat);
  news(G, ev.t, ev.cat);
}

function randomEvent(G,E){
  const P=G.C[G.player]; if(!P.alive||P.exile) return;
  const src = (P.techs.has('writing') && !['tribe','chief'].includes(P.gov)) ? D.RANDOM : D.RANDOM_PRE;
  const pool=src.filter(r=>(!r.minY||G.y>=r.minY)&&(!r.maxY||G.y<=r.maxY)&&(!r.c||(()=>{try{return r.c(E);}catch(e){return false;}})()));
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
  if(G.day%10===0) for(const c of G.C){ if(c.alive&&(G.wars.some(w=>w.a===c.i||w.b===c.i)||c.i===G.player)) computeSupply(G,c); }
  warDay(G);
  // 연쇄 사건
  if(G.pend&&G.pend.length){ const due=G.pend.filter(x=>x.day<=G.day); if(due.length){ G.pend=G.pend.filter(x=>x.day>G.day);
    for(const x of due){ const base=D.CHAINS[x.id]; if(!base||!has(G,x.tag)) continue; if(base.cond){ try{ if(!base.cond(E,x.tag)) continue; }catch(e){ continue; } }
      const ev=Object.assign({},base,{tag:x.tag,chain:true});
      if(x.tag===G.C[G.player].tag) G.queue.push({kind:'event',ev,subj:x.tag}); else { const o=ev.o.find(o=>o.h)||ev.o[0]; applyOption(G,E,ev,o,x.tag,false); } } } }
  // 사건
  const key=dkey(G.y,G.m,G.d);
  while(G.evPtr<EVS.length && EVS[G.evPtr].k<=key){ processEvent(G,E,EVS[G.evPtr]); G.evPtr++; }
  if(newMonth) monthly(G,E);
  if(newYear) yearly(G,E);
  if(G.y>=2100 && !G.over){ G.over=true; G.gameOver={reason:'end',y:2100}; }
};

function monthly(G,E){
  const yr=G.y;
  computeTemp(G);
  natureMonth(G);
  epiMonth(G); epiAI(G);
  wonderMonth(G); relicMonth(G);
  // 이웃의 지식 (기술 확산)
  for(const c of G.C){ if(!c.alive) continue; recalc(G,c); }
  // 인구
  for(let p=0;p<N;p++){
    const o=G.owner[p]; const K=Kprov(G,p); let r;
    if(o>=0){ const c=G.C[o]; const surv=clamp(0.64+(c.leS-28)*0.011,0.3,0.995); const gen=26+30*c.dev*c.dev; r=Math.log(c.tfrS*surv/2.05)/gen + (c.m.growth||0); }
    else r=0.008;
    let P=G.pop[p];
    { const T=K/headroom(G.y)*0.85; if(o>=0&&P<T) r+=0.012*(1-P/T); } // 역병·전쟁 뒤의 회복 (빈 땅으로의 이주와 높은 출산)
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
    { const ct=clamp((D.GOV_CORR[c.gov]||15)+2.5*Math.sqrt(Math.max(0,c.prov-6))+(1-(c.inst||0.8))*25+(c.stab<0?-c.stab*3:0)+(c.m.corr||0)+(c.gold>c.income*5?3:0),3,85); c.corrT=ct; c.corr+=(ct-c.corr)*0.015;
      if(c.i!==G.player&&c.corr>35&&rng(G)<0.02){ const cost=corrCost(c); if(c.gold>cost*2){ c.gold-=cost; c.corr=Math.max(0,c.corr-8); } } }
    const inst = clamp((c.i===G.player?Math.max(c.inst,0.9):c.inst) + (GOV_INST[c.gov]||0) + c.policies.reduce((a,id)=>a+(POL_INST[id]||0),0),0.3,1.25);
    c.instE=inst;
    const effT = G.y<1800 ? 0.85+0.15*c.lit : clamp(inst*(0.2+0.8*c.lit*c.lit)+0.03*c.stab,0.12,1.2);
    c.eff+=(effT-c.eff)*(effT>c.eff?0.0035:0.002);
    c._rr=resRate(G,c);
    c.gold += (c.income-c.expense)/12;
    const atWar=G.wars.some(w=>w.a===c.i||w.b===c.i);
    const target=c.pop*c.mob*clamp(1+c.m.manp*0.4,0.3,1.5);
    syncSoldiers(G,c);
    manpowerMonth(G,c,target);
    if(c.gold< -3*Math.max(c.income,1)){ c.gold=0; c.stab=clamp(c.stab-1,-3,3); if(c.i===G.player) chron(G,'국가 파산','빚을 갚지 못해 채무를 탕감했다. 신용과 민심이 크게 흔들린다.','債'); }
    let stT = c.m.stab + (atWar?-0.4:0) + (c.gold< -c.income?-0.8:0) - Math.max(0,(c.prov-25)/60) + (c.exile?0.5:0);
    stT=clamp(stT,-3,3);
    c.stab += (stT-c.stab)*0.03;
    c.stab=clamp(c.stab,-3,3);
    if(c.i!==G.player) aiMonth(G,c);
    // AI 반란
    if(c.i!==G.player && c.stab<-1.8 && c.prov>6 && rng(G)<0.01){ rebel(G,c); }
  }
  // 이웃 지식 캐시 (분기마다)
  if(G.m%3===0){ for(const c of G.C){ if(!c.alive) continue; const s=new Set(), rs=new Set(); for(const n of neighbors(G,c)){ for(const id of G.C[n].techs) s.add(id); for(const r in (G.C[n].resCnt||{})) rs.add(r); } c._nbKnow=s; c._nbRes=rs; } }
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
  assignGenerals(G);
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
  recalc(G,r); r.soldiers=r.pop*0.015; r.cap=far[0]; resetArmies(G,r); c.stab=Math.min(3,c.stab+1.5);
  news(G,`${c.name}에서 반란 — ${r.name} 독립`,'亂');
}
function renormK(G){
  // 세계 부양력 총합 = 실제 인구 × 여유 × (세계 평균 기술 계수)
  const save=G.kscale; G.kscale=1; G._noClim=true; let ks=0, tfw=0, pw_=0;
  for(let p=0;p<N;p++){ ks+=Kprov(G,p); const o=G.owner[p]; if(o>=0){ const c=G.C[o]; tfw+=G.pop[p]*(c._tf||1); pw_+=G.pop[p]; } }
  const avgTF = pw_>0? clamp(tfw/pw_,0.5,2.5):1;
  G._noClim=false;
  G.kscale = interpLog(D.STATS.worldPop,G.y)*headroom(G.y)*avgTF/ks;
  if(!isFinite(G.kscale)) G.kscale=save;
}
ENG.renormK=renormK;
function yearly(G,E){
  yearlyEmissions(G);
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
  moveArmy(G,id,p){ const a=G.armies.find(x=>x.id===id&&x.o===G.player); if(!a) return false; if(G.battles.some(b=>b.att.includes(id)||b.def.includes(id))) return 'battle'; const ok=orderMove(G,a,p); if(ok){ a.auto=false; if(G.owner[p]>=0&&G.owner[p]!==G.player&&!atWar(G,G.player,G.owner[p])) return false; } return ok; },
  stopArmy(G,id){ const a=G.armies.find(x=>x.id===id&&x.o===G.player); if(a){ a.path=[]; a.prog=0; a.auto=false; } },
  toggleAuto(G,id){ const a=G.armies.find(x=>x.id===id&&x.o===G.player); if(a){ a.auto=!a.auto; if(a.auto) a.ret=0; } },
  splitArmy(G,id){ const a=G.armies.find(x=>x.id===id&&x.o===G.player); if(!a||a.n<200) return null; const c=G.C[G.player]; const b=newArmy(G,c,a.p,a.n/2,{mor:a.mor,auto:a.auto,max:(a.max||a.n)/2}); a.n/=2; a.max=(a.max||a.n*2)/2; b.sup=a.sup; return b; },
  mergeArmies(G,id){ const a=G.armies.find(x=>x.id===id&&x.o===G.player); if(!a) return 0; const others=G.armies.filter(x=>x!==a&&x.o===G.player&&x.p===a.p&&!G.battles.some(b=>b.att.includes(x.id)||b.def.includes(x.id))); for(const o of others){ a.mor=(a.mor*a.n+o.mor*o.n)/(a.n+o.n); a.n+=o.n; a.max=(a.max||0)+(o.max||o.n); if(o.gen.sk>a.gen.sk) a.gen=o.gen; if(o.home) a.home=true; o.n=0; } G.armies=G.armies.filter(x=>x.n>0); return others.length; },
  setStance(G,enemy,st){ const w=findWar(G,G.player,enemy); if(!w) return; if(w.a===G.player) w.sa=st; else w.sb=st; },
  buildRoad(G,p){ return startRoad(G,G.C[G.player],p); },
  setAutoBattle(G,v){ G.autoBattle=!!v; },
  buildPort(G,p){ return startPort(G,G.C[G.player],p); },
  antiCorruption(G){ const P=G.C[G.player]; const cost=corrCost(P); if(P.gold<cost) return false; P.gold-=cost; P.corr=Math.max(0,P.corr-8); P.stab=clamp(P.stab-0.2,-3,3); chron(G,'부패 척결',`관리들의 비리를 조사해 부패도를 낮췄다. 비용 ${Math.round(cost).toLocaleString()}.`,'淸'); return true; },
  setFigRole(G,id,role){ const s=G.figs[id]; if(s){ s.role=role; for(const a of G.armies) if(a.gen.fig===id&&role!=='mil') a.gen={n:genName(G,G.C[a.o]),sk:3}; } },
  offerPeace(G,ti){ const P=G.C[G.player]; if(P.lastPeaceAsk>G.day-180) return 'wait'; P.lastPeaceAsk=G.day; if(ENG.playerPeaceAccept(G,ti)){ makePeace(G,G.player,ti); return 'ok'; } return 'no'; },
  develop(G,p){ const P=G.C[G.player]; if(G.owner[p]!==G.player) return false; const cost=P.income*0.1; if(P.gold<cost) return false; P.gold-=cost; G.pop[p]*=1.04; return true; },
  relief(G,level,lost){ const P=G.C[G.player]; if(level===2){ P.gold-=P.income*0.25; P.stab=clamp(P.stab+0.4,-3,3); P.tmods.push({k:'prod',v:0.03,until:G.day+365*2,label:'재건'}); }
    else if(level===1){ P.gold-=P.income*0.08; } else { P.stab=clamp(P.stab-0.6,-3,3); } },
  buildWonder(G,id){ const P=G.C[G.player]; const w=D.WONDERS.find(x=>x.id===id); if(!w||(w.req&&!P.techs.has(w.req))||P.gold<wonderCost(P,w)*1.2) return false; return startWonder(G,P,id,1.2); },
  investSanitation(G){ const P=G.C[G.player]; const cost=sanCost(P); if((P.sanInv||0)>=2||P.gold<cost) return false; P.gold-=cost; P.sanInv=(P.sanInv||0)+0.5; recalc(G,P); chron(G,'위생 사업',`우물과 도랑을 정비하고 의원을 늘렸다. 위생 수준 ${P.san.toFixed(1)}.`,'衛'); return true; },
  epiAction(G,id,eid){ epiAction(G,id,eid); },
  switchTo(G,ci){ G.player=ci; const c=G.C[ci]; c.ruler=null; ensureRuler(G,c,true); c.mob=c.mob||0.006; G.gameOver=null; G.over=false; chron(G,`${c.name}으로 이어가다`,`새로운 나라의 역사를 이끈다.`,'史'); }
};

// ── 지표 ──
ENG.worldPop=function(G){ let s=0; for(let p=0;p<N;p++) s+=G.pop[p]; return s; };
ENG.provPop=(G,p)=>G.pop[p];
ENG.Kprov=Kprov;
ENG.has=has; ENG.C=C; ENG.rng=rng; ENG.inBox=inBox; ENG.expectedTech=expectedTech;

// ── 저장 / 불러오기 ──
ENG.save=function(G){
  const o=Object.assign({},G); delete o._E;
  o.owner=Array.from(G.owner); o.pop=Array.from(G.pop,v=>Math.round(v)); o.road=Array.from(G.road||[]); o.port=Array.from(G.port||[]);
  o.C=G.C.map(c=>{ const x=Object.assign({},c); x.techs=[...c.techs]; delete x.fx; delete x.m; delete x._nbKnow; return x; });
  o.queue=G.queue.filter(q=>q.kind==='peace');
  delete o._E;
  return JSON.stringify(o);
};
ENG.load=function(s){
  const o=JSON.parse(s); o.owner=Int16Array.from(o.owner); o.pop=Float64Array.from(o.pop); o.road=Uint8Array.from(o.road||[]); if(o.road.length!==N) o.road=new Uint8Array(N); o.port=Uint8Array.from(o.port||[]); if(o.port.length!==N) o.port=new Uint8Array(N); o.pend=o.pend||[]; o.epi=o.epi||[]; o.wond=o.wond||{}; o.wb=o.wb||[]; o.relics=o.relics||{}; o.relicSt=o.relicSt||{}; o.armies=o.armies||[]; o.battles=o.battles||[]; o.sieges=o.sieges||{};
  o.C.forEach(c=>{ c.techs=new Set(c.techs); c.techDirty=true; delete c._sup; });
  o.queue=o.queue||[];
  for(const c of o.C) if(c.alive) recalc(o,c);
  return o;
};
})(typeof window!=='undefined'?window:globalThis);
