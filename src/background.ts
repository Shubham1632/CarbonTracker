import { setStorage, getStorage } from './util';

console.log('Background script loaded');

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    if (!isSearchUrl(tab.url)) {
      updateVisits();
    }
  }
});

chrome.webNavigation.onCompleted.addListener((details) => {
  if (isSearchUrl(details.url)) {
    updateSearches();
  }
});

function isSearchUrl(url: string | undefined): boolean {
  if (!url) return false;
  return (
    url.includes('google.com/search') ||
    url.includes('bing.com/search') ||
    url.includes('yahoo.com/search') || 
    url.includes('duckduckgo.com/') 
  );
}

async function updateVisits() {
  console.log('Updating page visits...');
  try {
    const current = (await getStorage<number>('pageVisits')) || 0;
    await setStorage('pageVisits', current + 1);
  } catch (error) {
    console.error('Failed to update page visits:', error);
  }
}

async function updateSearches() {
  console.log('Updating web searches...');
  try {
    const current = (await getStorage<number>('webSearches')) || 0;
    await setStorage('webSearches', current + 1);
  } catch (error) {
    console.error('Failed to update web searches:', error);
  }
}