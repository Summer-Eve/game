(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.CatDarkResult=factory()})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const clone=x=>JSON.parse(JSON.stringify(x));
const configs={
 shadow:{caption:'你的阴影分数',chartTitle:'六维阴影图谱',order:['ambition','comparison','attention','support','control','anger'],names:{ambition:'欲望',comparison:'攀比',attention:'自私／傲慢',support:'索取',control:'掌控欲',anger:'暴怒'},main:'#572430',fill:'#572430',kind:'shadow'},
 'seven-sins':{caption:'你的七宗罪分数',chartTitle:'七维欲望图谱',main:'#493047',fill:'#493047',kind:'sins'},
 dark:{caption:'你的暗面分数',chartTitle:'四维暗面图谱',main:'#4a302c',fill:'#4a302c',kind:'dark'}
};
function supported(id){return Object.hasOwn(configs,id)}
function nameFor(t,id){return configs[t?.id]?.names?.[id]||t?.dimensions?.find(d=>d.id===id)?.name}
function metricsFor(p,t){
 const cfg=configs[t.id];if(!cfg||!p?.metrics)return null;const ids=cfg.order||t.dimensions.map(d=>d.id);
 const metrics=ids.map(id=>{const m=p.metrics.find(m=>m.id===id);if(!m||typeof m.value!=='number'||!Number.isFinite(m.value)||m.value<0||m.value>100)return null;return{...clone(m),name:cfg.names?.[id]||t.dimensions.find(d=>d.id===id).name,rawValue:m.rawValue??m.value,value:Math.round(m.value)}});
 return metrics.some(m=>m===null)?null:metrics;
}
function enhance(result,t){
 if(!supported(t?.id)||result.guidance)return result;const metrics=metricsFor(result.reportSnapshot,t);if(!metrics)return result;
 const cfg=configs[t.id],maxValue=Math.max(...metrics.map(m=>m.value)),leaders=metrics.filter(m=>m.value===maxValue),total=metrics.reduce((n,m)=>n+m.value,0),primary=leaders[0];
 const reports=leaders.map(m=>{const p=t.results.find(p=>p.id===m.id);if(!p)throw new Error('MISSING_DARK_REPORT');return{...clone(p),dimensionName:m.name,dimensionValue:m.value}});
 const main=reports[0],zero=maxValue===0,title=leaders.map(m=>m.name).join('／')+' · '+total+'分';
 const ds={version:1,caption:cfg.caption,chartTitle:cfg.chartTitle,kind:cfg.kind,main:cfg.main,fill:cfg.fill,total,max:metrics.length*100,maxValue,leaderIds:leaders.map(m=>m.id),leaderNames:leaders.map(m=>m.name),zero,metrics,method:'round-each-then-sum',scope:t.id==='shadow'?'反应隐藏与接纳线索':'本次作答倾向'};
 const p=result.reportSnapshot;
 return{...result,typeId:primary.id,values:Object.fromEntries(metrics.map(m=>[m.name,m.value])),reportSnapshot:{...clone(main),title,short:zero?'本次各计分方向均为0分。':leaders.length===1?'本次最高方向为'+primary.name+'，'+maxValue+'分。':'本次并列最高：'+leaders.map(m=>m.name).join('、')+'，各'+maxValue+'分。',metrics,metricKind:'score',leaders:ds.leaderNames,sections:clone(t.resultSections),supplements:clone(p.supplements||[]),darkScore:ds,leaderReports:reports,originalTitle:main.title,metricNote:'各维按0–100整数分展示，再逐项相加；各项并非互斥比例。'}};
}
function displayRecord(r,t){if(!supported(t?.id)||!r.reportSnapshot)return r;if(r.reportSnapshot.darkScore?.version===1)return r;return{...r,...enhance({typeId:r.typeId,typeCode:r.typeCode||'',scores:r.scores||{},values:r.values||{},reportSnapshot:r.reportSnapshot},t)}}
function geometry(metrics,radius=100){const count=metrics.length;if(count<3)throw new Error('INVALID_RADAR');return metrics.map((m,i)=>{const angle=-Math.PI/2+i*Math.PI*2/count;return{id:m.id,value:m.value,angle,x:Math.cos(angle)*radius*m.value/100,y:Math.sin(angle)*radius*m.value/100,gx:Math.cos(angle)*radius,gy:Math.sin(angle)*radius,labelX:Math.max(13,Math.min(87,50+43*Math.cos(angle))),labelY:50+43*Math.sin(angle)}})}
return{supported,nameFor,enhance,displayRecord,geometry};
});
