# Contract Filter API Documentation

## Tổng quan
API này cho phép lọc và quản lý ứng viên dựa trên thời gian hợp đồng còn lại.

## Endpoints

### 1. Lấy ứng viên còn 1 năm hợp đồng
```
GET /api/contracts/one-year
```

**Query Parameters:**
- `company` (optional): Lọc theo tên công ty
- `jobTitle` (optional): Lọc theo chức vụ
- `limit` (optional): Giới hạn số lượng kết quả (mặc định: 100)
- `skip` (optional): Bỏ qua số lượng kết quả (mặc định: 0)

**Response:**
```json
{
  "success": true,
  "message": "Users with 1 year contract remaining retrieved successfully",
  "data": {
    "users": [
      {
        "_id": "...",
        "fullName": "Nguyễn Văn A",
        "jobTitle": "Đầu bếp",
        "receivingCompany": "ABC Company",
        "entryDate": "Tháng 7 năm 2026",
        "contractDuration": "3 năm",
        "contractEndDate": "2029-07-01T00:00:00.000Z",
        "yearsRemaining": 0.8,
        "daysRemaining": 292
      }
    ],
    "statistics": {
      "total": 25,
      "byCompany": {
        "ABC Company": 10,
        "XYZ Corp": 15
      },
      "byJobTitle": {
        "Đầu bếp": 8,
        "Thợ hàn": 12,
        "Công nhân": 5
      },
      "byExpiryPeriod": {
        "within30Days": 2,
        "within90Days": 5,
        "within6Months": 12,
        "within1Year": 25
      },
      "averageYearsRemaining": 0.6
    }
  },
  "total": 25
}
```

### 2. Lấy ứng viên sắp hết hợp đồng (3 tháng)
```
GET /api/contracts/expiring-soon
```

**Query Parameters:** Tương tự như endpoint trên

**Response:** Tương tự như endpoint trên nhưng chỉ trả về ứng viên có hợp đồng hết hạn trong vòng 3 tháng.

### 3. Lọc ứng viên theo thời gian tùy chỉnh
```
GET /api/contracts/filter
```

**Query Parameters:**
- `maxYears` (optional): Số năm tối đa còn lại (mặc định: 1)
- `minYears` (optional): Số năm tối thiểu còn lại (mặc định: 0)
- `company` (optional): Lọc theo tên công ty
- `jobTitle` (optional): Lọc theo chức vụ
- `limit` (optional): Giới hạn số lượng kết quả
- `skip` (optional): Bỏ qua số lượng kết quả

**Example:**
```
GET /api/contracts/filter?maxYears=0.5&minYears=0.25&company=ABC
```

### 4. Xuất danh sách ra CSV
```
POST /api/contracts/export
```

**Request Body:**
```json
{
  "maxYears": 1,
  "minYears": 0,
  "company": "ABC Company",
  "jobTitle": "Đầu bếp",
  "filename": "contract_users_2024.csv"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Users exported to CSV successfully",
  "data": {
    "filename": "contract_users_2024.csv",
    "filePath": "/uploads/contract_users_2024.csv",
    "userCount": 25,
    "statistics": { ... }
  }
}
```

### 5. Lấy thống kê hợp đồng
```
GET /api/contracts/statistics
```

**Query Parameters:**
- `company` (optional): Lọc theo tên công ty
- `jobTitle` (optional): Lọc theo chức vụ

**Response:**
```json
{
  "success": true,
  "message": "Contract statistics retrieved successfully",
  "data": {
    "statistics": {
      "total": 150,
      "byCompany": { ... },
      "byJobTitle": { ... },
      "byExpiryPeriod": { ... },
      "averageYearsRemaining": 1.2
    },
    "totalUsers": 150,
    "filters": {
      "company": null,
      "jobTitle": null
    }
  }
}
```

## Sử dụng

### 1. Lấy tất cả ứng viên còn 1 năm hợp đồng
```javascript
const response = await fetch('/api/contracts/one-year');
const data = await response.json();
console.log(data.data.users);
```

### 2. Lọc theo công ty cụ thể
```javascript
const response = await fetch('/api/contracts/one-year?company=ABC Company');
const data = await response.json();
```

### 3. Lấy ứng viên sắp hết hợp đồng
```javascript
const response = await fetch('/api/contracts/expiring-soon');
const data = await response.json();
```

### 4. Lọc theo khoảng thời gian tùy chỉnh
```javascript
// Lấy ứng viên có hợp đồng hết hạn trong 6 tháng đến 1 năm
const response = await fetch('/api/contracts/filter?maxYears=1&minYears=0.5');
const data = await response.json();
```

### 5. Xuất ra CSV
```javascript
const response = await fetch('/api/contracts/export', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    maxYears: 1,
    minYears: 0,
    company: 'ABC Company'
  })
});
const data = await response.json();
console.log('CSV file:', data.data.filePath);
```

## Lưu ý

1. **Thời gian hợp đồng** được tính từ `entryDate` + `contractDuration`
2. **Format ngày** hỗ trợ: "Tháng X năm YYYY", "X/YYYY", "YYYY-MM"
3. **Thời gian hợp đồng** hỗ trợ: "X năm", "X tháng", "X years", "X months"
4. **Kết quả được sắp xếp** theo thời gian còn lại (gần hết hạn trước)
5. **CSV export** được lưu trong thư mục `/uploads/`

## Error Handling

Tất cả endpoints đều trả về response với format:
```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error information"
}
```

## Rate Limiting

API này không có rate limiting riêng, sử dụng rate limiting chung của server.
