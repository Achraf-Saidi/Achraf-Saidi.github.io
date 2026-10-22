CREATE TABLE IF NOT EXISTS sahati_products(id TEXT PRIMARY KEY,hospital_id TEXT NOT NULL,sku TEXT NOT NULL,data TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1,UNIQUE(hospital_id,sku));
CREATE TABLE IF NOT EXISTS sahati_stock_movements(id TEXT PRIMARY KEY,hospital_id TEXT NOT NULL,lot_id TEXT NOT NULL,product_id TEXT NOT NULL,type TEXT NOT NULL,delta INTEGER NOT NULL,balance INTEGER NOT NULL,reference TEXT NOT NULL,reason TEXT NOT NULL,actor_id TEXT NOT NULL,actor_name TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS stock_movement_lot ON sahati_stock_movements(lot_id,created_at);
CREATE TABLE IF NOT EXISTS sahati_purchases(id TEXT PRIMARY KEY,hospital_id TEXT NOT NULL,data TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS sahati_inventory_operations(id TEXT PRIMARY KEY,hospital_id TEXT NOT NULL,actor_id TEXT NOT NULL,result TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sahati_inventory_guard(id TEXT PRIMARY KEY,valid INTEGER NOT NULL CHECK(valid=1));
CREATE TABLE IF NOT EXISTS sahati_patient_tools(account_id TEXT PRIMARY KEY,data TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1);
