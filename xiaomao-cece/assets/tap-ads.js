(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(()=>undefined);else root.CatTapAds=factory(()=>root.tap)})(typeof window!=='undefined'?window:globalThis,function(defaultTap){
'use strict';
// Supplied by check_ads_status for 小猫测测 / 1014228 / portrait, 2026-10-31.
const SPACE_ID='1054324';
function create(options={}){
 const getTap=options.getTap||defaultTap,setTimer=options.setTimer||setTimeout,clearTimer=options.clearTimer||clearTimeout;
 const loadTimeout=options.loadTimeout||20000,closeTimeout=options.closeTimeout||600000;
 let ad=null,active=null,serial=0,ready=false;
 function finish(attempt,outcome){
  if(active!==attempt||attempt.done)return;
  attempt.done=true;clearTimer(attempt.timer);active=null;attempt.resolve(outcome);
 }
 function loadingTimer(attempt){clearTimer(attempt.timer);attempt.timer=setTimer(()=>finish(attempt,'error'),loadTimeout)}
 function playing(attempt){
  if(active!==attempt||attempt.done)return;
  attempt.shown=true;attempt.phase='playing';clearTimer(attempt.timer);
  attempt.timer=setTimer(()=>finish(attempt,'error'),closeTimeout);
 }
 function init(){
  if(ad)return true;
  try{
   const tap=getTap();if(!tap||typeof tap.createRewardedVideoAd!=='function')return false;
   const instance=tap.createRewardedVideoAd({adUnitId:SPACE_ID});
   if(!instance||['show','load','onLoad','onClose','onError'].some(k=>typeof instance[k]!=='function'))return false;
   ad=instance;
   ad.onLoad(()=>{ready=true});
   ad.onError(()=>{
    ready=false;const attempt=active;
    // During show/load, their Promise rejection owns the single recovery retry.
    if(attempt?.phase==='playing')setTimer(()=>{if(active===attempt&&attempt.phase==='playing')finish(attempt,'error')},0);
   });
   ad.onClose(res=>{
    const attempt=active;if(!attempt||!attempt.shown)return;
    ready=false;finish(attempt,res?.isEnded===true?'complete':'cancel');
   });
   // The host also refreshes materials after close; preload only when first initialized.
   try{ad.load().catch(()=>{ready=false})}catch{ready=false}
   return true;
  }catch{ad=null;return false}
 }
 function showRewardedVideo(){
  if(active)return active.promise;
  if(!init())return Promise.resolve('unavailable');
  let resolve;const promise=new Promise(done=>{resolve=done});
  const attempt={id:++serial,phase:'showing',shown:false,done:false,resolve,promise,timer:null};active=attempt;loadingTimer(attempt);
  function retry(){
   if(active!==attempt||attempt.done)return;
   attempt.phase='loading';
   let load;
   try{load=ad.load()}catch{finish(attempt,'error');return}
   load.then(()=>{
    if(active!==attempt||attempt.done)return;
    attempt.phase='retrying';return ad.show().then(()=>playing(attempt));
   }).catch(()=>finish(attempt,'error'));
  }
  try{ad.show().then(()=>playing(attempt)).catch(retry)}catch{retry()}
  return promise;
 }
 return{init,showRewardedVideo,state:()=>({initialized:!!ad,ready,busy:!!active,phase:active?.phase||'idle',attempts:serial,spaceId:SPACE_ID})};
}
return{create,spaceId:SPACE_ID};
});
