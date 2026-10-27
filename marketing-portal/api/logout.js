module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).end();
  res.setHeader('Set-Cookie', 'ipgs_mkt_session=; Max-Age=0; HttpOnly; Secure; SameSite=Strict; Path=/');
  return res.status(200).json({ok:true});
};
