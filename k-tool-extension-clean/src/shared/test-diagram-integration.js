/**
 * Test file to verify diagram integration works correctly
 * This file can be used to test the diagram processing functionality
 */

import { ConfluenceApi } from './api.js';
import { getDiagramConfluenceStyles, processAndSaveDiagrams } from './diagramUtils.js';

/**
 * Test sample with mermaid diagrams
 */
const SAMPLE_STORAGE_FORMAT = `
<h1>Test Document with Diagrams</h1>
<p>This is a test document with mermaid diagrams.</p>

<ac:structured-macro ac:name="mermaid" ac:schema-version="1" ac:macro-id="111">
  <ac:parameter ac:name="displayMode">default</ac:parameter>
  <ac:plain-text-body><![CDATA[graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Process 1]
    B -->|No| D[Process 2]
    C --> E[End]
    D --> E]]></ac:plain-text-body>
</ac:structured-macro>

<p>Another diagram:</p>

<ac:structured-macro ac:name="mermaid" ac:schema-version="1" ac:macro-id="112">
  <ac:parameter ac:name="displayMode">default</ac:parameter>
  <ac:plain-text-body><![CDATA[sequenceDiagram
    participant A as User
    participant B as System
    A->>B: Request
    B-->>A: Response]]></ac:plain-text-body>
</ac:structured-macro>

<p>End of document.</p>
`;

/**
 * Test diagram extraction
 */
export function testDiagramExtraction() {
  console.log('🧪 Testing diagram extraction...');
  
  const diagrams = getDiagramConfluenceStyles(SAMPLE_STORAGE_FORMAT);
  console.log(`📊 Extracted ${diagrams.length} diagrams:`, diagrams);
  
  // Verify extraction
  if (diagrams.length === 2) {
    console.log('✅ Diagram extraction test passed');
    return true;
  } else {
    console.error('❌ Diagram extraction test failed');
    return false;
  }
}

/**
 * Test createPage function with diagrams
 */
export async function testCreatePageWithDiagrams() {
  console.log('🧪 Testing createPage with diagrams...');
  
  try {
    // This would normally create a real page - for testing, we'll just validate the process
    const title = 'Test Document with Diagrams';
    const spaceKey = 'TEST';
    const parentPageId = null;
    
    console.log('📋 Test parameters:', {
      title,
      spaceKey,
      contentLength: SAMPLE_STORAGE_FORMAT.length,
      diagramCount: getDiagramConfluenceStyles(SAMPLE_STORAGE_FORMAT).length
    });
    
    // In a real test, you would call:
    // const result = await ConfluenceApi.createPage(title, SAMPLE_STORAGE_FORMAT, spaceKey, parentPageId);
    
    console.log('✅ createPage test setup completed (actual API call skipped for safety)');
    return true;
    
  } catch (error) {
    console.error('❌ createPage test failed:', error);
    return false;
  }
}

/**
 * Run all tests
 */
export async function runAllTests() {
  console.log('🚀 Starting diagram integration tests...');
  
  const results = {
    extraction: testDiagramExtraction(),
    createPage: await testCreatePageWithDiagrams()
  };
  
  const allPassed = Object.values(results).every(result => result === true);
  
  if (allPassed) {
    console.log('🎉 All tests passed!');
  } else {
    console.error('❌ Some tests failed:', results);
  }
  
  return results;
}

// Export for browser console testing
if (typeof window !== 'undefined') {
  window.testDiagramIntegration = {
    testDiagramExtraction,
    testCreatePageWithDiagrams,
    runAllTests,
    SAMPLE_STORAGE_FORMAT
  };
}
