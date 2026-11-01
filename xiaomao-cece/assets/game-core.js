(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./extended-core.js'),require('./dark-result-core.js'));else root.CatGameCore=factory(root.CatExtendedCore,root.CatDarkResult)})(typeof window!=='undefined'?window:globalThis,function(extended,darkResult){
'use strict';
const KEY='xiaomao.playable.v1',clone=x=>JSON.parse(JSON.stringify(x));
function fail(code){const e=new Error(code);e.code=code;throw e}
function validateAnswers(answers,test){
 if(!answers||typeof answers!=='object'||Array.isArray(answers))fail('INVALID_ANSWERS');
 const ids=new Set(test.questions.map(q=>q.id));if(Object.keys(answers).some(k=>!ids.has(k)))fail('UNKNOWN_QUESTION');
 for(const q of test.questions){const v=answers[q.id];if(v===undefined&&q.optional)continue;const count=q.options?q.options.length:(q.labels||test.labels||[0,1,2,3,4]).length;if(!Number.isInteger(v)||v<0||v>=count)fail('INCOMPLETE')}
}
function calculate(answers,data){
 validateAnswers(answers,{questions:data.questions,labels:[0,1,2,3,4]});
 const scores={A:0,B:0,C:0,D:0};for(const q of data.questions)scores[q.axis]+=(answers[q.id]-2)*q.polarity;
 const values={外向:Math.round((scores.A+12)/24*100),直觉:Math.round((12-scores.B)/24*100),理性:Math.round((scores.C+12)/24*100),计划:Math.round((scores.D+12)/24*100)};
 const sides=Object.values(scores).map(n=>n===0?null:n>0?'0':'1'),typeId=sides.some(n=>n===null)?null:sides.join('');
 return{scores,values,typeId,typeCode:typeId?[typeId[0]==='0'?'E':'I',typeId[1]==='0'?'S':'N',typeId[2]==='0'?'T':'F',typeId[3]==='0'?'J':'P'].join(''):''};
}
function baseCalculateTest(answers,test,data){
 if(test.extended)return extended.calculate(answers,test);if(test.id==='cat16')return calculate(answers,data);validateAnswers(answers,test);
 if(test.kind==='screening'){
  const total=test.questions.filter(q=>q.scored).reduce((n,q)=>n+answers[q.id],0),phq=test.id==='phq9';
  const band=phq?(total<5?0:total<10?1:total<15?2:total<20?3:4):(total<5?0:total<10?1:total<15?2:3);
  const bandName=(phq?['较少症状范围','轻度症状范围','中度症状范围','中重度症状范围','重度症状范围']:['较少症状范围','轻度症状范围','中度症状范围','重度症状范围'])[band];
  return{scores:{total},values:{总分:total},typeId:null,typeCode:'',clinical:true,screening:{total,max:phq?27:21,band,bandName,needsAssessment:phq&&answers['phq9-9']>0,impact:answers[test.id+'-impact']??null}};
 }
 const scores=Object.fromEntries(test.dimensions.map(d=>[d.id,0]));
 if(test.kind==='ratings')for(const q of test.questions)scores[q.dimension]+=q.polarity===1?answers[q.id]:4-answers[q.id];
 else for(const q of test.questions)scores[q.options[answers[q.id]].dimension]++;
 const ranking=test.dimensions.map(d=>({...d,raw:scores[d.id]})).sort((a,b)=>b.raw-a.raw);
 const typeId=test.kind==='ratings'?(ranking[0].raw>=10&&ranking[0].raw-ranking[1].raw>=2?ranking[0].id:'mixed'):(ranking[0].raw-ranking[1].raw>=2?ranking[0].id:'mixed');
 let metrics;
 if(test.kind==='ratings')metrics=ranking.map(d=>({...d,value:Math.round(d.raw/16*100)}));
 else{const total=test.questions.length,tenths=ranking.map(d=>Math.floor(d.raw*1000/total));let remainder=1000-tenths.reduce((a,b)=>a+b,0);const order=ranking.map((d,i)=>({i,r:d.raw*1000%total})).sort((a,b)=>b.r-a.r||a.i-b.i);for(let j=0;j<remainder;j++)tenths[order[j].i]++;metrics=ranking.map((d,i)=>({...d,value:tenths[i]/10}))}
 const report=test.results.find(r=>r.id===typeId);if(!report)fail('MISSING_REPORT');
 const reportSnapshot={...clone(report),metrics,metricKind:test.kind==='disc'?'share':'index',leaders:ranking.filter(x=>ranking[0].raw-x.raw<=1).map(x=>x.name),sections:test.resultSections};
 return{scores,values:Object.fromEntries(metrics.map(m=>[m.name,m.value])),typeId,typeCode:'',reportSnapshot};
}
function calculateTest(answers,test,data){return darkResult.enhance(baseCalculateTest(answers,test,data),test)}
function questionsFor(test,answers){return test.extended?extended.visibleQuestions(test,answers):test.questions}
function answered(test,q,answers){return test.extended?extended.isAnswered(q,answers):answers[q.id]!==undefined||q.optional}
function createStore(storage,data,options={}){
 const now=options.now||(()=>new Date().toISOString()),uid=options.uid||(()=>crypto.randomUUID());
 const tests=options.tests||{cat16:{id:'cat16',title:'16型猫格测试',version:data.version,questions:data.questions,kind:'cat16'}};
 let activeMemoryTest=null;const memoryDrafts=new Map(),sessionRecords=new Map();
 const definition=id=>{const t=tests[id];if(!t||!t.questions)fail('UNKNOWN_TEST');return t};
 const inMemory=t=>t.kind==='screening'||t.privateSession;
 const fresh=id=>({testId:id,answers:{},index:0,startedAt:now()});
 function initial(){return{schema:1,fish:1,adViews:0,records:[],draft:null,rewards:[],drafts:{}}}
 function validateDraft(d){if(!d)return;const t=definition(d.testId||'cat16');if(!d.answers||!Number.isInteger(d.index)||d.index<0||d.index>=t.questions.length)fail('CORRUPT_STORAGE')}
 function validate(s){
  if(!s||s.schema!==1||!Number.isSafeInteger(s.fish)||s.fish<0||!Number.isSafeInteger(s.adViews)||s.adViews<0||!Array.isArray(s.records)||!Array.isArray(s.rewards))fail('CORRUPT_STORAGE');
  if(s.records.some(r=>!r||typeof r.id!=='string'||!r.answers||!r.values||typeof r.unlocked!=='boolean'))fail('CORRUPT_STORAGE');
  validateDraft(s.draft);if(s.drafts){if(typeof s.drafts!=='object'||Array.isArray(s.drafts))fail('CORRUPT_STORAGE');Object.values(s.drafts).forEach(validateDraft)}return s;
 }
 function read(){try{const raw=storage.getItem(KEY);return raw===null?initial():validate(JSON.parse(raw))}catch(e){if(e.code)throw e;fail('READ_FAILED')}}
 function commit(s){validate(s);try{storage.setItem(KEY,JSON.stringify(s))}catch{fail('SAVE_FAILED')}return clone(s)}
 function mutate(fn){const s=read(),value=fn(s);commit(s);return clone(value===undefined?s:value)}
 function record(s,id){const r=s.records.find(r=>r.id===id);if(!r)fail('MISSING_RECORD');return r}
 const lookup=(s,id)=>sessionRecords.get(id)||record(s,id);
 function mark(r,method){r.unlocked=true;r.unlockMethod=method;r.unlockedAt=now()}
 const full=s=>s.adViews>=15;
 const current=s=>activeMemoryTest?memoryDrafts.get(activeMemoryTest):s.draft;
 function validAnswer(d,id,value){
  if(!d)fail('MISSING_DRAFT');const t=definition(d.testId),q=questionsFor(t,d.answers).find(q=>q.id===id);if(!q)fail('INVALID_ANSWER');
  if(t.extended)return extended.validateAnswer(t,q,value);
  const count=q.options?q.options.length:(q.labels||t.labels||[0,1,2,3,4]).length;if(!Number.isInteger(value)||value<0||value>=count)fail('INVALID_ANSWER');
 }
 function makeRecord(d){const t=definition(d.testId),result=calculateTest(d.answers,t,data);if(result.guidance)return{...result,testId:t.id};return{id:uid(),testId:t.id,testTitle:t.title,version:t.version,createdAt:now(),questionCount:questionsFor(t,d.answers).length,answers:t.privateSession?{}:clone(d.answers),...result,unlocked:false,...(t.privateSession?{privateSession:true,saved:false}:{})}}
 function saveScreening(id){const pending=sessionRecords.get(id);if(!pending)return clone(record(read(),id));if(!pending.clinical)fail('INVALID_RECORD');const saved=mutate(s=>{if(s.records.some(r=>r.id===id))return record(s,id);const r={...clone(pending),answers:{},saved:true};delete r.saveError;s.records.unshift(r);return r});sessionRecords.delete(id);return saved}
 function savePersonal(id){const pending=sessionRecords.get(id);if(!pending)return clone(record(read(),id));if(!pending.privateSession||!(pending.unlocked||full(read())))fail('LOCKED');const saved=mutate(s=>{const r={...clone(pending),answers:{},saved:true};if(full(s)&&!r.unlocked)mark(r,'all-access');if(!s.records.some(x=>x.id===id))s.records.unshift(r);return r});sessionRecords.delete(id);return saved}
 if(storage.getItem(KEY)===null)commit(initial());else read();
 return{
  snapshot:()=>{const s=read();return clone({...s,drafts:s.drafts||{},draft:current(s),sessionRecords:[...sessionRecords.values()]})},
  start:(requested)=>{const id=requested||current(read())?.testId||'cat16',t=definition(id);if(inMemory(t)){if(!memoryDrafts.has(id))memoryDrafts.set(id,fresh(id));activeMemoryTest=id;return clone(memoryDrafts.get(id))}const d=mutate(s=>{s.drafts=s.drafts||{};if(s.draft&&s.draft.testId!==id)s.drafts[s.draft.testId]=s.draft;if(!s.draft||s.draft.testId!==id){s.draft=s.drafts[id]||fresh(id);delete s.drafts[id]}return s.draft});activeMemoryTest=null;return d},
  answer:(id,value)=>{const d=current(read());validAnswer(d,id,value);const t=definition(d.testId),apply=d=>{d.answers[id]=clone(value);d.index=Math.min(d.index,questionsFor(t,d.answers).length-1);return d};if(activeMemoryTest)return clone(apply(d));return mutate(s=>apply(s.draft))},
  move:index=>{const d=current(read());if(!d)fail('MISSING_DRAFT');if(!Number.isInteger(index)||index<0||index>=questionsFor(definition(d.testId),d.answers).length)fail('INVALID_INDEX');if(activeMemoryTest){d.index=index;return clone(d)}return mutate(s=>{s.draft.index=index;return s.draft})},
  preview:()=>{const d=current(read());if(!d)fail('MISSING_DRAFT');return calculateTest(d.answers,definition(d.testId),data)},
  discard:()=>{if(activeMemoryTest){memoryDrafts.delete(activeMemoryTest);activeMemoryTest=null;return}return mutate(s=>{s.draft=null})},
  finish:()=>{const d=current(read());if(!d)fail('MISSING_DRAFT');const r=makeRecord(d);if(r.guidance)return clone(r);if(activeMemoryTest){const t=definition(activeMemoryTest);if(r.clinical)mark(r,'screening-free');else if(r.freeResult)mark(r,'exploration-free');else if(full(read()))mark(r,'all-access');sessionRecords.set(r.id,r);memoryDrafts.delete(activeMemoryTest);activeMemoryTest=null;if(t.privateSession)return clone(r);r.saved=false;try{return saveScreening(r.id)}catch(e){if(e.code!=='SAVE_FAILED')throw e;r.saveError=e.code;sessionRecords.set(r.id,r);return clone(r)}}return mutate(s=>{if(full(s))mark(r,'all-access');s.records.unshift(r);s.draft=null;return r})},
  getRecord:id=>clone(lookup(read(),id)),saveScreening,savePersonal,
  canRead:id=>{const s=read(),r=lookup(s,id);return r.unlocked||r.clinical||full(s)},
  unlockFish:id=>{let temporary;const result=mutate(s=>{const fromSession=sessionRecords.has(id),r=fromSession?clone(sessionRecords.get(id)):record(s,id);if(r.unlocked||r.clinical)return r;if(full(s))mark(r,'all-access');else{if(s.fish<1)fail('NO_FISH');s.fish--;mark(r,'fish')}if(fromSession)temporary=r;return r});if(temporary)sessionRecords.set(id,temporary);return result},
  grantAd:receipt=>{let temporary;const result=mutate(s=>{
   if(!receipt||typeof receipt.id!=='string'||!receipt.id||!['fish','unlock'].includes(receipt.purpose))fail('INVALID_REWARD');
   if(s.rewards.includes(receipt.id))return{duplicate:true,adViews:s.adViews};
   const fromSession=receipt.purpose==='unlock'&&sessionRecords.has(receipt.recordId),r=receipt.purpose==='unlock'?(fromSession?clone(sessionRecords.get(receipt.recordId)):record(s,receipt.recordId)):null;
   if(r?.clinical||r?.freeResult||full(s))return{alreadyFree:true,adViews:s.adViews};if(!Number.isSafeInteger(s.fish+1))fail('LIMIT');
   s.adViews++;if(r)mark(r,'ad');else s.fish++;s.rewards.push(receipt.id);if(fromSession)temporary=r;
   if(full(s))for(const item of s.records)if(!item.unlocked)mark(item,'all-access');return{adViews:s.adViews,fullAccess:full(s)};
  });if(temporary)sessionRecords.set(temporary.id,temporary);return result},
  claimFree:()=>mutate(s=>{if(!full(s))fail('NOT_FREE');if(!Number.isSafeInteger(s.fish+1))fail('LIMIT');s.fish++;return s.fish})
 };
}
return{KEY,calculate,calculateTest,createStore,questionsFor,answered};
});
