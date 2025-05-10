// Store network requests data
let apiCalls = {};
let tabApiCalls = {};

// Reset API calls data for a tab when it's refreshed or navigated
chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId === 0 && (details.transitionType === "reload" || details.transitionType === "link")) {
    tabApiCalls[details.tabId] = [];
  }
});

// Initialize tab's API call array if not exists
function ensureTabApiCallsExists(tabId) {
  if (!tabApiCalls[tabId]) {
    tabApiCalls[tabId] = [];
  }
}

// Listen for web requests to capture API calls
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.type === "xmlhttprequest" || isApiCall(details.url)) {
      ensureTabApiCallsExists(details.tabId);
      apiCalls[details.requestId] = {
        url: details.url,
        startTime: details.timeStamp,
        tabId: details.tabId,
        method: details.method
      };
    }
  },
  { urls: ["<all_urls>"] }
);

// Capture response headers to get status code
chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    if (apiCalls[details.requestId]) {
      apiCalls[details.requestId].statusCode = details.statusCode;
      
      // Find content type to further confirm if it's an API call
      const contentTypeHeader = details.responseHeaders?.find(h => 
        h.name.toLowerCase() === "content-type"
      );
      
      if (contentTypeHeader) {
        apiCalls[details.requestId].contentType = contentTypeHeader.value;
      }
    }
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);

// Record completed API calls with their response times
chrome.webRequest.onCompleted.addListener(
  (details) => {
    if (apiCalls[details.requestId]) {
      const call = apiCalls[details.requestId];
      call.endTime = details.timeStamp;
      call.responseTime = call.endTime - call.startTime;
      call.statusCode = details.statusCode;
      
      // Add to tab's API calls
      ensureTabApiCallsExists(details.tabId);
      tabApiCalls[details.tabId].push(call);
      
      // Sort the API calls by response time (slowest first)
      tabApiCalls[details.tabId].sort((a, b) => b.responseTime - a.responseTime);
      
      // Clean up
      delete apiCalls[details.requestId];
    }
  },
  { urls: ["<all_urls>"] }
);

// Also handle error case
chrome.webRequest.onErrorOccurred.addListener(
  (details) => {
    if (apiCalls[details.requestId]) {
      const call = apiCalls[details.requestId];
      call.endTime = details.timeStamp;
      call.responseTime = call.endTime - call.startTime;
      call.error = details.error;
      call.statusCode = 0; // Error status
      
      // Add to tab's API calls
      ensureTabApiCallsExists(details.tabId);
      tabApiCalls[details.tabId].push(call);
      
      // Sort the API calls by response time (slowest first)
      tabApiCalls[details.tabId].sort((a, b) => b.responseTime - a.responseTime);
      
      // Clean up
      delete apiCalls[details.requestId];
    }
  },
  { urls: ["<all_urls>"] }
);

// Simple heuristic to identify API calls
function isApiCall(url) {
  const apiPatterns = [
    /\/api\//i,
    /\.json$/i,
    /graphql/i,
    /\/v\d+\//i // API version pattern like /v1/
  ];
  
  return apiPatterns.some(pattern => pattern.test(url));
}

// Listen to messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getApiCalls") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        const tabId = tabs[0].id;
        sendResponse({ apiCalls: tabApiCalls[tabId] || [] });
      } else {
        sendResponse({ apiCalls: [] });
      }
    });
    return true; // Indicates async response
  }
});

// Clean up data for closed tabs
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabApiCalls[tabId]) {
    delete tabApiCalls[tabId];
  }
});
