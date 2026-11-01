(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.CatResultThemes=factory()})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const captions={cat16:'你的猫格：',talents:'你的天赋焦点：',eq:'你的情绪应对：',enneagram:'你的九型倾向：',desires:'你的深层欲望：','disc-original':'你的行为风格：','seven-sins':'你的七宗罪：',shadow:'你的阴影主题：',dark:'你的暗面主题：'};
const orientationNames={heterosexual:'异性恋',homosexual:'同性恋',bisexual:'双性恋',pansexual:'泛性恋',asexual:'无性恋',fictosexual:'纸性恋','toward-men':'男性吸引','toward-women':'女性吸引','toward-nonbinary':'非二元吸引','current-low':'较少性吸引','multi-attraction':'多向吸引'};
const discNames={D:'主导',I:'互动',S:'支持',C:'分析'};
function orientationWord(id,fallback){return orientationNames[id]||fallback}
function compactList(words){return words.length>3?words.slice(0,2).join('、')+'等'+words.length+'项并列':words.join('、')}
function nameFor(t,id,fallback){const d=t?.dimensions?.find(d=>d.id===id);if(t?.id==='disc-original')return discNames[id]||d?.name||fallback;if(t?.id==='enneagram')return(d?.name||fallback||'').replace(/^\d型[·・]/,'');return d?.name||fallback||id}
function describe(r,t,p={}){
 const id=r.testId||t?.id||'cat16';let words=[],code='',note='',caption=captions[id]||'你的测试主题：';
 if(r.clinical){const c=r.screening;return{kind:'screening',caption:id==='phq9'?'你的抑郁症状自评：':'你的焦虑症状自评：',words:[String(c.total)],code:'',note:c.bandName,listTitle:c.total+'分 · '+c.bandName}}
 if(id==='cat16')return{kind:'cat',caption,words:[p.title],code:r.typeCode||'',note:'',listTitle:p.title};
 if(p.orientation){if(p.orientationVersion===4){words=[orientationWord(r.typeId||p.id,p.title)];caption=p.descriptive?'本次吸引线索：':p.prefix==='当前体验更接近'?'你当前的吸引倾向：':'本次吸引倾向：'}else{words=['体验记录'];caption='你的历史体验：';note='历史版本'}return{kind:'orientation',caption,words,code:'',note,listTitle:compactList(words)}}
 if(p.darkScore){const d=p.darkScore;words=d.zero?['0分']:[...d.leaderNames];return{kind:'dark',caption,words,code:'',note:d.zero?'各项均为0分':words.length>1?'并列最高':'本次最高',listTitle:d.zero?'0分':compactList(words)+' · '+d.total+'分'}}
 const selected=t?.dimensions?.find(d=>d.id===r.typeId);let ids=[];
 if(selected)ids=[selected.id];else{const valid=(p.metrics||[]).filter(m=>typeof m.value==='number'&&Number.isFinite(m.value));if(valid.length){const max=Math.max(...valid.map(m=>m.value));ids=valid.filter(m=>m.value===max).map(m=>m.id)}}
 words=ids.map(id=>nameFor(t,id,p.metrics?.find(m=>m.id===id)?.name));if(!words.length)words=[p.title||'本次记录'];
 if(words.length>1)note='并列最高';else if(r.typeId==='mixed'||r.typeId==='low')note='本次相对最高';
 if(ids.length===1&&id==='disc-original')code=ids[0]+(r.typeId==='mixed'?' 倾向':' 型');
 if(ids.length===1&&id==='enneagram'){const d=t.dimensions.find(d=>d.id===ids[0]);code=(d.name.match(/^\d型/)||[])[0]||'';if(r.typeId==='mixed')code+='线索'}
 return{kind:'theme',caption,words,code,note,listTitle:compactList(words)+(code?' · '+code:'')};
}
return{describe,orientationWord};
});
