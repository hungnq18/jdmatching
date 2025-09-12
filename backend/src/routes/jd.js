const express = require('express');
const router = express.Router();
const jdService = require('../services/jdService');

router.post('/jd', async (req, res) => {
  try {
    const jd = await jdService.createJD(req.body);
    res.status(201).json(jd);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/jd/:id', async (req, res) => {
  try {
    const jd = await jdService.getJDById(req.params.id);
    if (!jd) return res.status(404).json({ error: 'JD not found' });
    res.json(jd);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/jd', async (req, res) => {
  try {
    const jd = await jdService.getAllJD();
    res.json(jd);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;