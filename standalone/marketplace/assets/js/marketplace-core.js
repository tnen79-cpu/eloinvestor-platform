// Shared, deterministic marketplace rules. No database or DOM dependencies.
(function(root){
  const norm=v=>String(v??'').toLowerCase().replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').trim();
  const aliases={restaurants:['restaurants','مطاعم','مطاعم ومقاهي'],tech:['tech','تقنية'],commerce:['commerce','تجارة'],services:['services','خدمات'],contracting:['contracting','مقاولات'],realestate:['realestate','عقارات']};
  const category=v=>Object.keys(aliases).find(k=>aliases[k].some(a=>norm(a)===norm(v)))||norm(v);
  const num=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))?Number(v):null;
  function roi(p){
    for(const key of ['roi','expected_roi','return_rate','annual_return']) { const n=num(p[key]); if(n!==null) return Math.round(n*10)/10; }
    const price=num(p.price),profit=num(p.monthly_profit);
    return price>0&&profit!==null?Math.round(profit*12/price*1000)/10:null;
  }
  const verified=p=>p.verification_status==='verified';
  const filterKeys=['q','category','location','type','verified','min','max','roiMin','sort'];
  function filters(params){return Object.fromEntries(filterKeys.map(k=>[k,params.get(k)|| (k==='category'?params.get('cat'):'') || (k==='sort'?'new':'')]));}
  function matches(p,f){
    if(f.q&&!norm([p.title,p.description,p.location,p.category,p.type].join(' ')).includes(norm(f.q)))return false;
    if(f.category&&category(p.category)!==category(f.category))return false;
    if(f.location&&!norm(p.location).includes(norm(f.location)))return false;
    if(f.type&&!norm(p.type).includes(norm(f.type)))return false;
    if(f.verified==='1'&&!verified(p))return false;
    const price=num(p.price),r=roi(p);
    if(f.min!==''&&f.min!=null&&(price===null||price<Number(f.min)))return false;
    if(f.max!==''&&f.max!=null&&(price===null||price>Number(f.max)))return false;
    if(f.roiMin!==''&&f.roiMin!=null&&(r===null||r<Number(f.roiMin)))return false;
    return true;
  }
  function sort(rows,key){
    const a=[...rows],missing=(v,fallback)=>v===null?fallback:v;
    if(key==='price_asc')a.sort((x,y)=>missing(num(x.price),Infinity)-missing(num(y.price),Infinity));
    else if(key==='price_desc')a.sort((x,y)=>missing(num(y.price),-Infinity)-missing(num(x.price),-Infinity));
    else if(key==='roi_desc')a.sort((x,y)=>missing(roi(y),-Infinity)-missing(roi(x),-Infinity));
    else if(key==='hot')a.sort((x,y)=>(Number(y.views_count||0)+Number(y.contacts_count||0)*10)-(Number(x.views_count||0)+Number(x.contacts_count||0)*10));
    else a.sort((x,y)=>(Date.parse(y.created_at)||0)-(Date.parse(x.created_at)||0));
    return a;
  }
  const api={norm,category,num,roi,verified,filters,matches,sort,filterKeys};
  root.AloMarket=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
