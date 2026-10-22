import type {Account,Entity} from './model';
import {today} from './model';
import {randomToken,sha} from './crypto';
import {UserError,textField,dateField} from './validation';

export const inventorySchema = [
 `CREATE TABLE IF NOT EXISTS sahati_products(id TEXT PRIMARY KEY,hospital_id TEXT NOT NULL,sku TEXT NOT NULL,data TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1,UNIQUE(hospital_id,sku))`,
 `CREATE TABLE IF NOT EXISTS sahati_stock_movements(id TEXT PRIMARY KEY,hospital_id TEXT NOT NULL,lot_id TEXT NOT NULL,product_id TEXT NOT NULL,type TEXT NOT NULL,delta INTEGER NOT NULL,balance INTEGER NOT NULL,reference TEXT NOT NULL,reason TEXT NOT NULL,actor_id TEXT NOT NULL,actor_name TEXT NOT NULL,created_at TEXT NOT NULL)`,
 `CREATE INDEX IF NOT EXISTS stock_movement_lot ON sahati_stock_movements(lot_id,created_at)`,
 `CREATE TABLE IF NOT EXISTS sahati_purchases(id TEXT PRIMARY KEY,hospital_id TEXT NOT NULL,data TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1)`,
 `CREATE TABLE IF NOT EXISTS sahati_inventory_operations(id TEXT PRIMARY KEY,hospital_id TEXT NOT NULL,actor_id TEXT NOT NULL,result TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS sahati_inventory_guard(id TEXT PRIMARY KEY,valid INTEGER NOT NULL CHECK(valid=1))`
];
const norm=(s:string)=>s.trim().normalize('NFC').toLocaleLowerCase();
export function integer(v:any,label:string,min=0,max=1000000){if(typeof v!=='number'||!Number.isSafeInteger(v)||v<min||v>max)throw new UserError(label+' : nombre entier requis.');return v;}
function money(v:any){if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>10000000)throw new UserError('Prix unitaire invalide.');return Math.round(v*100)/100;}
function mustWrite(a:Account){if(!['pharmacy','logistics'].includes(a.role))throw new UserError('Pharmacie ou logistique requise.',403);}
export function usableLot(l:Entity,date=today()){return l.kind==='stock'&&(!l.status||l.status==='active')&&l.expiry>=date&&l.quantity>0;}
export function matchesMedication(l:Entity,m:any){return (m.productId?l.productId===m.productId:norm(l.title)===norm(m.name))&&(!m.unit||norm(l.unit)===norm(m.unit));}

