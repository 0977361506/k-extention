// Test utility for space key detection
// Run this in browser console to test space key detection

(function() {
  'use strict';

  // Enable debug mode for space key detection
  localStorage.setItem('ktool-debug-space-key', 'true');
  
  console.log('🧪 K-Tool Space Key Detection Test');
  console.log('=====================================');
  
  // Test function to run all space key detection methods
  function testSpaceKeyDetection() {
    const results = {
      currentUrl: window.location.href,
      pathname: window.location.pathname,
      searchParams: Object.fromEntries(new URLSearchParams(window.location.search)),
      tests: []
    };
    
    console.log('Current URL:', results.currentUrl);
    console.log('Pathname:', results.pathname);
    
    // Test 1: URL Pattern matching
    const urlPatterns = [
      { name: 'Pattern 1: /spaces/SPACEKEY/', regex: /\/spaces\/([a-zA-Z0-9_\-~]+)(?:\/|$)/ },
      { name: 'Pattern 2: /wiki/spaces/SPACEKEY/', regex: /\/wiki\/spaces\/([a-zA-Z0-9_\-~]+)(?:\/|$)/ },
      { name: 'Pattern 3: /display/SPACEKEY/', regex: /\/display\/([a-zA-Z0-9_\-~]+)(?:\/|$)/ }
    ];
    
    urlPatterns.forEach(pattern => {
      const match = window.location.pathname.match(pattern.regex);
      const result = match ? match[1] : null;
      results.tests.push({
        method: pattern.name,
        result,
        success: !!result
      });
      console.log(`${result ? '✅' : '❌'} ${pattern.name}:`, result || 'No match');
    });
    
    // Test 2: URL Parameters
    const spaceKeyParam = new URLSearchParams(window.location.search).get('spaceKey') || 
                         new URLSearchParams(window.location.search).get('spacekey');
    results.tests.push({
      method: 'URL Parameter (spaceKey/spacekey)',
      result: spaceKeyParam,
      success: !!spaceKeyParam
    });
    console.log(`${spaceKeyParam ? '✅' : '❌'} URL Parameter:`, spaceKeyParam || 'Not found');
    
    // Test 3: Meta tag
    const metaSpaceKey = document.querySelector('meta[name="ajs-space-key"]');
    const metaContent = metaSpaceKey ? metaSpaceKey.getAttribute('content') : null;
    results.tests.push({
      method: 'Meta tag (ajs-space-key)',
      result: metaContent,
      success: !!metaContent
    });
    console.log(`${metaContent ? '✅' : '❌'} Meta tag:`, metaContent || 'Not found');
    
    // Test 4: AJS Global
    let ajsSpaceKey = null;
    try {
      if (window.AJS && window.AJS.Meta && window.AJS.Meta.get) {
        ajsSpaceKey = window.AJS.Meta.get('space-key');
      }
    } catch (e) {
      // AJS not available
    }
    results.tests.push({
      method: 'AJS.Meta.get("space-key")',
      result: ajsSpaceKey,
      success: !!ajsSpaceKey
    });
    console.log(`${ajsSpaceKey ? '✅' : '❌'} AJS Global:`, ajsSpaceKey || 'Not available');
    
    // Test 5: Confluence Object
    let confluenceSpaceKey = null;
    try {
      if (window.Confluence && window.Confluence.getContentId) {
        const pageInfo = window.Confluence.getContentId();
        confluenceSpaceKey = pageInfo && pageInfo.spaceKey;
      }
    } catch (e) {
      // Confluence not available
    }
    results.tests.push({
      method: 'Confluence.getContentId()',
      result: confluenceSpaceKey,
      success: !!confluenceSpaceKey
    });
    console.log(`${confluenceSpaceKey ? '✅' : '❌'} Confluence Object:`, confluenceSpaceKey || 'Not available');
    
    // Test 6: Breadcrumb links
    const breadcrumbLinks = Array.from(document.querySelectorAll('a[href*="/spaces/"]'));
    let breadcrumbSpaceKey = null;
    for (const link of breadcrumbLinks) {
      const href = link.getAttribute('href');
      if (href) {
        const match = href.match(/\/spaces\/([a-zA-Z0-9_\-~]+)(?:\/|$)/);
        if (match && match[1]) {
          breadcrumbSpaceKey = match[1];
          break;
        }
      }
    }
    results.tests.push({
      method: 'Breadcrumb links',
      result: breadcrumbSpaceKey,
      success: !!breadcrumbSpaceKey
    });
    console.log(`${breadcrumbSpaceKey ? '✅' : '❌'} Breadcrumb links:`, breadcrumbSpaceKey || 'Not found');
    console.log('  Available breadcrumb links:', breadcrumbLinks.map(l => l.getAttribute('href')));
    
    // Test 7: Data attributes
    const spaceDataElement = document.querySelector('[data-space-key]');
    const dataSpaceKey = spaceDataElement ? spaceDataElement.getAttribute('data-space-key') : null;
    results.tests.push({
      method: 'Data attribute (data-space-key)',
      result: dataSpaceKey,
      success: !!dataSpaceKey
    });
    console.log(`${dataSpaceKey ? '✅' : '❌'} Data attribute:`, dataSpaceKey || 'Not found');
    
    // Summary
    const successfulMethods = results.tests.filter(t => t.success);
    console.log('\n📊 SUMMARY:');
    console.log(`Total methods tested: ${results.tests.length}`);
    console.log(`Successful detections: ${successfulMethods.length}`);
    
    if (successfulMethods.length > 0) {
      console.log('🎉 Space key detected successfully!');
      console.log('Recommended space key:', successfulMethods[0].result);
      console.log('Working methods:', successfulMethods.map(m => m.method));
    } else {
      console.warn('⚠️ No space key detected by any method!');
      console.group('💡 Troubleshooting suggestions:');
      console.log('1. Are you on a Confluence page?');
      console.log('2. Check URL format - should contain /spaces/SPACEKEY/ or /display/SPACEKEY/');
      console.log('3. Wait for page to fully load');
      console.log('4. Check browser console for any errors');
      console.log('5. Try different Confluence pages in the same space');
      console.groupEnd();
    }
    
    // Additional debugging info
    console.group('🔍 Additional debugging info:');
    console.log('Current URL components:');
    console.log('  Protocol:', window.location.protocol);
    console.log('  Host:', window.location.host);
    console.log('  Pathname:', window.location.pathname);
    console.log('  Search:', window.location.search);
    console.log('  Hash:', window.location.hash);
    
    console.log('Meta tags containing "space":');
    const spaceMetas = Array.from(document.querySelectorAll('meta')).filter(meta => {
      const name = meta.getAttribute('name') || meta.getAttribute('property') || '';
      const content = meta.getAttribute('content') || '';
      return name.toLowerCase().includes('space') || content.toLowerCase().includes('space');
    });
    spaceMetas.forEach(meta => {
      console.log(`  ${meta.getAttribute('name') || meta.getAttribute('property')}: ${meta.getAttribute('content')}`);
    });
    
    console.log('Elements with space-related data attributes:');
    const spaceElements = document.querySelectorAll('[data-space-key], [data-space], [data-spacekey]');
    spaceElements.forEach(el => {
      console.log(`  ${el.tagName}:`, {
        'data-space-key': el.getAttribute('data-space-key'),
        'data-space': el.getAttribute('data-space'),
        'data-spacekey': el.getAttribute('data-spacekey')
      });
    });
    console.groupEnd();
    
    return results;
  }
  
  // Run the test
  const testResults = testSpaceKeyDetection();
  
  // Make results available globally for manual inspection
  window.ktoolSpaceKeyTestResults = testResults;
  console.log('\n💾 Test results saved to window.ktoolSpaceKeyTestResults');
  
  // Test the actual getCurrentSpaceKey function if available
  if (typeof getCurrentSpaceKey === 'function') {
    console.log('\n🎯 Testing actual getCurrentSpaceKey() function:');
    try {
      const detectedSpaceKey = getCurrentSpaceKey();
      console.log('Result:', detectedSpaceKey);
      if (detectedSpaceKey) {
        console.log('✅ getCurrentSpaceKey() working correctly!');
      } else {
        console.warn('❌ getCurrentSpaceKey() returned null');
      }
    } catch (error) {
      console.error('💥 Error calling getCurrentSpaceKey():', error);
    }
  } else {
    console.log('\n⚠️ getCurrentSpaceKey() function not available in this context');
    console.log('This test is running in isolation. In the actual extension, the function should work.');
  }
  
  // Disable debug mode after test
  localStorage.removeItem('ktool-debug-space-key');
  
  console.log('\n✅ Space key detection test completed!');
  console.log('=====================================');
})();
