module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET'&&req.method!=='POST')return res.status(405).json({ok:false});
 const url=process.env.MARKETING_BRIDGE_URL,secret=process.env.MARKETING_BRIDGE_SECRET;
 if(!url||!secret)return res.status(503).json({ok:false,stage:'config'});
 try{
  const c=new AbortController(),t=setTimeout(()=>c.abort(),24000);
  let r;try{r=await fetch(url,{method:'POST',redirect:'follow',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(req.method==='POST'?{key:secret,action:'updateContinuation',ic:'IPGSBRIDGEINTEGRATIONTEST20261029',name:'BRIDGE TEST - REMOVE',status:'Pending Follow-up',reason:'Temporary integration validation',updatedBy:'IPGS integration validation'}:{key:secret,action:'reconcile'}),signal:c.signal})}finally{clearTimeout(t)}
  const v=await r.json();
  if(!r.ok||!v.ok)return res.status(502).json({ok:false,stage:'bridge',error:String(v.error||'bridge error').slice(0,160)});
  if(req.method==='POST')return res.status(200).json({ok:true,writeVerified:v.continuation?.status==='Pending Follow-up'});
  const n=v.summary||{},b=n.applicationBreakdown||{},total=Object.values(b).reduce((a,x)=>a+x,0);
  return res.status(200).json({ok:true,checks:{breakdownAvailable:Object.keys(b).length>0,appliedBalanced:total===n.applied,internalBalanced:n.internalFromPreview+n.internalOutsidePreview===n.internalTotalActive,continuationReadable:Array.isArray(v.candidates)&&v.candidates.some(x=>x.continuation)},sourceStatus:'live'});
 }catch(e){return res.status(502).json({ok:false,stage:'request',error:String(e.message).slice(0,130)})}
};