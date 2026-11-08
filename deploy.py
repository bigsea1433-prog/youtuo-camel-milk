import os,pathlib,secrets,hashlib,subprocess
base=pathlib.Path('/home/aowang/youtuo'); node='/home/aowang/runtime/node_modules/node/bin/node'
def write(p,s,mode=0o644):
 pathlib.Path(p).write_text(s);os.chmod(p,mode)
os.makedirs('/var/lib/youtuo',exist_ok=True);os.makedirs('/var/backups/youtuo',exist_ok=True)
subprocess.run(['chown','aowang:aowang','/var/lib/youtuo'],check=True)
if not pathlib.Path('/etc/youtuo.env').exists():
 password=secrets.token_urlsafe(24)
 write('/etc/youtuo.env','ADMIN_PASSWORD_HASH='+hashlib.sha256(password.encode()).hexdigest()+'\nDATA_DIR=/var/lib/youtuo\nSTATS_FILE=/var/lib/youtuo/stats.json\nPORT=3001\nHOSTNAME=127.0.0.1\nNODE_ENV=production\n',0o600)
 write('/home/aowang/youtuo-admin-password.txt',password+'\n',0o600)
 subprocess.run(['chown','aowang:aowang','/home/aowang/youtuo-admin-password.txt'],check=True)
write('/etc/systemd/system/youtuo.service',f'''[Unit]
Description=Youtuo corporate website
After=network.target
[Service]
User=aowang
Group=aowang
WorkingDirectory={base}
EnvironmentFile=/etc/youtuo.env
ExecStart={node} {base}/node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3001
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=/var/lib/youtuo {base}/.next/cache
UMask=0077
[Install]
WantedBy=multi-user.target
''')
write('/etc/nginx/conf.d/youtuo.conf',r'''log_format yt_json escape=json '{"time":"$time_iso8601","ip":"$remote_addr","method":"$request_method","uri":"$uri","status":$status,"ua":"$http_user_agent"}';
server {
 listen 8080;
 server_name _;
 server_tokens off;
 client_max_body_size 2m;
 access_log /var/log/nginx/youtuo-access.log yt_json;
 add_header X-Content-Type-Options nosniff always;
 add_header X-Frame-Options SAMEORIGIN always;
 add_header Referrer-Policy strict-origin-when-cross-origin always;
 add_header X-Robots-Tag "noindex, nofollow" always;
 location / {
  limit_except GET HEAD { deny all; }
  proxy_pass http://127.0.0.1:3001;
  proxy_set_header Host $http_host;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_set_header X-Real-IP $remote_addr;
 }
 location ^~ /admin { allow 127.0.0.1; deny all; proxy_pass http://127.0.0.1:3001; proxy_set_header Host $http_host; }
}
''')
write('/usr/local/sbin/youtuo-stats',r'''#!/usr/bin/python3
import json,hashlib,datetime,pathlib,collections,os
today=datetime.datetime.now().strftime('%Y-%m-%d'); browser=bot=0; unique=set(); bots=collections.Counter()
saltpath=pathlib.Path('/var/lib/youtuo/stats-salt')
if not saltpath.exists():saltpath.write_bytes(os.urandom(32))
salt=saltpath.read_bytes();path=pathlib.Path('/var/log/nginx/youtuo-access.log')
for line in path.open() if path.exists() else []:
 try:r=json.loads(line)
 except Exception:continue
 if not r.get('time','').startswith(today) or r.get('status')!=200 or r.get('method')!='GET' or r.get('uri','').startswith(('/_next','/admin')) or '.' in r.get('uri',''):continue
 ua=r.get('ua','').lower(); name=next((x for x in ['gptbot','oai-searchbot','chatgpt-user','claudebot','googlebot','bingbot','baiduspider','bytespider','bot','spider','crawler'] if x in ua),None)
 if name:bot+=1;bots[name]+=1
 else:browser+=1;unique.add(hashlib.sha256(salt+today.encode()+r.get('ip','').encode()).hexdigest())
tmp=pathlib.Path('/var/lib/youtuo/stats.tmp');tmp.write_text(json.dumps(dict(updated=datetime.datetime.now().isoformat(timespec='seconds'),browser=browser,bot=bot,unique=len(unique),bots=dict(bots))))
os.chmod(tmp,0o644);tmp.replace('/var/lib/youtuo/stats.json')
''',0o755)
write('/usr/local/sbin/youtuo-backup',r'''#!/usr/bin/python3
import sqlite3,datetime,pathlib,json
folder=pathlib.Path('/var/backups/youtuo');folder.mkdir(exist_ok=True)
name=datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
src=sqlite3.connect('/var/lib/youtuo/content.sqlite');dst=sqlite3.connect(str(folder/(name+'.sqlite')));src.backup(dst);dst.close();src.close()
for p in sorted(folder.glob('*.sqlite'))[:-14]:p.unlink()
''',0o700)
write('/etc/cron.d/youtuo','*/5 * * * * root /usr/local/sbin/youtuo-stats\n23 3 * * * root /usr/local/sbin/youtuo-backup\n')
write('/etc/logrotate.d/youtuo','/var/log/nginx/youtuo-access.log {\n daily\n rotate 14\n compress\n delaycompress\n missingok\n notifempty\n sharedscripts\n postrotate\n  /usr/sbin/nginx -s reopen\n endscript\n}\n')
subprocess.run(['nginx','-t'],check=True)
subprocess.run(['systemctl','daemon-reload'],check=True)
subprocess.run(['systemctl','enable','--now','youtuo'],check=True)
subprocess.run(['systemctl','reload','nginx'],check=True)
print('Configured youtuo service, nginx 8080, backups and stats.')
