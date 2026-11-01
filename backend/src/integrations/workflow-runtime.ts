import { cowriterConfig } from './cowriter.js';
import type { OpenAIConfig } from './ai.js';
import { workflowFixtureFetch } from '../testing/workflow-model.js';
import { verificationFetch } from './workflow-verification.js';

export function studyWorkflowConfig():OpenAIConfig {
  if(process.env.ROOTED_WORKFLOW_FIXTURE==='true'){
    if(process.env.NODE_ENV!=='test'||process.env.GATHER_E2E!=='true'||process.env.EXTERNAL_SERVICES_ENABLED!=='false'||!/^http:\/\/127\.0\.0\.1:\d+$/.test(process.env.APP_ORIGIN??''))throw new Error('Workflow fixtures require the explicit isolated local test stack');
    return {apiKey:'fixture-not-a-credential',model:'gpt-5.6-luna',provider:'azure',baseUrl:'https://fixture.openai.azure.com/openai/v1',fetch:workflowFixtureFetch};
  }
  const config=cowriterConfig();
  if(process.env.STUDY_WORKFLOW_VERIFICATION==='1.2.12')return {...config,fetch:verificationFetch};
  return config;
}
