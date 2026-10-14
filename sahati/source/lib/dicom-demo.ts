// Deliberately bounded decoder for our own uncompressed 8-bit Secondary Capture fixture.
// This does not accept arbitrary clinical files or implement a PACS/DICOMweb client.
export function decodeDemoDicom(bytes:Uint8Array){
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),text=new TextDecoder();
 if(text.decode(bytes.subarray(128,132))!=='DICM')throw new Error('Fichier DICOM de démonstration invalide.');
 let offset=132,rows=0,columns=0,bits=0,transferSyntax='',studyUID='',seriesUID='',patientID='',pixels:Uint8Array|undefined;
 while(offset+8<=bytes.length){
  const group=view.getUint16(offset,true),element=view.getUint16(offset+2,true),vr=text.decode(bytes.subarray(offset+4,offset+6));
  const long=['OB','OD','OF','OL','OV','OW','SQ','UC','UN','UR','UT'].includes(vr),length=long?view.getUint32(offset+8,true):view.getUint16(offset+6,true),start=offset+(long?12:8);
  if(length===0xffffffff||start+length>bytes.length)throw new Error('Encodage hors du scénario pris en charge.');
  const value=text.decode(bytes.subarray(start,start+length)).replace(/[\0 ]+$/,'');
  if(group===2&&element===0x10)transferSyntax=value;
  if(group===0x10&&element===0x20)patientID=value;
  if(group===0x20&&element===0x0d)studyUID=value;
  if(group===0x20&&element===0x0e)seriesUID=value;
  if(group===0x28&&element===0x10)rows=view.getUint16(start,true);
  if(group===0x28&&element===0x11)columns=view.getUint16(start,true);
  if(group===0x28&&element===0x100)bits=view.getUint16(start,true);
  if(group===0x7fe0&&element===0x10)pixels=bytes.subarray(start,start+length);
  offset=start+length;
 }
 if(transferSyntax!=='1.2.840.10008.1.2.1'||bits!==8||rows!==128||columns!==128||!pixels||pixels.length!==rows*columns||patientID!=='DEMO-p1')throw new Error('Seul le fantôme synthétique SAHATI est pris en charge.');
 return {rows,columns,pixels,studyUID,seriesUID,patientID,transferSyntax};
}
export const demoStudyUID='2.25.300100100100100100100100100100100100';
