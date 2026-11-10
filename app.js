(() => {
 'use strict';
 const app=document.getElementById('app'),progress=document.getElementById('return-progress');
 const arrows=new Set();let games=[],screen='opening',selected=0,action=1,holdStart=null,holdTimer=null,frame=null,resizeObserver=null,launchId=0;
 let config={gameOrigin:location.origin,maintenanceUrl:'http://127.0.0.1:8082/',version:null};
 function maintenance(){cleanup();location.assign(config.maintenanceUrl);}
 const escape=text=>String(text).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
 const pixelDuck=['....................','.........yyyyy......','........yyyyyyy.....','........yyyykyy.....','........yyyyyyoooo..','........yyyyyyoooo..','..y.....yyyyyy......','..yy...yyyyyyy......','..yyyyyyyyyyyy......','...yyyyywwyyyy......','...yyyywwwwyyy......','....yyyywwyyyy......','.....yyyyyyyy.......','......yyyyyy........','....................'];
 function duck(extra=''){
  const colors={y:'#ffd34e',w:'#fff2bb',k:'#182b2c',o:'#ed8845'};
  return `<svg class="duck ${extra}" viewBox="0 0 20 15" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" shape-rendering="crispEdges">${pixelDuck.flatMap((row,y)=>[...row].map((c,x)=>colors[c]?`<path fill="${colors[c]}" d="M${x} ${y}h1v1h-1z"/>`:'')).join('')}</svg>`;
 }
 function art(game){return `<div class="art ${escape(game.theme)}" aria-hidden="true">${game.platform==='MakeCode'?'<img class="pizza-art" src="assets/pizza.svg" alt="">':duck()}</div>`;}
 function resetHold(){arrows.clear();holdStart=null;clearInterval(holdTimer);holdTimer=null;progress.hidden=true;progress.querySelector('progress').value=0;}
 function cleanup(){launchId++;resetHold();resizeObserver?.disconnect();resizeObserver=null;if(frame){frame.remove();frame=null;}document.body.classList.remove('in-game');}
 function selectButton(){
  const buttons=[...app.querySelectorAll('[data-choice]')];
  const index=screen==='catalog'?selected:screen==='details'?action:0;
  buttons.forEach((button,i)=>{button.classList.toggle('selected',i===index);button.tabIndex=i===index?0:-1;});
  buttons[index]?.focus({preventScroll:true});buttons[index]?.scrollIntoView({block:'nearest',behavior:'instant'});
 }
 function opening(){
  cleanup();screen='opening';
  app.innerHTML=`<section class="splash"><p class="eyebrow">WELCOME TO THE POND · PLAYER ONE</p><h1>Dr. Donaldson's<span>Duck Arcade</span></h1><p class="tagline">coded by students</p><div class="scene" aria-hidden="true"><span class="spark">✦</span><span class="spark two">+</span>${duck('small')}${duck()}${duck('small last')}</div><button class="primary" data-choice id="enter">▶ PRESS SPACE TO START</button><p class="micro">SMALL GAMES. BIG IDEAS.<br>ONE VERY HAPPY POND</p></section>`;
  document.getElementById('enter').onclick=catalog;selectButton();
 }
 function catalog(){
  cleanup();screen='catalog';
  app.innerHTML=`<section><div class="catalog-heading"><div><p class="eyebrow">THE STUDENT COLLECTION</p><h1>Pick your next adventure.</h1></div><span class="count">${String(games.length).padStart(2,'0')} GAMES / FREE PLAY</span></div><div class="cards" role="group" aria-label="Choose a game">${games.map((game,i)=>`<button class="card" data-choice data-game="${i}" aria-label="${escape(game.name)}, coded by ${escape(game.author)}">${art(game)}<div class="card-body"><span class="platform">${escape(game.platform)} · ${String(i+1).padStart(2,'0')}</span><h2>${escape(game.name)}</h2><span class="byline">CODED BY<br>${escape(game.author)}</span></div></button>`).join('')}</div><p class="catalog-note">← → CHOOSE YOUR GAME &nbsp; / &nbsp; SPACE TO TAKE A CLOSER LOOK</p></section>`;
  app.querySelectorAll('[data-game]').forEach(button=>button.onclick=()=>{selected=Number(button.dataset.game);details();});selectButton();
 }
 function details(){
  cleanup();screen='details';action=1;const game=games[selected];
  app.innerHTML=`<section class="details">${art(game)}<div><p class="eyebrow">READY, PLAYER ONE?</p><span class="platform">${escape(game.platform)} · GAME ${String(selected+1).padStart(2,'0')}</span><h1>${escape(game.name)}</h1><p class="byline">CODED BY ${escape(game.author)}</p><p class="description">${escape(game.description)}</p><p class="controls">CONTROLS<br>${escape(game.controls)}</p><div class="actions"><button class="secondary" data-choice id="exit">← EXIT</button><button class="primary" data-choice id="play">PLAY GAME ▶</button></div></div></section>`;
  document.getElementById('exit').onclick=catalog;document.getElementById('play').onclick=play;selectButton();
 }
 async function play(){
  cleanup();screen='playing';document.body.classList.add('in-game');const game=games[selected],id=launchId;
  app.innerHTML=`<section class="playing"><h1>${escape(game.name)}</h1><div class="game-viewport"><p class="load-message" role="status">LOADING YOUR ADVENTURE…</p></div><p class="micro">${escape(game.controls)}</p><button class="secondary" id="back">← RETURN TO GAMES</button></section>`;
  document.getElementById('back').onclick=catalog;const viewport=app.querySelector('.game-viewport');
  try{
   let built;
   if(game.platform==='MakeCode'){
    const response=await fetch(new URL('built.json',new URL(game.src,location.href)));if(!response.ok)throw Error('Compiled game could not be loaded');built=await response.json();
   }
   if(id!==launchId)return;
   frame=document.createElement('iframe');frame.title=game.name;frame.allow='autoplay; accelerometer; gyroscope';
   frame.sandbox='allow-scripts allow-same-origin';
   const gameUrl=new URL(game.src,config.gameOrigin+'/');
   frame.src=game.platform==='MakeCode'?new URL('runtime/simulator.html?hideSimButtons=1',gameUrl).href:gameUrl.href;
   if(game.platform==='Game Lab')frame.className='gamelab';else frame.className='makecode';
   const currentFrame=frame;
   frame.addEventListener('load',()=>{
    if(id!==launchId)return;
    if(built)currentFrame.contentWindow.postMessage({type:'run',code:built.js,id:game.id,frameCounter:1,options:{theme:'green'},parts:built.parts,fnArgs:built.fnArgs,usedBuiltinParts:built.usedBuiltinParts,breakpoints:built.breakpoints},config.gameOrigin);
    viewport.querySelector('.load-message')?.remove();currentFrame.contentWindow.focus();
   });
   viewport.append(frame);
   if(game.platform==='Game Lab'){
    const resize=()=>{currentFrame.style.transform=`scale(${viewport.clientWidth/400})`;};
    resizeObserver=new ResizeObserver(resize);resizeObserver.observe(viewport);resize();
   }
  }catch(error){if(id===launchId)viewport.querySelector('.load-message').textContent=`Could not start game. ${error.message}. Use Return to Games to try again.`;}
 }
 window.addEventListener('keydown',event=>{
  if(screen==='playing'){
   if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(event.code))event.preventDefault();
   return;
  }
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Enter'].includes(event.code))event.preventDefault();else if(event.code==='Escape'){if(screen==='details')catalog();else opening();return;}
  if(event.repeat||arrows.size>1)return;
  if(screen==='catalog'&&event.code.startsWith('Arrow')){const delta=['ArrowLeft','ArrowUp'].includes(event.code)?-1:1;selected=(selected+delta+games.length)%games.length;selectButton();}
  else if(screen==='details'&&event.code.startsWith('Arrow')){action=action===0?1:0;selectButton();}
  else if(event.code==='Space'||event.code==='Enter'){
   if(screen==='opening')catalog();else if(screen==='catalog')details();else if(screen==='details')action===1?play():catalog();
  }
 });
 window.addEventListener('arcade-key',event=>{
  if(event.detail.maintenance){maintenance();return;}
  const {key,down}=event.detail;if(down)arrows.add(key);else arrows.delete(key);
  if(arrows.size===4&&holdStart===null){holdStart=performance.now();progress.hidden=false;holdTimer=setInterval(()=>{progress.querySelector('progress').value=performance.now()-holdStart;if(performance.now()-holdStart>=3000)catalog();},25);}
  else if(arrows.size<4){holdStart=null;clearInterval(holdTimer);holdTimer=null;progress.hidden=true;}
 });
 window.addEventListener('arcade-clear-keys',resetHold);
 window.addEventListener('message',event=>{
  if(event.source!==frame?.contentWindow||event.origin!==config.gameOrigin||event.data?.type!=='duck-arcade-input')return;
  if(event.data.clear)resetHold();else if(event.data.maintenance)maintenance();
  else if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.data.key)&&typeof event.data.down==='boolean')window.dispatchEvent(new CustomEvent('arcade-key',{detail:event.data}));
 });
 document.addEventListener('visibilitychange',()=>{if(document.hidden)resetHold();});
 document.getElementById('brand').onclick=event=>{event.preventDefault();opening();};
 Promise.all([fetch('api/config').then(r=>r.json()),fetch('games.json').then(response=>{if(!response.ok)throw Error('Game list could not be loaded');return response.json();})]).then(([settings,data])=>{config=settings;if(!Array.isArray(data)||!data.length)throw Error('No games in the collection');games=data;opening();}).catch(error=>{app.textContent=error.message;});
 // Updates are activated between games, never in the middle of a student's turn.
 setInterval(async()=>{if(screen==='playing')return;try{const response=await fetch('api/config',{cache:'no-store'});const latest=await response.json();if(latest.version&&config.version&&latest.version!==config.version)location.reload();}catch{}},20000);
})();
