'use client';
export default function AdminError({reset}:{error:Error,reset:()=>void}){return <main className="cmsPreview"><section><h1>这次操作未完成</h1><p>请检查必填项、日期、密码长度或账号权限，再重试。账号如已失效，请重新登录。已有资料不会因本提示自动删除。</p><button onClick={()=>reset()}>返回重试</button><p><a href="/admin">重新打开管理中心 →</a></p></section></main>}
