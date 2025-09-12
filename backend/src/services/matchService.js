const fs = require("fs");
const readline = require("readline");
const pLimit = require("p-limit");
const stringSimilarity = require("string-similarity");
const User = require("../models/user");
const JD = require("../models/jd");
const JobGroup = require("../models/visaType"); // chứa nhóm ngành + visa_type
const { getJDById } = require("./jdService");

// ---- util ----
function removeVietnameseTones(str = "") {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}
function parseAgeRange(ageRangeStr) {
  if (!ageRangeStr) return {};
  const match = ageRangeStr.match(/(\d+)\s*~\s*(\d+)/);
  if (match) {
    return { minAge: parseInt(match[1], 10), maxAge: parseInt(match[2], 10) };
  }
  return {};
}

function parseEntryDate(dateStr) {
  if (!dateStr) return null;

  // Cố gắng parse trực tiếp bằng Date
  const date = new Date(dateStr);
  if (!isNaN(date)) return date;

  // Nếu không parse được, thử các định dạng phổ biến khác (dd/mm/yyyy, dd-mm-yyyy)
  const parts = dateStr.split(/[\/\-\.]/);
  if (parts.length === 3) {
    let day = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10) - 1; // tháng từ 0-11
    let year = parseInt(parts[2], 10);
    
    // Nếu year có dạng yy thì convert sang yyyy
    if (year < 100) year += 2000;
    
    const parsedDate = new Date(year, month, day);
    if (!isNaN(parsedDate)) return parsedDate;
  }

  // Nếu vẫn không parse được
  return null;
}
function parseBirthDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split(/[\/\-\.]/);
  if (parts.length === 3) {
    const [day, month, year] = parts.map(Number);
    return new Date(year, month - 1, day);
  }
  const d = new Date(dateStr);
  return isNaN(d) ? null : d;
}

function normalize(text = "") {
  return removeVietnameseTones(String(text).toLowerCase().trim());
}

// Hàm ánh xạ giới tính
function normalizeGender(gender = "") {
  const genderMap = {
    'nam': 'nam',
    'nữ': 'nữ',
    '男': 'nam',
    '女': 'nữ',
    'male': 'nam',
    'female': 'nữ'
  };
  const normalized = normalize(gender);
  return genderMap[normalized] || normalized;
}

// Tính ngày kết thúc hợp đồng dựa trên entryDate và duration
function calculateContractEndDate(entryDate, duration) {
  const start = parseEntryDate(entryDate);
  if (!start) return null;

  let years = 0, months = 0;
  const durLower = duration.toLowerCase();
  const yearMatch = durLower.match(/(\d+)\s*(năm|year|years)/);
  const monthMatch = durLower.match(/(\d+)\s*(tháng|month|months)/);

  if (yearMatch) years = parseInt(yearMatch[1], 10);
  if (monthMatch) months = parseInt(monthMatch[1], 10);

  const end = new Date(start);
  end.setFullYear(end.getFullYear() + years);
  end.setMonth(end.getMonth() + months);

  return end;
}


// ---- tìm group từ visa_type của JD ----
function getJDGroupFromVisaType(jdVisaType, jobGroups) {
  const jdNorm = normalize(jdVisaType || "");
  let best = { group: null, score: 0, matched: null };

  for (const group of jobGroups) {
    const candidates = [
      normalize(group.group_vi || ""),
      normalize(group.group_en || ""),
      normalize(group.group_ja || ""),
    ].filter(Boolean);

    for (const cand of candidates) {
      const sim = stringSimilarity.compareTwoStrings(jdNorm, cand);
      if (sim > best.score) {
        best = { group: group.group_vi, score: sim, matched: cand };
      }
    }
  }
  return best;
}

// ---- check user có thỏa mãn điều kiện tuyển dụng trong JD không ----
// ---- check user có thỏa mãn điều kiện tuyển dụng trong JD không ----
function filterByJDConditions(user, jdDetail) {
  // 1. Check giới tính
  if (user.gender && normalizeGender(user.gender) !== "nam") return false;

  // 2. Check tuổi
  if (jdDetail.age_range) {
    const { minAge, maxAge } = parseAgeRange(jdDetail.age_range);
    if (!minAge && !maxAge) return true;

    const birth = parseBirthDate(user.birthDate);
    if (!birth) return false;

    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    const dayDiff = today.getDate() - birth.getDate();
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) age--;

    if (minAge && age < minAge) return false;
    if (maxAge && age > maxAge) return false;
  }

  return true;
}

// ---- map user jobTitle sang group ----
function mapUserJobToGroup(jobTitle, jobGroups) {
  const jobNorm = normalize(jobTitle);
  let best = { group: null, score: 0, matched: null };

  for (const group of jobGroups) {
    (group.jobs || []).forEach((job) => {
      const candidates = [
        normalize(job.vi || ""),
        normalize(job.en || ""),
        normalize(job.ja || ""),
      ].filter(Boolean);

      for (const cand of candidates) {
        const sim = stringSimilarity.compareTwoStrings(jobNorm, cand);
        if (sim > best.score) {
          best = { group: group.group_vi, score: sim, matched: cand };
        }
      }
    });
  }
  return best;
}

