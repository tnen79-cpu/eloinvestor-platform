(function(root){
 const M=root.AloMarket || (typeof require==='function'?require('./marketplace-core.js'):null);
 const checks=['ownership','license','financials','debts','lease','staff','assets','terms'];
 const stages=['shortlist','review','contact','offer','paused'];
 function scenario(price,profit,costs=0,change=0){
  const p=M.num(price),m=M.num(profit),c=M.num(costs),d=M.num(change);
  if(p===null||p<=0||m===null||c===null||c<0||d===null||d < -100)return null;
  const total=p+c,monthly=m*(1+d/100);
  return {total,monthly,annual:monthly*12,roi:monthly*12/total*100,paybackMonths:monthly>0?total/monthly:null};
 }
 function match(p,prefs={}){
  const criteria=[],lo=M.num(prefs.budget_min),hi=M.num(prefs.budget_max),price=M.num(p.price);
  if((lo!==null&&lo>0)||(hi!==null&&hi>0))criteria.push({key:'budget',pass:price!==null&&(lo===null||price>=lo)&&(!hi||price<=hi)});
  if(prefs.preferred_location)criteria.push({key:'location',pass:M.norm(p.location).includes(M.norm(prefs.preferred_location))});
  if(prefs.opportunity_type)criteria.push({key:'type',pass:M.norm(p.type).includes(M.norm(prefs.opportunity_type))});
  if(prefs.interests?.length)criteria.push({key:'sector',pass:prefs.interests.some(x=>M.category(x)===M.category(p.category))});
  return {score:criteria.length?Math.round(criteria.filter(c=>c.pass).length/criteria.length*100):null,criteria};
 }
 function review(raw={}){return {stage:stages.includes(raw.stage)?raw.stage:'shortlist',checked:[...new Set((Array.isArray(raw.checked)?raw.checked:[]).filter(c=>checks.includes(c)))],notes:String(raw.notes||'').slice(0,2000)};}
 function searches(raw){return (Array.isArray(raw)?raw:[]).filter(x=>x&&typeof x.id==='string'&&typeof x.name==='string'&&x.filters&&typeof x.filters==='object').slice(0,5).map(x=>({...x,name:x.name.slice(0,60),filters:Object.fromEntries(M.filterKeys.filter(k=>x.filters[k]!=null).map(k=>[k,String(x.filters[k]).slice(0,200)]))}));}
 const api={checks,stages,scenario,match,review,searches};root.AloInvestorCore=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
