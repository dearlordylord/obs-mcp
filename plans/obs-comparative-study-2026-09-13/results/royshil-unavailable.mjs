// Candidate-neutral supplement: unavailable OBS request after a successful live read.
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {FakeObs,CORE_REQUESTS,SYNTHETIC_PASSWORD} from '../fixture/fake-obs.mjs';
import {McpProcess} from '../fixture/mcp-process.mjs';
const id=process.argv[2],root=new URL('../',import.meta.url);
const a=JSON.parse(await readFile(new URL(`adapters/${id}.json`,root)));
const f=await FakeObs.start({availableRequests:CORE_REQUESTS.filter(x=>!['GetSourceScreenshot','SaveSourceScreenshot'].includes(x))});
const home=`/tmp/obs-study-ts/${id.split('-')[0]}/.study-unavailable`;
await mkdir(home,{recursive:true});
function template(x){if(typeof x==='string')return x.replace('{{obsUrl}}',f.url).replace('{{obsPassword}}',SYNTHETIC_PASSWORD).replace('{{sourceName}}','Main').replace('{{imageFormat}}','png');if(Array.isArray(x))return x.map(template);if(x&&typeof x==='object')return Object.fromEntries(Object.entries(x).map(([k,v])=>[k,template(v)]));return x;}
const m=McpProcess.start(template(a.launch),{home,tempDirectory:home,defaultTimeoutMs:12000});let observations=[];
try{await m.initialize();await m.listTools();await new Promise(r=>setTimeout(r,500));
 for(const key of ['listScenes','getSourceScreenshot']){const op=a.operations[key];try{observations.push({operation:key,result:await m.callTool(op.tool,template(op.arguments))});}catch(e){observations.push({operation:key,error:e.message});}}
}finally{await m.stop();await f.close();await writeFile(new URL(`results/${id}-unavailable.json`,root),JSON.stringify({candidateId:id,observations,requests:f.requests,mcp:m.sanitizedTrace()},null,2).split(SYNTHETIC_PASSWORD).join('[REDACTED_SYNTHETIC_SECRET]')+'\n');}
