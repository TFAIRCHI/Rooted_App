import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const directory=fileURLToPath(new URL('./',import.meta.url));
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
export async function startPreview(port=4331){
  const server=createServer(async(request,response)=>{
    try{
      const pathname=decodeURIComponent(new URL(request.url,'http://127.0.0.1').pathname);
      const screenshot=pathname.startsWith('/screenshots/');
      const allowedRoot=screenshot?resolve(directory,'../screenshots'):resolve(directory);
      const target=screenshot?resolve(directory,'..','.'+pathname):resolve(directory,'.'+(pathname==='/'?'/index.html':pathname));
      if(!target.startsWith(allowedRoot+sep)||!(screenshot?['.png']:['.html','.css','.js','.svg']).includes(extname(target))||!(await stat(target)).isFile()){response.writeHead(404);response.end('Page unavailable');return;}
      response.writeHead(200,{'Content-Type':mime[extname(target)],'Cache-Control':'no-store'});response.end(await readFile(target));
    }catch{response.writeHead(404);response.end('Page unavailable');}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
  return {server,url:`http://127.0.0.1:${server.address().port}`};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const {url}=await startPreview();console.log(`Rooted public website design preview: ${url}`);console.log('Research prototype only. No authentication, email, payment, AI, or database connections.');
}
