import {snapshot,audit} from '../../lib/history';
import {User} from '../../lib/auth';
import {requireUser} from '../../lib/auth';
import db,{Leader} from '../../lib/db';
import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
// Profiles stay private until explicitly published; no personal contact fields are collected.
export async function saveLeader(data:FormData){
 'use server';
 const user=await requireUser();
 const name=String(data.get('name')||'').trim().slice(0,60);
 const role=String(data.get('role')||'').trim().slice(0,100);
 const bio=String(data.get('bio')||'').trim().slice(0,2000);
 const photo=String(data.get('photo')||'');
 const sort=Math.max(0,Math.min(9999,Math.floor(Number(data.get('sort'))||0)));
 const status=user.role!=='editor'&&data.get('status')==='published'?'published':'draft';
 const id=Number(data.get('id'));
 if(!name||!role)throw new Error('姓名与职务不能为空');
 if(photo&&!db.prepare('SELECT id FROM media WHERE id=?').get(photo))throw new Error('图片不存在');
 const previous=id?db.prepare('SELECT status FROM leaders WHERE id=?').get(id) as {status:string}|undefined:undefined;
 if(user.role==='editor'&&previous?.status==='published')throw new Error('已发布资料请由企业管理员修改');
 db.transaction(()=>{if(id)snapshot('leaders',id,user,'修改前');
 if(id)db.prepare('UPDATE leaders SET name=?,role=?,bio=?,photo=?,sort=?,status=? WHERE id=?').run(name,role,bio,photo,sort,status,id);
 else db.prepare('INSERT INTO leaders(name,role,bio,photo,sort,status) VALUES(?,?,?,?,?,?)').run(name,role,bio,photo,sort,status);
 audit(user,'保存企业高层',name);})();
 revalidatePath('/about');redirect('/admin?tab=leaders');
}
export async function deleteLeader(data:FormData){
 'use server';
 const user=await requireUser(['superadmin','admin']);
 db.transaction(()=>{snapshot('leaders',Number(data.get('id')),user,'删除前');db.prepare("UPDATE leaders SET status='deleted' WHERE id=?").run(Number(data.get('id')));audit(user,'删除企业高层',String(data.get('id')));})();
 revalidatePath('/about');redirect('/admin?tab=leaders');
}
function ProfileForm({person,media,user}:{person?:Leader,media:{id:string,name:string}[],user:User}){
 return <form action={saveLeader}>
 <input type="hidden" name="id" value={person?.id||''}/>
 <label>姓名<input name="name" required maxLength={60} defaultValue={person?.name}/></label>
 <label>职务<input name="role" required maxLength={100} defaultValue={person?.role}/></label>
 <label>公开简介<textarea name="bio" rows={5} maxLength={2000} defaultValue={person?.bio}/></label>
 <label>人物照片<select name="photo" defaultValue={person?.photo||''}><option value="">暂不添加照片</option>{media.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
 <label>排序（数字小的在前）<input name="sort" type="number" min={0} max={9999} defaultValue={person?.sort||0}/></label>
 <label>公开状态<select name="status" defaultValue={person?.status||'draft'}><option value="draft">草稿 · 不公开 / 撤下展示</option>{user.role!=='editor'?<option value="published">发布 · 在关于优驼展示</option>:null}</select></label>
 <button className="saveButton">保存高层资料</button></form>;
}
export function LeadershipAdmin({media,user}:{media:{id:string,name:string}[],user:User}){
 const people=db.prepare("SELECT * FROM leaders WHERE status<>'deleted' ORDER BY sort,id").all() as Leader[];
 return <><div className="panel"><h2>企业高层资料</h2><p>填写经确认可以公开的姓名、职务、简介与照片。新建默认为草稿；选择发布后才对外展示。修改已有资料后保存即时生效。图片先上传到素材库。</p><details><summary>＋ 录入企业高层</summary><ProfileForm media={media} user={user}/></details></div>{people.map(p=><div className="panel" key={p.id}><h3>{p.name} · {p.role}（{p.status==='published'?'已公开':'草稿'}）</h3><details><summary>编辑资料 / 调整公开状态</summary><ProfileForm person={p} media={media} user={user}/></details>{user.role!=='editor'?<details><summary>删除此人资料</summary><form action={deleteLeader}><input type="hidden" name="id" value={p.id}/><button className="danger">确认删除</button></form></details>:null}<a className="textLink" href={'/admin/preview?kind=leaders&id='+p.id}>预览 ↗</a></div>)}</>;
}
