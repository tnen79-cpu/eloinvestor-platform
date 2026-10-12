const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');const {parseHTML}=require('linkedom');
(async()=>{
 const {window}=parseHTML('<html><body><button data-interest-project>اهتمام</button><article data-doc-key="doc" data-review-revision="7"></article></body></html>');
 const calls=[],alerts=[];let fail=false,promptValue='',cleared=0;
 window.getSessionUser=async()=>({id:'investor'});window.supabaseClient={rpc:async(name,args)=>{calls.push({name,args});if(name==='review_tools_ready_v76')return{data:true};if(name==='my_interests_v76')return{data:[]};if(fail)return{error:{message:'Stale decision'}};return{data:name==='review_document_v76'?'pending':'record-id'};}};
 window.AloFlows={validate(){},requestKey:async()=>({id:'retry-id',clear(){cleared++}}),upload:async(file,bucket,owner,key)=>'storage://'+bucket+'/'+owner+'/'+key};
 const ctx={window,document:window.document,location:{pathname:'/project-details.html',search:'?id=project'},alert:x=>alerts.push(x),prompt:()=>promptValue,console};vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/../assets/js/review-v76.js','utf8'),ctx);
 await window.AloReview.bindInterest({id:'project'});const checkbox=window.document.querySelector('[data-share-contact]'),button=window.document.querySelector('[data-interest-project]');assert.equal(checkbox.checked,false);
 await button.onclick();assert.equal(calls.at(-1).name,'set_project_interest_v76');assert.equal(calls.at(-1).args.share_contact,false);checkbox.checked=true;await button.onclick();assert.equal(calls.at(-1).args.share_contact,true);
 assert.equal(await window.AloReview.reviewDoc('doc','verified',''),true);assert.equal(calls.at(-1).args.expected_revision,7);assert.match(alerts.at(-1),/قيد المراجعة/);
 fail=true;assert.equal(await window.AloReview.reviewDoc('doc','verified',''),false);assert.match(alerts.at(-1),/Stale/);fail=false;
 promptValue=null;const before=calls.length;assert.equal(await window.AloReview.reviewDoc('doc','rejected'),false);assert.equal(calls.length,before);
 await assert.rejects(window.AloReview.submitDocs([],'investor'));await assert.rejects(window.AloReview.submitDocs([{name:'a'},{name:'b'}],'investor',null,'','old-doc'));
 fail=true;await assert.rejects(window.AloReview.submitDocs([{name:'a',type:'application/pdf'}],'investor'));assert.equal(cleared,0);fail=false;
 assert.equal(await window.AloReview.submitDocs([{name:'a',type:'application/pdf'}],'investor','project','Proof','old-doc'),1);assert.equal(cleared,1);assert.equal(calls.at(-1).args.project_key,'project');assert.equal(calls.at(-1).args.replacement_key,'old-doc');
 console.log('v76 DOM passed: explicit contact consent, revision forwarding, failed/cancelled review, document retry preservation and replacement scope.');
})().catch(e=>{console.error(e.stack);process.exitCode=1});
