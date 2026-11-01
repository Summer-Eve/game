(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.CatAutoAdvance=factory()})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
function create({current,advance,delay=240,setTimer=setTimeout,clearTimer=clearTimeout}){
 let timer=null,ticket=0;
 function cancel(){ticket++;if(timer!==null){clearTimer(timer);timer=null}}
 function schedule(key){cancel();if(typeof key!=='string'||!key)return;const token=ticket;timer=setTimer(()=>{if(token!==ticket)return;timer=null;if(current()!==key)return;advance()},delay)}
 return{schedule,cancel};
}
return{create};
});
