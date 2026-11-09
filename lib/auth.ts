import {cookies} from 'next/headers';
import {createHash,randomBytes,timingSafeEqual,scryptSync} from 'node:crypto';
import db from './db';
export type User={id:number,username:string,display_name:string,role:'superadmin'|'admin'|'editor',active:number};
export function passwordHash(password:string){const salt=randomBytes(16).toString('hex');return `scrypt:${salt}:${scryptSync(password,salt,64).toString('hex')}`}
function matches(password:string,encoded:string){
 if(encoded.startsWith('scrypt:')){const [,salt,expected]=encoded.split(':');if(!salt||!expected)return false;const actual=scryptSync(password,salt,64);const hash=Buffer.from(expected,'hex');return actual.length===hash.length&&timingSafeEqual(actual,hash)}
 const hash=createHash('sha256').update(password).digest('hex');return encoded.length===hash.length&&timingSafeEqual(Buffer.from(hash),Buffer.from(encoded));
}
// Bootstrap the existing administrator once; keep the original private password working.
if(!db.prepare("SELECT 1 FROM users WHERE role='superadmin'").get()&&process.env.ADMIN_PASSWORD_HASH){db.prepare('INSERT INTO users(username,display_name,password_hash,role) VALUES(?,?,?,?)').run('owner','网站总管理员',process.env.ADMIN_PASSWORD_HASH,'superadmin');db.prepare('UPDATE sessions SET user_id=(SELECT id FROM users WHERE username=?) WHERE user_id IS NULL').run('owner')}
export async function currentUser():Promise<User|null>{
 const token=(await cookies()).get('yt_session')?.value;if(!token)return null;
 return db.prepare('SELECT u.id,u.username,u.display_name,u.role,u.active FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires>? AND u.active=1').get(createHash('sha256').update(token).digest('hex'),Date.now()) as User||null;
}
export async function authenticated(){return !!await currentUser()}
export async function requireUser(roles?:User['role'][]){const user=await currentUser();if(!user)throw new Error('请先登录');if(roles&&!roles.includes(user.role))throw new Error('当前账号没有此操作权限');return user}
export async function endSession(){const jar=await cookies();const token=jar.get('yt_session')?.value;if(token)db.prepare('DELETE FROM sessions WHERE token=?').run(createHash('sha256').update(token).digest('hex'));jar.delete('yt_session')}
export async function login(password:string,username='owner'){
 const user=db.prepare('SELECT * FROM users WHERE username=? AND active=1').get(username) as (User&{password_hash:string})|undefined;
 if(!user||!matches(password,user.password_hash))return false;
 if(!user.password_hash.startsWith('scrypt:'))db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(passwordHash(password),user.id);
 const token=randomBytes(32).toString('hex');db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());
 db.prepare('INSERT INTO sessions(token,expires,user_id) VALUES(?,?,?)').run(createHash('sha256').update(token).digest('hex'),Date.now()+8*3600000,user.id);
 (await cookies()).set('yt_session',token,{httpOnly:true,sameSite:'strict',path:'/',maxAge:8*3600,secure:process.env.COOKIE_SECURE==='true'});return true;
}
export async function verifyPassword(userId:number,password:string){const row=db.prepare('SELECT password_hash FROM users WHERE id=?').get(userId) as {password_hash:string}|undefined;return !!row&&matches(password,row.password_hash)}
