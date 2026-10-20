import fs from 'node:fs/promises';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {buildArchitecture} from '../src/architecture.js';
globalThis.FileReader=class FileReader{readAsArrayBuffer(blob){blob.arrayBuffer().then(x=>{this.result=x;this.onload?.({target:this});this.onloadend?.({target:this});});}readAsDataURL(blob){blob.arrayBuffer().then(x=>{this.result='data:'+blob.type+';base64,'+Buffer.from(x).toString('base64');this.onload?.({target:this});this.onloadend?.({target:this});});}};
const {root}=buildArchitecture();
const result=await new GLTFExporter().parseAsync(root,{binary:true,onlyVisible:true});
const filename=process.argv[2]??'Pedro.glb';await fs.writeFile(filename,Buffer.from(result));console.log(JSON.stringify({file:filename,bytes:result.byteLength}));
