import { CheckCircleOutlined, FileTextOutlined, InboxOutlined, RobotOutlined } from '@ant-design/icons';
import { Button, Card, Divider, Form, Input, message, Progress, Space, Tag, Typography, Upload } from 'antd';
import React, { useState } from 'react';
import api from '../utils/api';

const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;

const JDUpload = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [uploadMethod, setUploadMethod] = useState('file'); // 'file' hoặc 'text'

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
        setLoading(true);
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
          message.success('Phân tích JD thành công!');
          onSuccess(response.data);
        } else {
          throw new Error(response.data.message);
        }
      } catch (error) {
        message.error(error.response?.data?.message || error.message || 'Có lỗi xảy ra khi upload');
        onError(error);
      } finally {
        setLoading(false);
        setUploadProgress(0);
      }
    },
  };

  // Xử lý phân tích text
  const handleAnalyzeText = async (values) => {
    try {
      setLoading(true);
      setAnalysisResult(null);

      const response = await api.post('/api/jd/analyze-text', {
        jdText: values.jdText
      });

      if (response.data.success) {
        setAnalysisResult(response.data.data);
        message.success('Phân tích JD thành công!');
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      message.error(error.response?.data?.message || error.message || 'Có lỗi xảy ra khi phân tích');
    } finally {
      setLoading(false);
    }
  };

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
        {/* Thông tin tổng quan */}
        <div style={{ marginBottom: 24 }}>
          <Title level={4}>Thông tin tổng quan</Title>
          <Space wrap>
            <Tag color="blue">Độ tin cậy: {analysis_summary.analysis_confidence}%</Tag>
            <Tag color="green">Số trường đã điền: {analysis_summary.total_fields_filled}</Tag>
            <Tag color="orange">Tổng yêu cầu: {analysis_summary.total_requirements}</Tag>
          </Space>
        </div>

        <Divider />

        {/* Thông tin cơ bản */}
        <div style={{ marginBottom: 24 }}>
          <Title level={4}>Thông tin cơ bản</Title>
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
            <div>
              <Text strong>Loại visa:</Text>
              <br />
              <Text>{jd.visa_type || 'Chưa xác định'}</Text>
            </div>
            <div>
              <Text strong>Ngành nghề:</Text>
              <br />
              <Text>{jd.industry || 'Chưa xác định'}</Text>
            </div>
          </div>
        </div>

        <Divider />

        {/* Yêu cầu ứng viên */}
        {jd.candidate_requirements && (
          <div style={{ marginBottom: 24 }}>
            <Title level={4}>Yêu cầu ứng viên</Title>
            
            {/* Yêu cầu cơ bản */}
            {jd.candidate_requirements.basic_requirements && (
              <div style={{ marginBottom: 16 }}>
                <Text strong>Yêu cầu cơ bản:</Text>
                <div style={{ marginTop: 8 }}>
                  {Object.entries(jd.candidate_requirements.basic_requirements).map(([key, value]) => (
                    value && (
                      <Tag key={key} style={{ marginBottom: 4 }}>
                        {key}: {value}
                      </Tag>
                    )
                  ))}
                </div>
              </div>
            )}

            {/* Kỹ năng yêu cầu */}
            {jd.candidate_requirements.skills_requirements && (
              <div style={{ marginBottom: 16 }}>
                <Text strong>Kỹ năng yêu cầu:</Text>
                <div style={{ marginTop: 8 }}>
                  {Object.entries(jd.candidate_requirements.skills_requirements).map(([key, value]) => (
                    Array.isArray(value) && value.length > 0 && (
                      <div key={key} style={{ marginBottom: 8 }}>
                        <Text type="secondary">{key}:</Text>
                        <div style={{ marginTop: 4 }}>
                          {value.map((skill, index) => (
                            <Tag key={index} color="blue" style={{ marginBottom: 4 }}>
                              {skill}
                            </Tag>
                          ))}
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}

            {/* Yêu cầu ưu tiên */}
            {jd.candidate_requirements.priority_level && (
              <div>
                <Text strong>Mức độ ưu tiên:</Text>
                <div style={{ marginTop: 8 }}>
                  {Object.entries(jd.candidate_requirements.priority_level).map(([level, requirements]) => (
                    Array.isArray(requirements) && requirements.length > 0 && (
                      <div key={level} style={{ marginBottom: 8 }}>
                        <Text type="secondary">{level === 'must_have' ? 'Bắt buộc' : level === 'should_have' ? 'Nên có' : 'Có thì tốt'}:</Text>
                        <div style={{ marginTop: 4 }}>
                          {requirements.map((req, index) => (
                            <Tag 
                              key={index} 
                              color={level === 'must_have' ? 'red' : level === 'should_have' ? 'orange' : 'green'}
                              style={{ marginBottom: 4 }}
                            >
                              {req}
                            </Tag>
                          ))}
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <Divider />

        {/* Thông tin lương */}
        <div style={{ marginBottom: 24 }}>
          <Title level={4}>Thông tin lương</Title>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <Text strong>Lương/giờ:</Text>
              <br />
              <Text>{jd.hourly_wage || 'Chưa xác định'}</Text>
            </div>
            <div>
              <Text strong>Lương tháng:</Text>
              <br />
              <Text>{jd.monthly_salary || 'Chưa xác định'}</Text>
            </div>
            <div>
              <Text strong>Tổng lương dự kiến:</Text>
              <br />
              <Text>{jd.total_expected_salary || 'Chưa xác định'}</Text>
            </div>
            <div>
              <Text strong>Thực nhận:</Text>
              <br />
              <Text>{jd.net_salary_approx || 'Chưa xác định'}</Text>
            </div>
          </div>
        </div>

        {/* Mô tả công việc */}
        {jd.job_description && (
          <div>
            <Title level={4}>Mô tả công việc</Title>
            <Paragraph>{jd.job_description}</Paragraph>
          </div>
        )}
      </Card>
    );
  };

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
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
          <Dragger {...uploadProps} disabled={loading}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">Click hoặc kéo thả file JD vào đây</p>
            <p className="ant-upload-hint">
              Hỗ trợ file .txt, .pdf, .doc, .docx (tối đa 10MB)
            </p>
          </Dragger>
          
          {loading && (
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
                disabled={loading}
              />
            </Form.Item>

            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading}
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
    </div>
  );
};

export default JDUpload;
