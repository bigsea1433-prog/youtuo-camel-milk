import urllib.request,urllib.parse,http.cookiejar,re,pathlib
jar=http.cookiejar.CookieJar();client=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar));base='http://127.0.0.1:3001'
def get():return client.open(base+'/admin').read().decode()
def action(html,marker):
 for form in re.findall(r'<form\b.*?</form>',html,re.S):
  if marker in form:return re.search(r'name="(\$ACTION_ID_[^"]+)"',form).group(1)
 raise Exception('Missing form '+marker)
def post(fields):
 boundary='YoutuoVerificationBoundary'
 body=''.join('--'+boundary+'\r\nContent-Disposition: form-data; name="'+k+'"\r\n\r\n'+v+'\r\n' for k,v in fields.items())+'--'+boundary+'--\r\n'
 req=urllib.request.Request(base+'/admin',body.encode(),headers={'Origin':base,'Content-Type':'multipart/form-data; boundary='+boundary});client.open(req).read();return get()
html=get();html=post({action(html,'password'):'','password':pathlib.Path('/home/aowang/youtuo-admin-password.txt').read_text().strip()});assert '内容工作台' in html
html=post({action(html,'name="kind"'):'','kind':'news','title':'内部验收草稿','body':'该草稿用于验证后台保存，不公开展示。','status':'draft'});assert '内部验收草稿' in html
assert '内部验收草稿' not in client.open(base+'/news').read().decode()
for form in re.findall(r'<form\b.*?</form>',html,re.S):
 if '确认删除' in form:
  ident=re.search(r'name="id" value="(\d+)"',form)
  if ident:
   # Only remove the explicitly created test draft, verified against its edit form.
   if re.search(r'name="id"[^>]*value="'+ident.group(1)+r'"',html):
    import sqlite3
    d=sqlite3.connect('/var/lib/youtuo/content.sqlite');row=d.execute('SELECT title FROM content WHERE id=?',(ident.group(1),)).fetchone()
    if row and row[0]=='内部验收草稿':post({action(form,'确认删除'):'','id':ident.group(1)})
print('PASS: login, draft save, unpublished isolation, test draft removal')
