import { setStorage, getStorage } from './util';

export interface WebCarbonStats {
  totalVisits: number;
  totalSearches: number;
  totalCarbonEmissions: number;
  lastUpdated: number;
}

export const STORAGE_KEYS_WEB_SEARCH = {
    CARBON_STATS: 'carbon_tracker_stats_web_searches',
    DAILY_STATS: 'carbon_tracker_daily_stats_web_searches',
    WEEKLY_STATS: 'carbon_tracker_weekly_stats_web_searches',
    MONTHLY_STATS: 'carbon_tracker_monthly_stats_web_searches'
};

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
  try {
    const currentStats = await getStorage<WebCarbonStats>(STORAGE_KEYS_WEB_SEARCH.CARBON_STATS);
  
    await setStorage(STORAGE_KEYS_WEB_SEARCH.CARBON_STATS, {
      totalVisits: currentStats?.totalVisits! + 1,
      totalSearches: currentStats?.totalSearches!  || 0,
      totalCarbonEmissions: currentStats?.totalCarbonEmissions! + 0.6 || 0,
      lastUpdated: Date.now()
    });
    await updateTimeBasedStats(0,1);
  } catch (error) {
    console.error('Failed to update page visits:', error);
  }
}

async function updateSearches() {
  try {
    const currentStats = await getStorage<WebCarbonStats>(STORAGE_KEYS_WEB_SEARCH.CARBON_STATS);
    await setStorage(STORAGE_KEYS_WEB_SEARCH.CARBON_STATS, {
      totalVisits: currentStats?.totalVisits || 0,
      totalSearches: (currentStats?.totalSearches || 0) + 1,
      totalCarbonEmissions: currentStats?.totalCarbonEmissions! + 0.2 || 0,
      lastUpdated: Date.now()
    });
    await updateTimeBasedStats(1, 0);
  } catch (error) {
    console.error('Failed to update web searches:', error);
  }
}

async function updateTimeBasedStats(search: number = 0, visit: number = 0) {
  try {
    await updateDailyStats(search, visit);
    await updateWeeklyStats(search, visit);
    await updateMonthlyStats(search, visit);
  } catch (error) {
    console.error('Failed to update time-based stats:', error);
  }
}

async function updateDailyStats(search: number = 0, visit: number = 0) {
  const today = new Date().toISOString().split('T')[0];
  const dailyKey = `${STORAGE_KEYS_WEB_SEARCH.DAILY_STATS}_${today}`;
  try {
    const currentStats = await getStorage<WebCarbonStats>(dailyKey);
    await setStorage(dailyKey, {
      totalVisits: (currentStats?.totalVisits || 0) + visit,
      totalSearches: (currentStats?.totalSearches || 0) + search,
      totalCarbonEmissions: (currentStats?.totalCarbonEmissions || 0) + (visit * 0.6) + (search * 0.2),
      lastUpdated: Date.now()
    });
  } catch (error) {
    console.error('Failed to update daily stats:', error);
  }
}

async function updateWeeklyStats(search: number = 0, visit: number = 0) {
  const week = await getCurrentWeek();
  const weeklyKey = `${STORAGE_KEYS_WEB_SEARCH.WEEKLY_STATS}_${week}`;
  try {
    const currentStats = await getStorage<WebCarbonStats>(weeklyKey);
    await setStorage(weeklyKey, {
      totalVisits: (currentStats?.totalVisits || 0) + visit,
      totalSearches: (currentStats?.totalSearches || 0) + search,
      totalCarbonEmissions: (currentStats?.totalCarbonEmissions || 0) + (visit * 0.6) + (search * 0.2),
      lastUpdated: Date.now()
    });
  } catch (error) {
    console.error('Failed to update weekly stats:', error);
  }
}

async function updateMonthlyStats(search: number = 0, visit: number = 0) {
  const month = new Date().toISOString().split('T')[0].slice(0, 7);
  const monthlyKey = `${STORAGE_KEYS_WEB_SEARCH.MONTHLY_STATS}_${month}`;

  try {
    const currentStats = await getStorage<WebCarbonStats>(monthlyKey);
    await setStorage(monthlyKey, {
      totalVisits: (currentStats?.totalVisits || 0) + visit,
      totalSearches: (currentStats?.totalSearches || 0) + search,
      totalCarbonEmissions: (currentStats?.totalCarbonEmissions || 0) + (visit * 0.6) + (search * 0.2),
      lastUpdated: Date.now()
    });
  } catch (error) {
    console.error('Failed to update monthly stats:', error);
  }
}

async function getCurrentWeek(): Promise<string> {
  const date = new Date();
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
  return Math.ceil((days + startOfYear.getDay() + 1) / 7).toString() + `_${date.getFullYear()}`;
}