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
function timestamp_(value){
 const raw=String(value||'').trim();
 if(!raw)return null;
 if(/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:?\d{2})$/.test(raw)){
  const date=new Date(raw);return isNaN(date.getTime())?null:date.toISOString();
 }
 const m=raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?$/i);
 if(!m)return null;
 let hour=Number(m[4]||0);const minute=Number(m[5]||0),second=Number(m[6]||0);
 if(m[7]){if(hour<1||hour>12)return null;hour=hour%12+(/^PM$/i.test(m[7])?12:0)}
 const local=new Date(Date.UTC(Number(m[3]),Number(m[2])-1,Number(m[1]),hour,minute,second));
 if(hour>23||minute>59||second>59||local.getUTCFullYear()!==Number(m[3])||local.getUTCMonth()!==Number(m[2])-1||local.getUTCDate()!==Number(m[1]))return null;
 return new Date(local.getTime()-8*60*60*1000).toISOString();
}
function event_(lead){return {registeredAt:lead.registeredAt,sourceTab:lead.sourceTab,sourceRow:lead.row}}
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
 let column='',n=width;
 while(n>0){n--;column=String.fromCharCode(65+n%26)+column;n=Math.floor(n/26)}
 const range="'"+tab.replace(/'/g,"''")+"'!A"+(first-1)+':'+column+(max+1);
 const rows=Sheets.Spreadsheets.Values.get(id,range,{valueRenderOption:'FORMATTED_VALUE'}).values||[];
 const actual=rows[0]||[];
 Object.keys(headers).forEach(i=>{if(clean_(actual[i])!==clean_(headers[i]))throw Error('Source columns changed: '+tab)});
 if(rows.length>max-first+2)throw Error('Source row limit exceeded: '+tab);
 return rows.slice(1);
}
function build_(){
 const newest=read_(SOURCES.marketing,'IPGS Briefing Registration',2,5000,{0:'Timestamp',2:'Full Name',3:'IC / Passport',5:'Email Address',7:'Programme',8:'Preferred Intake'},9);
 const historic=read_(SOURCES.marketing,'Data Briefing Session',2,5000,{0:'Timestamp',1:'Full Name (As in IC)',2:'IC Number',4:'Email Address',5:'Programme',11:'Intake'},12);
 const acc=read_(SOURCES.acc,'V2_APPLICATIONS',2,8000,{3:'Student Name',4:'ID / Passport No',7:'Programme',10:'Intake',50:'SKY Activation Status',51:'SKY Student ID'},55);
 const tracker=read_(SOURCES.snapshot,'STUDENT_PAYMENT_TRACKER',5,10000,{0:'Student Status',2:'ID No',3:'Category',4:'Programme',5:'Intake'},6);
 const continuation=read_(SOURCES.marketing,'MARKETING_CONTINUATION_STATUS',2,500,{0:'IC / Passport',1:'Student Name',2:'Continuation Status'},7);
 const continuationMap=new Map();
 continuation.forEach(r=>{const id=clean_(r[0]);if(id)continuationMap.set(id,{status:cell_(r,2)||'Not Set',reason:cell_(r,3),effectiveDate:cell_(r,4),updatedBy:cell_(r,5),updatedAt:cell_(r,6)})});
 const applied=new Map(),active=new Map();
 acc.forEach(r=>{let id=clean_(r[4]);if(id)applied.set(id,{name:cell_(r,3),programme:cell_(r,7),intake:cell_(r,10),skyActivationStatus:cell_(r,50),matric:cell_(r,51)})});
 tracker.forEach(r=>{const id=clean_(r[2]);if(id&&/^active$/i.test(cell_(r,0)))active.set(id,{name:cell_(r,1),programme:cell_(r,4),intake:cell_(r,5),category:cell_(r,3)})});
 const leads=[];
 newest.forEach((r,i)=>{if(clean_(r[3]))leads.push({name:cell_(r,2),ic:cell_(r,3),email:cell_(r,5),programme:cell_(r,7),intake:cell_(r,8),origin:2,row:i+2,registeredAt:timestamp_(r[0]),sourceTab:'IPGS Briefing Registration'})});
 historic.forEach((r,i)=>{if(clean_(r[2]))leads.push({name:cell_(r,1),ic:cell_(r,2),email:cell_(r,4),programme:cell_(r,5),intake:cell_(r,11),origin:1,row:i+2,registeredAt:timestamp_(r[0]),sourceTab:'Data Briefing Session'})});
 const chosen=new Map(),registrations=new Map();
 leads.forEach(l=>{const id=clean_(l.ic),p=chosen.get(id);if(!p||l.origin>p.origin||(l.origin===p.origin&&((l.registeredAt||'')>(p.registeredAt||'')||l.registeredAt===p.registeredAt&&l.row>p.row)))chosen.set(id,l);if(!registrations.has(id))registrations.set(id,[]);registrations.get(id).push(event_(l))});
 const candidates=[];
 chosen.forEach((l,id)=>{const a=applied.get(id),s=active.get(id),events=registrations.get(id).sort((a,b)=>(b.registeredAt||'').localeCompare(a.registeredAt||'')),dated=events.filter(e=>e.registeredAt);candidates.push({
 id:'C'+l.origin+'R'+l.row,name:l.name||a?.name||'',ic:l.ic,email:l.email,
 programme:canon_(l.programme||a?.programme||s?.programme),
 intake:intake_(l.intake||a?.intake||s?.intake),preferredIntakeOriginal:l.intake,
 stage:s?'activated':a?'applied':'interested',
 accFound:!!a,activated:!!s,source:'Marketing Registration',
 registeredAt:dated.length?dated[0].registeredAt:null,
 firstRegisteredAt:dated.length?dated[dated.length-1].registeredAt:null,
 registrationEvents:events,registrationCount:events.length,
 sourceTab:l.sourceTab,snapshotCategory:s?s.category:null,accSkyStatus:a?.skyActivationStatus||'',accMatric:a?.matric||'',
 continuation:continuationMap.get(id)||{status:'Not Set',reason:'',effectiveDate:'',updatedBy:'',updatedAt:''},
 categoryReview:!!s&&s.category!=='Internal'
 })});
 candidates.sort((a,b)=>(b.registeredAt||'').localeCompare(a.registeredAt||'')||a.name.localeCompare(b.name));
 const accCount=candidates.filter(x=>x.accFound).length,activeCount=candidates.filter(x=>x.activated).length;
 const internalActive=[...active.entries()].filter(([id,x])=>x.category==='Internal');
 const internalPreview=internalActive.filter(([id])=>chosen.has(id));
 const internalOutside=internalActive.filter(([id])=>!chosen.has(id)).map(([id,x])=>({
   id:'OUT-'+id,name:x.name,ic:id,programme:canon_(x.programme),intake:intake_(x.intake),snapshotCategory:'Internal',
   accFound:applied.has(id),accName:applied.get(id)?.name||'',accMatric:applied.get(id)?.matric||''
 }));
 const appliedC=candidates.filter(x=>x.accFound);
 const statusOf=x=>{
   if(x.activated)return 'Active in Sky';
   const c=x.continuation.status;
   if(c==='Not Qualified')return 'Not Qualified';
   if(c==='Withdrawn')return 'Withdrawn';
   if(c==='Withdrawal Requested')return 'Withdrawal Requested';
   if(c==='Deferred')return 'Deferred';
   return 'Pending Review / Activation';
 };
 const applicationBreakdown={};
 appliedC.forEach(x=>{const k=statusOf(x);applicationBreakdown[k]=(applicationBreakdown[k]||0)+1});
 const pendingDetails=appliedC.filter(x=>!x.activated).map(x=>({name:x.name,ic:x.ic,programme:x.programme,status:statusOf(x),accSkyStatus:x.accSkyStatus,matric:x.accMatric,reason:x.continuation.reason}));
 return {ok:true,refreshedAt:new Date().toISOString(),candidates,internalOutside,pendingDetails,summary:{
 internalTotalActive:internalActive.length,internalFromPreview:internalPreview.length,internalOutsidePreview:internalOutside.length,applicationBreakdown,
 registrations:leads.length,unique:candidates.length,duplicateRegistrations:leads.length-candidates.length,
 notApplied:candidates.filter(x=>!x.accFound).length,
 applied:accCount,activated:activeCount,
 activatedWithoutAcc:candidates.filter(x=>x.activated&&!x.accFound).length,
 missingRegistrationDates:candidates.filter(x=>!x.registeredAt).length,
 withdrawalRequested:candidates.filter(x=>x.continuation.status==='Withdrawal Requested').length,
 withdrawn:candidates.filter(x=>x.continuation.status==='Withdrawn').length,
 categoryReview:candidates.filter(x=>x.categoryReview).length
 }};
}
function doPost(e){
 try{
 const input=JSON.parse(e&&e.postData&&e.postData.contents||'{}');
 const expected=PropertiesService.getScriptProperties().getProperty('BRIDGE_SHARED_SECRET');
 if(!expected||input.key!==expected)return reply_({ok:false,error:'Unauthorized'});
 if(input.action==='updateContinuation')return reply_(updateContinuation_(input));
 if(input.action!=='reconcile')return reply_({ok:false,error:'Unsupported action'});
 return reply_(build_());
 }catch(ex){return reply_({ok:false,error:String(ex.message||ex).slice(0,180)})}
}
function doGet(){return reply_({ok:false,error:'Use authenticated POST'})}

