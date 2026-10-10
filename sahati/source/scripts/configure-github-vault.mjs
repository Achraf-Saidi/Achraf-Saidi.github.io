import {createInterface} from 'node:readline';
import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),esbuild=require(createRequire(require.resolve('drizzle-kit')).resolve('esbuild'));
await esbuild.build({entryPoints:['github/vault.ts'],outfile:'.sites-runtime/vault-config.mjs',bundle:true,format:'esm',platform:'node',logLevel:'silent'});
const {base64,deriveKey,seal,open}=await import('../.sites-runtime/vault-config.mjs');
if(process.stdin.isTTY)process.stdin.setRawMode(true);
const readline=createInterface({input:process.stdin,terminal:false});
console.log('Ready for private vault configuration JSON on stdin (input is hidden).');
for await(const line of readline){
 const input=JSON.parse(line);
 if(!input.password||!input.secondPassword)throw new Error('Both access codes are required.');
 let gateHash=input.gateHash,legacySalt,vaultSalt;
 try{
  const previous=JSON.parse(await readFile('github/vault-bootstrap.json','utf8'));
  const previousConfig=await open(previous,await deriveKey(input.password,previous.salt));
  if(previousConfig.format==='sahati-access-2'){
   gateHash||=(await open(previousConfig.secondary,await deriveKey(input.secondPassword,previousConfig.secondary.salt))).gateHash;
   legacySalt=previousConfig.legacySalt;vaultSalt=previousConfig.vaultSalt;
  }else{gateHash||=previousConfig.gateHash;legacySalt=previous.salt;}
 }catch(error){if(!gateHash)throw new Error('Existing vault configuration could not be verified.');}
 const randomSalt=()=>base64(crypto.getRandomValues(new Uint8Array(16)));
 const salt=randomSalt(),secondSalt=randomSalt();vaultSalt||=randomSalt();legacySalt||=salt;
 const secondary=await seal({gateHash},await deriveKey(input.secondPassword,secondSalt),secondSalt);
 const envelope=await seal({format:'sahati-access-2',secondary,vaultSalt,legacySalt},await deriveKey(input.password,salt),salt);
 await writeFile('github/vault-bootstrap.json',JSON.stringify(envelope)+'\n');
 console.log('Encrypted two-code GitHub vault configuration saved.');readline.close();break;
}
