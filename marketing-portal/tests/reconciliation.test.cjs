const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../apps-script/Code.gs'), 'utf8');
function run(tables) {
  const context = {Sheets: {Spreadsheets: {Values: {get(id,range) {
    const match=range.match(/^'(.+)'!A(\d+):([A-Z]+)(\d+)$/);
    const rows=tables[match[1].replace(/''/g,"'")];
    if(!rows) throw Error('Missing sheet');
    const width=[...match[3]].reduce((a,c)=>a*26+c.charCodeAt(0)-64,0);
    return {values:rows.slice(Number(match[2])-1,Number(match[4])).map(row=>row.slice(0,width))};
  }}}}};
  vm.createContext(context);
  vm.runInContext(source, context);
  return {result:context.build_(), context};
}
function fixture() {
  return {
    'IPGS Briefing Registration':[
      ['Timestamp','Registration Reference','Full Name','IC / Passport','WhatsApp Number','Email Address','Full Address','Programme','Preferred Intake'],
      ['','','Candidate A','A-123','','','','MBA','Sept 2026'],
      ['','','Candidate B','B123','','','','DBA','Nov 2026']
    ],
    'Data Briefing Session':[
      ['Timestamp','Full Name (As in IC)','IC Number','Full Address','Email Address','Programme','','','','','','Intake'],
      ['','Candidate A','A123','','','PhD','','','','','','March 2026'],
      ['','Candidate C','C123','','','MBM','','','','','','Mei 2026']
    ],
    'V2_APPLICATIONS':[
      ['','','','Student Name','ID / Passport No','','','Programme','','','Intake'],
      ['','','','Candidate A','A123','','','MBA','','','September 2026']
    ],
    'STUDENT_PAYMENT_TRACKER':[
      [],[],[],['Student Status','Student Name','ID No','Category','Programme','Intake'],
      ['Active','Candidate A','A123','Internal','MBA','September 2026'],
      ['Active','Candidate B','B123','','DBA','November 2026'],
      ['Inactive','Candidate C','C123','','MBM','May 2026']
    ]
  };
}
test('deduplicates identity and prefers current marketing programme/intake', () => {
  const {result} = run(fixture());
  assert.equal(result.summary.unique,3);
  assert.equal(result.summary.duplicateRegistrations,1);
  const a=result.candidates.find(x=>x.ic==='A-123');
  assert.equal(a.programme,'MBA');
  assert.equal(a.intake,'September 2026');
});
test('does not infer ACC application from Snapshot activation', () => {
  const {result} = run(fixture());
  assert.equal(result.summary.applied,1);
  assert.equal(result.summary.activated,2);
  assert.equal(result.summary.activatedWithoutAcc,1);
  assert.equal(result.summary.notApplied,2);
});
test('normalises programme abbreviations and intake spelling without changing month', () => {
  const {context} = run(fixture());
  for (const p of ['DBA','MBA','MBM','MIS']) assert.equal(context.canon_(p),p);
  assert.equal(context.intake_('Mei 2026'),'May 2026');
  assert.equal(context.intake_('Nov 2026'),'November 2026');
  assert.equal(context.intake_('Next Available Intake'),'Next Available Intake');
});
test('fails closed when source columns change', () => {
  const tables=fixture();
  tables.V2_APPLICATIONS[0][4]='Moved ID';
  assert.throws(()=>run(tables), /Source columns changed/);
});
test('rejects unauthenticated bridge requests before reading spreadsheets', () => {
  const {context}=run(fixture());
  let text;
  context.PropertiesService={getScriptProperties:()=>({getProperty:()=> 'test-secret'})};
  context.ContentService={MimeType:{JSON:'json'},createTextOutput:value=>({setMimeType(){text=value;return value;}})};
  context.Sheets={Spreadsheets:{Values:{get(){throw Error('Must not read sources');}}}};
  context.doPost({postData:{contents:JSON.stringify({key:'wrong',action:'reconcile'})}});
  assert.equal(JSON.parse(text).error,'Unauthorized');
});
test('uses only read-only Sheets OAuth scope and no SpreadsheetApp service', () => {
  const manifest=JSON.parse(fs.readFileSync(require('node:path').join(__dirname,'../apps-script/appsscript.json'),'utf8'));
  assert.deepEqual(manifest.oauthScopes,['https://www.googleapis.com/auth/spreadsheets.readonly']);
  assert.equal(source.includes('SpreadsheetApp'),false);
});
test('parses Malaysian form timestamps independently of server timezone and rejects invalid dates',()=>{
  const {context}=run(fixture());
  assert.equal(context.timestamp_('27/10/2026 23:59:59'),'2026-10-27T15:59:59.000Z');
  assert.equal(context.timestamp_('28/10/2026 00:01:00'),'2026-10-27T16:01:00.000Z');
  assert.equal(context.timestamp_('27/10/2026 9:15:02 PM'),'2026-10-27T13:15:02.000Z');
  for(const value of ['', '31/02/2026 10:00:00','27/10/2026 25:00:00','not a date'])assert.equal(context.timestamp_(value),null);
});
test('keeps every form event after identity merge and orders candidates by newest registration',()=>{
  const tables=fixture();
  tables['IPGS Briefing Registration'][1][0]='27/10/2026 21:00:00';
  tables['IPGS Briefing Registration'][2][0]='27/10/2026 22:30:00';
  tables['Data Briefing Session'][1][0]='15/09/2026 20:00:00';
  const {result}=run(tables),a=result.candidates.find(c=>c.ic==='A-123');
  assert.equal(a.registrationCount,2);
  assert.equal(a.registrationEvents.length,2);
  assert.equal(a.firstRegisteredAt,'2026-09-15T12:00:00.000Z');
  assert.equal(a.registeredAt,'2026-10-27T13:00:00.000Z');
  assert.equal(a.snapshotCategory,'Internal');
  assert.equal(a.categoryReview,false);
  assert.equal(result.candidates[0].name,'Candidate B');
  assert.equal(result.summary.missingRegistrationDates,1);
});
