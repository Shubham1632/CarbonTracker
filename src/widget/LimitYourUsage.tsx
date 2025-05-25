import React, { useEffect, useState } from "react";
import { getStorage } from "../util";
import { GlobalCarbonStats } from "../content-script";
import { STORAGE_KEYS_WEB_SEARCH, WebCarbonStats } from "../background";

const getTotalEmission = async () => {
  const chatgpt = (await getStorage<GlobalCarbonStats>("carbon_tracker_global_stats_chatgpt")) || { totalCarbonEmissions: 0 };
  const web = (await getStorage<WebCarbonStats>(STORAGE_KEYS_WEB_SEARCH.CARBON_STATS)) || { totalCarbonEmissions: 0 };
  return (chatgpt.totalCarbonEmissions || 0) + (web.totalCarbonEmissions || 0);
};

const getBarColor = (percent: number) => {
  if (percent < 70) return "#10a37f";
  if (percent < 90) return "#f59e42";
  return "#e23c3c";
};

const LimitYourUsage = () => {
  const [limit, setLimit] = useState<number>(() => {
    const stored = localStorage.getItem("carbon_limit");
    return stored ? Number(stored) : 100;
  });
  const [input, setInput] = useState<string>(limit.toString());
  const [totalEmission, setTotalEmission] = useState<number>(0);

  useEffect(() => {
    getTotalEmission().then(setTotalEmission);
    const interval = setInterval(() => {
      getTotalEmission().then(setTotalEmission);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setInput(limit.toString());
    localStorage.setItem("carbon_limit", String(limit));
  }, [limit]);

  const percent = Math.min(100, (totalEmission / limit) * 100);
  const barColor = getBarColor(percent);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value.replace(/[^0-9.]/g, ""));
  };

  const handleSetLimit = () => {
    const val = Number(input);
    if (!isNaN(val) && val > 0) setLimit(val);
  };

  return (
    <div
      className="rounded-xl shadow p-3 bg-white border border-gray-200 transition relative"
      style={{
        boxShadow: "0 2px 8px 0 rgba(16,16,16,0.08), 0 1.5px 8px 0 rgba(0,0,0,0.03)",
        minHeight: "90px",
        fontSize: "0.97rem",
        marginBottom: "0.5rem",
        color: "#555"
      }}
    >
      <div className="flex items-center mb-2">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 mr-2">
          <span role="img" aria-label="Limit" style={{ fontSize: 18 }}>🚦</span>
        </span>
        <h2 className="text-base font-bold" style={{ color: "#10a37f" }}>
          Limit Your Usage
        </h2>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <span role="img" aria-label="Pencil" className="mr-1">✏️</span>
        <input
          type="number"
          min={1}
          value={input}
          onChange={handleInputChange}
          className="border border-gray-300 rounded px-2 py-1 w-20 text-sm"
          style={{ outline: "none", color: "#555" }}
        />
        <span className="text-xs" style={{ color: "#888" }}>gCO₂ limit</span>
        <button
          onClick={handleSetLimit}
          className="ml-2 px-2 py-1 rounded"
          style={{
            background: "#10a37f",
            color: "#fff",
            fontWeight: 600,
            fontSize: "0.85rem"
          }}
        >
          Set
        </button>
      </div>
      <div className="mb-1">
        <div className="flex items-center justify-between mb-0.5">
          <span className="font-semibold text-xs" style={{ color: "#666" }}>
            Progress <span role="img" aria-label="Bar Chart">📊</span>
          </span>
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
            background: "#10a37f",
            borderRadius: "5px",
            transition: "width 0.3s, background 0.3s"
          }}></div>
        </div>
      </div>
      <div className="text-xs mt-1 flex flex-col gap-1" style={{ color: "#888" }}>
        <span>
          <span className="font-semibold" style={{ color: "#10a37f" }}>{totalEmission.toFixed(2)}</span> / <span className="font-semibold" style={{ color: "#10a37f" }}>{limit}</span> g CO₂e used
        </span>
        {percent >= 100 && (
          <span className="font-semibold" style={{ color: "#e23c3c" }}>
            <span role="img" aria-label="Warning">⚠️</span> Limit exceeded!
          </span>
        )}
        {percent >= 90 && percent < 100 && (
          <span className="font-semibold" style={{ color: "#f59e42" }}>
            <span role="img" aria-label="Warning">⚠️</span> Approaching your limit
          </span>
        )}
      </div>
    </div>
  );
};

export default LimitYourUsage;
