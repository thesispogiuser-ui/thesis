let monthlyData = [];
let totalConsumption = 0;
let previousReading = 0;
let lastDailyConsumption = 0;
let leakNotified = false;
let monthlyHistory = [];
let currentDay = 1;
let simulationInterval = null;

// 1. New Multi-Building State
let currentBuilding = 'A';
let buildings = {
  'A': { monthlyData: [], total: 0, previous: 0, currentDay: 1, leakNotified: false },
  'B': { monthlyData: [], total: 0, previous: 0, currentDay: 1, leakNotified: false },
  'C': { monthlyData: [], total: 0, previous: 0, currentDay: 1, leakNotified: false }
};

// 2. Switcher Logic
function switchBuilding(id) {
  currentBuilding = id;
  const data = buildings[id];

  // Update UI Buttons
  document.querySelectorAll('.b-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`btn-${id}`).classList.add('active');
  document.getElementById('active-bldg-label').innerHTML = `Currently Monitoring: <strong>Building ${id}</strong>`;

  // Update Dashboard KPIs
  document.getElementById("totalConsumption").innerText = data.total.toFixed(2) + " KL";

  const lastDaily = data.monthlyData.length > 0 ? data.monthlyData[data.monthlyData.length - 1] : 0;
  document.getElementById("dailyConsumption").innerText = lastDaily.toFixed(2) + " KL";

  const lastLeak = (data.leakLog || []).length > 0 ? data.leakLog[data.leakLog.length - 1] : 0;
  document.getElementById("alertBox").classList.toggle("hidden", lastLeak === 0);

  // Refresh Charts for this building
  resetCharts();
  data.monthlyData.forEach((val, i) => {
    const label = "Day " + (i + 1);
    consumptionChart.data.labels.push(label);
    consumptionChart.data.datasets[0].data.push(val);
    leakChart.data.labels.push(label);
    leakChart.data.datasets[0].data.push((data.leakLog || [])[i] || 0);
  });
  consumptionChart.update();
  leakChart.update();
}

// 3. Modified processReading (Update your existing function to match this)
function processReading(prev, current) {
  const bldg = buildings[currentBuilding];
  const daily = current - prev;
  if (daily < 0) return;

  bldg.total += daily;
  const percentage = prev === 0 ? 0 : ((daily / prev) * 100).toFixed(2);

  // Update UI
  document.getElementById("dailyConsumption").innerText = daily.toFixed(2) + " KL";
  document.getElementById("totalConsumption").innerText = bldg.total.toFixed(2) + " KL";
  document.getElementById("percentageChange").innerText = percentage + "%";

  const leakDetected = (daily > 100 || parseFloat(percentage) > 50);
  document.getElementById("alertBox").classList.toggle("hidden", !leakDetected);
  if (leakDetected) saveLeakToHistory(daily, percentage, currentBuilding);

  // Charting for current building
  if (bldg.currentDay <= 31) {
    const label = "Day " + bldg.currentDay;
    consumptionChart.data.labels.push(label);
    consumptionChart.data.datasets[0].data.push(parseFloat(daily.toFixed(2)));
    consumptionChart.update();

    leakChart.data.labels.push(label);
    leakChart.data.datasets[0].data.push(leakDetected ? 1 : 0);
    leakChart.update();

    bldg.monthlyData.push(daily);
    bldg.currentDay++;
  }
  
  // Update internal tracker
  buildings[currentBuilding].previous = current; 
}

// 4. Update simulateReading to use the new state
function simulateReading() {
  const bldg = buildings[currentBuilding];
  const increment = Math.random() * 100 + 20;
  const current = bldg.previous + increment;
  processReading(bldg.previous, current);
  bldg.previous = current;
}

// ─────────────────────────────────────────────
// Charts setup
// ─────────────────────────────────────────────
const ctxConsumption = document.getElementById("consumptionChart").getContext("2d");
const ctxLeak = document.getElementById("leakChart").getContext("2d");

const commonOptions = {
  responsive: true,
  animation: { duration: 500 },
  scales: {
    x: { grid: { color: '#888', lineWidth: 1 }, ticks: { color: '#ffcc00' } },
    y: {
      beginAtZero: true,
      grid: { color: '#888', lineWidth: 1 },
      ticks: { color: '#ffcc00', stepSize: 20 }
    }
  },
  plugins: { legend: { labels: { color: '#ffcc00' } } }
};

const consumptionChart = new Chart(ctxConsumption, {
  type: "line",
  data: {
    labels: [],
    datasets: [{
      label: "Daily Consumption (KL)",
      data: [],
      borderColor: "#00d4ff",
      backgroundColor: "rgba(0,212,255,0.08)",
      fill: true,
      tension: 0.3,
      pointRadius: 4,
      pointHoverRadius: 6
    }]
  },
  options: {
    ...commonOptions,
    scales: {
      ...commonOptions.scales,
      y: { ...commonOptions.scales.y, suggestedMax: 150 }
    }
  }
});

const leakChart = new Chart(ctxLeak, {
  type: "bar",
  data: {
    labels: [],
    datasets: [{
      label: "Leak Detected (1=Yes, 0=No)",
      data: [],
      backgroundColor: function(ctx) {
        return ctx.raw === 1 ? "#ff4d4d" : "#2b9348";
      },
      borderRadius: 4
    }]
  },
  options: {
    ...commonOptions,
    scales: {
      ...commonOptions.scales,
      y: {
        beginAtZero: true,
        max: 1,
        ticks: { color: '#ffcc00', stepSize: 1 }
      }
    }
  }
});

// ─────────────────────────────────────────────
// Leak History
// ─────────────────────────────────────────────
let leakHistory = [];

function saveLeakToHistory(daily, percentage, building) {
  const now = new Date();
  leakHistory.unshift({
    id: Date.now(),
    date: now.toLocaleString(),
    building: building,
    daily: daily.toFixed(2),
    percentage: percentage,
    aiRecommendation: null
  });
}

function openLeakHistory() {
  document.getElementById("leakHistoryModal").classList.add("show");
  renderLeakHistory();
}

function closeLeakHistory() {
  document.getElementById("leakHistoryModal").classList.remove("show");
}

function renderLeakHistory() {
  const list = document.getElementById("leakHistoryList");
  const empty = document.getElementById("leakHistoryEmpty");
  list.innerHTML = "";

  if (leakHistory.length === 0) {
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  leakHistory.forEach(function(item) {
    const div = document.createElement("div");
    div.className = "leak-history-item";
    div.innerHTML = `
      <div class="leak-history-item-header" onclick="toggleLeakItem(${item.id})">
        <div class="leak-history-meta">
          <span class="leak-history-date">🏢 Building ${item.building} &nbsp;•&nbsp; ${item.date}</span>
          <span class="leak-history-stats">Daily: ${item.daily} KL &nbsp;|&nbsp; Change: ${item.percentage}%</span>
        </div>
        <span class="leak-history-badge">⚠ Leak Detected</span>
      </div>
      <div class="leak-history-item-body" id="body-${item.id}">
        ${item.aiRecommendation
          ? `<div class="leak-ai-content">${item.aiRecommendation}</div>`
          : `<button class="btn-view-ai" onclick="fetchLeakAI(${item.id}, ${item.daily}, ${item.percentage}, '${item.building}')">🤖 Load AI Recommendations</button>`
        }
      </div>
    `;
    list.appendChild(div);
  });
}

function toggleLeakItem(id) {
  const body = document.getElementById("body-" + id);
  body.classList.toggle("open");
}

function fetchLeakAI(id, daily, percentage, building) {
  const body = document.getElementById("body-" + id);
  body.innerHTML = `<div class="leak-ai-loading"><div class="leak-ai-mini-spinner"></div> Generating AI recommendations...</div>`;
  body.classList.add("open");

  setTimeout(function() {
    const formatted = generateSmartRecommendations(parseFloat(daily), parseFloat(percentage), building);
    const entry = leakHistory.find(e => e.id === id);
    if (entry) entry.aiRecommendation = formatted;
    body.innerHTML = `<div class="leak-ai-content">${formatted}</div>`;
  }, 900);
}

// ─────────────────────────────────────────────
// AI Recommendations Modal
// ─────────────────────────────────────────────
function openAIRecommendModal() {
  const modal = document.getElementById("aiRecommendModal");
  const loading = document.getElementById("aiLoading");
  const content = document.getElementById("aiContent");

  modal.classList.add("show");
  loading.style.display = "flex";
  content.innerHTML = "";

  const daily   = parseFloat(document.getElementById("dailyConsumption").innerText);
  const pct     = parseFloat(document.getElementById("percentageChange").innerText);
  const bldg    = currentBuilding;

  setTimeout(function() {
    loading.style.display = "none";
    content.innerHTML = generateSmartRecommendations(daily, pct, bldg);
  }, 900);
}

// ─────────────────────────────────────────────
// Smart Rule-Based Recommendation Engine
// ─────────────────────────────────────────────
function generateSmartRecommendations(daily, percentage, building) {
  // Determine severity
  let severity, severityColor, severityLabel;
  if (daily > 200 || percentage > 100) {
    severity = "critical";
    severityColor = "#ff4d4d";
    severityLabel = "🔴 CRITICAL";
  } else if (daily > 150 || percentage > 75) {
    severity = "high";
    severityColor = "#ff8c00";
    severityLabel = "🟠 HIGH";
  } else {
    severity = "moderate";
    severityColor = "#ffcc00";
    severityLabel = "🟡 MODERATE";
  }

  const assessments = {
    critical: `Critical leak alert in Building ${building} — daily consumption of ${daily.toFixed(2)} KL (${percentage.toFixed(1)}% above baseline) indicates a major pipe burst or severe leak requiring immediate emergency response.`,
    high:     `High-severity leak detected in Building ${building} — a ${percentage.toFixed(1)}% spike to ${daily.toFixed(2)} KL daily suggests a significant pipe failure or multiple fixture leaks that need urgent attention.`,
    moderate: `Moderate leak detected in Building ${building} — consumption of ${daily.toFixed(2)} KL is ${percentage.toFixed(1)}% above normal, likely caused by a running fixture, minor pipe leak, or faulty valve.`
  };

  const immediateActions = {
    critical: [
      "Shut off the main water supply to Building " + building + " immediately to prevent flooding.",
      "Evacuate any areas showing signs of water damage or structural risk.",
      "Contact emergency plumbing services for an urgent on-site inspection.",
      "Document the current meter reading and photograph any visible water damage."
    ],
    high: [
      "Locate and isolate the affected water zone by shutting sectional valves in Building " + building + ".",
      "Dispatch maintenance personnel immediately to inspect high-risk areas.",
      "Notify building occupants and restrict access to potentially affected floors.",
      "Record meter readings every 15 minutes to track if leak is worsening."
    ],
    moderate: [
      "Alert the maintenance team in Building " + building + " to begin a physical walkthrough.",
      "Check and close all fixtures and valves that may have been left open.",
      "Record the current meter reading, then recheck after 30 minutes of zero usage.",
      "Monitor the dashboard closely for any further consumption spikes."
    ]
  };

  const inspectionItems = {
    critical: [
      "Inspect main supply pipes and risers for visible bursts or water pooling.",
      "Check basement and utility rooms for flooding or pipe ruptures.",
      "Examine all floor drains for backflow indicating overflow.",
      "Test pressure gauges — abnormally low pressure confirms a major break.",
      "Scan ceilings of lower floors for water staining or dripping."
    ],
    high: [
      "Check all toilet tanks for silent running leaks using a dye tablet test.",
      "Inspect pipe joints and elbows in service corridors for drips or corrosion.",
      "Test all isolation valves to confirm they fully close without bypass.",
      "Look for moisture, mold, or staining on walls near pipe routes.",
      "Verify water meter sub-readings per floor to isolate the affected zone."
    ],
    moderate: [
      "Check all toilets, taps, and showerheads for dripping or running water.",
      "Inspect under sinks and behind appliances (dishwashers, washing machines).",
      "Look for wet spots, discoloration, or soft flooring as signs of hidden leaks.",
      "Check outdoor taps and irrigation systems for continuous flow.",
      "Verify that all automatic fill valves (tanks, boilers) are working correctly."
    ]
  };

  const preventiveMeasures = [
    "Install smart water leak sensors at high-risk points (pipe joints, under sinks, near water heaters).",
    "Schedule monthly water meter audits to catch abnormal consumption early.",
    "Implement a consumption baseline per building and set automated alerts for any deviation above 30%.",
    "Conduct quarterly plumbing inspections for aging pipes, worn seals, and corroded fittings.",
    "Train building staff to identify early signs of leaks and know emergency shut-off locations."
  ];

  // Build HTML
  let html = `<div class="ai-badge" style="background:rgba(255,77,77,0.15);color:${severityColor};border-color:${severityColor}40;">${severityLabel} Severity &nbsp;•&nbsp; Smart Analysis</div>`;
  html += `<p style="color:#e0e0e0;margin-bottom:16px;font-style:italic;line-height:1.6;">${assessments[severity]}</p>`;

  html += `<h3>⚡ Immediate Actions</h3><ul>`;
  immediateActions[severity].forEach(a => { html += `<li>${a}</li>`; });
  html += `</ul>`;

  html += `<h3>🔍 Inspection Checklist</h3><ul>`;
  inspectionItems[severity].forEach(a => { html += `<li>${a}</li>`; });
  html += `</ul>`;

  html += `<h3>🛡 Preventive Measures</h3><ul>`;
  preventiveMeasures.forEach(a => { html += `<li>${a}</li>`; });
  html += `</ul>`;

  return html;
}

function closeAIRecommendModal() {
  document.getElementById("aiRecommendModal").classList.remove("show");
}

// ─────────────────────────────────────────────
// Logout
// ─────────────────────────────────────────────
function logOut() {
  document.getElementById("logoutModal").classList.add("show");
}

function confirmLogout() {
  sessionStorage.removeItem("loggedIn");
  sessionStorage.removeItem("username");
  window.location.href = "login.html";
}

function closeLogoutModal() {
  document.getElementById("logoutModal").classList.remove("show");
}

// ─────────────────────────────────────────────
// Sidebar
// ─────────────────────────────────────────────
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  const hamburger = document.getElementById("hamburgerBtn");
  sidebar.classList.toggle("show");
  overlay.classList.toggle("show");
  hamburger.classList.toggle("open");
}

function closeSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  const hamburger = document.getElementById("hamburgerBtn");
  sidebar.classList.remove("show");
  overlay.classList.remove("show");
  hamburger.classList.remove("open");
}

