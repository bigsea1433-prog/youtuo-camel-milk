import urllib.request,http.cookiejar,re,pathlib,sqlite3,base64
jar=http.cookiejar.CookieJar();client=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar));base='http://127.0.0.1:3001'
def get(path='/admin'):return client.open(base+path).read().decode()
def action(html,marker):
 for form in re.findall(r'<form\b.*?</form>',html,re.S):
  if marker in form:return re.search(r'name="(\$ACTION_ID_[^"]+)"',form).group(1)
 raise Exception('Missing form '+marker)
def post(fields,file=None,path='/admin'):
 boundary='YoutuoVerificationBoundary';body=b''
 for k,v in fields.items():body+=('--'+boundary+'\r\nContent-Disposition: form-data; name="'+k+'"\r\n\r\n'+str(v)+'\r\n').encode()
 if file:body+=('--'+boundary+'\r\nContent-Disposition: form-data; name="image"; filename="acceptance-test.png"\r\nContent-Type: image/png\r\n\r\n').encode()+file+b'\r\n'
 body+=('--'+boundary+'--\r\n').encode();req=urllib.request.Request(base+path,body,headers={'Origin':base,'Content-Type':'multipart/form-data; boundary='+boundary});return client.open(req).read().decode()
html=get();post({action(html,'password'):'','password':pathlib.Path('/home/aowang/youtuo-admin-password.txt').read_text().strip()});assert '官网管理中心' in get()
editor=get('/admin?tab=news&edit=new');post({action(editor,'name="kind"'):'','kind':'news','title':'内部验收草稿v2','body':'## 章节\n验收内容。','summary':'验收摘要','category':'验收分类','status':'draft'},path='/admin?tab=news&edit=new')
d=sqlite3.connect('/var/lib/youtuo/content.sqlite');ident=d.execute("SELECT id FROM content WHERE title='内部验收草稿v2' ORDER BY id DESC").fetchone()[0]
assert '内部验收草稿v2' not in get('/news');edit=get('/admin?tab=news&edit='+str(ident));assert '验收摘要' in edit
post({action(edit,'name="kind"'):'','id':ident,'kind':'news','title':'内部验收草稿v2','body':'## 章节\n验收内容。','summary':'验收摘要','category':'验收分类','status':'published'},path='/admin?tab=news&edit='+str(ident))
assert '内部验收草稿v2' in get('/news?q='+urllib.parse.quote('内部验收草稿v2'));assert '<h2>章节</h2>' in get('/news/'+str(ident))
listing=get('/admin?tab=news');form=next(f for f in re.findall(r'<form\b.*?</form>',listing,re.S) if '确认删除' in f and re.search(r'name="id"[^>]*value="'+str(ident)+'"',f));post({action(form,'确认删除'):'','id':ident,'returnTab':'news'},path='/admin?tab=news')
assert not d.execute('SELECT id FROM content WHERE id=?',(ident,)).fetchone()
media=get('/admin?tab=media');image=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jN1kAAAAASUVORK5CYII=');post({action(media,'name="image"'):''},file=image,path='/admin?tab=media')
mediaid=d.execute("SELECT id FROM media WHERE name='acceptance-test.png' ORDER BY created DESC").fetchone()[0];assert client.open(base+'/media/'+mediaid).read()==image
d.execute('DELETE FROM media WHERE id=?',(mediaid,));d.commit();pathlib.Path('/var/lib/youtuo/uploads/'+mediaid).unlink()
print('PASS: login, draft isolation, edit, publish, blog search, formatted detail, deletion, image upload and serving. Test data removed.')
