(function(){'use strict';let observer;
function mount(container,score){if(observer)observer.disconnect();if(!container)return;const canvas=container.querySelector('canvas');function draw(){const width=container.getBoundingClientRect().width;if(!width)return;const dpr=Math.min(window.devicePixelRatio||1,3);canvas.width=Math.round(width*dpr);canvas.height=Math.round(width*dpr);const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,width,width);const cx=width/2,cy=width/2,r=width*.31,points=window.CatDarkResult.geometry(score.metrics,r);function path(scale,data=false){c.beginPath();points.forEach((p,i)=>{const x=cx+(data?p.x:p.gx*scale),y=cy+(data?p.y:p.gy*scale);if(i)c.lineTo(x,y);else c.moveTo(x,y)});c.closePath()}
 c.strokeStyle='#cbbfbc';c.lineWidth=.8;for(let step=1;step<=5;step++){path(step/5);c.stroke()}for(const p of points){c.beginPath();c.moveTo(cx,cy);c.lineTo(cx+p.gx,cy+p.gy);c.stroke()}
 if(!score.zero){path(1,true);const fill=c.createRadialGradient(cx,cy,0,cx,cy,r);fill.addColorStop(0,score.fill+'77');fill.addColorStop(1,score.fill+'26');c.fillStyle=fill;c.fill();c.lineWidth=2;c.strokeStyle=score.main;c.stroke()}
 points.forEach(p=>{c.beginPath();c.arc(cx+p.x,cy+p.y,score.zero?2.2:3,0,Math.PI*2);c.fillStyle=score.main;c.fill();c.lineWidth=1.2;c.strokeStyle='#fffaf5';c.stroke()});}
 observer=new ResizeObserver(draw);observer.observe(container);draw();
}
window.CatRadarChart={mount};})();
