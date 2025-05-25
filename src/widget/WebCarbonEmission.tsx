import { useEffect, useState } from 'react';
import { getStorage } from '../util';
import { STORAGE_KEYS_WEB_SEARCH, WebCarbonStats } from '../background';

// Simple donut chart SVG
function DonutChart({ value, max, color = "#23272f" }: { value: number, max: number, color?: string }) {
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

  const maxEmission = 100;
  const percent = Math.min(100, (totalEmission / maxEmission) * 100);

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
          <span role="img" aria-label="Web" style={{ fontSize: 18 }}>🕸️</span>
        </span>
        <h2 className="text-base font-bold" style={{ color: "#10a37f" }}>
          Web Carbon Emission
        </h2>
      </div>
      <div className="flex items-center gap-4 mb-2">
        <DonutChart value={totalEmission} max={maxEmission} color="#10a37f" />
        <div className="flex flex-col gap-1">
          <div className="flex items-center text-xs" style={{ color: "#666" }}>
            <span role="img" aria-label="Magnifier" className="mr-1">🔍</span>
            Web Searches:
            <span className="ml-2 font-semibold" style={{ color: "#555" }}>{webSearches}</span>
          </div>
          <div className="flex items-center text-xs" style={{ color: "#666" }}>
            <span role="img" aria-label="Page" className="mr-1">📄</span>
            Page Visits:
            <span className="ml-2 font-semibold" style={{ color: "#555" }}>{pageVisits}</span>
          </div>
        </div>
      </div>
      <div className="mb-1">
        <div className="flex items-center justify-between mb-0.5">
          <span className="font-semibold text-xs" style={{ color: "#666" }}>Total Emission</span>
          <span className="font-bold text-xs" style={{ color: "#10a37f" }}>
            {totalEmission.toFixed(4)} <span className="text-gray-400 font-normal">gCO₂</span>
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
          <span className="font-semibold" style={{ color: "#10a37f" }}>{totalEmission.toFixed(2)}</span> g CO₂e <span role="img" aria-label="Leaf">🍃</span>
        </span>
      </div>
    </div>
  );
};

export default WebCarbonEmission;
