import React, { useEffect, useState } from "react";
import { getStorage } from "../util";
import { GlobalCarbonStats } from "../content-script";
import { STORAGE_KEYS_WEB_SEARCH, WebCarbonStats } from "../background";

// Donut chart SVG component
function DonutChart({
  value,
  max,
  color = "#10a37f",
  label = "",
}: {
  value: number;
  max: number;
  color?: string;
  label?: string;
}) {
  const radius = 28;
  const stroke = 8;
  const normalized = Math.min(1, value / max);
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - normalized);

  return (
    <svg width="72" height="72" viewBox="0 0 72 72">
      <circle
        cx="36"
        cy="36"
        r={radius}
        stroke="#e0f2ef"
        strokeWidth={stroke}
        fill="none"
      />
      <circle
        cx="36"
        cy="36"
        r={radius}
        stroke={color}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.5s" }}
      />
      <text
        x="36"
        y="41"
        textAnchor="middle"
        fontSize="1.1em"
        fill="#10a37f"
        fontWeight="bold"
      >
        {value.toFixed(2)}
      </text>
      <text
        x="36"
        y="54"
        textAnchor="middle"
        fontSize="0.7em"
        fill="#888"
      >
        gCO₂
      </text>
    </svg>
  );
}

const emptyGlobalStats: GlobalCarbonStats = {
  totalInputTokens: 0,
  totalOutputTokens: 0,
  totalCarbonEmissions: 0,
  lastUpdated: 0,
};

const emptyWebStats: WebCarbonStats = {
  totalVisits: 0,
  totalSearches: 0,
  totalCarbonEmissions: 0,
  lastUpdated: 0,
};

const CumulativeCarbonEmission = () => {
  const [chatgptStats, setChatgptStats] = useState<GlobalCarbonStats>(emptyGlobalStats);
  const [webStats, setWebStats] = useState<WebCarbonStats>(emptyWebStats);

  useEffect(() => {
    async function fetchData() {
      const chatgpt = (await getStorage<GlobalCarbonStats>("carbon_tracker_global_stats_chatgpt")) || emptyGlobalStats;
      const web = (await getStorage<WebCarbonStats>(STORAGE_KEYS_WEB_SEARCH.CARBON_STATS)) || emptyWebStats;
      setChatgptStats(chatgpt);
      setWebStats(web);
    }
    fetchData();
  }, []);

  const totalEmission = (chatgptStats.totalCarbonEmissions || 0) + (webStats.totalCarbonEmissions || 0);
  const maxEmission = 200; // For donut chart scaling
  const percent = Math.min(100, (totalEmission / maxEmission) * 100);

  // Breakdown for expressive UI
  const breakdown = [
    {
      label: "ChatGPT",
      value: chatgptStats.totalCarbonEmissions,
      color: "#10a37f",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#10a37f" strokeWidth="2"/>
          <path d="M8 12h8M12 8v8" stroke="#10a37f" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      label: "Web",
      value: webStats.totalCarbonEmissions,
      color: "#2dd4bf",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#2dd4bf" strokeWidth="2"/>
          <path d="M8 12h8" stroke="#2dd4bf" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
    },
  ];

  return (
    <div
      className="rounded-xl shadow p-3 bg-white border border-[#e0f2ef] transition relative"
      style={{
        boxShadow: "0 2px 8px 0 rgba(16,163,127,0.08), 0 1.5px 8px 0 rgba(0,0,0,0.03)",
        minHeight: "110px",
        fontSize: "0.97rem",
        marginBottom: "0.5rem",
      }}
    >
      <div className="flex items-center mb-2">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#e0f2ef] mr-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#10a37f" strokeWidth="2"/>
            <path d="M12 7v5l4 2" stroke="#10a37f" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </span>
        <h2 className="text-base font-bold text-[#10a37f]">Cumulative Carbon Emission</h2>
      </div>
      <div className="flex items-center gap-4 mb-2">
        <DonutChart value={totalEmission} max={maxEmission} />
        <div className="flex flex-col gap-1">
          <div className="flex items-center text-gray-600 text-xs">
            <svg width="13" height="13" viewBox="0 0 20 20" className="mr-1" fill="none">
              <rect x="4" y="4" width="12" height="12" rx="3" stroke="#10a37f" strokeWidth="2"/>
              <circle cx="10" cy="10" r="2" fill="#10a37f"/>
            </svg>
            Total Emission:
            <span className="ml-2 font-semibold text-black">{totalEmission.toFixed(4)} gCO₂</span>
          </div>
          <div className="flex items-center text-gray-600 text-xs">
            <svg width="13" height="13" viewBox="0 0 20 20" className="mr-1" fill="none">
              <rect x="4" y="4" width="12" height="12" rx="3" stroke="#2dd4bf" strokeWidth="2"/>
              <circle cx="10" cy="10" r="2" fill="#2dd4bf"/>
            </svg>
            <span className="ml-2">Breakdown:</span>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-1 mb-2">
        {breakdown.map((item) => (
          <div key={item.label} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1">
              {item.icon}
              <span style={{ color: item.color, fontWeight: 600 }}>{item.label}</span>
            </span>
            <span className="font-semibold text-black">
              {item.value?.toFixed(4) || "0.0000"} <span className="text-gray-500 font-normal">gCO₂</span>
            </span>
          </div>
        ))}
      </div>
      <div className="mb-1">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[#10a37f] font-semibold text-xs">Progress</span>
          <span className="font-bold text-black text-xs">
            {percent.toFixed(1)}%
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
      <div className="text-xs text-gray-500 mt-1 flex flex-col gap-1">
        <span>
          <span className="text-[#10a37f] font-semibold">{totalEmission.toFixed(2)}</span> g CO₂e emitted in total
        </span>
        <span>
          <span className="text-[#10a37f] font-semibold">{chatgptStats.totalInputTokens + chatgptStats.totalOutputTokens}</span> ChatGPT tokens, <span className="text-[#2dd4bf] font-semibold">{webStats.totalVisits + webStats.totalSearches}</span> web actions
        </span>
      </div>
    </div>
  );
};

export default CumulativeCarbonEmission;
