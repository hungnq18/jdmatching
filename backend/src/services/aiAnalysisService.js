const axios = require('axios');
require('dotenv').config();

class AIAnalysisService {
  constructor() {
    // Có thể sử dụng OpenAI API hoặc các AI service khác
    this.apiKey = process.env.OPENAI_API_KEY || 'your-api-key-here';
    this.baseURL = 'https://api.openai.com/v1';
    
    console.log('🔑 OpenAI API Key loaded:', this.apiKey ? 'Yes' : 'No');
    if (!this.apiKey || this.apiKey === 'your-api-key-here') {
      console.error('❌ OpenAI API Key not found or invalid');
    }
  }

  /**
   * Phân tích JD từ text thô và trích xuất thông tin theo model
   * @param {string} jdText - Text của JD cần phân tích
   * @returns {Object} - Object chứa thông tin đã được phân tích
   */
  async analyzeJD(jdText) {
    try {
      const prompt = this.createAnalysisPrompt(jdText);
      const response = await this.callAI(prompt);
      return this.parseAIResponse(response);
    } catch (error) {
      console.error('Error analyzing JD:', error);
      throw new Error('Không thể phân tích JD: ' + error.message);
    }
  }

  /**
   * Tạo prompt cho AI để phân tích JD
   */
  createAnalysisPrompt(jdText) {
    return `
Bạn là một chuyên gia phân tích Job Description tiếng Việt. Hãy phân tích đoạn text JD sau và trích xuất thông tin theo đúng format JSON.

JD Text:
${jdText}

QUAN TRỌNG: 
- Phân tích kỹ từng từ, từng câu trong JD
- Tìm kiếm thông tin một cách chính xác
- Nếu không tìm thấy thông tin, để null (TRỪ title - phải có giá trị)
- Đảm bảo JSON hợp lệ, không có lỗi syntax
- title KHÔNG BAO GIỜ được để null

Hãy trích xuất các thông tin sau:

{
  "title": "Tiêu đề thông báo tuyển dụng (BẮT BUỘC - tìm trong dòng đầu hoặc tiêu đề chính, nếu không có thì dùng 'Job Description')",
  "company_name": "Tên công ty (tìm từ 'Công ty', 'Tập đoàn', 'Công ty cổ phần')",
  "company_website": "Website công ty (tìm URL hoặc link)",
  "company_description": "Mô tả công ty (tìm đoạn mô tả về công ty)",
  "location": "Địa điểm làm việc (tìm 'TP.', 'Tỉnh', 'Thành phố')",
  "visa_type": "Loại visa (tìm 'Thực tập sinh', 'Kỹ thuật viên', 'Kỹ sư', 'Lao động')",
  "industry": "Ngành nghề (tìm từ mô tả công việc chính)",
  "job_name": "Tên công việc cụ thể (tìm chức danh công việc)",
  "job_description": "Mô tả chi tiết công việc (tìm đoạn mô tả nhiệm vụ)",
  "recruitment_number_needed": "Số lượng cần tuyển (tìm số người cần tuyển)",
  "gender": "Giới tính yêu cầu (tìm 'Nam', 'Nữ', 'Nam/Nữ')",
  "age_range": "Độ tuổi (tìm 'tuổi', 'độ tuổi', format: min ~ max)",
  "education": "Trình độ học vấn (tìm 'Tốt nghiệp', 'Trình độ', 'Bằng cấp')",
  "skills_required": "Kỹ năng yêu cầu (tìm 'Kỹ năng', 'Tay nghề', 'Kinh nghiệm')",
  "hand_dominance": "Thuận tay (tìm 'Thuận tay', 'Tay phải', 'Tay trái')",
  "smoking": "Yêu cầu hút thuốc (tìm 'hút thuốc', 'không hút thuốc')",
  "marriage_status": "Tình trạng hôn nhân (tìm 'độc thân', 'đã kết hôn')",
  "vision": "Yêu cầu thị lực (tìm 'thị lực', 'mắt', 'nhìn')",
  "physical_strength": "Yêu cầu thể lực (tìm 'thể lực', 'sức khỏe', 'công việc nặng')",
  "special_requirements": "Yêu cầu đặc biệt (tìm 'Kiểm tra', 'Test', 'Thi tuyển')",
  "interview_method": "Hình thức thi tuyển (tìm 'Kiểm tra', 'Thi tuyển', 'Phỏng vấn')",
  "interview_date": "Ngày phỏng vấn (tìm ngày tháng năm, format: DD/MM/YYYY)",
  "entry_date": "Ngày nhập cảnh (tìm 'Tháng', 'năm', 'nhập cảnh')",
  "contract_duration": "Thời hạn hợp đồng (tìm 'năm', 'tháng', 'hợp đồng')",
  "training_period": "Thời gian đào tạo (tìm 'đào tạo', 'thực tập')",
  "training_allowance": "Trợ cấp đào tạo (tìm số tiền trợ cấp)",
  "hourly_wage": "Lương/giờ (tìm 'yên/h', 'đồng/h')",
  "monthly_salary_calculation": "Cách tính lương tháng (tìm cách tính)",
  "monthly_salary": "Lương tháng (tìm số tiền lương tháng)",
  "overtime_calculation": "Cách tính làm thêm (tìm 'làm thêm', 'tăng ca')",
  "total_expected_salary": "Tổng lương dự kiến (tìm tổng lương)",
  "net_salary_approx": "Số thực nhận (tìm 'thực nhận', 'net')",
  "housing_cost": "Tiền nhà (tìm 'tiền nhà', 'nhà ở')",
  "utilities_cost": "Tiền điện nước (tìm 'điện', 'nước', 'ga')",
  "food_cost": "Tiền ăn (tìm 'tiền ăn', 'ăn uống')",
  "insurance_and_tax": "Bảo hiểm và thuế (tìm 'bảo hiểm', 'thuế')",
  "working_hours": "Thời gian làm việc (tìm 'giờ', 'ca', 'thời gian')",
  "rest_days": "Ngày nghỉ (tìm 'nghỉ', 'ngày nghỉ')",
  "annual_working_hours": "Số giờ làm việc/năm (tìm số giờ)",
  "dormitory_info": "Thông tin KTX (tìm 'KTX', 'ký túc xá')"
}

QUY TẮC PHÂN TÍCH:
1. Đọc kỹ từng dòng, từng đoạn
2. Tìm kiếm từ khóa chính xác
3. Nếu không tìm thấy, để null
4. Đảm bảo JSON hợp lệ
5. Không thêm text ngoài JSON
6. Với interview_date: chuyển đổi về format DD/MM/YYYY (ví dụ: "16/09/2025")
7. Với các số: chuyển về dạng số nguyên (không có dấu phẩy, chấm)

JSON Response:
`;
  }

