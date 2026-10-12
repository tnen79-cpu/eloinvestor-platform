const editable=['title','name','title_ar','title_en','description','description_ar','description_en','category','sector','category_id','project_type','opportunity_type','country_code','governorate','city','location','map_lat','map_lng','latitude','longitude','price','monthly_profit','expected_monthly_profit','roi','profit_percentage','funding_amount','required_funding','funding_percent','funding_percentage','partnership_share','partnership_percentage','franchise_fee','employees_count','operating_years','payback_months','phone_country_code','whatsapp_country_code','contact_phone','contact_whatsapp','phone','whatsapp','cover_image_url','image_url','slug'];
export function sanitizeProjectInput(input:unknown){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Invalid project input');
 const source=input as Record<string,unknown>;const result:Record<string,any>={};for(const key of editable){const v=source[key];if(v===null||typeof v==='string'||typeof v==='number')result[key]=v;}
 const title=String(result.title||result.title_ar||'').trim(),description=String(result.description||result.description_ar||'').trim();
 if(title.length<5||title.length>160||description.length<80||description.length>12000)throw new Error('أدخل عنوانًا من 5 إلى 160 حرفًا ووصفًا من 80 إلى 12000 حرف.');
 for(const key of ['price','monthly_profit','expected_monthly_profit','roi','funding_amount','required_funding']){if(result[key]!=null&&(!Number.isFinite(Number(result[key]))||Math.abs(Number(result[key]))>1e12))throw new Error('القيم المالية غير صالحة.');}
 if(Number(result.price)<0)throw new Error('السعر لا يمكن أن يكون سالبًا.');
 result.title=title;result.description=description;return result;
}
export function projectOwnership(row:Record<string,unknown>,userId:string){const key=['owner_auth_id','user_auth_id','user_id','owner_id','created_by','auth_id'].find(k=>row[k]!=null&&row[k]!=='');return key&&String(row[key])===userId?key:null;}
