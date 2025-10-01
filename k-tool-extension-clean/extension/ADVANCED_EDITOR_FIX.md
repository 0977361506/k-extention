# Advanced Edit Tab - Fix Documentation

## Vấn đề đã được sửa

### 1. Lỗi không thể nhập text
**Nguyên nhân:** Vòng lặp vô hạn trong `useEffect` và `handleEditorChange` khiến content bị reset liên tục.

**Giải pháp:**
- Thêm state `isContentLoaded` để track việc load content
- Chỉ load content từ state khi component mới được mount hoặc khi chuyển từ tab khác
- Tránh override content khi user đang edit

### 2. Cải thiện TinyMCE Configuration
**Thay đổi:**
- Thêm `browser_spellcheck: true` để hỗ trợ spell check
- Thêm `entity_encoding: 'raw'` để xử lý HTML tốt hơn
- Thêm `forced_root_block: 'p'` để đảm bảo content structure
- Thêm logging chi tiết để debug

### 3. Enhanced Editor Initialization
**Cải tiến:**
- Thêm state `isEditorReady` để track editor initialization
- Thêm loading indicator khi editor đang load
- Force editor mode to 'design' và focus sau khi init
- Thêm error handling cho editor operations

### 4. Content Synchronization
**Giải pháp:**
- Sử dụng `chrome.storage.onChanged` listener để detect changes từ tab khác
- Reset content khi có thay đổi từ external source
- Thêm button "Reload Content" để force reload từ state

## Các tính năng mới

### 1. Test Editor Button
- Cho phép test editor bằng cách insert test content
- Giúp verify editor hoạt động đúng

### 2. Reload Content Button
- Force reload content từ state
- Hữu ích khi content bị out of sync

### 3. Enhanced Logging
- Console logs chi tiết cho debugging
- Track editor lifecycle events

## Cách sử dụng

1. **Mở Advanced Edit Tab**
2. **Editor sẽ tự động load content** từ state (nếu có)
3. **Bắt đầu edit** - content sẽ được lưu vào state real-time
4. **Sử dụng Test Editor** để verify editor hoạt động
5. **Sử dụng Reload Content** nếu content bị out of sync

## Technical Details

### State Management
```typescript
const [isContentLoaded, setIsContentLoaded] = useState(false);
const [isEditorReady, setIsEditorReady] = useState(false);
```

### Content Loading Logic
```typescript
useEffect(() => {
  if (state.generatedContent && !isContentLoaded) {
    // Load content from state
    setIsContentLoaded(true);
  }
}, [state.generatedContent, isContentLoaded]);
```

### Editor Change Handler
```typescript
const handleEditorChange = useCallback((content: string) => {
  setEditorContent(content);
  updateState({
    generatedContent: JSON.stringify({
      title: pageTitle,
      fullStorageFormat: content,
      lastModified: new Date().toISOString()
    }),
    hasUnsavedChanges: true
  });
}, [pageTitle, updateState]);
```

## Testing

1. **Test nhập text:** Gõ vào editor và verify content được lưu
2. **Test chuyển tab:** Chuyển sang tab khác rồi quay lại
3. **Test reload:** Sử dụng "Reload Content" button
4. **Test save:** Lưu version và verify không bị mất content

## Troubleshooting

### Nếu editor không nhập được text:
1. Kiểm tra console logs
2. Sử dụng "Test Editor" button
3. Sử dụng "Reload Content" button
4. Refresh page nếu cần

### Nếu content bị mất:
1. Kiểm tra state.generatedContent
2. Sử dụng "Reload Content" button
3. Verify không có lỗi trong console

## Files Modified

1. `src/components/confluence/AdvancedEditTab.tsx` - Main component
2. `src/components/confluence/AdvancedEditTab.module.scss` - Styles for loading state

## Build Status

✅ Build successful
✅ No TypeScript errors
✅ All dependencies resolved 