// Setup-time tool. The finished game needs only a local web server and browser.
// PNG decoding follows Microsoft's MIT-licensed pxtlib/util.ts decodeBlobAsync:
// https://github.com/microsoft/pxt/blob/master/pxtlib/util.ts
const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const {PNG}=require('pngjs');
const lzma=require('lzma');
const {chromium}=require('playwright');

function unpackImage(buffer){
 const image=PNG.sync.read(buffer),d=image.data;
 const bpp=(d[0]&1)|((d[1]&1)<<1)|((d[2]&1)<<2);
 if(bpp<1||bpp>5)throw Error('Not a MakeCode project PNG');
 let ptr=4;
 function decode(n,b=bpp){
  const a=Buffer.alloc(n);let shift=0,i=0,acc=0;
  while(i<n){if(ptr>=d.length)throw Error('Truncated project PNG');acc|=(d[ptr++]&((1<<b)-1))<<shift;if((ptr&3)===3)ptr++;shift+=b;if(shift>=8){a[i++]=acc&255;acc>>=8;shift-=8;}}
  return a;
 }
 const header=decode(36);
 if(header.readUInt32LE(0)!==0x59347a7d)throw Error('Invalid MakeCode PNG header');
 const size=header.readUInt32LE(4),lines=header.readUInt32LE(8);
 if(size>32*1024*1024)throw Error('Project exceeds 32 MB limit');
 let bytes;
 if(lines){
  const originalPixels=(image.height-lines)*image.width;
  const firstSize=(((originalPixels-1)*3*bpp)>>3)-36;
  if(firstSize<0||firstSize>size)throw Error('Invalid PNG payload length');
  const first=decode(firstSize);ptr=originalPixels*4;
  bytes=Buffer.concat([first,decode(size-firstSize,8)]);
 }else bytes=decode(size);
 return new Promise((resolve,reject)=>lzma.decompress(bytes,(text,error)=>{
  if(error)return reject(error);
  try{resolve(JSON.parse(text));}catch(error){reject(error);}
 }));
}

async function packageRuntime(out,simulatorUrl){
 const records=[],seen=new Map();
 await fs.mkdir(path.join(out,'runtime'),{recursive:true});
 async function asset(url){
  if(seen.has(url))return seen.get(url);
  const name=crypto.createHash('sha256').update(url).digest('hex').slice(0,12)+'-'+new URL(url).pathname.split('/').pop();
  seen.set(url,name);
  const response=await fetch(url);if(!response.ok)throw Error(`${response.status}: ${url}`);
  let bytes=Buffer.from(await response.arrayBuffer());
  if(name.endsWith('.css')){
   let text=bytes.toString();
   for(const m of [...text.matchAll(/url\(['"]?([^'"\)]+)['"]?\)/g)]){
    if(/^(data:|#)/.test(m[1]))continue;
    text=text.replaceAll(m[0],`url('${await asset(new URL(m[1],url).href)}')`);
   }
   bytes=Buffer.from(text);
  }
  await fs.writeFile(path.join(out,'runtime',name),bytes);
  records.push({url,file:'runtime/'+name,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length});
  return name;
 }
 const response=await fetch(simulatorUrl);if(!response.ok)throw Error('Cannot download simulator');
 let html=(await response.text()).replace(/ manifest="[^"]*"/,'');
 for(const m of [...html.matchAll(/(?:src|href)="(https:[^"]+)"/g)])html=html.replaceAll(m[1],await asset(m[1]));
 html=html.replace('</head>','<script src="../controls.js"></script><link rel="stylesheet" href="../runtime-layout.css"></head>');
 await fs.writeFile(path.join(out,'runtime','simulator.html'),html);
 for(const [name,repo] of [['PXT-LICENSE.txt','pxt'],['ARCADE-LICENSE.txt','pxt-arcade'],['COMMON-PACKAGES-LICENSE.txt','pxt-common-packages']]){
  const response=await fetch(`https://raw.githubusercontent.com/microsoft/${repo}/master/LICENSE`);
  if(!response.ok)throw Error('Cannot download runtime license');
  await fs.writeFile(path.join(out,'runtime',name),await response.text());
 }
 await fs.writeFile(path.join(out,'runtime','manifest.json'),JSON.stringify({downloadedAt:new Date().toISOString(),simulatorSource:simulatorUrl,files:records},null,2));
}

async function main(){
 const input=process.argv[2];
 if(!input)throw Error('Usage: npm run prepare:makecode -- "path/to/project.png"');
 const out=path.resolve(__dirname,'../Games/Chase the Pizza');
 const png=await fs.readFile(input),project=await unpackImage(png),files=JSON.parse(project.source);
 if(project.meta.cloudId!=='pxt/arcade')throw Error('This must be a MakeCode Arcade project');
 await fs.mkdir(path.join(out,'source'),{recursive:true});
 await fs.writeFile(path.join(out,'source','project.png'),png);
 await fs.writeFile(path.join(out,'source','project.json'),JSON.stringify(project,null,2));
 for(const [name,content] of Object.entries(files)){
  if(name.includes('/')||name.includes('\\')||name==='.'||name==='..')throw Error('Unexpected project filename');
  await fs.writeFile(path.join(out,'source',name),content);
 }
 console.log('Decoded:',project.meta.name);
 const browser=await chromium.launch({...(process.env.ARCADE_BROWSER_CHANNEL?{channel:process.env.ARCADE_BROWSER_CHANNEL}:{}),headless:true});
 let compiled;
 try{
  const page=await browser.newPage();
  page.setDefaultTimeout(120000);
  await page.goto('https://arcade.makecode.com/--run?server=1',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>typeof ksRunnerReady==='function');
  compiled=await page.evaluate(async files=>{
   await new Promise(resolve=>ksRunnerReady(resolve));
   const deps=JSON.parse(files['pxt.json']).dependencies;
   const built=await pxt.runner.simulateAsync(document.getElementById('simulators'),{code:files['main.ts'],assets:JSON.stringify(files),dependencies:Object.entries(deps).map(([key,value])=>`${key}=${value}`),single:true});
   return {built,simulatorUrl:pxt.webConfig.simUrl};
  },files);
  if(!compiled.built?.js)throw Error('MakeCode did not return compiled game code');
 }finally{await browser.close();}
 await fs.writeFile(path.join(out,'built.json'),JSON.stringify(compiled.built));
 await packageRuntime(out,compiled.simulatorUrl);
 console.log('Saved compiled game and local runtime. Run npm test to verify offline playback.');
}
if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={unpackImage,packageRuntime};
