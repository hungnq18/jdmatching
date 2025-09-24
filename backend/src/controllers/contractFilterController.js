const contractFilterService = require('../services/contractFilterService');

/**
 * Controller để xử lý các API liên quan đến lọc hợp đồng
 */
class ContractFilterController {

  /**
   * Lấy danh sách ứng viên còn 1 năm hợp đồng
   * GET /api/contracts/one-year
   */
  async getOneYearContractUsers(req, res) {
    try {
      const {
        company,
        jobTitle,
        limit = 100,
        skip = 0
      } = req.query;

      console.log('🔍 Getting users with 1 year contract remaining...');

      const result = await contractFilterService.getOneYearContractUsers({
        company,
        jobTitle,
        limit: parseInt(limit),
        skip: parseInt(skip)
      });

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: 'Error filtering users',
          error: result.error
        });
      }

      res.status(200).json({
        success: true,
        message: 'Users with 1 year contract remaining retrieved successfully',
        data: result.data,
        total: result.total
      });

    } catch (error) {
      console.error('❌ Error in getOneYearContractUsers:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Lấy danh sách ứng viên sắp hết hợp đồng (trong vòng 3 tháng)
   * GET /api/contracts/expiring-soon
   */
  async getExpiringSoonUsers(req, res) {
    try {
      const {
        company,
        jobTitle,
        limit = 100,
        skip = 0
      } = req.query;

      console.log('🔍 Getting users with contracts expiring soon...');

      const result = await contractFilterService.getExpiringSoonUsers({
        company,
        jobTitle,
        limit: parseInt(limit),
        skip: parseInt(skip)
      });

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: 'Error filtering users',
          error: result.error
        });
      }

      res.status(200).json({
        success: true,
        message: 'Users with contracts expiring soon retrieved successfully',
        data: result.data,
        total: result.total
      });

    } catch (error) {
      console.error('❌ Error in getExpiringSoonUsers:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Lọc ứng viên theo thời gian hợp đồng tùy chỉnh
   * GET /api/contracts/filter
   */
  async filterUsersByContract(req, res) {
    try {
      const {
        maxYears = 1,
        minYears = 0,
        company,
        jobTitle,
        limit = 100,
        skip = 0
      } = req.query;

      console.log(`🔍 Filtering users with contract expiring within ${minYears}-${maxYears} years...`);

      const result = await contractFilterService.filterUsersByContractExpiry({
        maxYears: parseFloat(maxYears),
        minYears: parseFloat(minYears),
        company,
        jobTitle,
        limit: parseInt(limit),
        skip: parseInt(skip)
      });

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: 'Error filtering users',
          error: result.error
        });
      }

      res.status(200).json({
        success: true,
        message: 'Users filtered successfully',
        data: result.data,
        total: result.total
      });

    } catch (error) {
      console.error('❌ Error in filterUsersByContract:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Xuất danh sách ứng viên ra file CSV
   * POST /api/contracts/export/csv
   */
  async exportUsersToCSV(req, res) {
    try {
      const {
        maxYears = 1,
        minYears = 0,
        company,
        jobTitle,
        filename
      } = req.body;

      console.log('📊 Exporting users to CSV...');

      // Get filtered users
      const result = await contractFilterService.filterUsersByContractExpiry({
        maxYears: parseFloat(maxYears),
        minYears: parseFloat(minYears),
        company,
        jobTitle,
        limit: 10000 // Large limit for export
      });

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: 'Error filtering users for export',
          error: result.error
        });
      }

      if (!result.data.users || result.data.users.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No users found matching the criteria'
        });
      }

      // Generate filename if not provided
      const exportFilename = filename || `contract_users_${new Date().toISOString().split('T')[0]}.csv`;

      // Export to CSV
      const filePath = await contractFilterService.exportToCSV(
        result.data.users,
        exportFilename
      );

      res.status(200).json({
        success: true,
        message: 'Users exported to CSV successfully',
        data: {
          filename: exportFilename,
          filePath: filePath,
          userCount: result.data.users.length,
          statistics: result.data.statistics
        }
      });

    } catch (error) {
      console.error('❌ Error in exportUsersToCSV:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Xuất danh sách ứng viên ra file Excel
   * POST /api/contracts/export/excel
   */
  async exportUsersToExcel(req, res) {
    try {
      const {
        maxYears = 1,
        minYears = 0,
        company,
        jobTitle,
        filename
      } = req.body;

      console.log('📊 Exporting users to Excel...');

      // Get filtered users
      const result = await contractFilterService.filterUsersByContractExpiry({
        maxYears: parseFloat(maxYears),
        minYears: parseFloat(minYears),
        company,
        jobTitle,
        limit: 10000 // Large limit for export
      });

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: 'Error filtering users for export',
          error: result.error
        });
      }

      if (!result.data.users || result.data.users.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No users found matching the criteria'
        });
      }

      // Generate filename if not provided
      const exportFilename = filename || `contract_users_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Export to Excel
      const filePath = await contractFilterService.exportToExcel(
        result.data.users,
        exportFilename
      );

      res.status(200).json({
        success: true,
        message: 'Users exported to Excel successfully',
        data: {
          filename: exportFilename,
          filePath: filePath,
          userCount: result.data.users.length,
          statistics: result.data.statistics
        }
      });

    } catch (error) {
      console.error('❌ Error in exportUsersToExcel:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Lấy thống kê về hợp đồng
   * GET /api/contracts/statistics
   */
  async getContractStatistics(req, res) {
    try {
      const {
        company,
        jobTitle
      } = req.query;

      console.log('📊 Getting contract statistics...');

      // Get all users for statistics
      const result = await contractFilterService.filterUsersByContractExpiry({
        maxYears: 5, // Get broader range for statistics
        minYears: 0,
        company,
        jobTitle,
        limit: 10000
      });

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: 'Error getting contract statistics',
          error: result.error
        });
      }

      res.status(200).json({
        success: true,
        message: 'Contract statistics retrieved successfully',
        data: {
          statistics: result.data.statistics,
          totalUsers: result.total,
          filters: {
            company,
            jobTitle
          }
        }
      });

    } catch (error) {
      console.error('❌ Error in getContractStatistics:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Lấy thông tin chi tiết ứng viên theo ID
   */
  async getCandidateById(req, res) {
    try {
      const { id } = req.params;
      console.log(`[getCandidateById] Fetching candidate with ID: ${id}`);

      // Import User model
      const User = require('../models/user');

      // Tìm ứng viên trong database
      const candidate = await User.findById(id);
      
      if (!candidate) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy ứng viên'
        });
      }

      // Tính toán thời gian còn lại của hợp đồng
      const contractEndDate = new Date(candidate.contractEndDate);
      const today = new Date();
      const timeDiff = contractEndDate.getTime() - today.getTime();
      const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
      const yearsRemaining = daysRemaining / 365;

      // Thêm thông tin tính toán vào candidate
      const candidateWithCalculations = {
        ...candidate.toObject(),
        daysRemaining,
        yearsRemaining
      };

      console.log(`[getCandidateById] Found candidate: ${candidate.fullName}`);

      res.json({
        success: true,
        data: candidateWithCalculations
      });

    } catch (error) {
      console.error('Error in getCandidateById:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy thông tin ứng viên: ' + error.message
      });
    }
  }
}

module.exports = new ContractFilterController();
