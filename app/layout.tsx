import './globals.css';import './v2.css';
import Link from 'next/link';import {BrandMark,RedStar} from './brand';import BrandEffects from './brand-effects';import './xinjiang.css';
export const metadata={title:{default:'优驼｜源自新疆的驼乳品牌',template:'%s｜优驼'},description:'了解优驼的企业故事、牧场与生产布局、产品及品牌动态。',robots:{index:false,follow:false}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body><div className="preview">扎根中国新疆 · 绿色发展 · 团结共建</div><header><Link className="logo" href="/"><BrandMark/></Link><nav><Link href="/">首页</Link><Link href="/about">关于优驼</Link><Link href="/pastures">牧场与品质</Link><Link href="/products">产品中心</Link><Link href="/sustainability">可持续发展</Link><Link href="/news">品牌博客</Link><Link href="/contact">联系我们 ↗</Link></nav></header>{children}<BrandEffects/><footer><div className="foot"><div className="logo">优驼<span>FROM XINJIANG, WITH CARE</span></div><p>立足新疆，探索地标食材的营养价值。<br/>以骆驼产业为核心，连接自然与日常。</p><div><Link href="/contact">联系优驼 ↗</Link><br/><Link href="/admin">客户管理后台</Link></div></div><small>© {new Date().getFullYear()} 优驼　企业全称及备案信息待补充 · 预览内容不作为交易承诺</small></footer></body></html>}