// ---- main ----
async function matchUsersWithJD(
  jdId,
  filePath = null,
  batchSize = 1000,
  concurrency = 10
) {
  console.log(`[matchUsersWithJD] Start for JD id=${jdId}`);
  console.time(`[matchUsersWithJD:${jdId}]`);

  // 1) Lấy JD
  const jd = await JD.findById(jdId);
  if (!jd) throw new Error("Không tìm thấy JD");
  const jdDetail = await getJDById(jdId);
  console.log(
    `[matchUsersWithJD] JD loaded: ${jd._id} - visa_type="${jdDetail.visa_type}"`
  );

  // 2) Load jobGroups từ DB
  const jobGroups = await JobGroup.find().lean();
  console.log(`[matchUsersWithJD] Loaded ${jobGroups.length} jobGroups`);

  // 3) Map JD visa_type -> group
  const jdGroupResult = getJDGroupFromVisaType(jdDetail.visa_type, jobGroups);
  if (!jdGroupResult.group) {
    console.warn(`[matchUsersWithJD] Không tìm thấy nhóm ngành cho JD visa_type`);
    return [];
  }
  console.log(
    `[matchUsersWithJD] JD visa_type="${jdDetail.visa_type}" -> group="${jdGroupResult.group}" (score=${jdGroupResult.score.toFixed(2)})`
  );

  const matchedUsers = [];
  const matchedUserIds = new Set();
  const limit = pLimit(concurrency);
  let totalProcessed = 0,
      totalMatched = 0,
      batchIndex = 0;

  async function processBatch(usersArray) {
    batchIndex++;
    console.log(`[Batch #${batchIndex}] size=${usersArray.length}`);
    let matchedThisBatch = 0;

    for (const user of usersArray) {
      totalProcessed++;
      const jobTitle = user.jobTitle || "";
      if (!jobTitle) continue;

      const userGroupResult = mapUserJobToGroup(jobTitle, jobGroups);

      // chỉ giữ nếu cùng group với JD group
      const isSameGroup =
        userGroupResult.group &&
        normalize(userGroupResult.group) === normalize(jdGroupResult.group);

      if (!isSameGroup) continue;

      // check điều kiện trong JD
      if (!filterByJDConditions(user, jdDetail)) continue;

      // ✅ check hợp đồng còn >= 1 năm dựa trên entryDate và contractDuration
      let isValidContract = true;
      let endDate = null, diffYears = null;

      if (user.entryDate && user.contractDuration) {
        endDate = calculateContractEndDate(
          user.entryDate,
          user.contractDuration
        );
        if (endDate) {
          diffYears = (endDate - new Date()) / (1000 * 60 * 60 * 24 * 365);
          isValidContract = diffYears < 1 ;
        }
      }

      if (isValidContract) {
        matchedThisBatch++;
        totalMatched++;
        if (!matchedUserIds.has(user._id)) {
          matchedUsers.push({
            ...user,
            matchedGroup: userGroupResult.group,
            matchScore: userGroupResult.score,
            matchedCandidate: userGroupResult.matched,
            contractEndDate: endDate,
            remainingYears: diffYears?.toFixed(2),
          });
          matchedUserIds.add(user._id);
        }
        console.log(
          `[MATCH] user=${user._id} jobTitle="${jobTitle}" -> group="${userGroupResult.group}" score=${userGroupResult.score.toFixed(2)}`
        );
      }
    }

    console.log(`[Batch #${batchIndex}] done - matched=${matchedThisBatch}`);
  }

  // 4) Source: file hoặc DB
  if (filePath) {
    const rl = readline.createInterface({
      input: fs.createReadStream(filePath),
      crlfDelay: Infinity,
    });

    let buffer = [];
    for await (const line of rl) {
      const lineTrim = String(line || "").trim();
      if (lineTrim) buffer.push(lineTrim);
      if (buffer.length >= batchSize) {
        await processBatch(buffer.map((t) => ({ jobTitle: t, _id: t })));
        buffer = [];
      }
    }
    if (buffer.length > 0)
      await processBatch(buffer.map((t) => ({ jobTitle: t, _id: t })));
  } else {
    const total = await User.countDocuments();
    console.log(`[matchUsersWithJD] Will process ${total} users`);

    const promises = [];
    for (let skip = 0; skip < total; skip += batchSize) {
      const promise = limit(async () => {
        const users = await User.find().skip(skip).limit(batchSize).lean();
        if (!users || users.length === 0) return;
        await processBatch(users);
      });
      promises.push(promise);
    }
    await Promise.all(promises);
  }

  // 5) Sort kết quả theo similarity giảm dần
  matchedUsers.sort((a, b) => b.matchScore - a.matchScore);

  // 6) Done
  console.log(
    `[matchUsersWithJD] Finished. totalProcessed=${totalProcessed}, totalMatched=${totalMatched}`
  );
  console.timeEnd(`[matchUsersWithJD:${jdId}]`);
  return matchedUsers;
}

module.exports = { matchUsersWithJD };
