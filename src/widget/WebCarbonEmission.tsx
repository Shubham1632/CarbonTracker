import { useEffect, useState } from 'react';
import { getStorage } from '../util';
import { STORAGE_KEYS_WEB_SEARCH, WebCarbonStats } from '../background';

// Simple donut chart SVG
function DonutChart({ value, max, color = "#10a37f" }: { value: number, max: number, color?: string }) {
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
        marginBottom: "0.5rem"
      }}
    >
      <div className="flex items-center mb-2">
        <span
          className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#e0f2ef] mr-2"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#10a37f" strokeWidth="2"/><path d="M8 12h8" stroke="#10a37f" strokeWidth="2" strokeLinecap="round"/></svg>
        </span>
        <h2 className="text-base font-bold text-[#10a37f]">Web Carbon Emission</h2>
      </div>
      <div className="flex items-center gap-4 mb-2">
        <DonutChart value={totalEmission} max={maxEmission} />
        <div className="flex flex-col gap-1">
          <div className="flex items-center text-gray-600 text-xs">
            <svg width="13" height="13" viewBox="0 0 20 20" className="mr-1" fill="none"><rect x="3" y="6" width="14" height="8" rx="2" stroke="#10a37f" strokeWidth="2"/><circle cx="7" cy="10" r="1" fill="#10a37f"/><circle cx="13" cy="10" r="1" fill="#10a37f"/></svg>
            Web Searches:
            <span className="ml-2 font-semibold text-black">{webSearches}</span>
          </div>
          <div className="flex items-center text-gray-600 text-xs">
            <svg width="13" height="13" viewBox="0 0 20 20" className="mr-1" fill="none"><rect x="4" y="4" width="12" height="12" rx="3" stroke="#10a37f" strokeWidth="2"/><circle cx="10" cy="10" r="2" fill="#10a37f"/></svg>
            Page Visits:
            <span className="ml-2 font-semibold text-black">{pageVisits}</span>
          </div>
        </div>
      </div>
      <div className="mb-1">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[#10a37f] font-semibold text-xs">Total Emission</span>
          <span className="font-bold text-black text-xs">
            {totalEmission.toFixed(4)} <span className="text-gray-500 font-normal">gCO₂</span>
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
          <span className="text-[#10a37f] font-semibold">{totalEmission.toFixed(2)}</span> g CO₂e
        </span>
      </div>
    </div>
  );
};

export default WebCarbonEmission;