export async function normalizeStock(db:D1Database,e:Entity){
 if(!e.productId){e.productId='prd-'+(await sha(e.hospitalId+':'+norm(e.title))).slice(0,20);}
 const p={id:e.productId,hospitalId:e.hospitalId,sku:'LEG-'+e.productId.slice(-8).toUpperCase(),title:e.title,dci:'',presentation:'',strength:'',unit:e.unit||'unités',category:e.category||'supply',minLevel:e.threshold||0,targetLevel:Math.max((e.threshold||0)*3,100),unitPrice:e.unitPrice||0,supplier:e.supplier||'',storage:'',barcode:'',version:1};
 await db.prepare('INSERT OR IGNORE INTO sahati_products(id,hospital_id,sku,data,version) VALUES(?,?,?,?,1)').bind(p.id,p.hospitalId,p.sku,JSON.stringify(p)).run();
 e.location=e.location||'Pharmacie centrale';e.status=e.status||'active';return e;
}
export function movementStmt(db:D1Database,a:Account,e:Entity,type:string,delta:number,balance:number,reference:string,reason:string,now=new Date().toISOString(),id=randomToken()){
 return db.prepare('INSERT INTO sahati_stock_movements(id,hospital_id,lot_id,product_id,type,delta,balance,reference,reason,actor_id,actor_name,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,e.hospitalId,e.id,e.productId||'',type,delta,balance,reference,reason,a.id,a.name,now);
}
export async function ensureInventory(db:D1Database){
 await db.batch(inventorySchema.map(s=>db.prepare(s)));
 const rows=(await db.prepare("SELECT data,quantity,version FROM sahati_records WHERE kind='stock'").all<any>()).results;
 for(const row of rows){const e={...JSON.parse(row.data),quantity:row.quantity,version:row.version} as Entity;if(e.productId)continue;await normalizeStock(db,e);
  await db.batch([db.prepare('UPDATE sahati_records SET data=? WHERE id=? AND version=?').bind(JSON.stringify(e),e.id,e.version),movementStmt(db,{id:'seed-demo',name:'Reprise du stock existant'} as Account,e,'opening',e.quantity,e.quantity,'Migration inventaire','Solde de départ ; historique antérieur non reconstitué',undefined,'opening-'+e.id)]);
 }
}
async function lotsFor(db:D1Database,h:string){const query=db.prepare("SELECT data,quantity,version FROM sahati_records WHERE kind='stock'"+(h==='all'?'':' AND hospital_id=?'));return (await (h==='all'?query:query.bind(h)).all<any>()).results.map(r=>({...JSON.parse(r.data),quantity:r.quantity,version:r.version} as Entity));}
async function productsFor(db:D1Database,h:string){const query=db.prepare('SELECT data,version FROM sahati_products'+(h==='all'?'':' WHERE hospital_id=?'));return (await (h==='all'?query:query.bind(h)).all<any>()).results.map(r=>({...JSON.parse(r.data),version:r.version}));}
export async function medicationCatalog(db:D1Database,a:Account){
 if(!['doctor','resident','pharmacy','logistics','director','admin'].includes(a.role))throw new UserError('Catalogue non autorisé.',403);
 const products=await productsFor(db,a.hospitalId),lots=await lotsFor(db,a.hospitalId);
 return {products:products.filter(p=>p.category==='medication').map(p=>({id:p.id,title:p.title,dci:p.dci,presentation:p.presentation,strength:p.strength,unit:p.unit,available:lots.filter(l=>l.productId===p.id&&usableLot(l)).reduce((s,l)=>s+l.quantity,0)}))};
}
export async function inventorySnapshot(db:D1Database,a:Account,hospital?:string|null){
 if(!['pharmacy','logistics','director','admin'].includes(a.role))throw new UserError('Inventaire non autorisé.',403);
 const h=['admin','director'].includes(a.role)?hospital&&hospital!=='all'?hospital:'all':a.hospitalId;
 const lots=await lotsFor(db,h),products=await productsFor(db,h),orders=(await (h==='all'?db.prepare('SELECT data,version FROM sahati_purchases ORDER BY rowid DESC'):db.prepare('SELECT data,version FROM sahati_purchases WHERE hospital_id=? ORDER BY rowid DESC').bind(h)).all<any>()).results.map(r=>({...JSON.parse(r.data),version:r.version}));
 const movements=(await (h==='all'?db.prepare('SELECT * FROM sahati_stock_movements ORDER BY created_at DESC,rowid DESC LIMIT 2000'):db.prepare('SELECT * FROM sahati_stock_movements WHERE hospital_id=? ORDER BY created_at DESC,rowid DESC LIMIT 2000').bind(h)).all<any>()).results;
 const date=today(),soon=new Date(date+'T00:00:00Z');soon.setUTCDate(soon.getUTCDate()+90);const until=soon.toISOString().slice(0,10),since=new Date(date+'T00:00:00Z');since.setUTCDate(since.getUTCDate()-28);
 const demandQuery=db.prepare("SELECT product_id,SUM(-delta) AS used FROM sahati_stock_movements WHERE "+(h==='all'?'':'hospital_id=? AND ')+"type IN ('dispense','issue') AND created_at>=? GROUP BY product_id");const demand=(await (h==='all'?demandQuery.bind(since.toISOString()):demandQuery.bind(h,since.toISOString())).all<any>()).results;
 const enriched=products.map(p=>{const own=lots.filter(l=>l.productId===p.id),available=own.filter(l=>usableLot(l)).reduce((s,l)=>s+l.quantity,0),total=own.reduce((s,l)=>s+l.quantity,0),incoming=orders.filter(o=>['ordered','partial'].includes(o.status)).flatMap(o=>o.lines).filter((l:any)=>l.productId===p.id).reduce((s:number,l:any)=>s+l.quantity-l.received,0),used=Number(demand.find(d=>d.product_id===p.id)?.used||0);return {...p,available,total,incoming,blocked:total-available,used28Days:used,daysCover:used?Math.floor(available/(used/28)):null,suggested:available+incoming<=p.minLevel?Math.max(0,p.targetLevel-available-incoming):0,value:own.reduce((s,l)=>s+l.quantity*l.unitPrice,0)};});
 return {hospitalId:h,products:enriched,lots,orders,movements,movementLimit:2000,metrics:{products:products.length,units:lots.reduce((s,l)=>s+l.quantity,0),value:lots.reduce((s,l)=>s+l.quantity*l.unitPrice,0),low:enriched.filter(p=>p.available<=p.minLevel).length,expiring:lots.filter(l=>l.quantity>0&&l.expiry>=date&&l.expiry<=until).length,blocked:lots.filter(l=>l.quantity>0&&!usableLot(l)).length}};
}
export function allocateFEFO(rx:Entity,lots:Entity[]){
 const remaining=new Map(lots.map(l=>[l.id,l.quantity])),allocations:any[]=[];
 rx.medications.forEach((m:any,medIndex:number)=>{let need=integer(m.quantity,'Quantité prescrite',1,10000);const candidates=lots.filter(l=>l.hospitalId===rx.hospitalId&&usableLot(l)&&matchesMedication(l,m)).sort((a,b)=>a.expiry.localeCompare(b.expiry)||a.id.localeCompare(b.id));
  for(const l of candidates){const quantity=Math.min(need,remaining.get(l.id)||0);if(!quantity)continue;allocations.push({medIndex,stockId:l.id,productId:l.productId,medication:m.name,quantity,lot:l.lot,expiry:l.expiry,unit:l.unit});remaining.set(l.id,(remaining.get(l.id)||0)-quantity);need-=quantity;if(!need)break;}
  if(need)throw new UserError('Stock disponible insuffisant pour '+m.name+' ; aucune délivrance enregistrée.',409);
 });return allocations;
}
export function lotGuard(db:D1Database,e:Entity){return db.prepare('INSERT INTO sahati_inventory_guard(id,valid) VALUES(?,CASE WHEN EXISTS(SELECT 1 FROM sahati_records WHERE id=? AND version=? AND quantity=?) THEN 1 ELSE 0 END)').bind(randomToken(),e.id,e.version,e.quantity);}
function updateLot(db:D1Database,e:Entity,now:string){return db.prepare('UPDATE sahati_records SET data=?,quantity=?,version=version+1,updated_at=? WHERE id=? AND version=?').bind(JSON.stringify({...e,version:e.version+1,updatedAt:now}),e.quantity,now,e.id,e.version);}
function insertLot(db:D1Database,e:Entity,a:Account,now:string){return db.prepare('INSERT INTO sahati_records(id,kind,hospital_id,patient_id,data,quantity,version,created_by,updated_at) VALUES(?,?,?,NULL,?,?,1,?,?)').bind(e.id,'stock',a.hospitalId,JSON.stringify(e),e.quantity,a.id,now);}
function operationGuard(db:D1Database,table:string,e:any){return db.prepare(`INSERT INTO sahati_inventory_guard(id,valid) VALUES(?,CASE WHEN EXISTS(SELECT 1 FROM ${table} WHERE id=? AND version=?) THEN 1 ELSE 0 END)`).bind(randomToken(),e.id,e.version);}

export async function inventoryAction(db:D1Database,a:Account,input:any){
 mustWrite(a);const operationId=textField(input.operationId,'Référence de transaction',80,true);if(!/^[\w-]{8,80}$/.test(operationId))throw new UserError('Référence de transaction invalide.');
 const old=await db.prepare('SELECT * FROM sahati_inventory_operations WHERE id=?').bind(operationId).first<any>();
 if(old){if(old.actor_id!==a.id||old.hospital_id!==a.hospitalId)throw new UserError('Transaction inaccessible.',403);return {...JSON.parse(old.result),replayed:true};}
 const now=new Date().toISOString(),products=await productsFor(db,a.hospitalId),lots=await lotsFor(db,a.hospitalId),commands:D1PreparedStatement[]=[],result:any={ok:true,operationId};
 const product=(id:string)=>{const p=products.find(p=>p.id===id);if(!p)throw new UserError('Article introuvable dans cet établissement.',404);return p;};
 const lot=(id:string)=>{const l=lots.find(l=>l.id===id);if(!l)throw new UserError('Lot introuvable dans cet établissement.',404);if(input.version!==l.version)throw new UserError('Lot modifié. Actualisez votre inventaire.',409);return l;};
 const reason=()=>textField(input.reason,'Motif',1000,true);
 function receive(data:any,p:any,reference:string){
  const quantity=integer(data.quantity,'Quantité reçue',1),code=textField(data.lot,'Numéro de lot',100,true),expiry=dateField(data.expiry),location=textField(data.location,'Emplacement',100,true);if(expiry<today())throw new UserError('Une réception doit avoir une péremption valide.');
  let e=lots.find(l=>l.productId===p.id&&norm(l.lot)===norm(code)&&norm(l.location)===norm(location));
  if(e){if(e.expiry!==expiry||e.status!=='active')throw new UserError('Lot bloqué ou date incompatible. Vérifiez sa fiche.');commands.push(lotGuard(db,e));const next={...e,quantity:e.quantity+quantity,unitPrice:Math.round((e.quantity*e.unitPrice+quantity*money(data.unitPrice??e.unitPrice))/(e.quantity+quantity)*100)/100};commands.push(updateLot(db,next,now));Object.assign(e,next);}
  else {e={id:randomToken().slice(0,24),kind:'stock',hospitalId:a.hospitalId,version:1,title:p.title,productId:p.id,category:p.category,unit:p.unit,threshold:p.minLevel,lot:code,expiry,location,quantity,unitPrice:money(data.unitPrice??p.unitPrice),supplier:p.supplier,status:'active',createdAt:now};commands.push(insertLot(db,e,a,now));lots.push(e);}
  commands.push(movementStmt(db,a,e,'receive',quantity,e.quantity,reference,textField(data.reason,'Motif',1000)||'Réception contrôlée',now));result.lotId=e.id;
 }
 switch(input.action){
  case 'product-settings': {
   const p=product(input.productId),data=input.data||input;if(p.version!==input.version)throw new UserError('Article modifié. Actualisez.',409);
   const minLevel=integer(data.minLevel,'Seuil minimum'),targetLevel=integer(data.targetLevel,'Stock cible');if(targetLevel<minLevel)throw new UserError('La cible doit être supérieure au seuil.');
   const next={...p,minLevel,targetLevel,supplier:textField(data.supplier,'Fournisseur',200),storage:textField(data.storage,'Conservation',300),barcode:textField(data.barcode,'Code-barres',100),unitPrice:money(data.unitPrice),version:p.version+1};
   commands.push(operationGuard(db,'sahati_products',p),db.prepare('UPDATE sahati_products SET data=?,version=version+1 WHERE id=? AND version=?').bind(JSON.stringify(next),p.id,p.version));result.productId=p.id;break;
  }
  case 'product': {
   const data=input.data||{},minLevel=integer(data.minLevel,'Seuil minimum'),targetLevel=integer(data.targetLevel,'Stock cible');if(targetLevel<minLevel)throw new UserError('La cible doit être supérieure au seuil.');
   const p={id:randomToken().slice(0,24),hospitalId:a.hospitalId,version:1,sku:textField(data.sku,'Code article',50,true).toUpperCase(),title:textField(data.title,'Nom de l’article',200,true),dci:textField(data.dci,'DCI',200),presentation:textField(data.presentation,'Présentation',200),strength:textField(data.strength,'Dosage du conditionnement',100),unit:textField(data.unit,'Unité de stock',60,true),category:data.category==='medication'?'medication':'supply',minLevel,targetLevel,unitPrice:money(data.unitPrice),supplier:textField(data.supplier,'Fournisseur',200),storage:textField(data.storage,'Conservation',300),barcode:textField(data.barcode,'Code-barres',100)};
   commands.push(db.prepare('INSERT INTO sahati_products(id,hospital_id,sku,data,version) VALUES(?,?,?,?,1)').bind(p.id,a.hospitalId,p.sku,JSON.stringify(p)));result.productId=p.id;break;
  }
  case 'receive':receive(input.data||{},product(input.data?.productId),textField(input.reference,'Bon de réception',100,true));break;
  case 'count': {const e=lot(input.lotId),quantity=integer(input.quantity,'Stock compté'),why=reason();commands.push(lotGuard(db,e),updateLot(db,{...e,quantity},now),movementStmt(db,a,e,'count',quantity-e.quantity,quantity,operationId,why,now));break;}
  case 'status': {
   const e=lot(input.lotId),status=input.status,why=reason();if(!['active','quarantine','recalled'].includes(status))throw new UserError('Statut de lot invalide.');if(status==='active'&&e.expiry<today())throw new UserError('Un lot périmé ne peut pas être libéré.');
   const affected=status==='recalled'?lots.filter(l=>l.productId===e.productId&&norm(l.lot)===norm(e.lot)):[e];
   for(const l of affected)commands.push(lotGuard(db,l),updateLot(db,{...l,status},now),movementStmt(db,a,l,status,0,l.quantity,operationId,why,now));result.affected=affected.length;break;
  }
  case 'transfer': {
   const e=lot(input.lotId),quantity=integer(input.quantity,'Quantité transférée',1),destination=textField(input.destination,'Destination',100,true),why=reason();if(!usableLot(e)||e.quantity<quantity||norm(destination)===norm(e.location))throw new UserError('Vérifiez le stock disponible et la destination.');
   commands.push(lotGuard(db,e),updateLot(db,{...e,quantity:e.quantity-quantity},now),movementStmt(db,a,e,'transfer-out',-quantity,e.quantity-quantity,operationId,why,now));
   receive({...e,quantity,location:destination,reason:why},product(e.productId),operationId);
   // The paired receipt remains in the same transaction and is typed separately for demand calculations.
   commands[commands.length-1]=db.prepare("INSERT INTO sahati_stock_movements(id,hospital_id,lot_id,product_id,type,delta,balance,reference,reason,actor_id,actor_name,created_at) VALUES(?,?,?,?,'transfer-in',?,?,?,?,?,?,?)").bind(randomToken(),a.hospitalId,result.lotId,e.productId,quantity,lots.find(l=>l.id===result.lotId)!.quantity,operationId,why,a.id,a.name,now);break;
  }
  case 'issue': {const e=lot(input.lotId),quantity=integer(input.quantity,'Quantité',1),why=reason(),reference=textField(input.reference,'Service destinataire',200,true);if(!usableLot(e)||quantity>e.quantity)throw new UserError('Stock disponible insuffisant ou lot bloqué.',409);commands.push(lotGuard(db,e),updateLot(db,{...e,quantity:e.quantity-quantity},now),movementStmt(db,a,e,'issue',-quantity,e.quantity-quantity,reference,why,now));break;}
  case 'purchase': {
   if(!Array.isArray(input.lines)||!input.lines.length||input.lines.length>30)throw new UserError('Ajoutez entre 1 et 30 lignes.');const seen=new Set();const lines=input.lines.map((l:any)=>{const p=product(l.productId);if(seen.has(p.id))throw new UserError('Article en double.');seen.add(p.id);return {productId:p.id,title:p.title,unit:p.unit,quantity:integer(l.quantity,'Quantité commandée',1),unitPrice:money(l.unitPrice??p.unitPrice),received:0};});
   const order={id:randomToken().slice(0,24),hospitalId:a.hospitalId,version:1,reference:'BC-'+now.slice(0,10).replaceAll('-','')+'-'+randomToken().slice(0,5).toUpperCase(),supplier:textField(input.supplier,'Fournisseur',200,true),expectedDate:dateField(input.expectedDate),status:'draft',lines,createdAt:now,author:a.name};commands.push(db.prepare('INSERT INTO sahati_purchases(id,hospital_id,data,version) VALUES(?,?,?,1)').bind(order.id,a.hospitalId,JSON.stringify(order)));result.orderId=order.id;break;
  }
  case 'purchase-status':case 'purchase-receive': {
   const row=await db.prepare('SELECT data,version FROM sahati_purchases WHERE id=? AND hospital_id=?').bind(input.orderId,a.hospitalId).first<any>();if(!row)throw new UserError('Commande introuvable.',404);const order={...JSON.parse(row.data),version:row.version};if(order.version!==input.version)throw new UserError('Commande modifiée. Actualisez.',409);commands.push(operationGuard(db,'sahati_purchases',order));
   if(input.action==='purchase-status'){if(input.status==='ordered'&&order.status==='draft')order.status='ordered';else if(input.status==='cancelled'&&['draft','ordered','partial'].includes(order.status)){order.status='cancelled';order.cancellationReason=reason();}else throw new UserError('Transition de commande impossible.');}
   else {if(!['ordered','partial'].includes(order.status))throw new UserError('La commande doit être confirmée avant réception.');if(!Array.isArray(input.receipts)||!input.receipts.length||input.receipts.length>30)throw new UserError('Réception vide ou trop longue.');const seen=new Set();for(const r of input.receipts){const l=order.lines.find((l:any)=>l.productId===r.productId);if(!l||seen.has(l.productId))throw new UserError('Ligne de réception invalide ou en double.');seen.add(l.productId);const quantity=integer(r.quantity,'Quantité reçue',1);if(quantity>l.quantity-l.received)throw new UserError('Réception supérieure au reliquat de la commande.');receive({...r,unitPrice:l.unitPrice},product(l.productId),order.reference);l.received+=quantity;}order.status=order.lines.every((l:any)=>l.received===l.quantity)?'received':'partial';}
   commands.push(db.prepare('UPDATE sahati_purchases SET data=?,version=version+1 WHERE id=? AND version=?').bind(JSON.stringify({...order,version:order.version+1,updatedAt:now}),order.id,row.version));break;
  }
  default:throw new UserError('Opération d’inventaire inconnue.');
 }
 commands.push(db.prepare('INSERT INTO sahati_inventory_operations(id,hospital_id,actor_id,result) VALUES(?,?,?,?)').bind(operationId,a.hospitalId,a.id,JSON.stringify(result)),db.prepare('INSERT INTO sahati_audit(id,actor_id,actor_name,action,target,detail,created_at) VALUES(?,?,?,?,?,?,?)').bind(randomToken(),a.id,a.name,'Inventaire',input.lotId||result.productId||result.orderId||result.lotId||operationId,input.action,now),db.prepare('DELETE FROM sahati_inventory_guard'));
 try{await db.batch(commands);}catch(e){if(/CHECK constraint|UNIQUE constraint/.test(String(e)))throw new UserError('Conflit de version, code article déjà utilisé ou transaction déjà enregistrée. Actualisez.',409);throw e;}return result;
}
