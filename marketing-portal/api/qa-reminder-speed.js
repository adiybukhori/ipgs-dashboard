module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET'||req.headers['x-reminder-qa']!=="revx8u95jyw4m5qmjqd9n17t07ukxrt8p0tbx5hnu618i42ba")return res.status(404).end();
 const url=process.env.MARKETING_BRIDGE_URL,key=process.env.MARKETING_BRIDGE_SECRET;
 if(!url||!key)return res.status(200).json({ok:false,stage:'configuration',urlPresent:!!url,secretPresent:!!key});
 const start=Date.now();
 try{
 const r=await fetch(url,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({key,action:'reminderStatus'}),redirect:'follow',signal:AbortSignal.timeout(13500)});
 const raw=await r.text();let payload;try{payload=JSON.parse(raw)}catch{return res.status(200).json({ok:false,stage:'non-JSON Apps Script response',http:r.status,elapsedMs:Date.now()-start})}
 res.status(200).json({ok:payload.ok===true,http:r.status,elapsedMs:Date.now()-start,records:Array.isArray(payload.records)?payload.records.length:null,mode:payload.summary?.mode||null,error:payload.ok?undefined:String(payload.error||'unknown').slice(0,130)});
 }catch(e){res.status(200).json({ok:false,stage:'request',elapsedMs:Date.now()-start,error:String(e.message||e).slice(0,130)})}
};