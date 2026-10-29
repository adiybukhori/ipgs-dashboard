const {ok}=require('./_auth');
const crypto=require('node:crypto');

// Verified exception hashes correspond to the private IPGS_VERIFIED_ID_MATCHES
// registry in Marketing Google Sheet. Never infer an ID match from name alone.
// This API fallback is idempotent: if the Apps Script bridge already resolved
// the verified alias, it makes no changes.
const verifiedPairs=[{
 marketingHash:'09a21555a0ad4df89d301c49957f8f339cdda59013a6e6911f53d7677010a882',
 snapshotHash:'f29cdf71a7c816984cb205f99a49517949d6a21342199e171194db491aece0b1'
},{
 marketingHash:'27a8cb3ba3cad8efcfb544756b3a63fd6862d595ff1931f1d5ff5f694b278cf1',
 snapshotHash:'9c54b77900241e8661b20afaaf58f9ce7ab53b29867629f83ef67a75d388c364'
}];
const normId=v=>String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const normName=v=>String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const hashId=v=>crypto.createHash('sha256').update(normId(v)).digest('hex');

function applyVerifiedMatches(parsed){
 const candidates=parsed.candidates||[],outside=parsed.internalOutside||[],pending=parsed.pendingDetails||[],summary=parsed.summary||{};
 for(const pair of verifiedPairs){
  const matchedCandidates=candidates.filter(x=>hashId(x.ic)===pair.marketingHash);
  const matchedSnapshot=outside.filter(x=>hashId(x.ic)===pair.snapshotHash);
  // If Apps Script has already linked the candidate, do not add or subtract.
  if(matchedCandidates.length!==1||matchedCandidates[0].activated||matchedSnapshot.length!==1)continue;
  const person=matchedCandidates[0],sky=matchedSnapshot[0];
  if(!person.accFound||sky.snapshotCategory!=='Internal'||normName(person.name)!==normName(sky.name))continue;
  if(['Not Qualified','Withdrawn','Withdrawal Requested','Deferred'].includes(person.continuation?.status))continue;
  const pendingIndex=pending.findIndex(x=>normId(x.ic)===normId(person.ic));
  if(pendingIndex<0)continue;
  const previouslyPending=summary.applicationBreakdown?.['Pending Review / Activation'];
  if(!Number.isInteger(previouslyPending)||previouslyPending<1)continue;
  const preview=summary.internalFromPreview,nonPreview=summary.internalOutsidePreview;
  if(!Number.isInteger(preview)||!Number.isInteger(nonPreview)||nonPreview<1)continue;

  person.activated=true;
  person.stage='activated';
  person.snapshotCategory='Internal';
  person.snapshotId=sky.ic;
  person.identityMatchMethod='Verified ID cross-reference';
  person.identityMatchNote='Verified through IPGS identity register and matching name/email evidence';
  person.skyIntake=sky.intake||'';
  person.accIntake=person.accIntake||''; // Only show intake when supplied by original ACC source
  person.intakeReview=!!person.skyIntake&&person.accIntake!==person.skyIntake;
  outside.splice(outside.indexOf(sky),1);
  pending.splice(pendingIndex,1);
  summary.internalFromPreview++;
  summary.internalOutsidePreview--;
  summary.activated++;
  summary.applicationBreakdown['Active in Sky']=(summary.applicationBreakdown['Active in Sky']||0)+1;
  summary.applicationBreakdown['Pending Review / Activation']--;
  summary.verifiedIdMatches=(summary.verifiedIdMatches||0)+1;
 }
 // No artificial totals: both summary identities remain invariant.
 return parsed;
}

function classifyAccActivationDiscrepancies(parsed){
 const candidates=parsed.candidates||[],details=parsed.pendingDetails||[],b=parsed.summary?.applicationBreakdown||{};
 const review='ACC Activated / Snapshot Not Matched',inactive='ACC Activated / Confirmed Inactive';
 let nReview=0,nInactive=0;
 for(const x of candidates){
  if(!x.accFound||x.activated||String(x.accSkyStatus||'').toUpperCase()!=='ACTIVATED'||!String(x.accMatric||'').trim())continue;
  const status=x.continuation?.status;
  if(['Withdrawal Requested','Withdrawn','Deferred','Not Qualified'].includes(status))continue;
  const verifiedInactive=status==='Sky Inactive (Verified)';
  const category=verifiedInactive?inactive:review;
  const recorded=String(x.continuation?.reason||'').trim();
  x.processingCategory=category;
  x.reconciliationRemark=recorded||(verifiedInactive?'Inactive status is awaiting a reason': 'ACC has Sky activation and matric but no Active record in the latest Snapshot. Verify Sky status before re-activation.');
  const d=details.find(z=>normId(z.ic)===normId(x.ic));
  if(d){d.status=category;d.reason=recorded||x.reconciliationRemark}
  if(verifiedInactive)nInactive++;else nReview++;
 }
 const old=Number(b['Pending Review / Activation']||0);
 if(nReview+nInactive>old)throw Error('ACC activation reconciliation exceeds pending applicant count');
 b['Pending Review / Activation']=old-nReview-nInactive;
 b[review]=(Number(b[review]||0))+nReview;
 b[inactive]=(Number(b[inactive]||0))+nInactive;
 parsed.summary.accActivatedNotInSnapshot=nReview+nInactive;
 parsed.summary.accConfirmedInactive=nInactive;
 return parsed;
}
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','private, no-store');
 if(req.method!=='GET')return res.status(405).end();
 if(!ok(req))return res.status(401).json({error:'Sign-in required'});
 if(!process.env.MARKETING_BRIDGE_URL||!process.env.MARKETING_BRIDGE_SECRET)return res.status(503).json({error:'Data bridge is not configured'});
 try{
  const ctrl=new AbortController(),t=setTimeout(()=>ctrl.abort(),25000);
  let r;
  try{r=await fetch(process.env.MARKETING_BRIDGE_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({key:process.env.MARKETING_BRIDGE_SECRET,action:'reconcile'}),signal:ctrl.signal,redirect:'follow'})}
  finally{clearTimeout(t)}
  const raw=await r.text();
  let parsed;
  try{parsed=JSON.parse(raw)}catch{return res.status(502).json({error:'Bridge did not return JSON'})}
  if(!r.ok||!parsed.ok)return res.status(502).json({error:parsed.error||'Bridge request failed'});
  applyVerifiedMatches(parsed);
  classifyAccActivationDiscrepancies(parsed);
  res.status(200).json({candidates:parsed.candidates,summary:parsed.summary,internalOutside:parsed.internalOutside||[],pendingDetails:parsed.pendingDetails||[],refreshedAt:parsed.refreshedAt,sourceStatus:'live'});
 }catch(e){res.status(502).json({error:'Bridge unavailable: '+String(e.message).slice(0,100)})}
};
