import React from 'react';

const ContractStatistics = ({ statistics }) => {
  if (!statistics) return null;

  const getPercentage = (value, total) => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  return (
    <div className="mb-6 bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Thống kê tổng quan</h3>
      
      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-600">Tổng ứng viên</p>
              <p className="text-3xl font-bold text-blue-900">{statistics.total.toLocaleString()}</p>
              <p className="text-xs text-blue-500">trong hệ thống</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-600">Thời gian TB còn lại</p>
              <p className="text-2xl font-semibold text-green-900">{statistics.averageYearsRemaining} năm</p>
            </div>
          </div>
        </div>

        <div className="bg-red-50 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-600">Hết hạn trong 30 ngày</p>
              <p className="text-2xl font-semibold text-red-900">{statistics.byExpiryPeriod.within30Days}</p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-yellow-600">Hết hạn trong 90 ngày</p>
              <p className="text-2xl font-semibold text-yellow-900">{statistics.byExpiryPeriod.within90Days}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Expiry Period Breakdown */}
      <div className="mb-6">
        <h4 className="text-md font-medium text-gray-900 mb-3">Phân bố theo thời gian hết hạn</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{statistics.byExpiryPeriod.within30Days}</div>
            <div className="text-sm text-gray-600">Trong 30 ngày</div>
            <div className="text-xs text-gray-500">
              {getPercentage(statistics.byExpiryPeriod.within30Days, statistics.total)}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{statistics.byExpiryPeriod.within90Days}</div>
            <div className="text-sm text-gray-600">Trong 90 ngày</div>
            <div className="text-xs text-gray-500">
              {getPercentage(statistics.byExpiryPeriod.within90Days, statistics.total)}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{statistics.byExpiryPeriod.within6Months}</div>
            <div className="text-sm text-gray-600">Trong 6 tháng</div>
            <div className="text-xs text-gray-500">
              {getPercentage(statistics.byExpiryPeriod.within6Months, statistics.total)}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{statistics.byExpiryPeriod.within1Year}</div>
            <div className="text-sm text-gray-600">Trong 1 năm</div>
            <div className="text-xs text-gray-500">
              {getPercentage(statistics.byExpiryPeriod.within1Year, statistics.total)}%
            </div>
          </div>
        </div>
      </div>

      {/* Company and Job Title Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Companies */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">Top công ty</h4>
          <div className="space-y-2">
            {Object.entries(statistics.byCompany)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 5)
              .map(([company, count]) => (
                <div key={company} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 truncate">{company}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${getPercentage(count, statistics.total)}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Top Job Titles */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">Top chức vụ</h4>
          <div className="space-y-2">
            {Object.entries(statistics.byJobTitle)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 5)
              .map(([jobTitle, count]) => (
                <div key={jobTitle} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 truncate">{jobTitle}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${getPercentage(count, statistics.total)}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractStatistics;
