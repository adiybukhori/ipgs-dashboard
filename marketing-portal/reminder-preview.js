/* Exact HTML email template sourced from deployed IPGS-Marketing-Bridge Reminders.js (v15).
   Regenerate this preview function when email template changes. No email is sent here. */
(function(){
  'use strict';
  const REMINDER_OPT_OUT_CTA_FROM=7;
  const REMINDER_ADMISSION_URL='https://ipgs-admission-form.innovative.edu.my/';
  function remindEsc_(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function remindHtml_(optoutUrl, reminderNumber){
 const showNotInterestedButton=Number(reminderNumber)>=REMINDER_OPT_OUT_CTA_FROM;
 const link=remindEsc_(optoutUrl),admission=remindEsc_(REMINDER_ADMISSION_URL);
 return '<!doctype html><html><body style="background:#f5f3f8;margin:0;padding:20px;font-family:Arial,Helvetica,sans-serif;color:#29223a">'
 +'<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center"><table role="presentation" width="580" style="max-width:580px;width:100%;background:#fff;border-radius:12px;overflow:hidden">'
 +'<tr><td style="padding:0"><img src="https://raw.githubusercontent.com/adiybukhori/ipgs-admission-form/main/assets/email/IPGS_Official_Email_Header.jpg" alt="Innovative University College - Institute of Postgraduate Studies (IPGS)" width="580" style="display:block;width:100%;max-width:580px;height:auto;border:0"></td></tr>'
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
  window.openReminderPreview=function(reminderNumber){
    const dialog=document.getElementById('reminderPreviewDialog'),
      frame=document.getElementById('reminderPreviewFrame'),
      label=document.getElementById('reminderPreviewTitle');
    if(!dialog||!frame||!label)return;
    const later=Number(reminderNumber)>=7;
    label.textContent=later?'HTML Email Preview — Reminder 7 & Later':'HTML Email Preview — Reminder 1–6';
    // Render current Apps Script HTML; never substitute the old two-logo header.
    // The iframe is sandboxed; all preview links are disabled.
    const fakeOptOut='https://example.invalid/preview-only/stop-reminders';
    frame.srcdoc=remindHtml_(fakeOptOut,later?7:1);
    if(!dialog.open)dialog.showModal();
  };
  window.closeReminderPreview=function(){
    const dialog=document.getElementById('reminderPreviewDialog'),
      frame=document.getElementById('reminderPreviewFrame');
    if(dialog?.open)dialog.close();
    if(frame)frame.removeAttribute('srcdoc');
  };
})();
