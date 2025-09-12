const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema({
  vi: { type: String, required: true },  // Ví dụ: "Nông nghiệp cây trồng"
  ja: { type: String },
  en: { type: String },
});

const visaTypeSchema = new mongoose.Schema({
  group_vi: { type: String, required: true }, // Ví dụ: "Nông nghiệp"
  group_ja: { type: String },
  group_en: { type: String },
  jobs: [jobSchema], // Danh sách các job thuộc group này
});

module.exports = mongoose.model("VisaType", visaTypeSchema);
