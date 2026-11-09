'use server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {currentUser,requireUser,login,endSession,passwordHash,verifyPassword} from '../../lib/auth';
import db from '../../lib/db';
import {snapshot,audit,restoreRevision} from '../../lib/history';
import {siteFields} from '../../lib/site-fields';
import {mkdir,writeFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
const attempts=new Map<string,{n:number,time:number}>();
function text(data:FormData,key:string,max=10000){return String(data.get(key)||'').trim().slice(0,max)}
function image(value:string){if(value&&!db.prepare('SELECT id FROM media WHERE id=?').get(value))throw new Error('请选择素材库中的图片');return value}
function status(data:FormData,role:string){return role!=='editor'&&data.get('status')==='published'?'published':'draft'}
function finish(tab:string):never{revalidatePath('/','layout');redirect('/admin?tab='+tab)}
export async function signIn(data:FormData){
 const username=text(data,'username',60)||'owner';const now=Date.now();const key=username.toLowerCase();
 if(attempts.size>1000)for(const [k,v] of attempts)if(now-v.time>60000)attempts.delete(k);
 const record=attempts.get(key);if(record&&now-record.time<60000&&record.n>=8)redirect('/admin?error=locked');
 if(!record||now-record.time>=60000)attempts.set(key,{n:1,time:now});else record.n++;
 if(!await login(text(data,'password',200),username))redirect('/admin?error=invalid');
 attempts.delete(key);const user=await currentUser();if(user)audit(user,'登录','后台');redirect('/admin');
}
export async function signOut(){await endSession();redirect('/admin')}
export async function save(data:FormData){
 const user=await requireUser();const id=Number(data.get('id'));const kind=data.get('kind')==='product'?'product':'news';
 const old=id?db.prepare('SELECT * FROM content WHERE id=? AND kind=?').get(id,kind) as {status:string}|undefined:undefined;
 if(id&&!old)throw new Error('内容不存在');
 if(user.role==='editor'&&old?.status==='published')throw new Error('请复制为新草稿后修改，已发布内容需管理员处理');
 const title=text(data,'title',200),body=text(data,'body',30000);if(!title||!body)throw new Error('标题与正文不能为空');
 const extra=JSON.stringify({spec:text(data,'spec',500),ingredients:text(data,'ingredients',3000),nutrition:text(data,'nutrition',4000),usage:text(data,'usage',2000),storage:text(data,'storage',1000),gallery:data.getAll('gallery').map(v=>image(String(v))).filter(Boolean).slice(0,12)});
 const args=[title,body,status(data,user.role),text(data,'summary',300),text(data,'category',40)||'企业动态',image(text(data,'cover',100)),extra];
 db.transaction(()=>{if(id){snapshot('content',id,user,'修改前');db.prepare('UPDATE content SET title=?,body=?,status=?,summary=?,category=?,cover=?,extra=? WHERE id=?').run(...args,id)}else{const result=db.prepare('INSERT INTO content(title,body,status,summary,category,cover,extra,kind) VALUES(?,?,?,?,?,?,?,?)').run(...args,kind);snapshot('content',Number(result.lastInsertRowid),user,'首次保存')}audit(user,'保存内容',title)})();finish(kind==='product'?'products':'news');
}
export async function duplicate(data:FormData){const user=await requireUser();const row=db.prepare('SELECT * FROM content WHERE id=?').get(Number(data.get('id'))) as any;if(!row)throw new Error('内容不存在');const result=db.prepare("INSERT INTO content(title,body,kind,status,summary,category,cover,extra) VALUES(?,?,?,'draft',?,?,?,?)").run(row.title+'（草稿副本）',row.body,row.kind,row.summary,row.category,row.cover,row.extra);audit(user,'复制草稿',String(row.id));redirect('/admin?tab='+(row.kind==='product'?'products':'news')+'&edit='+result.lastInsertRowid)}
export async function remove(data:FormData){const user=await requireUser(['superadmin','admin']);const id=Number(data.get('id'));db.transaction(()=>{snapshot('content',id,user,'删除前');db.prepare("UPDATE content SET status='deleted' WHERE id=?").run(id);audit(user,'删除内容',String(id))})();finish(data.get('returnTab')==='products'?'products':'news')}
export async function settings(data:FormData){
 const user=await requireUser(['superadmin','admin']);const values=siteFields.map(([key])=>{const value=text(data,key);if(key.endsWith('Url')&&value){try{if(!['https:','http:'].includes(new URL(value).protocol))throw new Error()}catch{throw new Error('请输入完整的官方链接')}}if(key.endsWith('Image'))image(value);return [key,value]});
 if(data.get('intent')!=='publish'){db.prepare('INSERT INTO site_drafts(id,payload,actor) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,actor=excluded.actor,updated=CURRENT_TIMESTAMP').run(JSON.stringify(Object.fromEntries(values)),user.username);audit(user,'保存企业资料草稿','网站设置');finish('brand')}
 db.transaction(()=>{snapshot('settings','site',user,'修改前');for(const [key,value] of values)db.prepare('INSERT INTO settings VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key,value);db.prepare('DELETE FROM site_drafts WHERE id=1').run();audit(user,'发布企业与页面资料','网站设置')})();finish('brand');
}
export async function upload(data:FormData){
 const user=await requireUser();const file=data.get('image');if(!(file instanceof File)||file.size>5000000||file.size<12)redirect('/admin?tab=media&error=image');
 const bytes=Buffer.from(await file.arrayBuffer());let mime='';if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))mime='image/png';else if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)mime='image/jpeg';else if(bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP')mime='image/webp';if(!mime)redirect('/admin?tab=media&error=image');
 const id=randomBytes(16).toString('hex');const dir=(process.env.DATA_DIR||'data')+'/uploads';await mkdir(dir,{recursive:true});await writeFile(dir+'/'+id,bytes,{mode:0o600});db.prepare('INSERT INTO media(id,name,mime,size) VALUES(?,?,?,?)').run(id,file.name.slice(0,150),mime,file.size);audit(user,'上传图片',file.name.slice(0,150));finish('media');
}
export async function saveCertificate(data:FormData){
 const user=await requireUser();const id=Number(data.get('id'));const old=id?db.prepare('SELECT status FROM certificates WHERE id=?').get(id) as {status:string}|undefined:undefined;
 if(id&&!old)throw new Error('资料不存在');if(user.role==='editor'&&old?.status==='published')throw new Error('已发布资料需管理员修改');
 const title=text(data,'title',200);if(!title)throw new Error('请填写资料名称');
 const product=Number(data.get('product_id'))||null;if(product&&!db.prepare("SELECT id FROM content WHERE id=? AND kind='product'").get(product))throw new Error('关联产品不存在');
 for(const key of ['issued','expires']){const date=text(data,key,10);if(date&&!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new Error('日期格式不正确')}
 const issued=text(data,'issued',10),expires=text(data,'expires',10);if(issued&&expires&&expires<issued)throw new Error('有效期不能早于发证日期');
 const args=[title,text(data,'category',40)||'企业资质',text(data,'number',200),text(data,'issuer',200),text(data,'subject',200),issued,expires,product,text(data,'description',4000),image(text(data,'image',100)),status(data,user.role)];
 db.transaction(()=>{if(id){snapshot('certificates',id,user,'修改前');db.prepare('UPDATE certificates SET title=?,category=?,number=?,issuer=?,subject=?,issued=?,expires=?,product_id=?,description=?,image=?,status=? WHERE id=?').run(...args,id)}else{const result=db.prepare('INSERT INTO certificates(title,category,number,issuer,subject,issued,expires,product_id,description,image,status) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(...args);snapshot('certificates',Number(result.lastInsertRowid),user,'首次保存')}audit(user,'保存资质检测',title)})();finish('certificates');
}
export async function deleteCertificate(data:FormData){const user=await requireUser(['superadmin','admin']);const id=Number(data.get('id'));db.transaction(()=>{snapshot('certificates',id,user,'删除前');db.prepare("UPDATE certificates SET status='deleted' WHERE id=?").run(id);audit(user,'删除资质检测',String(id))})();finish('certificates')}
export async function restore(data:FormData){const user=await requireUser(['superadmin','admin']);restoreRevision(Number(data.get('revision')),user);finish('history')}
export async function saveUser(data:FormData){
 const actor=await requireUser(['superadmin']);const id=Number(data.get('id'));const username=text(data,'username',60);const display=text(data,'display_name',80)||username;
 if(!/^[a-zA-Z0-9_.-]{3,40}$/.test(username))throw new Error('账号请使用3至40位字母数字或下划线');
 const role=['superadmin','admin','editor'].includes(text(data,'role'))?text(data,'role'):'editor';const active=data.get('active')==='0'?0:1;const password=text(data,'password',200);
 if((!id||password)&&password.length<12)throw new Error('新密码至少12位');
 const target=id?db.prepare('SELECT * FROM users WHERE id=?').get(id) as any:null;if(id&&!target)throw new Error('账号不存在');
 if(id===actor.id&&(!active||role!=='superadmin'))throw new Error('不能停用或降级自己的总管理员账号');
 if(target?.role==='superadmin'&&(!active||role!=='superadmin')&&(db.prepare("SELECT count(*) n FROM users WHERE role='superadmin' AND active=1").get() as {n:number}).n<=1)throw new Error('必须保留一个可用总管理员');
 db.transaction(()=>{if(id){db.prepare('UPDATE users SET username=?,display_name=?,role=?,active=? WHERE id=?').run(username,display,role,active,id);if(password)db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(passwordHash(password),id);db.prepare('DELETE FROM sessions WHERE user_id=?').run(id)}else db.prepare('INSERT INTO users(username,display_name,password_hash,role,active) VALUES(?,?,?,?,?)').run(username,display,passwordHash(password),role,active);audit(actor,'管理账号',username)})();finish('users');
}
export async function changePassword(data:FormData){const user=await requireUser();if(!await verifyPassword(user.id,text(data,'old_password',200)))throw new Error('原密码不正确');const password=text(data,'password',200);if(password.length<12||password!==text(data,'confirm',200))throw new Error('新密码至少12位，且两次输入一致');db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(passwordHash(password),user.id);db.prepare('DELETE FROM sessions WHERE user_id=?').run(user.id);audit(user,'修改本人密码','账号');await endSession();redirect('/admin?changed=1')}
