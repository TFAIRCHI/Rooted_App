import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';

const target=new URL('../dist/migrations/',import.meta.url);
await mkdir(target,{recursive:true});
const source=new URL('../migrations/',import.meta.url);
for (const name of (await readdir(source)).filter(name=>name.endsWith('.sql'))) {
  const sql=await readFile(new URL(name,source),'utf8');
  await writeFile(new URL(name,target),sql.replace(/\r\n/g,'\n'));
}
const scriptureSource=new URL('../scripture/',import.meta.url);
const scriptureTarget=new URL('../dist/scripture/',import.meta.url);
await mkdir(scriptureTarget,{recursive:true});
for(const name of (await readdir(scriptureSource)).filter(name=>name.endsWith('.txt'))){
  await writeFile(new URL(name,scriptureTarget),await readFile(new URL(name,scriptureSource)));
}
