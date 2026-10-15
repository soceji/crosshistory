// ───────────────────────────────────────────────────────────────
//  질병 · 위생
//  R: 이웃 지방으로 번지는 힘, attack: 유행 한 번에 감염되는 인구 비율, cfr: 치명률,
//  months: 한 지방에서 유행이 이어지는 기간, vac: 감염을 막는 기술(백신·상하수도), cure: 치명률을 낮추는 기술
//  virgin: 처음 겪는 집단(신대륙 등)에서 감염·치명률 배수
// ───────────────────────────────────────────────────────────────
(function(){
const D = window.GDATA;
const O = (t, tip, fx, h, dv) => ({t, tip, fx: fx || (()=>{}), h: !!h, dv});
const H = (t, tip, fx) => O(t, tip, fx, true);

D.DISEASES = {
  smallpox:{n:'천연두', air:1, R:2.4, attack:.32, cfr:.25, months:8, vac:'vaccine', cure:null, virgin:2.4, from:-1500, to:1979, d:'마마. 살아남은 사람도 곰보 자국이 남는다. 1980년 인류가 근절한 유일한 질병.'},
  plague:  {n:'흑사병', R:2.1, attack:.4, cfr:.55, months:9, vac:null, cure:'antibio', from:-500, to:2100, d:'쥐벼룩이 옮기는 페스트균. 14세기 유라시아 인구의 3분의 1을 앗아갔다.'},
  typhoid: {n:'장티푸스', R:1.5, attack:.14, cfr:.15, months:6, vac:'germ', cure:'antibio', water:1, from:-2000, to:2100, d:'오염된 물과 음식으로 옮는다. 상하수도가 가장 좋은 백신이다.'},
  cholera: {n:'콜레라', R:2.0, attack:.1, cfr:.4, months:5, vac:'germ', cure:'antibio', water:1, from:1817, to:2100, d:'괴질. 하루 만에 탈수로 죽는다. 1854년 존 스노가 오염된 우물을 찾아냈다.'},
  measles: {n:'홍역', air:1, R:3.2, attack:.3, cfr:.07, months:5, vac:'antibio', cure:null, virgin:3, from:-500, to:2100, d:'아이들의 목숨을 앗아가는 전염병. 1963년 백신이 나왔다.'},
  typhus:  {n:'발진티푸스', R:1.4, attack:.14, cfr:.2, months:6, vac:'germ', cure:'antibio', war:1, from:-500, to:1950, d:'이가 옮긴다. 전쟁과 기근을 따라다닌다.'},
  flu:     {n:'인플루엔자', air:1, R:2.2, attack:.28, cfr:.02, months:4, vac:'genome', cure:'antibio', from:1500, to:2100, d:'해마다 모습을 바꾸는 독감. 1918년 스페인 독감은 5천만 명을 죽였다.'},
  covid:   {n:'코로나바이러스', air:1, R:2.8, attack:.3, cfr:.008, months:12, vac:null, cure:null, from:2019, to:2100, d:'새로운 코로나바이러스. 무증상 전파로 국경을 쉽게 넘는다.'}
};
// 위생 수준(0~5)을 올리는 기술
Object.entries({medicine:.5, eng:.4, vaccine:.4, chem:.2, germ:1.4, massedu:.3, antibio:.8, welfare:.6, genome:.4, biotech:.5, internet:.2}).forEach(([k,v])=>{ if(D.TECHS[k]) D.TECHS[k].fx.san=v; });
// 위생 제도
Object.assign(D.POLICIES,{
  publichealth:{n:'공중위생 제도', cat:'사회', req:'medicine', fx:{san:.8,tax:-.02}, d:'우물과 시장을 관리하고 역병이 돌면 환자를 따로 돌본다.'},
  hyeminseo:   {n:'혜민서·활인서', cat:'사회', req:'medicine', tags:['GORYEO','JOSEON','KOREMP'], fx:{san:.7,stab:.05}, d:'가난한 백성을 무료로 치료하고 역병 환자를 도성 밖에서 돌본다.'},
  quarantine:  {n:'검역 제도', cat:'사회', req:'navig', fx:{san:.4,tax:-.02}, d:'입항한 배를 40일 동안 묶어 둔다. 베네치아의 콰란티나에서 나온 말.'},
  sewer:       {n:'상하수도 정비', cat:'경제', req:'germ', fx:{san:1.2,tax:-.03}, d:'깨끗한 물을 대고 오수를 따로 흘려보낸다.'},
  vaccination: {n:'국가 예방접종', cat:'사회', req:'vaccine', fx:{san:.6,stab:.05}, d:'모든 아이에게 무료로 백신을 맞힌다.'}
});

// 유행이 우리 땅에 닿았을 때의 대책 (엔진이 선택지로 쓴다)
D.EPI_ACTIONS = [
  {id:'quarantine', n:'격리와 검역', d:'환자를 격리하고 길목과 항구를 검문한다. 우리 땅에서의 전파 ×0.35 (1년)', cost:.15, prod:-.02, need:null},
  {id:'medics',     n:'의원을 보내고 구휼한다', d:'의원과 약재를 보내고 굶주린 환자를 먹인다. 사망 ×0.6 (1년)', cost:.25, prod:0, need:null},
  {id:'closed',     n:'국경을 닫는다', d:'외부에서 들어오는 전파 ×0.15 (1년). 교역이 끊긴다.', cost:0, prod:-.06, stab:-.2, need:null},
  {id:'testing',    n:'검사·추적·격리', d:'대규모 검사로 감염자를 찾아낸다. 전파 ×0.3, 사망 ×0.8 (1년)', cost:.2, prod:-.01, need:'computer'},
  {id:'pray',       n:'하늘에 제사를 올린다', d:'민심만 달랜다. 안정도 +0.3', cost:0, prod:0, stab:.3, need:null}
];

// 위생 대책 무작위 사건
const R_ = [
 {id:'well',w:3,cat:'衛',maxY:1900,t:'우물이 오염되다',x:'장마 뒤에 마을 우물에서 냄새가 난다. 설사하는 아이들이 늘었다.',o:[H('새 우물을 판다','국고 −0.08년치, 위생 +0.2',E=>{E.mod(E.ptag,{gold:-.08});E.san(E.ptag,.2);}),O('물을 끓여 마시게 한다','안정도 −0.1',E=>E.mod(E.ptag,{stab:-.1})),O('그냥 둔다','장티푸스 유행 위험',E=>{ if(E.rnd()<.6) E.outbreakAt('typhoid',E.ptag); })]},
 {id:'waste',w:3,cat:'衛',minY:-500,c:E=>E.c(E.ptag).pop>2e6,t:'도성의 분뇨와 쓰레기',x:'도성 골목마다 오물이 쌓였다. 여름이면 파리 떼가 들끓는다.',o:[H('개천을 준설하고 수거 일꾼을 둔다','국고 −0.12년치, 위생 +0.3',E=>{E.mod(E.ptag,{gold:-.12});E.san(E.ptag,.3);}),O('백성에게 맡긴다','안정도 −0.2',E=>E.mod(E.ptag,{stab:-.2}))]},
 {id:'bath',w:2,cat:'衛',minY:-300,maxY:1950,t:'공중목욕탕',x:'상인들이 도성에 큰 목욕탕을 열겠다고 허가를 청한다.',o:[H('허가하고 세를 걷는다','국고 +0.05년치, 위생 +0.15',E=>{E.mod(E.ptag,{gold:.05});E.san(E.ptag,.15);}),O('풍기 문란이라며 막는다','안정도 +0.1',E=>E.mod(E.ptag,{stab:.1}))]},
 {id:'uinyeo',w:2,cat:'醫',minY:1400,maxY:1900,c:E=>['JOSEON','GORYEO','KOREMP'].includes(E.ptag),t:'의녀 제도',x:'남자 의원에게 몸을 보이지 않으려다 병을 키우는 여인들이 많다. 태종 때 시작된 의녀를 늘리자는 건의다.',o:[H('의녀를 늘린다','국고 −0.05년치, 위생 +0.2',E=>{E.mod(E.ptag,{gold:-.05});E.san(E.ptag,.2);}),O('지금 수로 충분하다','변화 없음',E=>{})]},
 {id:'quarantineDebate',w:2,cat:'衛',minY:1400,c:E=>E.coastal(E.ptag),t:'검역 논쟁',x:'먼 항구에서 역병이 돌았다는 소문이다. 상인들은 배를 묶어 두면 망한다고 아우성이다.',o:[H('입항 선박을 40일 격리한다','교역 −5% (2년), 외부 전파 ×0.3 (2년)',E=>{E.tmod(E.ptag,'tax',-.05,2,'검역');E.epiShield(E.ptag,2,.3);}),O('교역을 계속한다','변화 없음',E=>{})]},
 {id:'hospital',w:2,cat:'醫',minY:1850,t:'근대 병원 건립',x:'서양식 병원을 세우자는 의견이 나왔다. 의사를 길러낼 학교도 필요하다.',o:[H('국립 병원과 의학교를 세운다','국고 −0.25년치, 위생 +0.4, 기대수명 +1년',E=>{E.mod(E.ptag,{gold:-.25,life:1});E.san(E.ptag,.4);}),O('선교사 병원에 맡긴다','위생 +0.15',E=>E.san(E.ptag,.15))]},
 {id:'antivax',w:2,cat:'醫',minY:1960,t:'예방접종 거부 운동',x:'백신이 위험하다는 소문이 퍼져 접종률이 떨어지고 있다.',o:[H('공공 캠페인을 벌인다','국고 −0.05년치',E=>E.mod(E.ptag,{gold:-.05})),O('자율에 맡긴다','위생 −0.3, 홍역 유행 위험',E=>{E.san(E.ptag,-.3); if(E.rnd()<.4) E.outbreakAt('measles',E.ptag);})]}
];
R_.forEach(r=>D.RANDOM.push(r));
// 선사 시대에도 병은 돈다 — 기존 '역병' 사건이 실제 유행을 일으키게 한다
const pl=D.RANDOM.find(r=>r.id==='plague');
if(pl){ pl.o=[H('환자를 격리한다','국고 −0.1년치, 유행이 약하게 시작',E=>{E.mod(E.ptag,{gold:-.1});E.outbreakAt(null,E.ptag,{attack:.5});}),O('제사를 올린다','안정도 +0.3, 유행 시작',E=>{E.mod(E.ptag,{stab:.3});E.outbreakAt(null,E.ptag);})]; pl.x='도성에 열병이 돈다. 의원들은 처음 보는 병이라 한다.'; }

// ── 역사 속 대유행과 위생의 역사 ──
const ev=(y,m,d,tag,cat,t,x,o,ex)=>Object.assign({y,m,d,tag,cat,t,x,o,nature:1},ex||{});
const rebind=(title,fx)=>{ const e=D.EVENTS.find(x=>x.t===title); if(e){ e.o=[H('','',fx)]; delete e.ask; delete e.po; e.tag=null; } };
rebind('유스티니아누스 역병',E=>E.outbreak('plague',31.2,30.0,{R:2.4}));
rebind('흑사병',E=>{ E.outbreak('plague',35.4,45.0,{R:2.6,attack:1.5}); E.outbreak('plague',104,36,{R:2.0,attack:1.3}); });
rebind('콜럼버스의 교환 — 천연두',E=>{ E.outbreak('smallpox',-96.1,19.2,{virginBox:[-170,-56,-30,72],R:3}); E.plague([-170,-56,-30,72],.35); });
rebind('콜레라의 첫 대유행',E=>E.outbreak('cholera',88.4,22.6,{R:2.4}));
rebind('스페인 독감',E=>{ E.outbreak('flu',-98,38,{R:4,cfr:.03,attack:1.3}); E.outbreak('flu',2,49,{R:4,cfr:.03,attack:1.3}); E.outbreak('flu',73,19,{R:4,cfr:.04,attack:1.3}); });
rebind('코로나19 팬데믹',E=>{ E.outbreak('covid',114.3,30.6,{}); E.all(t=>E.tmod(t,'prod',-.04,2,'팬데믹')); });
const N_=[
 ev(165,1,1,null,'疫','안토니누스 역병','파르티아 원정에서 돌아온 로마 군대가 천연두를 들여왔다. 15년 동안 제국 인구의 10% 가까이가 죽었다.',[H('','천연두 유행',E=>E.outbreak('smallpox',38,34,{R:2.6}))]),
 ev(735,1,1,null,'疫','덴표 천연두 대유행','신라와 교류하던 규슈에서 천연두가 퍼져 일본 인구의 4분의 1에서 3분의 1이 죽었다.',[H('','천연두 유행',E=>E.outbreak('smallpox',130.4,33.6,{R:2.6,virginBox:[129,30,146,46]}))]),
 ev(1112,1,1,'GORYEO','醫','혜민국 설치','고려 예종이 백성에게 약을 나눠 주는 혜민국을 세웠다.',[H('혜민국을 연다','「혜민서·활인서」 채택, 위생 +0.2',E=>{E.pol('GORYEO','hyeminseo');E.san('GORYEO',.2);}),O('국고를 아낀다','국고 +0.1년치',E=>E.mod('GORYEO',{gold:.1}),false,2)],{cond:E=>E.has('GORYEO')}),
 ev(1414,1,1,'JOSEON','醫','혜민서와 활인서','조선이 가난한 병자를 치료하는 혜민서와 역병 환자를 돌보는 동·서활인서를 정비했다.',[H('정비한다','「혜민서·활인서」 채택',E=>E.pol('JOSEON','hyeminseo')),O('지방 의원에 맡긴다','국고 +0.1년치',E=>E.mod('JOSEON',{gold:.1}),false,2)],{cond:E=>E.has('JOSEON')}),
 ev(1377,1,1,'VENICE','衛','검역의 시작','라구사와 베네치아가 역병이 도는 항구에서 온 배를 40일 동안 섬에 묶어 두었다. 콰란티나(40)는 검역(quarantine)의 어원이 된다.',[H('배를 격리한다','「검역 제도」 연구 단서, 위생 +0.3',E=>E.san('VENICE',.3))],{cond:E=>E.has('VENICE')}),
 ev(1665,6,1,null,'疫','런던 대역병','런던 인구의 4분의 1이 흑사병으로 죽었다. 이듬해 대화재가 도시를 쓸어냈다.',[H('','흑사병 유행',E=>E.outbreak('plague',-0.1,51.5,{R:1.8}))]),
 ev(1796,5,14,'UK','醫','제너의 우두 접종','에드워드 제너가 소의 천연두(우두) 고름으로 소년에게 예방접종을 했다.',[H('보급한다','종두법 습득',E=>E.tech('UK','vaccine'))],{cond:E=>E.has('UK')}),
 ev(1798,1,1,'JOSEON','醫','정약용의 마과회통','정약용이 홍역 치료법을 모은 마과회통을 펴냈다. 부록에 제너 이전의 종두법도 소개했다.',[H('간행한다','위생 +0.3, 의학 습득',E=>{E.tech('JOSEON','medicine');E.san('JOSEON',.3);})],{cond:E=>E.has('JOSEON')&&E.fig('jeongyakyong')}),
 ev(1854,9,1,'UK','衛','존 스노의 콜레라 지도','런던 소호에서 콜레라 사망자를 지도에 찍던 의사 존 스노가 브로드 가의 펌프를 범인으로 지목했다. 역학(疫學)의 시작.',[H('펌프 손잡이를 뗀다','근대 화학·세균학 연구 진척, 위생 +0.3',E=>{E.mod('UK',{res:.4});E.san('UK',.3);})],{cond:E=>E.has('UK')}),
 ev(1855,1,1,null,'疫','제3차 흑사병 대유행','윈난에서 시작된 페스트가 홍콩을 거쳐 인도와 전 세계 항구로 퍼졌다. 인도에서만 1000만 명이 죽었다.',[H('','흑사병 유행',E=>E.outbreak('plague',101,25,{R:2.2}))]),
 ev(1858,7,1,'UK','衛','런던 대악취와 하수도','템스 강의 악취로 의회가 멈췄다. 조지프 배절제트가 런던 지하에 하수도망을 놓는다.',[H('하수도를 놓는다','「상하수도 정비」 채택',E=>{E.tech('UK','germ');E.pol('UK','sewer');})],{cond:E=>E.has('UK')}),
 ev(1879,10,1,'*KOREA','醫','지석영의 종두법','지석영이 일본에서 배워 온 우두법으로 처가 식구들에게 접종했다. 조선 최초의 종두다.',[H('종두를 보급한다','종두법 습득, 「국가 예방접종」 해금',E=>E.tech(E.krTag(),'vaccine')),O('서양 의술을 금한다','안정도 +0.2 (역사 개변 +6)',E=>E.mod(E.krTag(),{stab:.2}),false,6)],{cond:E=>!!E.krTag()&&E.fig('jiseogyeong')}),
 ev(1885,4,10,'*KOREA','醫','제중원 설립','갑신정변 때 민영익을 살린 선교사 알렌의 건의로 조선 최초의 서양식 병원 제중원이 문을 열었다.',[H('병원을 연다','위생 +0.4, 세균학 연구 진척',E=>{const k=E.krTag();E.san(k,.4);E.mod(k,{res:.3});}),O('한의학으로 충분하다','안정도 +0.1',E=>E.mod(E.krTag(),{stab:.1}),false,4)],{cond:E=>!!E.krTag()}),
 ev(1886,7,1,null,'疫','조선의 콜레라','개항장을 통해 들어온 콜레라가 한양을 휩쓸었다. 쥐통이라 불렀다.',[H('','콜레라 유행',E=>E.outbreak('cholera',126.6,37.5,{R:2}))]),
 ev(1948,4,7,null,'醫','세계보건기구 설립','유엔 산하에 세계보건기구(WHO)가 생겼다.',[H('','모든 나라 위생 +0.2',E=>E.all(t=>E.san(t,.2)))]),
 ev(1957,2,1,null,'疫','아시아 독감','윈난에서 시작된 H2N2 독감으로 100만~200만 명이 죽었다.',[H('','독감 유행',E=>E.outbreak('flu',101,25,{R:2.4,cfr:.004}))]),
 ev(1968,7,1,null,'疫','홍콩 독감','H3N2 독감이 홍콩에서 퍼져 100만 명가량이 죽었다.',[H('','독감 유행',E=>E.outbreak('flu',114.2,22.3,{R:2.4,cfr:.003}))]),
 ev(1980,5,8,null,'醫','천연두 근절','세계보건총회가 천연두 근절을 선언했다. 3000년 동안 수억 명을 죽인 병이 사라졌다.',[H('','천연두 소멸',E=>E.eradicate('smallpox'))])
];
D.EVENTS.push(...N_);
})();
