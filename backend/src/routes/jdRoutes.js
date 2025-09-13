const express = require('express');
const router = express.Router();
const { JDController, upload } = require('../controllers/jdController');

// Tạo thư mục uploads nếu chưa có
const fs = require('fs');
const path = require('path');

const uploadDir = path.join(__dirname, '../../uploads/jd');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * @route POST /api/jd/upload
 * @desc Upload file JD và phân tích bằng AI
 * @access Private (nếu cần xác thực)
 */
router.post('/upload', upload.single('jdFile'), JDController.uploadAndAnalyzeJD);

/**
 * @route POST /api/jd/analyze-text
 * @desc Phân tích JD từ text trực tiếp
 * @access Private (nếu cần xác thực)
 */
router.post('/analyze-text', JDController.analyzeJDText);

/**
 * @route GET /api/jd
 * @desc Lấy danh sách JD đã phân tích
 * @access Private (nếu cần xác thực)
 */
router.get('/', JDController.getAnalyzedJDs);

/**
 * @route GET /api/jd/:id
 * @desc Lấy chi tiết JD theo ID
 * @access Private (nếu cần xác thực)
 */
router.get('/:id', JDController.getJDById);

/**
 * @route PUT /api/jd/:id
 * @desc Cập nhật JD
 * @access Private (nếu cần xác thực)
 */
router.put('/:id', JDController.updateJD);

/**
 * @route DELETE /api/jd/:id
 * @desc Xóa JD
 * @access Private (nếu cần xác thực)
 */
router.delete('/:id', JDController.deleteJD);

/**
 * @route GET /api/jd/:id/candidates
 * @desc Lấy danh sách ứng viên phù hợp với JD
 * @access Private (nếu cần xác thực)
 */
router.get('/:id/candidates', JDController.getMatchingCandidates);

module.exports = router;
