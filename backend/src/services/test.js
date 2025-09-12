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

// Test
console.log(calculateContractEndDate("2025-09-11", "2 năm 3 tháng")); // 2027-12-11
console.log(calculateContractEndDate("11/09/2025", "1 năm")); // 2026-09-11
console.log(calculateContractEndDate("11-09-25", "6 tháng")); // 2026-03-11
