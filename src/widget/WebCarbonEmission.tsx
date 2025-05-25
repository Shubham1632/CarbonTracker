import { useEffect, useState } from 'react';
import { getStorage } from '../util';
import { STORAGE_KEYS_WEB_SEARCH, WebCarbonStats } from '../background';

const WebCarbonEmission = () => {
  const [pageVisits, setPageVisits] = useState(0);
  const [webSearches, setWebSearches] = useState(0);
  const [totalEmission, setTotalEmission] = useState(0);

  useEffect(() => {
    async function fetchData() {
      const carbonStats = await getStorage<WebCarbonStats>(STORAGE_KEYS_WEB_SEARCH.CARBON_STATS);

      setPageVisits(carbonStats?.totalVisits || 0);
      setWebSearches(carbonStats?.totalSearches || 0);
      setTotalEmission(carbonStats?.totalCarbonEmissions || 0);
    }

    fetchData();
  }, []);

  return (
    <div className="p-4 rounded-xl bg-white shadow-md">
      <h2 className="text-xl font-bold mb-2">Web Carbon Emission</h2>
      <p>🔍 Web Searches: {webSearches}</p>
      <p>📄 Page Visits: {pageVisits}</p>
      <p>🌱 Total Emission: {totalEmission.toFixed(4)} gCO₂</p>
    </div>
  );
};

export default WebCarbonEmission;
