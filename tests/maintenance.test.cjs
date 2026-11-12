const test=require('node:test'),assert=require('node:assert/strict');
const {createAdminServer,passwordRecord}=require('../maintenance/server.cjs');
const {createStaticServer}=require('../server.cjs');
const {chromium}=require('playwright');
const fs=require('node:fs/promises');
async function start(server){await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));return 'http://127.0.0.1:'+server.address().port;}
async function close(server){await new Promise(resolve=>server.close(resolve));}
test('Maintenance requires password, same-origin requests, a live token, and power confirmation',async()=>{
 let clock=100000;const actions=[];
 const server=createAdminServer({record:await passwordRecord('test-password-123'),now:()=>clock,run:async(action,input)=>{actions.push({action,input});return {message:'test only'};}});
 const url=await start(server);
 const post=(route,data={},extra={})=>fetch(url+'/api/'+route,{method:'POST',headers:{Origin:url,'Content-Type':'application/json','X-Arcade-Request':'maintenance',...extra},body:JSON.stringify(data)});
 try{
  assert.equal((await fetch(url+'/server.cjs')).status,404);
  assert.equal((await post('status')).status,401);
  assert.equal((await post('login',{password:'test-password-123'},{Origin:'http://127.0.0.1:8081'})).status,403);
  assert.equal((await post('login',{password:'wrong'})).status,401);
  const login=await (await post('login',{password:'test-password-123'})).json();assert.ok(login.token);
  const headers={Authorization:'Bearer '+login.token};
  assert.equal((await post('reboot',{},headers)).status,400);assert.equal(actions.length,0);
  assert.equal((await post('reboot',{confirm:'reboot'},headers)).status,200);assert.equal(actions[0].action,'reboot');
  assert.equal((await post('wifi/connect',{ssid:'Classroom',password:'test-wifi'},headers)).status,200);
  clock+=300001;assert.equal((await post('update',{},headers)).status,401);
  for(let i=0;i<5;i++)await post('login',{password:'wrong'});
  assert.equal((await post('login',{password:'test-password-123'})).status,429);
  clock+=60001;const newLogin=await (await post('login',{password:'test-password-123'})).json();
  const newHeaders={Authorization:'Bearer '+newLogin.token};
  await post('logout',{},newHeaders);assert.equal((await post('status',{},newHeaders)).status,401);
 }finally{await close(server);}
});
test('Local recovery and shutdown are unavailable before login and require confirmation',async()=>{
 const actions=[];const server=createAdminServer({record:await passwordRecord('test-password-123'),run:async(action)=>{actions.push(action);return {};}});
 const url=await start(server);
 const post=(route,data={},token)=>fetch(url+'/api/'+route,{method:'POST',headers:{Origin:url,'Content-Type':'application/json','X-Arcade-Request':'maintenance',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(data)});
 try{
  for(const route of ['recovery','shutdown'])assert.equal((await post(route,{confirm:route})).status,401);
  const {token}=await (await post('login',{password:'test-password-123'})).json();
  for(const route of ['recovery','shutdown'])assert.equal((await post(route,{},token)).status,400);
  assert.deepEqual(actions,[]);
  assert.equal((await post('shutdown',{confirm:'shutdown'},token)).status,200);
  assert.equal((await post('recovery',{confirm:'recovery'},token)).status,200);
  assert.deepEqual(actions,['shutdown','recovery']);
  assert.equal((await post('status',{},token)).status,401,'Entering local recovery revokes the maintenance token');
 }finally{await close(server);}
});

test('Production game origin is isolated and private repository files are not served',{timeout:45000},async()=>{
 const games=createStaticServer({role:'games'});const gameOrigin=await start(games);
 const main=createStaticServer({role:'launcher',gameOrigin});const url=await start(main);let browser;
 try{
  for(const file of ['/.git/config','/maintenance/server.cjs','/pi/install.sh','/scripts/set-admin-password.cjs','/.local-admin.json','/package.json'])assert.equal((await fetch(url+file)).status,404,file);
  assert.equal((await fetch(gameOrigin+'/index.html')).status,404);
  browser=await chromium.launch({...(process.env.ARCADE_BROWSER_CHANNEL?{channel:process.env.ARCADE_BROWSER_CHANNEL}:{}),headless:true});
  const page=await browser.newPage();await page.goto(url);await page.getByRole('button',{name:/PRESS SPACE/}).waitFor();
  await page.keyboard.press('Space');await page.keyboard.press('Space');await page.locator('#play').waitFor();await page.keyboard.press('Space');
  const game=page.frameLocator('iframe');await game.locator('canvas').waitFor({state:'visible'});
  const frame=page.frames().find(f=>f.url().startsWith(gameOrigin));
  assert.equal(await frame.evaluate(()=>{try{return !!parent.document;}catch{return false;}}),false,'Student code cannot read kiosk DOM');
  await game.locator('canvas').focus();
  for(const key of ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'])await page.keyboard.down(key);
  await page.locator('.card').first().waitFor({timeout:5000});
  for(const key of ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'])await page.keyboard.up(key);
  await page.keyboard.press('Space');await page.locator('#play').waitFor();await page.keyboard.press('Space');await game.locator('canvas').waitFor({state:'visible'});await game.locator('canvas').focus();
  // Verify the maintenance chord is forwarded out of the isolated game frame.
  await page.route('http://127.0.0.1:8082/**',route=>route.fulfill({contentType:'text/html',body:'<h1>Maintenance login</h1>'}));
  await page.keyboard.press('Control+Alt+m');await page.getByRole('heading',{name:'Maintenance login'}).waitFor();
 }finally{if(browser)await browser.close();await close(main);await close(games);}
});
test('Maintenance panel login, network selection and power confirmation use authenticated APIs',{timeout:30000},async()=>{
 const actions=[];const server=createAdminServer({record:await passwordRecord('test-password-123'),run:async(action,input)=>{
  actions.push({action,input});if(action==='scan')return [{ssid:'Classroom Wi-Fi',signal:90,security:'secured'}];
  if(action==='status')return {hostname:'duck-arcade',uptime:'2h',version:'test-version',wifiEnabled:true,connection:'Classroom',addresses:['192.168.1.20'],dns:true,internet:true,update:{message:'Ready'}};
  return {message:'Test action accepted'};
 }});const url=await start(server);let browser;
 try{
  browser=await chromium.launch({...(process.env.ARCADE_BROWSER_CHANNEL?{channel:process.env.ARCADE_BROWSER_CHANNEL}:{}),headless:true});const page=await browser.newPage({viewport:{width:1100,height:1100}});
  await page.goto(url);await page.locator('#password').fill('test-password-123');await page.getByRole('button',{name:'Unlock maintenance'}).click();
  await page.getByText('Device: duck-arcade',{exact:false}).waitFor();
  await page.locator('#scan').click();await page.getByRole('button',{name:/Classroom Wi-Fi/}).click();assert.equal(await page.locator('#ssid').inputValue(),'Classroom Wi-Fi');
  await page.locator('#wifi-password').fill('wifi-test-password');await page.getByRole('button',{name:'Connect to network',exact:true}).click();
  await page.getByText('Connection requested.',{exact:false}).waitFor();
  await fs.mkdir('test-results',{recursive:true});await page.screenshot({path:'test-results/maintenance-panel.png',fullPage:true});
  await page.locator('#restart').click();await page.locator('#cancel').click();assert.equal(actions.filter(a=>a.action==='reboot').length,0);
  await page.locator('#restart').click();await page.locator('#confirm').click();await page.getByText('Restart requested.',{exact:false}).waitFor();
  assert.equal(actions.filter(a=>a.action==='reboot').length,1);
  async function unlock(){await page.locator('#password').fill('test-password-123');await page.getByRole('button',{name:'Unlock maintenance'}).click();await page.locator('#panel').waitFor({state:'visible'});}
  await unlock();await page.locator('#shutdown').click();await page.locator('#cancel').click();assert.equal(actions.filter(a=>a.action==='shutdown').length,0);
  await page.locator('#shutdown').click();await page.locator('#confirm').click();await page.getByText('Shutdown requested.',{exact:false}).waitFor();assert.equal(actions.filter(a=>a.action==='shutdown').length,1);
  await unlock();await page.locator('#recovery').click();await page.locator('#cancel').click();assert.equal(actions.filter(a=>a.action==='recovery').length,0);
  await page.locator('#recovery').click();await page.locator('#confirm').click();await page.getByText('Opening the local administrator login.',{exact:false}).waitFor();assert.equal(actions.filter(a=>a.action==='recovery').length,1);assert.equal(await page.locator('#login').isVisible(),true);
 }finally{if(browser)await browser.close();await close(server);}
});
