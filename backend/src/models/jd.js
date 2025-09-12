const mongoose = require('mongoose');
const jdSchema = new mongoose.Schema({
title: { type: String, required: true }, // Tiêu đề thông báo tuyển dụng
company_name: { type: String, required: true }, // Tên công ty
company_website: { type: String }, // Website công ty
company_description: { type: String }, // Mô tả công ty
location: { type: String }, // Địa điểm làm việc
visa_type: { type: String }, // Loại visa
industry: { type: String }, // Ngành nghề
job_name: { type: String }, // Tên công việc
job_description: { type: String }, // Mô tả công việc
recruitment_number_needed: { type: Number }, // Số lượng cần tuyển
recruitment_number_applicants: { type: Number }, // Số lượng tham gia thi tuyển
gender: { type: String }, // Giới tính
age_range: { type: String }, // Độ tuổi
education: { type: String }, // Trình độ học vấn
skills_required: { type: String }, // Tay nghề yêu cầu
hand_dominance: { type: String, default: null }, // Thuận tay
smoking: { type: String, default: null }, // Hút thuốc
marriage_status: [{ type: String }], // Tình trạng hôn nhân
vision: { type: String }, // Thị lực
physical_strength: { type: String }, // Thể lực
special_requirements: [{ type: String }], // Yêu cầu đặc biệt
interview_method: { type: String }, // Hình thức thi tuyển
interview_date: { type: Date }, // Ngày phỏng vấn
entry_date: { type: String }, // Ngày nhập cảnh (string vì định dạng "Tháng 7 năm 2026")
contract_duration: { type: String }, // Thời hạn hợp đồng
training_period: { type: String }, // Thời gian đào tạo
training_allowance: { type: String }, // Trợ cấp đào tạo
hourly_wage: { type: String }, // Lương cơ bản/giờ
monthly_salary_calculation: { type: String }, // Cách tính lương tháng
monthly_salary: { type: String }, // Lương tháng
overtime_calculation: { type: String }, // Cách tính làm thêm
total_expected_salary: { type: String }, // Tổng lương dự kiến
net_salary_approx: { type: String }, // Số thực nhận khoảng
housing_cost: { type: String }, // Tiền nhà
utilities_cost: { type: String }, // Tiền ga, điện, nước + Internet
food_cost: { type: String }, // Tiền ăn
insurance_and_tax: { type: String }, // Bảo hiểm và thuế
working_hours: { type: String }, // Thời gian làm việc
rest_days: { type: String }, // Ngày nghỉ
annual_working_hours: { type: Number }, // Số giờ làm việc trong năm
dormitory_info: { type: String } // Thông tin KTX
}, { timestamps: true });
module.exports = mongoose.model('JobDescription', jdSchema);