// ─────────────────────────────────────────────
// Page navigation
// ─────────────────────────────────────────────
function showPage(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(pageId).classList.add("active");
  document.querySelectorAll(".btn-topbar-nav").forEach(b => b.classList.remove("active"));
  const map = { dashboardPage: 0, recommendationsPage: 1, historyPage: 2 };
  const btns = document.querySelectorAll(".btn-topbar-nav");
  if (btns[map[pageId]]) btns[map[pageId]].classList.add("active");
  if (pageId === "historyPage") renderHistory();
}

// ─────────────────────────────────────────────
// BUTTON: Analyze (manual input)
// ─────────────────────────────────────────────
function analyzeReading() {
  const prevVal = document.getElementById("prevReading").value.trim();
  const currVal = document.getElementById("currentReading").value.trim();
  const errorEl = document.getElementById("inputError");

  if (prevVal === "" && currVal === "") {
    errorEl.classList.add("hidden");
    simulateReading();
    return;
  }

  const prev = parseFloat(prevVal);
  const current = parseFloat(currVal);

  if (isNaN(prev) || isNaN(current) || prev < 0 || current < 0) {
    errorEl.textContent = "⚠ Please enter valid non-negative numbers, or leave both blank for auto simulation.";
    errorEl.classList.remove("hidden");
    return;
  }

  if (current < prev) {
    errorEl.textContent = "⚠ Current reading cannot be less than previous reading.";
    errorEl.classList.remove("hidden");
    return;
  }

  errorEl.classList.add("hidden");
  processReading(prev, current);
  previousReading = current;
  document.getElementById("prevReading").value = "";
  document.getElementById("currentReading").value = "";
}

