const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const {chromium}=require('playwright');
const server=require('../server.cjs');

test('MakeCode cold-starts locally, accepts controls, and returns home after a continuous hold', {timeout:45000},async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({...(process.env.ARCADE_BROWSER_CHANNEL?{channel:process.env.ARCADE_BROWSER_CHANNEL}:{}),headless:true});
  const context=await browser.newContext({viewport:{width:1000,height:900},serviceWorkers:'block'});
  const external=[],errors=[];
  await context.route('**/*',route=>{
   if(new URL(route.request().url()).hostname!=='127.0.0.1'){external.push(route.request().url());return route.abort();}
   return route.continue();
  });
  const page=await context.newPage();
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/Games/Chase%20the%20Pizza/`);
  const frame=page.frameLocator('iframe');
  await frame.locator('canvas').waitFor({state:'visible'});
  const sim=page.frames().find(frame=>frame.url().includes('simulator.html'));
  await sim.waitForFunction(()=>!!globalThis.pxsim?.runtime?.globals && Object.keys(pxsim.runtime.globals).some(k=>k.startsWith('mySprite2___')));
  const pizzaX=()=>sim.evaluate(()=>Object.entries(pxsim.runtime.globals).find(([k])=>k.startsWith('mySprite2___'))[1].fields._x);
  const before=await pizzaX();
  await sim.locator('canvas').focus();
  await page.keyboard.down('ArrowRight');await page.waitForTimeout(250);await page.keyboard.up('ArrowRight');
  assert.ok(await pizzaX()>before,'ArrowRight must move the pizza');
  await page.keyboard.down('Space');
  await sim.waitForFunction(()=>Object.entries(pxsim.runtime.globals).find(([k])=>k.startsWith('A___'))[1].fields._pressed);
  await page.keyboard.up('Space');
  await fs.mkdir('test-results',{recursive:true});
  await page.screenshot({path:'test-results/makecode-offline.png'});
  // Three arrows do not trigger an exit, regardless of elapsed time.
  for(const key of ['ArrowLeft','ArrowUp','ArrowDown'])await page.keyboard.down(key);
  await page.waitForTimeout(3100);
  assert.equal(await page.locator('#home').isVisible(),false);
  await page.keyboard.down('ArrowRight');
  await page.locator('#hold').waitFor({state:'visible'});
  await page.waitForTimeout(1000);await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(2200);
  assert.equal(await page.locator('#home').isVisible(),false,'Releasing one arrow cancels the hold');
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(2300);
  assert.equal(await page.locator('#home').isVisible(),false,'Must wait the full three seconds');
  await page.locator('#home').waitFor({state:'visible',timeout:2000});
  assert.equal(await page.locator('iframe').count(),0,'Returning home unloads the game');
  for(const key of ['ArrowLeft','ArrowUp','ArrowDown','ArrowRight'])await page.keyboard.up(key);
  await page.keyboard.press('Space');
  await page.frameLocator('iframe').locator('canvas').waitFor({state:'visible'});
  assert.deepEqual(external,[],'A fresh browser must not request external assets');
  assert.deepEqual(errors,[],'No runtime errors');
  console.log('Cold start, movement, Space/A, hold cancellation, 3-second exit, and replay passed; zero external requests.');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
});
