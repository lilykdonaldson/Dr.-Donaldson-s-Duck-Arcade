(() => {
 let token=null,idleTimer=null,pending=null,lastActivity=Date.now();
 const $=id=>document.getElementById(id);
 function message(text,error=false){$('message').textContent=text;$('message').classList.toggle('error',error);}
 function locked(){token=null;clearTimeout(idleTimer);$('panel').hidden=true;$('login').hidden=false;$('password').value='';$('wifi-password').value='';$('confirm-dialog').close();$('password').focus();}
 function activity(){lastActivity=Date.now();if(token){clearTimeout(idleTimer);idleTimer=setTimeout(()=>{logout();message('Maintenance locked after five minutes of inactivity.');},300000);}}
 async function api(route,data={}){
  const response=await fetch('/api/'+route,{method:'POST',headers:{'Content-Type':'application/json','X-Arcade-Request':'maintenance',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(data)});
  const result=await response.json();if(!response.ok){if(response.status===401&&route!=='login')locked();throw Error(result.error||'Device action failed');}return result;
 }
 async function logout(){try{if(token)await api('logout');}catch{}finally{locked();}}
 async function diagnostics(){
  const {data}=await api('status');
  $('diagnostics').textContent=[`Device: ${data.hostname||'unknown'}   ·   Uptime: ${data.uptime||'unknown'}`,`Installed version: ${data.version||'unknown'}`,`Wi-Fi: ${data.wifiEnabled?'enabled':'disabled'}   ·   ${data.connection||'not connected'}`,`IP addresses: ${(data.addresses||[]).join(', ')||'none'}`,`GitHub DNS: ${data.dns?'OK':'unavailable'}   ·   GitHub HTTPS connection: ${data.internet?'reachable':'unavailable'}`,`Update: ${data.update?.message||'No update has run yet.'}`,data.update?.version?`Update version: ${data.update.version}`:''].filter(Boolean).join('\n');
 }
 async function task(button,fn){button.disabled=true;try{await fn();}catch(error){message(error.message,true);}finally{button.disabled=false;}}
 $('login-form').onsubmit=event=>{event.preventDefault();task(event.submitter,async()=>{
  const result=await api('login',{password:$('password').value});token=result.token;$('password').value='';$('login').hidden=true;$('panel').hidden=false;activity();message('Maintenance unlocked.');await diagnostics();
 });};
 $('leave').onclick=async()=>{await logout();location.replace('http://127.0.0.1:8080/');};
 $('refresh').onclick=event=>task(event.target,diagnostics);
 $('scan').onclick=event=>task(event.target,async()=>{
  const {data}=await api('wifi/scan');$('networks').replaceChildren();
  for(const network of data){const button=document.createElement('button');button.type='button';button.textContent=`${network.ssid} · ${network.signal}% · ${network.security}`;button.onclick=()=>{$('ssid').value=network.ssid;$('wifi-password').focus();};$('networks').append(button);}
  message(data.length?'Select a network below.':'No networks found. Enable Wi-Fi, check antennas, and scan again.');
 });
 $('enable-wifi').onclick=event=>task(event.target,async()=>{await api('wifi/enable');message('Wi-Fi enabled. Scan again to find networks.');await diagnostics();});
 $('wifi-form').onsubmit=event=>{event.preventDefault();task(event.submitter,async()=>{await api('wifi/connect',{ssid:$('ssid').value,password:$('wifi-password').value});$('wifi-password').value='';message('Connection requested. Wait a moment, then refresh diagnostics to check the result.');await diagnostics();});};
 $('update').onclick=event=>task(event.target,async()=>{await api('update');message('Update started. Refresh diagnostics to see progress. Return to the arcade after it completes.');});
 function confirmation(title,text,fn){$('confirm-title').textContent=title;$('confirm-text').textContent=text;pending=fn;$('confirm-dialog').showModal();$('cancel').focus();}
 $('cancel').onclick=()=>{$('confirm-dialog').close();pending=null;};
 $('confirm').onclick=event=>task(event.target,async()=>{const fn=pending;pending=null;$('confirm-dialog').close();if(fn)await fn();});
 $('rollback').onclick=()=>confirmation('Restore the previous arcade?', 'The last installed game collection will become active. This does not change Wi-Fi settings.',async()=>{await api('rollback',{confirm:'rollback'});message('Restore requested. Refresh diagnostics, then return to the arcade.');});
 for(const [id,action,label] of [['restart','reboot','Restart'],['shutdown','shutdown','Shut down']])$(id).onclick=()=>confirmation(`${label} the Raspberry Pi?`,'All games will stop. Save any maintenance work first.',async()=>{await api(action,{confirm:action});message(action==='shutdown'?'Shutdown requested. Wait until the Pi has finished shutting down before removing power.':'Restart requested. The arcade will return when the Pi finishes booting.');locked();});
 for(const event of ['keydown','pointerdown','pointermove'])window.addEventListener(event,activity,{passive:true});
 window.addEventListener('pagehide',()=>{token=null;});
 setInterval(()=>{if(token&&Date.now()-lastActivity<300000)api('session').catch(error=>message(error.message,true));},60000);
})();
