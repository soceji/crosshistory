// 지도 정리: 한 지방이 바다 건너 여러 조각으로 흩어진 것을 바로잡는다.
//  - 다른 지방과 맞닿은 조각은 가장 길게 맞닿은 지방에 붙인다
//  - 홀로 떨어진 섬 조각은 크면 새 지방, 작으면 가장 가까운 지방에 붙인다
// 그런 뒤 지방 중심·면적·지형·해안·이웃·바닷길을 다시 계산해 src/map.js 를 다시 쓴다.
// 사용: node tools/fix_map.js
const fs=require('fs'); const path=require('path');
const file=path.join(__dirname,'..','src','map.js');
const src=fs.readFileSync(file,'utf8'); const M=JSON.parse(src.replace(/^window\.MAPDATA=/,'').replace(/;\s*$/,''));
const {W,H,res:RES,lon0:LON0,lat0:LAT0}=M;
const bin=Buffer.from(M.rle,'base64'); const runs=new Uint16Array(bin.buffer.slice(bin.byteOffset,bin.byteOffset+bin.length));
const id=new Uint16Array(W*H); { let k=0; for(let i=0;i<runs.length;i+=2){ id.fill(runs[i],k,k+runs[i+1]); k+=runs[i+1]; } }
const land=c=>id[c]!==0; const real=c=>id[c]!==0&&id[c]!==65535;
function nb(c){const x=c%W,y=(c/W)|0;const r=[y*W+(x+1)%W,y*W+(x-1+W)%W];if(y>0)r.push(c-W);if(y<H-1)r.push(c+W);return r}
let N=M.provs.length;
const cellsOf=()=>{ const L=Array.from({length:N+1},()=>[]); for(let c=0;c<W*H;c++) if(real(c)) L[id[c]].push(c); return L; };
const cx=c=>c%W, cy=c=>(c/W)|0;
let changed=0, created=0;
for(let pass=0;pass<4;pass++){
  const L=cellsOf(); let moved=0;
  // 각 지방의 연결 성분
  const comps=[]; const seen=new Uint8Array(W*H);
  for(let p=1;p<=N;p++){ const cs=[]; for(const c of L[p]){ if(seen[c]) continue; const q=[c]; seen[c]=1; for(let k=0;k<q.length;k++) for(const n of nb(q[k])) if(!seen[n]&&id[n]===p){ seen[n]=1; q.push(n);} cs.push(q); }
    if(cs.length>1){ cs.sort((a,b)=>b.length-a.length); for(let i=1;i<cs.length;i++) comps.push({p,cells:cs[i],main:cs[0]}); } }
  // 지방 중심 (가장 큰 성분 기준)
  const cen=new Array(N+1); { const L2=cellsOf(); for(let p=1;p<=N;p++){ let sx=0,sy=0,n=0,x0=L2[p].length?cx(L2[p][0]):0; for(const c of L2[p]){ let dx=cx(c)-x0; if(dx>W/2)dx-=W; if(dx<-W/2)dx+=W; sx+=x0+dx; sy+=cy(c); n++; } cen[p]=n?[sx/n,sy/n]:null; } }
  for(const cp of comps){
    const touch=new Map(); for(const c of cp.cells) for(const n of nb(c)) if(real(n)&&id[n]!==cp.p) touch.set(id[n],(touch.get(id[n])||0)+1);
    let target=0;
    if(touch.size){ target=[...touch.entries()].sort((a,b)=>b[1]-a[1])[0][0]; }
    else { // 섬 조각
      let sx=0,sy=0,x0=cx(cp.cells[0]); for(const c of cp.cells){ let dx=cx(c)-x0; if(dx>W/2)dx-=W; if(dx<-W/2)dx+=W; sx+=x0+dx; sy+=cy(c); } const mx=sx/cp.cells.length, my=sy/cp.cells.length;
      let best=0,bd=1e9; for(let p=1;p<=N;p++){ if(!cen[p]) continue; let dx=Math.abs(cen[p][0]-mx); if(dx>W/2)dx=W-dx; dx*=Math.cos((LAT0-my*RES)*Math.PI/180); const d=Math.hypot(dx,cen[p][1]-my); if(d<bd){bd=d;best=p;} }
      if(best===cp.p||(cp.cells.length<12&&bd<12)) target=best; else { N++; target=N; created++; }
    }
    if(target&&target!==cp.p){ for(const c of cp.cells) id[c]=target; moved+=cp.cells.length; }
  }
  changed+=moved; console.log('pass',pass,'fragments',comps.length,'cells moved',moved); if(!moved) break;
}
// 통계 다시 계산 (mapgen.js 와 같은 방식)
const P=[];for(let i=0;i<=N;i++)P.push({sx:0,sy:0,n:0,a:0,coast:0,adj:new Set(),sea:new Set(),x0:null});
for(let c=0;c<W*H;c++){const p=id[c];if(!p||p===65535)continue;const x=c%W,y=(c/W)|0;const lat=LAT0-(y+0.5)*RES;const o=P[p];if(o.x0===null)o.x0=x;let dx=x-o.x0;if(dx>W/2)dx-=W;if(dx<-W/2)dx+=W;o.n++;o.a+=Math.cos(lat*Math.PI/180);o.sx+=o.x0+dx;o.sy+=y;
  for(const n of nb(c)){if(!land(n))o.coast=1;else if(real(n)&&id[n]!==p)o.adj.add(id[n]);}}
