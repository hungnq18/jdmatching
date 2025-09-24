import React from 'react';
import { useNavigate } from 'react-router-dom';

const ContractCard = ({ user }) => {
  const navigate = useNavigate();
  const getStatusColor = (daysRemaining) => {
    if (daysRemaining <= 30) return 'bg-red-100 text-red-800';
    if (daysRemaining <= 90) return 'bg-yellow-100 text-yellow-800';
    if (daysRemaining <= 180) return 'bg-orange-100 text-orange-800';
    return 'bg-green-100 text-green-800';
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

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {user.fullName || 'N/A'}
          </h3>
          <p className="text-sm text-gray-600 mb-1">
            {user.jobTitle || 'N/A'}
          </p>
          <p className="text-sm text-gray-500">
            {user.receivingCompany || 'N/A'}
          </p>
        </div>
        <div className="ml-4">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(user.daysRemaining)}`}>
            {getStatusText(user.daysRemaining)}
          </span>
        </div>
      </div>

      {/* Contract Info */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Mã ứng viên:</span>
          <span className="text-sm font-medium text-gray-900">
            {user.code || 'N/A'}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Ngày nhập cảnh:</span>
          <span className="text-sm font-medium text-gray-900">
            {user.entryDate || 'N/A'}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Thời hạn hợp đồng ban đầu:</span>
          <span className="text-sm font-medium text-gray-900">
            {user.contractDuration || 'N/A'}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Ngày kết thúc:</span>
          <span className="text-sm font-medium text-gray-900">
            {formatDate(user.contractEndDate)}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Thời gian còn lại (tính từ hôm nay):</span>
          <span className="text-sm font-medium text-blue-600">
            {formatYearsRemaining(user.yearsRemaining)}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Số ngày còn lại:</span>
          <span className="text-sm font-medium text-gray-900">
            {user.daysRemaining || 0} ngày
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Thời gian còn lại</span>
          <span>{Math.round(user.yearsRemaining * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              user.daysRemaining <= 30 ? 'bg-red-500' :
              user.daysRemaining <= 90 ? 'bg-yellow-500' :
              user.daysRemaining <= 180 ? 'bg-orange-500' : 'bg-green-500'
            }`}
            style={{ 
              width: `${Math.min(100, Math.max(0, user.yearsRemaining * 100))}%` 
            }}
          ></div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
          <div>
            <span className="font-medium">Giới tính:</span> {user.gender || 'N/A'}
          </div>
          <div>
            <span className="font-medium">Ngày sinh:</span> {user.birthDate || 'N/A'}
          </div>
          <div>
            <span className="font-medium">Số CMND:</span> {user.idNumber || 'N/A'}
          </div>
          <div>
            <span className="font-medium">Điện thoại:</span> {user.familyPhone || 'N/A'}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 space-y-2">
        {/* Primary Actions */}
        <div className="flex space-x-2">
          <button 
            onClick={() => navigate(`/candidate/${user._id}`)}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs py-2 px-3 rounded-md transition-colors duration-200"
          >
            Xem chi tiết
          </button>
          <button 
            onClick={() => {
              if (user.familyPhone) {
                window.open(`tel:${user.familyPhone}`, '_self');
              } else if (user.email) {
                window.open(`mailto:${user.email}`, '_self');
              } else {
                alert('Không có thông tin liên hệ');
              }
            }}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs py-2 px-3 rounded-md transition-colors duration-200"
          >
            Liên hệ
          </button>
        </div>
        
        {/* Secondary Actions */}
        <div className="flex space-x-1">
          <button 
            onClick={() => {
              // Navigate to contract extension page or show modal
              alert(`Gia hạn hợp đồng cho ${user.fullName}`);
            }}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-xs py-1.5 px-2 rounded-md transition-colors duration-200"
          >
            Gia hạn
          </button>
          <button 
            onClick={() => {
              // Navigate to candidate history page
              navigate(`/candidate/${user._id}/history`);
            }}
            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white text-xs py-1.5 px-2 rounded-md transition-colors duration-200"
          >
            Lịch sử
          </button>
          <button 
            onClick={() => {
              // Navigate to matching jobs for this candidate
              navigate(`/candidate/${user._id}/jobs`);
            }}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs py-1.5 px-2 rounded-md transition-colors duration-200"
          >
            JD phù hợp
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContractCard;
