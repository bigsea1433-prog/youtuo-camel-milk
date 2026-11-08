import Database from 'better-sqlite3';
import {mkdirSync} from 'node:fs';
mkdirSync(process.env.DATA_DIR||'data',{recursive:true});
const db=new Database((process.env.DATA_DIR||'data')+'/content.sqlite');db.pragma('journal_mode = WAL');
db.exec(`CREATE TABLE IF NOT EXISTS content(id INTEGER PRIMARY KEY,title TEXT NOT NULL,body TEXT NOT NULL,kind TEXT NOT NULL,status TEXT DEFAULT 'draft',created TEXT DEFAULT CURRENT_TIMESTAMP);CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT);CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,expires INTEGER);`);
export default db;
for(const [name,type] of [['summary',"TEXT DEFAULT ''"],['category',"TEXT DEFAULT '企业动态'"],['cover',"TEXT DEFAULT ''"]]){if(!(db.prepare('PRAGMA table_info(content)').all() as {name:string}[]).some(c=>c.name===name))db.exec(`ALTER TABLE content ADD COLUMN ${name} ${type}`)}
db.exec(`CREATE TABLE IF NOT EXISTS media(id TEXT PRIMARY KEY,name TEXT,mime TEXT,size INTEGER,created TEXT DEFAULT CURRENT_TIMESTAMP);`);
export type Item={id:number,title:string,body:string,kind:string,status:string,created:string,summary:string,category:string,cover:string};
export function items(kind:string){return db.prepare("SELECT * FROM content WHERE kind=? AND status='published' ORDER BY id DESC").all(kind) as Item[]}
export function setting(key:string,fallback:string){return (db.prepare('SELECT value FROM settings WHERE key=?').get(key) as {value:string}|undefined)?.value||fallback}
