const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises');
const {chromium}=require('playwright');
const {createStaticServer}=require('../server.cjs');
test('Full kiosk navigates and plays all three games without external requests',{timeout:60000},async()=>{
 const gameServer=createStaticServer({role:'games'});
 await new Promise(resolve=>gameServer.listen(0,'127.0.0.1',resolve));
 const gameOrigin='http://127.0.0.1:'+gameServer.address().port;
 const server=createStaticServer({role:'launcher',gameOrigin});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({...(process.env.ARCADE_BROWSER_CHANNEL?{channel:process.env.ARCADE_BROWSER_CHANNEL}:{}),headless:true});
  const context=await browser.newContext({viewport:{width:1280,height:900},serviceWorkers:'block'}),external=[],errors=[],consoleErrors=[];
  await context.route('**/*',route=>{if(new URL(route.request().url()).hostname!=='127.0.0.1'){external.push(route.request().url());return route.abort();}return route.continue();});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.getByRole('button',{name:/PRESS SPACE/}).waitFor();await page.evaluate(()=>document.fonts.ready);
  await fs.mkdir('test-results',{recursive:true});await page.screenshot({path:'test-results/kiosk-opening.png'});
  await page.keyboard.press('Space');await page.locator('.card').first().waitFor();
  assert.equal(await page.locator('.card').count(),3);
  await page.screenshot({path:'test-results/kiosk-menu.png'});
  for(let index=0;index<3;index++){
   if(index)await page.keyboard.press('ArrowRight');
   await page.keyboard.press('Space');await page.getByRole('button',{name:'PLAY GAME ▶',exact:true}).waitFor();
   assert.equal(await page.locator('#play').evaluate(el=>document.activeElement===el),true);
   if(!index){
    await page.screenshot({path:'test-results/kiosk-details.png'});
    await page.keyboard.press('ArrowLeft');await page.keyboard.press('Space');
    await page.locator('.card').first().waitFor();
    await page.keyboard.press('Space');await page.locator('#play').waitFor();
   }
   await page.keyboard.press('Space');
   const canvas=page.frameLocator('iframe').locator('canvas');await canvas.waitFor({state:'visible'});
   const game=page.frames().find(f=>f!==page.mainFrame());
   if(index<2){
    await game.waitForFunction(()=>window.p5Inst?.allSprites?.length>0);
    console.log('Game Lab',index,await game.evaluate(()=>({size:[document.querySelector('canvas').width,document.querySelector('canvas').height],sprites:p5Inst.allSprites.length})));
    await canvas.focus();
    if(index===0){const before=await game.evaluate(()=>p5Inst.allSprites[0].position.x);await page.keyboard.down('ArrowRight');await page.waitForTimeout(150);await page.keyboard.up('ArrowRight');assert.ok(await game.evaluate(()=>p5Inst.allSprites[0].position.x)>before,'Game Lab movement');}
    else{await page.keyboard.down('Space');await page.waitForTimeout(80);assert.ok(await game.evaluate(()=>p5Inst.allSprites[1].velocity.y)<0,'Space makes Dr. D jump');await page.keyboard.up('Space');}
   }else{
    await game.waitForFunction(()=>!!globalThis.pxsim?.runtime?.board);
    const centered=await game.evaluate(()=>{const rect=document.querySelector('canvas').getBoundingClientRect();return Math.abs(rect.left+rect.width/2-innerWidth/2)<1&&Math.abs(rect.top+rect.height/2-innerHeight/2)<1;});
    assert.ok(centered,'MakeCode canvas must be centered in the playable frame');
   }
   await canvas.focus();
   // Make both documents scrollable so browser-default arrow scrolling is observable.
   await page.evaluate(()=>{document.body.style.minHeight='200vh';window.scrollTo(0,0);});
   await game.evaluate(()=>{document.body.style.height='200vh';window.scrollTo(0,0);});
   await page.keyboard.down('ArrowDown');await page.waitForTimeout(200);await page.keyboard.up('ArrowDown');
   assert.equal(await page.evaluate(()=>scrollY),0,'Arrow keys must not scroll the kiosk');
   assert.equal(await game.evaluate(()=>scrollY),0,'Arrow keys must not scroll the game frame');
   await page.evaluate(()=>{document.body.style.minHeight='';});
   await game.evaluate(()=>{document.body.style.height='';});
   await page.waitForTimeout(250);await page.screenshot({path:`test-results/kiosk-game-${index+1}.png`});
   for(const key of ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'])await page.keyboard.down(key);
   await page.locator('#return-progress').waitFor({state:'visible'});
   await page.waitForTimeout(2300);assert.equal(await page.locator('iframe').count(),1,'Three second hold required');
   await page.locator('.card').first().waitFor({timeout:2500});
   for(const key of ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'])await page.keyboard.up(key);
   assert.equal(await page.locator('iframe').count(),0,'Home unloads game');
  }
  console.log('External requests:',external,'Runtime errors:',errors,'Console errors:',consoleErrors);
  assert.deepEqual(external,[]);assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);
  await page.setViewportSize({width:600,height:850});await page.screenshot({path:'test-results/kiosk-narrow.png'});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));await new Promise(resolve=>gameServer.close(resolve));}
});
