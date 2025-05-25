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
        marginBottom: "0.5rem"
      }}
    >
      <div className="flex items-center mb-2">
        <span
          className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#e0f2ef] mr-2"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#10a37f" strokeWidth="2"/><path d="M8 12h8M12 8v8" stroke="#10a37f" strokeWidth="2" strokeLinecap="round"/></svg>
        </span>
        <h2 className="text-base font-bold text-[#10a37f]">ChatGPT Carbon Emission</h2>
      </div>
      <div className="flex flex-col gap-1 mb-2">
        <div className="flex items-center justify-between">
          <span className="text-gray-600 flex items-center text-xs">
            <svg width="14" height="14" viewBox="0 0 20 20" className="mr-1" fill="none"><circle cx="10" cy="10" r="9" stroke="#10a37f" strokeWidth="2"/><text x="7" y="14" fontSize="8" fill="#10a37f">U</text></svg>
            User Tokens
          </span>
          <span className="font-semibold text-black text-xs">{carbonStats.totalInputTokens.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-600 flex items-center text-xs">
            <svg width="14" height="14" viewBox="0 0 20 20" className="mr-1" fill="none"><circle cx="10" cy="10" r="9" stroke="#10a37f" strokeWidth="2"/><text x="4" y="14" fontSize="8" fill="#10a37f">AI</text></svg>
            Assistant Tokens
          </span>
          <span className="font-semibold text-black text-xs">{carbonStats.totalOutputTokens.toLocaleString()}</span>
        </div>
      </div>
      <div className="mb-1">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[#10a37f] font-semibold text-xs">Total Emission</span>
          <span className="font-bold text-black text-xs">
            {carbonStats.totalCarbonEmissions.toFixed(4)} <span className="text-gray-500 font-normal">gCO₂</span>
          </span>
        </div>
        <div style={{
          width: "100%",
          height: "7px",
          background: "#e0f2ef",
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
      <div className="text-xs text-gray-500 mt-1">
        <span>
          <span className="text-[#10a37f] font-semibold">{carbonStats.totalCarbonEmissions.toFixed(2)}</span> g CO₂e
        </span>
      </div>
    </div>
  );
};

export default ChatGPTCarbonEmission;
