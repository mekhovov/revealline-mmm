#!/usr/bin/env python3
"""Preserve inventoried owner files without copying unrelated mixed collections.
Run from this repository root. Reads only immutable Git objects.
"""
import argparse,hashlib,json,pathlib,subprocess
parser=argparse.ArgumentParser();parser.add_argument('--source',required=True);parser.add_argument('--ref',required=True);args=parser.parse_args()
root=pathlib.Path('.');inventory=json.loads((root/'migration/upstream-inventory.json').read_text());records=[]
ref=subprocess.check_output(['git','-C',args.source,'rev-parse',args.ref+'^{commit}'],text=True).strip()
for row in inventory['items']:
 name=row['path']
 if 'named-ownership-candidate' not in row['reasons']:continue
 value=subprocess.check_output(['git','-C',args.source,'show',ref+':'+name]);sha=hashlib.sha256(value).hexdigest();live=root/'content/files'/name
 if live.exists() and live.read_bytes()==value:destination=live
 else:
  destination=root/'content/archive/owned-source'/name;destination.parent.mkdir(parents=True,exist_ok=True);destination.write_bytes(value)
 records.append({'sourcePath':name,'sourceGitBlob':row['gitBlob'],'sourceRevision':ref,'destination':destination.as_posix(),'bytes':len(value),'sha256':sha,'disposition':'retained-live-input' if destination==live else 'preserved-authoring-archive'})
(root/'migration/owned-source-receipt.json').write_text(json.dumps({'format':'owned-source-preservation.v1','sourceRevision':ref,'items':records,'scope':'Named owner files at the migration base. Mixed registries, unnamed dependencies and earlier revisions require the separate inventory and history migration.'},indent=2)+'\n')
print('Preserved',len(records),'owner files;',sum(r['bytes'] for r in records),'source bytes accounted for.')
