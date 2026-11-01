import { test, expect } from '@playwright/test';
test('guided co-writer resumes and creates three fully populated drafts through real worker and database',async({page})=>{
  test.setTimeout(90000);
  const church='10000000-0000-4000-8000-000000000001',prefix=`/api/v1/churches/${church}`;
  await page.goto('/api/v1/auth/login?persona=contributor');await page.waitForURL(url=>!url.pathname.startsWith('/api/'));
  await page.goto(`/studies?church=${church}`);
  const workspace=await(await page.request.get(prefix+'/workspace')).json();
  const launcher=page.getByRole('button',{name:'Plan studies with co-writer'});
  await expect(page.locator('.cowriter-launcher:visible').first()).toBeVisible();
  // A selected day may own the floating launcher; its assistant provides the same church-level entry.
  if(await launcher.isVisible())await launcher.click();else{await page.getByRole('button',{name:'Open study co-writer'}).click();await page.getByRole('button',{name:'Co-writer menu',exact:true}).click();await page.getByRole('button',{name:'Plan studies · create a multi-day draft set'}).click();}
  await expect(page.getByRole('dialog',{name:'Study planning co-writer'})).toBeVisible();
  await page.getByRole('button',{name:'Expand planning panel'}).click();
  await expect(page.getByLabel('Previous planning conversations')).not.toBeVisible();
  await expect(page.getByLabel('Planning study series')).not.toBeVisible();
  await expect(page.getByLabel('Message the planning co-writer')).toBeEmpty();
  await page.getByLabel('Message the planning co-writer').fill('Create three studies for next week from these notes: John 6:68. Trust in Jesus can coexist with honest questions. Take a faithful next step.');
  const chatResponse=page.waitForResponse(response=>response.url().endsWith('/study-workflows/chat')&&response.request().method()==='POST');
  await page.getByRole('button',{name:'Send planning message'}).click();const submitted=await chatResponse;expect(submitted.status(),await submitted.text()).toBe(200);const initial=await submitted.json();
  await expect(page.getByRole('log',{name:'Planning conversation history'})).toContainText('Who is the audience');
  await expect(page.getByRole('navigation',{name:'Co-writer tools and conversations'})).not.toBeVisible();
  await expect(page.getByLabel('Planning study series')).not.toBeVisible();
  await page.getByLabel('Message the planning co-writer').fill('Adults with varied Bible knowledge. Explain simply.');
  await page.getByLabel('Message the planning co-writer').press('Enter');
  await expect.poll(async()=>{const saved=await(await page.request.get(prefix+'/study-workflows/'+initial.id)).json();return saved.messages.length;}).toBe(4);
  await page.getByLabel('Message the planning co-writer').fill('Okay sounds great. Create these now.');
  await page.getByRole('button',{name:'Send planning message',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Have I understood your request?'})).toBeVisible();
  const before=await(await page.request.get(prefix+'/workspace')).json();expect(before.slots.length).toBe(workspace.slots.length);
  await page.getByLabel('Message the planning co-writer').fill('Make the explanations simple enough for someone new to church.');
  await page.getByRole('button',{name:'Send planning message',exact:true}).click();
  await expect(page.getByRole('log',{name:'Planning conversation history'})).toContainText('Make the explanations simple');
  await expect(page.getByRole('log',{name:'Planning conversation history'})).toContainText('I have reviewed your feedback');
  await expect(page.getByRole('button',{name:'Confirm understanding of my request'})).toBeDisabled();
  await page.getByRole('checkbox',{name:'I reviewed these notes and have permission to use them as the study grounding.'}).check();
  await page.getByRole('button',{name:'Confirm understanding of my request'}).click();
  await expect(page.getByRole('region',{name:'Proposed study day'})).toBeVisible();
  await expect(page.getByLabel('Day 1 title')).not.toBeVisible();
  await page.getByRole('button',{name:'Co-writer menu',exact:true}).click();
  await expect(page.getByLabel('Day 1 title')).toBeVisible();await expect(page.getByLabel('Day 2 title')).toHaveCount(0);
  await page.getByLabel('Central takeaway').fill('Trust includes bringing our questions honestly.');
  await page.getByRole('button',{name:'Co-writer menu',exact:true}).click();
  await page.getByRole('button',{name:'Review day 1 direction',exact:true}).click();
  await expect(page.getByRole('button',{name:'Confirm & create day 1'})).toBeVisible();
  const savedPlan=await(await page.request.get(prefix+'/study-workflows/'+initial.id)).json();expect(savedPlan.plan.direction.takeaway).toContain('bringing our questions');
  await page.reload();
  await expect(page.locator('.cowriter-launcher:visible').first()).toBeVisible();
  if(await launcher.isVisible())await launcher.click();else{await page.getByRole('button',{name:'Open study co-writer'}).click();await page.getByRole('button',{name:'Co-writer menu',exact:true}).click();await page.getByRole('button',{name:'Plan studies · create a multi-day draft set'}).click();}
  await expect(page.getByRole('button',{name:'Confirm & create day 1'})).not.toBeVisible();
  await page.getByRole('button',{name:'Co-writer menu',exact:true}).click();
  await page.getByLabel('Previous planning conversations').selectOption(initial.id);
  for(let day=1;day<=3;day++){
    if(day>1){await expect(page.getByRole('region',{name:'Proposed study day'})).toContainText(`Day ${day}:`);await page.getByRole('button',{name:`Review day ${day} direction`,exact:true}).click();}
    await page.getByRole('button',{name:`Confirm & create day ${day}`,exact:true}).click();
    await expect.poll(async()=>{const run=await(await page.request.get(prefix+'/study-workflows/'+initial.id)).json();return run.mapping.length;},{timeout:25000}).toBe(day);
    const checkpoint=await(await page.request.get(prefix+'/workspace')).json();expect(checkpoint.slots.length).toBe(workspace.slots.length+day);
    if(day<3){const run=await(await page.request.get(prefix+'/study-workflows/'+initial.id)).json();expect(run.state).toBe('direction_review');expect(run.jobs.filter((job:{state:string})=>['running','pending'].includes(job.state))).toHaveLength(0);}
  }
  await expect(page.getByRole('heading',{name:'All study days saved',exact:true})).toBeVisible({timeout:25000});
  await page.getByRole('button',{name:'Co-writer menu',exact:true}).click();
  await page.getByRole('button',{name:'New conversation',exact:true}).click();
  await page.getByLabel('Previous planning conversations').selectOption(initial.id);
  await expect(page.getByRole('log',{name:'Planning conversation history'})).toContainText('Make the explanations simple');
  const result=await(await page.request.get(prefix+'/study-workflows/'+initial.id)).json();expect(result.state).toBe('drafts_saved');expect(result.mapping).toHaveLength(3);
  await page.setViewportSize({width:390,height:844});const bounds=await page.getByRole('dialog',{name:'Study planning co-writer'}).boundingBox();expect(bounds!.x).toBeGreaterThanOrEqual(0);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(390);
  await page.screenshot({path:'frontend/test-results/workflow-mobile.png',fullPage:true});
  for(const day of result.mapping){
    const content=await(await page.request.get(prefix+'/content/'+day.contentId)).json();expect(content.status).toBe('draft');expect(content.approvalId).toBeNull();expect(content.livePublicationId).toBeNull();
    for(const field of ['title','references','body','reflection','discussionQuestion','application','outboundPreview'])expect(content.head.payload[field]?.length,field).toBeGreaterThan(0);
    await page.goto(`/studies?church=${church}&month=${day.date.slice(0,7)}&slot=${day.slotId}`);await expect(page.getByTestId('content-title')).toHaveValue(content.head.payload.title);await expect(page.getByTestId('content-body')).toHaveValue(content.head.payload.body);
    await page.reload();await expect(page.getByTestId('content-application')).toHaveValue(content.head.payload.application);
  }
  const after=await(await page.request.get(prefix+'/workspace')).json();expect(after.slots.length).toBe(workspace.slots.length+3);
  const session=await(await page.request.get('/api/v1/auth/session')).json();
  const foreign=await page.request.get(`/api/v1/churches/10000000-0000-4000-8000-000000000002/study-workflows/${initial.id}`,{headers:{'X-CSRF-Token':session.csrfToken}});expect(foreign.status()).toBe(404);
});


test('Enter sends a request without setup and the conversation survives reload',async({page})=>{
  const church='10000000-0000-4000-8000-000000000001',prefix=`/api/v1/churches/${church}`;
  await page.goto('/api/v1/auth/login?persona=contributor');await page.waitForURL(url=>!url.pathname.startsWith('/api/'));
  await page.goto(`/studies?church=${church}`);
  const before=await(await page.request.get(prefix+'/workspace')).json();
  async function openPlanning(){
    const launcher=page.getByRole('button',{name:'Plan studies with co-writer'});await expect(page.locator('.cowriter-launcher:visible').first()).toBeVisible();
    if(await launcher.isVisible())await launcher.click();else{await page.getByRole('button',{name:'Open study co-writer'}).click();await page.getByRole('button',{name:'Co-writer menu',exact:true}).click();await page.getByRole('button',{name:'Plan studies · create a multi-day draft set'}).click();}
  }
  await openPlanning();
  const request='Create a study to be delivered on Wednesday next week about the life of Paul and how the Lord radically changed his life.';
  const composer=page.getByLabel('Message the planning co-writer');await composer.fill(request);await composer.press('Shift+Enter');await expect(composer).toHaveValue(request+'\n');
  const initialBounds=await composer.boundingBox();const composerNode=await composer.elementHandle();
  const submitted=page.waitForResponse(response=>response.url().endsWith('/study-workflows/chat')&&response.request().method()==='POST');await composer.press('Enter');const response=await submitted;expect(response.status(),await response.text()).toBe(200);const run=await response.json();
  await expect(page.getByRole('log',{name:'Planning conversation history'})).toContainText(request);await expect(page.getByRole('log',{name:'Planning conversation history'})).toContainText('Who is the audience');
  await expect(page.getByRole('navigation',{name:'Co-writer tools and conversations'})).not.toBeVisible();await expect(page.getByLabel('Planning study series')).not.toBeVisible();
  const saved=await(await page.request.get(prefix+'/study-workflows/'+run.id)).json();expect(saved.plan).toBeNull();expect(saved.seriesId).toBeNull();expect(saved.mapping).toHaveLength(0);
  expect(await composerNode!.evaluate(node=>node.isConnected)).toBe(true);expect((await composer.boundingBox())!.y).toBe(initialBounds!.y);
  await expect(page.getByRole('heading',{name:'Progress',exact:true})).not.toBeVisible();await expect(page.getByText('Delete private workflow content',{exact:true})).not.toBeVisible();
  await composer.fill('Give a long reply explaining how to approach this study.');await composer.press('Enter');await expect(page.getByRole('log',{name:'Planning conversation history'})).toContainText('End of the longer reply.');
  const transcript=page.locator('.workflow-popup .cowriter-chat');expect(await transcript.evaluate(node=>node.scrollHeight>node.clientHeight)).toBe(true);
  await transcript.evaluate(node=>{node.scrollTop=0;});await expect(composer).toBeVisible();expect((await composer.boundingBox())!.y).toBe(initialBounds!.y);expect(await composerNode!.evaluate(node=>node.isConnected)).toBe(true);
  await page.screenshot({path:'frontend/test-results/cowriter-submitted-conversation.png'});
  await page.reload();await openPlanning();await page.getByRole('button',{name:'Co-writer menu',exact:true}).click();await page.getByLabel('Previous planning conversations').selectOption(run.id);
  await expect(page.getByRole('log',{name:'Planning conversation history'})).toContainText(request);await expect(page.getByRole('log',{name:'Planning conversation history'})).toContainText('Who is the audience');
  const after=await(await page.request.get(prefix+'/workspace')).json();expect(after.slots.length).toBe(before.slots.length);
});
