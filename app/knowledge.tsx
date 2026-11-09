import Link from 'next/link';
// Shared names keep homepage entrances, blog filters and editor suggestions consistent.
export const knowledgeTopics=[
 {name:'牧场知识',text:'从新疆产区、奶源到收储，认识一份驼乳的来路。',path:'/pastures'},
 {name:'驼奶知识',text:'读懂产品类别、配料与加工信息，认识优驼产品。',path:'/products'},
 {name:'营养知识',text:'从营养标签出发，建立清晰、适度的饮食认知。',path:'/#nutrition'},
];
export function KnowledgeTopics(){return <div className="knowledgeTopics">{knowledgeTopics.map((t,i)=><article key={t.name}><small>0{i+1} / YOUTUO KNOWLEDGE</small><h3><Link href={'/news?category='+encodeURIComponent(t.name)}>{t.name} ↗</Link></h3><p>{t.text}</p><Link className="textLink" href={t.path}>{i===0?'走进优驼牧场':i===1?'查看产品目录':'首页营养解读'} →</Link></article>)}</div>}
