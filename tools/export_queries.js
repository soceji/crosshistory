// 게임에 나오는 사건·건물·유물·인물·제도·질병의 위키백과 검색어를 모은다 → tools/photo_queries.json
// 사용: node tools/export_queries.js
const fs=require('fs'); const path=require('path'); globalThis.window=globalThis;
const dir=path.join(__dirname,'..','src');
for(const f of ['map.js','data.js','events.js','nature.js','people.js','events_kr.js','disease.js','wardata.js','heritage.js','learn.js']) eval(fs.readFileSync(path.join(dir,f),'utf8'));
const D=window.GDATA; const Q=new Set();
for(const e of D.EVENTS){ if(e.y>2025||/건립 논의$/.test(e.t)) continue; Q.add(D.WIKI_EV[e.t]||e.t); }
for(const w of D.WONDERS) Q.add(w.wiki||w.n);
for(const r of D.RELICS) Q.add(r.wiki||r.n);
for(const f of D.FIGS) Q.add(f.wiki||f.n);
for(const k in D.GOVS) Q.add(D.GOVS[k].wiki||D.GOVS[k].n);
for(const k in D.POLICIES) Q.add(D.POLICIES[k].wiki||D.POLICIES[k].n);
for(const k in D.DISEASES) Q.add(D.DISEASES[k].wiki||D.DISEASES[k].n);
for(const t of D.TECH_LIST) Q.add(t.wiki||t.n);
Q.delete('-'); const out=[...Q].sort(); fs.writeFileSync(path.join(__dirname,'photo_queries.json'),JSON.stringify(out,null,0)+'\n'); console.log(out.length,'queries');
