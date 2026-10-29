const KEY="ipgs-marketing-prototype-v1";
let data=[], tasks=[];
const A=MarketingAnalytics;
let activeQuick="all",calendarInitialised=false,selectedDay=A.localDate(new Date().toISOString()),calendarMonth=selectedDay.slice(0,7);
function save(){localStorage.setItem(KEY,JSON.stringify({tasks}))}
const $=id=>document.getElementById(id),esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])),pct=(a,b)=>b?Math.round(a/b*100):0;
const ADMISSION_REVIEW_STATUSES=['Not Set','Pending Screening','Documents Incomplete','Pending Follow-up','Qualified - Pending Activation','Sky Activation Verification','Sky Inactive (Verified)','Sky Suspended (Verified)','Snapshot Sync Pending','Reactivation Pending','Continuing','Withdrawal Requested','Withdrawn','Deferred','Not Qualified'];
const ACC_ACTIVATED_REVIEW='ACC Activated / Snapshot Not Matched',ACC_INACTIVE='ACC Activated / Confirmed Inactive',ACC_SUSPENDED='ACC Activated / Suspended';
let latestDiscrepancySave=null;
const TERMINAL_ADMISSION_STATUSES=new Set(['Not Qualified','Withdrawal Requested','Withdrawn','Deferred']);
const accActivatedSnapshotReviews=()=>data.filter(x=>x.accFound&&!x.activated&&[ACC_ACTIVATED_REVIEW,ACC_INACTIVE,ACC_SUSPENDED].includes(x.processingCategory));
const pendingAdmissionCandidates=()=>data.filter(x=>x.accFound&&!x.activated&&!x.processingCategory&&!TERMINAL_ADMISSION_STATUSES.has(x.continuation?.status));
const stages={interested:"Not Applied",applied:"Applied in ACC",activated:"Activated"};
function chip(s){return `<span class="tag ${s==="activated"?"green":s==="applied"?"blue":"amber"}">${stages[s]||esc(s)}</span>`}
function navigate(page){document.querySelectorAll('.section').forEach(s=>s.classList.toggle('active',s.id===page));document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',b.dataset.page===page));$('crumb').textContent=({dashboard:"Overview",preview:"Preview Calendar",candidates:"Candidate Pipeline",intakes:"Programme & Intake",followups:"Follow-up Tasks",sources:"Data Connections",team:"Team Management"})[page];$('mobileNav').hidden=true;render();window.scrollTo(0,0)}
document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>navigate(b.dataset.page));

