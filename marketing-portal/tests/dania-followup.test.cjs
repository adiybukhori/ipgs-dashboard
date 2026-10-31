const { test, afterEach }=require('node:test');
const assert=require('node:assert/strict');
const handler=require('../api/dania-followup.js');
const originalFetch=global.fetch;
const old={
 DANIA_AGENT_REPORT_TOKEN:process.env.DANIA_AGENT_REPORT_TOKEN,
 MARKETING_BRIDGE_URL:process.env.MARKETING_BRIDGE_URL,
 MARKETING_BRIDGE_SECRET:process.env.MARKETING_BRIDGE_SECRET
};
const token='integration-test-only-long-credential-12345';
const fakeRes=()=>({code:0,payload:null,headers:{},setHeader(k,v){this.headers[k]=v;return this},status(n){this.code=n;return this},json(o){this.payload=o;return this}});
function setup(){process.env.DANIA_AGENT_REPORT_TOKEN=token;process.env.MARKETING_BRIDGE_URL='https://example.invalid/marketing';process.env.MARKETING_BRIDGE_SECRET='test-only-bridge-secret'}
afterEach(()=>{global.fetch=originalFetch;for(const [key,value] of Object.entries(old)){if(value==null)delete process.env[key];else process.env[key]=value}});
test('rejects an unknown agent without contacting backend',async()=>{
 setup();let called=0;global.fetch=async()=>{called++;throw Error('should not call')};
 const res=fakeRes();await handler({method:'POST',headers:{authorization:'Bearer invalid'},body:{sourceRef:'IPGS-10276761'}},res);
 assert.equal(res.code,401);assert.equal(called,0)
});
test('valid agent forwards one safe first-contact report to the marketing bridge',async()=>{
 setup();let captured;global.fetch=async(url,opts)=>{captured={url,opts};return {ok:true,json:async()=>({ok:true,queueStatus:'INTRO_SENT'})}};
 const req={method:'POST',headers:{authorization:'Bearer '+token},body:{sourceRef:'IPGS-10276761',event:'FIRST_CONTACT',outcome:'PROVIDER_ACCEPTED',messageId:'3EB05E35AA29231D6A1D94',remark:'Asked candidate to check confirmation email'}};
 const res=fakeRes();await handler(req,res);
 assert.equal(res.code,200);assert.equal(res.payload.queueStatus,'INTRO_SENT');
 const body=JSON.parse(captured.opts.body);assert.equal(body.action,'recordDaniaFollowup');assert.equal(body.sourceRef,'IPGS-10276761');assert.equal(body.messageId,req.body.messageId);
});
test('a provider-accepted send without real provider ID is rejected',async()=>{
 setup();let called=0;global.fetch=async()=>{called++};
 const res=fakeRes();await handler({method:'POST',headers:{authorization:'Bearer '+token},body:{sourceRef:'IPGS-10276761',event:'FIRST_CONTACT',outcome:'PROVIDER_ACCEPTED',remark:'test'}},res);
 assert.equal(res.code,400);assert.equal(called,0)
});
