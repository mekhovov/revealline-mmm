import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {parse} from 'acorn';
const [source,ref]=process.argv.slice(2);
if(!source||!ref)throw new Error('Usage: node scripts/migration/preserve_generator_fragments.mjs SOURCE COMMIT');
const git=(...args)=>execFileSync('git',['-C',source,...args],{maxBuffer:32*1024*1024});
const commit=git('rev-parse',ref+'^{commit}').toString().trim();
const inventory=JSON.parse(await fs.readFile('migration/upstream-inventory.json','utf8'));
const results=[];
for(const row of inventory.items.filter(row=>/\.mjs$/.test(row.path)&&!/(?:^|\/)(?:test|tests)\/|\/test-|\.test\./.test(row.path))){
 const bytes=git('show',commit+':'+row.path),text=bytes.toString('utf8');
 const tree=parse(text,{sourceType:'module',ecmaVersion:'latest'}),candidates=[];
 const owned=value=>typeof value==='string'&&/coupa|spend.network|spend.route/i.test(value);
 const testOwned=node=>node&&owned(text.slice(node.start,node.end));
 function walk(node,parent){
  if(!node||typeof node!=='object')return;
  let selected=false;
  if(node.type==='FunctionDeclaration'&&owned(node.id?.name))selected=true;
  if(node.type==='Property'&&owned(node.key?.value??node.key?.name))selected=true;
  if(parent?.type==='ArrayExpression'){
   if(node.type==='Literal'&&owned(node.value))selected=true;
   if(node.type==='ArrayExpression'&&node.elements.slice(0,3).some(n=>n?.type==='Literal'&&owned(n.value)))selected=true;
   if(node.type==='ObjectExpression'&&node.properties.some(p=>['id','brandId','themeId','slug'].includes(p.key?.value??p.key?.name)&&owned(p.value?.value)))selected=true;
  }
  if(selected)candidates.push({start:node.start,end:node.end,kind:node.type});
  if(['IfStatement','ConditionalExpression'].includes(node.type)&&testOwned(node.test))candidates.push({start:node.consequent.start,end:node.consequent.end,kind:'owned-conditional-branch',condition:text.slice(node.test.start,node.test.end)});
  for(const [key,value]of Object.entries(node))if(key!=='parent'){if(Array.isArray(value))value.forEach(child=>walk(child,node));else if(value&&typeof value==='object')walk(value,node)}
 }
 walk(tree,null);
 // Preserve every otherwise uncovered explicit ownership reference as evidence,
 // without retaining an entire mixed generator as a new runtime dependency.
 function literals(node){if(!node||typeof node!=='object')return;if(node.type==='Literal'&&owned(node.value))candidates.push({start:node.start,end:node.end,kind:'ownership-reference'});for(const value of Object.values(node)){if(Array.isArray(value))value.forEach(literals);else if(value&&typeof value==='object')literals(value)}}
 literals(tree);
 candidates.sort((a,b)=>a.start-b.start||b.end-a.end);const fragments=[];
 for(const entry of candidates){if(fragments.some(f=>f.start<=entry.start&&f.end>=entry.end))continue;fragments.push({...entry,source:text.slice(entry.start,entry.end)})}
 if(!fragments.length)continue;
 const file={sourcePath:row.path,sourceRevision:commit,sourceGitBlob:row.gitBlob,sourceSHA256:createHash('sha256').update(bytes).digest('hex'),encoding:'UTF-8; offsets are JavaScript string offsets',fragments};
 const destination=path.join('content/archive/generator-fragments',row.path+'.json');await fs.mkdir(path.dirname(destination),{recursive:true});await fs.writeFile(destination,JSON.stringify(file,null,2)+'\n');results.push({sourcePath:row.path,destination,fragments:fragments.length});
}
await fs.writeFile('migration/generator-fragment-receipt.json',JSON.stringify({format:'owned-generator-fragments.v1',sourceRevision:commit,items:results,note:'Provenance excerpts from mixed generators. Not executable imports; editable runtime content remains in content/files. Unnamed structural dependencies still require the migration inventory review.'},null,2)+'\n');
console.log(`Preserved ${results.length} generator source fragment sets.`);
