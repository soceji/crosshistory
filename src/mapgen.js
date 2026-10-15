const topo=require('topojson-client');const fs=require('fs');
const land=require('world-atlas/land-50m.json');
const geo=topo.feature(land,land.objects.land);
const RES=0.25,LON0=-180,LAT0=80,LATMIN=-58;
const W=Math.round(360/RES),H=Math.round((LAT0-LATMIN)/RES);
const mask=new Uint8Array(W*H);
// even-odd scanline fill per polygon (rings combined)
function fillPoly(rings){
  for(let y=0;y<H;y++){
    const lat=LAT0-(y+0.5)*RES;const xs=[];
    for(const ring of rings){
      for(let i=0;i<ring.length-1;i++){
        let [x1,y1]=ring[i],[x2,y2]=ring[i+1];
        const segs=[];
        segs.push([x1,y1,x2,y2]);
        for(const [a1,b1,a2,b2] of segs)if((b1>lat)!==(b2>lat)){xs.push(a1+(lat-b1)/(b2-b1)*(a2-a1));}
      }
    }
    if(xs.length%2)continue;xs.sort((a,b)=>a-b);
    for(let k=0;k+1<xs.length;k+=2){
      let a=Math.ceil((xs[k]-LON0)/RES-0.5),b=Math.floor((xs[k+1]-LON0)/RES-0.5);
      a=Math.max(0,a);b=Math.min(2*W-1,b);
      for(let x=a;x<=b;x++)mask[y*W+(x%W)]^=1;
    }
  }
}
for(const f of geo.features){const g=f.geometry;const polys=g.type==='Polygon'?[g.coordinates]:g.coordinates;for(const p of polys){let jump=false;for(const r of p)for(let k=1;k<r.length;k++)if(Math.abs(r[k][0]-r[k-1][0])>180)jump=true;fillPoly(jump?p.map(r=>r.map(([x,y])=>[x<-150?x+360:x,y])):p);}}
// note: XOR across polygons; polygons don't overlap so fine
let landN=0;for(const v of mask)landN+=v;console.log('W',W,'H',H,'land',landN);
// rng
let s=12345;const rnd=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296};
const boxes=[ // [lon1,lon2,lat1,lat2,spacing]
 [124,131.5,33,43.5,0.85],[128.5,146,30,46,1.25],[97,123,20,42,1.55],[-11,42,35,60,1.6],[42,62,36,46,2.0],
 [25,62,24,42,1.8],[67,92,6,33,1.8],[92,126,-11,22,2.2],[-118,-77,7,32,2.2],[-82,-64,-25,6,2.2],
 [-18,16,4,18,2.5],[-100,-60,25,48,2.6],[30,45,-12,15,2.6]];
function spacing(lon,lat){let sp=Math.abs(lat)>56?4.2:3.3;for(const b of boxes)if(lon>=b[0]&&lon<=b[1]&&lat>=b[2]&&lat<=b[3])sp=Math.min(sp,b[4]);return sp}
const cells=[];for(let i=0;i<W*H;i++)if(mask[i])cells.push(i);
for(let i=cells.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[cells[i],cells[j]]=[cells[j],cells[i]];}
const seeds=[];const grid=new Map();
const key=(gx,gy)=>gx*1000+gy;
for(const c of cells){const x=c%W,y=(c/W)|0;const lon=LON0+(x+0.5)*RES,lat=LAT0-(y+0.5)*RES;
  const sp=spacing(lon,lat);const gx=Math.floor(lon),gy=Math.floor(lat);const r=Math.ceil(sp/Math.max(0.2,Math.cos(lat*Math.PI/180)))+1;let ok=true;
  outer:for(let dx=-r;dx<=r;dx++)for(let dy=-Math.ceil(sp)-1;dy<=Math.ceil(sp)+1;dy++){const L=grid.get(key(((gx+dx+540)%360)-180,gy+dy));if(!L)continue;
    for(const q of L){let dl=Math.abs(q[0]-lon);if(dl>180)dl=360-dl;dl*=Math.cos(lat*Math.PI/180);const d=Math.hypot(dl,q[1]-lat);if(d<Math.min(sp,q[2])){ok=false;break outer}}}
  if(ok){seeds.push(c);const k=key(gx,gy);if(!grid.has(k))grid.set(k,[]);grid.get(k).push([lon,lat,sp]);}}
