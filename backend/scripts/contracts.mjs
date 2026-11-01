import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { planPayloadSchema, contentPayloadSchema } from '../contracts/payloads.ts';

function typeFor(schema) {
  if (schema.const !== undefined) return JSON.stringify(schema.const);
  if (schema.enum) return schema.enum.map(value => JSON.stringify(value)).join(' | ');
  if (schema.anyOf) return schema.anyOf.map(typeFor).join(' | ');
  if (Array.isArray(schema.type)) return schema.type.map(type => typeFor({ ...schema, type })).join(' | ');
  switch (schema.type) {
    case 'string': return 'string';
    case 'number': case 'integer': return 'number';
    case 'boolean': return 'boolean';
    case 'null': return 'null';
    case 'array': return `Array<${typeFor(schema.items ?? {})}>`;
    case 'object': {
      if (!schema.properties) throw new Error('Contract objects must declare their properties');
      return `{ ${Object.entries(schema.properties).map(([name, property]) => `${JSON.stringify(name)}${schema.required?.includes(name) ? '' : '?'}: ${typeFor(property)};`).join(' ')} }`;
    }
    case undefined:
      if (Object.keys(schema).some(key => !['$schema', 'description'].includes(key))) throw new Error('Unsupported JSON schema in contract generation');
      return 'unknown';
    default: throw new Error(`Unsupported JSON schema type: ${schema.type}`);
  }
}

const schemas = { PlanPayload: z.toJSONSchema(planPayloadSchema), ContentPayload: z.toJSONSchema(contentPayloadSchema) };
const json = JSON.stringify(schemas, null, 2) + '\n';
const fingerprint = createHash('sha256').update(json).digest('hex');
const types = `export const contractSchemaFingerprint = ${JSON.stringify(fingerprint)};\n\n${Object.entries(schemas).map(([name, schema]) => `export type ${name} = ${typeFor(schema)};`).join('\n\n')}\n`;
const directory = new URL('../../frontend/lib/generated/', import.meta.url);
for (const [name, expected, destination] of [
  ['contracts.ts', types, new URL('contracts.ts', directory)],
  ['payload-schemas.json', json, new URL('../contracts/payload-schemas.json', import.meta.url)]
]) {
  if (process.argv.includes('--check')) {
    let existing;
    try { existing = await readFile(destination, 'utf8'); } catch { throw new Error(`Missing generated contract ${name}; run npm run contracts:generate`); }
    if (existing !== expected) throw new Error(`Stale generated contract ${name}; run npm run contracts:generate and review the schema change`);
  } else {
    await mkdir(directory, { recursive: true });
    await writeFile(destination, expected);
  }
}
console.log(`Payload contracts ${process.argv.includes('--check') ? 'verified' : 'generated'}: ${fingerprint}`);
