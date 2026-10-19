const express = require("express");
const mongoose = require("mongoose");
const mqtt = require("mqtt");
const cors = require("cors");
require("dotenv").config();

const EnergyData = require("./models/EnergyData");
const EnergyMonthly = require("./models/EnergyMonthly");

const app = express();
app.use(cors());
app.use(express.json());

/* =======================
   MongoDB
======================= */
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Error:", err.message));

/* =======================
   MQTT
======================= */
const mqttClient = mqtt.connect(process.env.MQTT_URL, {
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
  reconnectPeriod: 3000
});

mqttClient.on("connect", () => {
  console.log("📡 MQTT Connected");
  mqttClient.subscribe("tele/+/SENSOR");
});

mqttClient.on("message", async (_, message) => {
  try {
    const data = JSON.parse(message.toString());
    if (!data.ENERGY) return;

    await EnergyData.create({
      energy: data.ENERGY.Today || 0,
      power: data.ENERGY.Power?.[0] || 0,
      voltage: data.ENERGY.Voltage || 0,
      current: data.ENERGY.Current?.[0] || 0
    });
  } catch (err) {
    console.error("❌ MQTT Parse Error:", err.message);
  }
});

/* =======================
   MONTHLY AGGREGATION
======================= */
async function storeMonthlyEnergy() {
  const month = new Date().toISOString().slice(0, 7);

  const records = await EnergyData.find({
    timestamp: {
      $gte: new Date(`${month}-01T00:00:00.000Z`)
    }
  });

  if (!records.length) return;

  const totalEnergy = records.reduce((s, r) => s + r.energy, 0);

  await EnergyMonthly.findOneAndUpdate(
    { month },
    { totalEnergy: Number(totalEnergy.toFixed(3)) },
    { upsert: true }
  );
}

// Run monthly on 1st day midnight
setInterval(() => {
  const now = new Date();
  if (now.getDate() === 1 && now.getHours() === 0) {
    storeMonthlyEnergy();
  }
}, 1000 * 60 * 60);

/* =======================
   API ROUTES
======================= */

app.get("/latest", async (_, res) => {
  const latest = await EnergyData.findOne().sort({ timestamp: -1 });
  res.json(latest || {});
});

app.get("/history", async (_, res) => {
  const data = await EnergyData.find().sort({ timestamp: -1 }).limit(50);
  res.json(data.reverse());
});

// app.get("/drift/monthly", async (_, res) => {
//   const months = await EnergyMonthly.find().sort({ month: -1 }).limit(2);

//   if (months.length < 2) {
//     return res.json({
//       currentMonth: "",
//       previousMonth: "",
//       drift: 0,
//       percentage: 0
//     });
//   }

//   const current = months[0].totalEnergy;
//   const previous = months[1].totalEnergy;

//   const drift = Number((current - previous).toFixed(3));
//   const percentage = Number(((drift / previous) * 100).toFixed(2));

//   res.json({
//     currentMonth: months[0].month,
//     previousMonth: months[1].month,
//     drift,
//     percentage
//   });
// });
app.get("/drift/monthly", async (_, res) => {
  try {
    const months = await EnergyMonthly.find()
      .sort({ month: -1 })
      .limit(2);

    // Not enough data yet
    if (months.length < 2) {
      return res.json({
        currentMonth: null,
        previousMonth: null,
        drift: 0,
        percentage: 0
      });
    }

    const currentEnergy = Number(months[0]?.totalEnergy || 0);
    const previousEnergy = Number(months[1]?.totalEnergy || 0);

    if (previousEnergy === 0) {
      return res.json({
        currentMonth: months[0].month,
        previousMonth: months[1].month,
        drift: 0,
        percentage: 0
      });
    }

    const drift = Number((currentEnergy - previousEnergy).toFixed(3));
    const percentage = Number(
      (((currentEnergy - previousEnergy) / previousEnergy) * 100).toFixed(2)
    );

    res.json({
      currentMonth: months[0].month,
      previousMonth: months[1].month,
      drift,
      percentage
    });

  } catch (err) {
    console.error("❌ Monthly drift error:", err.message);
    res.status(500).json({
      currentMonth: null,
      previousMonth: null,
      drift: 0,
      percentage: 0
    });
  }
});

app.post("/toggle", (_, res) => {
  mqttClient.publish("cmnd/dualr3/POWER1", "TOGGLE");
  res.json({ success: true });
});

app.listen(process.env.PORT, () => {
  console.log(`🚀 Server running on ${process.env.PORT}`);
});
