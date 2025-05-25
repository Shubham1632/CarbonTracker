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
      const getCarbonStats: GlobalCarbonStats = (await getStorage<GlobalCarbonStats>('carbon_tracker_global_stats_chatgpt')) || emptyGlobalStats;
      setCarbonStats(getCarbonStats);
    }
    fetchData();
  }, []);

  // For progress bar visualization
  const maxEmission = 100;
  const percent = Math.min(100, (carbonStats.totalCarbonEmissions / maxEmission) * 100);

  return (
    <div
      className="rounded-xl shadow p-3 bg-white border border-[#e0f2ef] transition relative"
      style={{
        boxShadow: "0 2px 8px 0 rgba(16,163,127,0.08), 0 1.5px 8px 0 rgba(0,0,0,0.03)",
        minHeight: "90px",
        fontSize: "0.97rem",
        marginBottom: "0.5rem",
        color: "#555"
      }}
    >
      <div className="flex items-center mb-2">
        <span
          className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 mr-2"
        >
          <span role="img" aria-label="Robot" style={{ fontSize: 18 }}>🤖</span>
        </span>
        <h2 className="text-base font-bold" style={{ color: "#10a37f" }}>
          ChatGPT Carbon Emission
        </h2>
      </div>
      <div className="flex flex-col gap-1 mb-2">
        <div className="flex items-center justify-between">
          <span className="flex items-center text-xs" style={{ color: "#666" }}>
            <span role="img" aria-label="User" className="mr-1">👤</span>
            User Tokens
          </span>
          <span className="font-semibold text-xs" style={{ color: "#555" }}>{carbonStats.totalInputTokens.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center text-xs" style={{ color: "#666" }}>
            <span role="img" aria-label="AI" className="mr-1">🤖</span>
            Assistant Tokens
          </span>
          <span className="font-semibold text-xs" style={{ color: "#555" }}>{carbonStats.totalOutputTokens.toLocaleString()}</span>
        </div>
      </div>
      <div className="mb-1">
        <div className="flex items-center justify-between mb-0.5">
          <span className="font-semibold text-xs" style={{ color: "#666" }}>Total Emission</span>
          <span className="font-bold text-xs" style={{ color: "#10a37f" }}>
            {carbonStats.totalCarbonEmissions.toFixed(4)} <span className="text-gray-400 font-normal">gCO₂</span>
          </span>
        </div>
        <div style={{
          width: "100%",
          height: "7px",
          background: "#e0e0e0",
          borderRadius: "5px",
          overflow: "hidden"
        }}>
          <div style={{
            width: `${percent}%`,
            height: "100%",
            background: "linear-gradient(90deg, #10a37f 60%, #b2f7e2 100%)",
            borderRadius: "5px",
            transition: "width 0.3s"
          }}></div>
        </div>
      </div>
      <div className="text-xs mt-1" style={{ color: "#888" }}>
        <span>
          <span className="font-semibold" style={{ color: "#10a37f" }}>{carbonStats.totalCarbonEmissions.toFixed(2)}</span> g CO₂e <span role="img" aria-label="Leaf">🍃</span>
        </span>
      </div>
    </div>
  );
};

export default ChatGPTCarbonEmission;
