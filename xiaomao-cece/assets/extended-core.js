(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./orientation-core.js'));else root.CatExtendedCore=factory(root.CatOrientationCore)})(typeof window!=='undefined'?window:globalThis,function(orientationCore){
'use strict';
const copy=x=>JSON.parse(JSON.stringify(x)),values=x=>x==null?[]:Array.isArray(x)?x:[x];
function fail(code){const e=new Error(code);e.code=code;throw e}
function visibleQuestions(t,a={}){if(t.orientationVersion===4)return orientationCore.visibleQuestions(t,a);const map=new Map(t.questions.map(q=>[q.id,q]));return(t.displayOrder||t.questions.map(q=>q.id)).map(id=>map.get(id)).filter(q=>!q.when||values(a[q.when.question]).some(v=>q.when.anyOf.includes(v)))}
function validateAnswer(t,q,v){
 if(t.orientationVersion===4)return orientationCore.validateAnswer(t,q,v);
 if(v===null&&q.allowSkip)return;
 if(t.id==='orientation'){
  const vs=values(v),allowed=q.options.map(o=>o.id);
  if(q.kind==='multi'){if(!Array.isArray(v))fail('INVALID_ANSWER');if(new Set(v).size!==v.length)fail('INVALID_ANSWER')}
  else if(Array.isArray(v)||typeof v!=='string')fail('INVALID_ANSWER');
  if(vs.some(x=>!allowed.includes(x)))fail('INVALID_ANSWER');
  if(vs.length>1&&vs.some(x=>(q.exclusiveChoices||[]).includes(x)))fail('EXCLUSIVE_CHOICES');
 }else{const n=q.options?q.options.length:5;if(!Number.isInteger(v)||v<0||v>=n)fail('INVALID_ANSWER')}
}
function validateAnswers(t,a){
 if(!a||typeof a!=='object'||Array.isArray(a))fail('INVALID_ANSWERS');
 const ids=new Set(t.questions.map(q=>q.id));if(Object.keys(a).some(k=>!ids.has(k)))fail('UNKNOWN_QUESTION');
 for(const q of visibleQuestions(t,a))if(Object.hasOwn(a,q.id))validateAnswer(t,q,a[q.id]);
}
function isAnswered(q,a){return Object.hasOwn(a,q.id)&&a[q.id]!==undefined&&(!Array.isArray(a[q.id])||a[q.id].length>0)}
function ratingMetrics(t,a){return t.dimensions.map(d=>{
 const qs=t.questions.filter(q=>q.kind==='rating'&&q.dimension===d.id);let raw=0,answered=0;
 for(const q of qs){const v=a[q.id];if(v==null)continue;raw+=q.polarity===1?v:4-v;answered++}
 const min=typeof t.minimumAnsweredPerDimension==='object'?t.minimumAnsweredPerDimension[d.id]:t.minimumAnsweredPerDimension||qs.length;
 return{id:d.id,name:d.name,raw,answered,totalItems:qs.length,valid:answered>=min,index:answered>=min?raw*25/answered:null};
})}
const compare=(a,b)=>b.raw*a.answered-a.raw*b.answered;
const atLeast=(m,n,d=1)=>m.raw*25*d>=n*m.answered;
const gapAtLeast=(a,b,n,d=1)=>(a.raw*b.answered-b.raw*a.answered)*25*d>=n*a.answered*b.answered;
const gapAtMost=(a,b,n,d=1)=>(a.raw*b.answered-b.raw*a.answered)*25*d<=n*a.answered*b.answered;
function finalize(r){return r.reportId==='insufficient'?{...r,status:'insufficient',reportId:null,guidanceId:'insufficient',unlockable:false,hasCompleteResult:false}:{...r,status:'complete',unlockable:true,hasCompleteResult:true}}
function distribution(counts,order){
 const n=Object.values(counts).reduce((s,x)=>s+x,0),tenths=Object.fromEntries(order.map(id=>[id,n?Math.floor(counts[id]*1000/n):0]));
 if(n){const rem=1000-Object.values(tenths).reduce((s,x)=>s+x,0),rank=order.map((id,i)=>({id,i,r:counts[id]*1000%n})).sort((a,b)=>b.r-a.r||a.i-b.i);for(let i=0;i<rem;i++)tenths[rank[i].id]++}
 const ranked=[...order].sort((a,b)=>counts[b]-counts[a]);
 return{reportId:n<12?'insufficient':counts[ranked[0]]*10>=n*3&&counts[ranked[0]]-counts[ranked[1]]>=2?ranked[0]:'mixed',counts,validAnswers:n,tenths};
}
function orientation(t,a){
 const qs=visibleQuestions(t,a),active=new Set(qs.map(q=>q.id)),normalized=Object.fromEntries(qs.map(q=>[q.id,values(a[q.id])])),ignored=t.questions.filter(q=>!active.has(q.id)&&a[q.id]!=null).map(q=>q.id);
 function matches(rule){if(rule.any)return rule.any.some(matches);if(rule.anyAnswer)return Object.values(normalized).some(v=>v.includes(rule.anyAnswer));if(rule.allVisibleBlank)return Object.values(normalized).every(v=>!v.length);if(rule.anyVisibleBlank)return Object.values(normalized).some(v=>!v.length);return(normalized[rule.question]||[]).some(v=>rule.anyOf.includes(v))}
 const empty=Object.values(normalized).every(v=>!v.length||(v.length===1&&v[0]==='decline'));
 const modules=empty?['space']:t.results.filter(r=>matches(t.moduleRules[r.id])).map(r=>r.id);
 const priority={romantic:['romantic','two-experiences'],sexual:['two-experiences','conditions','little-experience'],words:['chosen-words','exploring','gender-not-central'],boundaries:['space','two-experiences']};
 const preferred=(normalized['ORI-10']||[]).flatMap(k=>priority[k]||[]).concat(modules),ordered=[...new Set(preferred)].filter(k=>modules.includes(k));
 const concrete={'ORI-01':['men','women','nonbinary','gender_not_decisive','no_clear'],'ORI-02':['experienced','no_clear'],'ORI-03':['heterosexual','gay_lesbian','bisexual','pansexual','asexual'],'ORI-04':['men','women','nonbinary','gender_not_decisive'],'ORI-05':['often','sometimes','rarely','no_clear'],'ORI-07':['mostly_same','can_differ','one_kind','no_clear'],'ORI-08':['few','recent']};
 const has=Object.entries(concrete).some(([qid,allowed])=>(normalized[qid]||[]).some(v=>allowed.includes(v)));
 const summary=Object.fromEntries(t.summaryFields.filter(f=>active.has(f.fromQuestion)).map(f=>[f.key,normalized[f.fromQuestion]||[]]));
 const primary=empty?ordered:ordered.filter(k=>k!=='space'),defaults=primary.length?primary.slice(0,3):ordered.includes('space')?['space']:[];
 return{summary,identityAssigned:false,modules:ordered,defaultModules:defaults,moreModules:ordered.filter(k=>!defaults.includes(k)),hasSkippedOrDeclinedNote:ordered.includes('space')&&!empty,exitWithoutCost:!has,hasCompleteResult:has,unlockable:has,ignoredHiddenQuestions:ignored,status:has?'complete':'insufficient'};
}
function score(t,a){
 if(t.orientationVersion===4)return orientationCore.score(t,a);
 validateAnswers(t,a);if(t.id==='orientation')return orientation(t,a);
 if(t.id==='eq'){const ids=t.dimensions.map(d=>d.id),counts=Object.fromEntries(ids.map(id=>[id,0]));for(const q of t.questions){const v=a[q.id];if(v!=null)counts[q.options[v].dimension]++}return finalize(distribution(counts,ids))}
 const metrics=ratingMetrics(t,a),valid=metrics.filter(m=>m.valid),ranked=[...valid].sort(compare),ids=ranked.map(x=>x.id),r={metrics,reportId:'mixed'};
 if(['enneagram','dark','desires'].includes(t.id)&&valid.length<t.dimensions.length)return{status:'insufficient',reportId:null,guidanceId:'coverage',missingDimensions:metrics.filter(m=>!m.valid).map(m=>m.id),metrics,unlockable:false,hasCompleteResult:false};
 if(t.id==='talents'){
  if(valid.length<8)r.reportId='insufficient';else if(atLeast(ranked[0],60)&&gapAtLeast(ranked[0],ranked[1],8))r.reportId=ids[0];
  r.highlightIds=ranked.filter(m=>ranked.length<3||compare(m,ranked[2])<=0).map(m=>m.id);
 }else if(t.id==='enneagram'){
  if(atLeast(ranked[0],175,3)&&gapAtLeast(ranked[0],ranked[1],25,2))r.reportId=ids[0];
  r.candidateIds=ranked.filter(m=>gapAtMost(ranked[0],m,25,3)).map(m=>m.id);
 }else if(t.id==='dark'){
  if(!atLeast(ranked[0],100,3)||ranked[0].raw*75===100*ranked[0].answered)r.reportId='low';else if(atLeast(ranked[0],175,3)&&gapAtLeast(ranked[0],ranked[1],25,2))r.reportId=ids[0];
 }else if(t.id==='shadow'){
  const warm=a['SHD-01'];r.warmupFeedback='warm-'+(warm==null?'d':'abcd'[warm]);
  if(valid.length<6)r.reportId='insufficient';else if(ranked[0].raw*25<=35*ranked[0].answered)r.reportId='low';else if(atLeast(ranked[0],60)&&gapAtLeast(ranked[0],ranked[1],12))r.reportId=ids[0];
 }else if(t.id==='desires'){
  if(atLeast(ranked[0],200,3)&&gapAtLeast(ranked[0],ranked[1],50,3))r.reportId=ids[0];
  const counts=Object.fromEntries(t.dimensions.map(d=>[d.id,0]));for(const q of t.questions)if(q.kind==='choice'&&a[q.id]!=null)counts[q.options[a[q.id]].dimension]++;
  const n=Object.values(counts).reduce((s,v)=>s+v,0),ordered=Object.keys(counts).sort((a,b)=>counts[b]-counts[a]),lead=ordered[0],unique=counts[lead]>counts[ordered[1]];
  r.tradeoffCounts=counts;r.validTradeoffs=n;r.supplementId=n<4||!unique||r.reportId==='mixed'?'open':lead===r.reportId?'aligned':'tension';
 }
 return finalize(r);
}
function calculate(a,t){
 if(t.orientationVersion===4)return orientationCore.calculate(a,t);
 const r=score(t,a);if(!r.hasCompleteResult)return{extended:true,guidance:true,evaluation:r,typeId:null,typeCode:'',values:{},scores:{}};
 if(t.id==='orientation'){
  const summary=t.summaryFields.filter(f=>r.summary[f.key]?.length).map(f=>{const q=t.questions.find(q=>q.id===f.fromQuestion);return{key:f.key,label:f.label,values:r.summary[f.key].map(id=>q.options.find(o=>o.id===id).text)}});
  const modules=r.modules.map(id=>copy(t.results.find(m=>m.id===id)));
  return{extended:true,typeId:null,typeCode:'',scores:{},values:{},reportSnapshot:{title:t.resultTitle,short:'把这次愿意描述的体验收好，称谓仍由你决定。',orientation:true,summary,modules,defaultModules:r.defaultModules,hasSkippedOrDeclinedNote:r.hasSkippedOrDeclinedNote,sections:t.resultSections,identityAssigned:false}};
 }
 const report=copy(t.results.find(p=>p.id===r.reportId));if(!report)fail('MISSING_REPORT');let metrics;
 if(t.id==='eq')metrics=t.dimensions.map(d=>({...d,raw:r.counts[d.id],value:r.tenths[d.id]/10})).sort((a,b)=>b.raw-a.raw);
 else metrics=[...r.metrics].sort((a,b)=>a.valid!==b.valid?(a.valid?-1:1):a.valid?compare(a,b):0).map(m=>({...m,value:m.index===null?null:Math.round(m.index*10)/10}));
 const leaders=metrics.filter(m=>m.value!==null&&m.value===metrics[0].value).map(m=>m.name),names=ids=>(ids||[]).map(id=>t.dimensions.find(d=>d.id===id).name);
 const extra=[];if(r.warmupFeedback)extra.push(copy(t.supplements.find(s=>s.id===r.warmupFeedback)));if(r.supplementId)extra.push(copy(t.supplements.find(s=>s.id===r.supplementId)));
 const metricNote=t.id==='eq'?`本次有效回答 ${r.validAnswers} 个情境。比例表示先关注什么的选择分布，合计100%，不代表情商高低。`:'各方向是独立的自报线索指数，不需要相加成100%，也不是人群百分位或某类型的概率。'+(t.id==='talents'?'仅在已有足够回答的方向中比较；信息不足的方向不补分。':'');
 return{extended:true,typeId:r.reportId,typeCode:'',scores:Object.fromEntries(metrics.map(m=>[m.id,m.raw])),values:Object.fromEntries(metrics.filter(m=>m.value!==null).map(m=>[m.name,m.value])),reportSnapshot:{...report,metrics,metricKind:t.id==='eq'?'share':'index',metricNote,leaders,sections:t.resultSections,highlights:names(r.highlightIds),candidates:names(r.candidateIds),supplements:extra,tradeoffCounts:r.tradeoffCounts,validTradeoffs:r.validTradeoffs}};
}
return{score,calculate,visibleQuestions,validateAnswer,validateAnswers,isAnswered};
});