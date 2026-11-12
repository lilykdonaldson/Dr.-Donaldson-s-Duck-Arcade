const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {execFile}=require('node:child_process');
const {promisify}=require('node:util');
const scrypt=promisify(crypto.scrypt);
async function passwordRecord(password){
 const salt=crypto.randomBytes(16).toString('hex');
 return {salt,hash:(await scrypt(password,salt,64)).toString('hex')};
}
async function verify(password,record){
 if(typeof password!=='string'||password.length>256)return false;
 const actual=await scrypt(password,record.salt,64),expected=Buffer.from(record.hash,'hex');
 return actual.length===expected.length&&crypto.timingSafeEqual(actual,expected);
}
function systemAction(action,input={}){
 if(process.platform!=='linux')return Promise.reject(Error('Device actions are available after installation on the Raspberry Pi.'));
 return new Promise((resolve,reject)=>{
  const child=execFile('/usr/bin/sudo',['-n','--','/usr/local/libexec/duck-arcade-control',action],{timeout:30000,maxBuffer:128*1024},(error,stdout)=>{
   let result;try{result=JSON.parse(stdout);}catch{return reject(Error('Device control did not respond. Check its service log from the local administrator login or SSH.'));}
   if(error||!result.ok)reject(Error(result.error||'Device action failed'));else resolve(result.data);
  });
  child.stdin.end(JSON.stringify(input));
 });
}
async function body(req){
 let text='';for await(const chunk of req){text+=chunk;if(text.length>8192)throw Error('Request too large');}
 return JSON.parse(text||'{}');
}
function createAdminServer({record,run=systemAction,now=Date.now,idleMs=300000,uiRoot=__dirname}={}){
 if(!record?.hash||!record?.salt)throw Error('Configure an administrator password first.');
 const sessions=new Map();let failures=0,lockedUntil=0;
 return http.createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'none'; form-action 'self'");
  const reply=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
  const host=req.headers.host;
  if(!host||!/^127\.0\.0\.1:\d+$/.test(host))return reply(403,{error:'Invalid host'});
  const origin='http://'+host;
  let url;try{url=new URL(req.url,origin);}catch{return reply(400,{error:'Invalid URL'});}
  if(!url.pathname.startsWith('/api/')){
   if(req.method!=='GET')return reply(405,{error:'Method not allowed'});
   const files={'/':'index.html','/admin.js':'admin.js','/admin.css':'admin.css'};
   const file=files[url.pathname];if(!file)return reply(404,{error:'Not found'});
   try{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(await fs.readFile(path.join(uiRoot,file)));}catch{return reply(404,{error:'Not found'});}return;
  }
  // Games and websites cannot read or invoke device operations, even on loopback.
  if(req.headers.origin!==origin||req.headers['x-arcade-request']!=='maintenance')return reply(403,{error:'Invalid request origin'});
  if(req.method!=='POST')return reply(405,{error:'Use POST'});
  try{
   const input=await body(req);
   for(const [token,session] of sessions)if(now()-session.last>=idleMs)sessions.delete(token);
   if(url.pathname==='/api/login'){
    if(now()<lockedUntil)return reply(429,{error:'Too many attempts. Wait one minute before trying again.'});
    if(!await verify(input.password,record)){
     if(++failures>=5){lockedUntil=now()+60000;failures=0;}
     return reply(401,{error:'Incorrect administrator password'});
    }
    failures=0;if(sessions.size>=16)sessions.clear();
    const token=crypto.randomBytes(32).toString('hex');sessions.set(token,{last:now()});
    return reply(200,{token,idleMs});
   }
   const token=(req.headers.authorization||'').replace(/^Bearer /,'');
   const session=sessions.get(token);if(!session)return reply(401,{error:'Maintenance locked. Sign in again.'});
   session.last=now();
   if(url.pathname==='/api/logout'){sessions.delete(token);return reply(200,{ok:true});}
   if(url.pathname==='/api/session')return reply(200,{ok:true});
   const actions={'/api/status':'status','/api/wifi/scan':'scan','/api/wifi/connect':'connect','/api/wifi/enable':'enable-wifi','/api/update':'update','/api/rollback':'rollback','/api/reboot':'reboot','/api/shutdown':'shutdown','/api/recovery':'recovery'};
   const action=actions[url.pathname];if(!action)return reply(404,{error:'Not found'});
   if(['reboot','shutdown','rollback','recovery'].includes(action)&&input.confirm!==action)return reply(400,{error:'Action must be confirmed'});
   const data=await run(action,input);
   if(action==='recovery')sessions.delete(token);
   return reply(200,{ok:true,data});
  }catch(error){return reply(400,{error:error.message});}
 });
}
if(require.main===module){
 (async()=>{
  const record=JSON.parse(await fs.readFile(process.env.ARCADE_PASSWORD_FILE||'/etc/duck-arcade/admin.json','utf8'));
  const server=createAdminServer({record});
  server.listen(Number(process.env.ARCADE_ADMIN_PORT)||8082,'127.0.0.1',()=>console.log('Maintenance: http://127.0.0.1:'+server.address().port+'/'));
 })().catch(error=>{console.error(error.message);process.exitCode=1;});
}
module.exports={createAdminServer,passwordRecord,verify};
