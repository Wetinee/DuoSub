// Function to update the extension icon based on website suitability
function updateIcon(tabId, isSuitable) {
  // Define icon paths for multiple resolutions
  const iconPaths = isSuitable
    ? {
        16: "icons/icon16_transparent.png",
        48: "icons/icon48_transparent.png",
        128: "icons/icon128_transparent.png",
      }
    : {
        16: "icons/icon16_gray_transparent.png",
        48: "icons/icon48_gray_transparent.png",
        128: "icons/icon128_gray_transparent.png",
      };

  // Set the icon for the specific tab
  chrome.action.setIcon({ path: iconPaths, tabId }, () => {
    if (chrome.runtime.lastError) {
      console.error(
        `Failed to set icon for tab ${tabId}:`,
        chrome.runtime.lastError,
      );
    }
  });
}

// Function to check if a website is suitable
function isSuitableWebsite(url) {
  return (
    url.includes("www.youtube.com/watch?v=") ||
    url.includes("www.youtube.com/shorts")
  );
}

// Listener for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    const suitable = isSuitableWebsite(tab.url);
    updateIcon(tabId, suitable);
  }
});

// Listener for tab switching
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab.url) {
      const suitable = isSuitableWebsite(tab.url);
      updateIcon(activeInfo.tabId, suitable);
    }
  });
});
