const fs=require('node:fs/promises'),path=require('node:path');
const {passwordRecord}=require('../maintenance/server.cjs');
async function prompt(label){
 if(!process.stdin.isTTY)throw Error('Use an interactive terminal to set the password.');
 process.stdout.write(label);process.stdin.setRawMode(true);process.stdin.resume();
 return new Promise((resolve,reject)=>{let text='';function input(chunk){for(const char of chunk.toString()){
  if(char==='\u0003'){finish();reject(Error('Cancelled'));return;}
  if(char==='\r'||char==='\n'){finish();resolve(text);return;}
  if(char==='\u007f'||char==='\b')text=text.slice(0,-1);else if(char>=' '&&text.length<256)text+=char;
 }}function finish(){process.stdin.off('data',input);process.stdin.setRawMode(false);process.stdin.pause();process.stdout.write('\n');}process.stdin.on('data',input);});
}
(async()=>{
 const target=path.resolve(process.argv[2]||'.local-admin.json');
 const password=await prompt('New maintenance password (12+ characters): ');
 if(password.length<12)throw Error('Use at least 12 characters.');
 if(password!==await prompt('Confirm maintenance password: '))throw Error('Passwords did not match.');
 await fs.writeFile(target,JSON.stringify(await passwordRecord(password))+'\n',{mode:0o600});
 console.log('Password hash saved. The password is not stored in the repository.');
})().catch(error=>{console.error(error.message);process.exitCode=1;});
