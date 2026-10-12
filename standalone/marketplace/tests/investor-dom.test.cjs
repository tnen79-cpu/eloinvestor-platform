const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{parseHTML}=require('linkedom'),path=require('node:path');
const base=path.resolve(__dirname,'..')+'/';
function env(page){const {window,document}=parseHTML(fs.readFileSync(base+page,'utf8'));const location=new URL('https://test/'+page+'?category=restaurants&max=25000');window.getSessionUser=async()=>({id:'me'});const ctx=vm.createContext({window,document,location,URL,URLSearchParams,console,setTimeout,clearTimeout,Event:window.Event});for(const f of ['marketplace-core.js','investor-core.js','investor-tools.js','owner-guide.js'])vm.runInContext(fs.readFileSync(base+'assets/js/'+f,'utf8'),ctx);return {window,document,ctx};}
function fake(){
 const db={users:[{auth_id:'me',investor_preferences:{budget_max:10000,marketplace_searches:[{id:'keep',name:'Keep',filters:{q:'abc'}}]}}],investor_saved_projects:[{id:'s1',investor_auth_id:'me',project_id:'p1',created_at:'2026-01-01',project_snapshot:{title:'P',review:{stage:'review',notes:'Private',checked:['ownership']}}},{id:'other',investor_auth_id:'someone-else',project_id:'p2',project_snapshot:{review:{notes:'SECRET'}}}],projects:[{id:'p1',title:'<script>attack</script>',price:25000,monthly_profit:500,status:'approved',location:'مسقط'}]};let fail=false,conflict=false;
 class Query{
  constructor(table){this.table=table;this.op='read';this.filters=[];this.single=false;}
  select(){return this;}eq(k,v){this.filters.push(r=>{if(typeof r[k]==='object')return JSON.stringify(r[k])===v;return r[k]===v;});return this;}is(k,v){this.filters.push(r=>r[k]==v);return this;}
  in(k,list){this.filters.push(r=>list.includes(r[k]));return this;}order(){return this;}range(a,b){this.bounds=[a,b];return this;}maybeSingle(){this.single=true;return this;}update(v){this.op='update';this.value=v;return this;}
  upsert(v,opts){this.op='upsert';this.value=v;this.opts=opts;return this;}
  then(resolve,reject){return Promise.resolve().then(()=>this.exec()).then(resolve,reject);}
  exec(){if(fail)return {error:{message:'Denied'}};let rows=db[this.table].filter(r=>this.filters.every(f=>f(r)));if(this.op==='upsert'){const existing=db[this.table].find(r=>r.project_id===this.value.project_id&&r.investor_auth_id===this.value.investor_auth_id);if(!existing)db[this.table].push({id:'new',...this.value});else if(!this.opts.ignoreDuplicates)Object.assign(existing,this.value);return {data:null,error:null};}if(this.op==='update'){if(conflict)return {data:null,error:null};rows.forEach(r=>Object.assign(r,this.value));}if(this.bounds)rows=rows.slice(this.bounds[0],this.bounds[1]+1);return {data:this.single?rows[0]||null:rows,error:null};}
 }
 return {db,client:{rpc:async()=>({data:true,error:null}),from:t=>new Query(t)},setFail:v=>fail=v,setConflict:v=>conflict=v};
}
(async()=>{
 const calc=env('project-details.html');calc.window.HTMLElement.prototype.checkValidity=()=>true;calc.window.AloInvestor.calculator({price:25000,monthly_profit:500});assert.equal(calc.document.querySelectorAll('.scenario-grid article').length,3);assert.match(calc.document.querySelector('[data-scenarios]').textContent,/24.0%/);
 const blocked=env('workspace.html');blocked.window.supabaseClient={rpc:async()=>({error:{message:'missing security function'}})};await assert.rejects(blocked.window.AloInvestor.saveProject({id:'p1'}));
 const e=env('workspace.html'),q=fake();e.window.supabaseClient=q.client;
 await e.window.AloInvestor.saveProject({id:'p1',title:'Updated title'});
 assert.equal(q.db.investor_saved_projects[0].project_snapshot.review.notes,'Private','saving again preserves review');
 await e.window.AloInvestor.updatePreferences({budget_max:25000});assert.equal(q.db.users[0].investor_preferences.marketplace_searches[0].id,'keep');
 q.setConflict(true);await assert.rejects(e.window.AloInvestor.updatePreferences({budget_max:999}));assert.equal(q.db.users[0].investor_preferences.budget_max,25000);q.setConflict(false);
 await e.window.AloInvestor.loadWorkspace();assert.equal(e.document.querySelectorAll('.workspace-card').length,1);assert(!e.document.querySelector('[data-investor-workspace] script'));assert(!e.document.querySelector('[data-investor-workspace]').textContent.includes('SECRET'));
 const form=e.document.querySelector('.workspace-card form');form.querySelector('textarea').value='New note';Object.defineProperty(form.querySelector('select'),'value',{value:'offer'});
 form.dispatchEvent(new e.window.Event('submit',{bubbles:true,cancelable:true}));await new Promise(r=>setTimeout(r,5));assert.equal(q.db.investor_saved_projects[0].project_snapshot.review.notes,'New note');assert.equal(q.db.investor_saved_projects[0].project_snapshot.review.stage,'offer');
 q.setFail(true);form.dispatchEvent(new e.window.Event('submit',{bubbles:true,cancelable:true}));await new Promise(r=>setTimeout(r,5));assert.equal(form.querySelector('[data-review-status]').getAttribute('role'),'alert');
 const o=env('add-project.html');o.window.AloOwnerGuide.init();const description=o.document.querySelector('textarea[name=description]');description.value='Original description';o.document.querySelector('[data-guide-field=reason]').value='Expansion';o.document.querySelector('[data-build-description]').click();o.document.querySelector('[data-build-description]').click();assert.equal(description.value.match(/Expansion/g).length,1);assert(description.value.startsWith('Original description'));
 const searches=env('opportunities.html'),sq=fake();searches.window.supabaseClient=sq.client;await searches.window.AloInvestor.init();
 const searchForm=searches.document.querySelector('[data-investor-searches] form');searchForm.reportValidity=()=>true;searchForm.reset=()=>{};searchForm.querySelector('input').value='My restaurants';searchForm.dispatchEvent(new searches.window.Event('submit',{bubbles:true,cancelable:true}));await new Promise(r=>setTimeout(r,5));assert.equal(sq.db.users[0].investor_preferences.marketplace_searches.length,2);assert.equal(sq.db.users[0].investor_preferences.budget_max,10000);
 sq.setFail(true);searchForm.dispatchEvent(new searches.window.Event('submit',{bubbles:true,cancelable:true}));await new Promise(r=>setTimeout(r,5));assert.equal(searches.document.querySelector('[data-search-status]').getAttribute('role'),'alert');
 console.log('Investor DOM tests passed: account scope, private notes, repeat-save preservation, concurrent-write rejection, saved searches, error states, owner description.');
})().catch(e=>{console.error(e);process.exitCode=1});
