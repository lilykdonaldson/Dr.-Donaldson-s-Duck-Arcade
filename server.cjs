// Static game/launcher server. Privileged maintenance runs in a separate process.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf','.wav':'audio/wav','.mp3':'audio/mpeg'};
function createStaticServer(options={}){
 const root=path.resolve(options.root||process.env.ARCADE_ROOT||__dirname);
 const gameOrigin=options.gameOrigin||process.env.ARCADE_GAME_ORIGIN;
 const role=options.role||process.env.ARCADE_ROLE||'development';
 return http.createServer(async(req,res)=>{
  const host=req.headers.host;
  // Reject DNS rebinding and cross-origin writes. This service never changes files.
  if(!host||!/^127\.0\.0\.1:\d+$/.test(host)){res.writeHead(403).end();return;}
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
  let name;try{name=decodeURIComponent(new URL(req.url,'http://'+host).pathname);}catch{res.writeHead(400).end();return;}
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','strict-origin');
  if(name==='/api/config'&&role!=='games'){
   let version=null;try{version=JSON.parse(await fs.promises.readFile(path.join(root,'.release.json'),'utf8')).version;}catch{}
   res.setHeader('Content-Type','application/json');res.end(JSON.stringify({gameOrigin:gameOrigin||'http://'+host,maintenanceUrl:process.env.ARCADE_MAINTENANCE_URL||'http://127.0.0.1:8082/',version}));return;
  }
  const pieces=name.split('/');
  if(pieces.some(p=>p.startsWith('.')||p.includes('\\'))){res.writeHead(404).end();return;}
  const publicRootFiles=['index.html','app.js','arcade-input.js','style.css','kiosk.css','games.json'];
  const allowed=publicRootFiles.includes(name.slice(1))||name==='/'||name.startsWith('/assets/')||name.startsWith('/Games/');
  if(!allowed||(role==='games'&&!name.startsWith('/Games/')&&!name.startsWith('/assets/')&&name!=='/arcade-input.js')){res.writeHead(404).end();return;}
  const file=path.resolve(root,'.'+name+(name.endsWith('/')?'index.html':''));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{
   const realRoot=await fs.promises.realpath(root),realFile=await fs.promises.realpath(file);
   if(!realFile.startsWith(realRoot+path.sep)){res.writeHead(403).end();return;}
   const stat=await fs.promises.stat(file);if(!stat.isFile())throw Error('Not a file');
   res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
   const frames=gameOrigin?' '+gameOrigin:'';
   res.setHeader('Content-Security-Policy',`default-src 'self' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self'; frame-src 'self'${frames}; worker-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'`);
   if(role==='launcher'&&name.startsWith('/Games/')&&path.extname(file)!=='.json'){res.writeHead(404).end();return;}
   fs.createReadStream(file).on('error',()=>res.destroy()).pipe(res);
  }catch{res.writeHead(404).end('Not found');}
 });
}
const server=createStaticServer();
if(require.main===module)server.listen(Number(process.env.PORT)||8080,'127.0.0.1',()=>console.log('Duck Arcade: http://127.0.0.1:'+server.address().port+'/'));
module.exports=server;module.exports.createStaticServer=createStaticServer;
