const fs=require('fs'),path=require('path'),vm=require('vm'),ts=require('typescript'),assert=require('node:assert/strict');
function load(file,mocks={},env={}){const mod={exports:{}};const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext(code,{module:mod,exports:mod.exports,require:n=>n in mocks?mocks[n]:require(n),process:{env},console,URL});return mod.exports;}
(async()=>{const mutations=[];let owner='other',actor='actor';
function db(){return {from(table){let data,op='read';return {
 select(){return this;},eq(){return this;},update(value){op='update';data=value;return this;},insert(value){op='insert';data=value;return this;},
 async maybeSingle(){if(table==='platform_settings')return {data:{value:'{"mode":"manual"}'}};if(op==='read')return {data:{id:'project',owner_auth_id:owner}};mutations.push({op,data});return {data:{id:'project',status:data.status}};}
 };}};}

const response={json:(data,options={})=>({status:options.status||200,data})};const api=load('app/api/projects/save/route.ts',{'@/lib/project-input':load('lib/project-input.ts'),'next/server':{NextResponse:response},'@supabase/supabase-js':{createClient:()=>({...db(),auth:{getUser:async token=>token==='valid'?{data:{user:{id:actor}}}:{data:{user:null},error:{message:'Invalid'}}}})}},{NEXT_PUBLIC_SUPABASE_URL:'https://example.supabase.co',NEXT_PUBLIC_SUPABASE_ANON_KEY:'dummy',SUPABASE_SERVICE_ROLE_KEY:'dummy-service'});
function req(body,token='valid'){return{headers:new Headers(token?{authorization:'Bearer '+token}:{}),json:async()=>body};}
const payload={title:'A valid project',description:'Honest information. '.repeat(6),price:10000,status:'approved',is_verified:true,id:'hijack',owner_auth_id:'other',views_count:999};
assert.equal((await api.POST(req({payload,projectId:'project'}))).status,403);assert.equal(mutations.length,0);assert.equal((await api.POST(req({payload},''))).status,401);
const created=await api.POST(req({payload}));assert.equal(created.status,200);assert.equal(mutations.at(-1).data.owner_auth_id,actor);assert.equal(mutations.at(-1).data.is_verified,false);assert.equal(mutations.at(-1).data.status,'pending');assert.equal(mutations.at(-1).data.views_count,undefined);assert.equal(mutations.at(-1).data.id,undefined);
owner=actor;assert.equal((await api.POST(req({payload,projectId:'project'}))).status,200);assert.equal(mutations.at(-1).op,'update');assert.equal(mutations.at(-1).data.status,'pending');console.log('Next.js project API passed: unauthenticated denial, foreign-owner denial before mutation, server moderation, protected-field stripping and owned edit.');
})().catch(e=>{console.error(e.stack);process.exitCode=1});
