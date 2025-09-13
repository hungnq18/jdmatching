const JD = require('../models/jd');
const aiAnalysisService = require('../services/aiAnalysisService');
const { matchUsersWithJD } = require('../services/matchService');

// Helper functions for fallback data extraction
const extractCompanyName = (text) => {
  const match = text.match(/(?:Công ty|Tập đoàn|Công ty cổ phần)\s+([^\n\r]+)/i);
  return match ? match[1].trim() : 'Company Name';
};

const extractJobName = (text) => {
  const lines = text.split('\n').filter(line => line.trim());
  return lines[0]?.substring(0, 50) || 'Job Position';
};

const extractLocation = (text) => {
  const match = text.match(/(?:TP\.|Tỉnh|Thành phố)\s+([^\n\r,]+)/i);
  return match ? match[1].trim() : 'Location';
};

const extractVisaType = (text) => {
  const match = text.match(/(?:Thực tập sinh|Kỹ thuật viên|Kỹ sư|Lao động)/i);
  return match ? match[0] : null;
};

const extractIndustry = (text) => {
  const industries = ['Cơ khí', 'Điện tử', 'May mặc', 'Xây dựng', 'Nông nghiệp', 'Dịch vụ'];
  for (const industry of industries) {
    if (text.toLowerCase().includes(industry.toLowerCase())) {
      return industry;
    }
  }
  return null;
};

const extractGender = (text) => {
  if (text.includes('Nam')) return 'Nam';
  if (text.includes('Nữ')) return 'Nữ';
  if (text.includes('Nam/Nữ')) return 'Nam/Nữ';
  return null;
};

const extractAgeRange = (text) => {
  const match = text.match(/(\d+)\s*[-~]\s*(\d+)\s*tuổi/i);
  if (match) {
    return `${match[1]} ~ ${match[2]}`;
  }
  return null;
};

const extractEducation = (text) => {
  if (text.includes('Tốt nghiệp')) return 'Tốt nghiệp';
  if (text.includes('Trung cấp')) return 'Trung cấp';
  if (text.includes('Cao đẳng')) return 'Cao đẳng';
  if (text.includes('Đại học')) return 'Đại học';
  return null;
};

const extractSkills = (text) => {
  const skills = [];
  if (text.includes('Kỹ năng')) skills.push('Kỹ năng cơ bản');
  if (text.includes('Kinh nghiệm')) skills.push('Có kinh nghiệm');
  if (text.includes('Tay nghề')) skills.push('Tay nghề');
  return skills.length > 0 ? skills : ['Kỹ năng cơ bản'];
};

const extractWage = (text) => {
  const match = text.match(/(\d+)\s*yên\/h/i);
  return match ? match[1] : null;
};

const extractContractDuration = (text) => {
  const match = text.match(/(\d+)\s*năm/i);
  return match ? `${match[1]} năm` : null;
};
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const pdf = require('pdf-parse');

// Helper function để đếm số lượng yêu cầu
function countRequirements(requirements) {
  let count = 0;
  Object.values(requirements).forEach(category => {
    if (typeof category === 'object' && category !== null) {
      Object.values(category).forEach(value => {
        if (Array.isArray(value)) {
          count += value.length;
        } else if (value && value !== '') {
          count += 1;
        }
      });
    }
  });
  return count;
}

// Helper function để tính độ tin cậy
function calculateConfidence(analyzedData) {
  const totalFields = Object.keys(analyzedData).length;
  const filledFields = Object.values(analyzedData).filter(v => 
    v !== null && v !== '' && (Array.isArray(v) ? v.length > 0 : true)
  ).length;
  
  return Math.round((filledFields / totalFields) * 100);
}

// Cấu hình multer để xử lý file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/jd/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'jd-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Chấp nhận các file text, pdf, doc, docx
    const allowedTypes = /\.(txt|pdf|doc|docx)$/i;
    const extname = allowedTypes.test(path.extname(file.originalname));
    const mimetype = file.mimetype === 'text/plain' || 
                     file.mimetype === 'application/pdf' ||
                     file.mimetype === 'application/msword' ||
                     file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file .txt, .pdf, .doc, .docx'));
    }
  }
});

