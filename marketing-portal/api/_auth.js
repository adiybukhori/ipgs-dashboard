const crypto=require('node:crypto');
const secret=()=>process.env.PORTAL_SESSION_SECRET||'';
const mac=s=>crypto.createHmac('sha256',secret()).update(s).digest('hex');
function ok(req){if(!secret()||!process.env.PORTAL_PASSWORD)return false;const raw=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('ipgs_mkt_session='))?.slice(17);if(!raw)return false;const [time,signature]=raw.split('.');if(!/^\d+$/.test(time)||Number(time)<Date.now())return false;const m=mac(time);return typeof signature==='string'&&m.length===signature.length&&crypto.timingSafeEqual(Buffer.from(m),Buffer.from(signature))}
module.exports={ok,mac};