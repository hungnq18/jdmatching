require('dotenv').config({ path: '../backend/.env' });
const fs = require('fs');
const XLSX = require('xlsx');
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Parse JSON an toàn từ AI
function safeJsonParse(aiResponse) {
  try {
    let cleaned = aiResponse.replace(/```json/g, "").replace(/```/g, "").trim();
    cleaned = cleaned.replace(/,\s*]$/, "]");
    if (cleaned.startsWith("[") && !cleaned.endsWith("]")) cleaned += "]";
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("❌ JSON parse error:", err.message, "\nRaw:", aiResponse);
    return [];
  }
}

// ----- Batch translate -----
async function batchTranslate(texts, targetLang = "en") {
  if (!texts || !Array.isArray(texts) || texts.length === 0) return [];
  const filteredTexts = texts.map(t => t ? String(t) : "").filter(t => t.length > 0);
  if (filteredTexts.length === 0) return texts.map(() => ""); // fallback

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: `Bạn là công cụ dịch. Dịch danh sách sang ${targetLang}. Trả về JSON array.` },
      { role: "user", content: JSON.stringify(filteredTexts) }
    ],
    temperature: 0,
  });
  return safeJsonParse(response.choices[0].message.content.trim());
}

// ----- AI so sánh job titles -----
async function aiMatchTitle(jdTitle, userTitles) {
  if (!jdTitle || !userTitles || !Array.isArray(userTitles) || userTitles.length === 0) return [];
  const filteredTitles = userTitles.map(t => t ? String(t) : "").filter(t => t.length > 0);
  if (filteredTitles.length === 0) return userTitles.map(() => false);

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Bạn là AI so sánh job titles. Trả về JSON array boolean, true nếu tương đồng, false nếu không.`
      },
      {
        role: "user",
        content: `JD title: "${jdTitle}"\nUser titles: ${JSON.stringify(filteredTitles)}`
      }
    ],
    temperature: 0,
  });
  return safeJsonParse(response.choices[0].message.content.trim());
}

// ----- Lấy embedding text -----
async function embedTexts(texts) {
  if (!texts || !Array.isArray(texts) || texts.length === 0) return [];
  const cleanTexts = texts.map(t => t ? String(t) : "").filter(t => t.length > 0);
  if (cleanTexts.length === 0) return texts.map(() => []); // fallback

  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: cleanTexts,
  });
  return response.data.map(item => item.embedding);
}

// ---- Dịch visa types (Excel + AI fallback) ----
function readExcel(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet);
  const map = {};
  data.forEach(row => {
    if (row.visa_type_en && row.visa_type_ja) {
      map[row.visa_type_en.toString().trim().toLowerCase()] = row.visa_type_ja.toString().trim();
    }
  });
  return map;
}

async function translateVisaAI(texts) {
  if (!texts || !Array.isArray(texts) || texts.length === 0) return [];
  const filteredTexts = texts.map(t => t ? String(t) : "").filter(t => t.length > 0);
  if (filteredTexts.length === 0) return texts;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Bạn là công cụ dịch. Dịch danh sách sang tiếng Nhật. Trả về JSON array." },
        { role: "user", content: JSON.stringify(filteredTexts) }
      ],
      temperature: 0,
    });
    return safeJsonParse(response.choices[0].message.content.trim());
  } catch (err) {
    console.error("❌ AI translation error:", err.message);
    return texts;
  }
}

async function translateVisaTypes(visaTypes, excelFilePath = './visa_types.xlsx') {
  if (!visaTypes || !Array.isArray(visaTypes) || visaTypes.length === 0) return [];
  const excelMap = readExcel(excelFilePath);
  const result = [];
  const toTranslate = [];

  visaTypes.forEach(visa => {
    const key = visa ? visa.toString().trim().toLowerCase() : "";
    if (excelMap[key]) {
      result.push(excelMap[key]);
    } else {
      result.push(null);
      toTranslate.push(visa);
    }
  });

  if (toTranslate.length > 0) {
    const aiTranslations = await translateVisaAI(toTranslate);
    let aiIndex = 0;
    result.forEach((val, idx) => {
      if (val === null) {
        result[idx] = aiTranslations[aiIndex] || toTranslate[aiIndex];
        aiIndex++;
      }
    });
  }

  return result;
}

// ---- Export tất cả ----
module.exports = { 
  batchTranslate, 
  aiMatchTitle, 
  embedTexts, 
  translateVisaTypes 
};
