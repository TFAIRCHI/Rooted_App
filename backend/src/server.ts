import { buildApp } from './app.js';
import { config } from './infrastructure/config.js';

const app = await buildApp();
await app.listen({port:config().port,host:process.env.HOST ?? '127.0.0.1'});
for (const signal of ['SIGINT','SIGTERM'] as const) process.on(signal,async()=>{await app.close();process.exit(0);});
