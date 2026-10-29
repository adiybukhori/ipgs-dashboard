module.exports = (req, res) => { res.setHeader('Cache-Control','no-store'); return res.status(404).end(); };
