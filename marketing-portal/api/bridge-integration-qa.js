module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({ok:false});
 if(req.headers['x-ipgs-qa-validation']!=="IPGSQA8tyszbfi2dq647oihv9my6hx")return res.status(404).end();
 const u=process.env.MARKETING_BRIDGE_URL,k=process.env.MARKETING_BRIDGE_SECRET;
 if(!u||!k)return res.status(503).json({ok:false,stage:'config'});
 try{const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),23000);let r;
  try{r=await fetch(u,{method:'POST',redirect:'follow',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({key:k,action:'updateContinuation',ic:'IPGSBRIDGEQA20261029TEST',name:'INTEGRATION TEST ONLY NOT STUDENT',status:'Pending Follow-up',reason:'Temporary verification - remove after test',updatedBy:'Backend Verification'}),signal:ac.signal})}finally{clearTimeout(timer)}
  const v=await r.json();
  return res.status(200).json({ok:!!v.ok,writeStatus:v.continuation?.status||null,error:String(v.error||'').slice(0,180)});
 }catch(e){return res.status(502).json({ok:false,error:String(e.message).slice(0,120)})}
};