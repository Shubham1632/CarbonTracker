import React, { useEffect, useState } from "react";
import { getStorage } from "../util";
import { GlobalCarbonStats } from "../content-script";
import { STORAGE_KEYS_WEB_SEARCH, WebCarbonStats } from "../background";

// Comparative Donut (Pie) Chart SVG component
function ComparativeDonutChart({
  chatgptValue,
  webValue,
  chatgptColor = "#22c55e", // Vibrant green
  webColor = "#3b82f6",     // Distinct blue
}: {
  chatgptValue: number;
  webValue: number;
  max?: number;
  chatgptColor?: string;
  webColor?: string;
}) {
  const radius = 28;
  const stroke = 5; // Thinner arc
  const total = Math.max(1, chatgptValue + webValue);
  const chatgptPercent = chatgptValue / total;
  const webPercent = webValue / total;

  // Angles for each segment
  const chatgptAngle = chatgptPercent * 360;
  const webAngle = webPercent * 360;

  // Helper to describe arc
  function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return [
      "M", start.x, start.y,
      "A", r, r, 0, largeArcFlag, 0, end.x, end.y
    ].join(" ");
  }

  function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
    const rad = (angle - 90) * Math.PI / 180.0;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad)
    };
  }

  // Start at 0 deg
  const chatgptArc = describeArc(36, 36, radius, 0, chatgptAngle);
  const webArc = describeArc(36, 36, radius, chatgptAngle, chatgptAngle + webAngle);

  return (
    <svg width="72" height="72" viewBox="0 0 72 72">
      {/* Background circle */}
      <circle
        cx="36"
        cy="36"
        r={radius}
        stroke="#e0f2ef"
        strokeWidth={stroke}
        fill="none"
      />
      {/* ChatGPT arc */}
      {chatgptValue > 0 && (
        <path
          d={chatgptArc}
          stroke={chatgptColor}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
        />
      )}
      {/* Web arc */}
      {webValue > 0 && (
        <path
          d={webArc}
          stroke={webColor}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
        />
      )}
      {/* Center text: total emission */}
      <text
        x="36"
        y="41"
        textAnchor="middle"
        fontSize="1.1em"
        fill="#10a37f"
        fontWeight="bold"
      >
        {(chatgptValue + webValue).toFixed(2)}
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
        <span role="img" aria-label="Robot" className="mr-1">🤖</span>
      ),
    },
    {
      label: "Web",
      value: webStats.totalCarbonEmissions,
      color: "#2dd4bf",
      icon: (
        <span role="img" aria-label="Web" className="mr-1">🕸️</span>
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
        color: "#555"
      }}
    >
      <div className="flex items-center mb-2">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 mr-2">
          <span role="img" aria-label="Earth" style={{ fontSize: 18 }}>🌍</span>
        </span>
        <h2 className="text-base font-bold" style={{ color: "#10a37f" }}>
          Cumulative Carbon Emission
        </h2>
      </div>
      <div className="flex items-center gap-4 mb-2">
        <ComparativeDonutChart
          chatgptValue={chatgptStats.totalCarbonEmissions}
          webValue={webStats.totalCarbonEmissions}
          max={maxEmission}
          chatgptColor="#82e0aa"
          webColor="#28b463"
        />
        <div className="flex flex-col gap-1">
          <div className="flex items-center text-gray-600 text-xs">
            <span role="img" aria-label="Cloud" className="mr-1">☁️</span>
            Total Emission:
            <span className="ml-2 font-semibold" style={{ color: "#555" }}>{totalEmission.toFixed(4)} gCO₂</span>
          </div>
          <div className="flex items-center text-gray-600 text-xs">
            <span role="img" aria-label="Pie" className="mr-1">🥧</span>
            <span className="ml-2">Breakdown:</span>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-1 mb-2">
        {breakdown.map((item) => (
          <div key={item.label} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1">
              {item.icon}
              <span style={{ color: "#666", fontWeight: 600 }}>{item.label}</span>
            </span>
            <span className="font-semibold" style={{ color: "#555" }}>
              {item.value?.toFixed(4) || "0.0000"} <span className="text-gray-400 font-normal">gCO₂</span>
            </span>
          </div>
        ))}
      </div>
      <div className="mb-1">
        <div className="flex items-center justify-between mb-0.5">
          <span className="font-semibold text-xs" style={{ color: "#666" }}>Progress</span>
          <span className="font-bold text-xs" style={{ color: "#10a37f" }}>
            {percent.toFixed(1)}%
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
      <div className="text-xs mt-1 flex flex-col gap-1" style={{ color: "#888" }}>
        <span>
          <span className="font-semibold" style={{ color: "#10a37f" }}>{totalEmission.toFixed(2)}</span> g CO₂e emitted in total
        </span>
        <span>
          <span className="font-semibold" style={{ color: "#10a37f" }}>{chatgptStats.totalInputTokens + chatgptStats.totalOutputTokens}</span> <span role="img" aria-label="Robot">🤖</span> tokens, <span className="font-semibold" style={{ color: "#10a37f" }}>{webStats.totalVisits + webStats.totalSearches}</span> <span role="img" aria-label="Web">🕸️</span> web actions
        </span>
      </div>
    </div>
  );
};

export default CumulativeCarbonEmission;
