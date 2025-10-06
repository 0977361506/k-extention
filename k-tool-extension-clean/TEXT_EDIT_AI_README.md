# 📝 Text Edit AI Feature

## Tổng quan
Tính năng Text Edit AI cho phép bạn chỉnh sửa văn bản được bôi đen trên Confluence bằng AI chỉ với một cú click.

## 🚀 Cách sử dụng

### 1. Kích hoạt tính năng
- Tính năng tự động hoạt động khi bạn ở chế độ edit của Confluence
- Không cần cấu hình thêm gì

### 2. Chỉnh sửa văn bản
1. **Bôi đen văn bản**: Chọn đoạn văn bản bạn muốn chỉnh sửa
2. **Click nút Edit**: Nút "✏️ Edit with AI" sẽ xuất hiện gần văn bản được chọn
3. **Nhập prompt**: Mô tả cách bạn muốn chỉnh sửa văn bản
4. **Nhận kết quả**: AI sẽ xử lý và thay thế văn bản gốc

### 3. Các loại prompt hỗ trợ

#### 📝 Cải thiện văn phong
- `"make it formal"` - Chuyển sang văn phong trang trọng
- `"make it professional"` - Chuyển sang văn phong chuyên nghiệp
- `"fix grammar"` - Sửa lỗi ngữ pháp
- `"correct spelling"` - Sửa lỗi chính tả

#### 🌐 Dịch thuật
- `"translate to vietnamese"` - Dịch sang tiếng Việt
- `"translate to english"` - Dịch sang tiếng Anh

#### 📊 Tóm tắt và mở rộng
- `"summarize"` - Tóm tắt nội dung
- `"expand"` - Mở rộng nội dung
- `"elaborate"` - Giải thích chi tiết hơn

#### 📋 Định dạng
- `"convert to bullet points"` - Chuyển thành danh sách
- `"make it a list"` - Tạo danh sách có thứ tự

#### 🎯 Tùy chỉnh
- Bạn có thể nhập bất kỳ yêu cầu nào, ví dụ:
  - `"make it shorter"`
  - `"add more examples"`
  - `"make it sound more confident"`

## 🔧 Tính năng kỹ thuật

### Phát hiện chế độ edit
Hệ thống tự động phát hiện khi bạn đang ở chế độ edit Confluence thông qua:
- URL patterns (`/pages/editpage.action`, `mode=edit`)
- DOM elements (editor iframes, contenteditable areas)
- CSS classes và data attributes

### Xử lý văn bản
- **Selection API**: Sử dụng Web Selection API để lấy văn bản được chọn
- **Range API**: Thay thế văn bản chính xác tại vị trí được chọn
- **Fallback**: Copy vào clipboard nếu không thể thay thế trực tiếp

### UI/UX
- **Responsive design**: Hoạt động tốt trên mobile và desktop
- **Dark mode support**: Tự động thích ứng với chế độ tối
- **Accessibility**: Hỗ trợ keyboard navigation và screen readers

## 🧪 Testing

### Sử dụng Demo Page
1. Mở file `demo.html` trong trình duyệt
2. Click "Enable Edit Mode" để mô phỏng chế độ edit Confluence
3. Chọn văn bản và test các tính năng

### Test trên Confluence thực tế
1. Vào trang Confluence bất kỳ
2. Click "Edit" để vào chế độ chỉnh sửa
3. Chọn văn bản và sử dụng tính năng

## 🔍 Troubleshooting

### Nút Edit không xuất hiện
- **Kiểm tra chế độ edit**: Đảm bảo bạn đang ở chế độ edit của Confluence
- **Refresh trang**: Thử refresh trang và chọn lại văn bản
- **Check console**: Mở Developer Tools và xem có lỗi gì không

### Không thể thay thế văn bản
- **Permissions**: Một số editor có thể chặn việc thay đổi programmatically
- **Fallback**: Hệ thống sẽ copy kết quả vào clipboard
- **Manual paste**: Bạn có thể paste thủ công (Ctrl+V)

### API không hoạt động
- **Mock data**: Hiện tại sử dụng mock data để demo
- **Real API**: Cần tích hợp với API thực tế trong production

## 🚧 Phát triển tiếp

### Tích hợp API thực tế
```javascript
// Thay thế method callEditAPI trong textEditAI.js
async callEditAPI(originalText, prompt) {
  const response = await fetch('YOUR_AI_API_ENDPOINT', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_API_KEY'
    },
    body: JSON.stringify({
      text: originalText,
      instruction: prompt
    })
  });
  
  const result = await response.json();
  return result.editedText;
}
```

### Thêm tính năng mới
- **History**: Lưu lịch sử chỉnh sửa
- **Undo/Redo**: Hoàn tác thay đổi
- **Templates**: Prompt templates có sẵn
- **Batch edit**: Chỉnh sửa nhiều đoạn văn cùng lúc

## 📁 Cấu trúc file

```
src/content/mermaidAI/
├── textEditAI.js      # Main logic
├── textEditAI.css     # Styling
└── ...

demo.html              # Demo page
manifest.json          # Extension manifest (updated)
```

## 🤝 Đóng góp

Nếu bạn muốn cải thiện tính năng:
1. Fork repository
2. Tạo feature branch
3. Implement changes
4. Test thoroughly
5. Submit pull request

## 📞 Hỗ trợ

Nếu gặp vấn đề, vui lòng:
1. Check console logs
2. Test với demo page
3. Report issues với screenshots và error logs
