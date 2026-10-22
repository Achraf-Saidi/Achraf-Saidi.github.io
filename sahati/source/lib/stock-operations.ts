import type {Account,Entity} from './model';
import {randomToken,sha} from './crypto';
import {UserError,textField} from './validation';
import {integer,lotsFor,productsFor,usableLot,lotGuard,updateLot,operationGuard,movementStmt} from './inventory';
import {reservationSchema,withReservations,freeQuantity} from './inventory-availability';

export const stockOperationsSchema=[
 reservationSchema,
 `CREATE INDEX IF NOT EXISTS stock_reservation_request ON sahati_stock_reservations(request_id)`,
 `CREATE INDEX IF NOT EXISTS stock_reservation_lot ON sahati_stock_reservations(lot_id)`,
 `CREATE TABLE IF NOT EXISTS sahati_supply_requests(id TEXT PRIMARY KEY,hospital_id TEXT NOT NULL,data TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1)`,
 `CREATE TABLE IF NOT EXISTS sahati_stocktakes(id TEXT PRIMARY KEY,hospital_id TEXT NOT NULL,data TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1)`,
 `CREATE TABLE IF NOT EXISTS sahati_suppliers(id TEXT PRIMARY KEY,hospital_id TEXT NOT NULL,code TEXT NOT NULL,data TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1,UNIQUE(hospital_id,code))`
];
const managers=['pharmacy','logistics'];
const readers=[...managers,'director','admin'];
const requesters=['doctor','resident','nurse','lab','radiology','reception'];
const same=(a:string,b:string)=>a.trim().normalize('NFC').toLocaleLowerCase()===b.trim().normalize('NFC').toLocaleLowerCase();
const ref=(prefix:string,now:string)=>prefix+'-'+now.slice(0,10).replaceAll('-','')+'-'+randomToken().slice(0,5).toUpperCase();
const decode=(r:any)=>({...JSON.parse(r.data),version:r.version});
async function rows(db:D1Database,table:string,h:string){return (await (h==='all'?db.prepare(`SELECT data,version FROM ${table} ORDER BY rowid DESC`):db.prepare(`SELECT data,version FROM ${table} WHERE hospital_id=? ORDER BY rowid DESC`).bind(h)).all<any>()).results.map(decode);}
export async function ensureStockOperations(db:D1Database){
 await db.batch(stockOperationsSchema.map(s=>db.prepare(s)));
 // Create contact-free directory entries for existing supplier names, without replacing edits.
 const products=await productsFor(db,'all'),seen=new Set<string>();
 for(const p of products){if(!p.supplier?.trim())continue;const key=p.hospitalId+':'+p.supplier.trim().normalize('NFC').toLocaleLowerCase();if(seen.has(key))continue;seen.add(key);const id='sup-'+(await sha(key)).slice(0,20),supplier={id,hospitalId:p.hospitalId,version:1,code:'LEG-'+id.slice(-8).toUpperCase(),name:p.supplier,contact:'',email:'',phone:'',city:'',leadDays:7,notes:'',active:true};await db.prepare('INSERT OR IGNORE INTO sahati_suppliers(id,hospital_id,code,data,version) VALUES(?,?,?,?,1)').bind(id,p.hospitalId,supplier.code,JSON.stringify(supplier)).run();}
}
export async function stockOperationsSnapshot(db:D1Database,a:Account,hospital?:string|null){
 if(!readers.includes(a.role))throw new UserError('Gestion de stock non autorisée.',403);
 const h=['admin','director'].includes(a.role)?hospital&&hospital!=='all'?hospital:'all':a.hospitalId;
 const requests=await rows(db,'sahati_supply_requests',h),stocktakes=await rows(db,'sahati_stocktakes',h),suppliers=await rows(db,'sahati_suppliers',h);
 const reservations=(await (h==='all'?db.prepare('SELECT * FROM sahati_stock_reservations'):db.prepare('SELECT * FROM sahati_stock_reservations WHERE hospital_id=?').bind(h)).all<any>()).results;
 return {hospitalId:h,requests,stocktakes,suppliers,reservations,metrics:{pending:requests.filter(r=>['requested','prepared','partial'].includes(r.status)).length,prepared:requests.filter(r=>r.status==='prepared').length,openCounts:stocktakes.filter(s=>['draft','review'].includes(s.status)).length}};
}
export async function supplySnapshot(db:D1Database,a:Account){
 if(!requesters.includes(a.role)&&!managers.includes(a.role))throw new UserError('Demandes de service non autorisées.',403);
 const products=await productsFor(db,a.hospitalId),lots=await withReservations(db,await lotsFor(db,a.hospitalId)),all=await rows(db,'sahati_supply_requests',a.hospitalId);
 return {products:products.map(p=>({id:p.id,title:p.title,sku:p.sku,unit:p.unit,category:p.category,available:lots.filter(l=>l.productId===p.id&&usableLot(l)).reduce((n,l)=>n+freeQuantity(l),0)})),requests:managers.includes(a.role)?all:all.filter(r=>r.requesterId===a.id)};
}

