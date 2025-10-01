// Space Key Debugging Utility
// Giúp debug và troubleshoot space key detection issues

export interface SpaceKeyDebugInfo {
  currentUrl: string;
  pathname: string;
  searchParams: Record<string, string>;
  metaTags: Array<{name: string; content: string}>;
  ajsMetaAvailable: boolean;
  ajsSpaceKey: string | null;
  confluenceObjectAvailable: boolean;
  breadcrumbLinks: string[];
  dataAttributes: Record<string, string>;
  detectionResults: Array<{
    method: string;
    result: string | null;
    success: boolean;
  }>;
}

export function debugSpaceKeyDetection(): SpaceKeyDebugInfo {
  const debugInfo: SpaceKeyDebugInfo = {
    currentUrl: window.location.href,
    pathname: window.location.pathname,
    searchParams: {},
    metaTags: [],
    ajsMetaAvailable: false,
    ajsSpaceKey: null,
    confluenceObjectAvailable: false,
    breadcrumbLinks: [],
    dataAttributes: {},
    detectionResults: []
  };

  try {
    // 1. URL Search Parameters
    const urlParams = new URLSearchParams(window.location.search);
    for (const [key, value] of urlParams.entries()) {
      debugInfo.searchParams[key] = value;
    }

    // 2. Meta Tags
    const metaTags = document.querySelectorAll('meta');
    metaTags.forEach(meta => {
      const name = meta.getAttribute('name') || meta.getAttribute('property') || '';
      const content = meta.getAttribute('content') || '';
      if (name) {
        debugInfo.metaTags.push({ name, content });
      }
    });

    // 3. AJS Meta
    try {
      if (window.AJS && window.AJS.Meta && window.AJS.Meta.get) {
        debugInfo.ajsMetaAvailable = true;
        debugInfo.ajsSpaceKey = window.AJS.Meta.get('space-key');
      }
    } catch (e) {
      // AJS not available
    }

    // 4. Confluence Object
    try {
      if (window.Confluence) {
        debugInfo.confluenceObjectAvailable = true;
      }
    } catch (e) {
      // Confluence not available
    }

    // 5. Breadcrumb Links
    const breadcrumbLinks = document.querySelectorAll('a[href*="/spaces/"]');
    breadcrumbLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href) {
        debugInfo.breadcrumbLinks.push(href);
      }
    });

    // 6. Data Attributes
    const elementsWithSpaceData = document.querySelectorAll('[data-space-key], [data-space], [data-spacekey]');
    elementsWithSpaceData.forEach(element => {
      const spaceKey = element.getAttribute('data-space-key') || 
                       element.getAttribute('data-space') || 
                       element.getAttribute('data-spacekey');
      if (spaceKey) {
        debugInfo.dataAttributes[element.tagName.toLowerCase()] = spaceKey;
      }
    });

    // 7. Run all detection methods
    const detectionMethods = [
      {
        name: 'URL Pattern 1: /spaces/SPACEKEY/',
        test: () => window.location.pathname.match(/\/spaces\/([a-zA-Z0-9_\-~]+)(?:\/|$)/)?.[1] || null
      },
      {
        name: 'URL Pattern 2: /wiki/spaces/SPACEKEY/',
        test: () => window.location.pathname.match(/\/wiki\/spaces\/([a-zA-Z0-9_\-~]+)(?:\/|$)/)?.[1] || null
      },
      {
        name: 'URL Pattern 3: /display/SPACEKEY/',
        test: () => window.location.pathname.match(/\/display\/([a-zA-Z0-9_\-~]+)(?:\/|$)/)?.[1] || null
      },
      {
        name: 'URL Parameter: spaceKey',
        test: () => new URLSearchParams(window.location.search).get('spaceKey') || 
                    new URLSearchParams(window.location.search).get('spacekey')
      },
      {
        name: 'Meta Tag: ajs-space-key',
        test: () => document.querySelector('meta[name="ajs-space-key"]')?.getAttribute('content') || null
      },
      {
        name: 'AJS.Meta.get("space-key")',
        test: () => window.AJS?.Meta?.get('space-key') || null
      }
    ];

    detectionMethods.forEach(method => {
      try {
        const result = method.test();
        debugInfo.detectionResults.push({
          method: method.name,
          result,
          success: !!result
        });
      } catch (error) {
        debugInfo.detectionResults.push({
          method: method.name,
          result: `Error: ${error}`,
          success: false
        });
      }
    });

  } catch (error) {
    console.error('Error during space key debugging:', error);
  }

  return debugInfo;
}

