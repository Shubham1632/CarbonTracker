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

  const maxEmission = 100;
  const percent = Math.min(100, (totalEmission / maxEmission) * 100);

  return (
    <div
      className="rounded-xl shadow p-4 bg-white border border-[#e0f2ef] transition relative flex flex-col gap-2"
      style={{
        boxShadow: "0 2px 8px 0 rgba(16,163,127,0.08), 0 1.5px 8px 0 rgba(0,0,0,0.03)",
        minHeight: "90px",
        fontSize: "0.97rem",
        marginBottom: "0.5rem",
        color: "#555"
      }}
    >
      <div className="flex items-center mb-1 gap-2">
        <span
          className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100"
        >
          <span role="img" aria-label="Web" style={{ fontSize: 20 }}>🕸️</span>
        </span>
        <h2 className="text-base font-bold" style={{ color: "#10a37f" }}>
          Web Carbon Emission
        </h2>
      </div>
      <div className="flex flex-row gap-6 items-center justify-between mt-1 mb-2">
        <div className="flex flex-col items-start gap-1">
          <div className="flex items-center text-xs" style={{ color: "#666" }}>
            <span role="img" aria-label="Magnifier" className="mr-1">🔍</span>
            <span>Web Searches:</span>
            <span className="ml-2 font-semibold" style={{ color: "#555" }}>{webSearches}</span>
          </div>
          <div className="flex items-center text-xs" style={{ color: "#666" }}>
            <span role="img" aria-label="Page" className="mr-1">📄</span>
            <span>Page Visits:</span>
            <span className="ml-2 font-semibold" style={{ color: "#555" }}>{pageVisits}</span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs font-semibold" style={{ color: "#666" }}>Total Emission</span>
          <span className="text-lg font-bold" style={{ color: "#10a37f" }}>{totalEmission.toFixed(4)} <span className="text-gray-400 font-normal" style={{ fontSize: '0.85em' }}>gCO₂</span></span>
        </div>
      </div>
      <div className="w-full mb-1">
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
      <div className="text-xs mt-1 flex items-center justify-between" style={{ color: "#888" }}>
        <span>
          <span className="font-semibold" style={{ color: "#10a37f" }}>{totalEmission.toFixed(2)}</span> g CO₂e <span role="img" aria-label="Leaf">🍃</span>
        </span>
        <span className="text-[10px] text-gray-400">(Estimation based on your browsing)</span>
      </div>
    </div>
  );
};

export default WebCarbonEmission;
