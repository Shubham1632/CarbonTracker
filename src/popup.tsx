import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./popup.css";
import CumulativeCarbonEmission from "./widget/CumulativeCarbonEmission";
import WebCarbonEmission from "./widget/WebCarbonEmission";
import ChatGPTCarbonEmission from "./widget/ChatGPTCarbonEmission";
import LimitYourUsage from "./widget/LimitYourUsage";
import UsageChart from "./widget/UsageChart";

const widgetList = [
  {
    key: "cumulative",
    label: (
      <>
        <span role="img" aria-label="Earth" className="mr-1">🌍</span>
        Cumulative Carbon Emission
      </>
    ),
    component: <CumulativeCarbonEmission />,
  },
  {
    key: "web",
    label: (
      <>
        <span role="img" aria-label="Web" className="mr-1">🕸️</span>
        Web Carbon Emission
      </>
    ),
    component: <WebCarbonEmission />,
  },
  {
    key: "chatgpt",
    label: (
      <>
        <span role="img" aria-label="Robot" className="mr-1">🤖</span>
        ChatGPT Carbon Emission
      </>
    ),
    component: <ChatGPTCarbonEmission />,
  },
  {
    key: "limit",
    label: (
      <>
        <span role="img" aria-label="Limit" className="mr-1">🚦</span>
        Limit Your Usage
      </>
    ),
    component: <LimitYourUsage />,
  },
  {
    key: "chart",
    label: (
      <>
        <span role="img" aria-label="Chart" className="mr-1">📊</span>
        Usage Chart
      </>
    ),
    component: <UsageChart />,
  },
];

const defaultSelected = {
  cumulative: true,
  web: false,
  chatgpt: false,
  limit: false,
  chart: false,
};

const Popup = () => {
  const [selected, setSelected] = useState<{ [key: string]: boolean }>(
    defaultSelected
  );
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("selectedWidgets");
    if (stored) {
      try {
        setSelected(JSON.parse(stored));
      } catch {
        setSelected(defaultSelected);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("selectedWidgets", JSON.stringify(selected));
  }, [selected]);

  const handleCheckbox = (key: string) => {
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div
      className="min-w-[22rem] min-h-screen relative transition-all"
      style={{
        background: "linear-gradient(135deg, #f8fafc 0%, #e0f2ef 100%)",
        fontFamily: "'Segoe UI', 'Inter', system-ui, sans-serif",
        color: "#444", // softer grey text
        minHeight: "100vh",
        padding: 0,
        overflow: "hidden",
      }}
    >
      {/* Main content container */}
      <div
        className="flex flex-col items-center justify-start"
        style={{
          minHeight: "100vh",
          paddingBottom: "1.2rem",
          background: "linear-gradient(135deg, #f8fafc 0%, #e0f2ef 100%)",
        }}
      >
        {/* Header with title and hamburger */}
        <div
          className="w-full max-w-lg flex items-center justify-between px-4"
          style={{
            marginTop: "0.6rem",
            marginBottom: "0.5rem",
            background: "transparent",
            boxShadow: "none",
            border: "none",
            position: "relative",
          }}
        >
          {/* Centered Title */}
          <div className="flex-1 flex justify-center items-center relative">
            <h1
              className="text-2xl font-bold flex items-center justify-center"
              style={{
                color: "#10a37f", // green for title
                letterSpacing: "-1px",
                margin: 0,
                background: "transparent",
                textAlign: "center",
                fontWeight: 800,
                fontFamily: "'Segoe UI', 'Inter', system-ui, sans-serif",
              }}
            >
              <span role="img" aria-label="Leaf" className="mr-2">🍃</span>
              Carbon Tracker
              <span role="img" aria-label="Sparkles" className="ml-2">✨</span>
            </h1>
          </div>
          <button
            className="z-20 w-9 h-9 flex flex-col justify-center items-center rounded-full hover:shadow-lg transition ml-2"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Open menu"
            style={{ color: "#10a37f" }}
          >
            <span className="block w-5 h-0.5 bg-[#10a37f] mb-1 rounded"></span>
            <span className="block w-5 h-0.5 bg-[#10a37f] mb-1 rounded"></span>
            <span className="block w-5 h-0.5 bg-[#10a37f] rounded"></span>
          </button>
        </div>

        {/* Collapsible menu popup */}
        {menuOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-30 z-30 flex justify-end">
            <div className="bg-white shadow-xl w-72 h-full p-5 relative rounded-l-2xl border-l-4 border-gray-300">
              <button
                className="absolute top-3 right-3 text-2xl text-gray-700 hover:bg-[#e0f2ef] rounded-full w-8 h-8 flex items-center justify-center"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
              >
                ×
              </button>
              <h2 className="font-semibold mb-4 mt-8 text-gray-700 text-lg flex items-center">
                <span role="img" aria-label="Widgets" className="mr-2">🧩</span>
                Widgets
              </h2>
              <ul>
                {widgetList.map((widget) => (
                  <li key={typeof widget.label === "string" ? widget.key : (widget.key + "-li")} className="flex items-center mb-3">
                    <input
                      type="checkbox"
                      id={widget.key}
                      checked={selected[widget.key]}
                      onChange={() => handleCheckbox(widget.key)}
                      className="mr-3 accent-[#10a37f] w-5 h-5"
                    />
                    <label
                      htmlFor={widget.key}
                      className="text-gray-700 flex items-center"
                    >
                      {widget.label}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Widget area */}
        <div
          className="w-full max-w-lg relative mt-0"
          style={{
            background: "transparent",
            boxShadow: "none",
            padding: "0.5rem 0.5rem 0.5rem 0.5rem",
            maxHeight: "320px",
            minHeight: "auto",
            overflowY: "auto",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            border: "none",
          }}
        >
          {/* Hide scrollbar for all browsers */}
          <style>
            {`
              .max-w-lg::-webkit-scrollbar { display: none; }
              .max-w-lg { scrollbar-width: none; -ms-overflow-style: none; }
            `}
          </style>
          <div>
            {widgetList.map((widget) =>
              selected[widget.key] ? (
                <div
                  key={widget.key}
                  className="mb-2 last:mb-0 transition-all duration-300"
                >
                  {widget.component}
                </div>
              ) : null
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);

root.render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
);