function updateContinuation_(input){
 const allowed=['Not Set','Pending Screening','Documents Incomplete','Pending Follow-up','Qualified - Pending Activation','Sky Activation Verification','Continuing','Withdrawal Requested','Withdrawn','Deferred','Not Qualified'];
 const id=clean_(input.ic),status=String(input.status||''),reason=String(input.reason||'').trim();
 if(!id||id.length>40||!allowed.includes(status)||reason.length>2000)throw Error('Invalid continuation update');
 if(['Pending Screening','Documents Incomplete','Qualified - Pending Activation','Sky Activation Verification','Withdrawal Requested','Withdrawn','Deferred','Not Qualified'].includes(status)&&!reason)throw Error('A remark is required');
 const sheet=SpreadsheetApp.openById(SOURCES.marketing).getSheetByName('MARKETING_CONTINUATION_STATUS');
 if(!sheet)throw Error('Continuation status sheet missing');
 const last=sheet.getLastRow(),existing=last>1?sheet.getRange(2,1,last-1,2).getDisplayValues():[];
 let row=existing.findIndex(r=>clean_(r[0])===id)+2;
 if(row===1)row=last+1;
 const name=String(input.name||'').slice(0,160),editor=String(input.updatedBy||'Marketing Portal Staff').slice(0,120);
 sheet.getRange(row,1,1,7).setValues([[id,name,status,reason,String(input.effectiveDate||'').slice(0,10),editor,new Date().toISOString()]]);
 return {ok:true,continuation:{status,reason,effectiveDate:String(input.effectiveDate||''),updatedBy:editor}};
}
