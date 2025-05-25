import React, { useEffect, useState } from 'react';
import { getStorage } from '../util';
import { CarbonTrackerStats } from '../content-script';

const emptyCarbonStats: CarbonTrackerStats = {
  totalTokens: 0,
  carbonEmissions: 0,
  userTokens: 0,
  assistantTokens: 0,
  userMessageCount: 0,
  sessionStartTime: 0
};

const ChatGPTCarbonEmission = () => {
  const [carbonStats, setCarbonStats] = useState<CarbonTrackerStats>(emptyCarbonStats);
  useEffect(() => {
    async function fetchData() {
      const getCarbonStats: CarbonTrackerStats = (await getStorage<CarbonTrackerStats>('carbon_tracker_stats')) || emptyCarbonStats;
      console.log('Carbon stats fetched:', getCarbonStats);
      setCarbonStats(getCarbonStats);
    }

    fetchData();
  }, []);

  return (
    <div className="p-4 rounded-xl bg-white shadow-md">
      <h2 className="text-xl font-bold mb-2">ChatGPT Carbon Emission</h2>
      <p>🔍 User Tokens: {carbonStats.userTokens}</p>
      <p>📄 Assistant Tokens: {carbonStats.assistantTokens}</p>
      <p>🌱 Total Emission: {carbonStats.carbonEmissions} gCO₂</p>
    </div>
  );
};

export default ChatGPTCarbonEmission;
