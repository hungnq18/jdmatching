# Hướng dẫn cài đặt hệ thống phân tích JD bằng AI

## Yêu cầu hệ thống
- Node.js >= 16
- MongoDB
- OpenAI API Key

## Cài đặt Backend

1. Di chuyển vào thư mục backend:
```bash
cd backend
```

2. Cài đặt dependencies:
```bash
npm install
```

3. Tạo file `.env` trong thư mục backend:
```env
# Database
MONGODB_URI=mongodb://localhost:27017/c-soft

# OpenAI API
OPENAI_API_KEY=your-openai-api-key-here

# Server
PORT=3000
NODE_ENV=development
```

4. Khởi động MongoDB (nếu chưa chạy)

5. Khởi động backend:
```bash
npm start
```

## Cài đặt Frontend

1. Di chuyển vào thư mục frontend:
```bash
cd frontend
```

2. Cài đặt dependencies:
```bash
npm install
```

3. Tạo file `.env` trong thư mục frontend:
```env
REACT_APP_API_URL=http://localhost:3000
```

4. Khởi động frontend:
```bash
npm run dev
```

## Cách sử dụng

1. Truy cập http://localhost:5173 (hoặc port frontend)
2. Chuyển sang tab "Phân tích JD bằng AI"
3. Upload file JD (.txt) hoặc nhập text trực tiếp
4. Hệ thống sẽ sử dụng AI để phân tích và trích xuất thông tin
5. Xem kết quả phân tích và danh sách JD đã phân tích

## Tính năng

### Backend
- ✅ Service AI phân tích JD từ text thô
- ✅ API upload file JD
- ✅ API phân tích JD từ text
- ✅ Trích xuất yêu cầu ứng viên
- ✅ Lưu trữ kết quả phân tích
- ✅ CRUD operations cho JD

### Frontend
- ✅ Upload file JD (hỗ trợ .txt, .pdf, .doc, .docx)
- ✅ Nhập text JD trực tiếp
- ✅ Hiển thị kết quả phân tích
- ✅ Danh sách JD đã phân tích
- ✅ Tìm kiếm và phân trang
- ✅ Xem chi tiết JD
- ✅ Tích hợp vào JobList hiện có

## Lưu ý

- Hiện tại chỉ hỗ trợ file .txt cho upload. File PDF, DOC, DOCX sẽ được hỗ trợ trong phiên bản tiếp theo
- Cần có OpenAI API Key để sử dụng tính năng phân tích AI
- Đảm bảo MongoDB đang chạy trước khi khởi động backend
