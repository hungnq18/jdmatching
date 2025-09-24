import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ContractCard from '../components/ContractCard';
import ContractFilters from '../components/ContractFilters';
import ContractStatistics from '../components/ContractStatistics';
import api from '../utils/api';

const ContractManagement = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    company: '',
    jobTitle: '',
    maxYears: 1,
    minYears: 0
  });
  const [activeTab, setActiveTab] = useState('one-year'); // 'one-year', 'expiring-soon', 'custom'

  useEffect(() => {
    loadUsers();
  }, [activeTab, filters]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      let endpoint = '';
      let params = {};

      switch (activeTab) {
        case 'one-year':
          endpoint = '/api/contracts/one-year';
          params = {
            company: filters.company || undefined,
            jobTitle: filters.jobTitle || undefined,
            limit: 100
          };
          break;
        case 'expiring-soon':
          endpoint = '/api/contracts/expiring-soon';
          params = {
            company: filters.company || undefined,
            jobTitle: filters.jobTitle || undefined,
            limit: 100
          };
          break;
        case 'custom':
          endpoint = '/api/contracts/filter';
          params = {
            maxYears: filters.maxYears,
            minYears: filters.minYears,
            company: filters.company || undefined,
            jobTitle: filters.jobTitle || undefined,
            limit: 100
          };
          break;
        default:
          endpoint = '/api/contracts/one-year';
      }

      // Remove undefined values
      Object.keys(params).forEach(key => {
        if (params[key] === undefined) {
          delete params[key];
        }
      });

      const response = await api.get(endpoint, { params });
      
      if (response.data.success) {
        setUsers(response.data.data.users);
        setStatistics(response.data.data.statistics);
      } else {
        setError(response.data.message || 'Failed to load users');
      }
    } catch (err) {
      console.error('Error loading users:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleExportCSV = async () => {
    try {
      setLoading(true);
      
      const response = await api.post('/api/contracts/export/csv', {
        maxYears: filters.maxYears,
        minYears: filters.minYears,
        company: filters.company || undefined,
        jobTitle: filters.jobTitle || undefined,
        filename: `contract_users_${new Date().toISOString().split('T')[0]}.csv`
      });

      if (response.data.success) {
        // Create download link
        const link = document.createElement('a');
        link.href = `${api.defaults.baseURL}${response.data.data.filePath}`;
        link.download = response.data.data.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        alert(`✅ Exported ${response.data.data.userCount} users to CSV successfully!`);
      } else {
        alert('❌ Export failed: ' + response.data.message);
      }
    } catch (err) {
      console.error('Error exporting CSV:', err);
      alert('❌ Export failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setLoading(true);
      
      const response = await api.post('/api/contracts/export/excel', {
        maxYears: filters.maxYears,
        minYears: filters.minYears,
        company: filters.company || undefined,
        jobTitle: filters.jobTitle || undefined,
        filename: `contract_users_${new Date().toISOString().split('T')[0]}.xlsx`
      });

      if (response.data.success) {
        // Create download link
        const link = document.createElement('a');
        link.href = `${api.defaults.baseURL}${response.data.data.filePath}`;
        link.download = response.data.data.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        alert(`✅ Exported ${response.data.data.userCount} users to Excel successfully!`);
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

  const getTabTitle = () => {
    switch (activeTab) {
      case 'one-year':
        return 'Ứng viên còn 1 năm hợp đồng';
      case 'expiring-soon':
        return 'Ứng viên sắp hết hợp đồng (3 tháng)';
      case 'custom':
        return `Ứng viên có hợp đồng ${filters.minYears}-${filters.maxYears} năm`;
      default:
        return 'Quản lý hợp đồng';
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải dữ liệu...</p>
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
                className="text-blue-600 bg-blue-50 px-3 py-2 rounded-md text-sm font-medium"
              >
                📋 Quản lý hợp đồng
              </button>
              <button
                onClick={() => navigate('/candidates')}
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
              >
                👥 Danh sách ứng viên
              </button>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                Tổng ứng viên: <span className="font-semibold text-blue-600">{statistics?.total || 0}</span>
              </span>
              <button
                onClick={() => navigate('/jobs')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
              >
                Quay lại Jobs
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
                  onClick={() => navigate('/jobs')}
                  className="ml-1 text-sm font-medium text-gray-700 hover:text-blue-600 md:ml-2"
                >
                  Danh sách việc làm
                </button>
              </div>
            </li>
            <li aria-current="page">
              <div className="flex items-center">
                <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
                </svg>
                <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2">
                  Quản lý hợp đồng
                </span>
              </div>
            </li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Quản lý hợp đồng ứng viên
          </h1>
          <p className="text-gray-600 mb-4">
            Theo dõi và quản lý thời gian hợp đồng của ứng viên
          </p>
          
          {/* Total Overview */}
          {statistics && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-blue-900">
                    Tổng quan hệ thống
                  </h3>
                  <p className="text-blue-700">
                    Hiện có <span className="font-bold text-xl">{statistics.total}</span> ứng viên trong hệ thống
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">
                    {statistics.total}
                  </div>
                  <div className="text-sm text-blue-500">
                    ứng viên
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('one-year')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'one-year'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Còn 1 năm
              </button>
              <button
                onClick={() => setActiveTab('expiring-soon')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'expiring-soon'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Sắp hết hạn
              </button>
              <button
                onClick={() => setActiveTab('custom')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'custom'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Tùy chỉnh
              </button>
            </nav>
          </div>
        </div>

        {/* Filters */}
        <ContractFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          activeTab={activeTab}
        />

        {/* Statistics */}
        {statistics && (
          <ContractStatistics statistics={statistics} />
        )}

        {/* Actions */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {getTabTitle()}
            </h2>
            <div className="flex items-center space-x-4 mt-1">
              <p className="text-gray-600">
                Tìm thấy <span className="font-semibold text-blue-600">{users.length}</span> ứng viên
              </p>
              {statistics && (
                <p className="text-sm text-gray-500">
                  (Tổng: <span className="font-medium">{statistics.total}</span> ứng viên trong hệ thống)
                </p>
              )}
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleExportCSV}
              disabled={loading || users.length === 0}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Xuất CSV</span>
            </button>
            <button
              onClick={handleExportExcel}
              disabled={loading || users.length === 0}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Xuất Excel</span>
            </button>
          </div>
        </div>

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

        {/* Users List */}
        {users.length === 0 && !loading ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Không tìm thấy ứng viên</h3>
            <p className="mt-1 text-sm text-gray-500">
              Thử thay đổi bộ lọc để tìm thêm ứng viên.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map((user) => (
              <ContractCard key={user._id} user={user} />
            ))}
          </div>
        )}

        {/* Quick Actions Sidebar */}
        <div className="fixed right-4 top-1/2 transform -translate-y-1/2 z-50">
          <div className="bg-white rounded-lg shadow-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Thao tác nhanh</h3>
            
            <button
              onClick={() => navigate('/jobs')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs py-2 px-3 rounded-md transition-colors duration-200 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2V6" />
              </svg>
              <span>Danh sách Jobs</span>
            </button>
            
            <button
              onClick={handleExportCSV}
              disabled={loading || users.length === 0}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white text-xs py-2 px-3 rounded-md transition-colors duration-200 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Xuất CSV</span>
            </button>
            
            <button
              onClick={handleExportExcel}
              disabled={loading || users.length === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-xs py-2 px-3 rounded-md transition-colors duration-200 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Xuất Excel</span>
            </button>
            
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs py-2 px-3 rounded-md transition-colors duration-200 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Tải lại</span>
            </button>
            
            <div className="border-t border-gray-200 pt-3">
              <div className="text-xs text-gray-500 text-center">
                Tổng: {statistics?.total || 0} ứng viên
              </div>
            </div>
          </div>
        </div>

        {/* Loading overlay */}
        {loading && users.length > 0 && (
          <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-gray-700">Đang tải...</span>
            </div>
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

export default ContractManagement;
