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
  document.getElementById("dailyConsumption").innerText = "0 KL";
  
  // Refresh Charts for this building
  resetCharts();
  data.monthlyData.forEach((val, i) => {
    const label = "Day " + (i + 1);
    consumptionChart.data.labels.push(label);
    consumptionChart.data.datasets[0].data.push(val);
    leakChart.data.labels.push(label);
    leakChart.data.datasets[0].data.push(val > 100 ? 1 : 0);
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
  closeSidebar();
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

  doc.setFontSize(18);
  doc.setTextColor(27, 38, 59);
  doc.text("Monthly Water Consumption Report", 20, 22);

  doc.setFontSize(11);
  doc.setTextColor(80, 80, 80);
  doc.text("Generated: " + now.toLocaleString(), 20, 32);

  doc.setDrawColor(200, 200, 200);
  doc.line(20, 36, 190, 36);

  if (monthlyData.length === 0) {
    doc.setFontSize(13);
    doc.setTextColor(150, 0, 0);
    doc.text("No data recorded yet for this month.", 20, 55);
  } else {
    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0);
    doc.text("Day-by-Day Consumption:", 20, 50);
    let y = 62;
    monthlyData.forEach(function(v, i) {
      doc.setFontSize(11);
      doc.text("  Day " + (i + 1) + ": " + v.toFixed(2) + " KL", 20, y);
      y += 9;
      if (y > 280) { doc.addPage(); y = 20; }
    });
  }

  if (download) {
    const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' }).replace(' ', '_');
    doc.save("Monthly_Report_" + monthName + ".pdf");
  }

  if (auto) {
    const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });
    monthlyHistory.push({
      date: monthName,
      total: totalConsumption.toFixed(2),
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

  if (monthlyHistory.length === 0) {
    if (emptyMsg) emptyMsg.style.display = "block";
    return;
  }

  if (emptyMsg) emptyMsg.style.display = "none";

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
// Auto-simulation every 5 seconds
// ─────────────────────────────────────────────
simulationInterval = setInterval(simulateReading, 500);

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
