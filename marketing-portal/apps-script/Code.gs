/**
 * IPGS Marketing Data Bridge — bound or standalone Google Apps Script.
 * Deploy as Web App: Execute as Me; access Anyone (shared-secret checked on EVERY request).
 * Store BRIDGE_SHARED_SECRET in Script Properties, never source control.
 * Share relevant spreadsheets with the deploying Google account.
 */
const SOURCES={
  marketing:'1BBrA7RDKDHCek02aIr4XBShZ4X91KvyZfyy-lBPlAP8',
  acc:'1O-Y-q7_q78xKM1p5e2C3EWyQfYr5rXvhO0oWbVaw5Mw',
  snapshot:'1vs8yzY0dsQCgaIQpWJb0-_4iWnVcLCMiUuIbNq6sDPk'
};
function reply_(obj){return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON)}
function clean_(x){return String(x||'').toUpperCase().replace(/[^A-Z0-9]/g,'')}
function cell_(r,i){return String(r[i]||'').trim()}
function canon_(s){
 s=String(s||'').trim(); const t=s.toUpperCase();
 if(/PHD|DOCTOR OF PHILOSOPHY/.test(t))return 'PhD in Management';
 if(/DOCTOR OF BUSINESS|\\bDBA\\b/.test(t))return 'DBA';
 if(/MHUM|HAJJ|UMRAH/.test(t))return 'MHUM';
 if(/\\bMBM\\b|MASTER OF BUSINESS MANAGEMENT/.test(t))return 'MBM';
 if(/\\bMBA\\b|MASTER OF BUSINESS ADMINISTRATION/.test(t))return 'MBA';
 if(/\\bMIS\\b|INFORMATION SYSTEM/.test(t))return 'MIS';
 return s||'Unspecified';
}
function read_(id,tab,first,max){
 const sheet=SpreadsheetApp.openById(id).getSheetByName(tab);
 if(!sheet)throw Error('Missing tab: '+tab);
 const last=Math.min(sheet.getLastRow(),max);
 if(last<first)return [];
 return sheet.getRange(first,1,last-first+1,sheet.getLastColumn()).getDisplayValues();
}
function build_(){
 const newest=read_(SOURCES.marketing,'IPGS Briefing Registration',2,5000);
 const historic=read_(SOURCES.marketing,'Data Briefing Session',2,5000);
 const acc=read_(SOURCES.acc,'V2_APPLICATIONS',2,8000);
 const tracker=read_(SOURCES.snapshot,'STUDENT_PAYMENT_TRACKER',5,10000);
 const applied=new Map(),active=new Map();
 acc.forEach(r=>{let id=clean_(r[4]);if(id)applied.set(id,{name:cell_(r,3),programme:cell_(r,7),intake:cell_(r,10)})});
 tracker.forEach(r=>{const id=clean_(r[2]);if(id&&/^active$/i.test(cell_(r,0)))active.set(id,{programme:cell_(r,4),intake:cell_(r,5)})});
 const leads=[];
 newest.forEach(r=>{if(cell_(r,3))leads.push({name:cell_(r,2),ic:cell_(r,3),email:cell_(r,5),programme:cell_(r,7),intake:cell_(r,8),origin:2})});
 historic.forEach(r=>{if(cell_(r,2))leads.push({name:cell_(r,1),ic:cell_(r,2),email:cell_(r,4),programme:cell_(r,5),intake:cell_(r,11),origin:1})});
 const chosen=new Map();
 leads.forEach(l=>{const id=clean_(l.ic),p=chosen.get(id);if(!p||l.origin>p.origin)chosen.set(id,l)});
 const candidates=[];
 chosen.forEach((l,id)=>{const a=applied.get(id),s=active.get(id);candidates.push({
 id:'C'+candidates.length,name:l.name||a?.name||'',ic:l.ic,email:l.email,
 programme:canon_(l.programme||a?.programme||s?.programme),
 intake:l.intake||a?.intake||s?.intake||'Unspecified',
 stage:s?'activated':a?'applied':'interested',
 accFound:!!a,activated:!!s,source:'Marketing Registration'
 })});
 const accCount=candidates.filter(x=>x.accFound).length,activeCount=candidates.filter(x=>x.activated).length;
 return {ok:true,refreshedAt:new Date().toISOString(),candidates,summary:{
 registrations:newest.length+historic.length,unique:candidates.length,
 notApplied:candidates.filter(x=>!x.accFound).length,
 applied:accCount,activated:activeCount,
 activatedWithoutAcc:candidates.filter(x=>x.activated&&!x.accFound).length
 }};
}
function doPost(e){
 try{
 const input=JSON.parse(e&&e.postData&&e.postData.contents||'{}');
 const expected=PropertiesService.getScriptProperties().getProperty('BRIDGE_SHARED_SECRET');
 if(!expected||input.key!==expected)return reply_({ok:false,error:'Unauthorized'});
 if(input.action!=='reconcile')return reply_({ok:false,error:'Unsupported action'});
 return reply_(build_());
 }catch(ex){return reply_({ok:false,error:String(ex.message||ex).slice(0,180)})}
}
function doGet(){return reply_({ok:false,error:'Use authenticated POST'})}
