const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {parseHTML}=require('linkedom');
const base=require('node:path').resolve(__dirname,'..')+'/';
function env(page,url){
 const {window,document}=parseHTML(fs.readFileSync(base+page,'utf8'));
 const location=new URL(url),store=new Map();
 const history={pushState(_,__,href){const u=new URL(href,location);location.href=u.href;}};
 const sandbox={window,document,location,history,URL,URLSearchParams,CustomEvent:window.CustomEvent,console,setTimeout,clearTimeout,sessionStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},getSessionUser:async()=>({id:'investor'})};
 window.getSessionUser=sandbox.getSessionUser;window.location=location;window.history=history;window.HTMLElement.prototype.scrollIntoView=function(){};
 const context=vm.createContext(sandbox);
 for(const f of ['marketplace-core.js','investor-core.js','investor-tools.js','compare.js'])vm.runInContext(fs.readFileSync(base+'assets/js/'+f,'utf8'),context);
 return {window,document,context};
}
function query(rows,{fail=false,onUpsert}={}){let calls=0;
 const client={rpc:async()=>({data:true,error:null}),from(table){return {select(){return this},in(){return this},order(){return this},range(a,b){calls++;return Promise.resolve(fail?{error:{message:'offline'}}:{data:rows.slice(a,b+1)})},upsert:async()=>{onUpsert?.();return {error:{message:'RLS denied'}};}}}};
 return {client,calls:()=>calls};
}
(async()=>{
 const rows=Array.from({length:501},(_,i)=>({id:'project-'+i,title:'Cafe '+i,category:'restaurants',location:'مسقط',type:'مشروع للبيع',price:25000,monthly_profit:500,verification_status:'verified'}));
 const e=env('opportunities.html','https://example.test/opportunities.html?category=مطاعم&max=25000');
 const q=query(rows);e.window.supabaseClient=q.client;
 vm.runInContext(fs.readFileSync(base+'assets/js/marketplace-features.js','utf8'),e.context);
 await e.window.loadMarketplaceProjects();
 assert.equal(q.calls(),2,'range pagination loads beyond default cap');
 assert.equal(e.document.querySelector('[data-results-count]').textContent,'501');
 assert.equal(e.document.querySelectorAll('.market-card').length,12);
 assert.equal(e.document.querySelectorAll('.market-card a button').length,0,'no interactive buttons nested in image links');
 const pager=e.document.querySelector('[data-page="2"]');pager.click();
 assert.equal(e.document.querySelector('.market-card').dataset.projectId,'project-12');
 // Search submission merges the toolbar and sidebar and clears unchecked flags.
 const forms=e.document.querySelectorAll('[data-market-search]');
 forms[0].reportValidity=()=>true;
 forms[0].querySelector('[name=q]').value='Cafe';
 forms[1].querySelector('[name=min]').value='100';
 forms[1].querySelector('[name=verified]').checked=true;
 // linkedom exposes select.name/value differently from browsers; supply DOM-compatible properties.
 e.document.querySelectorAll('select').forEach(select=>{Object.defineProperty(select,'name',{value:select.getAttribute('name')});Object.defineProperty(select,'value',{value:select.getAttribute('name')==='category'?'restaurants':select.getAttribute('name')==='sort'?'new':'',writable:true});});
 forms[0].dispatchEvent(new e.window.Event('submit',{bubbles:true,cancelable:true}));
 assert.equal(new URL(e.window.location.href).searchParams.get('category'),'restaurants');
 assert.equal(new URL(e.window.location.href).searchParams.get('min'),'100');
 assert.equal(new URL(e.window.location.href).searchParams.get('verified'),'1');
 forms[1].querySelector('[name=verified]').checked=false;
 forms[0].dispatchEvent(new e.window.Event('submit',{bubbles:true,cancelable:true}));
 assert.equal(new URL(e.window.location.href).searchParams.get('verified'),null);
 // Compare delegates dynamically added cards and persists IDs only.
 e.document.querySelector('[data-compare-project]').click();
 assert.equal(e.document.querySelector('[data-compare-tray]').hidden,false);
 assert.equal(e.document.querySelector('[data-compare-tray] a').getAttribute('aria-disabled'),'true');
 e.document.querySelectorAll('[data-compare-project]')[1].click();
 assert(!e.document.querySelector('[data-compare-tray] a').hasAttribute('aria-disabled'));
 // Database error cannot be mistaken for a successful save.
 e.document.querySelector('[data-save-card]').click();await new Promise(r=>setTimeout(r,5));
 assert.equal(e.document.querySelector('[data-save-card]').textContent,'♡');
 assert.match(e.document.querySelector('.alo-toast').textContent,/تعذر/);
 const err=env('opportunities.html','https://example.test/opportunities.html');err.window.supabaseClient=query([],{fail:true}).client;
 vm.runInContext(fs.readFileSync(base+'assets/js/marketplace-features.js','utf8'),err.context);
 await err.window.loadMarketplaceProjects();assert(err.document.querySelector('[data-retry-market]'));assert.equal(err.document.querySelector('[data-results-count]').textContent,'—');
 const compare=env('compare.html','https://example.test/compare.html?ids=a,b,a,c,d');let wanted;
 compare.window.supabaseClient={from(){return {select(){return this},in(k,v){if(k==='id')wanted=v;return k==='status'?Promise.resolve({data:[{id:'a',title:'<script>alert(1)</script>',price:25000,monthly_profit:500},{id:'b',title:'B',price:1000}]}):this;}}}};
 await compare.window.AloCompare.load();assert.equal(wanted.length,3);assert(!compare.document.querySelector('[data-comparison-table] script'));assert.match(compare.document.querySelector('[data-comparison-table]').textContent,/24%/);assert.match(compare.document.querySelector('[data-comparison-table]').textContent,/لم تعد/);
 console.log('DOM integration tests passed: multi-range loading, paging, comparison, escaping, load/save failures.');
})().catch(e=>{console.error(e);process.exitCode=1});
