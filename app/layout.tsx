import './globals.css';import './v2.css';
import Link from 'next/link';import {SiteFooter} from './channels';import './contact.css';import {BrandMark,RedStar} from './brand';import BrandEffects from './brand-effects';import './xinjiang.css';
export const metadata={title:{default:'优驼｜源自新疆的驼乳品牌',template:'%s｜优驼'},description:'了解优驼的企业故事、牧场与生产布局、产品及品牌动态。',robots:{index:false,follow:false}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body><div className="preview">扎根中国新疆 · 绿色发展 · 团结共建</div><header><Link className="logo" href="/"><BrandMark/></Link><nav><Link href="/">首页</Link><Link href="/about">关于优驼</Link><Link href="/pastures">牧场与品质</Link><Link href="/products">产品中心</Link><Link href="/sustainability">可持续发展</Link><Link href="/news">品牌博客</Link><Link href="/contact">联系我们 ↗</Link></nav></header>{children}<BrandEffects/><SiteFooter/></body></html>}



import './about.css';
