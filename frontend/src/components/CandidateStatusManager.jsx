import { EditOutlined } from '@ant-design/icons';
import { Button, message, Modal, Select } from 'antd';
import React, { useState } from 'react';
import api from '../utils/api';

const { Option } = Select;

const CandidateStatusManager = ({ candidate, onStatusUpdate }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newStatus, setNewStatus] = useState(candidate?.status || 'available');
  const [loading, setLoading] = useState(false);

  const statusOptions = [
    { value: 'available', label: 'Sẵn sàng', color: 'green' },
    { value: 'interviewed', label: 'Đã phỏng vấn', color: 'orange' },
    { value: 'hired', label: 'Đã tuyển', color: 'blue' },
    { value: 'rejected', label: 'Từ chối', color: 'red' },
    { value: 'pending', label: 'Chờ xử lý', color: 'default' }
  ];

  const handleStatusChange = async () => {
    if (!candidate || newStatus === candidate.status) {
      setIsModalVisible(false);
      return;
    }

    try {
      setLoading(true);
      
      // Gọi API để cập nhật tình trạng
      await api.put(`/api/candidates/${candidate._id}/status`, {
        status: newStatus
      });

      message.success('Cập nhật tình trạng thành công');
      onStatusUpdate?.(candidate._id, newStatus);
      setIsModalVisible(false);
    } catch (error) {
      console.error('Error updating candidate status:', error);
      message.error('Cập nhật tình trạng thất bại: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const getCurrentStatusInfo = () => {
    return statusOptions.find(option => option.value === candidate?.status) || 
           { value: 'available', label: 'Sẵn sàng', color: 'green' };
  };

  const currentStatus = getCurrentStatusInfo();

  return (
    <>
      <Button
        type="link"
        size="small"
        icon={<EditOutlined />}
        onClick={() => setIsModalVisible(true)}
        style={{ padding: 0 }}
      >
        Cập nhật
      </Button>

      <Modal
        title="Cập nhật tình trạng ứng viên"
        open={isModalVisible}
        onOk={handleStatusChange}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={loading}
        okText="Cập nhật"
        cancelText="Hủy"
      >
        <div style={{ marginBottom: 16 }}>
          <p><strong>Ứng viên:</strong> {candidate?.fullName}</p>
          <p><strong>Tình trạng hiện tại:</strong> 
            <span style={{ 
              color: currentStatus.color === 'green' ? '#52c41a' :
                     currentStatus.color === 'orange' ? '#fa8c16' :
                     currentStatus.color === 'blue' ? '#1890ff' :
                     currentStatus.color === 'red' ? '#ff4d4f' :
                     '#666',
              marginLeft: 8
            }}>
              {currentStatus.label}
            </span>
          </p>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 8 }}>
            <strong>Tình trạng mới:</strong>
          </label>
          <Select
            value={newStatus}
            onChange={setNewStatus}
            style={{ width: '100%' }}
            placeholder="Chọn tình trạng mới"
          >
            {statusOptions.map(option => (
              <Option key={option.value} value={option.value}>
                <span style={{ 
                  color: option.color === 'green' ? '#52c41a' :
                         option.color === 'orange' ? '#fa8c16' :
                         option.color === 'blue' ? '#1890ff' :
                         option.color === 'red' ? '#ff4d4f' :
                         '#666'
                }}>
                  {option.label}
                </span>
              </Option>
            ))}
          </Select>
        </div>
      </Modal>
    </>
  );
};

export default CandidateStatusManager;
