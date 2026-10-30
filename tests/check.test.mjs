import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {check} from '../scripts/check.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
async function fixture(t){
  const root=await mkdtemp(join(tmpdir(),'ksf-registry-'));t.after(()=>rm(root,{recursive:true,force:true}));await mkdir(join(root,'packages'));
  const manifest={schemaVersion:1,sdkVersion:1,minCoreVersion:'0.3.2',dataStores:[],id:'com.example.registry',version:'1.0.0',name:'虚构测试',description:'仅测试',permissions:[],window:{entry:'frontend/index.js'}};
  const content=Buffer.from('export function mount(){}'),pack=gzipSync(JSON.stringify({protocol:'ksf-app-package-v1',manifest,files:{'frontend/index.js':{mode:420,sha256:sha(content),content:content.toString('base64')}}}));
  const entry={manifest,package:{url:'packages/test.ksfapp',sha256:sha(pack),size:pack.length}};await writeFile(join(root,entry.package.url),pack);
  const write=apps=>writeFile(join(root,'index.json'),JSON.stringify({protocol:'ksf-app-registry-v1',apps}));return{root,entry,write};
}
test('empty source and a valid package pass without executing app code',async t=>{const f=await fixture(t);await f.write([]);assert.equal((await check(f.root)).releases,0);await f.write([f.entry]);assert.equal((await check(f.root)).releases,1);});
test('wrong digest, duplicate variant and reserved IDs are rejected',async t=>{const f=await fixture(t);for(const apps of [[{...f.entry,package:{...f.entry.package,sha256:'0'.repeat(64)}}],[f.entry,f.entry],[{...f.entry,manifest:{...f.entry.manifest,id:'git'}}]]){await f.write(apps);await assert.rejects(check(f.root));}});
test('external, encoded and traversing resource paths are rejected',async t=>{const f=await fixture(t);for(const url of ['https://evil.invalid/test.ksfapp','packages/../../test.ksfapp','packages/%2e%2e/test.ksfapp']){await f.write([{...f.entry,package:{...f.entry.package,url}}]);await assert.rejects(check(f.root));}});
test('symlinked package is rejected',async t=>{const f=await fixture(t);await symlink(join(f.root,'packages/test.ksfapp'),join(f.root,'packages/link.ksfapp'));await f.write([{...f.entry,package:{...f.entry.package,url:'packages/link.ksfapp'}}]);await assert.rejects(check(f.root),/符号链接/);});
test('listing limits and screenshot descriptions are required',async t=>{const f=await fixture(t);await f.write([{...f.entry,listing:{subtitle:'x'.repeat(121)}}]);await assert.rejects(check(f.root),/subtitle/);await f.write([{...f.entry,listing:{screenshots:[{}]}}]);await assert.rejects(check(f.root));});

test('SDK v1 headless backend, CLI, documentation and data migrations are verified without executing code',async t=>{
 const f=await fixture(t),manifest={schemaVersion:1,sdkVersion:1,minCoreVersion:'0.3.3',dataStores:[{name:'state.json',scope:'runtime',schemaVersion:2,migrateFrom:[1]}],id:'com.ksf.cooperation-center',version:'0.2.0',name:'合作中心',description:'合成结构测试',permissions:['background'],backend:{runtime:'node',entry:'backend/index.mjs',lifecycle:'resident'},cli:{contractVersion:1,entry:'cli/index.mjs',documentation:'docs/cli.md',commands:[{id:'task.list'}]}};
 const files=Object.fromEntries(Object.entries({'backend/index.mjs':'throw Error("must not execute");','cli/index.mjs':'throw Error("must not execute");','docs/cli.md':'# 合作中心 CLI\n只做包校验。'}).map(([path,text])=>{const bytes=Buffer.from(text);return[path,{mode:420,content:bytes.toString('base64'),sha256:sha(bytes)}];}));
 const pack=()=>gzipSync(JSON.stringify({protocol:'ksf-app-package-v1',manifest,files}));let bytes=pack();await writeFile(join(f.root,'packages/test.ksfapp'),bytes);await f.write([{manifest,package:{url:'packages/test.ksfapp',size:bytes.length,sha256:sha(bytes)}}]);assert.equal((await check(f.root)).releases,1);
 delete files['docs/cli.md'];bytes=pack();await writeFile(join(f.root,'packages/test.ksfapp'),bytes);await f.write([{manifest,package:{url:'packages/test.ksfapp',size:bytes.length,sha256:sha(bytes)}}]);await assert.rejects(check(f.root),/入口/);
});
test('obsolete SDK schemas and malformed migration declarations are rejected',async t=>{const f=await fixture(t);for(const patch of [{schemaVersion:2,sdkVersion:2},{dataStores:[{name:'state.json',scope:'runtime',schemaVersion:1,migrateFrom:[2]}]},{dataStores:[{name:'../state.json',scope:'user',schemaVersion:2,migrateFrom:[1]}]}]){await f.write([{...f.entry,manifest:{...f.entry.manifest,...patch}}]);await assert.rejects(check(f.root));}});
