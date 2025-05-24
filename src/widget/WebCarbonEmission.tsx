import React, { useEffect, useState } from 'react';
import { getStorage } from '../util';

const WebCarbonEmission = () => {
  const [pageVisits, setPageVisits] = useState(0);
  const [webSearches, setWebSearches] = useState(0);
  const [totalEmission, setTotalEmission] = useState(0);

  useEffect(() => {
    async function fetchData() {
      const visits = (await getStorage<number>('pageVisits')) || 0;
      const searches = (await getStorage<number>('webSearches')) || 0;

      setPageVisits(visits);
      setWebSearches(searches);

      const emission = (searches * 0.2) + (visits * 0.6);
      setTotalEmission(Number(emission.toFixed(2)));
    }

    fetchData();
  }, []);

  return (
    <div className="p-4 rounded-xl bg-white shadow-md">
      <h2 className="text-xl font-bold mb-2">Web Carbon Emission</h2>
      <p>🔍 Web Searches: {webSearches}</p>
      <p>📄 Page Visits: {pageVisits}</p>
      <p>🌱 Total Emission: {totalEmission} gCO₂</p>
    </div>
  );
};

export default WebCarbonEmission;
