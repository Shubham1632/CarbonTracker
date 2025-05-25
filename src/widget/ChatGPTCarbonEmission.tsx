import  { useEffect, useState } from 'react';
import { getStorage } from '../util';
import {  GlobalCarbonStats } from '../content-script';

const emptyGlobalStats: GlobalCarbonStats = {
  totalInputTokens: 0,
  totalOutputTokens: 0,
  totalCarbonEmissions: 0,
  lastUpdated: 0
};
const ChatGPTCarbonEmission = () => {
  const [carbonStats, setCarbonStats] = useState<GlobalCarbonStats>(emptyGlobalStats);
  useEffect(() => {
    async function fetchData() {
      const getCarbonStats: GlobalCarbonStats = (await getStorage<GlobalCarbonStats>('carbon_tracker_global_stats')) || emptyGlobalStats;
      console.log('Carbon stats fetched:', getCarbonStats);
      setCarbonStats(getCarbonStats);
    }

    fetchData();
  }, []);

  return (
    <div className="p-4 rounded-xl bg-white shadow-md">
      <h2 className="text-xl font-bold mb-2">ChatGPT Carbon Emission</h2>
      <p>🔍 User Tokens: {carbonStats.totalInputTokens}</p>
      <p>📄 Assistant Tokens: {carbonStats.totalOutputTokens}</p>
      <p>🌱 Total Emission: {carbonStats.totalCarbonEmissions} gCO₂</p>
    </div>
  );
};

export default ChatGPTCarbonEmission;