// ─────────────────────────────────────────────
// Simulate daily reading
// ─────────────────────────────────────────────
function simulateReading() {
  const increment = Math.random() * 100 + 20;
  const current = previousReading + increment;
  processReading(previousReading, current);
  previousReading = current;
}

// ─────────────────────────────────────────────
// Core reading processor
// ─────────────────────────────────────────────
function processReading(prev, current) {
  const daily = current - prev;
  if (daily < 0) return;

  lastDailyConsumption = daily;
  totalConsumption += daily;
  const percentage = prev === 0 ? 0 : ((daily / prev) * 100).toFixed(2);

  document.getElementById("dailyConsumption").innerText = daily.toFixed(2) + " KL";
  document.getElementById("totalConsumption").innerText = totalConsumption.toFixed(2) + " KL";
  document.getElementById("percentageChange").innerText = percentage + "%";

  const leakDetected = (daily > 100 || parseFloat(percentage) > 50);
  document.getElementById("alertBox").classList.toggle("hidden", !leakDetected);
  if (leakDetected) saveLeakToHistory(daily, percentage, currentBuilding);

  if (leakDetected && !leakNotified) {
    leakNotified = true;
    sendLeakEmail(daily, percentage);
  } else if (!leakDetected) {
    leakNotified = false;
  }

  if (currentDay <= 31) {
    const label = "Day " + currentDay;
    consumptionChart.data.labels.push(label);
    consumptionChart.data.datasets[0].data.push(parseFloat(daily.toFixed(2)));
    consumptionChart.update();

    leakChart.data.labels.push(label);
    leakChart.data.datasets[0].data.push(leakDetected ? 1 : 0);
    leakChart.update();

    monthlyData.push(daily);
    currentDay++;
  }

  const today = new Date();
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  if (today.getDate() === lastDayOfMonth || currentDay > 31) {
    generateMonthlyPDF(true, false);
    resetCharts();
    monthlyData = [];
    totalConsumption = 0;
    previousReading = current;
    currentDay = 1;
  }
}

