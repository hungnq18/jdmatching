import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../utils/api";

const CandidateDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;

    const fetchCandidate = async () => {
      try {
        setLoading(true);
        console.log(`[CandidateDetail] Fetching candidate details for ID: ${id}`);
        
        // Lấy thông tin ứng viên trực tiếp theo ID
        const response = await api.get(`/api/contracts/candidate/${id}`);
        
        if (response.data.success) {
          setCandidate(response.data.data);
          console.log('[CandidateDetail] Candidate found:', response.data.data);
        } else {
          setError(response.data.message || 'Không tìm thấy ứng viên');
          console.error('[CandidateDetail] API Error:', response.data.message);
        }
      } catch (err) {
        console.error("Lỗi khi lấy thông tin ứng viên:", err);
        if (err.response?.status === 404) {
          setError('Không tìm thấy ứng viên');
        } else {
          setError('Lỗi khi tải dữ liệu ứng viên');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCandidate();
  }, [id]);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
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

  const getStatusColor = (daysRemaining) => {
    if (daysRemaining <= 30) return 'bg-red-100 text-red-800 border-red-200';
    if (daysRemaining <= 90) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (daysRemaining <= 180) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-green-100 text-green-800 border-green-200';
  };

  const getStatusText = (daysRemaining) => {
    if (daysRemaining <= 30) return 'Sắp hết hạn';
    if (daysRemaining <= 90) return 'Cần chú ý';
    if (daysRemaining <= 180) return 'Còn ít thời gian';
    return 'Còn nhiều thời gian';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Đang tải thông tin ứng viên...</p>
        </div>
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Không tìm thấy ứng viên</h1>
          <p className="text-gray-600 mb-6">{error || 'Ứng viên không tồn tại hoặc đã bị xóa'}</p>
          <button
            onClick={() => navigate(-1)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors duration-200"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors duration-200"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Quay lại
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Chi tiết ứng viên</h1>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">{candidate.fullName}</h2>
                <p className="text-blue-100 mt-1">{candidate.jobTitle}</p>
                <p className="text-blue-200 text-sm mt-1">{candidate.receivingCompany}</p>
              </div>
              <div className="text-right">
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(candidate.daysRemaining)}`}>
                  {getStatusText(candidate.daysRemaining)}
                </div>
                <p className="text-blue-200 text-sm mt-2">
                  Còn {formatYearsRemaining(candidate.yearsRemaining)} ({candidate.daysRemaining} ngày)
                </p>
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Thông tin cá nhân</h3>
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="font-medium text-gray-600">Mã ứng viên:</span>
                    <span className="text-gray-900">{candidate.code || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="font-medium text-gray-600">Giới tính:</span>
                    <span className="text-gray-900">{candidate.gender || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="font-medium text-gray-600">Ngày sinh:</span>
                    <span className="text-gray-900">{candidate.birthDate || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="font-medium text-gray-600">Số CMND/CCCD:</span>
                    <span className="text-gray-900">{candidate.idNumber || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="font-medium text-gray-600">Điện thoại:</span>
                    <span className="text-gray-900">{candidate.familyPhone || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="font-medium text-gray-600">Email:</span>
                    <span className="text-gray-900 break-all">{candidate.email || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Contract Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Thông tin hợp đồng</h3>
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="font-medium text-gray-600">Ngày vào:</span>
                    <span className="text-gray-900">{formatDate(candidate.entryDate)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="font-medium text-gray-600">Thời hạn hợp đồng:</span>
                    <span className="text-gray-900">{candidate.contractDuration || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="font-medium text-gray-600">Ngày hết hạn:</span>
                    <span className="text-gray-900">{formatDate(candidate.contractEndDate)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="font-medium text-gray-600">Công đoàn:</span>
                    <span className="text-gray-900">{candidate.union || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="font-medium text-gray-600">Tổ công đoàn:</span>
                    <span className="text-gray-900">{candidate.unionGroup || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="font-medium text-gray-600">Địa chỉ thường trú:</span>
                    <span className="text-gray-900 text-right">{candidate.permanentAddress || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Social Network */}
            {candidate.socialNetwork && candidate.socialNetwork.trim() !== '' && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Mạng xã hội</h3>
                <div className="flex items-center space-x-4">
                  {(() => {
                    const cleanSocialNetwork = candidate.socialNetwork.replace(/\/$/, '').trim();
                    const isUrl = cleanSocialNetwork.startsWith('http') || cleanSocialNetwork.startsWith('www') || cleanSocialNetwork.includes('facebook.com');
                    
                    if (isUrl) {
                      return (
                        <a 
                          href={cleanSocialNetwork.startsWith('http') ? cleanSocialNetwork : `https://${cleanSocialNetwork}`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                        >
                          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                          </svg>
                          Facebook
                        </a>
                      );
                    } else {
                      return (
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-600">Mạng xã hội:</span>
                          <span className="text-gray-900">{cleanSocialNetwork}</span>
                        </div>
                      );
                    }
                  })()}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    if (candidate.familyPhone) {
                      window.open(`tel:${candidate.familyPhone}`, '_self');
                    } else if (candidate.email) {
                      window.open(`mailto:${candidate.email}`, '_self');
                    } else {
                      alert('Không có thông tin liên hệ');
                    }
                  }}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Liên hệ
                </button>
                
                {candidate.socialNetwork && candidate.socialNetwork.trim() !== '' && (() => {
                  const cleanSocialNetwork = candidate.socialNetwork.replace(/\/$/, '').trim();
                  const isUrl = cleanSocialNetwork.startsWith('http') || cleanSocialNetwork.startsWith('www') || cleanSocialNetwork.includes('facebook.com');
                  
                  if (isUrl) {
                    return (
                      <button
                        onClick={() => {
                          const finalUrl = cleanSocialNetwork.startsWith('http') ? cleanSocialNetwork : `https://${cleanSocialNetwork}`;
                          window.open(finalUrl, '_blank');
                        }}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                      >
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                        Facebook
                      </button>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidateDetail;
