const pLimit = require("p-limit");
const stringSimilarity = require("string-similarity");
const User = require("../models/user");
const JD = require("../models/jd");
const JobGroup = require("../models/visaType");
const { getJDById } = require("./jdService");
const aiAnalysisService = require("./aiAnalysisService");

// ============================================
// AI MATCHING FUNCTIONS
// ============================================

/**
 * Parse AI response JSON với error handling robust
 * @param {string} response - AI response
 * @param {string} functionName - Tên function để logging
 * @returns {Object} Parsed result hoặc fallback object
 */
function parseAIResponse(response, functionName = 'unknown') {
  try {
    let jsonStr = response.trim();
    
    // Remove markdown code blocks if present
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```\n?/, '').replace(/\n?```$/, '');
    }
    
    // Fix common JSON issues
    jsonStr = jsonStr.replace(/\n/g, ' ').replace(/\s+/g, ' ');
    
    // Try to extract JSON from response if it's mixed with text
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }
    
    return JSON.parse(jsonStr);
  } catch (parseError) {
    console.error(`Error parsing AI response in ${functionName}:`, parseError);
    console.error('Raw AI response:', response);
    
    // Return fallback based on function type
    if (functionName.includes('JobGroup')) {
      return {
        group_name: null,
        confidence: 0.5,
        reasoning: 'AI response parsing failed',
        matched_keywords: []
      };
    } else if (functionName.includes('UserJobGroup')) {
      return {
        group_name: null,
        confidence: 0.5,
        reasoning: 'AI response parsing failed',
        is_same_group: false
      };
    }
    
    return {};
  }
}

// Rate limiting cho AI requests
let aiRequestCount = 0;
let lastResetTime = Date.now();
const maxAIRequestsPerMinute = 30; // Tăng rate limit để xử lý nhanh hơn

/**
 * Reset AI request counter mỗi phút
 */
function resetAIRequestCounter() {
  const now = Date.now();
  if (now - lastResetTime >= 60000) {
    aiRequestCount = 0;
    lastResetTime = now;
  }
}

/**
 * Tính điểm phù hợp giữa ứng viên và JD bằng AI
 * @param {string} jdText - Nội dung Job Description
 * @param {Object} userProfile - Thông tin ứng viên
 * @param {Object} jdDetail - Chi tiết JD từ database
 * @returns {Promise<number>} Điểm từ 0.0 đến 1.0
 */
async function calculateAIMatchScore(jdText, userProfile, jdDetail) {
  try {
    // Reset counter nếu cần
    resetAIRequestCounter();
    
    // Kiểm tra rate limit
    if (aiRequestCount >= maxAIRequestsPerMinute) {
      console.log(`[AI_RATE_LIMIT] Reached ${maxAIRequestsPerMinute} requests per minute, using fallback`);
      throw new Error('Rate limit reached');
    }
    
    aiRequestCount++;
    
    // Tạo prompt siêu ngắn gọn để tăng tốc độ xử lý
    const prompt = `Đánh giá phù hợp (0.0-1.0):

JD: ${jdText.substring(0, 200)}...
Visa: ${jdDetail.visa_type || 'N/A'}

User: ${userProfile.jobTitle || 'N/A'} | ${userProfile.gender || 'N/A'}

Chỉ trả về số:`;

    const response = await aiAnalysisService.callAI(prompt);
    const score = parseFloat(response.trim());
    
    // Đảm bảo score trong khoảng 0-1
    return isNaN(score) ? 0.5 : Math.max(0, Math.min(1, score));
  } catch (error) {
    console.error('Error calculating AI match score:', error);
    return 0.5; // Default score nếu có lỗi
  }
}

/**
 * Tính tuổi từ ngày sinh
 * @param {string} birthDate - Ngày sinh (dd/mm/yyyy)
 * @returns {string|number} Tuổi hoặc 'N/A'
 */
function calculateAge(birthDate) {
  if (!birthDate) return 'N/A';
  try {
    const today = new Date();
    const birth = new Date(birthDate.split('/').reverse().join('-'));
    return today.getFullYear() - birth.getFullYear();
  } catch (error) {
    return 'N/A';
  }
}

/**
 * Tính điểm fallback khi AI không khả dụng
 * @param {Object} user - Thông tin user
 * @param {Object} jdDetail - Chi tiết JD
 * @param {number} baseScore - Điểm cơ bản từ string similarity
 * @returns {number} Điểm từ 0.0 đến 1.0
 */
