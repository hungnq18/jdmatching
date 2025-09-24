const User = require('../models/user');
const mongoose = require('mongoose');
const XLSX = require('xlsx');

/**
 * Service để lọc ứng viên còn 1 năm hợp đồng
 */
class ContractFilterService {
  
  /**
   * Tính ngày kết thúc hợp đồng dựa trên entryDate và duration
   * @param {string} entryDate - Ngày bắt đầu hợp đồng
   * @param {string} duration - Thời gian hợp đồng (vd: "3 năm", "6 tháng")
   * @returns {Date|null} Ngày kết thúc hợp đồng
   */
  calculateContractEndDate(entryDate, duration) {
    const start = this.parseEntryDate(entryDate);
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

  /**
   * Parse entry date từ string sang Date object
   * @param {string} entryDate - Ngày nhập cảnh (vd: "Tháng 7 năm 2026")
   * @returns {Date|null} Date object hoặc null nếu không parse được
   */
  parseEntryDate(entryDate) {
    if (!entryDate) return null;
    
    try {
      // Format: "Tháng 7 năm 2026" hoặc "7/2026" hoặc "2026-07"
      const dateStr = entryDate.toString().toLowerCase();
      
      // Pattern 1: "Tháng X năm YYYY"
      const monthYearMatch = dateStr.match(/tháng\s*(\d+)\s*năm\s*(\d{4})/);
      if (monthYearMatch) {
        const month = parseInt(monthYearMatch[1], 10) - 1; // JavaScript months are 0-based
        const year = parseInt(monthYearMatch[2], 10);
        return new Date(year, month, 1);
      }
      
      // Pattern 2: "X/YYYY" hoặc "X-YYYY"
      const slashMatch = dateStr.match(/(\d{1,2})[\/\-](\d{4})/);
      if (slashMatch) {
        const month = parseInt(slashMatch[1], 10) - 1;
        const year = parseInt(slashMatch[2], 10);
        return new Date(year, month, 1);
      }
      
      // Pattern 3: "YYYY-MM" hoặc "YYYY/MM"
      const isoMatch = dateStr.match(/(\d{4})[\/\-](\d{1,2})/);
      if (isoMatch) {
        const year = parseInt(isoMatch[1], 10);
        const month = parseInt(isoMatch[2], 10) - 1;
        return new Date(year, month, 1);
      }
      
      // Pattern 4: Try to parse as full date
      const fullDate = new Date(entryDate);
      if (!isNaN(fullDate.getTime())) {
        return fullDate;
      }
      
      return null;
    } catch (error) {
      console.error('Error parsing entry date:', entryDate, error);
      return null;
    }
  }

  /**
   * Lọc ứng viên còn 1 năm hợp đồng
   * @param {Object} options - Tùy chọn lọc
   * @param {number} options.maxYears - Số năm tối đa còn lại (mặc định: 1)
   * @param {number} options.minYears - Số năm tối thiểu còn lại (mặc định: 0)
   * @param {string} options.company - Lọc theo công ty
   * @param {string} options.jobTitle - Lọc theo chức vụ
   * @param {number} options.limit - Giới hạn số lượng kết quả
   * @param {number} options.skip - Bỏ qua số lượng kết quả
   * @returns {Promise<Object>} Kết quả lọc với danh sách ứng viên và thống kê
   */
  async filterUsersByContractExpiry(options = {}) {
    try {
      const {
        maxYears = 1,
        minYears = 0,
        company = null,
        jobTitle = null,
        limit = 100,
        skip = 0
      } = options;

      console.log(`🔍 Filtering users with contract expiring within ${minYears}-${maxYears} years...`);
      
      // Build query
      const query = {};
      if (company) {
        query.receivingCompany = { $regex: company, $options: 'i' };
      }
      if (jobTitle) {
        query.jobTitle = { $regex: jobTitle, $options: 'i' };
      }

      // Get all users matching basic criteria
      const users = await User.find(query)
        .limit(limit * 2) // Get more to account for filtering
        .skip(skip)
        .lean();

      console.log(`📊 Found ${users.length} users matching basic criteria`);

      const filteredUsers = [];
      const now = new Date();

      for (const user of users) {
        if (!user.entryDate || !user.contractDuration) {
          continue;
        }

        const endDate = this.calculateContractEndDate(user.entryDate, user.contractDuration);
        if (!endDate) {
          continue;
        }

        const diffYears = (endDate - now) / (1000 * 60 * 60 * 24 * 365);
        
        if (diffYears >= minYears && diffYears <= maxYears) {
          filteredUsers.push({
            ...user,
            contractEndDate: endDate,
            yearsRemaining: Math.round(diffYears * 100) / 100,
            daysRemaining: Math.round((endDate - now) / (1000 * 60 * 60 * 24))
          });
        }
      }

      // Sort by years remaining (ascending - closest expiry first)
      filteredUsers.sort((a, b) => a.yearsRemaining - b.yearsRemaining);

      // Apply final limit
      const finalResults = filteredUsers.slice(0, limit);

      // Generate statistics
      const stats = this.generateStatistics(finalResults);

      console.log(`✅ Filtered ${finalResults.length} users with contract expiring within ${minYears}-${maxYears} years`);

      return {
        success: true,
        data: {
          users: finalResults,
          statistics: stats,
          filters: {
            maxYears,
            minYears,
            company,
            jobTitle,
            limit,
            skip
          }
        },
        total: finalResults.length
      };

    } catch (error) {
      console.error('❌ Error filtering users by contract expiry:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Tạo thống kê từ danh sách ứng viên
   * @param {Array} users - Danh sách ứng viên đã lọc
   * @returns {Object} Thống kê
   */
  generateStatistics(users) {
    if (!users || users.length === 0) {
      return {
        total: 0,
        byCompany: {},
        byJobTitle: {},
        byExpiryPeriod: {
          within30Days: 0,
          within90Days: 0,
          within6Months: 0,
          within1Year: 0
        },
        averageYearsRemaining: 0
      };
    }

    const stats = {
      total: users.length,
      byCompany: {},
      byJobTitle: {},
      byExpiryPeriod: {
        within30Days: 0,
        within90Days: 0,
        within6Months: 0,
        within1Year: 0
      },
      averageYearsRemaining: 0
    };

    let totalYears = 0;

    users.forEach(user => {
      // Company statistics
      const company = user.receivingCompany || 'Unknown';
      stats.byCompany[company] = (stats.byCompany[company] || 0) + 1;

      // Job title statistics
      const jobTitle = user.jobTitle || 'Unknown';
      stats.byJobTitle[jobTitle] = (stats.byJobTitle[jobTitle] || 0) + 1;

      // Expiry period statistics
      const daysRemaining = user.daysRemaining;
      if (daysRemaining <= 30) stats.byExpiryPeriod.within30Days++;
      if (daysRemaining <= 90) stats.byExpiryPeriod.within90Days++;
      if (daysRemaining <= 180) stats.byExpiryPeriod.within6Months++;
      if (daysRemaining <= 365) stats.byExpiryPeriod.within1Year++;

      totalYears += user.yearsRemaining;
    });

    stats.averageYearsRemaining = Math.round((totalYears / users.length) * 100) / 100;

    return stats;
  }

  /**
   * Lấy danh sách ứng viên sắp hết hợp đồng (trong vòng 3 tháng)
   * @param {Object} options - Tùy chọn lọc
   * @returns {Promise<Object>} Kết quả
   */
  async getExpiringSoonUsers(options = {}) {
    return this.filterUsersByContractExpiry({
      ...options,
      maxYears: 0.25, // 3 months
      minYears: 0
    });
  }

  /**
   * Lấy danh sách ứng viên còn 1 năm hợp đồng
   * @param {Object} options - Tùy chọn lọc
   * @returns {Promise<Object>} Kết quả
   */
  async getOneYearContractUsers(options = {}) {
    return this.filterUsersByContractExpiry({
      ...options,
      maxYears: 1,
      minYears: 0
    });
  }

  /**
   * Xuất danh sách ứng viên ra file CSV
   * @param {Array} users - Danh sách ứng viên
   * @param {string} filename - Tên file
   * @returns {Promise<string>} Đường dẫn file CSV
   */
  async exportToCSV(users, filename = 'contract_expiry_users.csv') {
    try {
      const fs = require('fs');
      const path = require('path');
      
      if (!users || users.length === 0) {
        throw new Error('No users to export');
      }

      // CSV headers
      const headers = [
        'Code',
        'Full Name',
        'Job Title',
        'Company',
        'Entry Date',
        'Contract Duration',
        'Contract End Date',
        'Years Remaining',
        'Days Remaining',
        'Gender',
        'Birth Date',
        'ID Number',
        'Phone',
        'Email',
        'Social Contact'
      ];

      // CSV rows
      const rows = users.map(user => [
        user.code || '',
        user.fullName || '',
        user.jobTitle || '',
        user.receivingCompany || '',
        user.entryDate || '',
        user.contractDuration || '',
        user.contractEndDate ? user.contractEndDate.toISOString().split('T')[0] : '',
        user.yearsRemaining || '',
        user.daysRemaining || '',
        user.gender || '',
        user.birthDate || '',
        user.idNumber || '',
        user.familyPhone || '',
        user.email || '',
        user.socialContact || ''
      ]);

      // Create CSV content
      const csvContent = [headers, ...rows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      // Ensure uploads directory exists
      const uploadsDir = path.join(__dirname, '../../uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const filePath = path.join(uploadsDir, filename);
      fs.writeFileSync(filePath, csvContent, 'utf8');

      console.log(`✅ Exported ${users.length} users to CSV: ${filePath}`);
      return filePath;

    } catch (error) {
      console.error('❌ Error exporting to CSV:', error);
      throw error;
    }
  }

  /**
   * Xuất danh sách ứng viên ra file Excel
   * @param {Array} users - Danh sách ứng viên
   * @param {string} filename - Tên file
   * @returns {Promise<string>} Đường dẫn file Excel
   */
  async exportToExcel(users, filename = 'contract_expiry_users.xlsx') {
    try {
      const fs = require('fs');
      const path = require('path');
      
      if (!users || users.length === 0) {
        throw new Error('No users to export');
      }

      // Prepare data for Excel
      const excelData = users.map(user => ({
        'Code': user.code || '',
        'Full Name': user.fullName || '',
        'Job Title': user.jobTitle || '',
        'Company': user.receivingCompany || '',
        'Entry Date': user.entryDate || '',
        'Contract Duration': user.contractDuration || '',
        'Contract End Date': user.contractEndDate ? user.contractEndDate.toISOString().split('T')[0] : '',
        'Years Remaining': user.yearsRemaining || '',
        'Days Remaining': user.daysRemaining || '',
        'Gender': user.gender || '',
        'Birth Date': user.birthDate || '',
        'ID Number': user.idNumber || '',
        'Phone': user.familyPhone || '',
        'Email': user.email || '',
        'Social Contact': user.socialContact || ''
      }));

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);

      // Set column widths
      const columnWidths = [
        { wch: 10 }, // Code
        { wch: 25 }, // Full Name
        { wch: 20 }, // Job Title
        { wch: 25 }, // Company
        { wch: 15 }, // Entry Date
        { wch: 15 }, // Contract Duration
        { wch: 15 }, // Contract End Date
        { wch: 15 }, // Years Remaining
        { wch: 15 }, // Days Remaining
        { wch: 10 }, // Gender
        { wch: 15 }, // Birth Date
        { wch: 20 }, // ID Number
        { wch: 15 }, // Phone
        { wch: 30 }, // Email
        { wch: 25 }  // Social Contact
      ];
      worksheet['!cols'] = columnWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Contract Users');

      // Ensure uploads directory exists
      const uploadsDir = path.join(__dirname, '../../uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const filePath = path.join(uploadsDir, filename);
      XLSX.writeFile(workbook, filePath);

      console.log(`✅ Exported ${users.length} users to Excel: ${filePath}`);
      return filePath;

    } catch (error) {
      console.error('❌ Error exporting to Excel:', error);
      throw error;
    }
  }
}

module.exports = new ContractFilterService();
