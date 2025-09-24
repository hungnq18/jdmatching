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

// POST /api/contracts/filter - Lọc ứng viên theo thời gian hợp đồng tùy chỉnh
router.post('/filter', contractFilterController.filterUsersByContract);

// POST /api/contracts/export/csv - Xuất danh sách ứng viên ra CSV
router.post('/export/csv', contractFilterController.exportUsersToCSV);

// POST /api/contracts/export/excel - Xuất danh sách ứng viên ra Excel
router.post('/export/excel', contractFilterController.exportUsersToExcel);

// GET /api/contracts/statistics - Lấy thống kê về hợp đồng
router.get('/statistics', contractFilterController.getContractStatistics);

// GET /api/contracts/candidate/:id - Lấy thông tin chi tiết ứng viên theo ID
router.get('/candidate/:id', contractFilterController.getCandidateById);

module.exports = router;