  /**
   * Gọi AI API với retry mechanism
   */
  async callAI(prompt, retries = 2, delay = 500) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // Validate API key
        if (!this.apiKey || this.apiKey === 'your-api-key-here') {
          throw new Error('OpenAI API Key chưa được cấu hình hoặc không hợp lệ');
        }

        // Validate prompt
        if (!prompt || prompt.trim().length === 0) {
          throw new Error('Prompt không được để trống');
        }

        console.log(`[AI] Attempt ${attempt}/${retries} - Calling OpenAI API`);

        const response = await axios.post(
          `${this.baseURL}/chat/completions`,
          {
            model: 'gpt-3.5-turbo',
            messages: [
              {
                role: 'system',
                content: 'Bạn là một chuyên gia phân tích Job Description. Trả về kết quả dưới dạng JSON hợp lệ.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            max_tokens: 50, // Giảm max_tokens để tăng tốc độ
            temperature: 0.1
          },
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 10000 // 10 seconds timeout để tăng tốc độ
          }
        );

        if (!response.data || !response.data.choices || !response.data.choices[0]) {
          throw new Error('Phản hồi từ AI API không hợp lệ');
        }

        console.log(`[AI] Success on attempt ${attempt}`);
        return response.data.choices[0].message.content;

      } catch (error) {
        console.error(`[AI] Attempt ${attempt} failed:`, error.response?.data || error.message);
        
        // Handle rate limit specifically
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'];
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : delay * Math.pow(2, attempt - 1);
          
          if (attempt < retries) {
            console.log(`[AI] Rate limit hit, waiting ${waitTime}ms before retry...`);
            await this.sleep(waitTime);
            continue;
          } else {
            throw new Error(`Đã vượt quá giới hạn API sau ${retries} lần thử. Vui lòng thử lại sau ${Math.ceil(waitTime / 1000)} giây.`);
          }
        }
        
