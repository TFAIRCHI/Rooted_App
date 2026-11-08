import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import { ZodError } from 'zod';
import { Database } from './infrastructure/database.js';
import { config } from './infrastructure/config.js';
import { authRoutes } from './auth/routes.js';
import { coreRoutes } from './api/core-routes.js';
import { registerProviderRoutes } from './api/provider-routes.js';
import { communityRoutes } from './api/community-routes.js';
import { publicCommunityRoutes } from './api/public-community-routes.js';
import { publicSmsRoutes } from './api/public-sms-routes.js';
import { onboardingRoutes } from './api/onboarding-routes.js';
import { privacyRoutes } from './api/privacy-routes.js';
import { themeRoutes } from './api/theme-routes.js';
import { dashboardRoutes } from './api/dashboard-routes.js';
import { cowriterRoutes } from './api/cowriter-routes.js';
import { studyWorkflowRoutes } from './api/study-workflow-routes.js';

export interface AppOptions { database?: Database; settings?: ReturnType<typeof config>; clock?: () => Date }

export async function buildApp(options: AppOptions = {}) {
  const settings = options.settings ?? config();
  const database = options.database ?? new Database(settings.databaseUrl);
  await database.assertRuntime();
  const app = Fastify({logger:{level:process.env.LOG_LEVEL ?? 'warn',redact:['req.headers.authorization','req.headers.cookie','res.headers.set-cookie','body']},bodyLimit:6*1024*1024});
  await app.register(cookie);
  await app.register(multipart, { limits: { files: 1, fileSize: 5_000_000, parts: 2 } });
  app.addHook('onSend',async (_request,reply,payload) => {reply.header('Cache-Control','no-store');reply.header('X-Content-Type-Options','nosniff');return payload;});
  app.setErrorHandler((error,request,reply) => {
    const failure = error as Error & {statusCode?:number;code?:string;details?:Record<string,unknown>};
    const status = error instanceof ZodError ? 422 : failure.statusCode ?? (failure.code==='23505'?409:failure.code==='23503'?422:500);
    if (failure.details?.etag) reply.header('ETag',failure.details.etag);
    return reply.code(status).send({code:error instanceof ZodError?'validation_error':status===500?'internal_error':failure.code ?? 'request_failed',message:status===500?'The request could not be completed':failure.message,requestId:request.id,...(failure.details?{details:failure.details}: {})});
  });
  app.get('/health/live',async()=>({status:'ok'}));
  app.get('/health/ready',async()=>{await database.assertSchema();return {status:'ok',database:'connected',schema:'current',tenantIsolation:'enforced'};});
  await authRoutes(app,database,settings);
  await coreRoutes(app,database,settings,options.clock ?? (()=>new Date()));
  await registerProviderRoutes(app,database,settings);
  await cowriterRoutes(app,database,settings);
  await studyWorkflowRoutes(app,database,settings,options.clock ?? (()=>new Date()));
  await communityRoutes(app,database,settings);
  await publicCommunityRoutes(app,database,settings);
  await publicSmsRoutes(app,database,settings);
  await onboardingRoutes(app,database,settings);
  await privacyRoutes(app,database,settings);
  await themeRoutes(app,database,settings);
  await dashboardRoutes(app,database,settings,options.clock ?? (()=>new Date()));
  app.addHook('onClose',async()=>{if(!options.database) await database.close();});
  return app;
}
