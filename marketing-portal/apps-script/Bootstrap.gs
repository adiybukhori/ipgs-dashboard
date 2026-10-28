/** Authorize both read access and the spreadsheet write scope used by Save Status. No cell values are changed. */
function authorizeBridge(){
 const sheet=SpreadsheetApp.openById(SOURCES.marketing).getSheetByName('MARKETING_CONTINUATION_STATUS');
 if(!sheet)throw Error('Continuation sheet missing');
 const result=build_();
 console.log('Bridge authorization checked. '+JSON.stringify(result.summary));
 return {ok:true,writeScopeChecked:true};
}
