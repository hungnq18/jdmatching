# Hướng dẫn tính toán thời gian hợp đồng còn lại

## 📋 Tổng quan

Hệ thống tính toán thời gian hợp đồng còn lại dựa trên **ngày nhập cảnh** (`entryDate`) và **thời hạn hợp đồng** (`contractDuration`) của ứng viên.

## ⚠️ **QUAN TRỌNG: Phân biệt 2 khái niệm thời gian**

### 1. **Thời hạn hợp đồng ban đầu (`contractDuration`)**
- **Định nghĩa:** Thời gian cam kết làm việc ban đầu
- **Ví dụ:** "3 năm", "2 năm", "1 năm"
- **Đặc điểm:** Không thay đổi theo thời gian

### 2. **Thời gian còn lại (`yearsRemaining`)**
- **Định nghĩa:** Thời gian còn lại từ ngày hiện tại đến khi hợp đồng kết thúc
- **Công thức:** `Ngày kết thúc - Ngày hiện tại`
- **Đặc điểm:** Thay đổi theo thời gian, giảm dần

### 📊 **Ví dụ minh họa:**

**Ứng viên A (Tháng 7/2024, hợp đồng 3 năm):**
- **Thời hạn ban đầu:** 3 năm
- **Ngày hiện tại:** 23/9/2025
- **Thời gian còn lại:** 1.8 năm
- **Kết luận:** Hợp đồng ban đầu 3 năm, nhưng chỉ còn 1.8 năm nữa

## 🔢 Công thức tính toán

### 1. Tính ngày kết thúc hợp đồng

```
Ngày kết thúc = Ngày nhập cảnh + Thời hạn hợp đồng
```

**Ví dụ:**
- Ngày nhập cảnh: "Tháng 7 năm 2026"
- Thời hạn hợp đồng: "3 năm"
- Ngày kết thúc: "Tháng 7 năm 2029"

### 2. Tính thời gian còn lại

```
Thời gian còn lại = Ngày kết thúc - Ngày hiện tại
```

**Đơn vị tính:**
- **Năm:** `(endDate - now) / (1000 * 60 * 60 * 24 * 365)`
- **Ngày:** `(endDate - now) / (1000 * 60 * 60 * 24)`

## 📅 Các định dạng ngày được hỗ trợ

### 1. Định dạng tiếng Việt
```
"Tháng 7 năm 2026"
"Tháng 12 năm 2025"
"Tháng 1 năm 2027"
```

### 2. Định dạng số
```
"7/2026"     → Tháng 7 năm 2026
"12-2025"     → Tháng 12 năm 2025
"1/2027"      → Tháng 1 năm 2027
```

### 3. Định dạng ISO
```
"2026-07"     → Tháng 7 năm 2026
"2025/12"     → Tháng 12 năm 2025
"2027-01"     → Tháng 1 năm 2027
```

### 4. Định dạng ngày đầy đủ
```
"2026-07-15"  → Ngày 15 tháng 7 năm 2026
"15/07/2026"  → Ngày 15 tháng 7 năm 2026
```

## ⏰ Các định dạng thời hạn hợp đồng

### 1. Định dạng tiếng Việt
```
"3 năm"       → 3 năm
"6 tháng"     → 6 tháng
"2 năm 6 tháng" → 2 năm 6 tháng
```

### 2. Định dạng tiếng Anh
```
"3 years"     → 3 năm
"6 months"    → 6 tháng
"2 years 6 months" → 2 năm 6 tháng
```

## 🎯 Logic lọc ứng viên

### 1. Lọc "Còn 1 năm hợp đồng"
```javascript
// Chỉ lấy ứng viên có thời gian còn lại từ 0 đến 1 năm
if (diffYears >= 0 && diffYears <= 1) {
  // Thêm vào danh sách
}
```

### 2. Lọc "Sắp hết hạn (3 tháng)"
```javascript
// Chỉ lấy ứng viên có thời gian còn lại từ 0 đến 0.25 năm (3 tháng)
if (diffYears >= 0 && diffYears <= 0.25) {
  // Thêm vào danh sách
}
```

### 3. Lọc tùy chỉnh
```javascript
// Cho phép người dùng tự định nghĩa khoảng thời gian
if (diffYears >= minYears && diffYears <= maxYears) {
  // Thêm vào danh sách
}
```

## 📊 Phân loại trạng thái

### 1. Màu sắc và nhãn
```javascript
if (daysRemaining <= 30) {
  status = "Sắp hết hạn"     // Màu đỏ
} else if (daysRemaining <= 90) {
  status = "Cần chú ý"       // Màu vàng
} else if (daysRemaining <= 180) {
  status = "Còn ít thời gian" // Màu cam
} else {
  status = "Còn nhiều thời gian" // Màu xanh
}
```

### 2. Thống kê theo khoảng thời gian
```javascript
within30Days: 0,    // ≤ 30 ngày
within90Days: 0,    // ≤ 90 ngày
within6Months: 0,   // ≤ 180 ngày
within1Year: 0      // ≤ 365 ngày
```

## 🔍 Ví dụ tính toán cụ thể (Ngày hiện tại: 23/9/2025)

### Ví dụ 1: Ứng viên A
```
Ngày nhập cảnh: "Tháng 7 năm 2026"
Thời hạn hợp đồng: "3 năm"
Ngày hiện tại: "23/9/2025"

Tính toán:
- Ngày kết thúc: "Tháng 7 năm 2029"
- Thời gian còn lại: 3.8 năm
- Kết quả: KHÔNG được lọc (vì > 1 năm)
```

