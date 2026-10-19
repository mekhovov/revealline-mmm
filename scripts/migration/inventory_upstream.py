"""Read committed Git objects; never modify the source checkout or its refs."""
import argparse, hashlib, json, pathlib, re, subprocess
parser=argparse.ArgumentParser();parser.add_argument('--source',required=True);parser.add_argument('--ref',required=True);parser.add_argument('--output',required=True);args=parser.parse_args()
root=pathlib.Path(__file__).resolve().parents[2]
def git(*values):return subprocess.check_output(['git','-C',args.source,*values])
revision=git('rev-parse',args.ref+'^{commit}').decode().strip()
objects={}
for entry in git('ls-tree','-rlz',revision).split(b'\0'):
 if not entry:continue
 info,name=entry.split(b'\t',1);mode,kind,oid,size=info.decode().split()
 if kind=='blob':objects[name.decode()]={'gitBlob':oid,'bytes':int(size)}
known={}
for p in (root/'content/files').rglob('*'):
 if p.is_file():
  b=p.read_bytes();oid=hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest();known.setdefault(oid,[]).append(p.relative_to(root/'content/files').as_posix())
text=subprocess.run(['git','-C',args.source,'grep','-Iil','-e','coupa','-e','spend.network','-e','spend.route',revision,'--'],capture_output=True,check=False)
if text.returncode not in [0,1]:raise RuntimeError(text.stderr.decode())
mentions={line.decode().split(':',1)[1] for line in text.stdout.splitlines()}
rows=[]
for name,info in objects.items():
 reasons=[]
 if re.search(r'coupa|spend-network|spend-route',name,re.I):reasons.append('named-ownership-candidate')
 if name in mentions:reasons.append('textual-reference')
 if info['gitBlob'] in known:reasons.append('locally-owned-byte-match')
 if reasons:rows.append({'path':name,**info,'reasons':reasons,'localCopies':known.get(info['gitBlob'],[]),'disposition':'review-required'})
archives=[{'path':name,**info} for name,info in objects.items() if re.search(r'\.(zip|tar|tgz|gz|7z|rlpack|rlteam)$',name,re.I)]
output={'format':'brand-migration-inventory.v1','sourceRevision':revision,'tree':git('rev-parse',revision+'^{tree}').decode().strip(),'items':rows,'embeddedArchives':archives,'note':'References are candidates, not deletion instructions. Split mixed files and preserve generic dependencies.'}
pathlib.Path(args.output).write_text(json.dumps(output,indent=2)+'\n')
print(json.dumps({'revision':revision,'candidates':len(rows),'named':sum('named-ownership-candidate' in r['reasons'] for r in rows),'byteMatches':sum('locally-owned-byte-match' in r['reasons'] for r in rows),'archives':len(archives)}))
