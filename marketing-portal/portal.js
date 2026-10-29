const KEY="ipgs-marketing-prototype-v1";
let data=[], tasks=[];
const A=MarketingAnalytics;
let activeQuick="all",calendarInitialised=false,selectedDay=A.localDate(new Date().toISOString()),calendarMonth=selectedDay.slice(0,7);
function save(){localStorage.setItem(KEY,JSON.stringify({tasks}))}
const $=id=>document.getElementById(id),esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])),pct=(a,b)=>b?Math.round(a/b*100):0;
const stages={interested:"Not Applied",applied:"Applied in ACC",activated:"Activated"};
function chip(s){return `<span class="tag ${s==="activated"?"green":s==="applied"?"blue":"amber"}">${stages[s]||esc(s)}</span>`}
function navigate(page){document.querySelectorAll('.section').forEach(s=>s.classList.toggle('active',s.id===page));document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',b.dataset.page===page));$('crumb').textContent=({dashboard:"Overview",preview:"Preview Calendar",candidates:"Candidate Pipeline",intakes:"Programme & Intake",followups:"Follow-up Tasks",sources:"Data Connections",team:"Team Management"})[page];$('mobileNav').hidden=true;render();window.scrollTo(0,0)}
document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>navigate(b.dataset.page));

function summaryBreakdown(){
 const v=window.ipgsSummary;
 if(!v||!Number.isFinite(v.internalTotalActive)||!v.applicationBreakdown)return null;
 const b=v.applicationBreakdown;
 const n=k=>Math.max(0,Number(b[k]||0));
 return {v,active:n('Active in Sky'),pending:n('Pending Review / Activation'),notQualified:n('Not Qualified'),withdrawn:n('Withdrawn'),withdrawalRequested:n('Withdrawal Requested'),deferred:n('Deferred'),sum:Object.values(b).reduce((x,y)=>x+Number(y||0),0)};
}
function updateKpiCard(id,label,hint){
 const num=$(id),card=num?.closest('.card');
 if(!card)return;
 const top=card.querySelector('.ctop'),small=card.querySelector('.hint');
 if(top?.firstChild)top.firstChild.textContent=label+' ';
 if(small)small.innerHTML=hint;
}
function summaries(){
 const n=data.length,ap=data.filter(x=>x.accFound).length,ac=data.filter(x=>x.activated).length;
 const m=summaryBreakdown(),v=m?.v;
 const nApplied=v?.applied??ap;
 $("kInterested").textContent=n;
 $("kPending").textContent=n-nApplied;
 $("kApplied").textContent=nApplied;
 // Never display all-category marketing activation as the IPGS Sales closing KPI.
 $("kActivated").textContent=m?String(v.internalTotalActive):'—';
 updateKpiCard('kInterested','Marketing Form Leads','Unique preview / marketing form registrations');
 updateKpiCard('kPending','Marketing Leads Not Matched to ACC','From the Marketing Form; check identity exceptions before follow-up');
 updateKpiCard('kApplied','Applied in ACC · From Marketing Form',m
  ?'<div class="kpi-breakdown"><span class="kpi-mini ok"><b>'+m.active+'</b> Active (all categories)</span><span class="kpi-mini warn"><b>'+m.pending+'</b> Pending</span><span class="kpi-mini"><b>'+m.notQualified+'</b> Not Qualified</span><span class="kpi-mini"><b>'+m.withdrawalRequested+'</b> Withdrawal Requested</span>'+(m.withdrawn?'<span class="kpi-mini">'+m.withdrawn+' Withdrawn</span>':'')+(m.deferred?'<span class="kpi-mini">'+m.deferred+' Deferred</span>':'')+'</div><div class="kpi-foot">'+(m.sum===nApplied?'✓ All '+nApplied+' applications accounted for':'⚠ Reconciliation mismatch')+' · includes other Snapshot categories</div>'
  :'Awaiting live ACC application status reconciliation');
 updateKpiCard('kActivated','Internal IPGS Active · Sky Snapshot',m
  ?'<div class="kpi-breakdown"><span class="kpi-mini ok"><b>'+v.internalFromPreview+'</b> From Preview</span><span class="kpi-mini"><b>'+v.internalOutsidePreview+'</b> Outside Preview</span></div><div class="kpi-foot">'+(v.internalFromPreview+v.internalOutsidePreview===v.internalTotalActive?'✓ Matched to Snapshot category Internal':'⚠ Internal category count mismatch')+' · DPLI excluded</div>'
  :'Awaiting live Internal IPGS Snapshot reconciliation');
 const cards=document.querySelector('#kInterested')?.closest('.cards');
 if(cards){
  let note=document.getElementById('ipgsKpiScopeNote');
  if(!note){note=document.createElement('p');note.id='ipgsKpiScopeNote';note.className='kpi-scope-note';cards.insertAdjacentElement('afterend',note)}
  note.textContent=m
   ?'Reporting scopes: '+nApplied+' ACC applications come from Marketing Form leads (any Snapshot category). '+v.internalTotalActive+' Active students are those tagged Internal / IPGS Sales & Marketing in Sky, including '+v.internalOutsidePreview+' outside-preview students. They are not the same cohort and must not be subtracted from each other.'
   :'The Internal IPGS Active KPI requires live reconciliation. Marketing Form Active (all categories) is intentionally not shown as Internal IPGS closing.';
 }
 // The cohort-specific funnel must not show all-category Active as IPGS closing.
 const preview=m?Number(v.internalFromPreview):null,outside=m?Number(v.internalOutsidePreview):null;
 const steps=[['Marketing Form Leads',n,'',true],['Applied in ACC · from Marketing Form',nApplied,'light',true]];
 if(m){
  steps.push(['Internal IPGS Active · from Preview',preview,'green',true],['Internal IPGS Active · outside Preview',outside,'green',false],['TOTAL Internal IPGS Active · Sky',v.internalTotalActive,'green',false]);
 }
 $("funnel").innerHTML=steps.map(([name,count,color,rate])=>'<div class="progress"><div class="progtitle"><span>'+esc(name)+'</span><span>'+count+(rate?' <span class="muted">/ '+pct(count,n)+'% of preview leads</span>':' <span class="muted">/ Snapshot</span>')+'</span></div><div class="track"><div class="fill '+color+'" style="width:'+pct(count,rate?n:(v?.internalTotalActive||1))+'%"></div></div></div>').join('');
 const prog={};data.forEach(x=>prog[x.programme]=(prog[x.programme]||0)+1);
 $("programmeChart").innerHTML=Object.entries(prog).sort((a,b)=>b[1]-a[1]).map(([p,count])=>'<div class="chartrow"><span>'+esc(p)+'</span><div class="track"><div class="fill" style="width:'+pct(count,data.length)+'%"></div></div><b>'+count+'</b></div>').join('')||'<div class="empty">No candidates yet</div>';
 $("miniIntakes").innerHTML=intakeGroups().slice(0,6).map(x=>'<tr><td><strong>'+esc(x.programme)+'</strong></td><td>'+esc(x.intake)+'</td><td>'+x.n+'</td><td>'+x.ap+'</td><td>'+x.ac+'</td><td>'+pct(x.ac,x.n)+'%</td></tr>').join('');
}
function intakeGroups(){const m={};data.forEach(x=>{const k=x.programme+"|"+x.intake;if(!m[k])m[k]={programme:x.programme,intake:x.intake,n:0,ap:0,ac:0};m[k].n++;if(x.accFound)m[k].ap++;if(x.activated)m[k].ac++});return Object.values(m).sort((a,b)=>a.programme.localeCompare(b.programme)||a.intake.localeCompare(b.intake))}
function populate(id,items,label){const e=$(id),old=e.value,counts={};items.filter(Boolean).forEach(x=>counts[x]=(counts[x]||0)+1);e.innerHTML=`<option value="">${label}</option>`+Object.keys(counts).sort().map(x=>`<option value="${esc(x)}">${esc(x)} (${counts[x]})</option>`).join("");e.value=Object.hasOwn(counts,old)?old:''}
function candidateFilters(){return {continuation:document.getElementById('filterContinuation')?.value||'',search:$("search").value,programme:$("filterProgramme").value,intake:$("filterIntake").value,from:$("filterFrom").value,to:$("filterTo").value,acc:$("filterAcc").value,activation:$("filterActivation").value,category:$("filterCategory").value,source:$("filterSource").value,sort:$("candidateSort").value}}
function categoryBadge(x){return `<span class="tag ${x.activated?(x.snapshotCategory==='Internal'?'green':'category-warning'):'gray'}">${esc(A.categoryLabel(x.snapshotCategory))}</span>`}
function candidateTableRows(list,filter={}){return list.map(x=>{const registered=A.latest(x,filter),day=registered?A.formatDate(registered,false):'Date unavailable',time=registered?new Intl.DateTimeFormat('en-MY',{timeZone:A.zone,hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(registered)):'';return `<tr data-candidate="${esc(x.id)}" tabindex="0" aria-label="Open profile for ${esc(x.name)}"><td><strong>${esc(x.name)}</strong><div class="muted">${esc(x.email)}</div></td><td><div class="registration-date">${esc(day)}</div><div class="registration-time">${esc(time)}${x.registrationCount>1?' · '+x.registrationCount+' submissions':''}</div></td><td><strong>${esc(x.programme)}</strong><div class="muted">${esc(x.intake)}</div></td><td><span class="tag ${x.accFound?'blue':'gray'}">${x.accFound?'In ACC':'Not in ACC'}</span></td><td><span class="tag ${x.activated?'green':'gray'}">${x.activated?'Active':'Not confirmed'}</span></td><td class="category-cell">${categoryBadge(x)}<div style="margin-top:5px"><span class="tag ${x.continuation?.status==='Withdrawal Requested'?'amber':x.continuation?.status==='Withdrawn'?'gray':'blue'}">${esc(x.continuation?.status||'Not Set')}</span></div></td></tr>`}).join('')||'<tr><td colspan="6" class="empty">No candidates match this selection.</td></tr>'}
function renderCandidates(){
 const f=candidateFilters(),invalid=f.from&&f.to&&f.from>f.to;
 $("filterError").textContent=invalid?'Choose an end date on or after the start date.':'';
 const list=(invalid?[]:A.filterCandidates(data,f)).filter(x=>!f.continuation||x.continuation?.status===f.continuation),stats=A.stats(list,f);
 $("candidateCount").textContent=`${list.length} of ${data.length} candidates`;
 $("candidateRows").innerHTML=candidateTableRows(list,f);
 $("filteredKpis").innerHTML=`<span><b>${stats.applied}</b>in ACC</span><span><b>${stats.active}</b>active</span><span><b>${stats.awaitingAcc}</b>awaiting ACC</span>`;
 const base=A.filterCandidates(data,{...f,acc:'',activation:'',category:''}).filter(x=>!f.continuation||x.continuation?.status===f.continuation);
 const quick=[['all','All candidates',base.length],['acc','Awaiting ACC',base.filter(x=>!x.accFound).length],['activation','Awaiting activation',base.filter(x=>!x.activated).length],['active','Active',base.filter(x=>x.activated).length],['review','Review category',base.filter(x=>x.activated&&x.snapshotCategory!=='Internal').length],['discrepancy','Active, no ACC',base.filter(x=>x.activated&&!x.accFound).length],['withdrawal','Withdrawal requested',base.filter(x=>x.continuation?.status==='Withdrawal Requested').length]];
 $("quickFilters").innerHTML=quick.map(([key,label,count])=>`<button class="quick-chip ${activeQuick===key?'active':''}" data-quick="${key}" aria-pressed="${activeQuick===key}">${label}<b>${count}</b></button>`).join('');
}
function clearQuickFilter(){activeQuick='';renderCandidates()}
function setQuickFilter(key){activeQuick=key;const cont=document.getElementById('filterContinuation');if(cont)cont.value=key==='withdrawal'?'Withdrawal Requested':'';$("filterAcc").value=['acc','discrepancy'].includes(key)?'missing':'';$("filterActivation").value=['active','discrepancy'].includes(key)?'active':key==='activation'?'pending':'';$("filterCategory").value=key==='review'?'review':'';renderCandidates()}
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
 $("sessionApplied").textContent=s.applied;$("sessionActive").textContent=s.active;$("sessionPending").textContent=s.awaitingAcc;
 const programmes={};list.forEach(x=>programmes[x.programme]=(programmes[x.programme]||0)+1);
 $("sessionProgrammes").innerHTML=Object.entries(programmes).sort((a,b)=>b[1]-a[1]).map(([p,n])=>`<div class="session-programme"><span>${esc(p)}</span><strong>${n}</strong></div>`).join('')||'<p class="small">No registrations on this date for the selected filters.</p>';
 $("sessionRows").innerHTML=candidateTableRows(list,sf);$("sessionListCount").textContent=s.unique+' candidates';$("sessionListTitle").textContent='Registered on '+A.formatDate(selectedDay+'T12:00:00+08:00',false);
}
function viewSessionCandidates(){resetCandidateFilters();const f=calendarFilters();$("filterFrom").value=selectedDay;$("filterTo").value=selectedDay;$("filterProgramme").value=f.programme;$("filterIntake").value=f.intake;$("filterSource").value=f.source;$("datePreset").value='custom';navigate('candidates')}
function openPreviewDate(date){selectCalendarDate(date);navigate('preview')}
function renderRecentSessions(){const rows=Object.values(A.days(data)).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,4);$("recentSessions").innerHTML=rows.map(r=>`<button class="recent-session" data-preview-date="${r.date}"><span>${esc(A.formatDate(r.date+'T12:00:00+08:00',false))}</span><strong>${r.unique} <span class="small">close</span></strong><small>${r.applied} in ACC · ${r.active} active</small></button>`).join('')||'<p class="small">Registration dates will appear after data is connected.</p>'}
function renderIntakes(){const p=$("intakeProgramme").value,y=$("intakeYear").value;$("intakeRows").innerHTML=intakeGroups().filter(x=>(!p||x.programme===p)&&(!y||x.intake.includes(y))).map(x=>`<tr><td><strong>${esc(x.programme)}</strong></td><td>${esc(x.intake)}</td><td>${x.n}</td><td>${x.n-x.ap}</td><td>${x.ap}</td><td>${x.ac}</td><td>${pct(x.ac,x.n)}%</td></tr>`).join("")||'<tr><td colspan="7" class="empty">No intake records found.</td></tr>'}
function renderTasks(){const due=new Date().toISOString().slice(0,10);$("taskOpen").textContent=tasks.filter(x=>!x.done).length;$("taskDone").textContent=tasks.filter(x=>x.done).length;$("taskDue").textContent=tasks.filter(x=>!x.done&&x.due<=due).length;$("taskRows").innerHTML=tasks.map(x=>`<tr><td>${esc(x.name)}</td><td><strong>${esc(x.activity)}</strong></td><td>${esc(x.due)}</td><td><span class="tag ${x.done?"green":"amber"}">${x.done?"Completed":"Open"}</span></td><td><button class="btn" onclick="event.stopPropagation();toggleTask('${esc(x.id)}')">${x.done?"Reopen":"Complete"}</button></td></tr>`).join("")||'<tr><td colspan="5" class="empty">No follow-up tasks yet. Add your first task.</td></tr>'}
function renderReconciliation(){
 let panel=document.getElementById('ipgsReconciliation');
 if(!panel){
  panel=document.createElement('section');panel.id='ipgsReconciliation';panel.className='ipgs-reconciliation';
  const point=document.getElementById('recentSessions'),host=point?.closest('section')||point?.parentElement;
  if(host?.parentElement)host.parentElement.insertBefore(panel,host);
 }
 if(!panel)return;
 const m=summaryBreakdown(),v=m?.v;
 if(!m){panel.innerHTML='<h3>IPGS Reconciliation</h3><p>Live Snapshot and ACC application breakdown are not available. IPGS Active is not inferred from Marketing Form Active.</p>';return}
 const outside=window.ipgsOutside||[],pending=window.ipgsPending||[];
 const balanced=m.sum===v.applied,internalMatched=v.internalFromPreview+v.internalOutsidePreview===v.internalTotalActive;
 const statusItems=[['Active in Sky (applied Marketing leads · all categories)',m.active],['Pending Review / Activation',m.pending],['Not Qualified',m.notQualified],['Withdrawal Requested',m.withdrawalRequested],['Withdrawn',m.withdrawn],['Deferred',m.deferred]];
 panel.innerHTML='<h3>IPGS Sales &amp; Marketing — Internal Active (Sky)</h3>'
 +'<div class="recon-totals"><div><small>From Preview · Internal</small><strong>'+v.internalFromPreview+'</strong></div><div><small>Outside Preview · Internal</small><strong>'+v.internalOutsidePreview+'</strong></div><div><small>Total Internal IPGS Active</small><strong>'+v.internalTotalActive+'</strong></div></div>'
 +'<div class="small">'+(internalMatched?'✓ Matches Sky Snapshot Internal category':'⚠ Snapshot mismatch')+' · DPLI and all external agents excluded.</div>'
 +'<hr><h3>Marketing Form → ACC Applications (separate cohort)</h3>'
 +'<p class="recon-equation"><b>'+v.applied+' Applied</b> = '+statusItems.map(([label,count])=>'<span><b>'+count+'</b> '+esc(label)+'</span>').join(' + ')+' <b class="'+(balanced?'recon-ok':'recon-error')+'">'+(balanced?'✓ Balanced':'⚠ Mismatch')+'</b></p>'
 +'<p class="small"><b>Important:</b> '+v.applied+' refers to Marketing Form applicants across all categories. '+v.internalTotalActive+' refers only to Internal IPGS Active students, including those outside preview. Never compare them as one cohort. Pending is not automatically Not Qualified.</p>'
 +'<details><summary>Outside Preview · Internal Active — '+outside.length+' students</summary><div class="recon-tablewrap"><table><thead><tr><th>Student</th><th>Programme</th><th>ACC</th></tr></thead><tbody>'+outside.map(x=>'<tr><td>'+esc(x.name)+'</td><td>'+esc(x.programme)+'</td><td>'+(x.accFound?'Matched':'Not matched')+'</td></tr>').join('')+'</tbody></table></div></details>'
 +'<details><summary>Marketing ACC Applied but not Active — review '+pending.length+' cases</summary><div class="recon-tablewrap"><table><thead><tr><th>Student</th><th>Classification</th><th>ACC activation</th><th>Remark</th></tr></thead><tbody>'+pending.map(x=>'<tr><td>'+esc(x.name)+'</td><td>'+esc(x.status)+'</td><td>'+esc(x.accSkyStatus||'Not confirmed')+'</td><td>'+esc(x.reason||'Requires review')+'</td></tr>').join('')+'</tbody></table></div></details>';
}
function render(){if(!document.getElementById('filterContinuation')){const select=document.createElement('select');select.id='filterContinuation';select.setAttribute('aria-label','Student continuation status');select.innerHTML='<option value="">All continuation statuses</option>'+['Continuing','Pending Follow-up','Withdrawal Requested','Withdrawn','Deferred','Not Qualified','Not Set'].map(x=>'<option value="'+x+'">'+x+'</option>').join('');select.onchange=renderCandidates;document.getElementById('quickFilters')?.parentElement?.insertBefore(select,document.getElementById('quickFilters'));}populate("filterProgramme",data.map(x=>x.programme),"All Programmes");populate("filterIntake",data.map(x=>x.intake),"All Intakes");populate("calendarProgramme",data.map(x=>x.programme),"All Programmes");populate("calendarIntake",data.map(x=>x.intake),"All Intakes");populate("intakeProgramme",data.map(x=>x.programme),"All Programmes");populate("intakeYear",data.map(x=>x.intake.match(/\d{4}/)?.[0]),"All Years");const e=$("filterCategory"),old=e.value,values=[...new Set(data.filter(x=>x.activated).map(x=>x.snapshotCategory||'Unassigned'))].sort();e.innerHTML='<option value="">All categories / statuses</option><option value="review">Active: category is not IPGS</option><option value="pending">Not active in Snapshot</option>'+values.map(v=>`<option value="${esc(v)}">${esc(A.categoryLabel(v))} (${data.filter(x=>x.activated&&(x.snapshotCategory||'Unassigned')===v).length})</option>`).join('');e.value=[...e.options].some(o=>o.value===old)?old:'';summaries();renderReconciliation();let statusPanel=document.getElementById('continuationPanel');if(!statusPanel){statusPanel=document.createElement('div');statusPanel.id='continuationPanel';statusPanel.style.cssText='background:#fff;border:1px solid #dde4ed;border-radius:14px;padding:18px;margin:18px 0';const target=document.getElementById('recentSessions')?.closest('section')||document.getElementById('recentSessions')?.parentElement;if(target)target.parentElement.insertBefore(statusPanel,target);}if(statusPanel)statusPanel.innerHTML='<strong>Student Continuation</strong><div style="display:flex;gap:22px;flex-wrap:wrap;margin-top:12px"><span>Withdrawal requested: <b>'+data.filter(x=>x.continuation?.status==='Withdrawal Requested').length+'</b></span><span>Withdrawn (confirmed): <b>'+data.filter(x=>x.continuation?.status==='Withdrawn').length+'</b></span><span>Deferred: <b>'+data.filter(x=>x.continuation?.status==='Deferred').length+'</b></span></div><p class="small">Continuation records are independent from official ACC and Sky activation. Update the source tracking sheet for changes.</p>';renderRecentSessions();renderCalendar();renderCandidates();renderIntakes();renderTasks()}
function modal(title,content){$("modalTitle").textContent=title;$("modalBody").innerHTML=content;$("modalbg").classList.add("show")}function closeModal(){$("modalbg").classList.remove("show")}document.getElementById("modalbg").onclick=e=>{if(e.target.id==="modalbg")closeModal()};
function showDetail(id){let x=data.find(x=>x.id===id);if(!x)return;modal("Candidate Profile",`<div class="detailgrid">${[["Full Name",x.name],["IC / Passport",x.ic],["Email",x.email],["Programme",x.programme],["Preferred Intake",x.intake],["Original Preferred Intake",x.preferredIntakeOriginal||"Unspecified"],["Latest Registration",A.formatDate(x.registeredAt)],["First Registration",A.formatDate(x.firstRegisteredAt)],["Form Submissions",x.registrationCount||1],["Registration Form",x.sourceTab||x.source],["Snapshot Category",A.categoryLabel(x.snapshotCategory)],["Continuation Status",x.continuation?.status||"Not Set"],["Continuation Remarks",x.continuation?.reason||"Not recorded"],["Withdrawal Effective Date",x.continuation?.effectiveDate||"Not confirmed"]].map(([l,v])=>`<div><small>${l}</small><strong>${esc(v)}</strong></div>`).join("")}</div><p style="margin-top:20px">${chip(x.stage)}</p><p class="small">ACC application: ${x.accFound?"Matched":"Not matched"}. Snapshot activation: ${x.activated?"Active":"Not confirmed"}. ${x.activated&&!x.accFound?"Activated — ACC not matched. Review this discrepancy.":""}</p><div style="border-top:1px solid #ddd;margin:16px 0;padding-top:12px"><h3>Update Continuation Status</h3><form onsubmit="saveContinuation(event,'${esc(x.id)}')"><div class="field"><label>Status</label><select name="status" required>${['Not Set','Continuing','Pending Follow-up','Withdrawal Requested','Withdrawn','Deferred','Not Qualified'].map(z=>'<option value="'+z+'" '+(x.continuation?.status===z?'selected':'')+'>'+z+'</option>').join('')}</select></div><div class="field"><label>Remarks / Reason</label><textarea name="reason" rows="3">${esc(x.continuation?.reason||'')}</textarea></div><div class="field"><label>Effective Date</label><input type="date" name="effectiveDate" value="${esc(x.continuation?.effectiveDate||'')}"></div><p class="small" id="continuationSaveMessage">Updates tracking only; Sky and ACC unchanged.</p><button class="btn primary" type="submit">Save Status</button></form></div><button class="btn soft" onclick="showTaskForCandidate('${esc(x.id)}')">+ Create Follow-up Task</button>`)}
async function saveContinuation(e,id){e.preventDefault();const x=data.find(x=>x.id===id);if(!x)return;const f=new FormData(e.target),button=e.target.querySelector('button[type="submit"]'),msg=document.getElementById('continuationSaveMessage');button.disabled=true;msg.textContent='Saving…';try{const r=await fetch('/api/continuation',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({ic:x.ic,name:x.name,status:f.get('status'),reason:f.get('reason'),effectiveDate:f.get('effectiveDate')})});const v=await r.json();if(!r.ok||!v.ok)throw Error(v.error||'Save failed');x.continuation=v.continuation;msg.textContent='Saved successfully';render()}catch(err){msg.textContent='Not saved: '+err.message}finally{button.disabled=false}}
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
async function syncLive(manual=false){if(syncing)return;syncing=true;syncStartedAt=Date.now();syncUI('working','Reading Marketing, ACC and Snapshot live sources…');try{const r=await fetch('/api/marketing',{credentials:'same-origin',cache:'no-store'});const v=await r.json();if(!r.ok)throw Error(v.error||'Data integration unavailable');if(!Array.isArray(v.candidates))throw Error('Invalid bridge response');data=v.candidates.map((x,i)=>({...x,id:String(x.id||'C'+i)}));window.ipgsSummary=v.summary||null;window.ipgsOutside=v.internalOutside||[];window.ipgsPending=v.pendingDetails||[];initialiseCalendar();render();$('reconciliationNote').textContent=(v.summary?.internalTotalActive??'—')+' Active in IPGS Internal Sky category = '+(v.summary?.internalFromPreview??'—')+' from preview + '+(v.summary?.internalOutsidePreview??'—')+' outside preview. ACC application outcomes are shown separately below.';liveMsg('LIVE DATA · Last refreshed '+new Date(v.refreshedAt||Date.now()).toLocaleString('en-MY',{timeZone:A.zone}));document.querySelectorAll('.state').forEach(el=>{el.textContent='● Connected (read only)';el.style.color='#13866d'});lock.style.display='none';syncUI('done','Sync completed · '+data.length+' candidates checked · '+new Date().toLocaleString('en-MY',{timeZone:A.zone}));}catch(e){syncUI('error','Sync failed: '+(e.message||'Unknown error'));if(!data.length){data=[];render();liveMsg('LIVE DATA NOT AVAILABLE');document.getElementById('loginState').textContent=e.message||'Configuration required';lock.style.display='flex'}else{liveMsg('SYNC FAILED · Previous data retained')}}finally{syncing=false}}
async function initLive(){try{const r=await fetch('/api/login',{cache:'no-store'});const a=await r.json();if(!a.configured){document.getElementById('loginState').textContent='Administrator setup required: configure bridge URL, secrets and portal password in Vercel.';document.querySelector('#liveLogin button').disabled=true;liveMsg('BACKEND CONFIGURATION REQUIRED');return}if(a.authenticated){await syncLive()}else document.getElementById('loginState').textContent='Enter the password provided by your marketing administrator.'}catch(e){document.getElementById('loginState').textContent='Cannot reach server-side authentication.'}}
document.getElementById('liveLogin').addEventListener('submit',async e=>{e.preventDefault();const button=e.target.querySelector('button');button.disabled=true;try{const r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:e.target.password.value})});const j=await r.json();if(!r.ok)throw Error(j.error||'Sign-in failed');e.target.reset();await syncLive()}catch(err){document.getElementById('loginState').textContent=err.message}finally{button.disabled=false}});
async function signOut(){await fetch('/api/logout',{method:'POST',credentials:'same-origin'});data=[];tasks=[];calendarInitialised=false;render();lock.style.display='flex';$('loginState').textContent='Signed out.';liveMsg('SIGN-IN REQUIRED')}
setInterval(()=>{if(lock.style.display==='none'&&!document.hidden)syncLive()},300000);
window.addEventListener('focus',()=>{if(lock.style.display==='none')syncLive()});
initLive();
