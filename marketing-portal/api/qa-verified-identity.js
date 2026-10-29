const {mac}=require('./_auth');
const get=require('./marketing');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','private,no-store');
 if(req.method!=='GET'||req.headers['x-qa-scope']!=="ipgsp2udr01jsqq181hexzfs1m1x1g3o85l1h")return res.status(404).end();
 const expiry=String(Date.now()+90000),session='ipgs_mkt_session='+expiry+'.'+mac(expiry);
 const r={method:'GET',headers:{cookie:session}},out={code:200,body:null,setHeader(){return this},status(n){this.code=n;return this},json(o){this.body=o;return this},end(){return this}};
 try{await get(r,out);if(out.code!==200)return res.status(502).json({ok:false,reason:out.body?.error||'failed'});
 const p=out.body||{},c=(p.candidates||[]).find(x=>String(x.name).toUpperCase().includes('CHUI WAI SUM')),s=p.summary||{};
 return res.status(200).json({ok:true,applied:s.applied,activeApplied:s.applicationBreakdown?.['Active in Sky'],pendingApplied:s.applicationBreakdown?.['Pending Review / Activation'],withdrawalRequested:s.applicationBreakdown?.['Withdrawal Requested'],internalTotal:s.internalTotalActive,internalPreview:s.internalFromPreview,internalOutside:s.internalOutsidePreview,verifiedIdMatches:s.verifiedIdMatches,augustine:{found:!!c,active:c?.activated===true,category:c?.snapshotCategory,matchMethod:c?.identityMatchMethod,skyIntake:c?.skyIntake,accIntake:c?.accIntake},outsideListCount:(p.internalOutside||[]).length,pendingListCount:(p.pendingDetails||[]).length});
 }catch(e){return res.status(502).json({ok:false,error:String(e.message).slice(0,110)})}
};