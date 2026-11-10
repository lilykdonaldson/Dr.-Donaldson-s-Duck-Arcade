(() => {
 const viewport=document.getElementById('viewport'),home=document.getElementById('home'),loading=document.getElementById('loading');
 const hold=document.getElementById('hold'),bar=hold.querySelector('progress');
 const arrows=new Set();let frame,built,holdStart=null,tick=null;
 let running=false;
 function clearHold(){arrows.clear();holdStart=null;clearInterval(tick);tick=null;hold.hidden=true;bar.value=0;}
 function stop(){running=false;clearHold();if(frame){frame.remove();frame=null;}home.hidden=false;document.getElementById('play').focus();
  if(parent!==window)parent.postMessage({type:'duck-arcade-home'},location.origin);
 }
 function start(){
  clearHold();home.hidden=true;loading.hidden=true;running=true;
  frame=document.createElement('iframe');frame.title='Chase the Pizza simulator';
  frame.src='runtime/simulator.html?hideSimButtons=1&nofooter=1';viewport.append(frame);
  frame.addEventListener('load',()=>{
   frame.contentWindow.postMessage({type:'run',code:built.js,id:'chase-the-pizza',frameCounter:1,options:{theme:'green'},parts:built.parts,fnArgs:built.fnArgs,usedBuiltinParts:built.usedBuiltinParts,breakpoints:built.breakpoints},location.origin);
   frame.contentWindow.focus();
  });
 }
 window.addEventListener('arcade-key',event=>{
  if(!running)return;const {key,down}=event.detail;if(down)arrows.add(key);else arrows.delete(key);
  if(arrows.size===4&&holdStart===null){holdStart=performance.now();hold.hidden=false;
   tick=setInterval(()=>{bar.value=performance.now()-holdStart;if(bar.value>=3000)stop();},25);
  }else if(arrows.size<4){holdStart=null;clearInterval(tick);tick=null;hold.hidden=true;bar.value=0;}
 });
 window.addEventListener('arcade-clear-keys',clearHold);
 window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==frame?.contentWindow||event.data?.type!=='duck-arcade-input')return;
  if(event.data.clear)clearHold();else if(event.data.maintenance)location.assign('http://127.0.0.1:8082/');
  else window.dispatchEvent(new CustomEvent('arcade-key',{detail:event.data}));
 });
 document.addEventListener('visibilitychange',()=>{if(document.hidden)clearHold();});
 document.getElementById('play').addEventListener('click',start);
 window.addEventListener('keydown',e=>{if(!running&&built&&e.code==='Space'&&!e.repeat){e.preventDefault();start();}});
 fetch('built.json').then(r=>{if(!r.ok)throw Error('Compiled game missing');return r.json();}).then(result=>{built=result;start();}).catch(error=>{loading.textContent='Unable to load game: '+error.message;});
})();
