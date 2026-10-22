CREATE TABLE IF NOT EXISTS sahati_stock_reservations(id TEXT PRIMARY KEY,request_id TEXT NOT NULL,hospital_id TEXT NOT NULL,lot_id TEXT NOT NULL,product_id TEXT NOT NULL,line_index INTEGER NOT NULL,quantity INTEGER NOT NULL CHECK(quantity>0),created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS stock_reservation_request ON sahati_stock_reservations(request_id);
CREATE INDEX IF NOT EXISTS stock_reservation_lot ON sahati_stock_reservations(lot_id);
CREATE TABLE IF NOT EXISTS sahati_supply_requests(id TEXT PRIMARY KEY,hospital_id TEXT NOT NULL,data TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS sahati_stocktakes(id TEXT PRIMARY KEY,hospital_id TEXT NOT NULL,data TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS sahati_suppliers(id TEXT PRIMARY KEY,hospital_id TEXT NOT NULL,code TEXT NOT NULL,data TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1,UNIQUE(hospital_id,code));