### Ví dụ 2: Ứng viên B
```
Ngày nhập cảnh: "Tháng 7 năm 2024"
Thời hạn hợp đồng: "3 năm"
Ngày hiện tại: "23/9/2025"

Tính toán:
- Ngày kết thúc: "Tháng 7 năm 2027"
- Thời gian còn lại: 1.8 năm
- Kết quả: KHÔNG được lọc (vì > 1 năm)
```

### Ví dụ 3: Ứng viên C
```
Ngày nhập cảnh: "Tháng 7 năm 2024"
Thời hạn hợp đồng: "2 năm"
Ngày hiện tại: "23/9/2025"

Tính toán:
- Ngày kết thúc: "Tháng 7 năm 2026"
- Thời gian còn lại: 0.8 năm (10 tháng)
- Kết quả: ĐƯỢC lọc (vì ≤ 1 năm)
- Trạng thái: "Còn ít thời gian" (> 90 ngày)
```

### Ví dụ 4: Ứng viên D
```
Ngày nhập cảnh: "Tháng 7 năm 2024"
Thời hạn hợp đồng: "1 năm"
Ngày hiện tại: "23/9/2025"

Tính toán:
- Ngày kết thúc: "Tháng 7 năm 2025"
- Thời gian còn lại: -0.2 năm (đã hết hạn)
- Kết quả: KHÔNG được lọc (vì < 0)
- Trạng thái: "Đã hết hạn"
```

### Ví dụ 5: Ứng viên E
```
Ngày nhập cảnh: "Tháng 10 năm 2024"
Thời hạn hợp đồng: "1 năm"
Ngày hiện tại: "23/9/2025"

Tính toán:
- Ngày kết thúc: "Tháng 10 năm 2025"
- Thời gian còn lại: 0.1 năm (1 tháng)
- Kết quả: ĐƯỢC lọc (vì ≤ 1 năm)
- Trạng thái: "Sắp hết hạn" (≤ 30 ngày)
```

### Ví dụ 6: Ứng viên F
```
Ngày nhập cảnh: "Tháng 12 năm 2024"
Thời hạn hợp đồng: "1 năm"
Ngày hiện tại: "23/9/2025"

Tính toán:
- Ngày kết thúc: "Tháng 12 năm 2025"
- Thời gian còn lại: 0.25 năm (3 tháng)
- Kết quả: ĐƯỢC lọc (vì ≤ 1 năm)
- Trạng thái: "Cần chú ý" (≤ 90 ngày)
```

## ⚠️ Xử lý lỗi và trường hợp đặc biệt

### 1. Dữ liệu thiếu
```javascript
if (!user.entryDate || !user.contractDuration) {
  continue; // Bỏ qua ứng viên này
}
```

### 2. Không parse được ngày
```javascript
const endDate = this.calculateContractEndDate(user.entryDate, user.contractDuration);
if (!endDate) {
  continue; // Bỏ qua ứng viên này
}
```

### 3. Hợp đồng đã hết hạn
```javascript
if (diffYears < 0) {
  // Hợp đồng đã hết hạn
  // Có thể xử lý riêng hoặc bỏ qua
}
```

## 🎨 Hiển thị kết quả

### 1. Định dạng thời gian
```javascript
// Nếu < 1 năm, hiển thị bằng tháng
if (years < 1) {
  const months = Math.round(years * 12);
  return `${months} tháng`;
}
// Nếu >= 1 năm, hiển thị bằng năm
return `${Math.round(years * 100) / 100} năm`;
```

### 2. Làm tròn số
```javascript
yearsRemaining: Math.round(diffYears * 100) / 100,  // 2 chữ số thập phân
daysRemaining: Math.round((endDate - now) / (1000 * 60 * 60 * 24))  // Số nguyên
```

## 🔄 Cập nhật thời gian thực

Hệ thống tính toán dựa trên **ngày hiện tại** (`new Date('2025-09-23')`), do đó:

### 📅 Ngày hiện tại: 23/9/2025

**Tác động của ngày hiện tại:**
- Mỗi lần truy cập sẽ có kết quả khác nhau
- Thời gian còn lại sẽ giảm dần theo thời gian
- Trạng thái có thể thay đổi (từ "Còn nhiều thời gian" → "Cần chú ý" → "Sắp hết hạn")

### 🎯 Phân tích theo ngày hiện tại (23/9/2025):

**Ứng viên sẽ được lọc nếu:**
- Hợp đồng kết thúc từ **23/9/2025** đến **23/9/2026**
- Tức là ngày nhập cảnh từ **23/9/2024** đến **23/9/2025** (với hợp đồng 1 năm)

**Ví dụ cụ thể:**
- Nhập cảnh: **Tháng 10/2024** + Hợp đồng **1 năm** = Kết thúc **Tháng 10/2025** → **ĐƯỢC lọc** (còn 1 tháng)
- Nhập cảnh: **Tháng 7/2024** + Hợp đồng **2 năm** = Kết thúc **Tháng 7/2026** → **ĐƯỢC lọc** (còn 10 tháng)
- Nhập cảnh: **Tháng 7/2024** + Hợp đồng **3 năm** = Kết thúc **Tháng 7/2027** → **KHÔNG lọc** (còn 1.8 năm)

## 📈 Tối ưu hóa hiệu suất

### 1. Sắp xếp kết quả
```javascript
// Sắp xếp theo thời gian còn lại (tăng dần)
filteredUsers.sort((a, b) => a.yearsRemaining - b.yearsRemaining);
```

### 2. Giới hạn kết quả
```javascript
// Chỉ lấy số lượng nhất định để tránh quá tải
const finalResults = filteredUsers.slice(0, limit);
```

### 3. Cache thống kê
```javascript
// Tính toán thống kê một lần và tái sử dụng
const stats = this.generateStatistics(finalResults);
```
