const {ok}=require('./_auth');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','private, no-store');
 if(req.method!=='POST')return res.status(405).end();
 if(!ok(req))return res.status(401).json({error:'Sign-in required'});
 const b=req.body||{};
 const allowed=['Not Set','Continuing','Pending Follow-up','Withdrawal Requested','Withdrawn','Deferred','Not Qualified'];
 if(typeof b.ic!=='string'||!b.ic.trim()||!allowed.includes(b.status)||typeof b.reason!=='string'||b.reason.length>2000)return res.status(400).json({error:'Invalid status, IC or remarks'});
 if(['Withdrawal Requested','Withdrawn','Deferred','Not Qualified'].includes(b.status)&&!b.reason.trim())return res.status(400).json({error:'Remarks required'});
 if(!process.env.MARKETING_BRIDGE_URL||!process.env.MARKETING_BRIDGE_SECRET)return res.status(503).json({error:'Bridge not configured'});
 try {
  const c=new AbortController(),t=setTimeout(()=>c.abort(),25000);let r;
  try{r=await fetch(process.env.MARKETING_BRIDGE_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({key:process.env.MARKETING_BRIDGE_SECRET,action:'updateContinuation',ic:b.ic,name:String(b.name||'').slice(0,160),status:b.status,reason:b.reason,effectiveDate:String(b.effectiveDate||'').slice(0,10),updatedBy:'Marketing Portal Staff'}),signal:c.signal,redirect:'follow'})}finally{clearTimeout(t)}
  const v=await r.json();if(!r.ok||!v.ok)return res.status(502).json({error:v.error||'Bridge write failed'});return res.status(200).json({ok:true,continuation:v.continuation});
 }catch(e){return res.status(502).json({error:'Save unavailable; bridge deployment may need updating'})}
};