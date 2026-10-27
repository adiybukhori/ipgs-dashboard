const test=require('node:test');
const assert=require('node:assert/strict');
const A=require('../analytics.js');
const event=(registeredAt,sourceTab='IPGS Briefing Registration')=>({registeredAt,sourceTab});
function candidates(){return [
 {id:'a',name:'Candidate A',ic:'A',programme:'MBA',intake:'January 2027',registeredAt:'2026-10-27T15:30:00.000Z',registrationEvents:[event('2026-10-27T13:00:00.000Z'),event('2026-10-27T15:30:00.000Z'),event('2026-09-15T12:00:00.000Z','Data Briefing Session')],accFound:true,activated:true,snapshotCategory:'Internal'},
 {id:'b',name:'Candidate B',ic:'B',programme:'DBA',intake:'January 2027',registeredAt:'2026-10-27T16:01:00.000Z',registrationEvents:[event('2026-10-27T16:01:00.000Z')],accFound:false,activated:true,snapshotCategory:'Unassigned'},
 {id:'c',name:'Candidate C',ic:'C',programme:'MBA',registeredAt:null,registrationEvents:[],accFound:false,activated:false,snapshotCategory:null}
]}
test('calendar uses Malaysia dates at midnight and counts one student per day despite repeat submissions',()=>{
 const days=A.days(candidates());
 assert.equal(days['2026-10-27'].unique,1);
 assert.equal(days['2026-10-27'].submissions,2);
 assert.equal(days['2026-10-28'].unique,1);
 assert.equal(days['2026-09-15'].unique,1);
 assert.equal(Object.keys(days).length,3);
});
test('historical registration stays in its original cohort after a later registration',()=>{
 const list=A.filterCandidates(candidates(),{from:'2026-09-15',to:'2026-09-15'});
 assert.equal(list.length,1);
 assert.equal(A.latest(list[0],{from:'2026-09-15',to:'2026-09-15'}),'2026-09-15T12:00:00.000Z');
});
test('sorting puts the newest form timestamp first and unknown dates last',()=>{
 assert.deepEqual(A.filterCandidates(candidates()).map(c=>c.id),['b','a','c']);
 assert.deepEqual(A.filterCandidates(candidates(),{sort:'oldest'}).map(c=>c.id),['a','b','c']);
});
test('cohort filters combine programme, intake, date, ACC and activation independently',()=>{
 assert.equal(A.filterCandidates(candidates(),{programme:'MBA',intake:'January 2027',from:'2026-10-27',to:'2026-10-27',acc:'matched',activation:'active'}).length,1);
 assert.equal(A.filterCandidates(candidates(),{acc:'missing',activation:'active'})[0].id,'b');
 assert.equal(A.filterCandidates(candidates(),{category:'review'})[0].id,'b');
 assert.equal(A.filterCandidates(candidates(),{category:'pending'})[0].id,'c');
});
test('source filter checks actual events, not just the preferred form after deduplication',()=>{
 assert.equal(A.filterCandidates(candidates(),{source:'Data Briefing Session'})[0].id,'a');
 assert.equal(A.filterCandidates(candidates(),{source:'Data Briefing Session',from:'2026-10-27',to:'2026-10-27'}).length,0);
});
test('session stats distinguish submissions, unique people, ACC and Snapshot activation',()=>{
 const f={from:'2026-10-27',to:'2026-10-27'},list=A.filterCandidates(candidates(),f),s=A.stats(list,f);
 assert.equal(s.unique,1);assert.equal(s.submissions,2);assert.equal(s.applied,1);assert.equal(s.active,1);
 assert.equal(A.stats(candidates()).unknownDate,1);
});