// ─────────────────────────────────────────────
// BUTTON: Daily PDF Preview
// ─────────────────────────────────────────────
function previewDailyPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const now = new Date();
  const bldg = buildings[currentBuilding];

  doc.setFontSize(18);
  doc.setTextColor(27, 38, 59);
  doc.text("Daily Water Consumption Report", 20, 22);

  doc.setFontSize(11);
  doc.setTextColor(80, 80, 80);
  doc.text("Generated: " + now.toLocaleString(), 20, 32);
  doc.text("Active Building: " + currentBuilding, 20, 40);

  doc.setDrawColor(200, 200, 200);
  doc.line(20, 44, 190, 44);

  // ── Current Building Stats ──
  doc.setFontSize(13);
  doc.setTextColor(27, 38, 59);
  doc.text("Building " + currentBuilding + " — Current Readings", 20, 54);

  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text("Daily Consumption:   " + document.getElementById("dailyConsumption").innerText, 20, 64);
  doc.text("Total Consumption:   " + document.getElementById("totalConsumption").innerText, 20, 74);
  doc.text("Percentage Change:   " + document.getElementById("percentageChange").innerText, 20, 84);

  const leakStatus = !document.getElementById("alertBox").classList.contains("hidden")
    ? "YES - Leak Detected!" : "No";
  doc.setTextColor(leakStatus.startsWith("YES") ? 200 : 0, 0, 0);
  doc.text("Leak Alert:          " + leakStatus, 20, 94);

  // ── All Buildings Total Consumption Summary ──
  doc.setDrawColor(200, 200, 200);
  doc.line(20, 102, 190, 102);

  doc.setFontSize(13);
  doc.setTextColor(27, 38, 59);
  doc.text("All Buildings — Total Consumption Summary", 20, 112);

  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  let summaryY = 122;
  let grandTotal = 0;
  ['A', 'B', 'C'].forEach(function(id) {
    const total = buildings[id].total;
    grandTotal += total;
    const days = buildings[id].monthlyData.length;
    const leaks = (buildings[id].leakLog || []).filter(v => v === 1).length;
    doc.text("Building " + id + ":", 20, summaryY);
    doc.text(total.toFixed(2) + " KL", 80, summaryY);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("(" + days + " days recorded, " + leaks + " leak(s) detected)", 115, summaryY);
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    summaryY += 10;
  });

  doc.setDrawColor(200, 200, 200);
  doc.line(20, summaryY, 190, summaryY);
  summaryY += 8;
  doc.setFontSize(12);
  doc.setTextColor(27, 38, 59);
  doc.text("Total Consumption (All Buildings):", 20, summaryY);
  doc.setTextColor(0, 0, 0);
  doc.text(grandTotal.toFixed(2) + " KL", 130, summaryY);

  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  document.getElementById("dailyPdfFrame").src = url;
  document.getElementById("dailyPdfModal").classList.add("show");
}

