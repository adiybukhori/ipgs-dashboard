// Temporary integration QA endpoint; remove after test.
const save=require('./continuation');
const {mac}=require('./_auth');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.headers['x-ipgs-qa-guard']!=="IPGSADM3kbh1w9l2uybep6pat7faar1936rrg")return res.status(404).end();
 const url=process.env.MARKETING_BRIDGE_URL,key=process.env.MARKETING_BRIDGE_SECRET;
 if(!url||!key)return res.status(503).json({ok:false,reason:'config'});
 if(req.method==='GET'){
  try{const a=await fetch(url,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({key,action:'reconcile'}),redirect:'follow',signal:AbortSignal.timeout(23000)});const v=await a.json();
   const augustine=(v.candidates||[]).find(x=>String(x.name).toUpperCase().includes('AUGUSTINE'));
   return res.status(200).json({ok:!!v.ok,applied:v.summary?.applied,activeInACC:v.summary?.applicationBreakdown?.['Active in Sky'],pending:v.summary?.applicationBreakdown?.['Pending Review / Activation'],outsidePreview:v.summary?.internalOutsidePreview,augustinePending:!!augustine?.accFound&&!augustine?.activated,augustineRemark:augustine?.continuation?.status||'Not Set'});
  }catch(e){return res.status(502).json({ok:false,error:String(e.message).slice(0,110)})}
 }
 if(req.method!=='POST')return res.status(405).end();
 const until=String(Date.now()+120000);
 const request={method:'POST',headers:{cookie:'ipgs_mkt_session='+until+'.'+mac(until)},body:{ic:'IPGSQAREVIEW20261029ONLY',name:'QA INTEGRATION NOT STUDENT',status:'Pending Screening',reason:'Automated integration test of admission review status; delete after verification'}};
 const result={code:200,data:null,setHeader(){return this},status(n){this.code=n;return this},json(x){this.data=x;return this},end(){return this}};
 try{await save(request,result);return res.status(200).json({ok:result.code===200&&result.data?.ok,http:result.code,status:result.data?.continuation?.status||'',error:String(result.data?.error||'').slice(0,140)})}
 catch(e){return res.status(502).json({ok:false,error:String(e.message).slice(0,110)})}
};