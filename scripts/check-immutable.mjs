import {execFileSync} from 'node:child_process';
const base=process.argv[2]??'';
if(!/^[a-f0-9]{40}$/.test(base)||/^0+$/.test(base)){console.log('Initial publication: no prior release data.');process.exit(0);}
execFileSync('git',['cat-file','-e',base+'^{commit}']);
const rows=execFileSync('git',['diff','--name-status','--no-renames','-z',base,'HEAD','--','releases','store/packages'],{encoding:'utf8'}).split('\0').filter(Boolean);
for(let i=0;i<rows.length;i+=2)if(rows[i]!=='A')throw Error('Published release data is immutable: '+rows[i+1]+'; add a new version instead.');
console.log('Previously published release data preserved.');

