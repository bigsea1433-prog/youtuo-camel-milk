import Database from 'better-sqlite3';
import {mkdirSync} from 'node:fs';
mkdirSync(process.env.DATA_DIR||'data',{recursive:true});
const db=new Database((process.env.DATA_DIR||'data')+'/content.sqlite');db.pragma('journal_mode = WAL');
db.exec(`CREATE TABLE IF NOT EXISTS content(id INTEGER PRIMARY KEY,title TEXT NOT NULL,body TEXT NOT NULL,kind TEXT NOT NULL,status TEXT DEFAULT 'draft',created TEXT DEFAULT CURRENT_TIMESTAMP);CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT);CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,expires INTEGER);`);
export default db;
for(const [name,type] of [['summary',"TEXT DEFAULT ''"],['category',"TEXT DEFAULT '企业动态'"],['cover',"TEXT DEFAULT ''"]]){if(!(db.prepare('PRAGMA table_info(content)').all() as {name:string}[]).some(c=>c.name===name))db.exec(`ALTER TABLE content ADD COLUMN ${name} ${type}`)}
db.exec(`CREATE TABLE IF NOT EXISTS media(id TEXT PRIMARY KEY,name TEXT,mime TEXT,size INTEGER,created TEXT DEFAULT CURRENT_TIMESTAMP);`);
export type Item={id:number,title:string,body:string,kind:string,status:string,created:string,summary:string,category:string,cover:string,extra:string};
export function items(kind:string){return db.prepare("SELECT * FROM content WHERE kind=? AND status='published' ORDER BY id DESC").all(kind) as Item[]}
export function setting(key:string,fallback:string){return (db.prepare('SELECT value FROM settings WHERE key=?').get(key) as {value:string}|undefined)?.value||fallback}

// Leadership is separately managed: only explicitly published profiles appear publicly.
db.exec(`CREATE TABLE IF NOT EXISTS leaders(id INTEGER PRIMARY KEY,name TEXT NOT NULL,role TEXT NOT NULL,bio TEXT NOT NULL DEFAULT '',photo TEXT NOT NULL DEFAULT '',sort INTEGER NOT NULL DEFAULT 0,status TEXT NOT NULL DEFAULT 'draft');`);
export type Leader={id:number,name:string,role:string,bio:string,photo:string,sort:number,status:string};

// Additive migrations keep existing content intact during upgrades.
for (const [table,column,definition] of [
 ['sessions','user_id','INTEGER'],['content','extra',"TEXT NOT NULL DEFAULT '{}'"],
]) {if(!(db.prepare(`PRAGMA table_info(${table})`).all() as {name:string}[]).some(c=>c.name===column))db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)}
db.exec(`
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,username TEXT UNIQUE NOT NULL,display_name TEXT NOT NULL,password_hash TEXT NOT NULL,role TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1,created TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS certificates(id INTEGER PRIMARY KEY,title TEXT NOT NULL,category TEXT NOT NULL DEFAULT '企业资质',number TEXT NOT NULL DEFAULT '',issuer TEXT NOT NULL DEFAULT '',subject TEXT NOT NULL DEFAULT '',issued TEXT NOT NULL DEFAULT '',expires TEXT NOT NULL DEFAULT '',product_id INTEGER,description TEXT NOT NULL DEFAULT '',image TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'draft');
CREATE TABLE IF NOT EXISTS revisions(id INTEGER PRIMARY KEY,entity TEXT NOT NULL,entity_id TEXT NOT NULL,snapshot TEXT NOT NULL,actor TEXT NOT NULL,reason TEXT NOT NULL,created TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY,actor TEXT NOT NULL,action TEXT NOT NULL,target TEXT NOT NULL,created TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS content_listing ON content(kind,status,category,id);
CREATE INDEX IF NOT EXISTS revisions_target ON revisions(entity,entity_id,id);
`);
export type Certificate={id:number,title:string,category:string,number:string,issuer:string,subject:string,issued:string,expires:string,product_id:number|null,description:string,image:string,status:string};

db.exec(`CREATE TABLE IF NOT EXISTS site_drafts(id INTEGER PRIMARY KEY CHECK(id=1),payload TEXT NOT NULL,actor TEXT NOT NULL,updated TEXT DEFAULT CURRENT_TIMESTAMP);`);
