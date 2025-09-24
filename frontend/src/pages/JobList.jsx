 import {
  CheckCircleOutlined,
  DeleteOutlined,
  EyeOutlined,
  FileTextOutlined,
  InboxOutlined,
  RobotOutlined,
  SearchOutlined
} from '@ant-design/icons';
import {
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Progress,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  Upload
} from 'antd';
import axios from 'axios';
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CandidateStatusManager from '../components/CandidateStatusManager';
import { useJobs } from "../context/JobContext";
import api from '../utils/api';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Dragger } = Upload;

const JobList = () => {
  const { jobs, loading, error, fetchJobs, deleteJob } = useJobs();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  // --- Pagination state ---
  const [currentPage, setCurrentPage] = useState(1);
  const jobsPerPage = 12;

  // --- JD Analysis state ---
  const [analyzedJDs, setAnalyzedJDs] = useState([]);
  const [jdLoading, setJdLoading] = useState(false);
  const [jdPagination, setJdPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });

  // --- Matching Candidates state ---
  const [matchingCandidates, setMatchingCandidates] = useState([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [selectedJDId, setSelectedJDId] = useState(null);
  const [showCandidatesModal, setShowCandidatesModal] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedJD, setSelectedJD] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [uploadMethod, setUploadMethod] = useState('file');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // --- Progress tracking state ---
  const [matchingProgress, setMatchingProgress] = useState({
    phase: 'phase1',
    phaseName: 'Tìm kiếm trong nhóm ngành',
    totalUsers: 0,
    processed: 0,
    matched: 0,
    progress: 0,
    aiRequests: 0,
    batchIndex: 0,
    phase1Completed: false
  });
  
  // --- Criteria details modal state ---
  const [criteriaModalVisible, setCriteriaModalVisible] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  // Show criteria details for a candidate
  const showCriteriaDetails = (candidate) => {
    setSelectedCandidate(candidate);
    setCriteriaModalVisible(true);
  };

  // Load danh sách JD đã phân tích
  const loadAnalyzedJDs = async (page = 1, search = '') => {
    try {
      setJdLoading(true);
      console.log(`[loadAnalyzedJDs] Loading page ${page}, search: ${search}`);
      
      const response = await api.get('/api/jd', {
        params: {
          page,
          limit: jdPagination.pageSize,
          search
        }
      });

      console.log('📋 JD Response:', response.data);

      if (response.data && response.data.success) {
        // Xử lý nhiều cấu trúc response khác nhau
        const jds = response.data.data?.jds || response.data.data || response.data.jds || [];
        setAnalyzedJDs(Array.isArray(jds) ? jds : []);
        setJdPagination(prev => ({
          ...prev,
          current: response.data.data?.pagination?.current_page || response.data.pagination?.current_page || page,
          total: response.data.data?.pagination?.total_items || response.data.pagination?.total_items || 0
        }));
      } else {
        console.error('❌ API Response Error:', response.data);
        message.error(response.data?.message || 'Lỗi khi tải danh sách JD');
      }
    } catch (error) {
      console.error('Error loading JDs:', error);
      message.error('Lỗi khi tải danh sách JD: ' + (error.response?.data?.message || error.message));
    } finally {
      setJdLoading(false);
    }
  };

  // Load danh sách ứng viên phù hợp
  const loadMatchingCandidates = async (jdId) => {
    try {
      setCandidatesLoading(true);
      setSelectedJDId(jdId);
      
      console.log(`[loadMatchingCandidates] Starting for JD ID: ${jdId}`);
      
      // Check if axios is available, fallback to api instance
      let response;
      if (typeof axios !== 'undefined') {
        // Tạo axios instance riêng với timeout dài hơn cho matching
        const matchingApi = axios.create({
          baseURL: import.meta.env.VITE_API_URL || 'https://jdmatching.onrender.com',
          timeout: 180000, // 3 phút cho matching
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        response = await matchingApi.get(`/api/jd/${jdId}/candidates`);
      } else {
        // Fallback to api instance
        console.warn('Axios not available, using api instance');
        response = await api.get(`/api/jd/${jdId}/candidates`);
      }
      
      console.log('🔍 API Response:', response.data);
      
      if (response.data.success) {
        const candidates = response.data.data.candidates || [];
        const progress = response.data.data.progress || {};
        const summary = response.data.data.summary || {};
        const filtering = response.data.data.filtering || {};
        
        console.log('👥 Candidates data:', candidates);
        console.log('📊 Progress data:', progress);
        console.log('📈 Summary data:', summary);
        console.log('🔍 Filtering data:', filtering);
        
        // Debug: Log first candidate structure
        if (candidates.length > 0) {
          console.log('🔍 First candidate structure:', Object.keys(candidates[0]));
          console.log('🔍 First candidate data:', candidates[0]);
        }
        
        // Add default status if not present
        const candidatesWithDefaults = candidates.map((candidate, index) => ({
          ...candidate,
          status: candidate.status || (index === 0 ? 'available' : 'pending')
        }));
        
        setMatchingCandidates(candidatesWithDefaults);
        setMatchingProgress(progress);
        setShowCandidatesModal(true);
        
        if (candidates.length === 0) {
          if (filtering.original_count > 0) {
            message.warning(`Tìm thấy ${filtering.original_count} ứng viên nhưng không có ai đạt điểm phù hợp >50%`);
          } else {
            message.info('Không tìm thấy ứng viên phù hợp');
          }
        } else {
          const phaseText = summary.finalPhase === 'phase2' ? ' (mở rộng tìm kiếm)' : '';
          const filteredText = filtering.original_count > filtering.filtered_count ? 
            ` (${filtering.filtered_count}/${filtering.original_count} đạt >50%)` : '';
          message.success(`Tìm thấy ${candidates.length} ứng viên phù hợp${phaseText}${filteredText}`);
        }
      } else {
        console.error('❌ API Error:', response.data);
        message.error(response.data.message || 'Lỗi khi tải danh sách ứng viên');
      }
    } catch (error) {
      console.error('Error loading candidates:', error);
      
      // More specific error handling
      if (error.response?.status === 404) {
        message.error('Không tìm thấy JD hoặc ứng viên');
      } else if (error.response?.status === 500) {
        message.error('Lỗi server khi tải ứng viên');
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        message.error('Quá trình tìm kiếm mất quá nhiều thời gian. Vui lòng thử lại với JD khác hoặc liên hệ admin.');
      } else {
        message.error('Lỗi khi tải danh sách ứng viên: ' + (error.response?.data?.message || error.message));
      }
    } finally {
      setCandidatesLoading(false);
    }
  };

  useEffect(() => {
    loadAnalyzedJDs();
  }, []);

  // Cấu hình upload
  const uploadProps = {
    name: 'jdFile',
    multiple: false,
    accept: '.txt,.pdf,.doc,.docx',
    beforeUpload: (file) => {
      const isValidType = ['text/plain', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type);
      if (!isValidType) {
        message.error('Chỉ chấp nhận file .txt, .pdf, .doc, .docx!');
        return false;
      }
      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error('File phải nhỏ hơn 10MB!');
        return false;
      }
      return true;
    },
    customRequest: async ({ file, onSuccess, onError, onProgress }) => {
      try {
        setJdLoading(true);
        setUploadProgress(0);
        setAnalysisResult(null);

        const formData = new FormData();
        formData.append('jdFile', file);

        const response = await api.post('/api/jd/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          },
        });

        if (response.data.success) {
          setAnalysisResult(response.data.data);
          
          // Kiểm tra có lỗi AI không
          const aiError = response.data.data.analysis_summary?.ai_error;
          if (aiError) {
            message.warning(`Phân tích JD thành công! (AI lỗi: ${aiError})`);
          } else {
            message.success('Phân tích JD thành công!');
          }
          
          loadAnalyzedJDs(); // Reload danh sách
          onSuccess(response.data);
        } else {
          throw new Error(response.data.message);
        }
      } catch (error) {
        message.error(error.response?.data?.message || error.message || 'Có lỗi xảy ra khi upload');
        onError(error);
      } finally {
        setJdLoading(false);
        setUploadProgress(0);
      }
    },
  };

  // Xử lý phân tích text
  const handleAnalyzeText = async (values) => {
    try {
      setJdLoading(true);
      setAnalysisResult(null);

      const response = await api.post('/api/jd/analyze-text', {
        jdText: values.jdText
      });

      if (response.data.success) {
        setAnalysisResult(response.data.data);
        
        // Kiểm tra có lỗi AI không
        const aiError = response.data.data.analysis_summary?.ai_error;
        if (aiError) {
          message.warning(`Phân tích JD thành công! (AI lỗi: ${aiError})`);
        } else {
          message.success('Phân tích JD thành công!');
        }
        
        loadAnalyzedJDs(); // Reload danh sách
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      message.error(error.response?.data?.message || error.message || 'Có lỗi xảy ra khi phân tích');
    } finally {
      setJdLoading(false);
    }
  };

  // Xem chi tiết JD
  const handleViewJDDetail = async (id) => {
    try {
      const response = await api.get(`/api/jd/${id}`);
      if (response.data.success) {
        setSelectedJD(response.data.data);
        setDetailModalVisible(true);
      }
    } catch (error) {
      message.error('Lỗi khi tải chi tiết JD: ' + (error.response?.data?.message || error.message));
    }
  };

  // Xóa JD
  const handleDeleteJD = async (id) => {
    try {
      const response = await api.delete(`/api/jd/${id}`);
      if (response.data.success) {
        message.success('Xóa JD thành công');
        loadAnalyzedJDs(jdPagination.current, searchText);
      }
    } catch (error) {
      message.error('Lỗi khi xóa JD: ' + (error.response?.data?.message || error.message));
    }
  };

  // Tìm kiếm JD
  const handleJDSearch = (value) => {
    setSearchText(value);
    loadAnalyzedJDs(1, value);
  };

  // Thay đổi trang JD
  const handleJDTableChange = (pagination) => {
    loadAnalyzedJDs(pagination.current, searchText);
  };

  if (loading) return <p className="text-center text-blue-500">⏳ Đang tải danh sách job...</p>;
  if (error) return <p className="text-center text-red-500">{error}</p>;

  const goToDetail = (id) => {
    navigate(`/jobs/${id}`);
  };

  // --- Pagination logic ---
  const totalPages = Math.ceil(jobs.length / jobsPerPage);
  const startIndex = (currentPage - 1) * jobsPerPage;
  const currentJobs = jobs.slice(startIndex, startIndex + jobsPerPage);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN");
  };

  // Định nghĩa cột cho bảng JD
  const jdColumns = [
    {
      title: 'Tiêu đề',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (text) => (
        <Tooltip title={text}>
          <Text strong>{text || 'Chưa xác định'}</Text>
        </Tooltip>
      )
    },
    {
      title: 'Công ty',
      dataIndex: 'company_name',
      key: 'company_name',
      ellipsis: true,
      render: (text) => (
        <Tooltip title={text}>
          {text || 'Chưa xác định'}
        </Tooltip>
      )
    },
    {
      title: 'Vị trí',
      dataIndex: 'job_name',
      key: 'job_name',
      ellipsis: true,
      render: (text) => (
        <Tooltip title={text}>
          {text || 'Chưa xác định'}
        </Tooltip>
      )
    },
    {
      title: 'Loại visa',
      dataIndex: 'visa_type',
      key: 'visa_type',
      render: (text) => text ? <Tag color="blue">{text}</Tag> : '-'
    },
    {
      title: 'Địa điểm',
      dataIndex: 'location',
      key: 'location',
      ellipsis: true,
      render: (text) => (
        <Tooltip title={text}>
          {text || '-'}
        </Tooltip>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'analysis_status',
      key: 'analysis_status',
      render: (status, record) => {
        const statusConfig = {
          completed: { color: 'green', text: 'Hoàn thành' },
          processing: { color: 'blue', text: 'Đang xử lý' },
          pending: { color: 'orange', text: 'Chờ xử lý' },
          failed: { color: 'red', text: 'Lỗi' }
        };
        const config = statusConfig[status] || { color: 'default', text: status };
        
        const confidence = record.analysis_metadata?.confidence_score;
        const isFallback = record.analysis_metadata?.fallback_used;
        
        return (
          <div>
            <Tag color={config.color}>{config.text}</Tag>
            {confidence && (
              <div style={{ marginTop: 4, fontSize: '12px' }}>
                <Tag 
                  color={confidence > 70 ? 'green' : confidence > 40 ? 'orange' : 'red'} 
                  size="small"
                >
                  {confidence}% {isFallback ? '(Fallback)' : ''}
                </Tag>
              </div>
            )}
          </div>
        );
      }
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => new Date(date).toLocaleDateString('vi-VN')
    },
    {
      title: 'Ứng viên phù hợp',
      key: 'matching_candidates',
      render: (_, record) => (
        <Space>
          <Button 
            type="primary" 
            size="small"
            icon={<RobotOutlined />}
            onClick={() => loadMatchingCandidates(record._id)}
            loading={candidatesLoading && selectedJDId === record._id}
          >
            {candidatesLoading && selectedJDId === record._id ? 'Đang tìm kiếm...' : 'Xem ứng viên'}
          </Button>
          {candidatesLoading && selectedJDId === record._id && (
            <div style={{ marginTop: 4, fontSize: '11px', color: '#666' }}>
              <Text type="secondary">Có thể mất 1-3 phút...</Text>
            </div>
          )}
        </Space>
      )
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title="Xem chi tiết">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              onClick={() => handleViewJDDetail(record._id)}
            />
          </Tooltip>
          <Popconfirm
            title="Bạn có chắc muốn xóa JD này?"
            onConfirm={() => handleDeleteJD(record._id)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Tooltip title="Xóa">
              <Button 
                type="text" 
                danger 
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ];

  // Render kết quả phân tích
  const renderAnalysisResult = () => {
    if (!analysisResult) return null;

    const { jd, analysis_summary } = analysisResult;

    return (
      <Card 
        title={
          <Space>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            <span>Kết quả phân tích JD</span>
          </Space>
        }
        style={{ marginTop: 24 }}
      >
        <div style={{ marginBottom: 24 }}>
          <Title level={4}>Thông tin tổng quan</Title>
          <Space wrap>
            <Tag color="blue">Độ tin cậy: {analysis_summary.analysis_confidence}%</Tag>
            <Tag color="green">Số trường đã điền: {analysis_summary.total_fields_filled}</Tag>
            <Tag color="orange">Tổng yêu cầu: {analysis_summary.total_requirements}</Tag>
          </Space>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <Text strong>Tiêu đề:</Text>
            <br />
            <Text>{jd.title || 'Chưa xác định'}</Text>
          </div>
          <div>
            <Text strong>Công ty:</Text>
            <br />
            <Text>{jd.company_name || 'Chưa xác định'}</Text>
          </div>
          <div>
            <Text strong>Vị trí:</Text>
            <br />
            <Text>{jd.job_name || 'Chưa xác định'}</Text>
          </div>
          <div>
            <Text strong>Địa điểm:</Text>
            <br />
            <Text>{jd.location || 'Chưa xác định'}</Text>
          </div>
        </div>
      </Card>
    );
  };

  // Render chi tiết JD trong modal
  const renderJDDetail = () => {
    if (!selectedJD) return null;

    return (
      <Modal
        title={
          <Space>
            <RobotOutlined />
            <span>Chi tiết JD - {selectedJD.title}</span>
          </Space>
        }
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            Đóng
          </Button>
        ]}
        width={800}
      >
        <Descriptions column={2} bordered>
          <Descriptions.Item label="Công ty" span={2}>
            {selectedJD.company_name}
          </Descriptions.Item>
          <Descriptions.Item label="Vị trí">
            {selectedJD.job_name}
          </Descriptions.Item>
          <Descriptions.Item label="Địa điểm">
            {selectedJD.location}
          </Descriptions.Item>
          <Descriptions.Item label="Loại visa">
            {selectedJD.visa_type}
          </Descriptions.Item>
          <Descriptions.Item label="Ngành nghề">
            {selectedJD.industry}
          </Descriptions.Item>
          <Descriptions.Item label="Giới tính">
            {selectedJD.gender}
          </Descriptions.Item>
          <Descriptions.Item label="Độ tuổi">
            {selectedJD.age_range}
          </Descriptions.Item>
          <Descriptions.Item label="Trình độ học vấn">
            {selectedJD.education}
          </Descriptions.Item>
          <Descriptions.Item label="Kỹ năng yêu cầu" span={2}>
            {selectedJD.skills_required}
          </Descriptions.Item>
          <Descriptions.Item label="Lương/giờ">
            {selectedJD.hourly_wage}
          </Descriptions.Item>
          <Descriptions.Item label="Lương tháng">
            {selectedJD.monthly_salary}
          </Descriptions.Item>
          <Descriptions.Item label="Thời gian làm việc">
            {selectedJD.working_hours}
          </Descriptions.Item>
          <Descriptions.Item label="Ngày nghỉ">
            {selectedJD.rest_days}
          </Descriptions.Item>
          <Descriptions.Item label="Mô tả công việc" span={2}>
            {selectedJD.job_description}
          </Descriptions.Item>
        </Descriptions>
      </Modal>
    );
  };

  const tabItems = [
    {
      key: 'jobs',
      label: (
        <span>
          <FileTextOutlined />
          Danh sách việc làm ({jobs.length})
        </span>
      ),
      children: (
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-gray-800">💼 Danh sách việc làm</h2>
            <button
              onClick={fetchJobs}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-md transition"
            >
              🔄 Tải lại
            </button>
          </div>

          <p className="text-gray-600 mb-4">
            Trang {currentPage}/{totalPages} — Tổng: <b>{jobs.length}</b> job
          </p>

          {jobs.length > 0 ? (
            <>
              {/* --- Card layout --- */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {currentJobs.map((job) => (
                  <div
                    key={job._id}
                    onClick={() => goToDetail(job._id)}
                    className="bg-white rounded-xl shadow-md p-5 border hover:shadow-lg transition cursor-pointer"
                  >
                    <div className="flex justify-between items-start">
                      <h3 className="text-xl font-semibold text-gray-800">{job.title}</h3>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteJob(job._id);
                        }}
                        className="text-sm px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-md shadow-sm"
                      >
                        Xóa
                      </button>
                    </div>
                    <p className="mt-2 text-gray-600 text-sm">{job.job_description || "Không có mô tả"}</p>

                    <div className="mt-3">
                      <p className="text-sm text-gray-700">
                        <b>Công ty:</b> {job.company_name || "—"}
                      </p>
                      <p className="text-sm text-gray-700">
                        <b>Địa điểm:</b> {job.location || "—"}
                      </p>
                      <p className="text-sm text-gray-700">
                        <b>Lương giờ:</b> {job.hourly_wage || "—"}
                      </p>
                      <p className="text-sm text-gray-700">
                        <b>Tổng lương dự kiến:</b> {job.total_expected_salary || "—"}
                      </p>
                      <p className="text-sm text-gray-700">
                        <b>Ngày phỏng vấn:</b> {formatDate(job.interview_date) ||job.interview_date||  "—"}
                      </p>
                      <p className="text-sm text-gray-700">
                        <b>Ngày nhập cảnh:</b> {job.entry_date || "—"}
                      </p>
                      <p className="text-sm text-gray-700"> 
                        <b>Thời hạn hợp đồng:</b> {job.contract_duration || "—"}
                      </p>
                      <p className="text-sm text-gray-700">
                        <b>Ngôn ngữ:</b> {job.special_requirements?.find(req => req.includes("Tiếng Nhật")) || "—"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* --- Pagination controls --- */}
              <div className="flex justify-center mt-8 space-x-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 rounded-lg ${currentPage === 1
                      ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                      : "bg-gray-200 hover:bg-gray-300"
                    }`}
                >
                  ⬅ Trước
                </button>

                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => handlePageChange(i + 1)}
                    className={`px-4 py-2 rounded-lg ${currentPage === i + 1
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 hover:bg-gray-300"
                      }`}
                  >
                    {i + 1}
                  </button>
                ))}

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`px-4 py-2 rounded-lg ${currentPage === totalPages
                      ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                      : "bg-gray-200 hover:bg-gray-300"
                    }`}
                >
                  Sau ➡
                </button>
              </div>
            </>
          ) : (
            <p className="text-center text-gray-500">🚫 Chưa có job nào</p>
          )}
        </div>
      )
    },
    {
      key: 'jd-analysis',
      label: (
        <span>
          <RobotOutlined />
          Phân tích JD bằng AI ({analyzedJDs.length})
        </span>
      ),
      children: (
        <div style={{ padding: 24 }}>
          <Title level={2}>
            <RobotOutlined style={{ marginRight: 8 }} />
            Phân tích JD bằng AI
          </Title>
          
          <Paragraph>
            Upload file JD hoặc nhập text trực tiếp để sử dụng AI phân tích và trích xuất thông tin theo đúng form model.
          </Paragraph>

          {/* Chọn phương thức upload */}
          <Card style={{ marginBottom: 24 }}>
            <Space>
              <Button 
                type={uploadMethod === 'file' ? 'primary' : 'default'}
                onClick={() => setUploadMethod('file')}
                icon={<FileTextOutlined />}
              >
                Upload File
              </Button>
              <Button 
                type={uploadMethod === 'text' ? 'primary' : 'default'}
                onClick={() => setUploadMethod('text')}
                icon={<FileTextOutlined />}
              >
                Nhập Text
              </Button>
            </Space>
          </Card>

          {/* Upload file */}
          {uploadMethod === 'file' && (
            <Card title="Upload File JD">
              <Dragger {...uploadProps} disabled={jdLoading}>
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">Click hoặc kéo thả file JD vào đây</p>
                <p className="ant-upload-hint">
                  Hỗ trợ file .txt, .pdf, .doc, .docx (tối đa 10MB)
                </p>
              </Dragger>
              
              {jdLoading && (
                <div style={{ marginTop: 16 }}>
                  <Text>Đang phân tích...</Text>
                  <Progress percent={uploadProgress} status="active" />
                </div>
              )}
            </Card>
          )}

          {/* Nhập text */}
          {uploadMethod === 'text' && (
            <Card title="Nhập nội dung JD">
              <Form
                form={form}
                layout="vertical"
                onFinish={handleAnalyzeText}
              >
                <Form.Item
                  name="jdText"
                  label="Nội dung Job Description"
                  rules={[
                    { required: true, message: 'Vui lòng nhập nội dung JD!' },
                    { min: 50, message: 'Nội dung phải có ít nhất 50 ký tự!' }
                  ]}
                >
                  <TextArea
                    rows={10}
                    placeholder="Nhập nội dung Job Description cần phân tích..."
                    disabled={jdLoading}
                  />
                </Form.Item>

                <Form.Item>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    loading={jdLoading}
                    icon={<RobotOutlined />}
                    size="large"
                  >
                    Phân tích bằng AI
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          )}

          {/* Kết quả phân tích */}
          {renderAnalysisResult()}

          {/* Danh sách JD đã phân tích */}
          <Card title="Danh sách JD đã phân tích" style={{ marginTop: 24 }}>
            <div style={{ marginBottom: 16 }}>
              <Input.Search
                placeholder="Tìm kiếm theo tiêu đề, công ty, vị trí..."
                allowClear
                enterButton={<SearchOutlined />}
                size="large"
                onSearch={handleJDSearch}
                style={{ maxWidth: 400 }}
              />
            </div>

            <Table
              columns={jdColumns}
              dataSource={analyzedJDs}
              rowKey="_id"
              loading={jdLoading}
              pagination={{
                ...jdPagination,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `${range[0]}-${range[1]} của ${total} JD`,
                pageSizeOptions: ['10', '20', '50', '100']
              }}
              onChange={handleJDTableChange}
              scroll={{ x: 1000 }}
            />
          </Card>
        </div>
      )
    },
    {
      key: 'candidates',
      label: (
        <span>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Danh sách ứng viên
        </span>
      ),
      children: (
        <div className="p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              👥 Danh sách ứng viên còn 1 năm hợp đồng
            </h2>
            <p className="text-gray-600 mb-6">
              Xem tổng quan về tất cả ứng viên có hợp đồng còn lại trong vòng 1 năm
            </p>
            <button
              onClick={() => navigate('/candidates')}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-md transition-colors duration-200 flex items-center space-x-2 mx-auto"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Mở danh sách ứng viên</span>
            </button>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="p-6">
      <Tabs defaultActiveKey="jobs" items={tabItems} />
      {renderJDDetail()}
      
      {/* Modal hiển thị danh sách ứng viên phù hợp */}
      <Modal
        title={
          <div>
            <span>Danh sách ứng viên phù hợp</span>
            {matchingProgress.totalUsers > 0 && (
              <div style={{ marginTop: 8 }}>
                <Progress 
                  percent={matchingProgress.progress} 
                  status={matchingProgress.phase === 'phase2' ? 'active' : 'normal'}
                  format={() => `${matchingProgress.processed}/${matchingProgress.totalUsers}`}
                />
                <div style={{ marginTop: 4, fontSize: '12px', color: '#666' }}>
                  {matchingProgress.phaseName} • 
                  Đã tìm thấy: {matchingProgress.matched} ứng viên • 
                  AI requests: {matchingProgress.aiRequests} • 
                  Chỉ hiển thị ứng viên &gt;50%
                </div>
              </div>
            )}
          </div>
        }
        open={showCandidatesModal}
        onCancel={() => setShowCandidatesModal(false)}
        footer={null}
        width={1200}
      >
        {matchingCandidates.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
            <Text>Không tìm thấy ứng viên phù hợp</Text>
          </div>
        )}
        <Table
          columns={[
            {
              title: 'Tên',
              dataIndex: 'fullName',
              key: 'fullName',
              width: 200,
              minWidth: 150,
              ellipsis: true,
              render: (text) => (
                <Tooltip title={text}>
                  <Text strong>{text || 'Chưa có'}</Text>
                </Tooltip>
              )
            },
            {
              title: 'Tuổi',
              dataIndex: 'birthDate',
              key: 'age',
              width: 80,
              render: (birthDate) => {
                if (!birthDate) return '-';
                const today = new Date();
                const birth = new Date(birthDate.split('/').reverse().join('-'));
                const age = today.getFullYear() - birth.getFullYear();
                return `${age} tuổi`;
              }
            },
            {
              title: 'Giới tính',
              dataIndex: 'gender',
              key: 'gender',
              width: 100,
              render: (gender) => {
                if (!gender) return <Tag color="default">N/A</Tag>;
                
                // Normalize gender for display
                const normalizeGenderDisplay = (gender) => {
                  const genderStr = String(gender).toLowerCase().trim();
                  
                  // Japanese to Vietnamese mapping
                  if (genderStr === '男' || genderStr === '男性' || genderStr === 'おとこ' || genderStr === 'otoko') return 'Nam';
                  if (genderStr === '女' || genderStr === '女性' || genderStr === 'おんな' || genderStr === 'onna') return 'Nữ';
                  
                  // Vietnamese
                  if (genderStr === 'nam' || genderStr === 'nam giới' || genderStr === 'nam gioi') return 'Nam';
                  if (genderStr === 'nu' || genderStr === 'nữ' || genderStr === 'nữ giới' || genderStr === 'nu gioi') return 'Nữ';
                  
                  // English
                  if (genderStr === 'male' || genderStr === 'm' || genderStr === 'man') return 'Nam';
                  if (genderStr === 'female' || genderStr === 'f' || genderStr === 'woman') return 'Nữ';
                  
                  // Any/All cases
                  if (genderStr === 'any' || genderStr === 'all' || genderStr === 'both' || 
                      genderStr === 'không yêu cầu' || genderStr === 'khong yeu cau' || 
                      genderStr === 'không' || genderStr === 'khong') return 'Không yêu cầu';
                  
                  return gender; // Return original if no match
                };
                
                const displayGender = normalizeGenderDisplay(gender);
                const colorMap = {
                  'Nam': 'blue',
                  'Nữ': 'pink',
                  'Không yêu cầu': 'default'
                };
                
                return <Tag color={colorMap[displayGender] || 'default'}>{displayGender}</Tag>;
              }
            },
            {
              title: 'Kinh nghiệm',
              dataIndex: 'contractDuration',
              key: 'experience',
              width: 120,
              render: (duration) => duration ? duration : '-'
            },
            {
              title: 'Công việc hiện tại',
              dataIndex: 'jobTitle',
              key: 'jobTitle',
              width: 180,
              ellipsis: true,
              render: (job) => job ? (
                <Tooltip title={job}>
                  <Tag color="green">{job}</Tag>
                </Tooltip>
              ) : '-'
            },
            {
              title: 'Loại visa',
              dataIndex: 'dispatchType',
              key: 'visa_type',
              width: 100,
              render: (type) => type ? <Tag color="orange">{type}</Tag> : '-'
            },
            {
              title: 'Thời gian hợp đồng còn lại',
              dataIndex: 'remainingYears',
              key: 'contract_remaining',
              width: 180,
              render: (remaining) => {
                if (!remaining) return '-';
                const years = parseFloat(remaining);
                if (years < 0) return <Tag color="red">Hết hạn</Tag>;
                if (years < 1) return <Tag color="orange">{Math.round(years * 12)} tháng</Tag>;
                return <Tag color="green">{years.toFixed(1)} năm</Tag>;
              }
            },
            {
              title: 'Nhóm ngành',
              dataIndex: 'groupMatch',
              key: 'group_match',
              width: 150,
              render: (groupMatch, record) => {
                const isGroupMatch = groupMatch === true;
                const groupName = record.matchedGroup || 'N/A';
                
                return (
                  <div>
                    <Tag color={isGroupMatch ? 'green' : 'orange'} size="small">
                      {isGroupMatch ? '✓ Phù hợp' : '⚠ Khác nhóm'}
                    </Tag>
                    <div style={{ marginTop: 2, fontSize: '11px', color: '#666' }}>
                      {groupName}
                    </div>
                  </div>
                );
              }
            },
            {
              title: 'Facebook',
              dataIndex: 'socialNetwork',
              key: 'social_network',
              width: 120,
              ellipsis: true,
              render: (socialNetwork, record) => {
                console.log('Rendering social network for:', record.fullName, socialNetwork);
                
                if (!socialNetwork || socialNetwork.trim() === '') {
                  return <Text type="secondary">Chưa có</Text>;
                }
                
                // Clean up the social network data (remove trailing slash)
                const cleanSocialNetwork = socialNetwork.replace(/\/$/, '').trim();
                
                // Check if it's a valid URL
                const isUrl = cleanSocialNetwork.startsWith('http') || cleanSocialNetwork.startsWith('www') || cleanSocialNetwork.includes('facebook.com');
                
                if (isUrl) {
                  return (
                    <a 
                      href={cleanSocialNetwork.startsWith('http') ? cleanSocialNetwork : `https://${cleanSocialNetwork}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ 
                        color: '#1877f2',
                        textDecoration: 'none',
                        fontWeight: 500
                      }}
                      title="Facebook"
                    >
                      Facebook
                    </a>
                  );
                } else {
                  return (
                    <Text style={{ fontWeight: 500 }}>
                      {cleanSocialNetwork}
                    </Text>
                  );
                }
              }
            },
            {
              title: 'Tình trạng',
              dataIndex: 'status',
              key: 'status',
              width: 120,
              render: (status, record) => {
                console.log('Rendering status for:', record.fullName, status);
                
                const statusConfig = {
                  'available': { color: 'green', text: 'Sẵn sàng' },
                  'interviewed': { color: 'orange', text: 'Đã phỏng vấn' },
                  'hired': { color: 'blue', text: 'Đã tuyển' },
                  'rejected': { color: 'red', text: 'Từ chối' },
                  'pending': { color: 'default', text: 'Chờ xử lý' }
                };
                
                const config = statusConfig[status] || { color: 'default', text: 'Chưa xác định' };
                
                return (
                  <Tag color={config.color} size="small">
                    {config.text}
                  </Tag>
                );
              }
            },
            {
              title: 'Điểm phù hợp',
              dataIndex: 'matchScore',
              key: 'match_score',
              width: 150,
              render: (score, record) => {
                if (!score) return <Progress percent={0} size="small" status="exception" />;
                const percentage = Math.round(score * 100);
                const phase = record.matchingPhase;
                const phaseText = phase === 'phase1' ? 'Nhóm chính' : 'Mở rộng';
                const phaseColor = phase === 'phase1' ? 'green' : 'orange';
                
                // Show criteria matching info
                const criticalMatched = record.criticalMatched || 0;
                const criticalTotal = record.criticalCriteria || 0;
                const criteriaText = criticalTotal > 0 ? `${criticalMatched}/${criticalTotal} tiêu chí` : '';
                
                return (
                  <div 
                    style={{ cursor: 'pointer' }}
                    onClick={() => showCriteriaDetails(record)}
                    title="Click để xem chi tiết tiêu chí"
                  >
                    <Progress 
                      percent={percentage} 
                      size="small" 
                      status={score > 0.8 ? 'success' : score > 0.6 ? 'normal' : 'exception'}
                    />
                    <div style={{ marginTop: 4, fontSize: '12px' }}>
                      <Tag color={phaseColor} size="small">
                        {phaseText}
                      </Tag>
                      {criteriaText && (
                        <Tag color={criticalMatched === criticalTotal ? 'green' : 'orange'} size="small" style={{ marginLeft: 4 }}>
                          {criteriaText}
                        </Tag>
                      )}
                    </div>
                  </div>
                );
              }
            },
            {
              title: 'Hành động',
              key: 'actions',
              width: 120,
              fixed: 'right',
              render: (_, record) => (
                <CandidateStatusManager 
                  candidate={record} 
                  onStatusUpdate={(candidateId, newStatus) => {
                    setMatchingCandidates(prev => 
                      prev.map(candidate => 
                        candidate._id === candidateId 
                          ? { ...candidate, status: newStatus }
                          : candidate
                      )
                    );
                  }}
                />
              )
            }
          ]}
          dataSource={matchingCandidates}
          rowKey="_id"
          loading={candidatesLoading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} của ${total} ứng viên`,
          }}
          scroll={{ x: 800 }}
        />
      </Modal>

      {/* Modal hiển thị chi tiết tiêu chí matching */}
      <Modal
        title={`Chi tiết tiêu chí - ${selectedCandidate?.fullName || 'N/A'}`}
        open={criteriaModalVisible}
        onCancel={() => setCriteriaModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedCandidate && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Text strong>Thông tin ứng viên:</Text>
              <div style={{ marginTop: 8 }}>
                <p><strong>Tên:</strong> {selectedCandidate.fullName}</p>
                <p><strong>Giới tính:</strong> 
                  {(() => {
                    const normalizeGenderDisplay = (gender) => {
                      if (!gender) return 'N/A';
                      const genderStr = String(gender).toLowerCase().trim();
                      
                      if (genderStr === '男' || genderStr === '男性' || genderStr === 'おとこ' || genderStr === 'otoko') return 'Nam';
                      if (genderStr === '女' || genderStr === '女性' || genderStr === 'おんな' || genderStr === 'onna') return 'Nữ';
                      if (genderStr === 'nam' || genderStr === 'nam giới' || genderStr === 'nam gioi') return 'Nam';
                      if (genderStr === 'nu' || genderStr === 'nữ' || genderStr === 'nữ giới' || genderStr === 'nu gioi') return 'Nữ';
                      if (genderStr === 'male' || genderStr === 'm' || genderStr === 'man') return 'Nam';
                      if (genderStr === 'female' || genderStr === 'f' || genderStr === 'woman') return 'Nữ';
                      if (genderStr === 'any' || genderStr === 'all' || genderStr === 'both' || 
                          genderStr === 'không yêu cầu' || genderStr === 'khong yeu cau' || 
                          genderStr === 'không' || genderStr === 'khong') return 'Không yêu cầu';
                      return gender;
                    };
                    
                    const displayGender = normalizeGenderDisplay(selectedCandidate.gender);
                    const colorMap = {
                      'Nam': 'blue',
                      'Nữ': 'pink',
                      'Không yêu cầu': 'default'
                    };
                    
                    return (
                      <Tag color={colorMap[displayGender] || 'default'} size="small" style={{ marginLeft: 8 }}>
                        {displayGender}
                      </Tag>
                    );
                  })()}
                </p>
                <p><strong>Tuổi:</strong> {selectedCandidate.birthDate ? new Date().getFullYear() - new Date(selectedCandidate.birthDate).getFullYear() : 'N/A'}</p>
                <p><strong>Loại visa:</strong> {selectedCandidate.dispatchType || 'N/A'}</p>
                <p><strong>Kinh nghiệm:</strong> {selectedCandidate.contractDuration || 'N/A'}</p>
                <p><strong>Nhóm ngành:</strong> 
                  <Tag color={selectedCandidate.groupMatch ? 'green' : 'orange'} size="small" style={{ marginLeft: 8 }}>
                    {selectedCandidate.groupMatch ? '✓ Phù hợp' : '⚠ Khác nhóm'}
                  </Tag>
                  <span style={{ marginLeft: 8, fontSize: '12px', color: '#666' }}>
                    ({selectedCandidate.matchedGroup || 'N/A'})
                  </span>
                </p>
                <p><strong>Tình trạng:</strong> 
                  <Tag color={
                    selectedCandidate.status === 'available' ? 'green' :
                    selectedCandidate.status === 'interviewed' ? 'orange' :
                    selectedCandidate.status === 'hired' ? 'blue' :
                    selectedCandidate.status === 'rejected' ? 'red' :
                    'default'
                  } size="small" style={{ marginLeft: 8 }}>
                    {selectedCandidate.status === 'available' ? 'Sẵn sàng' :
                     selectedCandidate.status === 'interviewed' ? 'Đã phỏng vấn' :
                     selectedCandidate.status === 'hired' ? 'Đã tuyển' :
                     selectedCandidate.status === 'rejected' ? 'Từ chối' :
                     selectedCandidate.status === 'pending' ? 'Chờ xử lý' :
                     'Chưa xác định'}
                  </Tag>
                </p>
                <p><strong>Facebook:</strong>
                  <div style={{ marginTop: 8 }}>
                    {selectedCandidate.socialNetwork ? (
                      (() => {
                        const cleanSocialNetwork = selectedCandidate.socialNetwork.replace(/\/$/, '').trim();
                        const isUrl = cleanSocialNetwork.startsWith('http') || cleanSocialNetwork.startsWith('www') || cleanSocialNetwork.includes('facebook.com');
                        
                        if (isUrl) {
                          return (
                            <a 
                              href={cleanSocialNetwork.startsWith('http') ? cleanSocialNetwork : `https://${cleanSocialNetwork}`}
                              target="_blank" 
                              rel="noopener noreferrer"
                              style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                padding: '4px 8px', 
                                backgroundColor: '#1877f2', 
                                color: 'white', 
                                borderRadius: '4px', 
                                textDecoration: 'none',
                                fontSize: '12px',
                                fontWeight: 500
                              }}
                            >
                              Facebook
                            </a>
                          );
                        } else {
                          return (
                            <span style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              padding: '4px 8px', 
                              backgroundColor: '#f0f8ff', 
                              color: '#1877f2', 
                              borderRadius: '4px', 
                              fontSize: '12px',
                              fontWeight: 500
                            }}>
                              {cleanSocialNetwork}
                            </span>
                          );
                        }
                      })()
                    ) : (
                      <span style={{ color: '#999', fontSize: '12px' }}>Chưa có thông tin</span>
                    )}
                  </div>
                </p>
              </div>
            </div>

            {selectedCandidate.criteriaResults && selectedCandidate.criteriaResults.length > 0 ? (
              <div>
                <Text strong>Kết quả đánh giá tiêu chí:</Text>
                <div style={{ marginTop: 8 }}>
                  {selectedCandidate.criteriaResults.map((criteria, index) => (
                    <div key={index} style={{ 
                      marginBottom: 8, 
                      padding: 8, 
                      border: '1px solid #d9d9d9', 
                      borderRadius: 4,
                      backgroundColor: criteria.matched ? '#f6ffed' : '#fff2f0'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <Text strong>{criteria.name}</Text>
                          <Tag color={criteria.required ? 'red' : 'blue'} size="small" style={{ marginLeft: 8 }}>
                            {criteria.required ? 'Bắt buộc' : 'Thông tin'}
                          </Tag>
                        </div>
                        <Tag color={criteria.matched ? 'green' : 'red'}>
                          {criteria.matched ? '✓ Phù hợp' : '✗ Không phù hợp'}
                        </Tag>
                      </div>
                      {criteria.details && (
                        <div style={{ marginTop: 4, fontSize: '12px', color: '#666' }}>
                          {criteria.details}
                        </div>
                      )}
                      {criteria.missingSkills && criteria.missingSkills.length > 0 && (
                        <div style={{ marginTop: 4, fontSize: '12px', color: '#ff4d4f' }}>
                          <Text strong>Kỹ năng thiếu:</Text> {criteria.missingSkills.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <Text strong>Tổng quan:</Text>
                <div style={{ marginTop: 8 }}>
                  <p><strong>Điểm phù hợp:</strong> {Math.round((selectedCandidate.matchScore || 0) * 100)}%</p>
                  <p><strong>Tiêu chí quan trọng:</strong> {selectedCandidate.criticalMatched || 0}/{selectedCandidate.criticalCriteria || 0}</p>
                  <p><strong>Nhóm ngành:</strong> 
                    <Tag color={selectedCandidate.groupMatch ? 'green' : 'orange'} size="small" style={{ marginLeft: 8 }}>
                      {selectedCandidate.groupMatch ? '✓ Phù hợp' : '⚠ Khác nhóm'}
                    </Tag>
                    <span style={{ marginLeft: 8, fontSize: '12px', color: '#666' }}>
                      ({selectedCandidate.matchedGroup || 'N/A'})
                    </span>
                  </p>
                  <p><strong>Giai đoạn tìm kiếm:</strong> {selectedCandidate.matchingPhase === 'phase1' ? 'Nhóm chính' : 'Mở rộng'}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default JobList;