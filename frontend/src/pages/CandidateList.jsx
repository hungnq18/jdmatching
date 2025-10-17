import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const CandidateList = () => {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalCandidates, setTotalCandidates] = useState(0);
  const [filters, setFilters] = useState({
    company: '',
    jobTitle: '',
    search: ''
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    itemsPerPage: 10,
    totalPages: 0
  });

  useEffect(() => {
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    loadCandidates();
  }, [filters]);

  const loadCandidates = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        company: filters.company || undefined,
        jobTitle: filters.jobTitle || undefined,
        limit: 1000 // Get more candidates for the list
      };

      // Remove undefined values
      Object.keys(params).forEach(key => {
        if (params[key] === undefined) {
          delete params[key];
        }
      });

      const response = await api.get('/api/contracts/one-year', { params });
      
      if (response.data.success) {
        let filteredCandidates = response.data.data.users;
        
        // Apply search filter
        if (filters.search) {
          const searchTerm = filters.search.toLowerCase();
          filteredCandidates = filteredCandidates.filter(candidate => 
            candidate.fullName?.toLowerCase().includes(searchTerm) ||
            candidate.jobTitle?.toLowerCase().includes(searchTerm) ||
            candidate.receivingCompany?.toLowerCase().includes(searchTerm) ||
            candidate.code?.toLowerCase().includes(searchTerm)
          );
        }

        // Calculate pagination
        const totalPages = Math.ceil(filteredCandidates.length / pagination.itemsPerPage);
        setPagination(prev => ({ ...prev, totalPages }));
        
        setCandidates(filteredCandidates);
        setTotalCandidates(response.data.data.statistics.total);
      } else {
        setError(response.data.message || 'Failed to load candidates');
      }
    } catch (err) {
      console.error('Error loading candidates:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load candidates');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
  };

  const handleItemsPerPageChange = (itemsPerPage) => {
    setPagination(prev => ({ 
      ...prev, 
      itemsPerPage: parseInt(itemsPerPage),
      currentPage: 1 
    }));
  };

  const getPaginatedCandidates = () => {
    const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage;
    const endIndex = startIndex + pagination.itemsPerPage;
    return candidates.slice(startIndex, endIndex);
  };

  const getPaginationInfo = () => {
    const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage + 1;
    const endIndex = Math.min(pagination.currentPage * pagination.itemsPerPage, candidates.length);
    return { startIndex, endIndex };
  };

  const handleExportExcel = async () => {
    try {
      setLoading(true);
      
      const response = await api.post('/api/contracts/export/excel', {
        maxYears: 1,
        minYears: 0,
        company: filters.company || undefined,
        jobTitle: filters.jobTitle || undefined,
        filename: `candidates_list_${new Date().toISOString().split('T')[0]}.xlsx`
      });

      if (response.data.success) {
        // Create download link
        const link = document.createElement('a');
        link.href = `${api.defaults.baseURL}${response.data.data.filePath}`;
        link.download = response.data.data.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        alert(`✅ Exported ${response.data.data.userCount} candidates to Excel successfully!`);
      } else {
        alert('❌ Export failed: ' + response.data.message);
      }
    } catch (err) {
      console.error('Error exporting Excel:', err);
      alert('❌ Export failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (daysRemaining) => {
    if (daysRemaining <= 30) return 'bg-red-100 text-red-800 border-red-200';
    if (daysRemaining <= 90) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (daysRemaining <= 180) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-green-100 text-green-800 border-green-200';
  };

  const getStatusText = (daysRemaining) => {
    if (daysRemaining <= 30) return 'Sắp hết hạn';
    if (daysRemaining <= 90) return 'Cần chú ý';
    if (daysRemaining <= 180) return 'Còn ít thời gian';
    return 'Còn nhiều thời gian';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN');
    } catch {
      return dateString;
    }
  };

  const formatYearsRemaining = (years) => {
    if (years < 1) {
      const months = Math.round(years * 12);
      return `${months} tháng`;
    }
    return `${Math.round(years * 100) / 100} năm`;
  };

  const getCandidateStatusInfo = (status) => {
    const statusMap = {
      'active': { text: 'Đang làm việc', color: 'bg-green-100 text-green-800 border-green-200', icon: '✅' },
      'absconded': { text: 'Bỏ trốn', color: 'bg-red-100 text-red-800 border-red-200', icon: '🚨' },
      'returned_home': { text: 'Đã về nước', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: '🏠' },
      'terminated': { text: 'Chấm dứt hợp đồng', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: '❌' },
      'completed': { text: 'Hoàn thành', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: '🎉' }
    };
    return statusMap[status] || statusMap['active'];
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải danh sách ứng viên...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <button
                onClick={() => navigate('/')}
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
              >
                🏠 Trang chủ
              </button>
              <button
                onClick={() => navigate('/jobs')}
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
              >
                💼 Danh sách việc làm
              </button>
              <button
                onClick={() => navigate('/contracts')}
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
              >
                📋 Quản lý hợp đồng
              </button>
              <button
                className="text-blue-600 bg-blue-50 px-3 py-2 rounded-md text-sm font-medium"
              >
                👥 Danh sách ứng viên
              </button>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                Tổng ứng viên: <span className="font-semibold text-blue-600">{totalCandidates}</span>
              </span>
              <button
                onClick={() => navigate('/contracts')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
              >
                Quản lý hợp đồng
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex mb-6" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600"
              >
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path>
                </svg>
                Trang chủ
              </button>
            </li>
            <li>
              <div className="flex items-center">
                <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
                </svg>
                <button
                  onClick={() => navigate('/contracts')}
                  className="ml-1 text-sm font-medium text-gray-700 hover:text-blue-600 md:ml-2"
                >
                  Quản lý hợp đồng
                </button>
              </div>
            </li>
            <li aria-current="page">
              <div className="flex items-center">
                <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
                </svg>
                <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2">
                  Danh sách ứng viên
                </span>
              </div>
            </li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Danh sách ứng viên còn 1 năm hợp đồng
              </h1>
              <p className="text-gray-600">
                Tổng quan về tất cả ứng viên có hợp đồng còn lại trong vòng 1 năm
              </p>
            </div>
            <button
              onClick={handleExportExcel}
              disabled={loading || candidates.length === 0}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg flex items-center space-x-2 shadow-md transition-colors duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Xuất Excel</span>
            </button>
          </div>
          
          {/* Total Overview */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-blue-900 mb-2">
                  Tổng quan ứng viên
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{totalCandidates}</div>
                    <div className="text-sm text-blue-500">Tổng ứng viên</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{candidates.length}</div>
                    <div className="text-sm text-green-500">Hiển thị</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {candidates.filter(c => c.daysRemaining <= 90).length}
                    </div>
                    <div className="text-sm text-orange-500">Sắp hết hạn</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {candidates.filter(c => c.daysRemaining <= 30).length}
                    </div>
                    <div className="text-sm text-purple-500">Cần gia hạn</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Bộ lọc</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                Tìm kiếm
              </label>
              <input
                type="text"
                id="search"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Tìm theo tên, chức vụ, công ty..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
                Công ty
              </label>
              <input
                type="text"
                id="company"
                value={filters.company}
                onChange={(e) => handleFilterChange('company', e.target.value)}
                placeholder="Lọc theo công ty..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700 mb-1">
                Chức vụ
              </label>
              <input
                type="text"
                id="jobTitle"
                value={filters.jobTitle}
                onChange={(e) => handleFilterChange('jobTitle', e.target.value)}
                placeholder="Lọc theo chức vụ..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Hiển thị <span className="font-semibold text-blue-600">{candidates.length}</span> ứng viên
              {filters.search && (
                <span className="ml-2 text-gray-500">
                  (tìm kiếm: "{filters.search}")
                </span>
              )}
            </div>
            <button
              onClick={() => setFilters({ company: '', jobTitle: '', search: '' })}
              className="text-sm text-red-600 hover:text-red-800 transition-colors duration-200"
            >
              Xóa bộ lọc
            </button>
          </div>
        </div>

        {/* Pagination Controls */}
        {candidates.length > 0 && (
          <div className="mb-6 bg-white rounded-lg shadow-md p-4">
            <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  Hiển thị{' '}
                  <select
                    value={pagination.itemsPerPage}
                    onChange={(e) => handleItemsPerPageChange(e.target.value)}
                    className="mx-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                  ứng viên mỗi trang
                </div>
                <div className="text-sm text-gray-600">
                  {getPaginationInfo().startIndex}-{getPaginationInfo().endIndex} trong {candidates.length} ứng viên
                </div>
                <button
                  onClick={handleExportExcel}
                  disabled={loading || candidates.length === 0}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center space-x-2 text-sm transition-colors duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Xuất Excel</span>
                </button>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Trước
                </button>
                
                <div className="flex space-x-1">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      const current = pagination.currentPage;
                      return page === 1 || page === pagination.totalPages || 
                             (page >= current - 2 && page <= current + 2);
                    })
                    .map((page, index, array) => {
                      if (index > 0 && page - array[index - 1] > 1) {
                        return (
                          <React.Fragment key={`ellipsis-${page}`}>
                            <span className="px-2 py-1 text-sm text-gray-500">...</span>
                            <button
                              onClick={() => handlePageChange(page)}
                              className={`px-3 py-1 text-sm border rounded ${
                                page === pagination.currentPage
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {page}
                            </button>
                          </React.Fragment>
                        );
                      }
                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`px-3 py-1 text-sm border rounded ${
                            page === pagination.currentPage
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                </div>
                
                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Sau
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Lỗi</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Candidates List */}
        {candidates.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Không tìm thấy ứng viên</h3>
            <p className="mt-1 text-sm text-gray-500">
              Thử thay đổi bộ lọc để tìm thêm ứng viên.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Danh sách ứng viên ({candidates.length})
              </h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ứng viên
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Công ty
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Chức vụ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ngày kết thúc
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thời gian còn lại
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Facebook
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tình trạng ứng viên
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tình trạng hợp đồng
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getPaginatedCandidates().map((candidate) => (
                    <tr key={candidate._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-blue-600">
                                {candidate.fullName?.charAt(0) || 'N'}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {candidate.fullName || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {candidate.code || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {candidate.receivingCompany || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {candidate.jobTitle || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(candidate.contractEndDate)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatYearsRemaining(candidate.yearsRemaining)}
                        </div>
                        <div className="text-xs text-gray-500">
                          ({candidate.daysRemaining} ngày)
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {(() => {
                          if (!candidate.socialNetwork || candidate.socialNetwork.trim() === '') {
                            return <span className="text-gray-400 text-sm">Chưa có</span>;
                          }
                          
                          // Clean up the social network data (remove trailing slash)
                          const cleanSocialNetwork = candidate.socialNetwork.replace(/\/$/, '').trim();
                          
                          // Check if it's a valid URL
                          const isUrl = cleanSocialNetwork.startsWith('http') || cleanSocialNetwork.startsWith('www') || cleanSocialNetwork.includes('facebook.com');
                          
                          if (isUrl) {
                            return (
                              <a 
                                href={cleanSocialNetwork.startsWith('http') ? cleanSocialNetwork : `https://${cleanSocialNetwork}`}
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center px-2 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition-colors duration-200"
                                title="Facebook"
                              >
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                </svg>
                                Facebook
                              </a>
                            );
                          } else {
                            return (
                              <span className="text-gray-600 text-sm font-medium">
                                {cleanSocialNetwork}
                              </span>
                            );
                          }
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getCandidateStatusInfo(candidate.status).color}`}>
                          <span className="mr-1">{getCandidateStatusInfo(candidate.status).icon}</span>
                          {getCandidateStatusInfo(candidate.status).text}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(candidate.daysRemaining)}`}>
                          {getStatusText(candidate.daysRemaining)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => navigate(`/candidate/${candidate._id}`)}
                            className="text-blue-600 hover:text-blue-900"  
                          >
                            Xem
                          </button>
                          <button
                            onClick={() => {
                              if (candidate.familyPhone) {
                                window.open(`tel:${candidate.familyPhone}`, '_self');
                              } else if (candidate.email) {
                                window.open(`mailto:${candidate.email}`, '_self');
                              }
                            }}
                            className="text-green-600 hover:text-green-900"
                          >
                            Liên hệ
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Footer */}
            {pagination.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
                  <div className="text-sm text-gray-600">
                    Hiển thị {getPaginationInfo().startIndex}-{getPaginationInfo().endIndex} trong {candidates.length} ứng viên
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePageChange(pagination.currentPage - 1)}
                      disabled={pagination.currentPage === 1}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Trước
                    </button>
                    
                    <div className="flex space-x-1">
                      {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                        .filter(page => {
                          const current = pagination.currentPage;
                          return page === 1 || page === pagination.totalPages || 
                                 (page >= current - 2 && page <= current + 2);
                        })
                        .map((page, index, array) => {
                          if (index > 0 && page - array[index - 1] > 1) {
                            return (
                              <React.Fragment key={`ellipsis-${page}`}>
                                <span className="px-2 py-1 text-sm text-gray-500">...</span>
                                <button
                                  onClick={() => handlePageChange(page)}
                                  className={`px-3 py-1 text-sm border rounded ${
                                    page === pagination.currentPage
                                      ? 'bg-blue-600 text-white border-blue-600'
                                      : 'border-gray-300 hover:bg-gray-50'
                                  }`}
                                >
                                  {page}
                                </button>
                              </React.Fragment>
                            );
                          }
                          return (
                            <button
                              key={page}
                              onClick={() => handlePageChange(page)}
                              className={`px-3 py-1 text-sm border rounded ${
                                page === pagination.currentPage
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {page}
                            </button>
                          );
                        })}
                    </div>
                    
                    <button
                      onClick={() => handlePageChange(pagination.currentPage + 1)}
                      disabled={pagination.currentPage === pagination.totalPages}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Sau
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Back to Top Button */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-4 left-4 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-colors duration-200 z-50"
          title="Về đầu trang"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default CandidateList;
