const navButtons = document.querySelectorAll(".side-nav button[data-view]");
const views = document.querySelectorAll(".view");
const pageTitle = document.getElementById("page-title");
const titles = {
  overview: "Overview", reports: "Verify reports", residents: "Residents",
  rewards: "Rewards catalog", activities: "Community activities", analytics: "Analytics"
};

function goto(viewName) {
  navButtons.forEach(b => b.classList.toggle("active", b.dataset.view === viewName));
  views.forEach(v => v.classList.toggle("active", v.id === viewName));
  pageTitle.textContent = titles[viewName] || viewName;
  loadView(viewName);
}
navButtons.forEach(btn => btn.addEventListener("click", () => goto(btn.dataset.view)));

function loadView(viewName) {
  if (viewName === "overview") loadOverview();
  if (viewName === "reports") loadReports();
  if (viewName === "residents") loadResidents();
  if (viewName === "rewards") loadRewards();
  if (viewName === "activities") loadActivities();
  if (viewName === "analytics") loadAnalytics();
}

function statusBadge(status) {
  const map = { pending: "badge-pending", under_review: "badge-review", verified: "badge-verified", resolved: "badge-resolved", rejected: "badge-rejected" };
  return `<span class="badge ${map[status] || "badge-pending"}">${status.replace("_", " ")}</span>`;
}
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d.replace(" ", "T")).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

// ---------- Overview ----------
async function loadOverview() {
  try {
    const { totals } = await api("/api/staff/analytics");
    const vals = document.querySelectorAll("#overview-stats .value");
    vals[0].textContent = totals.total_residents;
    vals[1].textContent = totals.total_reports;
    vals[2].textContent = totals.pending_reports;
    vals[3].textContent = totals.resolved_reports;

    const { reports } = await api("/api/reports?status=pending");
    const table = document.getElementById("attention-table");
    const empty = document.getElementById("attention-empty");
    table.querySelectorAll("tr:not(:first-child)").forEach(r => r.remove());
    const top = reports.slice(0, 6);
    empty.style.display = top.length ? "none" : "block";
    top.forEach(r => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${r.first_name} ${r.last_name}</td><td>${r.waste_category}</td><td>${r.location}</td><td>${statusBadge(r.status)}</td>`;
      table.appendChild(tr);
    });
  } catch (err) { showToast(err.message, "error"); }
}

// ---------- Reports ----------
let allReports = [];
async function loadReports() {
  try {
    const status = document.getElementById("status-filter").value;
    const { reports } = await api("/api/reports" + (status ? `?status=${status}` : ""));
    allReports = reports;
    const table = document.getElementById("reports-table");
    const empty = document.getElementById("reports-empty");
    table.querySelectorAll("tr:not(:first-child)").forEach(r => r.remove());
    empty.style.display = reports.length ? "none" : "block";
    reports.forEach(r => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${r.report_code}</td><td>${r.first_name} ${r.last_name}</td><td>${r.waste_category}</td><td>${r.location}</td><td>${fmtDate(r.created_at)}</td><td>${statusBadge(r.status)}</td>
        <td><button class="btn btn-ghost btn-sm" data-id="${r.id}">Review</button></td>`;
      tr.querySelector("button").addEventListener("click", () => openReportModal(r));
      table.appendChild(tr);
    });
  } catch (err) { showToast(err.message, "error"); }
}
document.getElementById("status-filter").addEventListener("change", loadReports);

let currentReport = null;
function openReportModal(report) {
  currentReport = report;
  document.getElementById("rm-title").textContent = report.report_code;
  document.getElementById("rm-body").innerHTML = `
    <p><strong style="color:var(--ink);">Resident:</strong> ${report.first_name} ${report.last_name}</p>
    <p><strong style="color:var(--ink);">Category:</strong> ${report.waste_category}</p>
    <p><strong style="color:var(--ink);">Location:</strong> ${report.location}</p>
    <p><strong style="color:var(--ink);">Description:</strong> ${report.description}</p>
    ${report.photo_path ? `<img src="${report.photo_path}" style="max-width:100%; border-radius:8px; margin-top:8px;" />` : ""}
    <p style="margin-top:8px;"><strong style="color:var(--ink);">Current status:</strong> ${statusBadge(report.status)}</p>
  `;
  document.getElementById("rm-response").value = report.staff_response || "";
  document.getElementById("report-overlay").classList.add("show");
}
document.getElementById("rm-close").addEventListener("click", () => {
  document.getElementById("report-overlay").classList.remove("show");
});