export async function stockOperationsAction(db:D1Database,a:Account,input:any){
 const staff=requesters.includes(a.role),manager=managers.includes(a.role),action=input.action;
 if(!manager&&!(staff&&['request-create','request-cancel','request-acknowledge'].includes(action)))throw new UserError('Opération de stock non autorisée.',403);
 const operationId=textField(input.operationId,'Référence de transaction',80,true);if(!/^[\w-]{8,80}$/.test(operationId))throw new UserError('Référence de transaction invalide.');
 const old=await db.prepare('SELECT * FROM sahati_inventory_operations WHERE id=?').bind(operationId).first<any>();
 if(old){if(old.actor_id!==a.id||old.hospital_id!==a.hospitalId)throw new UserError('Transaction inaccessible.',403);return {...JSON.parse(old.result),replayed:true};}
 const now=new Date().toISOString(),commands:D1PreparedStatement[]=[],result:any={ok:true,operationId};
 const lots=await withReservations(db,await lotsFor(db,a.hospitalId)),products=await productsFor(db,a.hospitalId);
 const reason=()=>textField(input.reason,'Motif',1000,true);
 function product(id:string){const p=products.find(p=>p.id===id);if(!p)throw new UserError('Article introuvable dans cet établissement.',404);return p;}
 function lot(id:string){const l=lots.find(l=>l.id===id);if(!l)throw new UserError('Lot introuvable dans cet établissement.',404);return l;}
 async function entity(table:string,id:string){const row=await db.prepare(`SELECT data,version FROM ${table} WHERE id=? AND hospital_id=?`).bind(id,a.hospitalId).first<any>();if(!row)throw new UserError('Élément introuvable dans cet établissement.',404);const e=decode(row);if(input.version!==e.version)throw new UserError('Cet élément a changé. Actualisez avant de recommencer.',409);commands.push(operationGuard(db,table,e));return e;}
 function save(table:string,e:any){commands.push(db.prepare(`UPDATE ${table} SET data=?,version=version+1 WHERE id=? AND version=?`).bind(JSON.stringify({...e,version:e.version+1,updatedAt:now}),e.id,e.version));}
 function touch(l:Entity,quantity=l.quantity){commands.push(lotGuard(db,l),updateLot(db,{...l,quantity},now));}
 function scopeLots(location:string){return lots.filter(l=>!location||same(l.location,location));}
 function countLine(l:Entity){return {lotId:l.id,productId:l.productId,title:l.title,unit:l.unit,lot:l.lot,expiry:l.expiry,location:l.location,expected:l.quantity,stockVersion:l.version,unitPrice:l.unitPrice,counted:null};}
 async function ownReservations(id:string){return (await db.prepare('SELECT * FROM sahati_stock_reservations WHERE request_id=? AND hospital_id=? ORDER BY created_at,id').bind(id,a.hospitalId).all<any>()).results;}
 function release(reservations:any[]){for(const id of new Set(reservations.map(r=>r.lot_id)))touch(lot(id));commands.push(db.prepare('DELETE FROM sahati_stock_reservations WHERE request_id=? AND hospital_id=?').bind(reservations[0]?.request_id||'',a.hospitalId));}
 switch(action){
  case 'request-create': {
   const department=textField(input.department,'Service destinataire',120,true),why=reason();if(!Array.isArray(input.lines)||!input.lines.length||input.lines.length>30)throw new UserError('Ajoutez entre 1 et 30 articles.');
   const seen=new Set();const lines=input.lines.map((l:any)=>{const p=product(l.productId);if(seen.has(p.id))throw new UserError('Article en double.');seen.add(p.id);return {productId:p.id,title:p.title,unit:p.unit,quantity:integer(l.quantity,'Quantité demandée',1),issued:0};});
   const r={id:randomToken().slice(0,24),hospitalId:a.hospitalId,version:1,reference:ref('DS',now),department,reason:why,priority:input.priority==='urgent'?'urgent':'routine',requesterId:a.id,requester:a.name,status:'requested',lines,deliveries:[],createdAt:now};commands.push(db.prepare('INSERT INTO sahati_supply_requests(id,hospital_id,data,version) VALUES(?,?,?,1)').bind(r.id,a.hospitalId,JSON.stringify(r)));result.requestId=r.id;break;
  }
  case 'request-reserve': {
   const r=await entity('sahati_supply_requests',input.requestId);if(!manager||!['requested','partial'].includes(r.status))throw new UserError('Cette demande ne peut pas être préparée.');
   if((await ownReservations(r.id)).length)throw new UserError('Libérez la préparation précédente.',409);
   if(!Array.isArray(input.quantities)||input.quantities.length!==r.lines.length)throw new UserError('Indiquez une quantité à préparer par article.');
   const remaining=new Map(lots.map(l=>[l.id,freeQuantity(l)])),allocated:any[]=[];
   r.lines.forEach((line:any,index:number)=>{let need=integer(input.quantities[index],'Quantité à préparer');if(need>line.quantity-line.issued)throw new UserError('La préparation dépasse le reliquat demandé.');for(const l of lots.filter(l=>l.productId===line.productId&&usableLot(l)).sort((x,y)=>x.expiry.localeCompare(y.expiry)||x.id.localeCompare(y.id))){const quantity=Math.min(need,remaining.get(l.id)||0);if(!quantity)continue;allocated.push({lot:l,lineIndex:index,quantity});remaining.set(l.id,(remaining.get(l.id)||0)-quantity);need-=quantity;if(!need)break;}if(need)throw new UserError('Stock libre insuffisant pour '+line.title+'. Ajustez la préparation partielle.',409);});
   if(!allocated.length)throw new UserError('Préparez au moins une unité.');
   for(const l of new Set<Entity>(allocated.map(p=>p.lot)))touch(l);
   for(const p of allocated)commands.push(db.prepare('INSERT INTO sahati_stock_reservations(id,request_id,hospital_id,lot_id,product_id,line_index,quantity,created_at) VALUES(?,?,?,?,?,?,?,?)').bind(randomToken(),r.id,a.hospitalId,p.lot.id,p.lot.productId,p.lineIndex,p.quantity,now));
   r.status='prepared';r.preparedBy=a.name;r.preparedAt=now;save('sahati_supply_requests',r);result.requestId=r.id;break;
  }
  case 'request-release':case 'request-cancel':case 'request-issue':case 'request-acknowledge': {
   const r=await entity('sahati_supply_requests',input.requestId);if(!manager&&r.requesterId!==a.id)throw new UserError('Cette demande ne vous appartient pas.',403);
   const reservations=await ownReservations(r.id);
   if(action==='request-release'){if(!manager||r.status!=='prepared')throw new UserError('Aucune préparation à libérer.');r.status=r.lines.some((l:any)=>l.issued>0)?'partial':'requested';release(reservations);r.releaseReason=reason();}
   if(action==='request-cancel'){if(!['requested','prepared','partial'].includes(r.status))throw new UserError('Cette demande ne peut plus être annulée.');r.status='cancelled';r.cancellationReason=reason();if(reservations.length)release(reservations);}
   if(action==='request-acknowledge'){if(r.requesterId!==a.id||r.status!=='fulfilled')throw new UserError('Seul le demandeur peut confirmer une livraison complète.',403);r.status='received';r.receivedAt=now;r.receivedBy=a.name;}
   if(action==='request-issue'){
    if(!manager||r.status!=='prepared'||!reservations.length)throw new UserError('Préparez cette demande avant de la délivrer.');
    const totals=new Map<string,number>();for(const v of reservations){const l=lot(v.lot_id);if(!usableLot(l))throw new UserError('Une réservation porte sur un lot bloqué ou périmé. Libérez et préparez à nouveau.',409);totals.set(l.id,(totals.get(l.id)||0)+v.quantity);}
    const delivery={id:operationId,date:now,actor:a.name,allocations:reservations.map(v=>({lotId:v.lot_id,lot:lot(v.lot_id).lot,expiry:lot(v.lot_id).expiry,lineIndex:v.line_index,quantity:v.quantity}))};
    for(const [id,quantity] of totals){const l=lot(id);if(quantity>l.quantity||l.quantity-quantity<(l.reserved||0)-quantity)throw new UserError('Stock réservé incohérent. Actualisez.',409);touch(l,l.quantity-quantity);commands.push(movementStmt(db,a,l,'issue',-quantity,l.quantity-quantity,r.id,'Dotation : '+r.department,now));}
    for(const v of reservations)r.lines[v.line_index].issued+=v.quantity;
    commands.push(db.prepare('DELETE FROM sahati_stock_reservations WHERE request_id=? AND hospital_id=?').bind(r.id,a.hospitalId));r.deliveries.push(delivery);r.status=r.lines.every((l:any)=>l.issued===l.quantity)?'fulfilled':'partial';
   }
   save('sahati_supply_requests',r);result.requestId=r.id;break;
  }
  case 'stocktake-create': {
   const location=textField(input.location,'Emplacement',100),selected=scopeLots(location);if(!selected.length)throw new UserError('Aucun lot à compter dans ce périmètre.');
   const s={id:randomToken().slice(0,24),hospitalId:a.hospitalId,reference:ref('INV',now),version:1,title:textField(input.title,'Nom de l’inventaire',160,true),location,status:'draft',lines:selected.map(countLine),createdAt:now,author:a.name};commands.push(db.prepare('INSERT INTO sahati_stocktakes(id,hospital_id,data,version) VALUES(?,?,?,1)').bind(s.id,a.hospitalId,JSON.stringify(s)));result.stocktakeId=s.id;break;
  }
  case 'stocktake-save':case 'stocktake-review':case 'stocktake-reopen':case 'stocktake-refresh':case 'stocktake-apply':case 'stocktake-cancel': {
   const s=await entity('sahati_stocktakes',input.stocktakeId);if(!['draft','review'].includes(s.status))throw new UserError('Cet inventaire est clôturé.');
   if(action==='stocktake-save'){
    if(s.status!=='draft'||!Array.isArray(input.counts)||input.counts.length>s.lines.length)throw new UserError('Comptage invalide.');const seen=new Set();for(const c of input.counts){const line=s.lines.find((l:any)=>l.lotId===c.lotId);if(!line||seen.has(c.lotId))throw new UserError('Ligne de comptage invalide ou en double.');seen.add(c.lotId);line.counted=c.counted===null?null:integer(c.counted,'Quantité comptée');}
   }
   if(action==='stocktake-review'){if(s.status!=='draft'||s.lines.some((l:any)=>l.counted===null))throw new UserError('Comptez tous les lots avant la revue.');s.status='review';s.reviewedBy=a.name;s.reviewedAt=now;}
   if(action==='stocktake-reopen'){if(s.status!=='review')throw new UserError('Cet inventaire n’est pas en revue.');s.status='draft';}
   if(action==='stocktake-refresh'){
    const before=s.lines;s.lines=scopeLots(s.location).map(l=>{const line=before.find((v:any)=>v.lotId===l.id);return line&&line.stockVersion===l.version&&line.expected===l.quantity?line:countLine(l);});if(!s.lines.length)throw new UserError('Aucun lot dans ce périmètre.');s.status='draft';s.refreshedAt=now;
   }
   if(action==='stocktake-cancel'){s.status='cancelled';s.cancellationReason=reason();}
   if(action==='stocktake-apply'){
    if(s.status!=='review'||s.lines.some((l:any)=>l.counted===null))throw new UserError('Terminez le comptage puis passez en revue.');
    const selected=scopeLots(s.location);if(selected.length!==s.lines.length)throw new UserError('Le périmètre a changé. Réconciliez puis recomptez les lots modifiés.',409);
    // The scope count and every lot version are checked again inside the atomic batch.
    const sql="SELECT COUNT(*) AS n FROM sahati_records WHERE kind='stock' AND hospital_id=?"+(s.location?" AND lower(trim(json_extract(data,'$.location')))=lower(trim(?))":'');
    commands.push(db.prepare(`INSERT INTO sahati_inventory_guard(id,valid) VALUES(?,CASE WHEN (${sql})=? THEN 1 ELSE 0 END)`).bind(randomToken(),a.hospitalId,...(s.location?[s.location]:[]),s.lines.length));
    for(const line of s.lines){const l=selected.find(l=>l.id===line.lotId);if(!l||l.version!==line.stockVersion||l.quantity!==line.expected)throw new UserError('Des mouvements ont eu lieu depuis le début du comptage. Réconciliez puis recomptez les lots modifiés.',409);if(line.counted<(l.reserved||0))throw new UserError('Un comptage est inférieur aux réservations. Libérez ces réservations puis réconciliez.',409);touch(l,line.counted);commands.push(movementStmt(db,a,l,'count',line.counted-l.quantity,line.counted,s.id,'Inventaire : '+s.title,now));}
    s.status='applied';s.appliedAt=now;s.appliedBy=a.name;
   }
   save('sahati_stocktakes',s);result.stocktakeId=s.id;break;
  }
  case 'supplier-save': {
   const existing=input.supplierId?await entity('sahati_suppliers',input.supplierId):undefined,data=input.data||{},code=textField(data.code,'Code fournisseur',40,true).toUpperCase(),email=textField(data.email,'E-mail',200);if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new UserError('E-mail invalide.');
   const supplier={...existing,id:existing?.id||randomToken().slice(0,24),hospitalId:a.hospitalId,code,name:textField(data.name,'Nom du fournisseur',200,true),contact:textField(data.contact,'Contact',200),email,phone:textField(data.phone,'Téléphone',60),city:textField(data.city,'Ville',120),leadDays:integer(data.leadDays,'Délai en jours',0,365),notes:textField(data.notes,'Notes',1000),active:data.active!==false,version:(existing?.version||0)+1,updatedAt:now};
   if(existing)commands.push(db.prepare('UPDATE sahati_suppliers SET code=?,data=?,version=version+1 WHERE id=? AND version=?').bind(code,JSON.stringify(supplier),existing.id,existing.version));else commands.push(db.prepare('INSERT INTO sahati_suppliers(id,hospital_id,code,data,version) VALUES(?,?,?,?,1)').bind(supplier.id,a.hospitalId,code,JSON.stringify(supplier)));result.supplierId=supplier.id;break;
  }
  case 'remove-stock': {
   const l=lot(input.lotId);if(input.version!==l.version)throw new UserError('Lot modifié. Actualisez.',409);const quantity=integer(input.quantity,'Quantité à sortir',1),why=reason(),reference=textField(input.reference,'Bordereau',160,true);if(!['supplier-return','waste'].includes(input.type))throw new UserError('Type de sortie invalide.');if(quantity>freeQuantity(l))throw new UserError('Quantité supérieure au stock non réservé.',409);
   let supplier:any;if(input.type==='supplier-return'){const row=await db.prepare('SELECT data,version FROM sahati_suppliers WHERE id=? AND hospital_id=?').bind(input.supplierId,a.hospitalId).first<any>();if(!row)throw new UserError('Choisissez un fournisseur de cet établissement.');supplier=decode(row);}
   touch(l,l.quantity-quantity);commands.push(movementStmt(db,a,l,input.type,-quantity,l.quantity-quantity,reference,why+(supplier?' · '+supplier.name:''),now));result.removal={type:input.type,lot:l.lot,title:l.title,unit:l.unit,quantity,supplier:supplier?.name||'',reference,reason:why,date:now,actor:a.name};break;
  }
  default:throw new UserError('Opération de stock inconnue.');
 }
 commands.push(db.prepare('INSERT INTO sahati_inventory_operations(id,hospital_id,actor_id,result) VALUES(?,?,?,?)').bind(operationId,a.hospitalId,a.id,JSON.stringify(result)),db.prepare('INSERT INTO sahati_audit(id,actor_id,actor_name,action,target,detail,created_at) VALUES(?,?,?,?,?,?,?)').bind(randomToken(),a.id,a.name,'Gestion de stock',result.requestId||result.stocktakeId||result.supplierId||input.lotId||operationId,action,now),db.prepare('DELETE FROM sahati_inventory_guard'));
 try{await db.batch(commands);}catch(e){if(/CHECK constraint|UNIQUE constraint/.test(String(e)))throw new UserError('Conflit de version, code déjà utilisé ou transaction déjà enregistrée. Actualisez.',409);throw e;}
 return result;
}
