import type {Entity} from './model';

export const reservationSchema=`CREATE TABLE IF NOT EXISTS sahati_stock_reservations(id TEXT PRIMARY KEY,request_id TEXT NOT NULL,hospital_id TEXT NOT NULL,lot_id TEXT NOT NULL,product_id TEXT NOT NULL,line_index INTEGER NOT NULL,quantity INTEGER NOT NULL CHECK(quantity>0),created_at TEXT NOT NULL)`;
export function freeQuantity(l:Entity){return Math.max(0,l.quantity-(l.reserved||0));}
export async function withReservations(db:D1Database,lots:Entity[]):Promise<Entity[]>{
 if(!lots.length)return lots;
 const hospitals=[...new Set(lots.map(l=>l.hospitalId))],rows=(await db.prepare(`SELECT lot_id,SUM(quantity) AS quantity FROM sahati_stock_reservations WHERE hospital_id IN (${hospitals.map(()=>'?').join(',')}) GROUP BY lot_id`).bind(...hospitals).all<any>()).results;
 const reserved=new Map(rows.map(r=>[r.lot_id,Number(r.quantity)]));
 return lots.map(l=>({...l,reserved:reserved.get(l.id)||0,free:Math.max(0,l.quantity-(reserved.get(l.id)||0))}));
}
