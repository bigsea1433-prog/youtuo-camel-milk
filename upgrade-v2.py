import pathlib,subprocess,os
subprocess.run(['/usr/local/sbin/youtuo-backup'],check=True)
p=pathlib.Path('/etc/systemd/system/youtuo.service');original=p.read_text();backup=p.with_suffix('.service.before-v2')
if not backup.exists():backup.write_text(original)
p.write_text(original.replace('/home/aowang/youtuo/','/home/aowang/youtuo-v2/').replace('WorkingDirectory=/home/aowang/youtuo\n','WorkingDirectory=/home/aowang/youtuo-v2\n'))
subprocess.run(['systemctl','daemon-reload'],check=True);subprocess.run(['systemctl','restart','youtuo'],check=True)
# Extend the existing daily backup to include uploaded images.
backupScript=pathlib.Path('/usr/local/sbin/youtuo-backup');text=backupScript.read_text()
if 'uploads.tar.gz' not in text:
 text+='\nimport tarfile\nimages=pathlib.Path("/var/lib/youtuo/uploads")\nif images.exists():\n with tarfile.open(str(folder/(name+"-uploads.tar.gz")),"w:gz") as archive: archive.add(images,arcname="uploads")\nfor old in sorted(folder.glob("*-uploads.tar.gz"))[:-14]:old.unlink()\n'
 backupScript.write_text(text)
os.chmod(backupScript,0o700)
print('Activated v2; previous release preserved at /home/aowang/youtuo')
