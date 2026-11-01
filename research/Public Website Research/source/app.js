// Research prototype only: no network requests, authentication, emails, payment or workspace writes.
const params=new URLSearchParams(location.search);
const intent=params.get('intent')??'signin';
function remember(key,value){try{sessionStorage.setItem(`rooted-public-design:${key}`,value);}catch{/* File previews can disable storage. */}}
function recalled(key,fallback){try{return sessionStorage.getItem(`rooted-public-design:${key}`)||fallback;}catch{return fallback;}}
function go(filename){location.assign(filename);}
document.querySelectorAll('[data-rhythm]').forEach(button=>{
  button.addEventListener('click',()=>{
    const mode=button.dataset.rhythm;
    document.querySelectorAll('[data-rhythm]').forEach(tab=>{const active=tab.dataset.rhythm===mode;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;});
    document.getElementById('after-panel').hidden=mode!=='after';document.getElementById('before-panel').hidden=mode!=='before';
  });
  button.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const target=document.querySelector(`[data-rhythm="${event.key==='Home'?'after':event.key==='End'?'before':button.dataset.rhythm==='after'?'before':'after'}"]`);target.click();target.focus();}});
});
document.querySelectorAll('[data-ai-input]').forEach(button=>{
  button.addEventListener('click',()=>{
    const mode=button.dataset.aiInput;
    document.querySelectorAll('[data-ai-input]').forEach(tab=>{const active=tab.dataset.aiInput===mode;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;});
    document.getElementById('ai-simple-panel').hidden=mode!=='simple';document.getElementById('ai-detailed-panel').hidden=mode!=='detailed';
  });
  button.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const mode=event.key==='Home'?'simple':event.key==='End'?'detailed':button.dataset.aiInput==='simple'?'detailed':'simple';const target=document.querySelector(`[data-ai-input="${mode}"]`);target.click();target.focus();}});
});
const login=document.querySelector('[data-form="sign-in"]');
login?.addEventListener('submit',event=>{event.preventDefault();if(!login.reportValidity())return;remember('email',login.elements.email.value);go(`verify.html?intent=${encodeURIComponent(intent)}`);});
const email=document.getElementById('verify-email');if(email)email.textContent=recalled('email','pastor@example.org');
const verify=document.querySelector('[data-form="verify"]');
verify?.addEventListener('submit',event=>{event.preventDefault();if(!verify.reportValidity())return;go(intent==='create'?'church-setup.html':intent==='join'?'sample-study.html':'welcome.html');});
document.querySelector('[data-resend]')?.addEventListener('click',()=>{document.querySelector('[data-feedback]').textContent='Preview only: no email was sent. Enter any six digits to explore the next screen.';});
const setup=document.querySelector('[data-form="church-setup"]');
function previewChurch(){const name=setup.elements.church.value.trim()||'Your church';document.querySelectorAll('[data-church-name]').forEach(node=>{node.textContent=name;});document.getElementById('church-link').textContent='/c/'+setup.elements.slug.value;}
setup?.addEventListener('input',previewChurch);
setup?.addEventListener('submit',event=>{event.preventDefault();if(!setup.reportValidity())return;remember('church',setup.elements.church.value);remember('slug',setup.elements.slug.value);go('welcome.html');});
if(!setup)document.querySelectorAll('[data-church-name]').forEach(node=>{node.textContent=recalled('church','Harbor Church');});
const join=document.querySelector('[data-form="find-church"]');join?.addEventListener('submit',event=>{event.preventDefault();if(!join.reportValidity())return;remember('invitation',join.elements.invitation.value);go('sign-in.html?intent=join');});
document.querySelector('[data-reflect]')?.addEventListener('click',event=>{const button=event.currentTarget;const complete=button.getAttribute('aria-pressed')!=='true';button.setAttribute('aria-pressed',String(complete));button.textContent=complete?'Reflection marked ✓':'Mark this moment of reflection ✓';document.getElementById('reflection-status').textContent=complete?'Keep coming back. There’s room to grow.':'A small beginning is still a beginning.';});
