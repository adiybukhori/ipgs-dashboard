/**
 * IPGS Admission Reminder Center.
 * Sender identity is deliberately enforced. No emails are sent until a
 * verified IPGS Admission account enables the scheduled job.
 */
const REMINDER_TAB='IPGS_ADMISSION_REMINDERS';
const REMINDER_LOG_TAB='IPGS_ADMISSION_REMINDER_LOG';
const REMINDER_SENDER='ipgs.admission@innovative.edu.my';
const REMINDER_SUBJECT='Reminder: Complete Your IPGS Admission Application';
const REMINDER_ADMISSION_URL='https://ipgs-admission-form.innovative.edu.my/';
const REMINDER_WEBAPP_URL='https://script.google.com/macros/s/AKfycbzFYrErPfVt-5ul0WfL9GmQAP0zVLxSkvgGLlQN_ZtR3uDw_LWqJmj874QOkvxueRC_/exec';
const REMINDER_OPT_OUT_CTA_FROM=7; // Prominent Not Interested button appears in reminder 7 and every later reminder.
function remindSafe_(s){return String(s==null?'':s).replace(/^[=+@-]/,"'$&").slice(0,2500)}
function remindEsc_(s){return String(s||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function remindSheet_(name){const sh=SpreadsheetApp.openById(SOURCES.marketing).getSheetByName(name);if(!sh)throw Error('Missing reminder sheet '+name);return sh}
function remindRows_(){const sh=remindSheet_(REMINDER_TAB),n=sh.getLastRow();return {sheet:sh,rows:n>1?sh.getRange(2,1,n-1,12).getDisplayValues():[]}}
function remindMap_(){const data=remindRows_(),map=new Map();data.rows.forEach((r,i)=>{const k=clean_(r[0]);if(k)map.set(k,{row:i+2,ic:k,name:r[1],email:r[2],status:r[3]||'ACTIVE',count:Number(r[4]||0),last:r[5],next:r[6],token:r[7],reason:r[8],updated:r[9],error:r[10]})});return {sheet:data.sheet,map}}
function remindLog_(ic,email,event,seq,result,reason){
 remindSheet_(REMINDER_LOG_TAB).appendRow([new Date().toISOString(),clean_(ic),remindSafe_(email),event,seq||0,result||'',remindSafe_(reason||'')])
}
function remindWrite_(sh,row,item){
 sh.getRange(row,1,1,12).setValues([[clean_(item.ic),remindSafe_(item.name),remindSafe_(item.email),item.status||'ACTIVE',
  Number(item.count||0),item.last||'',item.next||'',item.token||'',remindSafe_(item.reason||''),
  new Date().toISOString(),remindSafe_(item.error||''),item.messageId||'']]);
}
function remindFind_(id,source){return source.candidates.find(c=>clean_(c.ic)===clean_(id))}
function remindBlocked_(c){
 if(c.accFound)return 'Applied in ACC';
 if(c.accEmailFound)return 'Possible ACC Match by Email — Verify ID';
 if(c.activated)return 'Active in Sky';
 if(['Not Qualified','Withdrawal Requested','Withdrawn','Deferred'].includes(c.continuation&&c.continuation.status))return 'Not Continuing';
 if(!c.email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email))return 'Email Missing / Invalid';
 if(!c.registeredAt||!Number.isFinite(Date.parse(c.registeredAt)))return 'Registration Date Missing';
 if(Date.now()-Date.parse(c.registeredAt)<24*60*60*1000)return 'Within First 24 Hours';
 return '';
}
function reminderList_(input){
 const source=build_(),{map}=remindMap_(),emailCounts=new Map();
 source.candidates.forEach(c=>{const em=String(c.email||'').trim().toLowerCase();if(em)emailCounts.set(em,(emailCounts.get(em)||0)+1)});
 const list=source.candidates.map(c=>{
  const v=map.get(clean_(c.ic)),blocked=remindBlocked_(c),em=String(c.email||'').trim().toLowerCase();
  const status=v?v.status:'ACTIVE',duplicate=emailCounts.get(em)>1;
  const due=v&&v.last&&new Date(v.last).toLocaleDateString('en-CA',{timeZone:'Asia/Kuala_Lumpur'})===new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kuala_Lumpur'})?'Already Sent Today':'';
  const eligible=!blocked&&!duplicate&&status==='ACTIVE'&&!due;
  const why=blocked||(duplicate?'Duplicate Email — Review':status==='NOT_INTERESTED'?'Not Interested':status==='PAUSED'?'Stopped by Admin':due);
  return {ic:c.ic,name:c.name,email:c.email,programme:c.programme,registeredAt:c.registeredAt,
   accFound:c.accFound,active:c.activated,reminderStatus:status,count:v?v.count:0,lastSentAt:v?v.last:'',nextDueAt:v?v.next:'',
   eligible,reason:why||'',stateUpdatedAt:v?v.updated:''};
 });
 const totals={marketingLeads:list.length,eligible:list.filter(x=>x.eligible).length,sentPreviously:list.filter(x=>x.count>0).length,
  totalSends:list.reduce((n,x)=>n+x.count,0),stopped:list.filter(x=>x.reminderStatus==='PAUSED').length,
  notInterested:list.filter(x=>x.reminderStatus==='NOT_INTERESTED').length,
  accCompleted:source.candidates.filter(x=>x.accFound).length,appliedAfterReminder:list.filter(x=>x.accFound&&x.count>0).length,
  active:source.candidates.filter(x=>x.activated).length,
  mode:PropertiesService.getScriptProperties().getProperty('IPGS_REMINDERS_ENABLED')==='true'?'ACTIVE':'PAUSED',
  schedule:'Every day around 09:00 Asia/Kuala_Lumpur',optOutCTAFrom:REMINDER_OPT_OUT_CTA_FROM,stopMode:'Until ACC, opt-out or admin Stop',
  sender:Session.getEffectiveUser().getEmail()||'unavailable'};
 return {ok:true,summary:totals,candidates:list};
}
function reminderControl_(input){
 const id=clean_(input.ic),action=String(input.command||'').toUpperCase();
 if(!id||!['STOP','RESUME','NOT_INTERESTED'].includes(action))throw Error('Unsupported reminder control');
 const source=build_(),c=remindFind_(id,source);if(!c)throw Error('Candidate not found in Marketing Form');
 const lock=LockService.getScriptLock();lock.waitLock(25000);
 try{
  const z=remindMap_(),old=z.map.get(id)||{ic:id,count:0,last:'',next:'',token:'',email:c.email,name:c.name};
  if(old.status==='NOT_INTERESTED'&&action!=='NOT_INTERESTED')throw Error('Candidate unsubscribed; do not resume automatically');
  const status=action==='STOP'?'PAUSED':action==='RESUME'?'ACTIVE':'NOT_INTERESTED';
  old.status=status;old.reason=String(input.reason||'').trim()|| (status==='PAUSED'?'Stopped by Admin':status==='NOT_INTERESTED'?'Not Interested':'Resumed by Admin');
  old.ic=id;old.name=c.name;old.email=c.email;old.error='';
  remindWrite_(z.sheet,old.row||z.sheet.getLastRow()+1,old);
  remindLog_(id,c.email,action,old.count,'SUCCESS',old.reason);
  return {ok:true,ic:id,status,count:old.count,reason:old.reason};
 }finally{lock.releaseLock()}
}
function remindHtml_(optoutUrl, reminderNumber){
 const showNotInterestedButton=Number(reminderNumber)>=REMINDER_OPT_OUT_CTA_FROM;
 const link=remindEsc_(optoutUrl),admission=remindEsc_(REMINDER_ADMISSION_URL);
 return '<!doctype html><html><body style="background:#f5f3f8;margin:0;padding:20px;font-family:Arial,Helvetica,sans-serif;color:#29223a">'
 +'<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center"><table role="presentation" width="580" style="max-width:580px;width:100%;background:#fff;border-radius:12px;overflow:hidden">'
 +'<tr><td style="background:#5B2C83;padding:20px 28px;border-bottom:5px solid #C5A55A"><table role="presentation" width="100%"><tr>'
 +'<td width="50%" align="left"><img src="cid:iucLogo" alt="Innovative University College" width="165" style="max-width:100%;height:auto"></td>'
 +'<td width="50%" align="right"><img src="cid:ipgsLogo" alt="IPGS" width="140" style="max-width:100%;height:auto"></td>'
 +'</tr></table></td></tr>'
 +'<tr><td style="padding:30px 28px 12px"><div style="font-size:12px;letter-spacing:2px;color:#77518f;font-weight:bold">IPGS REGISTRY</div>'
 +'<h2 style="color:#5B2C83;font-size:22px;margin:12px 0 18px">Complete Your Admission Application</h2>'
 +'<p style="font-size:15px;line-height:1.75;margin:0 0 15px">Thank you for your interest in pursuing your studies with Innovative University College.</p>'
 +'<p style="font-size:15px;line-height:1.75;margin:0 0 24px">If you have not yet completed the official admission form, kindly submit your application using the button below.</p>'
 +'<p style="text-align:center;margin:0 0 24px"><a href="'+admission+'" style="display:inline-block;padding:14px 27px;border-radius:7px;background:#5B2C83;color:white;font-weight:bold;text-decoration:none">Complete Admission Form</a></p>'
 +'<p style="font-size:14px;line-height:1.75;margin:0 0 20px">Already applied? No further action is needed. You may disregard this reminder.</p>'
 +'<p style="font-size:14px;line-height:1.75;margin:0">Should you require assistance, simply reply to this email.<br><b>IPGS Admissions Team</b><br>Innovative University College</p></td></tr>'
 +(showNotInterestedButton
  ? '<tr><td style="padding:8px 28px 22px;text-align:center"><p style="font-size:14px;color:#5B2C83"><strong>Admission Reminder</strong></p><p style="font-size:13px;color:#5B2C83">Not planning to apply? Let us know and we will stop contacting you.</p><p><a href="'+link+'" style="display:inline-block;background:#ede5f4;color:#5B2C83;border:1px solid #b7a2cb;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Not Interested — Stop Reminders</a></p></td></tr>'
  : '')
 +'<tr><td style="border-top:1px solid #e8e2ef;padding:18px 28px 24px;text-align:center;background:#faf9fc">'
 +'<p style="font-size:12px;color:#6f6477;margin:0 0 10px">You can opt out of future admission reminders at any time.</p>'
 +'<a href="'+link+'" style="font-size:12px;color:#5B2C83;text-decoration:underline">Stop Reminder Emails</a>'
 +'<p style="font-size:11px;color:#9689a0;margin:18px 0 0">IPGS Registry · Innovative University College</p></td></tr>'
 +'</table></td></tr></table></body></html>';
}
function remindImages_(){
 const prop=PropertiesService.getScriptProperties(),iuc=prop.getProperty('IPGS_REMINDER_IUC_LOGO_ID')||'1KFqHWznQtlLJaOJWBbSFPjxzjOn-Intd',ipgs=prop.getProperty('IPGS_REMINDER_IPGS_LOGO_ID')||'1ZULh-d-DEhcvvGc9g69KNMF0OjzH-TBL';
 if(!iuc||!ipgs)throw Error('Approved IUC/IPGS inline logo IDs are not configured');
 return {iucLogo:DriveApp.getFileById(iuc).getBlob().setName('iuc.png'),ipgsLogo:DriveApp.getFileById(ipgs).getBlob().setName('ipgs.png')};
}
function reminderDailyJob(){
 const prop=PropertiesService.getScriptProperties();
 if(prop.getProperty('IPGS_REMINDERS_ENABLED')!=='true')return {ok:true,mode:'PAUSED',sent:0};
 const sender=String(Session.getEffectiveUser().getEmail()||'').toLowerCase();
 if(sender!==REMINDER_SENDER)throw Error('Automatic sending blocked: script owner must be '+REMINDER_SENDER+'; current '+sender);
 const lock=LockService.getScriptLock();if(!lock.tryLock(2000))return {ok:false,error:'Another reminder job is in progress'};
 let sent=0,failed=0;
 try{
  const list=reminderList_(),sheet=remindMap_().sheet,images=remindImages_();
  if(MailApp.getRemainingDailyQuota()<list.summary.eligible)throw Error('Insufficient mail quota; no messages were sent');
  for(const row of list.candidates.filter(x=>x.eligible).slice(0,150)){
   const z=remindMap_(),old=z.map.get(clean_(row.ic))||{ic:row.ic,name:row.name,email:row.email,count:0,status:'ACTIVE'};
   // Re-check status immediately before each send; protects manual Stop actions.
   if(old.status!=='ACTIVE')continue;
   const token=old.token||Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,'');
   const url=REMINDER_WEBAPP_URL+'?action=unsubscribe&token='+encodeURIComponent(token);
   const email={to:REMINDER_SENDER,bcc:row.email,subject:REMINDER_SUBJECT,
     body:'Please complete the official admission form: '+REMINDER_ADMISSION_URL+'. To stop reminder emails at any time: '+url,
     htmlBody:remindHtml_(url,old.count+1),inlineImages:images,name:'IPGS Registry',replyTo:REMINDER_SENDER};
   try{
    MailApp.sendEmail(email);
    old.ic=clean_(row.ic);old.name=row.name;old.email=row.email;old.status='ACTIVE';old.token=token;
    old.count=(old.count||0)+1;old.last=new Date().toISOString();old.next='Next 09:00 MYT';old.error='';
    remindWrite_(z.sheet,old.row||z.sheet.getLastRow()+1,old);
    remindLog_(row.ic,row.email,'SENT',old.count,'SUCCESS','BCC one recipient; generic HTML');
    sent++;
   }catch(ex){
    failed++;old.ic=clean_(row.ic);old.name=row.name;old.email=row.email;old.error=String(ex.message||ex).slice(0,140);
    remindWrite_(z.sheet,old.row||z.sheet.getLastRow()+1,old);
    remindLog_(row.ic,row.email,'FAILED',old.count,'ERROR',old.error);
   }
  }
  return {ok:true,sent,failed};
 }finally{lock.releaseLock()}
}
function reminderStopPage_(event){
 const token=String(event.parameter.token||'');
 if(!/^[0-9a-f]{64}$/i.test(token))return HtmlService.createHtmlOutput('<p>Invalid reminder link.</p>');
 const found=remindRows_().rows.some(r=>r[7]===token);
 if(!found)return HtmlService.createHtmlOutput('<p>This reminder link is no longer valid.</p>');
 const html='<meta name="viewport" content="width=device-width,initial-scale=1"><div style="max-width:480px;margin:60px auto;font:16px Arial;color:#3d2858;padding:24px;border:1px solid #e3d9eb;border-radius:14px">'
 +'<h2>IPGS Admission Reminders</h2><p>Do you no longer wish to receive admission reminder emails?</p>'
 +'<form method="post" action="'+REMINDER_WEBAPP_URL+'"><input type="hidden" name="action" value="unsubscribeConfirm">'
 +'<input type="hidden" name="token" value="'+remindEsc_(token)+'"><button type="submit" style="background:#5B2C83;color:white;border:none;padding:12px 20px;border-radius:7px;cursor:pointer">Not Interested — Stop Reminders</button></form>'
 +'<p style="font-size:12px;color:#756780">You can close this page without changing your reminder preference.</p></div>';
 return HtmlService.createHtmlOutput(html).setTitle('Stop IPGS Reminders');
}
function reminderStopPublic_(event){
 const token=String(event.parameter.token||'');
 if(!/^[0-9a-f]{64}$/i.test(token))return HtmlService.createHtmlOutput('<p>Invalid reminder link.</p>');
 const lock=LockService.getScriptLock();lock.waitLock(20000);
 try{
  const data=remindRows_(),index=data.rows.findIndex(r=>r[7]===token);
  if(index<0)return HtmlService.createHtmlOutput('<p>Reminder link not found.</p>');
  const r=data.rows[index];const state={ic:r[0],name:r[1],email:r[2],status:'NOT_INTERESTED',count:Number(r[4]||0),last:r[5],next:'',token:r[7],reason:'Candidate selected Not Interested via email opt-out'};
  if(r[3]!=='NOT_INTERESTED'){remindWrite_(data.sheet,index+2,state);remindLog_(r[0],r[2],'NOT_INTERESTED',state.count,'SUCCESS','Candidate opted out via self-service link')}
  return HtmlService.createHtmlOutput('<div style="max-width:500px;margin:60px auto;font:16px Arial;color:#5B2C83"><h2>Reminders stopped</h2><p>Thank you. You will no longer receive IPGS admission reminders from this campaign.</p></div>').setTitle('IPGS Reminders Stopped');
 }finally{lock.releaseLock()}
}
/** Install only while signed in as ipgs.admission@innovative.edu.my and after test/approval. */
function enableDailyAdmissionReminders(){
 const actual=String(Session.getEffectiveUser().getEmail()||'').toLowerCase();
 if(actual!==REMINDER_SENDER)throw Error('Run this script under '+REMINDER_SENDER);
 remindImages_(); // Verifies access to the approved IUC and IPGS logo files.
 ScriptApp.getProjectTriggers().filter(x=>x.getHandlerFunction()==='reminderDailyJob').forEach(x=>ScriptApp.deleteTrigger(x));
 ScriptApp.newTrigger('reminderDailyJob').timeBased().atHour(9).nearMinute(0).everyDays(1).inTimezone('Asia/Kuala_Lumpur').create();
 PropertiesService.getScriptProperties().setProperty('IPGS_REMINDERS_ENABLED','true');
 return {ok:true,mode:'ACTIVE',schedule:'approximately 09:00 MYT daily'};
}
function pauseDailyAdmissionReminders(){
 PropertiesService.getScriptProperties().setProperty('IPGS_REMINDERS_ENABLED','false');
 return {ok:true,mode:'PAUSED'};
}