export function logSpaceKeyDebugInfo(): void {
  const debugInfo = debugSpaceKeyDetection();
  
  console.group('🔍 Space Key Detection Debug Info');
  console.log('Current URL:', debugInfo.currentUrl);
  console.log('Pathname:', debugInfo.pathname);
  
  if (Object.keys(debugInfo.searchParams).length > 0) {
    console.log('URL Parameters:', debugInfo.searchParams);
  }
  
  console.log('AJS Available:', debugInfo.ajsMetaAvailable);
  if (debugInfo.ajsSpaceKey) {
    console.log('AJS Space Key:', debugInfo.ajsSpaceKey);
  }
  
  console.log('Confluence Object Available:', debugInfo.confluenceObjectAvailable);
  
  if (debugInfo.breadcrumbLinks.length > 0) {
    console.log('Breadcrumb Links:', debugInfo.breadcrumbLinks);
  }
  
  if (Object.keys(debugInfo.dataAttributes).length > 0) {
    console.log('Data Attributes:', debugInfo.dataAttributes);
  }
  
  console.log('Meta Tags with "space":', debugInfo.metaTags.filter(tag => 
    tag.name.toLowerCase().includes('space') || tag.content.toLowerCase().includes('space')
  ));
  
  console.group('Detection Method Results:');
  debugInfo.detectionResults.forEach(result => {
    const emoji = result.success ? '✅' : '❌';
    console.log(`${emoji} ${result.method}:`, result.result);
  });
  console.groupEnd();
  
  const successfulMethods = debugInfo.detectionResults.filter(r => r.success);
  if (successfulMethods.length > 0) {
    console.log(`🎉 ${successfulMethods.length} successful detection method(s)!`);
    console.log('Recommended space key:', successfulMethods[0].result);
  } else {
    console.warn('⚠️ No space key detected by any method!');
    console.group('💡 Troubleshooting Suggestions:');
    console.log('1. Check if you are on a Confluence page');
    console.log('2. Ensure URL contains space information (/spaces/SPACEKEY/ or /display/SPACEKEY/)');
    console.log('3. Wait for page to fully load');
    console.log('4. Check if Confluence version supports meta tags');
    console.log('5. Try refreshing the page');
    console.groupEnd();
  }
  
  console.groupEnd();
}

// Enhanced version of getCurrentSpaceKey with debug logging
export function getCurrentSpaceKeyWithDebug(): string | null {
  console.log('🔍 Starting space key detection...');
  
  try {
    const pathname = window.location.pathname;
    const href = window.location.href;
    
    console.log('Current URL:', href);
    console.log('Pathname:', pathname);
    
    // Method 1: URL patterns
    const patterns = [
      { name: 'Pattern 1', regex: /\/spaces\/([a-zA-Z0-9_\-~]+)(?:\/|$)/ },
      { name: 'Pattern 2', regex: /\/wiki\/spaces\/([a-zA-Z0-9_\-~]+)(?:\/|$)/ },
      { name: 'Pattern 3', regex: /\/display\/([a-zA-Z0-9_\-~]+)(?:\/|$)/ }
    ];
    
    for (const pattern of patterns) {
      const match = pathname.match(pattern.regex);
      if (match && match[1]) {
        console.log(`✅ Space key found using ${pattern.name}:`, match[1]);
        return match[1];
      }
    }
    
    // Method 2: URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const spaceKeyParam = urlParams.get('spaceKey') || urlParams.get('spacekey');
    if (spaceKeyParam) {
      console.log('✅ Space key found from URL parameter:', spaceKeyParam);
      return spaceKeyParam;
    }
    
    // Method 3: Meta tag
    const metaSpaceKey = document.querySelector('meta[name="ajs-space-key"]');
    if (metaSpaceKey) {
      const content = metaSpaceKey.getAttribute('content');
      if (content) {
        console.log('✅ Space key found from meta tag:', content);
        return content;
      }
    }
    
    // Method 4: AJS
    if (window.AJS && window.AJS.Meta && window.AJS.Meta.get) {
      const spaceKey = window.AJS.Meta.get('space-key');
      if (spaceKey) {
        console.log('✅ Space key found from AJS.Meta:', spaceKey);
        return spaceKey;
      }
    }
    
    // If all methods fail, log debug info
    console.warn('❌ All space key detection methods failed');
    logSpaceKeyDebugInfo();
    
    return null;
    
  } catch (error) {
    console.error('💥 Error during space key detection:', error);
    logSpaceKeyDebugInfo();
    return null;
  }
}