console.log('seeds',seeds.length);
const id=new Uint16Array(W*H);
function nb(c){const x=c%W,y=(c/W)|0;const r=[y*W+(x+1)%W,y*W+(x-1+W)%W];if(y>0)r.push(c-W);if(y<H-1)r.push(c+W);return r}
function bfs(srcs){let q=srcs.slice();while(q.length){const nq=[];for(const c of q)for(const n of nb(c))if(mask[n]&&!id[n]){id[n]=id[c];nq.push(n)}q=nq;}}
seeds.forEach((c,i)=>id[c]=i+1);bfs(seeds);
// unassigned components
let nextId=seeds.length+1;const tiny=[];
const seen=new Uint8Array(W*H);
for(const c of cells){if(id[c]||seen[c])continue;const comp=[c];seen[c]=1;for(let k=0;k<comp.length;k++)for(const n of nb(comp[k]))if(mask[n]&&!id[n]&&!seen[n]){seen[n]=1;comp.push(n)}
  if(comp.length>=6){id[c]=nextId++;bfs([c]);}else tiny.push(comp);}
console.log('provinces',nextId-1,'tiny',tiny.length);
// province stats
const N=nextId-1;const P=[];for(let i=0;i<=N;i++)P.push({sx:0,sy:0,n:0,a:0,coast:0,adj:new Set(),sea:new Set()});
for(let c=0;c<W*H;c++){const p=id[c];if(!p)continue;const x=c%W,y=(c/W)|0;const lat=LAT0-(y+0.5)*RES;const o=P[p];o.n++;o.a+=Math.cos(lat*Math.PI/180);o.sx+=x;o.sy+=y;
  for(const n of nb(c)){if(!mask[n])o.coast=1;else if(id[n]&&id[n]!==p)o.adj.add(id[n]);}}
// tiny islands -> nearest province within 2deg
for(const comp of tiny){const c=comp[0];const x=c%W,y=(c/W)|0;let best=0,bd=1e9;for(let p=1;p<=N;p++){const o=P[p];let dx=Math.abs(o.sx/o.n-x);if(dx>W/2)dx=W-dx;const d=Math.hypot(dx,o.sy/o.n-y);if(d<bd){bd=d;best=p}}if(bd<10)for(const k of comp){id[k]=best;P[best].n++;}}
// sea adjacency via ocean voronoi limited distance
const lab=new Uint16Array(W*H),dist=new Uint8Array(W*H);let q=[];
for(let c=0;c<W*H;c++)if(id[c]&&P[id[c]].coast)for(const n of nb(c))if(!mask[n]&&!lab[n]){lab[n]=id[c];dist[n]=1;q.push(n)}
const LIM=11;
while(q.length){const nq=[];for(const c of q)for(const n of nb(c)){if(mask[n])continue;if(!lab[n]){if(dist[c]<LIM){lab[n]=lab[c];dist[n]=dist[c]+1;nq.push(n)}}else if(lab[n]!==lab[c]){P[lab[n]].sea.add(lab[c]);P[lab[c]].sea.add(lab[n]);}}q=nq;}
// terrain
function terrain(lon,lat){const inb=(a,b,c,d)=>lon>=a&&lon<=b&&lat>=c&&lat<=d;
 if(Math.abs(lat)>63)return 2;
 if(inb(-17,33,15,31)||inb(34,58,14,31)||inb(68,74,24,29)||inb(78,112,37,45)||inb(118,143,-31,-19)||inb(12,22,-27,-18)||inb(52,63,27,35)||inb(-71,-69,-27,-18)||inb(-117,-110,30,36))return 1;
 if(lat>51&&lat<=63)return 3;
 if(inb(48,125,42,51)||inb(-112,-96,35,50)||inb(-68,-58,-42,-30))return 5;
 if(Math.abs(lat)<12)return 4;return 0}
const provs=[],adj=[],sea=[];
for(let p=1;p<=N;p++){const o=P[p];const lon=LON0+(o.sx/(o.n||1)+0.5)*RES,lat=LAT0-(o.sy/(o.n||1)+0.5)*RES;
 provs.push([+lon.toFixed(2),+lat.toFixed(2),Math.round(o.a*773),terrain(lon,lat),o.coast]); // area km2: 0.25deg cell ~ 27.8km*27.8km=773km2*cos
 adj.push([...o.adj].map(v=>v-1));sea.push([...o.sea].filter(v=>!o.adj.has(v)).map(v=>v-1));}
// RLE
const runs=[];let cur=id[0],len=0;for(let i=0;i<W*H;i++){const v=id[i]?id[i]:(mask[i]?65535:0);if(v===cur&&len<65535)len++;else{runs.push(cur,len);cur=v;len=1}}runs.push(cur,len);
// fix first cur mapping
const arr=new Uint16Array(runs);const b64=Buffer.from(arr.buffer).toString('base64');
console.log('runs',runs.length/2,'b64',b64.length);
fs.writeFileSync('/home/user/althistory/map.js','window.MAPDATA='+JSON.stringify({W,H,lon0:LON0,lat0:LAT0,res:RES,rle:b64,provs,adj,sea})+';');
console.log('size',fs.statSync('/home/user/althistory/map.js').size);
