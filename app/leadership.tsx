import db,{Leader} from '../lib/db';
export function Leadership(){
 const people=db.prepare("SELECT * FROM leaders WHERE status='published' ORDER BY sort,id").all() as Leader[];
 return <section id="leadership" className="leadershipSection"><p className="eyebrow">OUR LEADERSHIP / 企业高层</p><h2>同心同行，<br/>共筑品牌的长期价值。</h2>{people.length?<div className="leadershipGrid">{people.map(p=><article key={p.id}>{p.photo?<img src={'/media/'+p.photo} alt={p.name+' · '+p.role} loading="lazy"/>:<div className="leaderPhoto">人物照片待补充</div>}<div className="leaderBio"><small>{p.role}</small><h3>{p.name}</h3><p>{p.bio}</p></div></article>)}</div>:<div className="leadershipEmpty"><span>企业高层介绍</span><p>团队介绍即将呈现。</p></div>}</section>
}
