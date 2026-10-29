// Temporary guarded integration test of the authenticated Save Status route; delete after QA.
const save=require('./continuation');
const {mac}=require('./_auth');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST'||req.headers['x-ipgs-qa-validation']!=="1e486jt12bl5rat12oez12873lh1copju5")return res.status(404).end();
 const until=String(Date.now()+120000);
 const request={method:'POST',headers:{cookie:'ipgs_mkt_session='+until+'.'+mac(until)},body:{ic:'IPGSBRIDGEQA20261029TEST',name:'INTEGRATION TEST NOT STUDENT',status:'Pending Follow-up',reason:'Isolated authenticated portal Save Status test; delete record immediately'}};
 const response={code:200,data:null,setHeader(){return this},status(n){this.code=n;return this},json(x){this.data=x;return this},end(){return this}};
 try{await save(request,response);return res.status(200).json({ok:response.code===200&&!!response.data?.ok,http:response.code,error:String(response.data?.error||'').slice(0,180),status:response.data?.continuation?.status||null})}
 catch(e){return res.status(502).json({ok:false,error:String(e.message).slice(0,120)})}
};