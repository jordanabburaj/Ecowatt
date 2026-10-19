import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  LineChart, Line,
  BarChart, Bar,
  AreaChart, Area,
  XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer
} from "recharts";
import "./App.css";

const CO2_FACTOR = 0.385;

//usestate hooks start

export default function App() {
  const [latest, setLatest] = useState(null);
  const [history, setHistory] = useState([]);
  const [chartType, setChartType] = useState("line");
  const [switchState, setSwitchState] = useState("OFF");
  //  NEW: Drift state
  const [drift, setDrift] = useState(null);
  //  Chatbot state
const [chatOpen, setChatOpen] = useState(false);
const [messages, setMessages] = useState([
  { from: "bot", text: "Hi 👋 I'm EcoBot. Ask me about energy, CO₂, or savings!" }
]);
const [input, setInput] = useState("");

//usestate hooks end


//logic and fn starts
  const fetchData = async () => {
    const [l, h, d] = await Promise.all([
      axios.get("http://localhost:5001/latest"),
      axios.get("http://localhost:5001/history"),
      axios.get("http://localhost:5001/drift/monthly")
    ]);

    setLatest(l.data);
    setHistory(h.data);
    setDrift(d.data);
  };

  useEffect(() => {
    fetchData();
    const i = setInterval(fetchData, 1000);
    return () => clearInterval(i);
  }, []);

  const toggleSwitch = async () => {
    await axios.post("http://localhost:5001/toggle");
    setSwitchState(prev => (prev === "ON" ? "OFF" : "ON"));
  };

  const energy = latest?.energy ?? 0;
  const power = latest?.power ?? 0;
  const voltage = latest?.voltage ?? 0;
  const current = latest?.current ?? 0;
  const co2 = energy * CO2_FACTOR;


const getBotReply = (text) => {
  const q = text.toLowerCase();

  // ENERGY CONTEXT
  if (q.includes("energy")) {
    if (energy > 1) {
      return `⚠️ You've used ${energy.toFixed(3)} kWh today, which is relatively high. Consider switching off idle devices.`;
    }
    return `✅ Your energy usage today is ${energy.toFixed(3)} kWh. That's efficient!`;
  }

  // CO2 CONTEXT
  if (q.includes("co2") || q.includes("carbon")) {
    if (co2 > 0.5) {
      return `🌍 Your CO₂ emission is ${co2.toFixed(3)} kg, which is above ideal levels. Reducing usage now can help.`;
    }
    return `🌱 Your CO₂ emission is ${co2.toFixed(3)} kg. You're doing great for the environment!`;
  }

  // DRIFT CONTEXT
  if (q.includes("drift")) {
    if (!drift || drift.drift === 0) {
      return "📊 I'm still collecting monthly data to calculate energy drift.";
    }

    if (drift.drift > 0) {
      return `📈 Your energy usage increased by ${drift.drift} kWh compared to last month (${drift.percentage}%).`;
    }

    return `📉 Great news! Your energy usage dropped by ${Math.abs(drift.drift)} kWh this month.`;
  }

  // POWER CONTEXT
  if (q.includes("power")) {
    return `⚡ Your current power draw is ${power} W. Turning off unused appliances reduces this instantly.`;
  }

  // SWITCH CONTEXT
  if (q.includes("switch") || q.includes("plug")) {
    return `🔌 Your smart plug is currently ${switchState}.`;
  }

  // DEFAULT
  return "🤖 I can explain energy usage, CO₂ emissions, drift, power, or help you save energy.";
};


const sendMessage = () => {
  if (!input.trim()) return;

  setMessages(prev => [
    ...prev,
    { from: "user", text: input },
    { from: "bot", text: getBotReply(input) }
  ]);

  setInput("");
};


  //co2 thing 1
  // 🌱 Carbon equivalents (easy to understand)
const treesEquivalent = co2 / 21;     // 1 tree absorbs ~21kg CO₂/year
const carKmEquivalent = co2 * 4.6;    // ~4.6 km driven per kg CO₂
const phoneChargeEq = co2 * 120;      // ~120 phone charges per kg CO₂

let impactLevel = "Low";
if (co2 > 5) impactLevel = "Medium";
if (co2 > 20) impactLevel = "High";
//end co2 thing 1

 // Drift helpers (FIXED)
const driftKwh = drift?.drift ?? 0;
const driftPct = drift?.percentage ?? 0;
const driftUp = driftKwh > 0;

//co2 thing 2
const AnimatedNumber = ({ value, decimals = 1 }) => {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 800;
    const step = Math.max(1, Math.abs(value) / 40);

    const interval = setInterval(() => {
      start += step;
      if (start >= value) {
        start = value;
        clearInterval(interval);
      }
      setDisplay(start);
    }, duration / 40);

    return () => clearInterval(interval);
  }, [value]);

  return display.toFixed(decimals);
};
//end co2 thing 2


  return (
    <div className="app">

      {/* HEADER */}
      <header className="header">
        <div className="brand">
          <span className="logo">⚡</span>
          <div>
            <h1>Ecowatt</h1>
            <p>Live Energy Monitoring</p>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="hero">
        <div className="energy-card">
          <div className="energy-value">
            {energy.toFixed(3)} <span>kWh</span>
          </div>
          <div className="energy-label">Energy Today</div>
        </div>

        <div className="co2-card">
          <div className="co2-title">Carbon Emission</div>
          <div className="co2-value">{co2.toFixed(3)} kg CO₂</div>
          <div className="co2-sub">
            Factor {CO2_FACTOR} kg / kWh
          </div>
        </div>
      </section>

{/* 🌍 CARBON EQUIVALENTS */}
<section className="equivalents">
  <h3>🌍 Environmental Impact</h3>

  <div className="equivalent-grid">
    <div className="equivalent-card">
      <span className="eq-icon">🌳</span>
      <strong>
        <AnimatedNumber value={treesEquivalent} /> trees
      </strong>
      <p>CO₂ absorbed yearly</p>
    </div>

    <div className="equivalent-card">
      <span className="eq-icon">🚗</span>
      <strong>
        <AnimatedNumber value={carKmEquivalent} /> km
      </strong>
      <p>Car driving equivalent</p>
    </div>

    <div className="equivalent-card">
      <span className="eq-icon">📱</span>
      <strong>
        <AnimatedNumber value={phoneChargeEq} decimals={0} /> charges
      </strong>
      <p>Phone charges</p>
    </div>
  </div>

  <div className={`impact-badge ${impactLevel.toLowerCase()}`}>
    Impact Level: <strong>{impactLevel}</strong>
  </div>
</section>



      
      <section className="drift-card">
  <h3>📉 Energy Drift (Monthly)</h3>

  {!drift?.currentMonth ? (
    <p className="drift-wait">Collecting monthly data…</p>
  ) : (
    <>
      <div className="drift-period">
        Comparing <strong>{drift.previousMonth}</strong> →{" "}
        <strong>{drift.currentMonth}</strong>
      </div>

      <div className={`drift-result ${driftUp ? "up" : "down"}`}>
        {driftUp ? "▲ Increased" : "▼ Reduced"} by{" "}
        <strong>{Math.abs(driftKwh).toFixed(2)} kWh</strong>
        {" "}({Math.abs(driftPct).toFixed(1)}%)
      </div>
    </>
  )}
</section>


      {/* METRICS */}
      <section className="metrics">
        <div className="metric">
          <label>Power</label>
          <strong>{power} W</strong>
        </div>

        <div className="metric">
          <label>Voltage</label>
          <strong>{voltage} V</strong>
        </div>

        <div className="metric">
          <label>Current</label>
          <strong>{current} A</strong>
        </div>

        <div className="metric switch-metric">
          <label>Smart Plug</label>
          <div
            className={`toggle ${switchState === "ON" ? "on" : "off"}`}
            onClick={toggleSwitch}
          >
            <div className="toggle-knob" />
            <span className="toggle-text">{switchState}</span>
          </div>
        </div>
      </section>

      {/* CHART */}
      <section className="chart">
        <div className="chart-header">
          <h3>Energy Usage</h3>
          <div className="chart-buttons">
            <button onClick={() => setChartType("line")}>Line</button>
            <button onClick={() => setChartType("bar")}>Bar</button>
            <button onClick={() => setChartType("area")}>Area</button>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          {chartType === "line" && (
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis hide />
              <YAxis />
              <Tooltip />
              <Line dataKey="energy" stroke="#0ea5a4" strokeWidth={3} dot={false} />
            </LineChart>
          )}

          {chartType === "bar" && (
            <BarChart data={history}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis hide />
              <YAxis />
              <Tooltip />
              <Bar dataKey="energy" fill="#06b6d4" />
            </BarChart>
          )}

          {chartType === "area" && (
            <AreaChart data={history}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis hide />
              <YAxis />
              <Tooltip />
              <Area dataKey="energy" stroke="#10b981" fill="#bbf7d0" />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </section>
      {/* 🤖 CHATBOT */}
<div className={`chatbot ${chatOpen ? "open" : ""}`}>
  <div className="chat-header" onClick={() => setChatOpen(!chatOpen)}>
    🤖 EcoBot
  </div>

  {chatOpen && (
    <div className="chat-body">
      <div className="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.from}`}>
            {m.text}
          </div>
        ))}
      </div>

      <div className="chat-input">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask EcoBot..."
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  )}
</div>

    </div>
  );
}
