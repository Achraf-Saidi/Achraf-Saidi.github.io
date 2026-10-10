import {createInterface} from 'node:readline';
import {writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),esbuild=require(createRequire(require.resolve('drizzle-kit')).resolve('esbuild'));
await esbuild.build({entryPoints:['github/vault.ts'],outfile:'.sites-runtime/vault-config.mjs',bundle:true,format:'esm',platform:'node',logLevel:'silent'});
const {base64,deriveKey,seal}=await import('../.sites-runtime/vault-config.mjs');
if(process.stdin.isTTY)process.stdin.setRawMode(true);
const readline=createInterface({input:process.stdin,terminal:false});
console.log('Ready for private vault configuration JSON on stdin (input is hidden).');
for await(const line of readline){const input=JSON.parse(line);const salt=base64(crypto.getRandomValues(new Uint8Array(16))),key=await deriveKey(input.password,salt),envelope=await seal({gateHash:input.gateHash},key,salt);await writeFile('github/vault-bootstrap.json',JSON.stringify(envelope)+'\n');console.log('Encrypted GitHub vault configuration saved.');readline.close();break;}