function closeDailyPdfModal() {
  document.getElementById("dailyPdfModal").classList.remove("show");
  document.getElementById("dailyPdfFrame").src = "";
}

// ─────────────────────────────────────────────
// BUTTON: Daily PDF
// ─────────────────────────────────────────────
function generateDailyPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const now = new Date();

  doc.setFontSize(18);
  doc.setTextColor(27, 38, 59);
  doc.text("Daily Water Consumption Report", 20, 22);

  doc.setFontSize(11);
  doc.setTextColor(80, 80, 80);
  doc.text("Generated: " + now.toLocaleString(), 20, 32);

  doc.setDrawColor(200, 200, 200);
  doc.line(20, 36, 190, 36);

  doc.setFontSize(13);
  doc.setTextColor(0, 0, 0);
  doc.text("Daily Consumption:   " + document.getElementById("dailyConsumption").innerText, 20, 50);
  doc.text("Total Consumption:   " + document.getElementById("totalConsumption").innerText, 20, 62);
  doc.text("Percentage Change:   " + document.getElementById("percentageChange").innerText, 20, 74);

  const leakStatus = !document.getElementById("alertBox").classList.contains("hidden")
    ? "YES - Leak Detected!" : "No";
  doc.setTextColor(leakStatus.startsWith("YES") ? 200 : 0, 0, 0);
  doc.text("Leak Alert:          " + leakStatus, 20, 86);

  if (monthlyData.length > 0) {
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text("Day-by-Day Log (this month so far):", 20, 102);
    let y = 112;
    monthlyData.forEach(function(v, i) {
      doc.setFontSize(11);
      doc.text("  Day " + (i + 1) + ": " + v.toFixed(2) + " KL", 20, y);
      y += 9;
      if (y > 280) { doc.addPage(); y = 20; }
    });
  }

  doc.save("Daily_Report_" + now.toLocaleDateString().replace(/\//g, '-') + ".pdf");
}

// ─────────────────────────────────────────────
// BUTTON: Monthly PDF (always downloads)
// ─────────────────────────────────────────────
function downloadMonthlyPDF() {
  generateMonthlyPDF(false, true);
}

function generateMonthlyPDF(auto, download) {
  if (auto === undefined) auto = false;
  if (download === undefined) download = false;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const now = new Date();
  const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });

  doc.setFontSize(18);
  doc.setTextColor(27, 38, 59);
  doc.text("Monthly Water Consumption Report", 20, 22);

  doc.setFontSize(11);
  doc.setTextColor(80, 80, 80);
  doc.text("Generated: " + now.toLocaleString(), 20, 32);
  doc.text("Period: " + monthName, 20, 40);

  doc.setDrawColor(200, 200, 200);
  doc.line(20, 44, 190, 44);

  let y = 54;
  let grandTotal = 0;

  ['A', 'B', 'C'].forEach(function(id) {
    const bldg = buildings[id];
    const data = bldg.monthlyData;
    const log  = bldg.leakLog || [];
    const leaks = log.filter(v => v === 1).length;
    grandTotal += bldg.total;

    doc.setFontSize(13);
    doc.setTextColor(27, 38, 59);
    doc.text("Building " + id, 20, y);
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    doc.text("Total: " + bldg.total.toFixed(2) + " KL   |   Days: " + data.length + "   |   Leaks: " + leaks, 20, y + 8);
    y += 18;

    if (data.length > 0) {
      data.forEach(function(v, i) {
        const leaked = log[i] === 1 ? " ⚠ Leak" : "";
        doc.setFontSize(10);
        doc.setTextColor(log[i] === 1 ? 200 : 80, 0, 0);
        doc.text("  Day " + (i + 1) + ": " + v.toFixed(2) + " KL" + leaked, 25, y);
        y += 8;
        if (y > 275) { doc.addPage(); y = 20; }
      });
    } else {
      doc.setFontSize(10);
      doc.setTextColor(150, 0, 0);
      doc.text("  No data recorded yet.", 25, y);
      y += 8;
    }

    doc.setDrawColor(220, 220, 220);
    doc.line(20, y, 190, y);
    y += 8;
    if (y > 265) { doc.addPage(); y = 20; }
  });

  doc.setFontSize(13);
  doc.setTextColor(27, 38, 59);
  doc.text("Grand Total (All Buildings): " + grandTotal.toFixed(2) + " KL", 20, y);

  if (download) {
    doc.save("Monthly_Report_" + monthName.replace(' ', '_') + ".pdf");
  }
  if (auto) {
    monthlyHistory.push({
      date: monthName,
      total: grandTotal.toFixed(2),
      pdfData: doc.output('blob')
    });
    renderHistory();
  }
}

