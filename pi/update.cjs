// Runs as duckupdate, never as root. Promotes only validated, complete releases.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {execFile}=require('node:child_process'),{promisify}=require('node:util');
const exec=promisify(execFile);
const configPath=process.env.ARCADE_DEVICE_CONFIG||'/etc/duck-arcade/device.json';
async function validate(root){
 const games=JSON.parse(await fs.readFile(path.join(root,'games.json'),'utf8'));
 if(!Array.isArray(games)||!games.length)throw Error('Release has no games');
 for(const file of ['index.html','app.js','arcade-input.js','style.css','kiosk.css','assets/pixel.ttf','assets/jquery-1.12.1.min.js'])await fs.access(path.join(root,file));
 for(const file of ['app.js','arcade-input.js'])await exec(process.execPath,['--check',path.join(root,file)]);
 const ids=new Set();
 for(const game of games){
  if(!game.id||ids.has(game.id))throw Error('Game IDs must be unique');ids.add(game.id);
  for(const key of ['name','description','author','controls'])if(typeof game[key]!=='string'||!game[key])throw Error('Missing game information');
  if(!['Game Lab','MakeCode'].includes(game.platform))throw Error('Unknown game platform');
  if(typeof game.src!=='string'||!game.src.startsWith('Games/')||game.src.includes('\\')||game.src.split('/').includes('..'))throw Error('Game paths must be local');
  const target=path.join(root,game.src);await fs.access(target);
  if(game.platform==='MakeCode'){
   const folder=path.dirname(target),built=JSON.parse(await fs.readFile(path.join(folder,'built.json'),'utf8'));
   if(!built.js||!built.targetVersion)throw Error('MakeCode must be compiled before deployment');
   await fs.access(path.join(folder,'runtime/simulator.html'));await fs.access(path.join(folder,'runtime-layout.css'));
  }
 }
}
async function atomicLink(target,link){
 const temp=link+'.'+crypto.randomBytes(6).toString('hex');await fs.symlink(target,temp);await fs.rename(temp,link);
}
async function deploy(config,action){
 const base=config.installRoot||'/opt/duck-arcade';
 const state=config.stateRoot||'/var/lib/duck-arcade/update-state';
 const repo=config.repoPath||'/var/lib/duck-arcade/repo';
 const current=path.join(base,'current'),previous=path.join(base,'previous');
 const report=async data=>{const temp=path.join(state,'status.tmp');await fs.writeFile(temp,JSON.stringify({...data,time:new Date().toISOString()}));await fs.rename(temp,path.join(state,'status.json'));};
 const git=async args=>(await exec('/usr/bin/git',['-C',repo,...args],{timeout:120000,maxBuffer:1024*1024,env:{...process.env,GIT_TERMINAL_PROMPT:'0'}})).stdout.trim();
 await fs.mkdir(state,{recursive:true});
 // Atomic mkdir is the lock; a finally block releases it on ordinary failures.
 const lock=path.join(state,'lock');try{await fs.mkdir(lock);}catch{throw Error('Another update is running. If the Pi lost power during an update, remove the stale lock over SSH after checking services.');}
 try{
  await report({message:action==='rollback'?'Restoring previous release…':'Downloading update…',running:true});
  if(action==='rollback'){
   const target=await fs.realpath(previous);await validate(target);
   const old=await fs.realpath(current);await atomicLink(target,current);await atomicLink(old,previous);
   const release=JSON.parse(await fs.readFile(path.join(target,'.release.json'),'utf8'));await report({message:'Previous release restored.',version:release.version,running:false});return;
  }
  if(action!=='update')throw Error('Unknown deployment action');
  const remote=await git(['remote','get-url','origin']);if(remote!==config.repository)throw Error('Repository URL differs from the installed configuration');
  if(!/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(config.branch)||config.branch.includes('..'))throw Error('Invalid configured branch');
  const changes=await git(['status','--porcelain']);if(changes)throw Error('The update checkout contains local changes. Resolve them over SSH first.');
  await git(['fetch','--no-tags','origin',config.branch]);
  const commit=await git(['rev-parse','FETCH_HEAD']);if(!/^[a-f0-9]{40,64}$/.test(commit))throw Error('Unexpected commit ID');
  let old=null;try{old=await fs.realpath(current);}catch{}
  if(old){
   const installed=JSON.parse(await fs.readFile(path.join(old,'.release.json'),'utf8'));
   if(installed.version===commit){await report({message:'Already running the latest version.',version:commit,running:false});return;}
   // Equivalent to a fast-forward-only pull; refuse rewritten history.
   await git(['merge-base','--is-ancestor',installed.version,commit]);
  }
  const release=path.join(base,'releases',commit+'-'+Date.now());await fs.mkdir(release,{recursive:true});
  const archive=path.join(state,'release.tar');await git(['archive','--format=tar','-o',archive,commit]);
  await exec('/usr/bin/tar',['-xf',archive,'-C',release],{timeout:60000});await fs.unlink(archive);
  // No symlinks from a repository release may point outside the public tree.
  async function noLinks(folder){for(const entry of await fs.readdir(folder,{withFileTypes:true})){if(entry.isSymbolicLink())throw Error('Repository releases may not contain symbolic links');if(entry.isDirectory())await noLinks(path.join(folder,entry.name));}}
  await noLinks(release);await validate(release);
  await fs.writeFile(path.join(release,'.release.json'),JSON.stringify({version:commit,installedAt:new Date().toISOString()}));
  // Fast-forward the dedicated checkout without discarding local edits.
  await git(['merge','--ff-only','--no-edit',commit]);
  if(old)await atomicLink(old,previous);
  await atomicLink(release,current);
  await report({message:'Update complete. Return to the arcade to load it.',version:commit,running:false});
 }catch(error){await report({message:'Update failed: '+(error.stderr?'Git or extraction command failed; inspect the update service log over SSH.':error.message),running:false});throw error;}
 finally{await fs.rmdir(lock);}
}
if(require.main===module)(async()=>{const config=JSON.parse(await fs.readFile(configPath,'utf8'));await deploy(config,process.argv[2]||'update');})().catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={validate,deploy,atomicLink};
