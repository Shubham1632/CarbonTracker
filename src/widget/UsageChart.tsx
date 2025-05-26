import React, { useEffect, useState } from "react";
import { getStorage } from "../util";
import { GlobalCarbonStats, ChatGPTTimePeriodStats } from "../content-script";
import { STORAGE_KEYS_WEB_SEARCH, WebCarbonStats } from "../background";

const getAllKeysWithPrefix = async (prefix: string) => {
  return new Promise<string[]>((resolve) => {
    chrome.storage.local.get(null, (items) => {
      const keys = Object.keys(items).filter((k) => k.startsWith(prefix));
      resolve(keys);
    });
  });
};

function downloadCSV(filename: string, rows: string[][]) {
  const csvContent =
    "data:text/csv;charset=utf-8," +
    rows.map((e) => e.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Simple Bar Chart SVG
function BarChart({
  data,
  labels,
  color = "#10a37f",
  height = 80,
  maxBars = 10,
  unit = "gCO₂"
}: {
  data: number[];
  labels: string[];
  color?: string;
  height?: number;
  maxBars?: number;
  unit?: string;
}) {
  const max = Math.max(...data, 1);
  const barWidth = 100 / Math.min(data.length, maxBars);
  return (
    <svg width="100%" height={height + 18}>
      {data.map((v, i) => (
        <g key={i}>
          <rect
            x={`${i * barWidth}%`}
            y={height - (v / max) * (height - 20)}
            width={`${barWidth * 0.7}%`}
            height={(v / max) * (height - 20)}
            fill={color}
            rx={3}
          />
          <text
            x={`${i * barWidth + barWidth * 0.35}%`}
            y={height + 12}
            textAnchor="middle"
            fontSize="10"
            fill="#111"
            style={{ pointerEvents: "none" }}
          >
            {labels[i]}
          </text>
        </g>
      ))}
      <text
        x="100%"
        y="12"
        textAnchor="end"
        fontSize="10"
        fill="#10a37f"
        fontWeight="bold"
      >
        {unit}
      </text>
    </svg>
  );
}

const getLastNDates = (n: number) => {
  const dates: string[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
};

const getLastNWeeks = (n: number) => {
  const weeks: string[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i * 7);
    const year = d.getFullYear();
    const firstDayOfYear = new Date(year, 0, 1);
    const pastDaysOfYear = (d.getTime() - firstDayOfYear.getTime()) / 86400000;
    const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    weeks.push(`${year}-W${weekNumber.toString().padStart(2, "0")}`);
  }
  return weeks;
};

const getLastNMonths = (n: number) => {
  const months: string[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    months.push(`${year}-${month}`);
  }
  return months;
};

const getWeekdayName = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { weekday: "short" }); 
};

const getMonthName = (monthStr: string) => {
  const [year, month] = monthStr.split("-");
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString(undefined, { month: "short" }); 
};

const getWeekLabel = (weekKey: string, allKeys: string[]) => {
  const sorted = [...allKeys].sort((a, b) => b.localeCompare(a));
  const idx = sorted.indexOf(weekKey);
  if (idx === 0) return "This week";
  if (idx === 1) return "Last week";
  return `${idx} weeks ago`;
};

