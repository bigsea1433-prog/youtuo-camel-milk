import {siteFields} from '../../../lib/site-fields';
import {notFound,redirect} from 'next/navigation';
import Link from 'next/link';
import {currentUser} from '../../../lib/auth';
import db,{Item,Leader,Certificate} from '../../../lib/db';
import {Cover,ArticleBody} from '../../components';
import {ProductFacts,ContentGallery,CertificateCard,ProfilePreview} from '../../managed-content';
export const dynamic='force-dynamic';
export const metadata={title:'后台资料预览',robots:{index:false,follow:false}};
export default async function Preview({searchParams}:{searchParams:Promise<{kind?:string,id?:string}>}){
 const user=await currentUser();if(!user)redirect('/admin');const p=await searchParams;const id=Number(p.id);
 if(p.kind==='settings'){if(user.role==='editor')notFound();const draft=db.prepare('SELECT payload FROM site_drafts WHERE id=1').get() as {payload:string}|undefined;const values=draft?JSON.parse(draft.payload):{};return <main className="cmsPreview"><div className="previewNotice">企业资料草稿预览 · 尚未公开 <Link href="/admin?tab=brand">返回编辑 →</Link></div><section><h1>企业与页面资料</h1>{Object.entries(values).filter(([,value])=>value).map(([key,value])=><div className="panel" key={key}><h3>{siteFields.find(([k])=>k===key)?.[1]||key}</h3>{key.endsWith('Image')?<Cover id={String(value)}/>:<p className="preserveText">{String(value)}</p>}</div>)}{!draft?<p>请先保存企业资料草稿。</p>:null}</section></main>}
 if(!['content','leaders','certificates'].includes(p.kind||''))notFound();
 const table=p.kind!;const row=db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(id) as any;if(!row)notFound();
 return <main className="cmsPreview"><div className="previewNotice">后台预览 · {row.status==='published'?'此版本已公开':'此版本为草稿，不对外展示'}<Link href="/admin">返回管理中心 →</Link></div><section>{table==='content'?<><p className="eyebrow">{row.category}</p><h1>{row.title}</h1><p>{row.summary}</p>{row.cover?<Cover id={row.cover} label={row.title}/>:null}{row.kind==='product'?<ProductFacts item={row as Item}/>:null}<ArticleBody text={row.body}/><ContentGallery item={row as Item}/></>:table==='leaders'?<ProfilePreview row={row as Leader}/>:<CertificateCard row={row as Certificate}/>}</section></main>;
}