// ─────────────────────────────────────────────
// BUTTON: Reset dashboard
// ─────────────────────────────────────────────
function resetDashboard() {
  if (!confirm("Reset all dashboard data and charts? This cannot be undone.")) return;

  monthlyData = [];
  totalConsumption = 0;
  previousReading = 0;
  lastDailyConsumption = 0;
  leakNotified = false;
  currentDay = 1;

  document.getElementById("dailyConsumption").innerText = "0 KL";
  document.getElementById("totalConsumption").innerText = "0 KL";
  document.getElementById("percentageChange").innerText = "0%";
  document.getElementById("alertBox").classList.add("hidden");
  document.getElementById("prevReading").value = "";
  document.getElementById("currentReading").value = "";

  const errorEl = document.getElementById("inputError");
  if (errorEl) {
    errorEl.classList.add("hidden");
    errorEl.textContent = "⚠ Please enter valid numbers, or leave both fields blank to use auto simulation.";
  }

  resetCharts();
}

function resetCharts() {
  consumptionChart.data.labels = [];
  consumptionChart.data.datasets[0].data = [];
  consumptionChart.update();

  leakChart.data.labels = [];
  leakChart.data.datasets[0].data = [];
  leakChart.update();
}

// ─────────────────────────────────────────────
// Email notification
// ─────────────────────────────────────────────
function sendLeakEmail(daily, percentage) {
  emailjs.send("YOUR_SERVICE_ID", "YOUR_TEMPLATE_ID", {
    to_email: "thesispogiuser@gmail.com",
    daily_usage: daily.toFixed(2),
    percent_change: percentage,
    message: "Leak detected! Daily usage: " + daily.toFixed(2) + " KL, Percentage change: " + percentage + "%"
  }).then(function() {
    console.log("Leak email sent");
  }).catch(function(err) {
    console.error("Email error:", err);
  });
}

