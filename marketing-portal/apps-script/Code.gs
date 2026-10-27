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
 if(/DOCTOR(?:ATE)? (?:OF|IN) BUSINESS|\bDBA\b/.test(t))return 'DBA';
 if(/MHUM|HAJJ|UMRAH/.test(t))return 'MHUM';
 if(/\bMBM\b|MASTER OF BUSINESS MANAGEMENT/.test(t))return 'MBM';
 if(/\bMBA\b|MASTER OF BUSINESS ADMINISTRATION/.test(t))return 'MBA';
 if(/\bMIS\b|INFORMATION SYSTEM/.test(t))return 'MIS';
 return s||'Unspecified';
}
function intake_(value){
 const raw=String(value||'').trim();
 const months={jan:'January',january:'January',januari:'January',feb:'February',february:'February',februari:'February',mar:'March',march:'March',mac:'March',apr:'April',april:'April',may:'May',mei:'May',jun:'June',june:'June',jul:'July',july:'July',julai:'July',aug:'August',august:'August',ogos:'August',sep:'September',sept:'September',september:'September',oct:'October',october:'October',okt:'October',oktober:'October',nov:'November',november:'November',dec:'December',december:'December',dis:'December',disember:'December'};
 const match=raw.toLowerCase().match(/^([a-z]+)[\s,./-]+(20\d{2})$/);
 return match&&months[match[1]]?months[match[1]]+' '+match[2]:raw||'Unspecified';
}
function read_(id,tab,first,max,headers,width){
 const sheet=SpreadsheetApp.openById(id).getSheetByName(tab);
 if(!sheet)throw Error('Missing tab: '+tab);
 const actual=sheet.getRange(first-1,1,1,width).getDisplayValues()[0];
 Object.keys(headers).forEach(i=>{if(clean_(actual[i])!==clean_(headers[i]))throw Error('Source columns changed: '+tab)});
 const last=sheet.getLastRow();
 if(last>max)throw Error('Source row limit exceeded: '+tab);
 if(last<first)return [];
 return sheet.getRange(first,1,last-first+1,width).getDisplayValues();
}
function build_(){
 const newest=read_(SOURCES.marketing,'IPGS Briefing Registration',2,5000,{2:'Full Name',3:'IC / Passport',5:'Email Address',7:'Programme',8:'Preferred Intake'},9);
 const historic=read_(SOURCES.marketing,'Data Briefing Session',2,5000,{1:'Full Name (As in IC)',2:'IC Number',4:'Email Address',5:'Programme',11:'Intake'},12);
 const acc=read_(SOURCES.acc,'V2_APPLICATIONS',2,8000,{3:'Student Name',4:'ID / Passport No',7:'Programme',10:'Intake'},11);
 const tracker=read_(SOURCES.snapshot,'STUDENT_PAYMENT_TRACKER',5,10000,{0:'Student Status',2:'ID No',4:'Programme',5:'Intake'},6);
 const applied=new Map(),active=new Map();
 acc.forEach(r=>{let id=clean_(r[4]);if(id)applied.set(id,{name:cell_(r,3),programme:cell_(r,7),intake:cell_(r,10)})});
 tracker.forEach(r=>{const id=clean_(r[2]);if(id&&/^active$/i.test(cell_(r,0)))active.set(id,{programme:cell_(r,4),intake:cell_(r,5)})});
 const leads=[];
 newest.forEach((r,i)=>{if(clean_(r[3]))leads.push({name:cell_(r,2),ic:cell_(r,3),email:cell_(r,5),programme:cell_(r,7),intake:cell_(r,8),origin:2,row:i+2})});
 historic.forEach((r,i)=>{if(clean_(r[2]))leads.push({name:cell_(r,1),ic:cell_(r,2),email:cell_(r,4),programme:cell_(r,5),intake:cell_(r,11),origin:1,row:i+2})});
 const chosen=new Map();
 leads.forEach(l=>{const id=clean_(l.ic),p=chosen.get(id);if(!p||l.origin>=p.origin)chosen.set(id,l)});
 const candidates=[];
 chosen.forEach((l,id)=>{const a=applied.get(id),s=active.get(id);candidates.push({
 id:'C'+l.origin+'R'+l.row,name:l.name||a?.name||'',ic:l.ic,email:l.email,
 programme:canon_(l.programme||a?.programme||s?.programme),
 intake:intake_(l.intake||a?.intake||s?.intake),preferredIntakeOriginal:l.intake,
 stage:s?'activated':a?'applied':'interested',
 accFound:!!a,activated:!!s,source:'Marketing Registration'
 })});
 const accCount=candidates.filter(x=>x.accFound).length,activeCount=candidates.filter(x=>x.activated).length;
 return {ok:true,refreshedAt:new Date().toISOString(),candidates,summary:{
 registrations:leads.length,unique:candidates.length,duplicateRegistrations:leads.length-candidates.length,
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
