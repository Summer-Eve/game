(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.CatOrientationCore=factory()})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const clone=x=>JSON.parse(JSON.stringify(x)),vals=v=>v==null?[]:Array.isArray(v)?v:[v];
function fail(code){const e=new Error(code);e.code=code;throw e}
function visibleQuestions(t,a={}){function match(c){return c.any?c.any.some(match):vals(a[c.question]).some(v=>c.anyOf.includes(v))}return t.questions.filter(q=>!q.when||match(q.when))}
function validateAnswer(t,q,value){
 if(value===null&&q.allowSkip)return;const options=q.options.map(o=>o.id);
 if(q.kind==='multi'){
  if(!Array.isArray(value)||new Set(value).size!==value.length)fail('INVALID_ANSWER');
  if(value.some(v=>!options.includes(v)))fail('INVALID_ANSWER');
  if(value.length>1&&value.some(v=>(q.exclusiveChoices||[]).includes(v)))fail('EXCLUSIVE_CHOICES');
 }else if(typeof value!=='string'||!options.includes(value))fail('INVALID_ANSWER');
}
function validateAnswers(t,a){
 if(!a||typeof a!=='object'||Array.isArray(a))fail('INVALID_ANSWERS');const ids=new Set(t.questions.map(q=>q.id));if(Object.keys(a).some(id=>!ids.has(id)))fail('UNKNOWN_QUESTION');
 for(const q of visibleQuestions(t,a))if(a[q.id]!==undefined)validateAnswer(t,q,a[q.id]);
}
function result(t,primary,secondary,supp,basis,notes,subtype,stage,window){
 const report=t.results.find(r=>r.id===primary);if(!report)fail('MISSING_REPORT');
 const named=['heterosexual','homosexual','bisexual','pansexual','asexual','fictosexual'].includes(primary);
 return{status:named?'complete':'descriptive',resultId:primary,displayTitle:report.title,prefix:['current','brief'].includes(stage)||window==='recent'?'当前体验更接近':'本次体验更接近',secondaryResultIds:secondary,supplementIds:supp,fictionSubtype:subtype,basis,notes,unlockable:named,canShowImmediately:!named,hasProbabilityScore:false,identityIsUserChoice:true};
}
function score(t,a){
 validateAnswers(t,a);const valid=Object.fromEntries(visibleQuestions(t,a).map(q=>[q.id,a[q.id]??null])),v=n=>valid['ORI4-'+String(n).padStart(2,'0')]??null,yes=n=>v(n)==='present';
 const notes=[],supp=[],basis=[],guide=reason=>({status:'guidance',resultId:null,unlockable:false,reason,notes});
 const realKeys={4:'men',5:'women',6:'nonbinary'},knownYes=Object.keys(realKeys).filter(n=>yes(Number(n))).map(n=>realKeys[n]),real=!!knownYes.length||yes(7);
 const fsexRaw=yes(8),fromRaw=yes(9),realSummary=['gender_not_key','multi_with_gender','one_direction','not_sorted'].includes(v(11)),anySex=real||realSummary||fsexRaw;
 if(v(3)==='absent'&&anySex)return guide('总体为无明确性吸引，具体对象题却为明确有；先回看含义或时间范围。');
 if((v(3)==='present'||anySex)&&v(16)==='none')return guide('具体体验与频率题前后未对齐，先免费核对，不强行命名。');
 if(v(3)==='absent'&&['often','rare'].includes(v(16)))return guide('总体无明确性吸引与频率有明确性吸引不一致，先回看。');
 const unclear=['uncertain','no_experience'].includes(v(3))||['romance_only','uncertain'].includes(v(20))||v(18)==='unsure';
 const paperIssue=['performer_only','unsure'].includes(v(10))&&(fsexRaw||fromRaw);
 if(paperIssue)notes.push('角色与现实呈现者部分尚未对齐，暂不加入纸性标签；其他明确方向可单独保留。');
 const fsex=fsexRaw&&!paperIssue,fromance=fromRaw&&!paperIssue;
 if(unclear){if(fromance&&!anySex)return result(t,'fictosexual',[],[],['已明确描述对成年设定角色的浪漫吸引；性吸引部分尚未理清。'],notes,'以浪漫吸引为主，性吸引尚待整理',v(17),v(2));return guide('尚分不清性吸引，先免费整理；不把未知当无性恋或任何其他取向。')}
 let realResult=null,realIssue=null;
 if(real){
  if(v(11)==='not_applicable')realIssue='已有明确现实性吸引，却在第11题选没有，需先核对。';
  else if((knownYes.length>=2&&v(13)==='overlap')||(v(11)==='one_direction'&&(knownYes.length>=2||['distinct','self_multi'].includes(v(13))))){realResult='multi-attraction';notes.push('多个称呼尚不能按独立性别方向计算，暂不自动使用双性或泛性标签。')}
  else{
   const reportedMulti=['gender_not_key','multi_with_gender'].includes(v(11)),confirmedMulti=['distinct','self_multi'].includes(v(13));
   if(reportedMulti&&v(13)==='overlap'){realResult='multi-attraction';notes.push('多性别表述与称呼重叠的说明需要继续整理，不强行计数。')}
   else if(reportedMulti||confirmedMulti)realResult=v(11)==='gender_not_key'?'pansexual':'bisexual';
   else if(knownYes.length>=2)realResult='multi-attraction';
   else if(knownYes.length===1){
    const lead=knownYes[0],ref=v(1),opposite=lead==='men'?5:lead==='women'?4:null,possibleOther=Object.keys(realKeys).some(n=>realKeys[n]!==lead&&v(Number(n))==='possible');
    if(['woman','man'].includes(ref)&&['men','women'].includes(lead)&&v(opposite)==='absent'&&!possibleOther){const same=(ref==='woman'&&lead==='women')||(ref==='man'&&lead==='men');realResult=same?'homosexual':'heterosexual'}
    else realResult={men:'toward-men',women:'toward-women',nonbinary:'toward-nonbinary'}[lead];
   }else notes.push('现实性吸引明确，但尚无足够的具体性别方向信息。');
  }
  if(realIssue)notes.push(realIssue);
  if(Object.keys(realKeys).some(n=>[null,'possible','no_experience','decline'].includes(v(Number(n)))))notes.push('未知或缺少经历的性别方向没有被当作明确排除。');
  if(v(14)==='before_no'&&v(15)==='new_after')supp.push('bond');
  if(v(16)==='rare')supp.push('rare-attraction');
 }
 const noSexNow=!anySex&&(v(3)==='absent'||v(16)==='none');let absence=null;
 if(noSexNow){const short=v(17)==='brief'||v(2)==='recent',unresolved=[4,5,6,7,8].some(n=>v(n)==='possible');absence=v(18)==='longstanding'&&!short&&!unresolved?'asexual':'current-low';if(unresolved)notes.push('尚有疑似体验未分清，本次只描述当前线索，不采用长期无性标签。');if(vals(v(12)).some(x=>['men','women','nonbinary','ungrouped'].includes(x)))supp.push('romance-with-little-sex')}
 const ficSubtype=fsex&&fromance?'浪漫与性吸引均有线索':fsex?'以虚构角色的性吸引为主':fromance?'以虚构角色的浪漫吸引为主':null,fic=fsex||fromance;
 if(v(19)==='fiction'&&!fic)notes.push('频率比较中提到了角色，但具体角色吸引尚未明确，不据此添加纸性标签。');
 const secondary=[];let primary;
 if(realResult){primary=realResult;if(fic){if(v(19)==='fiction'){primary='fictosexual';secondary.push(realResult)}else secondary.push('fictosexual')}}
 else if(fic){primary=fsex||v(19)==='fiction'||!absence?'fictosexual':absence;if(absence&&primary==='fictosexual')secondary.push(absence);else if(primary!=='fictosexual')secondary.push('fictosexual')}
 else if(absence)primary=absence;
 else return guide(realIssue||(paperIssue?'先区分角色与现实呈现者，再命名角色相关体验。':'已提供的信息不足以形成可靠的命名线索，可补答或结束。'));
 const names={men:'现实男性',women:'现实女性',nonbinary:'现实非二元性别者'};
 for(const key of knownYes)basis.push('你明确描述过指向'+names[key]+'的性吸引。');
 if(v(11)==='gender_not_key'&&real)basis.push('你描述过不同性别的实际吸引，且性别通常不是关键筛选条件。');else if(v(11)==='multi_with_gender'&&real)basis.push('你描述过不止一种性别的实际吸引，并保留具体偏好。');
 if(fsex)basis.push('你明确描述了对虚构角色本人的性吸引。');if(fromance)basis.push('你明确描述了对虚构角色的浪漫或伴侣式喜欢。');
 if(absence==='asexual')basis.push('你描述了无明确性吸引，并明确指出这与较长期的经历一致。');else if(absence==='current-low')basis.push('你描述了当前较少或没有性吸引；长期身份信息未据此推断。');
 return result(t,primary,secondary,supp,basis,notes,ficSubtype,v(17),v(2));
}
function calculate(a,t){
 const r=score(t,a),visible=visibleQuestions(t,a),byId=Object.fromEntries(t.questions.map(q=>[q.id,q]));
 const displayText=text=>text.replace(/第(\d+)题/g,(_,n)=>{const i=visible.findIndex(q=>q.id==='ORI4-'+n.padStart(2,'0'));return i<0?'相关问题':'第'+(i+1)+'项'});
 if(r.status==='guidance'){
  let reviewNums=r.reason.includes('频率')?[3,16,4,5,6,7,8]:r.reason.includes('总体')?[3,4,5,6,7,8,11]:r.reason.includes('呈现者')?[8,9,10]:r.reason.includes('第11题')?[11,4,5,6,7]:[3,20,4,5,6,8,9];
  const reviewQuestionIds=reviewNums.map(n=>'ORI4-'+String(n).padStart(2,'0')).filter(id=>visible.some(q=>q.id===id)).slice(0,4);
  return{extended:true,guidance:true,evaluation:{...r,reasonDisplay:displayText(r.reason),reviewQuestionIds},typeId:null,typeCode:'',scores:{},values:{}};
 }
 const report=clone(t.results.find(p=>p.id===r.resultId));const secondaryReports=r.secondaryResultIds.map(id=>clone(t.results.find(p=>p.id===id))),supplements=r.supplementIds.map(id=>clone(t.supplements.find(s=>s.id===id)));
 const recall=t.questions.find(q=>q.id==='ORI4-02').options.find(o=>o.id===a['ORI4-02'])?.text||'按本次愿意回顾的体验';
 return{extended:true,typeId:r.resultId,typeCode:'',scores:{},values:{},freeResult:r.canShowImmediately,reportSnapshot:{...report,orientation:true,orientationVersion:4,sourceVersion:'review-v0.4',prefix:r.prefix,basis:r.basis,notes:r.notes.map(displayText),secondaryReports,supplements,fictionSubtype:r.fictionSubtype,sections:t.resultSections,recallLabel:recall,descriptive:r.status==='descriptive',hasProbabilityScore:false}};
}
return{score,calculate,visibleQuestions,validateAnswer,validateAnswers};
});