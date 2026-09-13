import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSONSchema } from 'effect';
import * as requests from '../../src/obs/requests.ts';
import { allTools } from '../../src/mcp/tools/index.ts';

const root = path.dirname(fileURLToPath(import.meta.url));
const protocol = JSON.parse(await readFile(path.join(root, '../../.references/protocol/obs-websocket/docs/generated/protocol.json'), 'utf8'));
function properties(schema, whole = schema, visited = new Set()) {
  const names = new Set(Object.keys(schema.properties ?? {}));
  if (schema.$ref?.startsWith('#/') && !visited.has(schema.$ref)) {
    const next = new Set([...visited, schema.$ref]);
    const target = schema.$ref.slice(2).split('/').reduce((value, key) => value?.[key.replaceAll('~1', '/').replaceAll('~0', '~')], whole);
    if (target) for (const name of properties(target, whole, next)) names.add(name);
  }
  for (const key of ['anyOf', 'oneOf', 'allOf']) for (const branch of schema[key] ?? []) for (const name of properties(branch, whole, visited)) names.add(name);
  return names;
}
const rows = protocol.requests.map(official => {
  const descriptor = Object.values(requests).find(value => value?.requestType === official.requestType);
  if (!descriptor) return {requestType: official.requestType, descriptorAbsent: true};
  const input = properties(JSONSchema.make(descriptor.requestDataSchema));
  const output = properties(JSONSchema.make(descriptor.responseSchema));
  const tools = allTools.filter(tool => tool.requiredObsRequests.includes(official.requestType));
  return {
    requestType: official.requestType,
    officialInputFields: official.requestFields.map(field => field.valueName).filter(name => !name.includes('.')),
    nestedOfficialInputFieldsNotAudited: official.requestFields.map(field => field.valueName).filter(name => name.includes('.')),
    descriptorInputFields: [...input].sort(),
    missingDescriptorInputFields: official.requestFields.map(field => field.valueName).filter(name => !name.includes('.') && !input.has(name)),
    officialResponseFields: official.responseFields.map(field => field.valueName),
    descriptorResponseFields: [...output].sort(),
    missingDescriptorResponseFields: official.responseFields.map(field => field.valueName).filter(name => !output.has(name)),
    publicTools: tools.map(tool => ({name: tool.name, inputFields: [...properties(tool.inputJsonSchema)].sort(), outputFields: [...properties(tool.outputJsonSchema)].sort()})),
  };
});
const result = {
  implementationCommit: '587e356b00d9269dcd124969ee36aad9635f2db8',
  limitations: 'Static top-level field-name comparison only. Union properties are combined; aliases, derived outputs, intentional policy, schema constraints, nested fields, and runtime forwarding require manual review. An absent field is a review lead, not automatically a bug.',
  rows,
};
await writeFile(path.join(root, 'results/local-field-audit.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(rows.filter(row => row.descriptorAbsent || row.missingDescriptorInputFields.length || row.missingDescriptorResponseFields.length), null, 2));