async function setReportStatus(status) {
  if (!currentReport) return;
  const response = document.getElementById("rm-response").value;
  try {
    await api(`/api/reports/${currentReport.id}/status`, { method: "PATCH", body: { status, response } });
    showToast("Report updated successfully.");
    document.getElementById("report-overlay").classList.remove("show");
    loadReports();
    loadOverview();
  } catch (err) { showToast(err.message, "error"); }
}
document.getElementById("rm-reject").addEventListener("click", () => setReportStatus("rejected"));
document.getElementById("rm-review").addEventListener("click", () => setReportStatus("under_review"));
document.getElementById("rm-verify").addEventListener("click", () => setReportStatus("verified"));
document.getElementById("rm-resolve").addEventListener("click", () => setReportStatus("resolved"));

// ---------- Residents ----------
async function loadResidents() {
  try {
    const { residents } = await api("/api/staff/residents");
    const table = document.getElementById("residents-table");
    table.querySelectorAll("tr:not(:first-child)").forEach(r => r.remove());
    residents.forEach(r => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${r.first_name} ${r.last_name}</td><td>${r.mobile_number}</td><td>${r.address}</td><td>${r.report_count}</td><td>${r.points_balance}</td>`;
      table.appendChild(tr);
    });
  } catch (err) { showToast(err.message, "error"); }
}

// ---------- Rewards (read view for staff) ----------
async function loadRewards() {
  try {
    const { rewards } = await api("/api/rewards");
    const grid = document.getElementById("rewards-grid");
    grid.innerHTML = "";
    rewards.forEach(r => {
      const card = document.createElement("div");
      card.className = "item-card";
      card.innerHTML = `<span class="item-points">${r.points_required} pts</span><h3>${r.name}</h3><p>${r.description || ""}</p><p style="font-size:12px;">${r.quantity_available} available</p>`;
      grid.appendChild(card);
    });
  } catch (err) { showToast(err.message, "error"); }
}

// ---------- Activities ----------
async function loadActivities() {
  try {
    const { activities } = await api("/api/activities");
    const grid = document.getElementById("activities-grid");
    grid.innerHTML = "";
    if (!activities.length) {
      grid.innerHTML = `<div class="empty-state">No activities scheduled at the moment.</div>`;
      return;
    }
    activities.forEach(a => {
      const card = document.createElement("div");
      card.className = "item-card";
      card.innerHTML = `<span class="item-points">${fmtDate(a.activity_date)}</span><h3>${a.title}</h3><p>${a.description || ""}</p><p style="font-size:12px;">${a.participant_count} participant(s) registered</p>`;
      grid.appendChild(card);
    });
  } catch (err) { showToast(err.message, "error"); }
}
document.getElementById("new-activity-btn").addEventListener("click", () => {
  document.getElementById("activity-overlay").classList.add("show");
});
document.getElementById("activity-cancel").addEventListener("click", () => {
  document.getElementById("activity-overlay").classList.remove("show");
});
document.getElementById("activity-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const body = Object.fromEntries(fd.entries());
  try {
    await api("/api/activities", { method: "POST", body });
    showToast("Activity created successfully.");
    document.getElementById("activity-overlay").classList.remove("show");
    e.target.reset();
    loadActivities();
  } catch (err) { showToast(err.message, "error"); }
});

// ---------- Analytics ----------
function renderBars(containerId, data, labelKey, valueKey) {
  const el = document.getElementById(containerId);
  if (!data.length) { el.innerHTML = `<div class="empty-state">No data yet.</div>`; return; }
  const max = Math.max(...data.map(d => d[valueKey]));
  el.innerHTML = data.map(d => `
    <div class="bar-row">
      <div class="bar-label">${(d[labelKey] || "").toString().replace("_", " ")}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${max ? (d[valueKey] / max * 100) : 0}%"></div></div>
      <div class="bar-value">${d[valueKey]}</div>
    </div>`).join("");
}
async function loadAnalytics() {
  try {
    const { byCategory, byStatus, monthly } = await api("/api/staff/analytics");
    renderBars("chart-category", byCategory, "waste_category", "count");
    renderBars("chart-status", byStatus, "status", "count");
    renderBars("chart-monthly", monthly, "month", "count");
  } catch (err) { showToast(err.message, "error"); }
}

// ---------- Logout ----------
document.getElementById("logout-btn").addEventListener("click", async () => {
  await api("/api/auth/logout", { method: "POST" });
  window.location.href = "/login";
});

loadOverview();