// ─────────────────────────────────────────────
// History page
// ─────────────────────────────────────────────
function renderHistory() {
  const ul = document.getElementById("historyList");
  const emptyMsg = document.getElementById("historyEmpty");
  ul.innerHTML = "";

  // Build current in-progress entries from live building data
  const liveEntries = [];
  ['A', 'B', 'C'].forEach(function(id) {
    const bldg = buildings[id];
    if (bldg.monthlyData.length > 0) {
      const leaks = (bldg.leakLog || []).filter(v => v === 1).length;
      liveEntries.push({
        label: "🏢 Building " + id + " — Current Month (In Progress)",
        days: bldg.monthlyData.length,
        total: bldg.total.toFixed(2),
        leaks: leaks,
        live: true,
        id: id
      });
    }
  });

  const hasHistory = monthlyHistory.length > 0 || liveEntries.length > 0;

  if (!hasHistory) {
    if (emptyMsg) emptyMsg.style.display = "block";
    return;
  }
  if (emptyMsg) emptyMsg.style.display = "none";

  // Show live/current month entries first
  liveEntries.forEach(function(entry) {
    const li = document.createElement("li");
    li.classList.add("history-item");
    li.innerHTML = `
      <div class="history-meta">
        <span class="history-label">${entry.label}</span>
        <span class="history-stats" style="color:#aaa;font-size:12px;">
          ${entry.days} days recorded &nbsp;|&nbsp; Total: ${entry.total} KL &nbsp;|&nbsp; ${entry.leaks} leak(s)
        </span>
      </div>
      <span class="live-badge">🟢 Live</span>
    `;
    ul.appendChild(li);
  });

  // Show completed monthly PDFs
  monthlyHistory.forEach(function(m, idx) {
    const li = document.createElement("li");
    li.classList.add("history-item");

    const label = document.createElement("span");
    label.className = "history-label";
    label.innerText = "📅 " + m.date;

    const btnGroup = document.createElement("div");
    btnGroup.className = "history-btn-group";

    const previewBtn = document.createElement("button");
    previewBtn.className = "btn-preview";
    previewBtn.innerText = "🔍 Preview";
    previewBtn.onclick = function() {
      const url = URL.createObjectURL(m.pdfData);
      document.getElementById("pdfFrame").src = url;
      document.getElementById("pdfModal").classList.add("show");
      document.getElementById("pdfModalDownloadBtn").onclick = function() {
        const link = document.createElement("a");
        link.href = url;
        link.download = "Monthly_Report_" + m.date.replace(/ /g, '_') + ".pdf";
        link.click();
      };
    };

    const downloadBtn = document.createElement("button");
    downloadBtn.className = "btn-download";
    downloadBtn.innerText = "⬇ Download";
    downloadBtn.onclick = function() {
      const url = URL.createObjectURL(m.pdfData);
      const link = document.createElement("a");
      link.href = url;
      link.download = "Monthly_Report_" + m.date.replace(/ /g, '_') + ".pdf";
      link.click();
      URL.revokeObjectURL(url);
    };

    btnGroup.appendChild(previewBtn);
    btnGroup.appendChild(downloadBtn);
    li.appendChild(label);
    li.appendChild(btnGroup);
    ul.appendChild(li);
  });
}

// ─────────────────────────────────────────────
// PDF Modal controls
// ─────────────────────────────────────────────
function closePdfModal() {
  const modal = document.getElementById("pdfModal");
  modal.classList.remove("show");
  document.getElementById("pdfFrame").src = "";
}