function summaryBreakdown(){
 const v=window.ipgsSummary;
 if(!v||!Number.isFinite(v.internalTotalActive)||!v.applicationBreakdown)return null;
 const b=v.applicationBreakdown;
 const n=k=>Math.max(0,Number(b[k]||0));
 return {v,active:n('Active in Sky'),accActivatedReview:n(ACC_ACTIVATED_REVIEW),accInactive:n(ACC_INACTIVE),accSuspended:n(ACC_SUSPENDED),pending:n('Pending Review / Activation'),notQualified:n('Not Qualified'),withdrawn:n('Withdrawn'),withdrawalRequested:n('Withdrawal Requested'),deferred:n('Deferred'),sum:Object.values(b).reduce((x,y)=>x+Number(y||0),0)};
}
function updateKpiCard(id,label,hint){
 const num=$(id),card=num?.closest('.card');
 if(!card)return;
 const top=card.querySelector('.ctop'),small=card.querySelector('.hint');
 if(top?.firstChild)top.firstChild.textContent=label+' ';
 if(small)small.innerHTML=hint;
}
function isClosedInternal(x){return x.activated===true&&x.snapshotCategory==='Internal'}
function summaries(){
 const leads=data.length,scope=summaryBreakdown(),v=scope?.v;
 const fromPreview=v?Number(v.internalFromPreview):null,outside=v?Number(v.internalOutsidePreview):null,total=v?Number(v.internalTotalActive):null;
 const notClosed=fromPreview===null?null:Math.max(0,leads-fromPreview);
 const previewCount=data.filter(isClosedInternal).length;
 const consistent=v&&Number.isInteger(fromPreview)&&Number.isInteger(outside)&&Number.isInteger(total)&&fromPreview===previewCount&&fromPreview+outside===total&&fromPreview<=leads;
 $("kInterested").textContent=String(leads);
 $("kPending").textContent=consistent?String(notClosed):'—';
 $("kApplied").textContent=consistent?String(fromPreview):'—';
 $("kActivated").textContent=consistent?String(total):'—';
 updateKpiCard('kInterested','Marketing Form Leads','Unique registrations from IPGS marketing / preview forms');
 updateKpiCard('kPending','Not Yet Closed · Internal IPGS',
  consistent?'<div class="kpi-foot">Leads not currently Active as Internal IPGS in Sky. Some may already have ACC applications, be Inactive, or belong to another category. <b>Not equal to “Not Applied”.</b></div>':'Awaiting verified Internal IPGS Snapshot reconciliation');
 updateKpiCard('kApplied','Closed · From Marketing Form',
  consistent?'<div class="kpi-breakdown"><span class="kpi-mini ok"><b>'+fromPreview+'</b> Verified Sky Active · Internal IPGS</span></div><div class="kpi-foot">Counted only after an Active match in Sky Snapshot. ACC submission alone is not a closing.</div>':'Awaiting verified Internal IPGS Snapshot reconciliation');
 updateKpiCard('kActivated','Total Active · Internal IPGS',
  consistent?'<div class="kpi-breakdown"><span class="kpi-mini ok"><b>'+fromPreview+'</b> From Marketing Form</span><span class="kpi-mini"><b>'+outside+'</b> Outside Preview</span></div><div class="kpi-foot">✓ Same as Snapshot Active in Internal IPGS category · DPLI excluded</div>':'Awaiting verified Internal IPGS Snapshot reconciliation');
 const cards=document.querySelector('#kInterested')?.closest('.cards');
 if(cards){
  let note=document.getElementById('ipgsKpiScopeNote');
  if(!note){note=document.createElement('p');note.id='ipgsKpiScopeNote';note.className='kpi-scope-note';cards.insertAdjacentElement('afterend',note)}
  note.textContent=consistent
   ?'IPGS Marketing Closing: '+leads+' leads = '+fromPreview+' confirmed Active from Marketing + '+notClosed+' not yet counted as Internal IPGS Active. Snapshot Internal IPGS Active = '+fromPreview+' from Marketing + '+outside+' Outside Preview = '+total+'. “Not Yet Closed” does NOT mean no ACC admission form was submitted.'
   :'Unable to confirm the Marketing-to-Snapshot closing reconciliation. The dashboard does not assume ACC submission or activation.';
 }
 const steps=[['Marketing Form Leads',leads,'',true]];
 if(consistent)steps.push(['Verified Internal IPGS Closed · From Marketing',fromPreview,'green',true],['Not Yet Closed · Internal IPGS',notClosed,'light',true],['Active Outside Preview',outside,'green',false],['TOTAL Internal IPGS Active · Sky',total,'green',false]);
 $("funnel").innerHTML=steps.map(([name,count,color,preview])=>'<div class="progress"><div class="progtitle"><span>'+esc(name)+'</span><span>'+count+(preview?' <span class="muted">/ '+pct(count,leads)+'% of marketing leads</span>':' <span class="muted">/ Snapshot</span>')+'</span></div><div class="track"><div class="fill '+color+'" style="width:'+pct(count,preview?leads:(total||1))+'%"></div></div></div>').join('');
 const caption=$("funnel")?.nextElementSibling;
 if(caption?.classList.contains('small'))caption.textContent='Closing is verified only from Sky Active with category Internal IPGS. ACC applications and inactive cases remain available in Admission Operations but are not treated as closed sales.';
 const programmes={};data.forEach(x=>programmes[x.programme]=(programmes[x.programme]||0)+1);
 $("programmeChart").innerHTML=Object.entries(programmes).sort((a,b)=>b[1]-a[1]).map(([p,count])=>'<div class="chartrow"><span>'+esc(p)+'</span><div class="track"><div class="fill" style="width:'+pct(count,leads)+'%"></div></div><b>'+count+'</b></div>').join('')||'<div class="empty">No candidates yet</div>';
 $("miniIntakes").innerHTML=intakeGroups().slice(0,6).map(x=>'<tr><td><strong>'+esc(x.programme)+'</strong></td><td>'+esc(x.intake)+'</td><td>'+x.n+'</td><td>'+x.cl+'</td><td>'+(x.n-x.cl)+'</td><td>'+pct(x.cl,x.n)+'%</td></tr>').join('');
}
function intakeGroups(){const m={};data.forEach(x=>{const k=x.programme+"|"+x.intake;if(!m[k])m[k]={programme:x.programme,intake:x.intake,n:0,ap:0,ac:0,cl:0};m[k].n++;if(x.accFound)m[k].ap++;if(x.activated)m[k].ac++;if(isClosedInternal(x))m[k].cl++});return Object.values(m).sort((a,b)=>a.programme.localeCompare(b.programme)||a.intake.localeCompare(b.intake))}
function populate(id,items,label){const e=$(id),old=e.value,counts={};items.filter(Boolean).forEach(x=>counts[x]=(counts[x]||0)+1);e.innerHTML=`<option value="">${label}</option>`+Object.keys(counts).sort().map(x=>`<option value="${esc(x)}">${esc(x)} (${counts[x]})</option>`).join("");e.value=Object.hasOwn(counts,old)?old:''}
function candidateFilters(){return {continuation:document.getElementById('filterContinuation')?.value||'',search:$("search").value,programme:$("filterProgramme").value,intake:$("filterIntake").value,from:$("filterFrom").value,to:$("filterTo").value,acc:$("filterAcc").value,activation:$("filterActivation").value,category:$("filterCategory").value,source:$("filterSource").value,sort:$("candidateSort").value}}
function categoryBadge(x){return `<span class="tag ${x.activated?(x.snapshotCategory==='Internal'?'green':'category-warning'):'gray'}">${esc(A.categoryLabel(x.snapshotCategory))}</span>`}
function candidateTableRows(list,filter={}){return list.map(x=>{const registered=A.latest(x,filter),day=registered?A.formatDate(registered,false):'Date unavailable',time=registered?new Intl.DateTimeFormat('en-MY',{timeZone:A.zone,hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(registered)):'';return `<tr data-candidate="${esc(x.id)}" tabindex="0" aria-label="Open profile for ${esc(x.name)}"><td><strong>${esc(x.name)}</strong><div class="muted">${esc(x.email)}</div></td><td><div class="registration-date">${esc(day)}</div><div class="registration-time">${esc(time)}${x.registrationCount>1?' · '+x.registrationCount+' submissions':''}</div></td><td><strong>${esc(x.programme)}</strong><div class="muted">${esc(x.intake)}</div></td><td><span class="tag ${x.accFound?'blue':'gray'}">${x.accFound?'In ACC':'Not in ACC'}</span></td><td><span class="tag ${x.activated?'green':'gray'}">${x.activated?'Active':x.processingCategory?'ACC Activated · Snapshot Review':'Not confirmed'}</span>${x.identityMatchMethod==='Verified ID cross-reference'?'<div class="muted">Verified ID variant</div>':''}</td><td class="category-cell">${categoryBadge(x)}<div style="margin-top:5px"><span class="tag ${x.continuation?.status==='Withdrawal Requested'?'amber':x.continuation?.status==='Withdrawn'?'gray':'blue'}">${esc(x.continuation?.status||'Not Set')}</span></div></td></tr>`}).join('')||'<tr><td colspan="6" class="empty">No candidates match this selection.</td></tr>'}
function renderCandidates(){
 const f=candidateFilters(),invalid=f.from&&f.to&&f.from>f.to;
 $("filterError").textContent=invalid?'Choose an end date on or after the start date.':'';
 const list=(invalid?[]:A.filterCandidates(data,f)).filter(x=>(!f.continuation||x.continuation?.status===f.continuation)&&((activeQuick!=='admission'||(x.accFound&&!x.activated&&!x.processingCategory&&!TERMINAL_ADMISSION_STATUSES.has(x.continuation?.status)))&&(activeQuick!=='accsky'||[ACC_ACTIVATED_REVIEW,ACC_INACTIVE,ACC_SUSPENDED].includes(x.processingCategory)))),stats=A.stats(list,f);
 $("candidateCount").textContent=`${list.length} of ${data.length} candidates`;
 $("candidateRows").innerHTML=candidateTableRows(list,f);
 $("filteredKpis").innerHTML=`<span><b>${stats.applied}</b>in ACC</span><span><b>${stats.active}</b>active</span><span><b>${stats.awaitingAcc}</b>awaiting ACC</span>`;
 const base=A.filterCandidates(data,{...f,acc:'',activation:'',category:''}).filter(x=>!f.continuation||x.continuation?.status===f.continuation);
 const quick=[['all','All candidates',base.length],['acc','Awaiting ACC',base.filter(x=>!x.accFound).length],['activation','Awaiting activation',base.filter(x=>!x.activated).length],['admission','ACC Applied · Pending Review',base.filter(x=>x.accFound&&!x.activated&&!x.processingCategory&&!TERMINAL_ADMISSION_STATUSES.has(x.continuation?.status)).length],['accsky','ACC Activated · Snapshot Review',base.filter(x=>[ACC_ACTIVATED_REVIEW,ACC_INACTIVE,ACC_SUSPENDED].includes(x.processingCategory)).length],['active','Active',base.filter(x=>x.activated).length],['review','Review category',base.filter(x=>x.activated&&x.snapshotCategory!=='Internal').length],['discrepancy','Active, no ACC',base.filter(x=>x.activated&&!x.accFound).length],['withdrawal','Withdrawal requested',base.filter(x=>x.continuation?.status==='Withdrawal Requested').length]];
 $("quickFilters").innerHTML=quick.map(([key,label,count])=>`<button class="quick-chip ${activeQuick===key?'active':''}" data-quick="${key}" aria-pressed="${activeQuick===key}">${label}<b>${count}</b></button>`).join('');
}
function clearQuickFilter(){activeQuick='';renderCandidates()}
function setQuickFilter(key){activeQuick=key;const cont=document.getElementById('filterContinuation');if(cont)cont.value=key==='withdrawal'?'Withdrawal Requested':'';$("filterAcc").value=['admission','accsky'].includes(key)?'matched':['acc','discrepancy'].includes(key)?'missing':'';$("filterActivation").value=['active','discrepancy'].includes(key)?'active':['activation','admission','accsky'].includes(key)?'pending':'';$("filterCategory").value=key==='review'?'review':'';renderCandidates()}
function setDatePreset(value){const today=A.localDate(new Date().toISOString()),shift=(n)=>new Date(new Date(today+'T12:00:00Z').getTime()+n*86400000).toISOString().slice(0,10);let from='',to='';if(value==='today')from=to=today;if(value==='yesterday')from=to=shift(-1);if(value==='week'){from=shift(-6);to=today}if(value==='month'){from=today.slice(0,7)+'-01';to=today}if(value==='custom'){renderCandidates();return}$("filterFrom").value=from;$("filterTo").value=to;renderCandidates()}
function customDateFilter(){$("datePreset").value='custom';renderCandidates()}
function resetCandidateFilters(){for(const id of ['search','filterProgramme','filterIntake','filterFrom','filterTo','filterAcc','filterActivation','filterCategory','filterSource'])$(id).value='';$("candidateSort").value='newest';$("datePreset").value='all';activeQuick='all';if(document.getElementById('filterContinuation'))document.getElementById('filterContinuation').value='';renderCandidates()}
function calendarFilters(){return {programme:$("calendarProgramme").value,intake:$("calendarIntake").value,source:$("calendarSource").value}}
function initialiseCalendar(){if(calendarInitialised||!data.length)return;const dates=Object.keys(A.days(data)).sort();selectedDay=dates.at(-1)||A.localDate(new Date().toISOString());calendarMonth=selectedDay.slice(0,7);calendarInitialised=true}
function selectCalendarDate(day){selectedDay=day;calendarMonth=day.slice(0,7);renderCalendar()}
function moveMonth(delta){const [year,month]=calendarMonth.split('-').map(Number),d=new Date(Date.UTC(year,month-1+delta,1));calendarMonth=d.toISOString().slice(0,7);renderCalendar()}
function calendarToday(){selectCalendarDate(A.localDate(new Date().toISOString()))}
function renderCalendar(){
 const f=calendarFilters(),allDays=A.days(data,f),[year,month]=calendarMonth.split('-').map(Number),first=new Date(Date.UTC(year,month-1,1)),offset=(first.getUTCDay()+6)%7,last=new Date(Date.UTC(year,month,0)).getUTCDate(),today=A.localDate(new Date().toISOString());
 $("calendarMonth").textContent=new Intl.DateTimeFormat('en-MY',{timeZone:'UTC',month:'long',year:'numeric'}).format(first);
 let cells=Array.from({length:offset},()=>'<div aria-hidden="true"></div>');
 for(let i=1;i<=last;i++){const date=`${calendarMonth}-${String(i).padStart(2,'0')}`,count=allDays[date]?.unique||0;cells.push(`<button class="calendar-day ${count?'has-registrations':''} ${date===selectedDay?'selected':''} ${date===today?'today':''}" data-date="${date}" aria-pressed="${date===selectedDay}" aria-label="${date}: ${count} unique students registered"><span>${i}</span>${count?`<strong>${count}</strong><small>registered</small>`:'<small>—</small>'}</button>`)}
 $("calendarGrid").innerHTML=cells.join('');
 const monthCandidates=A.filterCandidates(data,{...f,from:calendarMonth+'-01',to:calendarMonth+'-'+String(last).padStart(2,'0')});
 $("calendarMonthTotal").textContent=monthCandidates.length+' unique students this month';
 const unknown=data.filter(x=>!x.registeredAt).length;
 $("calendarUnknown").innerHTML=unknown?`<div class="date-alert">${unknown} candidate(s) have no valid registration date and are excluded from calendar counts.</div>`:'';
 const sf={...f,from:selectedDay,to:selectedDay},list=A.filterCandidates(data,sf),s=A.stats(list,sf);
 $("sessionDate").textContent=A.formatDate(selectedDay+'T12:00:00+08:00',false);
 $("sessionClose").textContent=s.unique;$("sessionSubmissions").textContent=s.submissions+' form submission'+(s.submissions===1?'':'s')+' · '+(s.submissions-s.unique)+' repeat submission'+(s.submissions-s.unique===1?'':'s');
 const closedCount=list.filter(isClosedInternal).length;$("sessionApplied").textContent=closedCount;$("sessionActive").textContent=s.unique-closedCount;$("sessionPending").textContent=pct(closedCount,s.unique)+'%';
 const programmes={};list.forEach(x=>programmes[x.programme]=(programmes[x.programme]||0)+1);
 $("sessionProgrammes").innerHTML=Object.entries(programmes).sort((a,b)=>b[1]-a[1]).map(([p,n])=>`<div class="session-programme"><span>${esc(p)}</span><strong>${n}</strong></div>`).join('')||'<p class="small">No registrations on this date for the selected filters.</p>';
 $("sessionRows").innerHTML=candidateTableRows(list,sf);$("sessionListCount").textContent=s.unique+' candidates';$("sessionListTitle").textContent='Registered on '+A.formatDate(selectedDay+'T12:00:00+08:00',false);
}
function viewSessionCandidates(){resetCandidateFilters();const f=calendarFilters();$("filterFrom").value=selectedDay;$("filterTo").value=selectedDay;$("filterProgramme").value=f.programme;$("filterIntake").value=f.intake;$("filterSource").value=f.source;$("datePreset").value='custom';navigate('candidates')}
function openPreviewDate(date){selectCalendarDate(date);navigate('preview')}
function renderRecentSessions(){const rows=Object.values(A.days(data)).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,4),closedDays=A.days(data.filter(isClosedInternal));$("recentSessions").innerHTML=rows.map(r=>`<button class="recent-session" data-preview-date="${r.date}"><span>${esc(A.formatDate(r.date+'T12:00:00+08:00',false))}</span><strong>${r.unique} <span class="small">registrations</span></strong><small>${closedDays[r.date]?.unique||0} closed · verified Internal IPGS Active</small></button>`).join('')||'<p class="small">Registration dates will appear after data is connected.</p>'}
function renderIntakes(){const p=$("intakeProgramme").value,y=$("intakeYear").value;$("intakeRows").innerHTML=intakeGroups().filter(x=>(!p||x.programme===p)&&(!y||x.intake.includes(y))).map(x=>`<tr><td><strong>${esc(x.programme)}</strong></td><td>${esc(x.intake)}</td><td>${x.n}</td><td>${x.cl}</td><td>${x.n-x.cl}</td><td>${pct(x.cl,x.n)}%</td></tr>`).join("")||'<tr><td colspan="6" class="empty">No intake records found.</td></tr>'}
function renderTasks(){const due=new Date().toISOString().slice(0,10);$("taskOpen").textContent=tasks.filter(x=>!x.done).length;$("taskDone").textContent=tasks.filter(x=>x.done).length;$("taskDue").textContent=tasks.filter(x=>!x.done&&x.due<=due).length;$("taskRows").innerHTML=tasks.map(x=>`<tr><td>${esc(x.name)}</td><td><strong>${esc(x.activity)}</strong></td><td>${esc(x.due)}</td><td><span class="tag ${x.done?"green":"amber"}">${x.done?"Completed":"Open"}</span></td><td><button class="btn" onclick="event.stopPropagation();toggleTask('${esc(x.id)}')">${x.done?"Reopen":"Complete"}</button></td></tr>`).join("")||'<tr><td colspan="5" class="empty">No follow-up tasks yet. Add your first task.</td></tr>'}
function renderPendingWorklist(){
 let root=document.getElementById('ipgsPendingWorklist');
 if(!root){
  root=document.createElement('section');root.id='ipgsPendingWorklist';root.className='ipgs-pending-worklist';
  const target=document.getElementById('recentSessions')?.closest('.panel');
  if(target?.parentElement)target.parentElement.insertBefore(root,target);
 }
 if(!root)return;
 const pending=pendingAdmissionCandidates();
 const accDiscrepancies=accActivatedSnapshotReviews();
 const confirmedInactive=accDiscrepancies.filter(x=>x.processingCategory===ACC_INACTIVE);
 const confirmedSuspended=accDiscrepancies.filter(x=>x.processingCategory===ACC_SUSPENDED);
 const pendingWithoutRemark=pending.filter(x=>!String(x.continuation?.reason||'').trim());
 const pendingDpli=pending.filter(x=>/DPLI|DIPLOMA PERGURUAN LEPASAN IJAZAH/i.test(String(x.programme||''))).length;
 const alreadyFlagged=data.filter(x=>x.accFound&&!x.activated&&TERMINAL_ADMISSION_STATUSES.has(x.continuation?.status));
 const latest=window.ipgsSummary;
 root.innerHTML=(latestDiscrepancySave?'<div class="recon-save-result '+(latestDiscrepancySave.ok?'saved':'error')+'" role="status">'+esc(latestDiscrepancySave.message)+'</div>':'')+'<div class="panelhead"><div><h2>Admission Team — Pending Activation Worklist</h2><div class="small">Marketing Form applicants with ACC applications but not Active in Sky. Every case needs a documented reason or follow-up.</div></div><div class="buttons"><button class="btn soft" onclick="downloadPendingAdmissionsCSV()">↓ Export Pending List</button><button class="btn primary" onclick="navigatePendingAdmissions()">Review Pending in Candidate Pipeline</button></div></div>'
 +'<div class="pending-worklist-stats"><div><small>Pending Review / Activation</small><strong>'+pending.length+'</strong></div><div><small>Unresolved Snapshot Mismatch</small><strong>'+accDiscrepancies.filter(x=>x.processingCategory===ACC_ACTIVATED_REVIEW).length+'</strong></div><div><small>Confirmed Sky Inactive</small><strong>'+confirmedInactive.length+'</strong></div><div><small>Suspended</small><strong>'+confirmedSuspended.length+'</strong></div><div><small>Awaiting Pending Remarks</small><strong>'+pendingWithoutRemark.length+'</strong></div><div><small>Other Non-Active Decisions</small><strong>'+alreadyFlagged.length+'</strong></div></div>'
 +'<p class="small">'+(latest?.applied!=null?'Part of '+latest.applied+' ACC applications from Marketing Form, including other categories. ':'')+'Pending '+pending.length+' = '+(pending.length-pendingDpli)+' non-DPLI + '+pendingDpli+' DPLI (separate team). The '+accDiscrepancies.length+' ACC-activated non-Active cases below are a SUBTOTAL ('+confirmedInactive.length+' Inactive + '+confirmedSuspended.length+' Suspended + '+accDiscrepancies.filter(x=>x.processingCategory===ACC_ACTIVATED_REVIEW).length+' Unresolved), never additional to these categories. Staff remarks do not change ACC or Sky.</p>'
 +'<div class="recon-tablewrap"><table class="pending-worklist-table"><thead><tr><th>Student</th><th>Programme / Intake</th><th>Processing Status</th><th>Remark / Required Follow-up</th><th>Action</th></tr></thead><tbody>'
 +pending.map(x=>'<tr data-candidate="'+esc(x.id)+'" tabindex="0"><td><strong>'+esc(x.name)+'</strong><div class="muted">'+esc(x.ic)+'</div></td><td>'+esc(x.programme)+'<div class="muted">'+esc(x.intake)+'</div></td><td><span class="tag amber">'+esc(x.continuation?.status&&x.continuation.status!=='Not Set'?x.continuation.status:'Unclassified — review')+'</span></td><td>'+esc(x.continuation?.reason||'No remark yet — review required')+'</td><td><button class="btn soft" type="button" data-candidate="'+esc(x.id)+'">Review &amp; Remark</button></td></tr>').join('')
 +'</tbody></table></div>'
 +(!pending.length?'<p class="small">No pending admission cases in the current Marketing → ACC cohort.</p>':'')
 +'<details open><summary>ACC activated, currently not Active — '+accDiscrepancies.length+' unique cases ('+confirmedInactive.length+' Inactive + '+confirmedSuspended.length+' Suspended + '+accDiscrepancies.filter(x=>x.processingCategory===ACC_ACTIVATED_REVIEW).length+' Unresolved)</summary><p class="small">ACC activation and matric exist, but the latest Snapshot has no Active match. Record a verified Sky status and reason below. This does not reactivate students or change ACC/Sky.</p>'
 +'<div class="recon-tablewrap"><table class="pending-worklist-table"><thead><tr><th>Student / ACC Matric</th><th>Verified Sky Status</th><th>Staff Remark / Reason</th><th>Action</th></tr></thead><tbody>'
 +accDiscrepancies.map(x=>{
   const st=x.continuation?.status||'Not Set',reason=x.continuation?.reason||'';
   const values=[...new Set([st,'Sky Status Verification','Sky Inactive (Verified)','Sky Suspended (Verified)','Snapshot Sync Pending','Reactivation Pending'])];
   const select=values.map(z=>'<option value="'+esc(z)+'" '+(st===z?'selected':'')+'>'+esc(z)+'</option>').join('');
   return '<tr><td><strong>'+esc(x.name)+'</strong><div class="muted">ACC Matric: '+esc(x.accMatric||'Not recorded')+'</div></td><td><span class="tag '+(st==='Sky Inactive (Verified)'?'amber':'blue')+'">'+esc(st==='Not Set'?'Not verified':st)+'</span></td><td class="discrepancy-remark">'+(reason?esc(reason):'<span class="muted">No remark saved — review required</span>')+(latestDiscrepancySave?.ok&&latestDiscrepancySave.id===x.id?'<div class="recon-inline-saved">✓ Saved and verified</div>':'')+'</td><td><button class="btn soft" type="button" onclick="openDiscrepancyEditor(event,\''+esc(x.id)+'\')">Edit Status &amp; Remark</button></td></tr>'
   +'<tr class="discrepancy-editor" hidden><td colspan="4"><form onsubmit="saveDiscrepancy(event,\''+esc(x.id)+'\')"><div class="discrepancy-fields"><label>Sky status (verified)<select name="status" required>'+select+'</select></label><label>Remark / reason (required)<textarea name="reason" rows="2" maxlength="2000" required placeholder="E.g. Verified in Sky on [date]: student is Inactive. Reason: ...">'+esc(reason)+'</textarea></label><button class="btn primary" type="submit">Save &amp; Verify</button></div><p class="small discrepancy-editor-feedback" role="status">Tracks Sky status reported by staff; does not modify Sky or ACC.</p></form></td></tr>';
 }).join('')+'</tbody></table></div></details>'
 +'<details><summary>View non-active cases with recorded decisions ('+alreadyFlagged.length+')</summary><div class="recon-tablewrap"><table><thead><tr><th>Student</th><th>Decision</th><th>Remark</th></tr></thead><tbody>'+alreadyFlagged.map(x=>'<tr data-candidate="'+esc(x.id)+'"><td>'+esc(x.name)+'</td><td>'+esc(x.continuation.status)+'</td><td>'+esc(x.continuation.reason||'Not recorded')+'</td></tr>').join('')+'</tbody></table></div></details>';
}
function openDiscrepancyEditor(e,id){
 e.preventDefault();e.stopPropagation();
 const row=e.target.closest('tr'),editor=row?.nextElementSibling;
 if(!editor?.classList.contains('discrepancy-editor'))return;
 editor.hidden=!editor.hidden;
 if(!editor.hidden)editor.querySelector('textarea')?.focus();
}
async function saveDiscrepancy(e,id){
 e.preventDefault();e.stopPropagation();
 const x=data.find(v=>v.id===id),form=e.target;
 if(!x||!form)return;
 const status=String(new FormData(form).get('status')||''),reason=String(new FormData(form).get('reason')||'').trim();
 const message=form.querySelector('.discrepancy-editor-feedback'),button=form.querySelector('button[type="submit"]');
 if(!reason||status==='Not Set'){message.textContent='Select a verified status and add a reason before saving.';return}
 button.disabled=true;message.textContent='Saving remark…';
 try{
  const response=await fetch('/api/continuation',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({ic:x.ic,name:x.name,status,reason})});
  const result=await response.json();
  if(!response.ok||!result.ok)throw Error(result.error||'Save was rejected');
  x.continuation=result.continuation;
  message.textContent='Saved to tracking. Checking live data…';
  const refreshed=await syncLive();
  const stored=data.find(v=>v.ic===x.ic)?.continuation;
  if(!refreshed||stored?.status!==status||String(stored.reason||'').trim()!==reason){
   latestDiscrepancySave={ok:false,message:'Save request accepted, but live read-back could not confirm the change for '+x.name+'. Check connection or refresh.'};
  }else latestDiscrepancySave={ok:true,id:x.id,message:'Saved and verified: '+x.name+' — '+status+'. Remark is now visible in the ACC Activated worklist.'};
  renderPendingWorklist();
 }catch(err){message.textContent='Not saved: '+String(err.message||err);message.classList.add('error');}
 finally{button.disabled=false}
}
function navigatePendingAdmissions(){
 navigate('candidates');
 resetCandidateFilters();
 $('filterAcc').value='matched';$('filterActivation').value='pending';
 activeQuick='admission';renderCandidates();
 document.getElementById('quickFilters')?.scrollIntoView?.({behavior:'smooth',block:'center'});
}
function downloadPendingAdmissionsCSV(){
 const list=pendingAdmissionCandidates();
 const rows=[['Student Name','IC / Passport','Email','Programme','Preferred Intake','ACC Applied','Snapshot Active','Processing Status','Remark / Reason','Last Updated'],...list.map(x=>[x.name,x.ic,x.email,x.programme,x.intake,'YES','NO',x.continuation?.status||'Not Set',x.continuation?.reason||'',x.continuation?.updatedAt||''])];
 const safe=value=>{const v=String(value??'');return /^[=+@-]/.test(v)?"'"+v:v};
 const csv=String.fromCharCode(0xFEFF)+rows.map(row=>row.map(value=>'"'+safe(value).replace(/"/g,'""')+'"').join(',')).join(String.fromCharCode(13,10));
 const link=document.createElement('a'),url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
 link.href=url;link.download='ipgs-acc-pending-activation-'+new Date().toISOString().slice(0,10)+'.csv';link.click();URL.revokeObjectURL(url);
}
function renderReconciliation(){
 let panel=document.getElementById('ipgsReconciliation');
 if(!panel){
  panel=document.createElement('section');panel.id='ipgsReconciliation';panel.className='ipgs-reconciliation';
  const point=document.getElementById('recentSessions'),host=point?.closest('.panel')||point?.parentElement;
  if(host?.parentElement)host.parentElement.insertBefore(panel,host);
 }
 if(!panel)return;
 const m=summaryBreakdown(),v=m?.v;
 if(!m){panel.innerHTML='<h3>Marketing Closing Verification</h3><p>Waiting for live Sky Snapshot reconciliation. No unverified Active or admission status is assumed.</p>';return}
 const n=data.length,preview=Number(v.internalFromPreview),outside=Number(v.internalOutsidePreview),total=Number(v.internalTotalActive);
 const verifiedCount=data.filter(isClosedInternal).length,closedOk=preview===verifiedCount&&preview+outside===total&&preview<=n;
 const otherActive=data.filter(x=>x.activated&&x.snapshotCategory!=='Internal').length;
 const appBalanced=m.sum===Number(v.applied);
 const entries=[['ACC Applied + Sky Active · all categories',m.active],['ACC Activated / Snapshot Not Matched',m.accActivatedReview],['Temporarily Inactive',m.accInactive],['Suspended',m.accSuspended],['Pending Admission Review',m.pending],['Not Qualified',m.notQualified],['Withdrawn',m.withdrawn],['Withdrawal Requested',m.withdrawalRequested],['Deferred',m.deferred]];
 const outsideList=window.ipgsOutside||[];
 panel.innerHTML='<h3>Marketing Closing — Verified Against Sky Snapshot</h3>'
 +'<div class="recon-totals"><div><small>Marketing Form Leads</small><strong>'+n+'</strong></div><div><small>Closed · From Marketing</small><strong>'+preview+'</strong></div><div><small>Not Yet Closed</small><strong>'+(n-preview)+'</strong></div></div>'
 +'<div class="recon-equation"><strong>'+preview+' Active From Marketing</strong> + <strong>'+outside+' Active Outside Preview</strong> = <strong>'+total+' Total Internal IPGS Active</strong> <b class="'+(closedOk?'recon-ok':'recon-error')+'">'+(closedOk?'✓ Matched to Sky':'⚠ Check Snapshot / identity matching')+'</b></div>'
 +'<p class="small">Only current Sky Active with category Internal / IPGS Sales &amp; Marketing is counted as closed. DPLI and agent / partner categories are excluded. '+(n-preview)+' Not Yet Closed is NOT a claim that those leads have never submitted an admission form.</p>'
 +(otherActive?'<p class="small">'+otherActive+' Marketing Form leads are Active in Sky under OTHER categories and are deliberately excluded from Internal IPGS closing pending ownership verification.</p>':'')
 +'<details><summary>Outside Preview — '+outside+' active students</summary><div class="recon-tablewrap"><table><thead><tr><th>Student</th><th>Programme</th><th>ACC</th></tr></thead><tbody>'+outsideList.map(x=>'<tr><td>'+esc(x.name)+'</td><td>'+esc(x.programme)+'</td><td>'+(x.accFound?'Matched':'Not matched')+'</td></tr>').join('')+'</tbody></table></div></details>'
 +'<details><summary>Admission Operations (internal review only — excluded from closing KPI)</summary><p class="small">ACC applications are still tracked accurately for Registry. Submitting ACC does not by itself indicate Sky Active.</p>'
 +'<p class="recon-equation">'+v.applied+' ACC applied = '+entries.map(([name,value])=>'<span>'+value+' '+esc(name)+'</span>').join(' + ')+' <b class="'+(appBalanced?'recon-ok':'recon-error')+'">'+(appBalanced?'✓ Balanced':'⚠ Mismatch')+'</b></p></details>';
}
function render(){if(!document.getElementById('filterContinuation')){const select=document.createElement('select');select.id='filterContinuation';select.setAttribute('aria-label','Student continuation status');select.innerHTML='<option value="">All continuation statuses</option>'+ADMISSION_REVIEW_STATUSES.filter(x=>x!=='Not Set').concat('Not Set').map(x=>'<option value="'+x+'">'+x+'</option>').join('');select.onchange=renderCandidates;document.getElementById('quickFilters')?.parentElement?.insertBefore(select,document.getElementById('quickFilters'));}populate("filterProgramme",data.map(x=>x.programme),"All Programmes");populate("filterIntake",data.map(x=>x.intake),"All Intakes");populate("calendarProgramme",data.map(x=>x.programme),"All Programmes");populate("calendarIntake",data.map(x=>x.intake),"All Intakes");populate("intakeProgramme",data.map(x=>x.programme),"All Programmes");populate("intakeYear",data.map(x=>x.intake.match(/\d{4}/)?.[0]),"All Years");const e=$("filterCategory"),old=e.value,values=[...new Set(data.filter(x=>x.activated).map(x=>x.snapshotCategory||'Unassigned'))].sort();e.innerHTML='<option value="">All categories / statuses</option><option value="review">Active: category is not IPGS</option><option value="pending">Not active in Snapshot</option>'+values.map(v=>`<option value="${esc(v)}">${esc(A.categoryLabel(v))} (${data.filter(x=>x.activated&&(x.snapshotCategory||'Unassigned')===v).length})</option>`).join('');e.value=[...e.options].some(o=>o.value===old)?old:'';summaries();renderPendingWorklist();renderReconciliation();let statusPanel=document.getElementById('continuationPanel');if(!statusPanel){statusPanel=document.createElement('div');statusPanel.id='continuationPanel';statusPanel.style.cssText='background:#fff;border:1px solid #dde4ed;border-radius:14px;padding:18px;margin:18px 0';const target=document.getElementById('recentSessions')?.closest('.panel')||document.getElementById('recentSessions')?.parentElement;if(target)target.parentElement.insertBefore(statusPanel,target);}if(statusPanel)statusPanel.innerHTML='<strong>Student Continuation</strong><div style="display:flex;gap:22px;flex-wrap:wrap;margin-top:12px"><span>Withdrawal requested: <b>'+data.filter(x=>x.continuation?.status==='Withdrawal Requested').length+'</b></span><span>Withdrawn (confirmed): <b>'+data.filter(x=>x.continuation?.status==='Withdrawn').length+'</b></span><span>Deferred: <b>'+data.filter(x=>x.continuation?.status==='Deferred').length+'</b></span></div><p class="small">Continuation records are independent from official ACC and Sky activation. Use Candidate Profile to save continuation status and remarks. ACC and Sky activation remain unchanged.</p>';renderRecentSessions();renderCalendar();renderCandidates();renderIntakes();renderTasks()}
function modal(title,content){$("modalTitle").textContent=title;$("modalBody").innerHTML=content;$("modalbg").classList.add("show")}function closeModal(){$("modalbg").classList.remove("show")}document.getElementById("modalbg").onclick=e=>{if(e.target.id==="modalbg")closeModal()};
function showDetail(id){let x=data.find(x=>x.id===id);if(!x)return;modal("Candidate Profile",`<div class="detailgrid">${[["Full Name",x.name],["IC / Passport",x.ic],["Email",x.email],["Programme",x.programme],["Preferred Intake",x.intake],["Original Preferred Intake",x.preferredIntakeOriginal||"Unspecified"],["Latest Registration",A.formatDate(x.registeredAt)],["First Registration",A.formatDate(x.firstRegisteredAt)],["Form Submissions",x.registrationCount||1],["Registration Form",x.sourceTab||x.source],["Snapshot Category",A.categoryLabel(x.snapshotCategory)],["Sky ID No",x.snapshotId||"Not matched"],["Identity Match",x.identityMatchMethod||"Exact ID"],["ACC Intake",x.accIntake||"Not available"],["Sky Intake",x.skyIntake||"Not available"],["Continuation Status",x.continuation?.status||"Not Set"],["Continuation Remarks",x.continuation?.reason||"Not recorded"],["Withdrawal Effective Date",x.continuation?.effectiveDate||"Not confirmed"]].map(([l,v])=>`<div><small>${l}</small><strong>${esc(v)}</strong></div>`).join("")}</div><p style="margin-top:20px">${chip(x.stage)}</p><p class="small">ACC application: ${x.accFound?"Matched":"Not matched"}. Snapshot activation: ${x.activated?"Active":"Not confirmed"}. ${x.processingCategory?"ACC is marked Activated with matric; verify the latest Snapshot before any duplicate activation.":""} ${x.activated&&!x.accFound?"Activated — ACC not matched. Review this discrepancy.":""}</p>${x.identityMatchMethod==="Verified ID cross-reference"?'<p class="date-alert"><strong>Verified passport ID difference:</strong> Marketing / ACC '+esc(x.ic)+' vs Sky '+esc(x.snapshotId)+'. Match recorded in verified ID register; original source IDs remain unchanged.</p>':""}${x.intakeReview?'<p class="date-alert"><strong>Intake discrepancy for Registry review:</strong> ACC '+esc(x.accIntake)+' vs Sky '+esc(x.skyIntake)+'. No automatic intake changes.</p>':""}<div style="border-top:1px solid #ddd;margin:16px 0;padding-top:12px"><h3>Admission Processing / Continuation Remark</h3><p class="small">Select a verified screening or processing stage, add a factual remark, and Save. This updates Marketing tracking only; it does not change ACC decisions or Sky activation.</p><form onsubmit="saveContinuation(event,'${esc(x.id)}')"><div class="field"><label>Status</label><select name="status" required>${ADMISSION_REVIEW_STATUSES.map(z=>'<option value="'+z+'" '+(x.continuation?.status===z?'selected':'')+'>'+z+'</option>').join('')}</select></div><div class="field"><label>Remarks / Reason</label><textarea name="reason" rows="3">${esc(x.continuation?.reason||'')}</textarea></div><div class="field"><label>Effective Date</label><input type="date" name="effectiveDate" value="${esc(x.continuation?.effectiveDate||'')}"></div><p class="small" id="continuationSaveMessage">Updates tracking only; Sky and ACC unchanged.</p><button class="btn primary" type="submit">Save Status</button></form></div><button class="btn soft" onclick="showTaskForCandidate('${esc(x.id)}')">+ Create Follow-up Task</button>`)}
async function saveContinuation(e,id){e.preventDefault();const x=data.find(x=>x.id===id);if(!x)return;const f=new FormData(e.target),button=e.target.querySelector('button[type="submit"]'),msg=document.getElementById('continuationSaveMessage');button.disabled=true;msg.textContent='Saving…';try{const r=await fetch('/api/continuation',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({ic:x.ic,name:x.name,status:f.get('status'),reason:f.get('reason'),effectiveDate:f.get('effectiveDate')})});const v=await r.json();if(!r.ok||!v.ok)throw Error(v.error||'Save failed');x.continuation=v.continuation;msg.textContent='Saved to tracking; verifying…';const refreshed=await syncLive();const stored=data.find(z=>z.ic===x.ic)?.continuation;if(refreshed&&stored?.status===String(f.get('status'))&&String(stored.reason||'').trim()===String(f.get('reason')||'').trim()){msg.textContent='Saved and verified. Status / remark updated in worklist.';renderPendingWorklist()}else{msg.textContent='Save accepted, but live verification failed. Refresh and check the remark before retrying.'}}catch(err){msg.textContent='Not saved: '+err.message}finally{button.disabled=false}}
function showTaskForCandidate(id){const candidate=data.find(x=>x.id===id);if(candidate){closeModal();showTask(candidate.name)}}
function showTask(name=""){modal("New Follow-up Task",`<form onsubmit="addTask(event)"><div class="field"><label>Candidate *</label><input name="name" required value="${esc(name)}" placeholder="Candidate name"></div><div class="field" style="margin-top:12px"><label>Follow-up Activity *</label><input name="activity" required placeholder="e.g. Call about ACC application"></div><div class="field" style="margin:12px 0 18px"><label>Due Date *</label><input type="date" name="due" required></div><button class="btn primary" type="submit">Save Task</button></form>`)}
function addTask(e){e.preventDefault();const f=new FormData(e.target);tasks.unshift({id:"T"+Date.now(),name:f.get("name"),activity:f.get("activity"),due:f.get("due"),done:false});save();closeModal();navigate("followups")}
function toggleTask(id){const t=tasks.find(x=>x.id===id);if(t)t.done=!t.done;save();renderTasks()}
function downloadCSV(){let f=$('preview').classList.contains('active')?{...calendarFilters(),from:selectedDay,to:selectedDay}:$('candidates').classList.contains('active')?candidateFilters():{};if(f.from&&f.to&&f.from>f.to){alert('Choose a valid date range before exporting.');return}const list=A.filterCandidates(data,f),rows=[["Full Name","IC / Passport","Email","Programme","Preferred Intake","Registered (Malaysia)","First Registered (Malaysia)","Submissions","ACC Application","Snapshot Activation","Snapshot Category","Continuation Status","Continuation Remarks"],...list.map(x=>[x.name,x.ic,x.email,x.programme,x.intake,A.formatDate(A.latest(x,f)),A.formatDate(x.firstRegisteredAt),x.registrationCount||1,x.accFound?'Matched':'Not matched',x.activated?'Active':'Not confirmed',A.categoryLabel(x.snapshotCategory),x.continuation?.status||'Not Set',x.continuation?.reason||''])];const safe=x=>{const v=String(x??'');return /^[=+@\-\t\r]/.test(v)?"'"+v:v},csv='\ufeff'+rows.map(r=>r.map(x=>'"'+safe(x).replace(/"/g,'""')+'"').join(',')).join('\r\n'),blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='ipgs-marketing-'+(f.from||'all')+(f.to&&f.to!==f.from?'_to_'+f.to:'')+'.csv';a.click();URL.revokeObjectURL(u)}
document.addEventListener('click',e=>{const row=e.target.closest('[data-candidate]');if(row)showDetail(row.dataset.candidate);const day=e.target.closest('[data-date]');if(day)selectCalendarDate(day.dataset.date);const recent=e.target.closest('[data-preview-date]');if(recent)openPreviewDate(recent.dataset.previewDate);const quick=e.target.closest('[data-quick]');if(quick)setQuickFilter(quick.dataset.quick)});
document.addEventListener('keydown',e=>{const row=e.target.closest('[data-candidate]');if(row&&(e.key==='Enter'||e.key===' ')){e.preventDefault();showDetail(row.dataset.candidate)}});
render();
const lock=document.createElement('div');lock.id='liveLock';lock.style.cssText='position:fixed;inset:0;background:#10213af2;z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;color:#13233b';
lock.innerHTML='<div style="width:min(460px,100%);padding:30px;border-radius:20px;background:white;box-shadow:0 15px 60px #0003"><h2>IPGS Marketing Portal</h2><p style="color:#64748b">Staff access · Marketing, ACC & Snapshot reconciliation</p><form id="liveLogin"><input aria-label="Portal password" type="password" name="password" placeholder="Staff portal password" required style="width:100%;margin:12px 0"><button class="btn primary" style="width:100%" type="submit">Sign In</button></form><p id="loginState" style="color:#b45309;font-size:12px;margin-top:12px">Checking system configuration…</p></div>';
document.body.appendChild(lock);
document.querySelectorAll('[onclick*="showAdd"]').forEach(el=>el.style.display='none');
function liveMsg(v){document.getElementById('connectionMessage').textContent=v;document.getElementById('connectionState').textContent=v;}
let syncing=false;
let syncStartedAt=0;
function installSyncControl(){
 const anchor=document.getElementById('connectionMessage');
 if(!anchor||document.getElementById('manualSyncControl'))return;
 const panel=document.createElement('div');
 panel.id='manualSyncControl';
 panel.style.cssText='margin:12px 0;display:flex;flex-wrap:wrap;align-items:center;gap:12px';
 panel.innerHTML='<button type="button" id="manualSyncButton" class="btn primary" aria-label="Sync marketing data with ACC and Snapshot">↻ Sync ACC & Snapshot</button><div style="flex:1;min-width:170px"><div id="manualSyncStatus" role="status" aria-live="polite" style="font-size:12px;color:#475569">Ready to sync</div><div id="manualSyncTrack" role="progressbar" aria-label="Synchronization progress" aria-valuetext="Idle" style="display:none;height:7px;background:#e2e8f0;border-radius:999px;overflow:hidden;margin-top:6px"><div id="manualSyncFill" style="width:35%;height:100%;background:#2563eb;border-radius:999px;animation:syncSlide 1.2s ease-in-out infinite alternate"></div></div></div>';
 const style=document.createElement('style');style.textContent='@keyframes syncSlide{from{transform:translateX(-100%)}to{transform:translateX(285%)}}';document.head.appendChild(style);
 anchor.parentElement.appendChild(panel);
 document.getElementById('manualSyncButton').onclick=()=>syncLive(true);
}
function syncUI(stage,detail){
 const b=document.getElementById('manualSyncButton'),track=document.getElementById('manualSyncTrack'),status=document.getElementById('manualSyncStatus');
 if(!b||!track||!status)return;
 b.disabled=stage==='working';
 b.textContent=stage==='working'?'↻ Syncing…':'↻ Sync ACC & Snapshot';
 track.style.display=stage==='working'?'block':'none';
 track.setAttribute('aria-valuetext',stage==='working'?'Sync in progress (completion time unknown)':stage);
 status.textContent=detail;
 status.style.color=stage==='error'?'#b91c1c':stage==='done'?'#047857':'#475569';
}
installSyncControl();
async function syncLive(manual=false){if(syncing)return;syncing=true;syncStartedAt=Date.now();syncUI('working','Reading Marketing, ACC and Snapshot live sources…');try{const r=await fetch('/api/marketing',{credentials:'same-origin',cache:'no-store'});const v=await r.json();if(!r.ok)throw Error(v.error||'Data integration unavailable');if(!Array.isArray(v.candidates))throw Error('Invalid bridge response');data=v.candidates.map((x,i)=>({...x,id:String(x.id||'C'+i)}));window.ipgsSummary=v.summary||null;window.ipgsOutside=v.internalOutside||[];window.ipgsPending=v.pendingDetails||[];initialiseCalendar();render();$('reconciliationNote').textContent='Verified Internal IPGS closing: '+(v.summary?.internalFromPreview??'—')+' from Marketing Form + '+(v.summary?.internalOutsidePreview??'—')+' Outside Preview = '+(v.summary?.internalTotalActive??'—')+' current Active in Sky. Leads not Active are not counted as closed.';liveMsg('LIVE DATA · Last refreshed '+new Date(v.refreshedAt||Date.now()).toLocaleString('en-MY',{timeZone:A.zone}));document.querySelectorAll('.state').forEach(el=>{el.textContent='● Connected (read only)';el.style.color='#13866d'});lock.style.display='none';syncUI('done','Sync completed · '+data.length+' candidates checked · '+new Date().toLocaleString('en-MY',{timeZone:A.zone}));return true;}catch(e){syncUI('error','Sync failed: '+(e.message||'Unknown error'));if(!data.length){data=[];render();liveMsg('LIVE DATA NOT AVAILABLE');document.getElementById('loginState').textContent=e.message||'Configuration required';lock.style.display='flex'}else{liveMsg('SYNC FAILED · Previous data retained')}return false;}finally{syncing=false}}
async function initLive(){try{const r=await fetch('/api/login',{cache:'no-store'});const a=await r.json();if(!a.configured){document.getElementById('loginState').textContent='Administrator setup required: configure bridge URL, secrets and portal password in Vercel.';document.querySelector('#liveLogin button').disabled=true;liveMsg('BACKEND CONFIGURATION REQUIRED');return}if(a.authenticated){await syncLive()}else document.getElementById('loginState').textContent='Enter the password provided by your marketing administrator.'}catch(e){document.getElementById('loginState').textContent='Cannot reach server-side authentication.'}}
document.getElementById('liveLogin').addEventListener('submit',async e=>{e.preventDefault();const button=e.target.querySelector('button');button.disabled=true;try{const r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:e.target.password.value})});const j=await r.json();if(!r.ok)throw Error(j.error||'Sign-in failed');e.target.reset();await syncLive()}catch(err){document.getElementById('loginState').textContent=err.message}finally{button.disabled=false}});
async function signOut(){await fetch('/api/logout',{method:'POST',credentials:'same-origin'});data=[];tasks=[];calendarInitialised=false;render();lock.style.display='flex';$('loginState').textContent='Signed out.';liveMsg('SIGN-IN REQUIRED')}
setInterval(()=>{if(lock.style.display==='none'&&!document.hidden)syncLive()},300000);
window.addEventListener('focus',()=>{if(lock.style.display==='none')syncLive()});
initLive();
