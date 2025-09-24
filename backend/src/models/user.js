const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  code: String,
  dispatchType: String,
  contractNumber: String,
  contractSignDate: String,
  contractDuration: String,
  gender: String,
  fullName: String,
  birthDate: String,
  idNumber: String,
  idIssueDate: String,
  idIssuePlace: String,
  permanentAddress: String,
  receivingCompany: String,
  union: String,
  unionGroup: String,
  jobTitle: String,
  entryDate: String,
  filterMonth: String,
  filterYear: String,
  socialContact: String,
  socialNetwork: String,
  email: String,
  familyPhone: String,
  status: {
    type: String,
    enum: ['active', 'absconded', 'returned_home', 'terminated', 'completed'],
    default: 'active'
  },

  // ✅ field dịch sẵn
  jobTitle_en: String,
  receivingCompany_en: String,
  union_en: String,
  unionGroup_en: String,
});

module.exports = mongoose.model('User', userSchema);
