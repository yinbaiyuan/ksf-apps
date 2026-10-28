import {readFile,lstat,realpath} from 'node:fs/promises';
import {resolve,relative,dirname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {isDeepStrictEqual} from 'node:util';

const MiB=1024*1024,sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const requireValue=(ok,message)=>{if(!ok)throw Error(message);};
const safe=value=>typeof value==='string'&&value.length<512&&!/[\\\x00-\x1f:%?#]/.test(value)&&value.split('/').every(s=>s&&s!=='.'&&s!=='..'&&s!=='.git');
async function asset(root,path,limit){
  requireValue(safe(path),`不安全的资源路径：${path}`);
  let at=root;
  for(const part of path.split('/')){at=resolve(at,part);const stat=await lstat(at);requireValue(!stat.isSymbolicLink(),`资源不能是符号链接：${path}`);}
  const stat=await lstat(at);requireValue(stat.isFile()&&stat.size<=limit,`文件类型或大小无效：${path}`);
  const rel=relative(await realpath(root),await realpath(at));requireValue(rel&&!rel.startsWith('..'+sep)&&!rel.startsWith(sep),`资源越界：${path}`);
  return readFile(at);
}
function manifest(value){
  requireValue(value&&[1,2].includes(value.schemaVersion), 'manifest.schemaVersion 必须为 1 或 2');
  requireValue(typeof value.id==='string'&&/^[a-z][a-z0-9.-]{1,79}$/.test(value.id)&&!value.id.includes('..')&&!['constructor','prototype','app-store','conversations','markdown','git'].includes(value.id),'应用 ID 无效或为官方保留 ID');
  requireValue(typeof value.version==='string'&&/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value.version)&&value.version.split('.').every(p=>Number.isSafeInteger(Number(p))),'版本必须为数值 x.y.z');
  requireValue(value.sdkVersion===value.schemaVersion,'SDK 与清单版本不兼容');
  requireValue(typeof value.name==='string'&&value.name.length>0&&value.name.length<=80&&typeof value.description==='string'&&value.description.length<=2000,'名称或说明无效');
  requireValue(Array.isArray(value.permissions)&&value.permissions.every(p=>typeof p==='string'),'permissions 必须为字符串数组');
  const window=value.schemaVersion===1?value.frontend:value.window,cards=value.cards??[];
  requireValue(Array.isArray(cards)&&cards.length<=64&&(window||cards.length),'必须声明窗口或卡片');
  const ids=new Set();for(const card of cards){requireValue(card&&typeof card.id==='string'&&!ids.has(card.id),'卡片 ID 必须唯一');ids.add(card.id);}
  const entries=[window,...cards].filter(Boolean).flatMap(e=>[e.entry,...(e.styles??[])]);
  if(value.backend){requireValue(value.backend.runtime==='node','后端仅支持 node');entries.push(value.backend.entry);}
  requireValue(entries.every(e=>safe(e)&&/^(frontend|backend)\//.test(e)),'前后端入口路径无效');
  return entries;
}
function unpack(bytes,declared){
  const pack=JSON.parse(gunzipSync(bytes,{maxOutputLength:96*MiB}).toString('utf8'));
  requireValue(pack.protocol==='ksf-app-package-v1'&&isDeepStrictEqual(pack.manifest,declared),'包协议或包内 manifest 与索引不一致');
  const entries=manifest(pack.manifest),files=pack.files;
  requireValue(files&&typeof files==='object'&&!Array.isArray(files)&&Object.keys(files).length>0&&Object.keys(files).length<=2000,'包文件数量无效');
  const names=new Set();let total=0;
  for(const [path,file] of Object.entries(files)){
    requireValue(safe(path)&&/^(frontend|backend)\//.test(path)&&!names.has(path.toLowerCase()),`包内路径无效或重复：${path}`);names.add(path.toLowerCase());
    requireValue(file&&typeof file.content==='string'&&file.content.length%4===0&&/^[A-Za-z0-9+/]*={0,2}$/.test(file.content)&&[420,493].includes(file.mode),'包文件内容或模式无效');
    const decoded=Buffer.from(file.content,'base64');total+=decoded.length;requireValue(total<=96*MiB&&sha(decoded)===file.sha256,`包文件摘要无效：${path}`);
  }
  requireValue(entries.every(e=>Object.hasOwn(files,e)),'包缺少声明入口');
}
export async function check(root=resolve(dirname(fileURLToPath(import.meta.url)),'../store')){
  const bytes=await asset(root,'index.json',2*MiB),index=JSON.parse(bytes);
  requireValue(index.protocol==='ksf-app-registry-v1'&&Array.isArray(index.apps)&&index.apps.length<=500,'索引协议或条目数无效');
  const seen=new Set();let images=0;
  for(const entry of index.apps){
    manifest(entry.manifest);const key=[entry.manifest.id,entry.manifest.version,entry.manifest.target??'*',entry.manifest.nodeAbi??'*'].join(':');requireValue(!seen.has(key),`重复版本或平台：${key}`);seen.add(key);
    const pkg=entry.package;requireValue(pkg&&typeof pkg.url==='string'&&pkg.url.startsWith('packages/')&&pkg.url.endsWith('.ksfapp')&&Number.isSafeInteger(pkg.size)&&pkg.size>0&&pkg.size<=32*MiB&&/^[a-f0-9]{64}$/.test(pkg.sha256),'包引用无效');
    const data=await asset(root,pkg.url,32*MiB);requireValue(data.length===pkg.size&&sha(data)===pkg.sha256,`包大小或摘要不符：${pkg.url}`);unpack(data,entry.manifest);
    const listing=entry.listing;if(listing===undefined)continue;
    requireValue(listing&&typeof listing==='object'&&!Array.isArray(listing),'listing 必须为对象');
    for(const [name,max] of [['subtitle',120],['description',12000],['releaseNotes',8000]])requireValue(listing[name]===undefined||typeof listing[name]==='string'&&listing[name].length<=max,`listing.${name} 无效`);
    requireValue(listing.screenshots===undefined||Array.isArray(listing.screenshots)&&listing.screenshots.length<=8,'最多 8 张截图');
    for(const image of [listing.icon,...(listing.screenshots??[])].filter(i=>i!==undefined)){
      requireValue(image&&/^media\/[a-f0-9]{64}\.(png|jpg|webp)$/.test(image.url)&&image.url.split('/')[1].split('.')[0]===image.sha256&&Number.isSafeInteger(image.size)&&image.size>0&&image.size<=8*MiB&&(image.alt===undefined||typeof image.alt==='string'&&image.alt.length<=200),'图片引用无效');
      const data=await asset(root,image.url,8*MiB);requireValue(data.length===image.size&&sha(data)===image.sha256,'图片大小或摘要不符');
      const png=data.length>=8&&data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),jpg=data.length>=3&&data[0]===255&&data[1]===216&&data[2]===255,webp=data.length>=12&&data.toString('ascii',0,4)==='RIFF'&&data.toString('ascii',8,12)==='WEBP';
      requireValue(image.url.endsWith('.png')?png:image.url.endsWith('.jpg')?jpg:webp,'图片实际格式与扩展名不符');images++;
    }
    for(const image of listing.screenshots??[])requireValue(typeof image.alt==='string'&&image.alt.trim(),'截图需要替代文字');
  }
  return{ok:true,releases:index.apps.length,images};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))try{console.log(JSON.stringify(await check(process.argv[2]),null,2));}catch(error){console.error(error.message);process.exitCode=1;}
