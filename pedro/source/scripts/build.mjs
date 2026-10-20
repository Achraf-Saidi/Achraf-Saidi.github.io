import fs from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
const root=process.cwd();
const refs=[['maquette-face.jpg','Maquette, vue de face'],['maquette-profil.jpg','Maquette, vue latérale et ouvertures'],['maquette-balcon.jpg','Maquette, balcon et personnages'],['implantation.jpg','Implantation sur la maquette du site'],['parc-chemin.jpg','Parc, chemin et grand arbre'],['parc-large.jpg','Parc, vue large']];
const photos=[];for(const [f,alt]of refs){photos.push({alt,src:'source/references/'+f});}
await fs.writeFile(path.join(root,'src/references.js'),'const embedded=document.getElementById("photo-data");export const photos=embedded?JSON.parse(embedded.textContent):'+JSON.stringify(photos)+';\n');
const result=await build({entryPoints:['src/app.js'],bundle:true,write:false,format:'iife',target:['es2020'],minify:true,legalComments:'none'});
const css=await fs.readFile('src/style.css','utf8');const template=await fs.readFile('src/index.html','utf8');
const script=result.outputFiles[0].text.replaceAll('</script','<\\/script');
const html=template.replace('__STYLE__',()=>css).replace('__SCRIPT__',()=>script);
await fs.mkdir('dist/source/references',{recursive:true});for(const [f]of refs)await fs.copyFile(path.join('references',f),path.join('dist/source/references',f));await fs.writeFile('dist/index.html',html);
console.log(JSON.stringify({file:'dist/index.html',bytes:Buffer.byteLength(html),galleryPhotos:photos.length,externalRuntimeDependencies:0}));