const lab=new Uint16Array(W*H),dist=new Uint8Array(W*H);let q=[];
for(let c=0;c<W*H;c++)if(real(c)&&P[id[c]].coast)for(const n of nb(c))if(!land(n)&&!lab[n]){lab[n]=id[c];dist[n]=1;q.push(n)}
const LIM=11;
while(q.length){const nq=[];for(const c of q)for(const n of nb(c)){if(land(n))continue;if(!lab[n]){if(dist[c]<LIM){lab[n]=lab[c];dist[n]=dist[c]+1;nq.push(n)}}else if(lab[n]!==lab[c]){P[lab[n]].sea.add(lab[c]);P[lab[c]].sea.add(lab[n]);}}q=nq;}
function terrain(lon,lat){const inb=(a,b,c,d)=>lon>=a&&lon<=b&&lat>=c&&lat<=d;
 if(Math.abs(lat)>63)return 2;
 if(inb(-17,33,15,31)||inb(34,58,14,31)||inb(68,74,24,29)||inb(78,112,37,45)||inb(118,143,-31,-19)||inb(12,22,-27,-18)||inb(52,63,27,35)||inb(-71,-69,-27,-18)||inb(-117,-110,30,36))return 1;
 if(lat>51&&lat<=63)return 3;
 if(inb(48,125,42,51)||inb(-112,-96,35,50)||inb(-68,-58,-42,-30))return 5;
 if(Math.abs(lat)<12)return 4;return 0}
const provs=[],adj=[],sea=[];
for(let p=1;p<=N;p++){const o=P[p];let lon=LON0+(o.sx/(o.n||1)+0.5)*RES;if(lon>=180)lon-=360;if(lon<-180)lon+=360;const lat=LAT0-(o.sy/(o.n||1)+0.5)*RES;
 const old=M.provs[p-1];
 provs.push([+lon.toFixed(2),+lat.toFixed(2),Math.max(1,Math.round(o.a*773)),old&&o.n?terrain(lon,lat):terrain(lon,lat),o.coast]);
 adj.push([...o.adj].map(v=>v-1));sea.push([...o.sea].filter(v=>!o.adj.has(v)).map(v=>v-1));}
const out=[];let cur=id[0],len=0;for(let i=0;i<W*H;i++){const v=id[i];if(v===cur&&len<65535)len++;else{out.push(cur,len);cur=v;len=1}}out.push(cur,len);
const b64=Buffer.from(new Uint16Array(out).buffer).toString('base64');
fs.writeFileSync(file,'window.MAPDATA='+JSON.stringify({W,H,lon0:LON0,lat0:LAT0,res:RES,rle:b64,provs,adj,sea})+';');
console.log('cells moved',changed,'new provinces',created,'provinces',N,'empty',P.slice(1).filter(o=>!o.n).length);
