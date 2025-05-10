// State management
let currentApiCalls = [];
let currentCallIndex = 0;

// DOM Elements
const totalRequestsElement = document.querySelector('#total-requests span');
const callIndexElement = document.getElementById('call-index');
const prevCallButton = document.getElementById('prev-call');
const nextCallButton = document.getElementById('next-call');
const refreshButton = document.getElementById('refresh-btn');
const noCallsMessage = document.getElementById('no-calls-message');
const apiCallsContainer = document.getElementById('api-calls-container');
const responseTimeElement = document.getElementById('response-time');
const statusCodeElement = document.getElementById('status-code');
const httpMethodElement = document.getElementById('http-method');
const apiUrlElement = document.getElementById('api-url');
// const allInfoElement = document.getElementById('all-info');

// Load API call data when popup opens
document.addEventListener('DOMContentLoaded', loadApiCalls);

// Button event listeners
prevCallButton.addEventListener('click', showPreviousCall);
nextCallButton.addEventListener('click', showNextCall);
refreshButton.addEventListener('click', loadApiCalls);

// Format response time nicely
function formatResponseTime(ms) {
  if (ms < 1000) {
    return `${ms.toFixed(0)}ms`;
  } else {
    return `${(ms / 1000).toFixed(2)}s`;
  }
}

// Format URL for display
function formatUrl(url) {
  try {
    const urlObj = new URL(url);
    // Truncate any very long query params for display
    if (urlObj.search.length > 50) {
      return `${urlObj.origin}${urlObj.pathname}${urlObj.search.substring(0, 50)}...`;
    }
    return url;
  } catch (e) {
    return url;
  }
}

// Set status code with appropriate color
function setStatusCode(statusCode) {
  statusCodeElement.textContent = statusCode;
  
  // Remove any existing status classes
  statusCodeElement.classList.remove('status-success', 'status-warning', 'status-error');
  
  // Add appropriate class based on status code
  if (statusCode >= 200 && statusCode < 300) {
    statusCodeElement.classList.add('status-success');
  } else if (statusCode >= 300 && statusCode < 400) {
    statusCodeElement.classList.add('status-warning');
  } else {
    statusCodeElement.classList.add('status-error');
  }
}

// Load API calls from background script
function loadApiCalls() {
  chrome.runtime.sendMessage({ action: "getApiCalls" }, (response) => {
    if (response && response.apiCalls) {
      currentApiCalls = response.apiCalls;
      totalRequestsElement.textContent = currentApiCalls.length;
      
      if (currentApiCalls.length > 0) {
        noCallsMessage.classList.add('hidden');
        apiCallsContainer.classList.remove('hidden');
        
        // Reset to first call (the slowest)
        currentCallIndex = 0;
        updateCallDisplay();
      } else {
        noCallsMessage.classList.remove('hidden');
        apiCallsContainer.classList.add('hidden');
        
        // Update navigation UI
        prevCallButton.disabled = true;
        nextCallButton.disabled = true;
        callIndexElement.textContent = 'Call 0 of 0';
      }
    }
  });
}

// Show previous API call in the list
function showPreviousCall() {
  if (currentCallIndex > 0) {
    currentCallIndex--;
    updateCallDisplay();
  }
}

// Show next API call in the list
function showNextCall() {
  if (currentCallIndex < currentApiCalls.length - 1) {
    currentCallIndex++;
    updateCallDisplay();
  }
}

// Update the display with current API call data
function updateCallDisplay() {
  if (currentApiCalls.length === 0) {
    return;
  }
  
  const currentCall = currentApiCalls[currentCallIndex];
  
  // Update navigation controls
  prevCallButton.disabled = currentCallIndex === 0;
  nextCallButton.disabled = currentCallIndex === currentApiCalls.length - 1;
  callIndexElement.textContent = `Call ${currentCallIndex + 1} of ${currentApiCalls.length}`;
  
  // Update call details
  responseTimeElement.textContent = formatResponseTime(currentCall.responseTime);
  setStatusCode(currentCall.statusCode || 0);
  httpMethodElement.textContent = currentCall.method || 'GET';
  
  // Set the full URL as both text and title (for tooltip on hover)
  apiUrlElement.textContent = currentCall.url;
  apiUrlElement.title = currentCall.url;
  
  // Create a string with all information
//   const allInfo = `Method: ${currentCall.method || 'GET'}
// URL: ${currentCall.url}
// Response Time: ${formatResponseTime(currentCall.responseTime)}
// Status Code: ${currentCall.statusCode || 0}
// Content Type: ${currentCall.contentType || 'Unknown'}`;
  
  // Additional: highlight extremely slow calls (> 1 second)
  // if (currentCall.responseTime > 1000) {
  //   responseTimeElement.style.color = '#e74c3c'; // Red
  //   responseTimeElement.classList.add('status-error');
  //   responseTimeElement.classList.remove('status-warning', 'status-success');
  // } else if (currentCall.responseTime > 500) {
  //   responseTimeElement.style.color = '#f39c12'; // Orange
  //   responseTimeElement.classList.add('status-warning');
  //   responseTimeElement.classList.remove('status-error', 'status-success');
  // } else {
  //   responseTimeElement.style.color = '#2ecc71'; // Green
  //   responseTimeElement.classList.add('status-success');
  //   responseTimeElement.classList.remove('status-error', 'status-warning');
  // }
}

// Copy text to clipboard function
function copyToClipboard(elementId) {
  const element = document.getElementById(elementId);
  const text = element.textContent;
  
  navigator.clipboard.writeText(text).then(() => {
    // Visual feedback for copy action
    const button = element.nextElementSibling;
    button.classList.add('copied');
    
    // Remove the copied class after animation completes
    setTimeout(() => {
      button.classList.remove('copied');
    }, 1000);
    
    // Update tooltip text temporarily
    const tooltip = button.querySelector('.tooltiptext');
    const originalText = tooltip.textContent;
    tooltip.textContent = 'Copied!';
    
    // Restore original tooltip text
    setTimeout(() => {
      tooltip.textContent = originalText;
    }, 1500);
  });
}
