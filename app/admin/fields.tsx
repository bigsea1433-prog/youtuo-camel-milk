import Link from 'next/link';
import {Cover} from '../components';
export type Media={id:string,name:string,size?:number};
export function TextField({name,label,value='',rows=2,type='text',required=false}:{name:string,label:string,value?:string|number,rows?:number,type?:string,required?:boolean}){return <label>{label}{rows>2?<textarea name={name} rows={rows} defaultValue={value} required={required}/>:<input name={name} type={type} defaultValue={value} required={required}/>}</label>}
export function ImageField({name,label,value='',media}:{name:string,label:string,value?:string,media:Media[]}){return <label>{label}{value?<Cover id={value}/>:null}<select name={name} defaultValue={value}><option value="">暂不设置 / 保留占位</option>{media.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label>}
export function GalleryField({value=[],media}:{value?:string[],media:Media[]}){return <label>补充图片 / 活动照片（可多选，最多12张）<select name="gallery" multiple size={5} defaultValue={value}>{media.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select><small>按住Ctrl选择多张；需先在图片素材库上传。</small></label>}
export function PublishField({value='draft',canPublish}:{value?:string,canPublish:boolean}){return <label>保存方式<select name="status" defaultValue={value}>{canPublish?<option value="published">发布 · 公开展示</option>:null}<option value="draft">草稿 · 不公开（已发布内容选择此项会撤下）</option></select>{!canPublish?<small>编辑账号只能保存草稿，由企业管理员审核发布。</small>:null}</label>}
export function EditorHelp(){return <p className="editorHelp">先上传图片 → 填写资料 → 保存草稿 → 预览 → 发布。<Link href="/admin?tab=media">打开图片素材库 ↗</Link></p>}
