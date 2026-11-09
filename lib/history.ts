import db from './db';
import type {User} from './auth';
const tables={content:'content',leaders:'leaders',certificates:'certificates'} as const;
export type Entity=keyof typeof tables|'settings';
export function audit(user:User,action:string,target:string){db.prepare('INSERT INTO audit(actor,action,target) VALUES(?,?,?)').run(user.username,action,target)}
export function snapshot(entity:Entity,id:string|number,user:User,reason:string){
 const value=entity==='settings'?db.prepare('SELECT * FROM settings').all():db.prepare(`SELECT * FROM ${tables[entity]} WHERE id=?`).get(id);
 if(value)db.prepare('INSERT INTO revisions(entity,entity_id,snapshot,actor,reason) VALUES(?,?,?,?,?)').run(entity,String(id),JSON.stringify(value),user.username,reason);
}
// Records are soft-deleted to preserve IDs; restore only allowlisted columns and always restore records as drafts for review.
export function restoreRevision(revisionId:number,user:User){
 const rev=db.prepare('SELECT * FROM revisions WHERE id=?').get(revisionId) as {entity:Entity,entity_id:string,snapshot:string}|undefined;
 if(!rev)throw new Error('版本不存在');
 if(rev.entity==='settings'&&user.role==='editor')throw new Error('当前账号不能恢复企业设置');
 db.transaction(()=>{
  snapshot(rev.entity,rev.entity_id,user,'恢复前自动备份');
  const value=JSON.parse(rev.snapshot);
  if(rev.entity==='settings'){db.prepare('DELETE FROM settings').run();db.prepare('DELETE FROM site_drafts').run();for(const row of value)db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(row.key,row.value)}
  else {const table=tables[rev.entity];if(!table)throw new Error('版本类型不支持');const allowed=(db.prepare(`PRAGMA table_info(${table})`).all() as {name:string}[]).map(c=>c.name);const keys=Object.keys(value).filter(k=>allowed.includes(k));value.status='draft';db.prepare(`INSERT OR REPLACE INTO ${table}(${keys.join(',')}) VALUES(${keys.map(()=>'?').join(',')})`).run(...keys.map(k=>value[k]))}
  audit(user,'恢复版本',`${rev.entity}:${rev.entity_id} / ${revisionId}`);
 })();
}
