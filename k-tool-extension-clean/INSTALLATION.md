# 🚀 K-Tool Extension - Hướng dẫn cài đặt và sử dụng

## 📋 Tổng quan

K-Tool Extension là một Chrome extension đơn giản với 2 chức năng chính:
1. **Auto Configuration**: Cấu hình extension khi click icon trên Chrome navbar
2. **Document Generation**: Sinh tài liệu tự động từ BA content

## 🛠️ Cài đặt Extension

### Bước 1: Build Extension
```bash
cd k-tool-extension-clean
npm install
npm run build
```

### Bước 2: Load Extension vào Chrome
1. Mở Chrome và truy cập `chrome://extensions/`
2. Bật **Developer mode** (góc trên bên phải)
3. Click **Load unpacked**
4. Chọn thư mục `k-tool-extension-clean/dist/`
5. Extension sẽ xuất hiện trong danh sách với icon K-Tool

### Bước 3: Kiểm tra Extension
- Icon K-Tool sẽ xuất hiện trên Chrome toolbar
- Click vào icon để mở popup settings
- Extension sẽ tự động inject vào các trang Confluence

## ⚙️ Cấu hình Extension

### Mở Settings
Click vào icon K-Tool trên Chrome toolbar để mở popup settings.

### Các trường cần cấu hình:

#### 1. **API Key** (Bắt buộc)
- API key của dịch vụ AI (Perplexity hoặc Google Gemini)
- Ví dụ: `pplx-abc123...` hoặc `AIza...`

#### 2. **AI Model** (Bắt buộc)
- Chọn model AI muốn sử dụng:
  - **Perplexity - Sonar Pro**: Mạnh về phân tích và tổng hợp thông tin
  - **Google - Gemini 2.0 Flash**: Nhanh và hiệu quả

#### 3. **URL Template** (Bắt buộc)
- URL template của tài liệu dự án
- Phải chứa `{endpoint}` để thay thế
- Ví dụ: `https://confluence.company.com/template/{endpoint}`

#### 4. **URL Tài liệu** (Bắt buộc)
- URL folder lưu tài liệu chi tiết
- Ví dụ: `https://confluence.company.com/spaces/DOC/pages/123456`

#### 5. **URL Database** (Bắt buộc)
- URL folder tài liệu database
- Ví dụ: `https://confluence.company.com/spaces/DB/pages/789012`

#### 6. **URL Instructions** (Tùy chọn)
- URL tài liệu hướng dẫn hệ thống
- Giúp AI hiểu rõ hơn về hệ thống

#### 7. **Custom Prompt AI** (Bắt buộc)
- Prompt tùy chỉnh cho AI
- Tối thiểu 10 ký tự
- Ví dụ: "Bạn là một Technical Writer chuyên nghiệp. Hãy phân tích yêu cầu từ BA và tạo tài liệu kỹ thuật chi tiết..."

### Auto Save
- Settings sẽ tự động lưu sau 1 giây khi có thay đổi
- Trạng thái lưu sẽ hiển thị ở đầu popup

## 🎯 Sử dụng Extension

### Trên trang Confluence:

1. **Mở trang BA document** cần sinh tài liệu
2. **Tìm bubble button K-Tool** ở góc dưới bên phải
3. **Click bubble** để mở tool sinh tài liệu

### Trong tool sinh tài liệu:

#### Tab "Sinh tài liệu":
1. **URL tài liệu BA**: Tự động điền URL hiện tại
2. **Ghi chú thêm**: Thêm yêu cầu đặc biệt (tùy chọn)
3. **Click "Tạo tài liệu"** để bắt đầu

#### Quá trình sinh tài liệu:
1. **Lấy nội dung BA**: Trích xuất content từ trang
2. **Clone template**: Sao chép cấu trúc template
3. **Phân tích placeholders**: Tìm các placeholder cần điền
4. **AI sinh tài liệu**: AI phân tích và tạo nội dung
5. **Hoàn thành**: Chuyển sang tab Preview

#### Tab "Preview":
1. **Xem trước** tài liệu đã sinh
2. **Tạo trang Confluence**: Tự động tạo trang mới
3. **Tải xuống**: Download file HTML

## 🧪 Test Extension

### Sử dụng Demo Page
1. Mở file `demo/index.html` trong browser
2. Load extension như hướng dẫn trên
3. Trang demo sẽ hiển thị trạng thái extension
4. Test các chức năng trên trang demo

### Debug Console
Mở Developer Tools (F12) để xem logs:
```javascript
// Kiểm tra extension
testKTool.checkExtension()

// Mở settings
testKTool.openSettings()

// Simulate generation
testKTool.simulateGeneration()
```

## 🔧 Troubleshooting

### Extension không xuất hiện
- Kiểm tra Developer mode đã bật
- Refresh trang `chrome://extensions/`
- Kiểm tra thư mục dist có đầy đủ file

### Popup không mở được
- Kiểm tra file `popup.html` trong dist
- Xem Console có lỗi JavaScript không
- Thử reload extension

### Bubble button không hiện
- Kiểm tra URL có match với manifest không
- Xem Console tab có lỗi content script
- Thử refresh trang

### Settings không lưu được
- Kiểm tra permission `storage` trong manifest
- Xem Console có lỗi Chrome storage API
- Thử reset extension

### Sinh tài liệu lỗi
- Kiểm tra API key đã đúng chưa
- Xem Network tab có request API không
- Kiểm tra backend service có chạy không

## 📁 Cấu trúc File

```
k-tool-extension-clean/
├── src/
│   ├── popup/           # Popup settings
│   ├── content/         # Content script
│   ├── background/      # Background script
│   ├── shared/          # Shared utilities
│   └── assets/          # Static assets
├── demo/                # Demo page
├── dist/                # Build output
├── manifest.json        # Extension manifest
├── package.json         # NPM config
├── webpack.config.js    # Webpack config
└── README.md           # Documentation
```

## 🚀 Development

### Build commands:
```bash
npm run build      # Production build
npm run dev        # Development build with watch
npm run clean      # Clean dist folder
```

### Webpack features:
- ES6 modules support
- Babel transpilation
- Source maps
- Auto copy assets

## 📞 Support

Nếu gặp vấn đề, hãy:
1. Kiểm tra Console logs
2. Xem Network requests
3. Thử với demo page
4. Reset extension settings

---

**Made with ❤️ by K-Tool Team**
