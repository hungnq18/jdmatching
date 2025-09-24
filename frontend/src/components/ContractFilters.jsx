import React from 'react';

const ContractFilters = ({ filters, onFilterChange, activeTab }) => {
  const handleInputChange = (field, value) => {
    onFilterChange({ [field]: value });
  };

  return (
    <div className="mb-6 bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Bộ lọc</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Company Filter */}
        <div>
          <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
            Công ty
          </label>
          <input
            type="text"
            id="company"
            value={filters.company}
            onChange={(e) => handleInputChange('company', e.target.value)}
            placeholder="Tìm theo tên công ty..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Job Title Filter */}
        <div>
          <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700 mb-1">
            Chức vụ
          </label>
          <input
            type="text"
            id="jobTitle"
            value={filters.jobTitle}
            onChange={(e) => handleInputChange('jobTitle', e.target.value)}
            placeholder="Tìm theo chức vụ..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Custom Time Range Filters - Only show for custom tab */}
        {activeTab === 'custom' && (
          <>
            <div>
              <label htmlFor="minYears" className="block text-sm font-medium text-gray-700 mb-1">
                Tối thiểu (năm)
              </label>
              <input
                type="number"
                id="minYears"
                min="0"
                max="10"
                step="0.1"
                value={filters.minYears}
                onChange={(e) => handleInputChange('minYears', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="maxYears" className="block text-sm font-medium text-gray-700 mb-1">
                Tối đa (năm)
              </label>
              <input
                type="number"
                id="maxYears"
                min="0"
                max="10"
                step="0.1"
                value={filters.maxYears}
                onChange={(e) => handleInputChange('maxYears', parseFloat(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </>
        )}

        {/* Quick Filter Buttons for other tabs */}
        {activeTab !== 'custom' && (
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bộ lọc nhanh
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onFilterChange({ company: '', jobTitle: '' })}
                className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors duration-200"
              >
                Xóa tất cả
              </button>
              <button
                onClick={() => onFilterChange({ company: 'ABC' })}
                className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-full transition-colors duration-200"
              >
                Công ty ABC
              </button>
              <button
                onClick={() => onFilterChange({ jobTitle: 'Đầu bếp' })}
                className="px-3 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded-full transition-colors duration-200"
              >
                Đầu bếp
              </button>
              <button
                onClick={() => onFilterChange({ jobTitle: 'Thợ hàn' })}
                className="px-3 py-1 text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-full transition-colors duration-200"
              >
                Thợ hàn
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Filter Summary */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <span className="font-medium">Bộ lọc hiện tại:</span>
            {filters.company && (
              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                Công ty: {filters.company}
              </span>
            )}
            {filters.jobTitle && (
              <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                Chức vụ: {filters.jobTitle}
              </span>
            )}
            {activeTab === 'custom' && (
              <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                Thời gian: {filters.minYears}-{filters.maxYears} năm
              </span>
            )}
            {!filters.company && !filters.jobTitle && activeTab !== 'custom' && (
              <span className="text-gray-400">Không có bộ lọc</span>
            )}
          </div>
          
          <button
            onClick={() => onFilterChange({ company: '', jobTitle: '', maxYears: 1, minYears: 0 })}
            className="text-sm text-red-600 hover:text-red-800 transition-colors duration-200"
          >
            Đặt lại
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContractFilters;