class JDController {
  /**
   * Upload và phân tích JD từ file
   */
  async uploadAndAnalyzeJD(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng chọn file để upload'
        });
      }

      console.log('File uploaded:', req.file.filename);

      // Đọc nội dung file
      const filePath = req.file.path;
      let jdText = '';

      try {
        // Xử lý file text
        if (req.file.mimetype === 'text/plain') {
          jdText = await fs.readFile(filePath, 'utf8');
        } else if (req.file.mimetype === 'application/pdf') {
          // Xử lý file PDF
          const dataBuffer = await fs.readFile(filePath);
          const pdfData = await pdf(dataBuffer);
          jdText = pdfData.text;
        } else {
          // Đối với file DOC, DOCX - cần thêm thư viện xử lý
          await fs.unlink(filePath); // Xóa file tạm
          return res.status(400).json({
            success: false,
            message: 'Hiện tại chỉ hỗ trợ file .txt và .pdf. File DOC, DOCX sẽ được hỗ trợ trong phiên bản tiếp theo.'
          });
        }
      } catch (fileError) {
        console.error('Error reading file:', fileError);
        await fs.unlink(filePath); // Xóa file tạm
        return res.status(500).json({
          success: false,
          message: 'Lỗi khi đọc file: ' + fileError.message
        });
      }

      if (!jdText.trim()) {
        await fs.unlink(filePath); // Xóa file tạm
        return res.status(400).json({
          success: false,
          message: 'File trống hoặc không có nội dung'
        });
      }

      console.log('JD Text length:', jdText.length);

      // Phân tích JD bằng AI với fallback
      let analyzedData, candidateRequirements;
      
      try {
        analyzedData = await aiAnalysisService.analyzeJD(jdText);
        console.log('AI Analysis completed');
        
        candidateRequirements = await aiAnalysisService.extractCandidateRequirements(jdText);
        console.log('Candidate requirements extracted');
      } catch (aiError) {
        console.error('AI Analysis failed, using fallback:', aiError.message);
        
        // Enhanced fallback: Extract basic info from text
        console.log('[JD_ANALYSIS] Using enhanced fallback extraction');
        analyzedData = {
          title: extractJobName(jdText),
          company_name: extractCompanyName(jdText),
          job_name: extractJobName(jdText),
          location: extractLocation(jdText),
          visa_type: extractVisaType(jdText),
          industry: extractIndustry(jdText),
          job_description: jdText.substring(0, 500) + '...',
          gender: extractGender(jdText),
          age_range: extractAgeRange(jdText),
          education: extractEducation(jdText),
          skills_required: extractSkills(jdText),
          hourly_wage: extractWage(jdText),
          contract_duration: extractContractDuration(jdText),
          _analysis_metadata: {
            confidence_score: 25,
            valid_fields: 6,
            total_fields: 20,
            analysis_timestamp: new Date().toISOString(),
            fallback_used: true,
            error: aiError.message
          }
        };
        
        candidateRequirements = {
          age_range: { min: 18, max: 65 },
          gender_preference: [],
          job_groups: [],
          experience_years: { min: 0, max: 20 },
          education_level: [],
          language_skills: [],
          visa_types: [],
          contract_duration: { min: 1, max: 5 },
          other_preferences: []
        };
      }

      // Lưu vào database
      const jdData = {
        ...analyzedData,
        original_text: jdText,
        candidate_requirements: candidateRequirements,
        uploaded_file: req.file.filename,
        analysis_status: 'completed'
      };

      const savedJD = await JD.create(jdData);
      console.log('JD saved to database:', savedJD._id);

      // Tự động lọc ứng viên phù hợp sau khi lưu JD
      let matchedCandidates = [];
      try {
        console.log('Starting automatic candidate matching...');
        const matchingResult = await matchUsersWithJD(savedJD._id);
        matchedCandidates = matchingResult.candidates || [];
        console.log(`Found ${matchedCandidates.length} matching candidates`);
      } catch (matchError) {
        console.error('Error in automatic matching:', matchError);
        // Không throw error để không ảnh hưởng đến việc lưu JD
      }

      // Xóa file tạm sau khi xử lý xong
      try {
        await fs.unlink(filePath);
      } catch (unlinkError) {
        console.error('Error deleting temp file:', unlinkError);
        // Không throw error vì file có thể đã được xóa
      }

      res.json({
        success: true,
        message: 'Phân tích JD thành công và đã tự động lọc ứng viên phù hợp',
        data: {
          jd: savedJD,
          analysis_summary: {
            total_fields_filled: Object.values(analyzedData).filter(v => v !== null && v !== '').length,
            total_requirements: countRequirements(candidateRequirements),
            analysis_confidence: calculateConfidence(analyzedData)
          },
          matching_results: {
            total_candidates_found: matchedCandidates.length,
            candidates: matchedCandidates.slice(0, 10) // Chỉ trả về 10 ứng viên đầu tiên để tránh response quá lớn
          }
        }
      });

    } catch (error) {
      console.error('Error in uploadAndAnalyzeJD:', error);
      
      // Xóa file tạm nếu có lỗi
      if (req.file && req.file.path) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          console.error('Error deleting temp file:', unlinkError);
          // Không throw error vì file có thể đã được xóa
        }
      }

      res.status(500).json({
        success: false,
        message: 'Lỗi khi xử lý JD: ' + error.message
      });
    }
  }

  /**
   * Upload và phân tích JD từ text trực tiếp
   */
  async analyzeJDText(req, res) {
    try {
      const { jdText } = req.body;

      if (!jdText || !jdText.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng nhập nội dung JD'
        });
      }

      console.log('Analyzing JD text, length:', jdText.length);

      // Phân tích JD bằng AI với fallback
      let analyzedData, candidateRequirements;
      
      try {
        analyzedData = await aiAnalysisService.analyzeJD(jdText);
        console.log('AI Analysis completed');
        
        candidateRequirements = await aiAnalysisService.extractCandidateRequirements(jdText);
        console.log('Candidate requirements extracted');
      } catch (aiError) {
        console.error('AI Analysis failed, using fallback:', aiError.message);
        
        // Enhanced fallback: Extract basic info from text
        console.log('[JD_ANALYSIS] Using enhanced fallback extraction');
        analyzedData = {
          title: extractJobName(jdText),
          company_name: extractCompanyName(jdText),
          job_name: extractJobName(jdText),
          location: extractLocation(jdText),
          visa_type: extractVisaType(jdText),
          industry: extractIndustry(jdText),
          job_description: jdText.substring(0, 500) + '...',
          gender: extractGender(jdText),
          age_range: extractAgeRange(jdText),
          education: extractEducation(jdText),
          skills_required: extractSkills(jdText),
          hourly_wage: extractWage(jdText),
          contract_duration: extractContractDuration(jdText),
          _analysis_metadata: {
            confidence_score: 25,
            valid_fields: 6,
            total_fields: 20,
            analysis_timestamp: new Date().toISOString(),
            fallback_used: true,
            error: aiError.message
          }
        };
        
        candidateRequirements = {
          age_range: { min: 18, max: 65 },
          gender_preference: [],
          job_groups: [],
          experience_years: { min: 0, max: 20 },
          education_level: [],
          language_skills: [],
          visa_types: [],
          contract_duration: { min: 1, max: 5 },
          other_preferences: []
        };
      }

      // Lưu vào database
      const jdData = {
        ...analyzedData,
        original_text: jdText,
        candidate_requirements: candidateRequirements,
        analysis_status: 'completed'
      };

      const savedJD = await JD.create(jdData);
      console.log('JD saved to database:', savedJD._id);

      // Tự động lọc ứng viên phù hợp sau khi lưu JD
      let matchedCandidates = [];
      try {
        console.log('Starting automatic candidate matching...');
        const matchingResult = await matchUsersWithJD(savedJD._id);
        matchedCandidates = matchingResult.candidates || [];
        console.log(`Found ${matchedCandidates.length} matching candidates`);
      } catch (matchError) {
        console.error('Error in automatic matching:', matchError);
        // Không throw error để không ảnh hưởng đến việc lưu JD
      }

      res.json({
        success: true,
        message: 'Phân tích JD thành công và đã tự động lọc ứng viên phù hợp',
        data: {
          jd: savedJD,
          analysis_summary: {
            total_fields_filled: Object.values(analyzedData).filter(v => v !== null && v !== '').length,
            total_requirements: countRequirements(candidateRequirements),
            analysis_confidence: calculateConfidence(analyzedData)
          },
          matching_results: {
            total_candidates_found: matchedCandidates.length,
            candidates: matchedCandidates.slice(0, 10) // Chỉ trả về 10 ứng viên đầu tiên để tránh response quá lớn
          }
        }
      });

    } catch (error) {
      console.error('Error in analyzeJDText:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi phân tích JD: ' + error.message
      });
    }
  }

  /**
   * Lấy danh sách JD đã phân tích
   */
  async getAnalyzedJDs(req, res) {
    try {
      const { page = 1, limit = 10, search = '' } = req.query;
      const skip = (page - 1) * limit;

      let query = {};
      if (search) {
        query = {
          $or: [
            { title: { $regex: search, $options: 'i' } },
            { company_name: { $regex: search, $options: 'i' } },
            { job_name: { $regex: search, $options: 'i' } }
          ]
        };
      }

      const jds = await JD.find(query)
        .select('-original_text') // Không trả về text gốc để tiết kiệm băng thông
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await JD.countDocuments(query);

      res.json({
        success: true,
        data: {
          jds,
          pagination: {
            current_page: parseInt(page),
            total_pages: Math.ceil(total / limit),
            total_items: total,
            items_per_page: parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error('Error in getAnalyzedJDs:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy danh sách JD: ' + error.message
      });
    }
  }

  /**
   * Lấy chi tiết JD theo ID
   */
  async getJDById(req, res) {
    try {
      const { id } = req.params;

      const jd = await JD.findById(id);
      if (!jd) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy JD'
        });
      }

      res.json({
        success: true,
        data: jd
      });

    } catch (error) {
      console.error('Error in getJDById:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy chi tiết JD: ' + error.message
      });
    }
  }

  /**
   * Cập nhật JD
   */
  async updateJD(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const jd = await JD.findByIdAndUpdate(
        id,
        { ...updateData, updatedAt: new Date() },
        { new: true, runValidators: true }
      );

      if (!jd) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy JD'
        });
      }

      res.json({
        success: true,
        message: 'Cập nhật JD thành công',
        data: jd
      });

    } catch (error) {
      console.error('Error in updateJD:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi cập nhật JD: ' + error.message
      });
    }
  }

  /**
   * Xóa JD
   */
  async deleteJD(req, res) {
    try {
      const { id } = req.params;

      const jd = await JD.findByIdAndDelete(id);
      if (!jd) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy JD'
        });
      }

      res.json({
        success: true,
        message: 'Xóa JD thành công'
      });

    } catch (error) {
      console.error('Error in deleteJD:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi xóa JD: ' + error.message
      });
    }
  }

  /**
   * Lấy danh sách ứng viên phù hợp với JD
   */
  async getMatchingCandidates(req, res) {
    try {
      const { id } = req.params;
      const { limit = 50 } = req.query;

      // Validate input
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'ID của JD là bắt buộc'
        });
      }

      // Kiểm tra JD có tồn tại không
      const jd = await JD.findById(id);
      if (!jd) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy JD'
        });
      }

      console.log(`[getMatchingCandidates] Starting matching for JD: ${id}`);
      
      // Set timeout for matching process
      const matchingTimeout = 150000; // 2.5 minutes
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Matching process timeout')), matchingTimeout);
      });
      
      // Lấy danh sách ứng viên phù hợp
      let matchingResult = {};
      try {
        matchingResult = await Promise.race([
          matchUsersWithJD(id),
          timeoutPromise
        ]);
        console.log(`[getMatchingCandidates] Found ${matchingResult.candidates?.length || 0} candidates`);
      } catch (matchError) {
        console.error('[getMatchingCandidates] Matching error:', matchError);
        const errorMessage = matchError.message === 'Matching process timeout' 
          ? 'Quá trình tìm kiếm mất quá nhiều thời gian. Vui lòng thử lại với JD khác.'
          : 'Lỗi khi tìm kiếm ứng viên phù hợp: ' + matchError.message;
        
        return res.status(500).json({
          success: false,
          message: errorMessage
        });
      }
      
      const matchedCandidates = matchingResult.candidates || [];
      
      // Filter candidates with score > 50%
      const highQualityCandidates = matchedCandidates.filter(candidate => 
        candidate.matchScore && candidate.matchScore > 0.5
      );
      
      console.log(`[getMatchingCandidates] Filtered: ${highQualityCandidates.length}/${matchedCandidates.length} candidates with score >50%`);
      
      // Giới hạn số lượng trả về
      const limitedCandidates = highQualityCandidates.slice(0, parseInt(limit));

      res.json({
        success: true,
        data: {
          jd_id: id,
          jd_title: jd.title || 'N/A',
          total_candidates: highQualityCandidates.length,
          total_found: matchedCandidates.length,
          candidates: limitedCandidates,
          progress: matchingResult.progress || {},
          summary: matchingResult.summary || {},
          filtering: {
            threshold: 0.5,
            filtered_count: highQualityCandidates.length,
            original_count: matchedCandidates.length
          },
          pagination: {
            total: highQualityCandidates.length,
            returned: limitedCandidates.length,
            limit: parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error('Error in getMatchingCandidates:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy danh sách ứng viên phù hợp: ' + error.message
      });
    }
  }

}

module.exports = {
  JDController: new JDController(),
  upload
};