const UsageChart = () => {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly" | "all">("daily");
  const [source, setSource] = useState<"chatgpt" | "web" | "both">("both");
  const [loading, setLoading] = useState(true);

  const [chatgptGlobal, setChatgptGlobal] = useState<GlobalCarbonStats | null>(null);
  const [webGlobal, setWebGlobal] = useState<WebCarbonStats | null>(null);
  const [chatgptPeriods, setChatgptPeriods] = useState<Record<string, ChatGPTTimePeriodStats>>({});
  const [webPeriods, setWebPeriods] = useState<Record<string, WebCarbonStats>>({});

  const [chartData, setChartData] = useState<{ data: number[]; labels: string[]; unit: string }>(
    { data: [], labels: [], unit: "gCO₂" }
  );

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      const chatgptGlobalStats = await getStorage<GlobalCarbonStats>("carbon_tracker_global_stats_chatgpt");
      setChatgptGlobal(chatgptGlobalStats || null);

      const webGlobalStats = await getStorage<WebCarbonStats>(STORAGE_KEYS_WEB_SEARCH.CARBON_STATS);
      setWebGlobal(webGlobalStats || null);

      const daily = (await getStorage<Record<string, ChatGPTTimePeriodStats>>("carbon_tracker_daily_stats_chatgpt")) || {};
      const weekly = (await getStorage<Record<string, ChatGPTTimePeriodStats>>("carbon_tracker_weekly_stats_chatgpt")) || {};
      const monthly = (await getStorage<Record<string, ChatGPTTimePeriodStats>>("carbon_tracker_monthly_stats_chatgpt")) || {};
      let periodStats: Record<string, ChatGPTTimePeriodStats> = {};
      if (period === "daily") periodStats = daily;
      else if (period === "weekly") periodStats = weekly;
      else if (period === "monthly") periodStats = monthly;
      setChatgptPeriods(periodStats);

      let webPeriodStats: Record<string, WebCarbonStats> = {};
      if (period !== "all") {
        let prefix = "";
        if (period === "daily") prefix = STORAGE_KEYS_WEB_SEARCH.DAILY_STATS + "_";
        else if (period === "weekly") prefix = STORAGE_KEYS_WEB_SEARCH.WEEKLY_STATS + "_";
        else if (period === "monthly") prefix = STORAGE_KEYS_WEB_SEARCH.MONTHLY_STATS + "_";
        const keys = await getAllKeysWithPrefix(prefix);
        for (const k of keys) {
          const v = await getStorage<WebCarbonStats>(k);
          if (v) webPeriodStats[k.replace(prefix, "")] = v;
        }
      }
      setWebPeriods(webPeriodStats);

      setLoading(false);
    }
    fetchAll();
  }, [period]);

  useEffect(() => {
    if (loading) return;
    let data: number[] = [];
    let labels: string[] = [];
    let unit = "gCO₂";
    let chatgptArr: { label: string; value: number }[] = [];
    let webArr: { label: string; value: number }[] = [];

    if (period === "daily") {
      const last7Dates = getLastNDates(7);
      chatgptArr = last7Dates.map(k => ({
        label: getWeekdayName(k),
        value: chatgptPeriods[k]?.carbonEmissions || 0
      }));
      webArr = last7Dates.map(k => ({
        label: getWeekdayName(k),
        value: webPeriods[k]?.totalCarbonEmissions || 0
      }));
      if (source === "chatgpt") {
        data = chatgptArr.map(x => x.value);
        labels = chatgptArr.map(x => x.label);
      } else if (source === "web") {
        data = webArr.map(x => x.value);
        labels = webArr.map(x => x.label);
      } else if (source === "both") {
        data = last7Dates.map((k, i) => (chatgptArr[i]?.value || 0) + (webArr[i]?.value || 0));
        labels = chatgptArr.map(x => x.label);
      }
    } else if (period === "weekly") {
      const last4Weeks = getLastNWeeks(4);
      const allKeys = last4Weeks;
      chatgptArr = last4Weeks.map(k => ({
        label: getWeekLabel(k, allKeys),
        value: chatgptPeriods[k]?.carbonEmissions || 0
      }));
      webArr = last4Weeks.map(k => ({
        label: getWeekLabel(k, allKeys),
        value: webPeriods[k]?.totalCarbonEmissions || 0
      }));
      if (source === "chatgpt") {
        data = chatgptArr.map(x => x.value);
        labels = chatgptArr.map(x => x.label);
      } else if (source === "web") {
        data = webArr.map(x => x.value);
        labels = webArr.map(x => x.label);
      } else if (source === "both") {
        data = last4Weeks.map((k, i) => (chatgptArr[i]?.value || 0) + (webArr[i]?.value || 0));
        labels = chatgptArr.map(x => x.label);
      }
    } else if (period === "monthly") {
      const last6Months = getLastNMonths(6);
      chatgptArr = last6Months.map(k => ({
        label: getMonthName(k),
        value: chatgptPeriods[k]?.carbonEmissions || 0
      }));
      webArr = last6Months.map(k => ({
        label: getMonthName(k),
        value: webPeriods[k]?.totalCarbonEmissions || 0
      }));
      if (source === "chatgpt") {
        data = chatgptArr.map(x => x.value);
        labels = chatgptArr.map(x => x.label);
      } else if (source === "web") {
        data = webArr.map(x => x.value);
        labels = webArr.map(x => x.label);
      } else if (source === "both") {
        data = last6Months.map((k, i) => (chatgptArr[i]?.value || 0) + (webArr[i]?.value || 0));
        labels = chatgptArr.map(x => x.label);
      }
    }
    setChartData({ data, labels, unit });
  }, [loading, period, source, chatgptGlobal, webGlobal, chatgptPeriods, webPeriods]);

  const handleDownload = async () => {
    const items = await new Promise<Record<string, any>>(resolve => chrome.storage.local.get(null, resolve));
    const rows: string[][] = [["Key", "Value"]];
    Object.entries(items).forEach(([k, v]) => {
      rows.push([k, typeof v === "object" ? JSON.stringify(v) : String(v)]);
    });
    downloadCSV("carbon-tracker-data.csv", rows);
  };

  return (
    <div
      className="rounded-xl shadow p-3 bg-white border border-[#e0f2ef] transition relative"
      style={{
        boxShadow: "0 2px 8px 0 rgba(16,163,127,0.08), 0 1.5px 8px 0 rgba(0,0,0,0.03)",
        minHeight: "140px",
        fontSize: "0.97rem",
        marginBottom: "0.5rem",
        color: "#555"
      }}
    >
      <div className="flex items-center mb-2">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 mr-2">
          <span role="img" aria-label="Chart" style={{ fontSize: 18 }}>📈</span>
        </span>
        <h2 className="text-base font-bold" style={{ color: "#10a37f" }}>
          Usage Chart
        </h2>
        <button
          className="ml-auto px-2 py-1 rounded text-xs"
          style={{
            background: "#10a37f",
            color: "#fff",
            fontWeight: 600,
            fontSize: "0.85rem"
          }}
          onClick={handleDownload}
          title="Download all data as CSV"
        >
          Download CSV
        </button>
      </div>
      <div className="flex gap-2 mb-2">
        <div className="flex gap-1">
          {["daily", "weekly", "monthly"].map((p) => (
            <button
              key={p}
              className={`px-2 py-1 rounded text-xs font-semibold ${period === p ? "bg-[#10a37f] text-white" : "bg-gray-100 text-[#10a37f]"}`}
              style={{ transition: "background 0.2s" }}
              onClick={() => setPeriod(p as any)}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2 mb-2">
        <div className="flex gap-1">
          {["both", "chatgpt", "web"].map((s) => (
            <button
              key={s}
              className={`px-2 py-1 rounded text-xs font-semibold ${source === s ? "bg-[#2dd4bf] text-white" : "bg-gray-100 text-[#2dd4bf]"}`}
              style={{ transition: "background 0.2s" }}
              onClick={() => setSource(s as any)}
            >
              {s === "both" ? "Both" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-2" style={{ minHeight: 108 }}>
        {loading ? (
          <div className="text-xs text-gray-400">Loading...</div>
        ) : chartData.data.length ? (
          <BarChart data={chartData.data} labels={chartData.labels} unit={chartData.unit} />
        ) : (
          <div className="text-xs text-gray-400">No data available for this period/source.</div>
        )}
      </div>
      <div className="text-xs mt-1 flex flex-col gap-1" style={{ color: "#888" }}>
        <span>
          <span className="font-semibold" style={{ color: "#10a37f" }}>
            {chatgptGlobal?.totalCarbonEmissions?.toFixed(2) || "0.00"}
          </span> g CO₂e (ChatGPT) &nbsp; | &nbsp;
          <span className="font-semibold" style={{ color: "#2dd4bf" }}>
            {webGlobal?.totalCarbonEmissions?.toFixed(2) || "0.00"}
          </span> g CO₂e (Web)
        </span>
        <span>
          <span className="font-semibold" style={{ color: "#10a37f" }}>
            {chatgptGlobal ? chatgptGlobal.totalInputTokens + chatgptGlobal.totalOutputTokens : 0}
          </span> tokens, <span className="font-semibold" style={{ color: "#2dd4bf" }}>
            {webGlobal ? webGlobal.totalVisits + webGlobal.totalSearches : 0}
          </span> web actions
        </span>
      </div>
    </div>
  );
};

export default UsageChart;
