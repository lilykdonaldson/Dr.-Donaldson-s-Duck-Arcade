// Every local game frame forwards physical arrow transitions to the kiosk.
(() => {
 const root=window.parent===window?window:window.parent;
 function send(detail){
  if(root===window)window.dispatchEvent(new CustomEvent('arcade-key',{detail}));
  else root.postMessage({type:'duck-arcade-input',...detail},new URL(document.referrer||location.href).origin);
 }
 for(const type of ['keydown','keyup'])window.addEventListener(type,event=>{
  // Cancel browser scrolling, but let the game receive the same key event.
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(event.code))event.preventDefault();
  if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key))return;
  send({key:event.key,down:type==='keydown'});
 },true);
 window.addEventListener('keydown',event=>{
  if(event.ctrlKey&&event.altKey&&event.code==='KeyM'&&!event.repeat){event.preventDefault();send({maintenance:true});}
 },true);
 window.addEventListener('blur',()=>{
  if(root===window)window.dispatchEvent(new Event('arcade-clear-keys'));
  else send({clear:true});
 });
})();