        // Handle other errors
        if (error.code === 'ECONNABORTED') {
          if (attempt < retries) {
            console.log(`[AI] Timeout, retrying in ${delay}ms...`);
            await this.sleep(delay);
            continue;
          }
          throw new Error('AI API timeout - vui lòng thử lại sau');
        }
        
        if (error.response?.status === 401) {
          throw new Error('API Key không hợp lệ hoặc đã hết hạn');
        }
        
        // For other errors, retry if attempts remaining
        if (attempt < retries) {
          console.log(`[AI] Error, retrying in ${delay}ms...`);
          await this.sleep(delay);
          continue;
        }
        
        throw new Error('Lỗi khi gọi AI API: ' + (error.response?.data?.error?.message || error.message));
      }
    }
  }

  /**
   * Sleep utility function
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Parse date string từ AI response thành Date object
   */
  parseDateString(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') {
      return null;
    }

    try {
      // Loại bỏ khoảng trắng thừa
      const cleaned = dateStr.trim();
      
      // Các pattern phổ biến cho ngày tháng tiếng Việt
      const patterns = [
        // DD / MM / YYYY hoặc DD/MM/YYYY
        /^(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})$/,
        // DD - MM - YYYY hoặc DD-MM-YYYY  
        /^(\d{1,2})\s*-\s*(\d{1,2})\s*-\s*(\d{4})$/,
        // DD . MM . YYYY hoặc DD.MM.YYYY
        /^(\d{1,2})\s*\.\s*(\d{1,2})\s*\.\s*(\d{4})$/,
        // DD MM YYYY
        /^(\d{1,2})\s+(\d{1,2})\s+(\d{4})$/,
        // Ngày DD tháng MM năm YYYY
        /^ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(\d{4})$/i,
        // DD/MM/YYYY
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
        // YYYY-MM-DD (ISO format)
        /^(\d{4})-(\d{1,2})-(\d{1,2})$/
      ];

      for (const pattern of patterns) {
        const match = cleaned.match(pattern);
        if (match) {
          let day, month, year;
          
          if (pattern === patterns[6]) {
            // YYYY-MM-DD format
            [, year, month, day] = match;
          } else {
            // DD/MM/YYYY format
            [, day, month, year] = match;
          }

          // Tạo Date object (month - 1 vì Date constructor dùng 0-based month)
          const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          
          // Validate date
          if (date.getFullYear() == year && 
              date.getMonth() == month - 1 && 
              date.getDate() == day) {
            console.log(`[DATE_PARSE] Successfully parsed: ${cleaned} -> ${date.toISOString()}`);
            return date;
          }
        }
      }

      // Thử parse với Date constructor trực tiếp
      const directParse = new Date(cleaned);
      if (!isNaN(directParse.getTime())) {
        console.log(`[DATE_PARSE] Direct parse success: ${cleaned} -> ${directParse.toISOString()}`);
        return directParse;
      }

      console.log(`[DATE_PARSE] Failed to parse date: ${cleaned}`);
      return null;
    } catch (error) {
      console.error(`[DATE_PARSE] Error parsing date: ${dateStr}`, error);
      return null;
    }
  }

  /**
   * Parse response từ AI thành object
   */
  parseAIResponse(aiResponse) {
    try {
      // Loại bỏ markdown code block nếu có
      let jsonStr = aiResponse.trim();
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/```json\n?/, '').replace(/\n?```$/, '');
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```\n?/, '').replace(/\n?```$/, '');
      }

      // Fix common JSON issues
      jsonStr = this.fixJSONIssues(jsonStr);

      const parsed = JSON.parse(jsonStr);
      
      // Debug logging
      console.log('[AI_RESPONSE] Parsed data:', {
        title: parsed.title,
        company_name: parsed.company_name,
        hasTitle: !!parsed.title,
        hasCompanyName: !!parsed.company_name
      });
      
      // Validate và clean data
      return this.validateAndCleanData(parsed);
    } catch (error) {
      console.error('Error parsing AI response:', error);
      console.error('Raw AI response:', aiResponse);
      
      // Try to extract partial data
      try {
        const partialData = this.extractPartialData(aiResponse);
        if (partialData) {
          console.log('Using partial data extraction');
          return this.validateAndCleanData(partialData);
        }
      } catch (partialError) {
        console.error('Partial data extraction failed:', partialError);
      }
      
      throw new Error('Không thể parse kết quả từ AI: ' + error.message);
    }
  }

  /**
   * Fix common JSON issues
   */
  fixJSONIssues(jsonStr) {
    console.log('[JSON_FIX] Original JSON length:', jsonStr.length);
    
    // Fix unterminated strings
    jsonStr = jsonStr.replace(/"([^"]*?)\n([^"]*?)"/g, '"$1 $2"');
    
    // Fix missing quotes around values (more comprehensive)
    jsonStr = jsonStr.replace(/: ([^",}\]]+?)([,}\]])/g, (match, value, ending) => {
      // Don't quote if it's already a number, boolean, or null
      if (/^(null|true|false|\d+)$/.test(value.trim())) {
        return match;
      }
      return `: "${value}"${ending}`;
    });
    
    // Fix trailing commas
    jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');
    
    // Fix incomplete strings at the end
    if (jsonStr.includes('"dormitory_info": "Không')) {
      jsonStr = jsonStr.replace(/"dormitory_info": "Không[^"]*$/, '"dormitory_info": "Không có thông tin"');
    }
    
    // Fix common Vietnamese text issues
    jsonStr = jsonStr.replace(/"([^"]*?)\.\.\.([^"]*?)"/g, '"$1$2"');
    jsonStr = jsonStr.replace(/"([^"]*?)\s+"/g, '"$1"');
    
    // Fix incomplete JSON at the end
    if (!jsonStr.trim().endsWith('}')) {
      // Try to find the last complete field
      const lastCompleteField = jsonStr.lastIndexOf('",');
      if (lastCompleteField > 0) {
        jsonStr = jsonStr.substring(0, lastCompleteField + 1) + '}';
      } else {
        // If no complete field found, try to close the JSON
        jsonStr = jsonStr.replace(/[,\s]*$/, '}');
      }
    }
    
    console.log('[JSON_FIX] Fixed JSON length:', jsonStr.length);
    return jsonStr;
  }

  /**
   * Extract partial data when JSON parsing fails
   */
  extractPartialData(aiResponse) {
    try {
      console.log('[PARTIAL_EXTRACT] Starting partial data extraction');
      const data = {};
      
      // Try multiple extraction methods
      const methods = [
        // Method 1: Line by line extraction
        () => {
          const lines = aiResponse.split('\n');
          for (const line of lines) {
            const match = line.match(/"([^"]+)":\s*"([^"]*)"?/);
            if (match) {
              const key = match[1];
              let value = match[2] || '';
              data[key] = value.replace(/^"|"$/g, '');
            }
          }
        },
        
        // Method 2: Regex extraction for key-value pairs
        () => {
          const kvMatches = aiResponse.match(/"([^"]+)":\s*"([^"]*)"?/g);
          if (kvMatches) {
            kvMatches.forEach(match => {
              const kvMatch = match.match(/"([^"]+)":\s*"([^"]*)"?/);
              if (kvMatch) {
                const key = kvMatch[1];
                let value = kvMatch[2] || '';
                data[key] = value.replace(/^"|"$/g, '');
              }
            });
          }
        },
        
        // Method 3: Extract from incomplete JSON
        () => {
          // Try to find JSON-like structure
          const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const jsonStr = jsonMatch[0];
            // Try to fix and parse
            try {
              const fixed = this.fixJSONIssues(jsonStr);
              const parsed = JSON.parse(fixed);
              Object.assign(data, parsed);
            } catch (e) {
              // If still fails, extract manually
              const fields = jsonStr.match(/"([^"]+)":\s*"([^"]*)"?/g);
              if (fields) {
                fields.forEach(field => {
                  const fieldMatch = field.match(/"([^"]+)":\s*"([^"]*)"?/);
                  if (fieldMatch) {
                    const key = fieldMatch[1];
                    let value = fieldMatch[2] || '';
                    data[key] = value.replace(/^"|"$/g, '');
                  }
                });
              }
            }
          }
        }
      ];
      
      // Try each method
      methods.forEach((method, index) => {
        try {
          method();
          console.log(`[PARTIAL_EXTRACT] Method ${index + 1} extracted ${Object.keys(data).length} fields`);
        } catch (error) {
          console.log(`[PARTIAL_EXTRACT] Method ${index + 1} failed:`, error.message);
        }
      });
      
      console.log('[PARTIAL_EXTRACT] Final extracted fields:', Object.keys(data));
      return Object.keys(data).length > 0 ? data : null;
    } catch (error) {
      console.error('Partial extraction error:', error);
      return null;
    }
  }

  /**
   * Validate và clean data từ AI
   */
  validateAndCleanData(data) {
    console.log('[VALIDATE] Starting data validation');
    console.log('[VALIDATE] Input data:', {
      title: data.title,
      company_name: data.company_name,
      hasTitle: !!data.title,
      hasCompanyName: !!data.company_name
    });
    const cleaned = {};

    // Danh sách các field cần xử lý
    const fields = [
      'title', 'company_name', 'company_website', 'company_description',
      'location', 'visa_type', 'industry', 'job_name', 'job_description',
      'recruitment_number_needed', 'gender', 'age_range', 'education',
      'skills_required', 'hand_dominance', 'smoking', 'marriage_status',
      'vision', 'physical_strength', 'special_requirements', 'interview_method',
      'interview_date', 'entry_date', 'contract_duration', 'training_period',
      'training_allowance', 'hourly_wage', 'monthly_salary_calculation',
      'monthly_salary', 'overtime_calculation', 'total_expected_salary',
      'net_salary_approx', 'housing_cost', 'utilities_cost', 'food_cost',
      'insurance_and_tax', 'working_hours', 'rest_days', 'annual_working_hours',
      'dormitory_info'
    ];

    let validFields = 0;
    let totalFields = fields.length;

    fields.forEach(field => {
      const value = data[field];
      
      if (value === null || value === undefined || value === '') {
        // Đảm bảo field title luôn có giá trị mặc định (field bắt buộc duy nhất)
        if (field === 'title') {
          console.log('[VALIDATE] Setting default title: Job Description');
          cleaned[field] = 'Job Description';
          validFields++; // Đếm field bắt buộc
        } else {
          cleaned[field] = null;
        }
      } else if (Array.isArray(value)) {
        const filtered = value.filter(item => item && item.trim() !== '');
        cleaned[field] = filtered.length > 0 ? filtered : null;
        if (filtered.length > 0) validFields++;
      } else if (typeof value === 'string') {
        const trimmed = value.trim();
        
        // Xử lý đặc biệt cho interview_date
        if (field === 'interview_date') {
          cleaned[field] = this.parseDateString(trimmed);
        } else {
          cleaned[field] = trimmed || null;
        }
        
        if (trimmed) validFields++;
      } else if (field === 'recruitment_number_needed' || field === 'annual_working_hours') {
        // Xử lý số
        const num = parseInt(value);
        cleaned[field] = isNaN(num) ? null : num;
        if (!isNaN(num)) validFields++;
      } else {
        cleaned[field] = value;
        if (value) validFields++;
      }
    });

    // Tính confidence score
    const confidence = Math.round((validFields / totalFields) * 100);
    console.log(`[VALIDATE] Valid fields: ${validFields}/${totalFields} (${confidence}%)`);

    // Thêm metadata
    cleaned._analysis_metadata = {
      confidence_score: confidence,
      valid_fields: validFields,
      total_fields: totalFields,
      analysis_timestamp: new Date().toISOString()
    };

    console.log('[VALIDATE] Final cleaned data:', {
      title: cleaned.title,
      company_name: cleaned.company_name,
      hasTitle: !!cleaned.title,
      hasCompanyName: !!cleaned.company_name
    });

    return cleaned;
  }

  /**
   * Phân tích và trích xuất yêu cầu ứng viên từ JD
   * @param {string} jdText - Text của JD
   * @returns {Object} - Object chứa các yêu cầu đã được phân loại
   */
  async extractCandidateRequirements(jdText) {
    try {
      const prompt = this.createRequirementsPrompt(jdText);
      const response = await this.callAI(prompt);
      return this.parseRequirementsResponse(response);
    } catch (error) {
      console.error('Error extracting requirements:', error);
      throw new Error('Không thể trích xuất yêu cầu ứng viên: ' + error.message);
    }
  }

  /**
   * Tạo prompt để trích xuất yêu cầu ứng viên
   */
  createRequirementsPrompt(jdText) {
    return `
Bạn là chuyên gia phân tích yêu cầu ứng viên từ Job Description. Hãy phân tích JD sau và trích xuất các yêu cầu ứng viên phải có:

JD Text:
${jdText}

Hãy phân loại và trích xuất các yêu cầu theo format JSON:

{
  "basic_requirements": {
    "gender": "Giới tính yêu cầu",
    "age_range": "Độ tuổi yêu cầu",
    "education": "Trình độ học vấn",
    "experience": "Kinh nghiệm làm việc",
    "language": "Yêu cầu ngôn ngữ"
  },
  "physical_requirements": {
    "height": "Chiều cao yêu cầu",
    "weight": "Cân nặng yêu cầu", 
    "vision": "Yêu cầu thị lực",
    "physical_strength": "Yêu cầu thể lực",
    "health_condition": "Tình trạng sức khỏe"
  },
  "skills_requirements": {
    "technical_skills": ["Kỹ năng kỹ thuật cần có"],
    "soft_skills": ["Kỹ năng mềm cần có"],
    "certifications": ["Chứng chỉ cần có"],
    "tools_equipment": ["Công cụ, thiết bị cần biết sử dụng"]
  },
  "personal_requirements": {
    "marriage_status": "Tình trạng hôn nhân",
    "smoking": "Yêu cầu về hút thuốc",
    "hand_dominance": "Thuận tay",
    "personality_traits": ["Đặc điểm tính cách"],
    "work_attitude": "Thái độ làm việc"
  },
  "special_requirements": {
    "travel_ability": "Khả năng đi lại",
    "overtime_willingness": "Sẵn sàng làm thêm giờ",
    "shift_work": "Làm ca kíp",
    "other_conditions": ["Các điều kiện đặc biệt khác"]
  },
  "document_requirements": {
    "passport": "Yêu cầu hộ chiếu",
    "visa": "Yêu cầu visa",
    "medical_certificate": "Giấy khám sức khỏe",
    "criminal_record": "Lý lịch tư pháp",
    "other_documents": ["Các giấy tờ khác"]
  },
  "priority_level": {
    "must_have": ["Yêu cầu bắt buộc phải có"],
    "should_have": ["Yêu cầu nên có"],
    "nice_to_have": ["Yêu cầu có thì tốt"]
  }
}

Lưu ý:
1. Phân tích kỹ để xác định yêu cầu nào là bắt buộc, nên có, hoặc có thì tốt
2. Nếu không có thông tin, để null hoặc mảng rỗng
3. Ưu tiên độ chính xác trong việc phân loại yêu cầu
4. Chỉ trả về JSON, không có text thêm

JSON Response:
`;
  }

  /**
   * Parse response yêu cầu ứng viên
   */
  parseRequirementsResponse(aiResponse) {
    try {
      let jsonStr = aiResponse.trim();
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/```json\n?/, '').replace(/\n?```$/, '');
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```\n?/, '').replace(/\n?```$/, '');
      }

      return JSON.parse(jsonStr);
    } catch (error) {
      console.error('Error parsing requirements response:', error);
      console.error('Raw AI response:', aiResponse);
      throw new Error('Không thể parse yêu cầu ứng viên: ' + error.message);
    }
  }
}

module.exports = new AIAnalysisService();
