// Temporary, guarded write verification. Delete immediately after test.
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST'||req.headers['x-ipgs-qa-validation']!=="1e486jt12bl5rat12oez12873lh1copju5")return res.status(404).end();
 const url=process.env.MARKETING_BRIDGE_URL,secret=process.env.MARKETING_BRIDGE_SECRET;
 if(!url||!secret)return res.status(503).json({ok:false,error:'config'});
 try{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),22000);let r;
  try{r=await fetch(url,{method:'POST',redirect:'follow',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({key:secret,action:'updateContinuation',ic:'IPGSBRIDGEQA20261029TEST',name:'INTEGRATION TEST NOT STUDENT',status:'Pending Follow-up',reason:'Temporary write and readback verification; remove immediately',updatedBy:'Backend Integration Test'}),signal:controller.signal})}
  finally{clearTimeout(timer)}
  const b=await r.json();
  res.status(200).json({ok:!!b.ok,status:b.continuation?.status||null,error:String(b.error||'').slice(0,170)});
 }catch(e){res.status(502).json({ok:false,error:String(e.message).slice(0,120)})}
};