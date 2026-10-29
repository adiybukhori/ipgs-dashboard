const {ok}=require('./_auth');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','private, no-store');
 if(!ok(req))return res.status(401).json({ok:false,error:'Staff sign-in required'});
 const method=req.method,body=method==='POST'?(req.body||{}):{};
 if(method!=='GET'&&method!=='POST')return res.status(405).json({ok:false,error:'Unsupported method'});
 const action=method==='GET'?'reminderList':'reminderControl';
 if(method==='POST'&&(!/^(STOP|RESUME|NOT_INTERESTED)$/.test(String(body.command||''))||!/^[A-Za-z0-9 -]{4,48}$/.test(String(body.ic||''))))return res.status(400).json({ok:false,error:'Invalid reminder control'});
 const url=process.env.MARKETING_BRIDGE_URL,key=process.env.MARKETING_BRIDGE_SECRET;
 if(!url||!key)return res.status(503).json({ok:false,error:'Marketing bridge is not configured'});
 try{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),27000);let response;
  try{response=await fetch(url,{method:'POST',redirect:'follow',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({key,action,ic:body.ic,command:body.command,reason:body.reason||''}),signal:controller.signal})}
  finally{clearTimeout(timer)}
  const payload=await response.json();
  if(!response.ok||!payload.ok)return res.status(502).json({ok:false,error:String(payload.error||'Reminder bridge failed').slice(0,190)});
  res.status(200).json(payload);
 }catch(err){res.status(502).json({ok:false,error:'Reminder connection unavailable: '+String(err.message).slice(0,120)})}
};