// ─────────────────────────────────────────────
// Auto-simulation — ALL buildings simultaneously
// ─────────────────────────────────────────────
function simulateAllBuildings() {
  ['A', 'B', 'C'].forEach(function(id) {
    const bldg = buildings[id];
    const increment = Math.random() * 100 + 20;
    const current = bldg.previous + increment;
    const daily = current - bldg.previous;
    const percentage = bldg.previous === 0 ? 0 : ((daily / bldg.previous) * 100).toFixed(2);
    const leakDetected = (daily > 100 || parseFloat(percentage) > 50);

    // Update building state
    bldg.total += daily;
    bldg.previous = current;
    bldg.leakLog = bldg.leakLog || [];

    // End of month — save to history and reset for next cycle
    if (bldg.currentDay > 31) {
      const now = new Date();
      const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });
      // Snapshot data before reset
      const snapshotData = bldg.monthlyData.slice();
      const snapshotLog  = (bldg.leakLog || []).slice();
      const snapshotTotal = bldg.total;

      if (window.jspdf) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.setTextColor(27, 38, 59);
        doc.text("Monthly Water Consumption Report", 20, 22);
        doc.setFontSize(11);
        doc.setTextColor(80, 80, 80);
        doc.text("Building: " + id + "  |  Period: " + monthName, 20, 32);
        doc.setDrawColor(200, 200, 200);
        doc.line(20, 36, 190, 36);

        doc.setFontSize(13);
        doc.setTextColor(0, 0, 0);
        doc.text("Total Consumption: " + snapshotTotal.toFixed(2) + " KL", 20, 48);
        const leakCount = snapshotLog.filter(v => v === 1).length;
        doc.text("Leak Events: " + leakCount, 20, 58);
        doc.text("Days Recorded: " + snapshotData.length, 20, 68);

        doc.setDrawColor(200, 200, 200);
        doc.line(20, 74, 190, 74);
        doc.setFontSize(12);
        doc.setTextColor(27, 38, 59);
        doc.text("Day-by-Day Log:", 20, 82);

        let y = 92;
        snapshotData.forEach(function(v, i) {
          const leaked = snapshotLog[i] === 1 ? " ⚠ Leak" : "";
          doc.setFontSize(11);
          doc.setTextColor(snapshotLog[i] === 1 ? 200 : 0, 0, 0);
          doc.text("  Day " + (i + 1) + ": " + v.toFixed(2) + " KL" + leaked, 20, y);
          y += 9;
          if (y > 280) { doc.addPage(); y = 20; }
        });

        monthlyHistory.push({
          date: "Building " + id + " — " + monthName,
          total: snapshotTotal.toFixed(2),
          pdfData: doc.output('blob')
        });
      }

      // Reset after PDF is built
      bldg.monthlyData = [];
      bldg.leakLog = [];
      bldg.currentDay = 1;
      if (id === currentBuilding) resetCharts();
    }

    bldg.monthlyData.push(parseFloat(daily.toFixed(2)));
    bldg.leakLog.push(leakDetected ? 1 : 0);
    bldg.currentDay++;

    // Save to leak history for any building
    if (leakDetected) saveLeakToHistory(daily, parseFloat(percentage), id);

    // Only update the UI for the currently viewed building
    if (id === currentBuilding) {
      document.getElementById("dailyConsumption").innerText = daily.toFixed(2) + " KL";
      document.getElementById("totalConsumption").innerText = bldg.total.toFixed(2) + " KL";
      document.getElementById("percentageChange").innerText = percentage + "%";
      document.getElementById("alertBox").classList.toggle("hidden", !leakDetected);

      const label = "Day " + (bldg.currentDay - 1);
      consumptionChart.data.labels.push(label);
      consumptionChart.data.datasets[0].data.push(parseFloat(daily.toFixed(2)));
      consumptionChart.update();

      leakChart.data.labels.push(label);
      leakChart.data.datasets[0].data.push(leakDetected ? 1 : 0);
      leakChart.update();
    }
  });
}

simulationInterval = setInterval(simulateAllBuildings, 3000);

// ─────────────────────────────────────────────
// Real-time clock
// ─────────────────────────────────────────────
function updateClock() {
  const now = new Date();
  document.getElementById("clock").innerText =
    now.toLocaleDateString() + "  " + now.toLocaleTimeString();
}
setInterval(updateClock, 1000);
updateClock();
