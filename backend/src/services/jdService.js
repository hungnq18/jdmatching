const JD = require('../models/jd');

async function createJD(data) {
  const jd = new JD(data);
  return await jd.save();
}

async function getJDById(id) {
  return await JD.findById(id);
}
async function getAllJD() {
  return await JD.find();
}

module.exports = { createJD, getJDById, getAllJD };