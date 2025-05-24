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
    label: "Cumulative Carbon Emission",
    component: <CumulativeCarbonEmission />,
  },
  {
    key: "web",
    label: "Web Carbon Emission",
    component: <WebCarbonEmission />,
  },
  {
    key: "chatgpt",
    label: "ChatGPT Carbon Emission",
    component: <ChatGPTCarbonEmission />,
  },
  { key: "limit", label: "Limit Your Usage", component: <LimitYourUsage /> },
  { key: "chart", label: "Usage Chart", component: <UsageChart /> },
];

const defaultSelected = {
  cumulative: false,
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
      className={
        `p-6 min-w-[24rem] relative transition-all` +
        (menuOpen ? " min-h-screen" : "")
      }
      style={menuOpen ? { minHeight: "100vh" } : undefined}
    >
      {/* Hamburger menu button */}
      <button
        className="absolute top-4 right-4 z-20 w-8 h-8 flex flex-col justify-center items-center"
        onClick={() => setMenuOpen((open) => !open)}
        aria-label="Open menu"
      >
        <span className="block w-6 h-0.5 bg-gray-800 mb-1 rounded"></span>
        <span className="block w-6 h-0.5 bg-gray-800 mb-1 rounded"></span>
        <span className="block w-6 h-0.5 bg-gray-800 rounded"></span>
      </button>

      {/* Collapsible menu popup */}
      {menuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-30 flex justify-end">
          <div className="bg-white shadow-lg w-72 h-full p-4 relative">
            <button
              className="absolute top-2 right-2 text-xl"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
            >
              ×
            </button>
            <h2 className="font-semibold mb-2 mt-6">Widgets</h2>
            <ul>
              {widgetList.map((widget) => (
                <li key={widget.key} className="flex items-center mb-1">
                  <input
                    type="checkbox"
                    id={widget.key}
                    checked={selected[widget.key]}
                    onChange={() => handleCheckbox(widget.key)}
                    className="mr-2"
                  />
                  <label htmlFor={widget.key}>{widget.label}</label>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <h1 className="text-2xl font-bold mb-4">Carbon Emission Calculator</h1>
      {/* Widgets rendered here */}
      <div>
        {widgetList.map((widget) =>
          selected[widget.key] ? (
            <div key={widget.key} className="mb-3">
              {widget.component}
            </div>
          ) : null
        )}
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
