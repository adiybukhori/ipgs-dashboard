const crypto=require('node:crypto');
function authorised(req){
 const expected=String(process.env.DANIA_AGENT_REPORT_TOKEN||'');
 const given=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
 if(expected.length<32||given.length!==expected.length)return false;
 return crypto.timingSafeEqual(Buffer.from(given),Buffer.from(expected));
}
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({ok:false,error:'Method not allowed'});
 if(!process.env.DANIA_AGENT_REPORT_TOKEN||!process.env.MARKETING_BRIDGE_URL||!process.env.MARKETING_BRIDGE_SECRET)
   return res.status(503).json({ok:false,error:'DANIA report integration not configured'});
 if(!authorised(req))return res.status(401).json({ok:false,error:'Unauthorised agent'});
 const b=req.body||{};
 const sourceRef=String(b.sourceRef||'').trim().toUpperCase(),event=String(b.event||'').trim().toUpperCase(),
       outcome=String(b.outcome||'').trim().toUpperCase(),messageId=String(b.messageId||'').trim(),remark=String(b.remark||'').trim();
 if(!/^IPGS-[A-Z0-9-]{5,50}$/.test(sourceRef)||
    !['FIRST_CONTACT','FOLLOWUP','REPLY','OPT_OUT','ERROR'].includes(event)||
    !['PROVIDER_ACCEPTED','RECEIVED','SUPPRESSED','BLOCKED','FAILED'].includes(outcome)||
    messageId.length>150||remark.length>800||(outcome==='PROVIDER_ACCEPTED'&&!messageId))
   return res.status(400).json({ok:false,error:'Invalid DANIA follow-up event'});
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
 try{
  const response=await fetch(process.env.MARKETING_BRIDGE_URL,{
   method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},redirect:'follow',signal:controller.signal,
   body:JSON.stringify({key:process.env.MARKETING_BRIDGE_SECRET,action:'recordDaniaFollowup',
     sourceRef,event,outcome,messageId,remark})
  });
  const value=await response.json();
  if(!response.ok||!value.ok)return res.status(502).json({ok:false,error:'Marketing bridge rejected DANIA event'});
  return res.status(200).json({ok:true,sourceRef,queueStatus:value.queueStatus||'',idempotent:value.idempotent===true});
 }catch(e){return res.status(502).json({ok:false,error:'DANIA report bridge unavailable'});}
 finally{clearTimeout(timer)}
};
