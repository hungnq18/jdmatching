const express = require('express');
const router = express.Router();
const matchService = require('../services/matchService');

router.get('/match/:jdId', async (req, res) => {
  try {
    const jdId = req.params.jdId;
        console.log('jdId:', jdId); // Thêm dòng này để bắt lỗi

    if (!jdId) {
      throw new Error('jdId is required');
    }
    const matchedUsers = await matchService.matchUsersWithJD(jdId);
    res.json({ matchedUsers });
  } catch (err) {
        console.error('Lỗi:', err); // Thêm dòng này để bắt lỗi

    res.status(400).json({ error: err.message });
  }
});
module.exports = router;