function calculateFallbackScore(user, jdDetail, baseScore) {
  let score = baseScore || 0.5; // Bắt đầu với string similarity score
  
  // Parse conditions từ JD description
  const parsedConditions = parseJDConditions(jdDetail.job_description || '');
  
  // Tracking criteria matching
  const criteriaResults = [];
  let criticalCriteriaCount = 0;
  let criticalMatchedCount = 0;
  
  // 1. Kiểm tra giới tính (CRITICAL - Only if required in JD description)
  const jdGender = jdDetail.gender || parsedConditions.gender;
  if (jdGender && user.gender && parsedConditions.gender_required) {
    criticalCriteriaCount++;
    const normalizedJdGender = normalizeGender(jdGender);
    const userGender = normalizeGender(user.gender);
    
    console.log(`[GENDER_CHECK] JD: "${jdGender}" -> "${normalizedJdGender}", User: "${user.gender}" -> "${userGender}"`);
    
    // Kiểm tra các trường hợp phù hợp
    const isGenderMatch = 
      normalizedJdGender === userGender || 
      normalizedJdGender === 'any' ||
      normalizedJdGender === '' ||
      !normalizedJdGender;
    
    if (isGenderMatch) {
      criticalMatchedCount++;
      score += 0.1;
      console.log(`[GENDER_MATCH] Bonus +0.1 for gender match`);
    } else {
      console.log(`[GENDER_MISMATCH] No bonus for gender mismatch`);
    }
    
    criteriaResults.push({
      name: 'Giới tính',
      required: true,
      matched: isGenderMatch,
      weight: 0.1,
      details: `JD: ${jdGender}, User: ${user.gender}`
    });
  }
  
  // 2. Kiểm tra độ tuổi (CRITICAL - Only if required in JD description)
  const ageRange = jdDetail.age_range || parsedConditions.age_range;
  if (ageRange && user.birthDate && parsedConditions.age_required) {
    criticalCriteriaCount++;
    const userAge = calculateAge(user.birthDate);
    if (typeof userAge === 'number') {
      const ageMatch = parseAgeRange(ageRange);
      if (ageMatch.minAge && ageMatch.maxAge) {
        const isAgeMatch = userAge >= ageMatch.minAge && userAge <= ageMatch.maxAge;
        if (isAgeMatch) {
          criticalMatchedCount++;
          score += 0.15;
        } else {
          // Penalty nếu ngoài độ tuổi
          score -= 0.1;
        }
        
        criteriaResults.push({
          name: 'Độ tuổi',
          required: true,
          matched: isAgeMatch,
          weight: 0.15,
          details: `User: ${userAge} tuổi, JD: ${ageMatch.minAge}-${ageMatch.maxAge} tuổi`
        });
      }
    }
  }
  
  // 3. Kiểm tra loại visa (CRITICAL - Only if required in JD description)
  const visaType = jdDetail.visa_type || parsedConditions.visa_type;
  if (visaType && user.dispatchType && parsedConditions.visa_critical) {
    criticalCriteriaCount++;
    const jdVisa = normalize(visaType);
    const userVisa = normalize(user.dispatchType);
    const isVisaMatch = jdVisa === userVisa;
    
    if (isVisaMatch) {
      criticalMatchedCount++;
      score += 0.2;
    }
    
    criteriaResults.push({
      name: 'Loại visa',
      required: true,
      matched: isVisaMatch,
      weight: 0.2,
      details: `JD: ${visaType}, User: ${user.dispatchType}`
    });
  }
  
  // 4. Kiểm tra kinh nghiệm (CRITICAL - Only if required in JD description)
  if (user.contractDuration && parsedConditions.experience_critical) {
    const duration = user.contractDuration.toLowerCase();
    if (duration.includes('năm') || duration.includes('year')) {
      const years = parseInt(duration.match(/(\d+)/)?.[1] || '0');
      const hasExperience = years >= 2;
      
      if (parsedConditions.experience_required === false) {
        // JD không yêu cầu kinh nghiệm - bonus cho người mới
        const isNewbie = years < 2;
        if (isNewbie) {
          criticalMatchedCount++;
          score += 0.1;
        }
        
        criteriaResults.push({
          name: 'Không yêu cầu kinh nghiệm',
          required: true,
          matched: isNewbie,
          weight: 0.1,
          details: `JD: Không yêu cầu, User: ${years} năm`
        });
      } else {
        // JD yêu cầu kinh nghiệm
        if (hasExperience) {
          criticalMatchedCount++;
          score += 0.1;
        }
        
        criteriaResults.push({
          name: 'Kinh nghiệm',
          required: true,
          matched: hasExperience,
          weight: 0.1,
          details: `JD: Yêu cầu kinh nghiệm, User: ${years} năm`
        });
      }
      
      criticalCriteriaCount++;
    }
  }
  
  // 5. Kiểm tra thời gian hợp đồng còn lại (BONUS)
  if (user.entryDate && user.contractDuration) {
    const endDate = calculateContractEndDate(user.entryDate, user.contractDuration);
    if (endDate) {
      const diffYears = (endDate - new Date()) / (1000 * 60 * 60 * 24 * 365);
      const contractExpiring = diffYears > 0 && diffYears <= 1;
      
      if (contractExpiring) {
        score += 0.15; // Bonus cho hợp đồng sắp hết hạn
      }
      
      criteriaResults.push({
        name: 'Hợp đồng sắp hết hạn',
        required: false,
        matched: contractExpiring,
        weight: 0.15,
        details: `Còn ${diffYears.toFixed(1)} năm`
      });
    }
  }
  
  // 6. Kiểm tra kỹ năng đặc biệt (INFORMATIONAL - Show missing skills to user)
  if (parsedConditions.special_skills && parsedConditions.special_skills.length > 0) {
    const userSkills = normalize(user.jobTitle || '');
    const userDescription = normalize(user.description || '');
    const combinedUserText = `${userSkills} ${userDescription}`;
    let skillMatchCount = 0;
    let missingSkills = [];
    
    for (const skill of parsedConditions.special_skills) {
      const skillNorm = normalize(skill);
      if (combinedUserText.includes(skillNorm) || 
          combinedUserText.includes('lắp ráp') || 
          combinedUserText.includes('lap rap') ||
          combinedUserText.includes('assembly') ||
          combinedUserText.includes('hàn') ||
          combinedUserText.includes('han') ||
          combinedUserText.includes('welding') ||
          combinedUserText.includes('máy') ||
          combinedUserText.includes('may') ||
          combinedUserText.includes('machine')) {
        skillMatchCount++;
      } else {
        missingSkills.push(skill);
      }
    }
    
    // Bonus cho kỹ năng phù hợp (không bắt buộc)
    if (skillMatchCount > 0) {
      score += 0.05 * skillMatchCount; // Giảm weight vì không bắt buộc
      console.log(`[SKILL_MATCH] Bonus +${(0.05 * skillMatchCount).toFixed(2)} for ${skillMatchCount} skill matches`);
    }
    
    criteriaResults.push({
      name: 'Kỹ năng đặc biệt',
      required: false, // Không bắt buộc
      matched: skillMatchCount > 0,
      weight: 0.05 * skillMatchCount,
      details: `JD yêu cầu: ${parsedConditions.special_skills.join(', ')}, User có: ${skillMatchCount}/${parsedConditions.special_skills.length} kỹ năng`,
      missingSkills: missingSkills // Thông tin kỹ năng thiếu
    });
  }
  
  // 7. Kiểm tra điều kiện làm việc (INFORMATIONAL - Show to user)
  if (parsedConditions.working_conditions_critical) {
    const userContract = normalize(user.contractDuration || '');
    const hasWorkingConditions = userContract.includes('ca') || userContract.includes('shift') || 
                                userContract.includes('overtime') || userContract.includes('tăng ca');
    
    if (hasWorkingConditions) {
      score += 0.05; // Giảm weight vì không bắt buộc
    }
    
    criteriaResults.push({
      name: 'Điều kiện làm việc',
      required: false, // Không bắt buộc
      matched: hasWorkingConditions,
      weight: 0.05,
      details: `JD yêu cầu điều kiện làm việc đặc biệt, User: ${hasWorkingConditions ? 'Có' : 'Không có'}`
    });
  }
  
  // 8. Kiểm tra yêu cầu thể chất (INFORMATIONAL - Show to user)
  if (parsedConditions.physical_critical) {
    // Giả sử user có sức khỏe tốt nếu không có thông tin ngược lại
    const hasPhysicalRequirements = true; // Có thể cải thiện bằng cách check health records
    
    if (hasPhysicalRequirements) {
      score += 0.05; // Giảm weight vì không bắt buộc
    }
    
    criteriaResults.push({
      name: 'Yêu cầu thể chất',
      required: false, // Không bắt buộc
      matched: hasPhysicalRequirements,
      weight: 0.05,
      details: `JD yêu cầu sức khỏe tốt, User: ${hasPhysicalRequirements ? 'Đạt' : 'Không đạt'}`
    });
  }
  
  // 9. Kiểm tra yêu cầu địa điểm (INFORMATIONAL - Show to user)
  if (parsedConditions.location_critical) {
    const userLocation = normalize(user.location || '');
    const jdLocation = normalize(jdDetail.location || '');
    const locationMatch = userLocation.includes(jdLocation) || jdLocation.includes(userLocation) || 
                         userLocation === '' || jdLocation === '';
    
    if (locationMatch) {
      score += 0.05; // Giảm weight vì không bắt buộc
    }
    
    criteriaResults.push({
      name: 'Địa điểm làm việc',
      required: false, // Không bắt buộc
      matched: locationMatch,
      weight: 0.05,
      details: `JD: ${jdDetail.location || 'N/A'}, User: ${user.location || 'N/A'}`
    });
  }
  
  
  // Ensure score is within bounds
  score = Math.max(0, Math.min(1, score));
  
  // Check if main criteria are met (gender + age only)
  const mainCriteriaCount = (parsedConditions.gender_required ? 1 : 0) + (parsedConditions.age_required ? 1 : 0);
  
  // Check gender match
  const genderMatch = !parsedConditions.gender_required || 
                     (jdGender && user.gender && normalizeGender(jdGender) === normalizeGender(user.gender));
  
  // Check age match  
  const ageMatch = !parsedConditions.age_required || 
                  (ageRange && user.birthDate && checkAgeMatch(user.birthDate, ageRange));
  
  const mainCriteriaMatched = genderMatch && ageMatch;
  
  // Only check main criteria, ignore other criteria for acceptance
  const allCriticalMatched = mainCriteriaCount === 0 || mainCriteriaMatched;
  
  console.log(`[MAIN_CRITERIA_CHECK] user=${user._id}: gender_match=${genderMatch}, age_match=${ageMatch}, main_criteria=${mainCriteriaMatched}`);
  
  console.log(`[FALLBACK_SCORE] user=${user._id}, base=${baseScore?.toFixed(2)}, final=${score.toFixed(2)}, main_criteria=${mainCriteriaMatched} (${mainCriteriaCount} required), allCritical=${allCriticalMatched}`);
  
  return {
    score: score,
    allCriticalMatched: allCriticalMatched,
    criteriaResults: criteriaResults,
    criticalCriteria: criticalCriteriaCount,
    criticalMatched: criticalMatchedCount
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Loại bỏ dấu tiếng Việt
 * @param {string} str - Chuỗi cần xử lý
 * @returns {string} Chuỗi đã loại bỏ dấu
 */
function removeVietnameseTones(str = "") {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}
/**
 * Parse ngày tháng từ chuỗi
 * @param {string} dateStr - Chuỗi ngày tháng
 * @returns {Date|null} Ngày đã parse hoặc null
 */
function parseEntryDate(dateStr) {
  if (!dateStr) return null;

  // Cố gắng parse trực tiếp bằng Date
  const date = new Date(dateStr);
  if (!isNaN(date)) return date;

  // Thử các định dạng phổ biến (dd/mm/yyyy, dd-mm-yyyy)
  const parts = dateStr.split(/[\/\-\.]/);
  if (parts.length === 3) {
    let day = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10) - 1; // tháng từ 0-11
    let year = parseInt(parts[2], 10);
    
    // Nếu year có dạng yy thì convert sang yyyy
    if (year < 100) year += 2000;
    
    const parsedDate = new Date(year, month, day);
    if (!isNaN(parsedDate)) return parsedDate;
  }

  return null;
}

/**
 * Chuẩn hóa text (loại bỏ dấu, lowercase, trim, xử lý tiếng Nhật)
 * @param {string} text - Text cần chuẩn hóa
 * @returns {string} Text đã chuẩn hóa
 */
function normalize(text = "") {
  let normalized = removeVietnameseTones(String(text).toLowerCase().trim());
  
  // Xử lý tiếng Nhật
  normalized = normalized
    .replace(/男/g, 'nam')
    .replace(/女/g, 'nu')
    .replace(/男性/g, 'nam')
    .replace(/女性/g, 'nu')
    .replace(/male/g, 'nam')
    .replace(/female/g, 'nu')
    .replace(/m/g, 'nam')
    .replace(/f/g, 'nu');
  
  return normalized;
}

/**
 * Parse age range từ string (vd: "18 ~ 35")
 * @param {string} ageRangeStr - Chuỗi độ tuổi
 * @returns {Object} Object chứa minAge và maxAge
 */
function parseAgeRange(ageRangeStr) {
  if (!ageRangeStr) return {};
  const match = ageRangeStr.match(/(\d+)\s*~\s*(\d+)/);
  if (match) {
    return { minAge: parseInt(match[1], 10), maxAge: parseInt(match[2], 10) };
  }
  return {};
}

/**
 * Chuẩn hóa giới tính (xử lý tiếng Nhật, tiếng Việt, tiếng Anh)
 * @param {string} gender - Giới tính cần chuẩn hóa
 * @returns {string} Giới tính đã chuẩn hóa (nam/nu)
 */
function normalizeGender(gender = "") {
  if (!gender) return 'any';
  
  const genderStr = String(gender).toLowerCase().trim();
  
  // Mapping cho các ngôn ngữ khác nhau
  const genderMap = {
    // Tiếng Nhật
    '男': 'nam',
    '女': 'nu',
    '男性': 'nam',
    '女性': 'nu',
    'おとこ': 'nam',
    'おんな': 'nu',
    'otoko': 'nam',
    'onna': 'nu',
    
    // Tiếng Việt
    'nam': 'nam',
    'nữ': 'nu',
    'nu': 'nu',
    'nam giới': 'nam',
    'nữ giới': 'nu',
    'nam gioi': 'nam',
    'nu gioi': 'nu',
    
    // Tiếng Anh
    'male': 'nam',
    'female': 'nu',
    'm': 'nam',
    'f': 'nu',
    'man': 'nam',
    'woman': 'nu',
    
    // Không yêu cầu
    'không yêu cầu': 'any',
    'khong yeu cau': 'any',
    'any': 'any',
    'all': 'any',
    'both': 'any',
    'không': 'any',
    'khong': 'any'
  };
  
  // Try exact match first
  if (genderMap[genderStr]) {
    return genderMap[genderStr];
  }
  
  // Try partial matching for complex strings
  if (genderStr.includes('nam') || genderStr.includes('male') || genderStr.includes('男')) {
    return 'nam';
  }
  if (genderStr.includes('nu') || genderStr.includes('nữ') || genderStr.includes('female') || genderStr.includes('女')) {
    return 'nu';
  }
  if (genderStr.includes('any') || genderStr.includes('all') || genderStr.includes('không')) {
    return 'any';
  }
  
  return 'any';
}

/**
 * Parse điều kiện từ mô tả JD
 * @param {string} description - Mô tả công việc
 * @returns {Object} Các điều kiện đã parse
 */
function parseJDConditions(description) {
  if (!description) return {};
  
  const conditions = {};
  const desc = normalize(description);
  
  console.log(`[JD_PARSING] Analyzing description: "${description.substring(0, 200)}..."`);
  
  // 1. Parse giới tính từ mô tả (CRITICAL - Required if specified)
  const genderPatterns = [
    { pattern: /nam|男性|男|male/i, value: 'nam' },
    { pattern: /nữ|女性|女|female/i, value: 'nu' },
    { pattern: /không phân biệt|khong phan biet|any|all/i, value: 'any' }
  ];
  
  for (const { pattern, value } of genderPatterns) {
    if (pattern.test(desc)) {
      conditions.gender = value;
      conditions.gender_required = true;
      console.log(`[GENDER_PARSED] Found gender requirement: ${value}`);
      break;
    }
  }
  
  // 2. Parse độ tuổi từ mô tả (CRITICAL - Required if specified)
  const agePatterns = [
    /(\d+)\s*[-~]\s*(\d+)\s*tuổi/i,
    /(\d+)\s*[-~]\s*(\d+)\s*tuoi/i,
    /(\d+)\s*[-~]\s*(\d+)\s*years?/i,
    /(\d+)\s*[-~]\s*(\d+)\s*歳/i,
    /tuổi\s*(\d+)\s*[-~]\s*(\d+)/i,
    /age\s*(\d+)\s*[-~]\s*(\d+)/i
  ];
  
  for (const pattern of agePatterns) {
    const match = desc.match(pattern);
    if (match) {
      conditions.age_range = `${match[1]} ~ ${match[2]}`;
      conditions.age_required = true;
      console.log(`[AGE_PARSED] Found age requirement: ${conditions.age_range}`);
      break;
    }
  }
  
  // 3. Parse kinh nghiệm (CRITICAL - Required if specified)
  if (desc.includes('không yêu cầu kinh nghiệm') || desc.includes('khong yeu cau kinh nghiem') || 
      desc.includes('no experience') || desc.includes('mới') || desc.includes('moi')) {
    conditions.experience_required = false;
    conditions.experience_critical = true;
    console.log(`[EXPERIENCE_PARSED] No experience required`);
  } else if (desc.includes('kinh nghiệm') || desc.includes('kinh nghiem') || 
             desc.includes('experience') || desc.includes('経験') ||
             desc.match(/\d+\s*năm\s*kinh\s*nghiệm/i) || desc.match(/\d+\s*years?\s*experience/i)) {
    conditions.experience_required = true;
    conditions.experience_critical = true;
    console.log(`[EXPERIENCE_PARSED] Experience required`);
  }
  
  // 4. Parse trình độ học vấn (CRITICAL - Required if specified)
  const educationPatterns = [
    /tốt nghiệp|tot nghiep|graduated/i,
    /bằng cấp|bang cap|certificate/i,
    /trình độ|trinh do|level/i,
    /học vấn|hoc van|education/i,
    /bằng|bang|degree/i
  ];
  
  for (const pattern of educationPatterns) {
    if (pattern.test(desc)) {
      conditions.education_required = true;
      conditions.education_critical = true;
      console.log(`[EDUCATION_PARSED] Education required`);
      break;
    }
  }
  
  // 5. Parse kỹ năng đặc biệt (CRITICAL - Required if specified)
  const specialSkills = [];
  const skillPatterns = [
    { pattern: /kiểm tra iq|kiem tra iq|iq test/i, skill: 'IQ Test' },
    { pattern: /lắp ráp|lap rap|assembly/i, skill: 'Assembly' },
    { pattern: /vặn ốc vít|van oc vit|screw/i, skill: 'Screw Assembly' },
    { pattern: /hàn|han|welding/i, skill: 'Welding' },
    { pattern: /máy|may|machine/i, skill: 'Machine Operation' },
    { pattern: /kiểm tra|kiem tra|inspection/i, skill: 'Quality Control' },
    { pattern: /vận hành|van hanh|operation/i, skill: 'Equipment Operation' },
    { pattern: /bảo trì|bao tri|maintenance/i, skill: 'Maintenance' },
    { pattern: /an toàn|an toan|safety/i, skill: 'Safety Awareness' },
    { pattern: /tiếng nhật|tieng nhat|japanese/i, skill: 'Japanese Language' },
    { pattern: /tiếng anh|tieng anh|english/i, skill: 'English Language' }
  ];
  
  for (const { pattern, skill } of skillPatterns) {
    if (pattern.test(desc)) {
      specialSkills.push(skill);
    }
  }
  
  if (specialSkills.length > 0) {
    conditions.special_skills = specialSkills;
    conditions.skills_critical = true;
    console.log(`[SKILLS_PARSED] Found skills: ${specialSkills.join(', ')}`);
  }
  
  // 6. Parse visa type requirements (CRITICAL - Required if specified)
  const visaPatterns = [
    /visa|thị thực|thi thuc/i,
    /giấy phép|giay phep|permit/i,
    /tư cách|tu cach|status/i,
    /lao động|lao dong|labor/i,
    /kỹ thuật|ky thuat|technical/i,
    /thực tập|thuc tap|intern/i
  ];
  
  for (const pattern of visaPatterns) {
    if (pattern.test(desc)) {
      conditions.visa_required = true;
      conditions.visa_critical = true;
      console.log(`[VISA_PARSED] Visa requirements found`);
      break;
    }
  }
  
  // 7. Parse contract duration requirements (CRITICAL - Required if specified)
  const contractPatterns = [
    /hợp đồng|hop dong|contract/i,
    /thời gian|thoi gian|duration/i,
    /năm|year|年/i,
    /tháng|month|月/i,
    /dài hạn|dai han|long term/i,
    /ngắn hạn|ngan han|short term/i
  ];
  
  for (const pattern of contractPatterns) {
    if (pattern.test(desc)) {
      conditions.contract_required = true;
      conditions.contract_critical = true;
      console.log(`[CONTRACT_PARSED] Contract requirements found`);
      break;
    }
  }
  
  // 8. Parse working conditions (CRITICAL - Required if specified)
  const workingPatterns = [
    /ca đêm|ca dem|night shift/i,
    /ca ngày|ca ngay|day shift/i,
    /tăng ca|tang ca|overtime/i,
    /cuối tuần|cuoi tuan|weekend/i,
    /nghỉ phép|nghi phep|vacation/i,
    /bảo hiểm|bao hiem|insurance/i
  ];
  
  for (const pattern of workingPatterns) {
    if (pattern.test(desc)) {
      conditions.working_conditions_required = true;
      conditions.working_conditions_critical = true;
      console.log(`[WORKING_PARSED] Working conditions found`);
      break;
    }
  }
  
  // 9. Parse physical requirements (CRITICAL - Required if specified)
  const physicalPatterns = [
    /sức khỏe|suc khoe|health/i,
    /thể lực|the luc|physical/i,
    /chiều cao|chieu cao|height/i,
    /cân nặng|can nang|weight/i,
    /không tật|khong tat|no disability/i,
    /mắt tốt|mat tot|good vision/i
  ];
  
  for (const pattern of physicalPatterns) {
    if (pattern.test(desc)) {
      conditions.physical_required = true;
      conditions.physical_critical = true;
      console.log(`[PHYSICAL_PARSED] Physical requirements found`);
      break;
    }
  }
  
  // 10. Parse location requirements (CRITICAL - Required if specified)
  const locationPatterns = [
    /tại|tai|at|location/i,
    /địa điểm|dia diem|place/i,
    /khu vực|khu vuc|area/i,
    /tỉnh|tinh|province/i,
    /thành phố|thanh pho|city/i,
    /gần|gan|near/i,
    /xa|far/i
  ];
  
  for (const pattern of locationPatterns) {
    if (pattern.test(desc)) {
      conditions.location_required = true;
      conditions.location_critical = true;
      console.log(`[LOCATION_PARSED] Location requirements found`);
      break;
    }
  }
  
  // Log summary of parsed conditions
  const criticalCount = Object.keys(conditions).filter(key => key.includes('_critical') && conditions[key]).length;
  const requiredCount = Object.keys(conditions).filter(key => key.includes('_required') && conditions[key]).length;
  
  console.log(`[JD_CONDITIONS] Parsed from description:`, {
    total_conditions: Object.keys(conditions).length,
    critical_criteria: criticalCount,
    required_criteria: requiredCount,
    conditions: conditions
  });
  
  return conditions;
}

/**
 * Check if user age matches JD age requirement
 * @param {string} birthDate - User birth date
 * @param {string} ageRange - JD age range (e.g., "18 ~ 35")
 * @returns {boolean} Whether age matches
 */
function checkAgeMatch(birthDate, ageRange) {
  if (!birthDate || !ageRange) return true;
  
  const userAge = calculateAge(birthDate);
  if (typeof userAge !== 'number') return true;
  
  const ageMatch = parseAgeRange(ageRange);
  if (!ageMatch || !ageMatch.minAge || !ageMatch.maxAge) return true;
  
  return userAge >= ageMatch.minAge && userAge <= ageMatch.maxAge;
}

/**
 * Test function để kiểm tra parsing với các JD mẫu
 * @param {string} description - Mô tả JD để test
 */
function testJDParsing(description) {
  console.log(`\n=== TESTING JD PARSING ===`);
  console.log(`Description: "${description}"`);
  const result = parseJDConditions(description);
  console.log(`Result:`, result);
  console.log(`=== END TEST ===\n`);
  return result;
}

/**
 * Tính ngày kết thúc hợp đồng dựa trên entryDate và duration
 * @param {string} entryDate - Ngày bắt đầu hợp đồng
 * @param {string} duration - Thời gian hợp đồng (vd: "3 năm", "6 tháng")
 * @returns {Date|null} Ngày kết thúc hợp đồng
 */
function calculateContractEndDate(entryDate, duration) {
  const start = parseEntryDate(entryDate);
  if (!start) return null;

  let years = 0, months = 0;
  const durLower = duration.toLowerCase();
  const yearMatch = durLower.match(/(\d+)\s*(năm|year|years)/);
  const monthMatch = durLower.match(/(\d+)\s*(tháng|month|months)/);

  if (yearMatch) years = parseInt(yearMatch[1], 10);
  if (monthMatch) months = parseInt(monthMatch[1], 10);

  const end = new Date(start);
  end.setFullYear(end.getFullYear() + years);
  end.setMonth(end.getMonth() + months);

  return end;
}


// ============================================
// GROUP MAPPING FUNCTIONS
// ============================================

/**
 * Tìm group phù hợp từ visa_type của JD
 * @param {string} jdVisaType - Loại visa của JD
 * @param {Array} jobGroups - Danh sách các nhóm ngành
 * @returns {Object} Kết quả mapping với group, score, matched
 */
function getJDGroupFromVisaType(jdVisaType, jobGroups) {
  const jdNorm = normalize(jdVisaType || "");
  let best = { group: null, score: 0, matched: null };

  for (const group of jobGroups) {
    const candidates = [
      normalize(group.group_vi || ""),
      normalize(group.group_en || ""),
      normalize(group.group_ja || ""),
    ].filter(Boolean);

    for (const cand of candidates) {
      const sim = stringSimilarity.compareTwoStrings(jdNorm, cand);
      if (sim > best.score) {
        best = { group: group.group_vi, score: sim, matched: cand };
      }
    }
  }
  return best;
}

/**
 * AI tự động phân tích và xác định nhóm ngành phù hợp
 * @param {Object} jdDetail - Chi tiết JD
 * @param {Array} jobGroups - Danh sách các nhóm ngành
 * @returns {Promise<Object>} Kết quả mapping với group, score, matched
 */
async function analyzeJobGroupWithAI(jdDetail, jobGroups) {
  try {
    // Tạo danh sách các nhóm ngành có sẵn
    const availableGroups = jobGroups.map(group => ({
      name: group.group_vi,
      description: group.group_en || group.group_ja || group.group_vi,
      jobs: (group.jobs || []).map(job => job.vi).join(', ')
    }));

    // Tạo prompt cho AI
    const prompt = `Bạn là chuyên gia phân loại công việc. Hãy phân tích thông tin công việc sau và chọn nhóm ngành phù hợp nhất.

THÔNG TIN CÔNG VIỆC:
- Tên công việc: ${jdDetail.job_name || 'N/A'}
- Loại visa: ${jdDetail.visa_type || 'N/A'}
- Mô tả công việc: ${(jdDetail.job_description || '').substring(0, 500)}...
- Công ty: ${jdDetail.company_name || 'N/A'}
- Ngành nghề: ${jdDetail.industry || 'N/A'}

CÁC NHÓM NGÀNH CÓ SẴN:
${availableGroups.map((group, index) => 
  `${index + 1}. ${group.name} (${group.description})
     Các công việc: ${group.jobs}`
).join('\n\n')}

Hãy phân tích và trả về kết quả theo format JSON:
{
  "group_name": "Tên nhóm ngành phù hợp nhất",
  "confidence": 0.95,
  "reasoning": "Lý do tại sao chọn nhóm này",
  "matched_keywords": ["từ khóa", "liên quan"]
}

Chỉ trả về JSON, không có text khác.`;

    const response = await aiAnalysisService.callAI(prompt);
    const result = parseAIResponse(response, 'analyzeJobGroupWithAI');
    
    // Tìm group tương ứng trong database
    const matchedGroup = jobGroups.find(g => 
      normalize(g.group_vi) === normalize(result.group_name)
    );
    
    if (matchedGroup) {
      return {
        group: matchedGroup.group_vi,
        score: result.confidence || 0.8,
        matched: result.group_name,
        reasoning: result.reasoning,
        keywords: result.matched_keywords || []
      };
    } else {
      // Nếu không tìm thấy group chính xác, tìm group tương tự
      let bestMatch = { group: null, score: 0, matched: null };
      for (const group of jobGroups) {
        const similarity = stringSimilarity.compareTwoStrings(
          normalize(result.group_name), 
          normalize(group.group_vi)
        );
        if (similarity > bestMatch.score) {
          bestMatch = {
            group: group.group_vi,
            score: similarity * (result.confidence || 0.8),
            matched: result.group_name,
            reasoning: result.reasoning,
            keywords: result.matched_keywords || []
          };
        }
      }
      return bestMatch;
    }
  } catch (error) {
    console.error('Error in AI job group analysis:', error);
    throw error;
  }
}

/**
 * AI phân tích job title của user để xác định nhóm ngành
 * @param {string} jobTitle - Chức danh công việc của user
 * @param {Array} jobGroups - Danh sách các nhóm ngành
 * @param {Object} jdDetail - Chi tiết JD để context
 * @returns {Promise<Object>} Kết quả mapping với group, score, matched
 */
async function analyzeUserJobGroupWithAI(jobTitle, jobGroups, jdDetail) {
  try {
    // Tạo danh sách các nhóm ngành có sẵn
    const availableGroups = jobGroups.map(group => ({
      name: group.group_vi,
      description: group.group_en || group.group_ja || group.group_vi,
      jobs: (group.jobs || []).map(job => job.vi).join(', ')
    }));

    // Tạo prompt cho AI
    const prompt = `Bạn là chuyên gia phân loại công việc. Hãy phân tích chức danh công việc của ứng viên và xác định nhóm ngành phù hợp.

THÔNG TIN ỨNG VIÊN:
- Chức danh công việc: ${jobTitle}

CONTEXT CÔNG VIỆC ĐANG TUYỂN:
- Tên công việc: ${jdDetail.job_name || 'N/A'}
- Mô tả công việc: ${(jdDetail.job_description || '').substring(0, 300)}...

CÁC NHÓM NGÀNH CÓ SẴN:
${availableGroups.map((group, index) => 
  `${index + 1}. ${group.name} (${group.description})
     Các công việc: ${group.jobs}`
).join('\n\n')}

Hãy phân tích và trả về kết quả theo format JSON:
{
  "group_name": "Tên nhóm ngành phù hợp nhất",
  "confidence": 0.85,
  "reasoning": "Lý do tại sao chọn nhóm này",
  "is_same_group": true
}

Chỉ trả về JSON, không có text khác.`;

    const response = await aiAnalysisService.callAI(prompt);
    const result = parseAIResponse(response, 'analyzeUserJobGroupWithAI');
    
    // Tìm group tương ứng trong database
    const matchedGroup = jobGroups.find(g => 
      normalize(g.group_vi) === normalize(result.group_name)
    );
    
    if (matchedGroup) {
      return {
        group: matchedGroup.group_vi,
        score: result.confidence || 0.8,
        matched: result.group_name,
        reasoning: result.reasoning,
        isSameGroup: result.is_same_group || false
      };
    } else {
      // Nếu không tìm thấy group chính xác, tìm group tương tự
      let bestMatch = { group: null, score: 0, matched: null };
      for (const group of jobGroups) {
        const similarity = stringSimilarity.compareTwoStrings(
          normalize(result.group_name), 
          normalize(group.group_vi)
        );
        if (similarity > bestMatch.score) {
          bestMatch = {
            group: group.group_vi,
            score: similarity * (result.confidence || 0.8),
            matched: result.group_name,
            reasoning: result.reasoning,
            isSameGroup: result.is_same_group || false
          };
        }
      }
      return bestMatch;
    }
  } catch (error) {
    console.error('Error in AI user job group analysis:', error);
    throw error;
  }
}

/**
 * Tìm group phù hợp từ job description
 * @param {string} jobDescription - Mô tả công việc
 * @param {Array} jobGroups - Danh sách các nhóm ngành
 * @returns {Object} Kết quả mapping với group, score, matched
 */
function findGroupByDescription(jobDescription, jobGroups) {
  const descNorm = normalize(jobDescription || "");
  let best = { group: null, score: 0, matched: null };

  // Từ khóa mapping cho các công việc phổ biến
  const jobKeywords = {
    // Thực phẩm
    'đầu bếp': 'Thực phẩm',
    'cook': 'Thực phẩm', 
    'chef': 'Thực phẩm',
    'nấu ăn': 'Thực phẩm',
    'chế biến thực phẩm': 'Thực phẩm',
    'sản xuất thực phẩm': 'Thực phẩm',
    'food': 'Thực phẩm',
    'restaurant': 'Thực phẩm',
    'nhà hàng': 'Thực phẩm',
    
    // Xây dựng
    'xây dựng': 'Xây dựng',
    'construction': 'Xây dựng',
    'thợ xây': 'Xây dựng',
    'thợ hồ': 'Xây dựng',
    'thợ sắt': 'Xây dựng',
    'thợ điện': 'Xây dựng',
    'thợ nước': 'Xây dựng',
    'kỹ sư xây dựng': 'Xây dựng',
    
    // Cơ khí
    'cơ khí': 'Cơ khí',
    'mechanical': 'Cơ khí',
    'thợ máy': 'Cơ khí',
    'thợ tiện': 'Cơ khí',
    'thợ phay': 'Cơ khí',
    'thợ hàn': 'Cơ khí',
    'welding': 'Cơ khí',
    'kỹ sư cơ khí': 'Cơ khí',
    
    // Điện tử
    'điện tử': 'Điện tử',
    'electronics': 'Điện tử',
    'thợ điện tử': 'Điện tử',
    'lắp ráp điện tử': 'Điện tử',
    'sản xuất điện tử': 'Điện tử',
    'kỹ sư điện tử': 'Điện tử',
    
    // Dệt may
    'dệt may': 'Dệt may',
    'textile': 'Dệt may',
    'thợ may': 'Dệt may',
    'thợ dệt': 'Dệt may',
    'sản xuất dệt may': 'Dệt may',
    'garment': 'Dệt may',
    
    // Nông nghiệp
    'nông nghiệp': 'Nông nghiệp',
    'agriculture': 'Nông nghiệp',
    'trồng trọt': 'Nông nghiệp',
    'chăn nuôi': 'Nông nghiệp',
    'thủy sản': 'Nông nghiệp',
    'farming': 'Nông nghiệp',
    
    // Dịch vụ
    'dịch vụ': 'Dịch vụ',
    'service': 'Dịch vụ',
    'bán hàng': 'Dịch vụ',
    'sales': 'Dịch vụ',
    'khách sạn': 'Dịch vụ',
    'hotel': 'Dịch vụ',
    'chăm sóc': 'Dịch vụ',
    'care': 'Dịch vụ'
  };

  // Kiểm tra từ khóa trực tiếp trước
  for (const [keyword, groupName] of Object.entries(jobKeywords)) {
    if (descNorm.includes(normalize(keyword))) {
      // Tìm group tương ứng
      const targetGroup = jobGroups.find(g => normalize(g.group_vi) === normalize(groupName));
      if (targetGroup) {
        best = { 
          group: targetGroup.group_vi, 
          score: 0.9, // Điểm cao cho keyword matching
          matched: keyword 
        };
        console.log(`[FIND_GROUP_BY_DESC] Keyword match: "${keyword}" -> "${groupName}"`);
        break;
      }
    }
  }

  // Nếu không tìm thấy keyword, dùng similarity matching
  if (best.score < 0.5) {
    for (const group of jobGroups) {
      // Check group names
      const groupCandidates = [
        normalize(group.group_vi || ""),
        normalize(group.group_en || ""),
        normalize(group.group_ja || ""),
      ].filter(Boolean);

      for (const groupCand of groupCandidates) {
        const sim = stringSimilarity.compareTwoStrings(descNorm, groupCand);
        if (sim > best.score) {
          best = { group: group.group_vi, score: sim, matched: groupCand };
        }
      }

      // Check individual jobs in the group
      (group.jobs || []).forEach((job) => {
        const jobCandidates = [
          normalize(job.vi || ""),
          normalize(job.en || ""),
          normalize(job.ja || ""),
        ].filter(Boolean);

        for (const jobCand of jobCandidates) {
          const sim = stringSimilarity.compareTwoStrings(descNorm, jobCand);
          if (sim > best.score) {
            best = { group: group.group_vi, score: sim, matched: jobCand };
          }
        }
      });
    }
  }
  
  console.log(`[FIND_GROUP_BY_DESC] Best match: "${best.group}" (score=${best.score.toFixed(2)})`);
  return best;
}



/**
 * Map job title của user sang group phù hợp
 * @param {string} jobTitle - Chức danh công việc của user
 * @param {Array} jobGroups - Danh sách các nhóm ngành
 * @param {string} jdDescription - Mô tả JD để matching tốt hơn
 * @returns {Object} Kết quả mapping với group, score, matched
 */
function mapUserJobToGroup(jobTitle, jobGroups, jdDescription = '') {
  const jobNorm = normalize(jobTitle);
  const jdDescNorm = normalize(jdDescription);
  let best = { group: null, score: 0, matched: null };

  for (const group of jobGroups) {
    // Check group name similarity with JD description
    const groupCandidates = [
      normalize(group.group_vi || ""),
      normalize(group.group_en || ""),
      normalize(group.group_ja || ""),
    ].filter(Boolean);

    let groupScore = 0;
    for (const groupCand of groupCandidates) {
      const sim = stringSimilarity.compareTwoStrings(jdDescNorm, groupCand);
      if (sim > groupScore) {
        groupScore = sim;
      }
    }

    // Check individual jobs
    (group.jobs || []).forEach((job) => {
      const candidates = [
        normalize(job.vi || ""),
        normalize(job.en || ""),
        normalize(job.ja || ""),
      ].filter(Boolean);

      for (const cand of candidates) {
        const sim = stringSimilarity.compareTwoStrings(jobNorm, cand);
        
        // Boost score if group matches JD description
        const boostedScore = sim + (groupScore * 0.3);
        
        if (boostedScore > best.score) {
          best = { 
            group: group.group_vi, 
            score: boostedScore, 
            matched: cand,
            groupMatch: groupScore > 0.3
          };
        }
      }
    });
  }
  
  console.log(`[JOB_MAPPING] "${jobTitle}" -> group="${best.group}" (score=${best.score.toFixed(2)}, groupMatch=${best.groupMatch})`);
  return best;
}

// ============================================
// MAIN MATCHING FUNCTION
// ============================================

/**
 * Tìm kiếm và đánh giá độ phù hợp giữa users và JD
 * @param {string} jdId - ID của Job Description
 * @param {string|null} filePath - Đường dẫn file chứa danh sách users (optional)
 * @param {number} batchSize - Kích thước batch xử lý
 * @param {number} concurrency - Số lượng concurrent requests
 * @returns {Promise<Array>} Danh sách users phù hợp đã sắp xếp theo điểm
 */
async function matchUsersWithJD(
  jdId,
  filePath = null,
  batchSize = 50, // Tăng batch size để xử lý nhiều user cùng lúc
  concurrency = 5  // Tăng concurrency để xử lý song song nhiều hơn
) {
  console.log(`[matchUsersWithJD] Starting matching process for JD id=${jdId}`);
  console.time(`[matchUsersWithJD:${jdId}]`);

  // 1. Load Job Description
  const jd = await JD.findById(jdId);
  if (!jd) throw new Error("Không tìm thấy JD");
  
  let jdDetail;
  try {
    jdDetail = await getJDById(jdId);
    if (!jdDetail) {
      console.warn(`[matchUsersWithJD] JD detail not found, using basic JD data`);
      jdDetail = jd;
    }
  } catch (error) {
    console.warn(`[matchUsersWithJD] Error loading JD detail: ${error.message}, using basic JD data`);
    jdDetail = jd;
  }
  
  console.log(
    `[matchUsersWithJD] JD loaded: ${jd._id} - visa_type="${jdDetail.visa_type || 'N/A'}"`
  );

  // 2. Load job groups from database
  let jobGroups;
  try {
    jobGroups = await JobGroup.find().lean();
    console.log(`[matchUsersWithJD] Loaded ${jobGroups.length} job groups`);
  } catch (error) {
    console.error(`[matchUsersWithJD] Error loading job groups: ${error.message}`);
    throw new Error("Không thể tải danh sách nhóm ngành: " + error.message);
  }

  // 3. AI tự động phân tích và xác định nhóm ngành
  let jdGroupResult = { group: null, score: 0, matched: null };
  
  try {
    // AI phân tích để xác định nhóm ngành với error handling cải thiện
    jdGroupResult = await analyzeJobGroupWithAI(jdDetail, jobGroups);
    console.log(`[matchUsersWithJD] AI phân tích nhóm ngành: "${jdGroupResult.group}" (score=${jdGroupResult.score.toFixed(2)})`);
    if (jdGroupResult.reasoning) {
      console.log(`[AI_REASONING] ${jdGroupResult.reasoning}`);
    }
    if (jdGroupResult.keywords && jdGroupResult.keywords.length > 0) {
      console.log(`[AI_KEYWORDS] ${jdGroupResult.keywords.join(', ')}`);
    }
  } catch (aiError) {
    console.warn(`[matchUsersWithJD] AI analysis failed: ${aiError.message}, using fallback`);
    
    // Fallback: sử dụng logic cũ nếu AI thất bại
    try {
      if (jdDetail.job_name) {
        jdGroupResult = findGroupByDescription(jdDetail.job_name, jobGroups);
        console.log(`[FALLBACK] Using job_name: "${jdDetail.job_name}" -> group="${jdGroupResult.group}"`);
      } else if (jdDetail.visa_type) {
        jdGroupResult = getJDGroupFromVisaType(jdDetail.visa_type, jobGroups);
        console.log(`[FALLBACK] Using visa_type: "${jdDetail.visa_type}" -> group="${jdGroupResult.group}"`);
      } else if (jdDetail.job_description) {
        jdGroupResult = findGroupByDescription(jdDetail.job_description, jobGroups);
        console.log(`[FALLBACK] Using job_description -> group="${jdGroupResult.group}"`);
      }
    } catch (fallbackError) {
      console.error(`[FALLBACK_ERROR] Fallback analysis also failed: ${fallbackError.message}`);
      jdGroupResult = { group: null, score: 0, matched: null };
    }
  }
  
  if (!jdGroupResult.group) {
    console.warn(`[matchUsersWithJD] Không tìm thấy nhóm ngành phù hợp cho job_name: "${jdDetail.job_name || 'N/A'}", visa_type: "${jdDetail.visa_type || 'N/A'}"`);
    console.warn(`[matchUsersWithJD] No suitable group found, will search all users`);
  }
  
  console.log(
    `[matchUsersWithJD] JD job_name="${jdDetail.job_name || 'N/A'}" -> group="${jdGroupResult.group}" (score=${jdGroupResult.score.toFixed(2)})`
  );

  // Initialize tracking variables
  const matchedUsers = [];
  const matchedUserIds = new Set();
  const limit = pLimit(concurrency);
  let totalProcessed = 0;
  let totalMatched = 0;
  let batchIndex = 0;
  let aiRequestCount = 0;
  const maxAIRequestsPerMinute = 30; // Tăng số request AI để xử lý nhanh hơn
  const minCandidatesRequired = 20; // Tăng số ứng viên tối thiểu để tìm đủ candidates
  
  // Progress tracking
  let totalUsers = 0;
  let currentPhase = 'phase1';
  let phase1Completed = false;

  /**
   * Tạo progress information
   */
  function getProgressInfo() {
    const progress = totalUsers > 0 ? Math.round((totalProcessed / totalUsers) * 100) : 0;
    return {
      phase: currentPhase,
      phaseName: currentPhase === 'phase1' ? 'Tìm kiếm trong nhóm ngành' : 'Mở rộng tìm kiếm',
      totalUsers,
      processed: totalProcessed,
      matched: totalMatched,
      progress,
      aiRequests: aiRequestCount,
      batchIndex,
      phase1Completed
    };
  }

  /**
   * Process a batch of users for matching
   * @param {Array} usersArray - Array of users to process
   * @param {boolean} strictGroupMatching - If true, only match within same group
   */
  async function processBatch(usersArray, strictGroupMatching = true) {
    batchIndex++;
    console.log(`[Batch #${batchIndex}] Processing ${usersArray.length} users (strictGroup=${strictGroupMatching})`);
    let matchedThisBatch = 0;
    
    // Update current phase
    currentPhase = strictGroupMatching ? 'phase1' : 'phase2';

    for (const user of usersArray) {
      totalProcessed++;
      const jobTitle = user.jobTitle || "";
      if (!jobTitle) continue;

      // Sử dụng AI để matching user job với group (với error handling cải thiện)
      let userGroupResult;
      try {
        userGroupResult = await analyzeUserJobGroupWithAI(jobTitle, jobGroups, jdDetail);
      } catch (aiError) {
        console.warn(`[USER_GROUP_AI] AI analysis failed for user ${user._id}: ${aiError.message}, using fallback`);
        try {
          userGroupResult = mapUserJobToGroup(jobTitle, jobGroups, jdDetail.job_description || '');
        } catch (fallbackError) {
          console.error(`[USER_GROUP_FALLBACK] Fallback also failed for user ${user._id}: ${fallbackError.message}`);
          userGroupResult = { group: null, score: 0, matched: null };
        }
      }

      // Process all users but mark group match status
      // Phase 1: Process all users, mark groupMatch status
      // Phase 2: Process all users with flexible matching
      let isEligible = true;
      let groupMatch = false;
      
      if (strictGroupMatching) {
        // Phase 1: Check if user belongs to same group as JD
        groupMatch = userGroupResult.group &&
        normalize(userGroupResult.group) === normalize(jdGroupResult.group);
        
        // Nếu AI đã xác định isSameGroup, ưu tiên sử dụng thông tin đó
        if (userGroupResult.isSameGroup !== undefined) {
          groupMatch = userGroupResult.isSameGroup;
        }
        
        console.log(`[GROUP_CHECK] User ${user._id}: groupMatch=${groupMatch}, userGroup="${userGroupResult.group}", jdGroup="${jdGroupResult.group}"`);
        if (userGroupResult.reasoning) {
          console.log(`[USER_AI_REASONING] ${userGroupResult.reasoning}`);
        }
      } else {
        // Phase 2: More flexible matching
        groupMatch = userGroupResult.group && userGroupResult.score > 0.3;
        isEligible = userGroupResult.group && userGroupResult.score > 0.3;
      }

      if (!isEligible) continue;

      // AI will evaluate all JD conditions automatically
      // No need for manual filtering as AI handles all requirements

      // Check if contract expires within 1 year
      let isValidContract = true;
      let endDate = null;
      let diffYears = null;

      if (user.entryDate && user.contractDuration) {
        endDate = calculateContractEndDate(
          user.entryDate,
          user.contractDuration
        );
        if (endDate) {
          diffYears = (endDate - new Date()) / (1000 * 60 * 60 * 24 * 365);
          // Only include users with contracts expiring within 1 year
          isValidContract = diffYears <= 1;
        }
      }

      if (isValidContract) {
        matchedThisBatch++;
        totalMatched++;
        if (!matchedUserIds.has(user._id)) {
          try {
            // Check rate limit before making AI request
            if (aiRequestCount >= maxAIRequestsPerMinute) {
              console.log(`[RATE_LIMIT] Reached ${maxAIRequestsPerMinute} AI requests, using fallback scoring`);
              throw new Error('Rate limit reached, using fallback');
            }

            // Add minimal delay between AI requests to avoid rate limiting
            if (aiRequestCount > 0) {
              const delay = Math.random() * 500 + 200; // 200-700ms random delay (giảm từ 1-3s)
              console.log(`[AI_DELAY] Waiting ${delay.toFixed(0)}ms before next AI request...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }

            aiRequestCount++;
            
            // Calculate AI match score
            const aiMatchScore = await calculateAIMatchScore(
              jd.original_text || jd.text || '', 
              user, 
              jdDetail
            );
            
            // Apply group match bonus (10% boost for same group)
            const finalScore = groupMatch ? Math.min(1.0, aiMatchScore + 0.1) : aiMatchScore;
            
            // STRICT FILTERING: Include candidates with good AI score regardless of group match
            if (finalScore > 0.5) {
            matchedUsers.push({
              ...user,
              matchedGroup: userGroupResult.group,
                matchScore: finalScore,
                originalAIScore: aiMatchScore, // Keep original AI score for reference
                groupMatchBonus: groupMatch ? 0.1 : 0, // Track the bonus applied
              matchedCandidate: userGroupResult.matched,
              contractEndDate: endDate,
              remainingYears: diffYears?.toFixed(2),
                matchingPhase: strictGroupMatching ? 'phase1' : 'phase2',
                groupMatch: groupMatch
            });
            matchedUserIds.add(user._id);
              console.log(`[STRICT_FILTER] User ${user._id} accepted by AI: finalScore=${finalScore.toFixed(2)} (original=${aiMatchScore.toFixed(2)}, groupMatch=${groupMatch}, bonus=${groupMatch ? 0.1 : 0})`);
            } else {
              console.log(`[STRICT_FILTER] User ${user._id} rejected by AI: score=${aiMatchScore.toFixed(2)} (<50%)`);
            }
            
            console.log(
              `[MATCH] user=${user._id} jobTitle="${jobTitle}" -> group="${userGroupResult.group}" AI_score=${aiMatchScore?.toFixed(2)} (AI_requests=${aiRequestCount})`
            );
          } catch (aiError) {
            console.error(`[AI_ERROR] user=${user._id}:`, aiError.message);
            
            // Enhanced fallback scoring with strict filtering
            const fallbackResult = calculateFallbackScore(user, jdDetail, userGroupResult.score);
            
            // Apply group match bonus (10% boost for same group)
            const finalFallbackScore = groupMatch ? Math.min(1.0, fallbackResult.score + 0.1) : fallbackResult.score;
            
            // Debug logging for high-score users
            if (finalFallbackScore > 0.8) {
              console.log(`[DEBUG_HIGH_SCORE] User ${user._id}: score=${finalFallbackScore.toFixed(2)}, critical=${fallbackResult.allCriticalMatched}, criteria=${fallbackResult.criticalMatched}/${fallbackResult.criticalCriteria}`);
            }
            
            // STRICT MAIN CRITERIA: Only accept if main criteria (gender + age) are met + score > 50%
            if (fallbackResult.allCriticalMatched && finalFallbackScore > 0.5) {
            matchedUsers.push({
              ...user,
              matchedGroup: userGroupResult.group,
                matchScore: finalFallbackScore,
                originalFallbackScore: fallbackResult.score, // Keep original fallback score for reference
                groupMatchBonus: groupMatch ? 0.1 : 0, // Track the bonus applied
              matchedCandidate: userGroupResult.matched,
              contractEndDate: endDate,
              remainingYears: diffYears?.toFixed(2),
                aiFallback: true, // Flag to indicate this used fallback scoring
                matchingPhase: strictGroupMatching ? 'phase1' : 'phase2',
                groupMatch: groupMatch,
                criteriaResults: fallbackResult.criteriaResults,
                criticalCriteria: fallbackResult.criticalCriteria,
                criticalMatched: fallbackResult.criticalMatched
            });
            matchedUserIds.add(user._id);
              console.log(`[MAIN_CRITERIA_FILTER] User ${user._id} accepted: main_criteria=${fallbackResult.allCriticalMatched}, finalScore=${finalFallbackScore.toFixed(2)} (original=${fallbackResult.score.toFixed(2)}, groupMatch=${groupMatch}, bonus=${groupMatch ? 0.1 : 0})`);
            } else {
              const reason = !fallbackResult.allCriticalMatched ? 'main_criteria_failed' : 'score_too_low';
              console.log(`[MAIN_CRITERIA_FILTER] User ${user._id} rejected: reason=${reason}, main_criteria=${fallbackResult.allCriticalMatched}, score=${fallbackResult.score.toFixed(2)}`);
            }
            
            console.log(
              `[FALLBACK] user=${user._id} jobTitle="${jobTitle}" -> group="${userGroupResult.group}" fallback_score=${fallbackResult?.score?.toFixed(2)}`
            );
            
            // Special debug for specific user
            if (user._id === '68c0d79debc4c99dfa670667') {
              console.log(`[DEBUG_SPECIFIC_USER] User 68c0d79debc4c99dfa670667:`, {
                score: fallbackResult.score,
                allCriticalMatched: fallbackResult.allCriticalMatched,
                criticalMatched: fallbackResult.criticalMatched,
                criticalCriteria: fallbackResult.criticalCriteria,
                willBeAccepted: (fallbackResult.score > 0.8) || (fallbackResult.allCriticalMatched && fallbackResult.score > 0.5)
              });
            }
          }
        }
      }
    }

    console.log(`[Batch #${batchIndex}] completed - matched=${matchedThisBatch} users`);
  }

  // 4. Process users from file or database
  if (filePath) {
    const rl = readline.createInterface({
      input: fs.createReadStream(filePath),
      crlfDelay: Infinity,
    });

    let buffer = [];
    for await (const line of rl) {
      const lineTrim = String(line || "").trim();
      if (lineTrim) buffer.push(lineTrim);
      if (buffer.length >= batchSize) {
        await processBatch(buffer.map((t) => ({ jobTitle: t, _id: t })));
        buffer = [];
      }
    }
    if (buffer.length > 0)
      await processBatch(buffer.map((t) => ({ jobTitle: t, _id: t })));
  } else {
    // Process users from database with 2-phase approach
    try {
    const total = await User.countDocuments();
      totalUsers = total;
      console.log(`[matchUsersWithJD] Will process ${total} users from database`);

      // Phase 1: Process with strict group matching
      console.log(`[matchUsersWithJD] Phase 1: Strict group matching`);
      const promises1 = [];
      for (let skip = 0; skip < total; skip += batchSize) {
        const promise = limit(async () => {
          try {
            const users = await User.find().skip(skip).limit(batchSize).lean();
            if (!users || users.length === 0) return;
            await processBatch(users, true); // Strict group matching
          } catch (batchError) {
            console.error(`[matchUsersWithJD] Error processing batch at skip=${skip}:`, batchError.message);
          }
        });
        promises1.push(promise);
      }
      await Promise.all(promises1);

      // Check if we have enough candidates
      phase1Completed = true;
      console.log(`[matchUsersWithJD] Phase 1 completed. Found ${matchedUsers.length} candidates`);
      
      // Early exit if we have enough high-quality candidates
      if (matchedUsers.length >= minCandidatesRequired * 2) {
        console.log(`[matchUsersWithJD] Early exit: Found ${matchedUsers.length} candidates (≥${minCandidatesRequired * 2})`);
        matchedUsers.sort((a, b) => b.matchScore - a.matchScore);
        return {
          candidates: matchedUsers,
          progress: getProgressInfo(),
          summary: {
            totalProcessed,
            totalMatched: matchedUsers.length,
            phase1Completed,
            finalPhase: currentPhase
          }
        };
      }
      
      if (matchedUsers.length < minCandidatesRequired && jdGroupResult.group) {
        console.log(`[matchUsersWithJD] Phase 2: Expanding search to all users (found ${matchedUsers.length} < ${minCandidatesRequired})`);
        
        // Phase 2: Process with flexible matching
        const promises2 = [];
    for (let skip = 0; skip < total; skip += batchSize) {
      const promise = limit(async () => {
            try {
        const users = await User.find().skip(skip).limit(batchSize).lean();
        if (!users || users.length === 0) return;
              await processBatch(users, false); // Flexible matching
            } catch (batchError) {
              console.error(`[matchUsersWithJD] Error processing batch at skip=${skip}:`, batchError.message);
            }
          });
          promises2.push(promise);
        }
        await Promise.all(promises2);
        
        console.log(`[matchUsersWithJD] Phase 2 completed. Total found: ${matchedUsers.length} candidates`);
      }
    } catch (error) {
      console.error(`[matchUsersWithJD] Error processing users from database:`, error.message);
      throw new Error("Không thể xử lý danh sách ứng viên: " + error.message);
    }
  }

  // 5. Sort results with priority for same industry group
  matchedUsers.sort((a, b) => {
    // First priority: Same group candidates
    const aSameGroup = a.groupMatch === true;
    const bSameGroup = b.groupMatch === true;
    
    if (aSameGroup && !bSameGroup) return -1; // a comes first
    if (!aSameGroup && bSameGroup) return 1;  // b comes first
    
    // Second priority: Match score (descending)
    return b.matchScore - a.matchScore;
  });
  
  // Log priority sorting results
  const sameGroupCount = matchedUsers.filter(u => u.groupMatch === true).length;
  const differentGroupCount = matchedUsers.filter(u => u.groupMatch !== true).length;
  console.log(`[PRIORITY_SORT] Sorted ${matchedUsers.length} candidates: ${sameGroupCount} same-group (priority), ${differentGroupCount} different-group`);

  // 6. Final validation: Ensure all candidates have score > 50%
  const validCandidates = matchedUsers.filter(user => user.matchScore && user.matchScore > 0.5);
  console.log(`[matchUsersWithJD] Final validation: ${validCandidates.length}/${matchedUsers.length} candidates with score >50%`);
  
  // Debug: Log any high-score users that were filtered out
  const highScoreFiltered = matchedUsers.filter(user => user.matchScore && user.matchScore > 0.8 && !validCandidates.includes(user));
  if (highScoreFiltered.length > 0) {
    console.log(`[DEBUG_FILTERED] High-score users filtered out:`, highScoreFiltered.map(u => `${u._id}:${u.matchScore.toFixed(2)}`));
  }

  // 6. Return results
  console.log(
    `[matchUsersWithJD] Completed. Processed=${totalProcessed}, Matched=${totalMatched}`
  );
  console.timeEnd(`[matchUsersWithJD:${jdId}]`);
  
  // Return results with progress info
  return {
    candidates: validCandidates,
    progress: getProgressInfo(),
    summary: {
      totalProcessed,
      totalMatched: validCandidates.length,
      originalMatched: matchedUsers.length,
      phase1Completed,
      finalPhase: currentPhase
    }
  };
}

module.exports = { matchUsersWithJD };
