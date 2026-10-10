/** D1-compatible adapter for the same business engine, backed by local SQLite WASM. */
export function sqliteDatabase(sqlite:any) {
  class Statement {
    constructor(public sql:string,public args:any[]=[]) {}
    bind(...args:any[]) {return new Statement(this.sql,args);}
    async first<T=any>(column?:string):Promise<T|null> {
      const s=sqlite.prepare(this.sql);
      try {s.bind(this.args);if(!s.step())return null;const r=s.getAsObject();return column?r[column]:r;} finally {s.free();}
    }
    async all<T=any>() {
      const s=sqlite.prepare(this.sql),results:T[]=[];
      try {s.bind(this.args);while(s.step())results.push(s.getAsObject());return {success:true,results};} finally {s.free();}
    }
    execute() {
      sqlite.run(this.sql,this.args);
      const last=sqlite.exec('SELECT last_insert_rowid() AS id')[0]?.values[0][0]||0;
      return {success:true,meta:{changes:sqlite.getRowsModified(),last_row_id:Number(last)}};
    }
    async run() {return this.execute();}
  }
  return {
    prepare:(sql:string)=>new Statement(sql),
    async batch(statements:Statement[]) {
      sqlite.run('BEGIN IMMEDIATE');
      try {const results=statements.map(s=>s.execute());sqlite.run('COMMIT');return results;}
      catch(e) {sqlite.run('ROLLBACK');throw e;}
    }
  };
}
