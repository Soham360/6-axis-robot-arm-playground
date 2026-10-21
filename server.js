import http from 'node:http';
import {handleAssistant} from './assistant-api.js';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.dirname(fileURLToPath(import.meta.url));
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'};
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const importMap=html.match(/<script type="importmap">([\s\S]*?)<\/script>/)?.[1]??'';
const hash=createHash('sha256').update(importMap).digest('base64');
const csp=`default-src 'self'; script-src 'self' https://cdn.jsdelivr.net 'sha256-${hash}'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self'; worker-src 'self'`;
export const server=http.createServer((req,res)=>{
  if(req.url.split("?")[0]==="/api/assistant"){handleAssistant(req,res).catch(()=>{if(!res.headersSent)res.writeHead(500,{"Content-Type":"application/json"});res.end(JSON.stringify({error:"Assistant unavailable."}))});return}
  if(!["GET","HEAD"].includes(req.method)){res.writeHead(405).end();return}
  let file;
  try{
    const relative=decodeURIComponent(req.url.split('?')[0]);
    file=path.resolve(root,'.'+(relative==='/'?'/index.html':relative));
  }catch{res.writeHead(400).end('Bad request');return}
  if(!file.startsWith(root+path.sep)||file.split(path.sep).some(p=>p.startsWith('.'))){res.writeHead(403).end();return}
  fs.readFile(file,(err,data)=>{
    if(err){res.writeHead(404).end('Not found');return}
    res.writeHead(200,{'Content-Type':types[path.extname(file)]??'application/octet-stream','Content-Security-Policy':csp});
    res.end(data);
  });
}).listen(Number(process.env.PORT??5173),'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${server.address().port}`));
