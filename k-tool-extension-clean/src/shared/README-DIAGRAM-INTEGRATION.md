# Diagram Integration for K-Tool Extension

## Overview

This update adds complete diagram processing functionality to the `createPage` function in `shared/api.js`, making it identical to the `createPageFromGeneratedContent` function in the extension directory.

## Files Added/Modified

### New Files:
- `diagramUtils.js` - Diagram processing utilities
- `test-diagram-integration.js` - Test file for diagram functionality
- `README-DIAGRAM-INTEGRATION.md` - This documentation

### Modified Files:
- `api.js` - Updated `createPage` function with diagram processing

## Key Features

### 1. Diagram Extraction
- Extracts mermaid diagrams from Confluence storage format
- Supports both CDATA and plain text diagram code
- Sequential naming: `k-tool-diagram-1`, `k-tool-diagram-2`, etc.

### 2. Diagram Conversion
- Converts mermaid code to SVG using mermaid.js
- Converts SVG to PNG using HTML5 Canvas
- Handles different mermaid.render return types
- Fallback PNG for failed conversions

### 3. API Integration
- Saves diagrams to `/rest/mermaidrest/1.0/mermaid/{pageId}`
- Sequential processing to avoid API overload
- Comprehensive error handling and reporting

### 4. User Feedback
- Progress logging for each step
- Success/failure counts in final message
- Error details for troubleshooting

## Usage

The `createPage` function now automatically:

1. Creates the Confluence page
2. Extracts diagrams from the content
3. Converts diagrams to SVG/PNG
4. Uploads diagrams to mermaid-cloud API
5. Reports results to user

```javascript
// Example usage (same as before, but now with diagram processing)
const result = await ConfluenceApi.createPage(
  'My Document Title',
  storageFormatContent, // Can contain mermaid macros
  'SPACE_KEY',
  parentPageId // optional
);
```

## Diagram Format Support

The system supports mermaid diagrams in Confluence storage format:

```xml
<ac:structured-macro ac:name="mermaid" ac:schema-version="1" ac:macro-id="111">
  <ac:parameter ac:name="displayMode">default</ac:parameter>
  <ac:plain-text-body><![CDATA[graph TD
    A[Start] --> B[End]]]></ac:plain-text-body>
</ac:structured-macro>
```

## Testing

Run tests in browser console:

```javascript
// Load the test file and run
import('./test-diagram-integration.js').then(module => {
  module.runAllTests();
});

// Or use the global object (if available)
window.testDiagramIntegration.runAllTests();
```

## Error Handling

The system includes comprehensive error handling:

- **Diagram extraction errors**: Logged but don't stop page creation
- **Conversion errors**: Fallback PNG provided
- **API errors**: Detailed error messages in final report
- **Network errors**: Retry logic and timeout handling

## Dependencies

- **mermaid.js**: Loaded dynamically from CDN
- **HTML5 Canvas**: For SVG to PNG conversion
- **Fetch API**: For mermaid-cloud API calls

## Compatibility

- Works in all modern browsers
- Compatible with existing K-Tool extension code
- No breaking changes to existing API

## Performance Considerations

- Diagrams processed sequentially to avoid API overload
- 500ms delay between diagram uploads
- Canvas cleanup to prevent memory leaks
- Dynamic mermaid.js loading (only when needed)

## Troubleshooting

### Common Issues:

1. **Mermaid not loading**: Check network connectivity and CDN availability
2. **Canvas errors**: Ensure browser supports HTML5 Canvas
3. **API errors**: Check Confluence permissions and mermaid-cloud plugin
4. **Diagram not rendering**: Verify mermaid syntax is correct

### Debug Information:

All operations are logged with detailed information:
- `🎨` Diagram conversion steps
- `💾` API upload attempts
- `📊` Final statistics
- `❌` Error details

## Future Enhancements

Potential improvements:
- Batch diagram upload API
- Diagram caching
- Custom diagram themes
- Progress indicators for large documents
- Diagram preview before upload
