# K-Tool Extension - Clean Version

## Mô tả
Extension Chrome đơn giản với 2 chức năng chính:
1. **Auto Configuration**: Cấu hình extension khi click icon trên Chrome navbar
2. **Document Generation**: Sinh tài liệu tự động từ BA content

## Cấu trúc thư mục

```
k-tool-extension-clean/
├── src/
│   ├── popup/                 # Popup settings khi click icon
│   │   ├── popup.html
│   │   ├── popup.js
│   │   └── popup.css
│   ├── content/              # Content script cho tính năng sinh tài liệu
│   │   ├── content.js
│   │   └── content.css
│   ├── background/           # Background script
│   │   └── background.js
│   ├── shared/              # Shared utilities
│   │   ├── storage.js
│   │   ├── api.js
│   │   └── constants.js
│   └── assets/              # Static assets
│       ├── icon.png
│       └── styles/
├── demo/                    # Demo page để test extension
│   ├── index.html
│   ├── demo.css
│   └── demo.js
├── dist/                    # Build output
├── manifest.json
├── package.json
├── webpack.config.js
└── README.md
```

## Chức năng chính

### 1. Auto Configuration (Popup Settings)
- Hiển thị popup khi click icon extension
- Cấu hình API key, URL template, custom prompt
- Lưu settings vào Chrome storage
- Giao diện đơn giản, dễ sử dụng

### 2. Document Generation
- Inject vào trang Confluence
- Hiển thị bubble button để mở tool
- Sinh tài liệu từ BA content sử dụng AI
- Preview và tạo trang Confluence mới

## Cài đặt và sử dụng

1. Build extension: `npm run build`
2. Load unpacked extension trong Chrome
3. Cấu hình settings qua popup
4. Sử dụng trên trang Confluence

## Công nghệ sử dụng

- Vanilla JavaScript (không React để đơn giản)
- Chrome Extension Manifest V3
- Webpack cho build
- CSS3 cho styling
