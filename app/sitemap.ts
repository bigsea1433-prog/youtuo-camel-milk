import db,{Item} from '../lib/db';
export const dynamic='force-dynamic';
export default function sitemap(){const base=process.env.SITE_URL||'http://59.110.49.115:8080';const pages=['','about','pastures','products','news','contact','sustainability'].map(p=>({url:base+'/'+p}));const rows=db.prepare("SELECT * FROM content WHERE status='published'").all() as Item[];return [...pages,...rows.map(r=>({url:base+'/'+(r.kind==='product'?'products':'news')+'/'+r.id}))]}

