// Study-only driver; imports the shared fake without modifying candidate code.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { FakeObs, SYNTHETIC_PASSWORD, PNG_BASE64 } from '../fixture/fake-obs.mjs';
import { McpProcess } from '../fixture/mcp-process.mjs';

const id = process.argv[2];
const root = new URL('../', import.meta.url);
const adapter = JSON.parse(await readFile(new URL(`adapters/${id}.json`, root)));
const fake = await FakeObs.start();
const home = `/tmp/obs-study-ts/${id}/.study-extended`;
await mkdir(home, {recursive: true});
const launch = structuredClone(adapter.launch);
for (const key of Object.keys(launch.env)) launch.env[key] = launch.env[key].replace('{{obsUrl}}',fake.url).replace('{{obsPassword}}',SYNTHETIC_PASSWORD);
const mcp = McpProcess.start(launch,{home,tempDirectory:home,defaultTimeoutMs:12000});
const observations=[];
const nested={newKind:{unknown:true,nested:[1,null,{value:'keep'}]},scalar:0};
async function call(label,tool,args,expectedRequest,expectedData) {
  const before=fake.requests.length;
  let result,error;
  try { result=await mcp.callTool(tool,args); } catch(e) {error=e.message;}
  const requests=fake.requests.slice(before);
  const sent=requests.find(x=>x.requestType===expectedRequest);
  observations.push({label,tool,args,result,error,requests,expectedRequest,expectedData,
    forwardingMatches:expectedData===undefined?undefined:JSON.stringify(sent?.requestData)===JSON.stringify(expectedData)});
}
try {
  await mcp.initialize(); await mcp.listTools();
  // Startup is asynchronous in these implementations. Give the loopback handshake time.
  await new Promise(r=>setTimeout(r,250));
  if(id==='royshil'||id==='tom') {
    await call('nested input write','obs-set-input-settings',{inputName:'Mic/Aux',inputSettings:nested,overlay:true},'SetInputSettings',{inputName:'Mic/Aux',inputSettings:nested,overlay:true});
    await call('nested input read','obs-get-input-settings',{inputName:'Mic/Aux'},'GetInputSettings');
    await call('nested filter write','obs-set-source-filter-settings',{sourceName:'Mic/Aux',filterName:'Synthetic Color',filterSettings:nested,overlay:true},'SetSourceFilterSettings',{sourceName:'Mic/Aux',filterName:'Synthetic Color',filterSettings:nested,overlay:true});
    await call('nested filter read','obs-get-source-filter',{sourceName:'Mic/Aux',filterName:'Synthetic Color'},'GetSourceFilter');
    await call('nested output write','obs-set-output-settings',{outputName:'adv_file_output',outputSettings:nested},'SetOutputSettings',{outputName:'adv_file_output',outputSettings:nested});
    await call('nested output read','obs-get-output-settings',{outputName:'adv_file_output'},'GetOutputSettings');
    await call('transition write','obs-set-transition-settings',{transitionSettings:nested},'SetCurrentSceneTransitionSettings',{transitionSettings:nested});
    await call('transition read','obs-get-transition-settings',{},'GetCurrentSceneTransitionSettings');
    await call('named scene canvas forwarding','obs-set-current-scene',{sceneName:'Main',sceneUuid:'scene-main',canvasUuid:'canvas-program'},'SetCurrentProgramScene',{sceneName:'Main',sceneUuid:'scene-main',canvasUuid:'canvas-program'});
    await call('named UUID-only input selector','obs-get-input-mute',{inputUuid:'input-mic-aux'},'GetInputMute',{inputUuid:'input-mic-aux'});
    await call('stream service secret surface','obs-get-stream-service-settings',{},'GetStreamServiceSettings');
    const screenshotPath = `${home}/screenshot.png`;
    await call('save screenshot alternative','obs-save-source-screenshot',{sourceName:'Main',imageFormat:'png',imageFilePath:screenshotPath},'SaveSourceScreenshot');
    try { observations.push({label:'saved screenshot exact PNG verification',complete: (await readFile(screenshotPath)).equals(Buffer.from(PNG_BASE64,'base64'))}); } catch(e) {observations.push({label:'saved screenshot exact PNG verification',error:e.message});}
    if(id==='tom') {
      await call('generic UUID input selector','obs-call-request',{requestType:'GetInputMute',requestData:{inputUuid:'input-mic-aux'}},'GetInputMute',{inputUuid:'input-mic-aux'});
      await call('generic canvas forwarding','obs-call-request',{requestType:'SetCurrentProgramScene',requestData:{sceneName:'Main',sceneUuid:'scene-main',canvasUuid:'canvas-program'}},'SetCurrentProgramScene',{sceneName:'Main',sceneUuid:'scene-main',canvasUuid:'canvas-program'});
      await call('canvas list','obs-get-canvas-list',{},'GetCanvasList');
    }
  } else if(id==='lars') {
    await call('audio discovery volume','list_audio_inputs',{},'GetInputVolume');
    await call('set volume invalid type','set_volume',{input_name:'Mic/Aux',volume:'wrong'},'SetInputVolume');
  } else if(id==='yshk') {
    await call('advertised optional screenshot fields omitted','TakeSourceScreenshot',{params:{source:'Main'}},'SaveSourceScreenshot');
    await call('shader nested settings schema','SetShaderFilter',{params:{sourceName:'Mic/Aux',filterName:'Synthetic Color',shaderCode:'fixture',shaderParameters:nested}},'SetSourceFilterSettings');
    await call('transition wrapped params','SetTransitionSettings',{params:{transitionName:'Fade',transitionDuration:400}},'SetCurrentSceneTransition');
    await call('create source nested settings schema','CreateSource',{params:{sceneName:'Main',sourceName:'New Fixture',sourceKind:'image_source',sourceSettings:nested,setVisible:true}},'CreateInput');
  }
} finally {
  await mcp.stop(); await fake.close();
  const result={candidateId:id,observedAt:new Date().toISOString(),observations,requests:fake.requests,stateChanges:fake.stateChanges,mcp:mcp.sanitizedTrace()};
  await writeFile(new URL(`results/${id}-extended.json`,root),JSON.stringify(result,null,2).split(SYNTHETIC_PASSWORD).join('[REDACTED_SYNTHETIC_SECRET]')+'\n');
}
