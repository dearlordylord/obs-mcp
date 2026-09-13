import { readFile, writeFile, mkdtemp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { FakeObs, SYNTHETIC_PASSWORD } from './fixture/fake-obs.mjs';
import { McpProcess } from './fixture/mcp-process.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const publication = JSON.parse(await readFile(path.join(root, 'results/local-package-entry.json'), 'utf8'));
const protocol = JSON.parse(await readFile(path.join(root, 'results/official-protocol.json'), 'utf8'));
const temp = await mkdtemp(path.join(tmpdir(), 'obs-study-local-fields-'));
await mkdir(path.join(temp, 'home'));
const fake = await FakeObs.start({availableRequests: protocol.requestNames});
const mcp = McpProcess.start({
  command: process.execPath,
  args: [publication.binary],
  cwd: temp,
  env: {OBS_WEBSOCKET_URL: fake.url, OBS_WEBSOCKET_PASSWORD: SYNTHETIC_PASSWORD, TOOLSETS: 'all', OBS_WEBSOCKET_CONNECTION_TIMEOUT: '5000', MCP_AUTO_EXIT: 'true'},
}, {home: path.join(temp, 'home'), tempDirectory: temp, defaultTimeoutMs: 30000});
const observations = [];
try {
  const initialized = await mcp.initialize();
  const listed = await mcp.listTools();
  for (const [name, tool, args] of [
    ['input_nested_read', 'get_input_settings', {inputName: 'Mic/Aux'}],
    ['filter_values_read', 'get_source_filter', {sourceName: 'Main', filterName: 'Synthetic Color'}],
    ['filter_nested_write', 'set_source_filter_settings', {sourceName: 'Main', filterName: 'Synthetic Color', filterSettings: {nested: {gain: 2}}}],
    ['output_nested_read', 'get_output_settings', {outputName: 'adv_file_output'}],
    ['output_nested_write', 'set_output_settings', {outputName: 'adv_file_output', outputSettings: {encoder: {id: 'fixture-x264'}}}],
    ['transition_settings_read', 'get_current_scene_transition', {}],
    ['transition_nested_write', 'set_current_scene_transition_settings', {transitionSettings: {nested: {curve: [0, 1]}}}],
    ['canvas_scene_listing', 'list_scenes', {canvasUuid: 'fixture-canvas'}],
    ['canvas_input_creation', 'create_input', {sceneName: 'Main', canvasUuid: 'fixture-canvas', inputName: 'New', inputKind: 'color_source_v3'}],
    ['uuid_program_scene', 'set_current_scene', {sceneUuid: 'scene-main'}],
  ]) {
    const before = fake.requests.length;
    let result, error;
    try { result = await mcp.callTool(tool, args); } catch (caught) { error = caught.message; }
    observations.push({name, tool, arguments: args, result, error, obsRequests: fake.requests.slice(before)});
  }
  const record = {implementationCommit: publication.implementationCommit, packageSha256: publication.tarballSha256, initialized, listedTools: listed.tools.length, observations, fixtureUnimplemented: fake.fixtureUnimplemented, limitations: 'Targeted field-fidelity observations, not the common viability benchmark. All request names advertised to expose tools; only the fixture-supported calls or pre-dispatch schema rejections are interpreted.'};
  await writeFile(path.join(root, 'results/local-fields-runtime.json'), `${JSON.stringify(record, null, 2)}\n`);
  console.log(JSON.stringify(observations.map(x => ({name: x.name, isError: x.result?.isError ?? false, error: x.error, obsRequests: x.obsRequests.map(r => r.requestType)})), null, 2));
} catch (error) {
  const diagnostic = {error: String(error), fixtureRequests: fake.requests, mcp: mcp.sanitizedTrace()};
  await writeFile(path.join(root, 'results/local-fields-startup-diagnostic.json'), `${JSON.stringify(diagnostic, null, 2)}\n`);
  console.error(JSON.stringify(diagnostic, null, 2));
  process.exitCode = 1;
} finally {
  await mcp.stop();
  await fake.close();
  await rm(temp, {recursive: true, force: true});
}
