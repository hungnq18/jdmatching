const express = require('express');
const contractFilterController = require('../controllers/contractFilterController');

const router = express.Router();

/**
 * Routes cho Contract Filter API
 */

// GET /api/contracts/one-year - Lấy danh sách ứng viên còn 1 năm hợp đồng
router.get('/one-year', contractFilterController.getOneYearContractUsers);

// GET /api/contracts/expiring-soon - Lấy danh sách ứng viên sắp hết hợp đồng (3 tháng)
router.get('/expiring-soon', contractFilterController.getExpiringSoonUsers);

// GET /api/contracts/filter - Lọc ứng viên theo thời gian hợp đồng tùy chỉnh
router.get('/filter', contractFilterController.filterUsersByContract);

// POST /api/contracts/export - Xuất danh sách ứng viên ra CSV
router.post('/export', contractFilterController.exportUsersToCSV);

// GET /api/contracts/statistics - Lấy thống kê về hợp đồng
router.get('/statistics', contractFilterController.getContractStatistics);

module.exports = router;
