const mongoose = require('mongoose');

const cvSchema = new mongoose.Schema({
  name: { type: String, required: true },                // Tên ứng viên
  gender: { type: String, enum: ['Nam', 'Nữ'] },         // Giới tính
  dateOfBirth: { type: Date },                           // Ngày sinh
  phoneNumber: { type: String },                         // Số điện thoại
  email: { type: String },                               // Email
  interestedIndustries: [{ type: String }],              // Ngành nghề quan tâm
  interestedJobs: [{ type: String }],                    // Cơ hội việc làm quan tâm
  interestedCountries: [{ type: String }],               // Quốc gia quan tâm
  note: { type: String }                                 // Ghi chú
}, { timestamps: true });

module.exports = mongoose.model('CV', cvSchema);