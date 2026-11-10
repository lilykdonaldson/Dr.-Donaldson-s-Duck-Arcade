const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {validate}=require('../pi/update.cjs');
test('Release validation accepts the included offline collection',async()=>{await validate(path.resolve(__dirname,'..'));});
test('Release validation refuses incomplete or external games before activation',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'duck-release-'));
 try{
  await fs.mkdir(path.join(root,'assets'));
  for(const file of ['index.html','app.js','arcade-input.js','style.css','kiosk.css','assets/pixel.ttf','assets/jquery-1.12.1.min.js'])await fs.writeFile(path.join(root,file),'');
  const game={id:'one',name:'Test',author:'Test',description:'Test',controls:'Arrows',platform:'Game Lab',src:'https://example.com/game.html'};
  await fs.writeFile(path.join(root,'games.json'),JSON.stringify([game]));await assert.rejects(validate(root),/local/);
  game.src='Games/../../private.html';await fs.writeFile(path.join(root,'games.json'),JSON.stringify([game]));await assert.rejects(validate(root),/local/);
  game.src='Games/Test/index.html';game.platform='MakeCode';await fs.mkdir(path.join(root,'Games/Test'),{recursive:true});await fs.writeFile(path.join(root,game.src),'');await fs.writeFile(path.join(root,'games.json'),JSON.stringify([game]));await assert.rejects(validate(root),/ENOENT/);
  await fs.writeFile(path.join(root,'Games/Test/built.json'),JSON.stringify({js:'',targetVersion:'test'}));await assert.rejects(validate(root),/compiled/);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
