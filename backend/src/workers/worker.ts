import { setTimeout } from 'node:timers/promises';
import { Database } from '../infrastructure/database.js';
import { config } from '../infrastructure/config.js';
import { runLocalWork } from './publication.js';
import { runProviderWork } from '../api/provider-routes.js';
import { runStudyWorkflows } from '../modules/study-workflows.js';

const database=new Database(config().databaseUrl);
await database.assertRuntime();
let stopping=false;
for(const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>{stopping=true;});
while(!stopping) {
  try {await runLocalWork(database);await runProviderWork(database,config());await runStudyWorkflows(database);}catch(error){console.error('Worker iteration failed',error instanceof Error?error.name:'unknown');}
  await setTimeout(1000);
}
await database.close();
