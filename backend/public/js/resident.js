// ---------- Navigation ----------
const navButtons = document.querySelectorAll(".side-nav button[data-view]");
const views = document.querySelectorAll(".view");
const pageTitle = document.getElementById("page-title");
const titles = {
  overview: "Overview", report: "Submit report", history: "My reports",
  rewards: "Rewards", activities: "Community activities", profile: "Profile"
};

function goto(viewName) {
  navButtons.forEach(b => b.classList.toggle("active", b.dataset.view === viewName));
  views.forEach(v => v.classList.toggle("active", v.id === viewName));
  pageTitle.textContent = titles[viewName] || viewName;
  loadView(viewName);
}

navButtons.forEach(btn => btn.addEventListener("click", () => goto(btn.dataset.view)));
document.querySelectorAll("[data-goto]").forEach(btn =>
  btn.addEventListener("click", () => goto(btn.dataset.goto)));

function loadView(viewName) {
  if (viewName === "overview") loadOverview();
  if (viewName === "history") loadHistory();
  if (viewName === "rewards") loadRewards();
  if (viewName === "activities") loadActivities();
  if (viewName === "profile") loadProfile();
}

function statusBadge(status) {
  const map = {
    pending: "badge-pending", under_review: "badge-review", verified: "badge-verified",
    resolved: "badge-resolved", rejected: "badge-rejected"
  };
  const label = status.replace("_", " ");
  return `<span class="badge ${map[status] || "badge-pending"}">${label}</span>`;
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d.replace(" ", "T")).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

// ---------- Overview ----------
async function loadOverview() {
  try {
    const { reports } = await api("/api/reports/mine");
    const pending = reports.filter(r => r.status === "pending" || r.status === "under_review").length;
    const done = reports.filter(r => r.status === "verified" || r.status === "resolved").length;
    const { balance } = await api("/api/rewards/points");

    const statCards = document.querySelectorAll("#overview-stats .value");
    statCards[0].textContent = reports.length;
    statCards[1].textContent = pending;
    statCards[2].textContent = done;
    statCards[3].textContent = balance;

    const table = document.getElementById("recent-reports-table");
    const empty = document.getElementById("recent-reports-empty");
    table.querySelectorAll("tr:not(:first-child)").forEach(r => r.remove());
    const recent = reports.slice(0, 5);
    empty.style.display = recent.length ? "none" : "block";
    recent.forEach(r => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${r.report_code}</td><td>${r.waste_category}</td><td>${r.location}</td><td>${fmtDate(r.created_at)}</td><td>${statusBadge(r.status)}</td>`;
      table.appendChild(tr);
    });
  } catch (err) {
    showToast(err.message, "error");
  }
}

// ---------- Submit report ----------
document.getElementById("r-datetime").value = new Date().toISOString().slice(0, 16);

document.getElementById("report-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  setFormAlert("report-alert", "");
  const form = e.target;
  const submitBtn = document.getElementById("report-submit");
  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting...";

  try {
    const fd = new FormData(form);
    const data = await api("/api/reports", { method: "POST", body: fd });
    showToast(`Your report has been submitted successfully. Reference: ${data.report_code}`);
    form.reset();
    document.getElementById("r-datetime").value = new Date().toISOString().slice(0, 16);
    goto("history");
  } catch (err) {
    setFormAlert("report-alert", err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit report";
  }
});

// ---------- My reports ----------
async function loadHistory() {
  try {
    const { reports } = await api("/api/reports/mine");
    const table = document.getElementById("history-table");
    const empty = document.getElementById("history-empty");
    table.querySelectorAll("tr:not(:first-child)").forEach(r => r.remove());
    empty.style.display = reports.length ? "none" : "block";
    reports.forEach(r => {
      const tr = document.createElement("tr");
      const response = r.staff_response ? `<div style="font-size:12px; color:var(--ink-muted); margin-top:4px;">${r.staff_response}</div>` : "";
      tr.innerHTML = `<td>${r.report_code}</td><td>${r.waste_category}</td><td>${r.location}</td><td>${fmtDate(r.created_at)}</td><td>${statusBadge(r.status)}${response}</td><td></td>`;
      table.appendChild(tr);
    });
  } catch (err) {
    showToast(err.message, "error");
  }
}

// ---------- Rewards ----------
async function loadRewards() {
  try {
    const points = await api("/api/rewards/points");
    const statEls = document.querySelectorAll("#points-stats .value");
    statEls[0].textContent = points.balance;
    statEls[1].textContent = points.total_earned;
    statEls[2].textContent = points.total_redeemed;

    const { rewards } = await api("/api/rewards");
    const grid = document.getElementById("rewards-grid");
    const empty = document.getElementById("rewards-empty");
    grid.innerHTML = "";
    empty.style.display = rewards.length ? "none" : "block";
    rewards.forEach(r => {
      const card = document.createElement("div");
      card.className = "item-card";
      const canAfford = points.balance >= r.points_required;
      card.innerHTML = `
        <span class="item-points">${r.points_required} pts</span>
        <h3>${r.name}</h3>
        <p>${r.description || ""}</p>
        <button class="btn ${canAfford ? "btn-primary" : "btn-ghost"} btn-sm btn-full" ${canAfford ? "" : "disabled"}>
          ${canAfford ? "Redeem" : `Need ${r.points_required - points.balance} more pts`}
        </button>`;
      if (canAfford) {
        card.querySelector("button").addEventListener("click", () => openRedeemModal(r));
      }
      grid.appendChild(card);
    });

    const { redemptions } = await api("/api/rewards/redemptions/mine");
    const rTable = document.getElementById("redemptions-table");
    const rEmpty = document.getElementById("redemptions-empty");
    rTable.querySelectorAll("tr:not(:first-child)").forEach(r => r.remove());
    rEmpty.style.display = redemptions.length ? "none" : "block";
    redemptions.forEach(r => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${r.redemption_code}</td><td>${r.reward_name}</td><td>${r.points_used}</td><td><span class="badge badge-pending">${r.status}</span></td><td>${fmtDate(r.created_at)}</td>`;
      rTable.appendChild(tr);
    });
  } catch (err) {
    showToast(err.message, "error");
  }
}

let pendingReward = null;
function openRedeemModal(reward) {
  pendingReward = reward;
  document.getElementById("redeem-text").textContent =
    `Redeem "${reward.name}" for ${reward.points_required} points? This will deduct points from your balance.`;
  document.getElementById("redeem-overlay").classList.add("show");
}
document.getElementById("redeem-cancel").addEventListener("click", () => {
  document.getElementById("redeem-overlay").classList.remove("show");
  pendingReward = null;
});
document.getElementById("redeem-confirm").addEventListener("click", async () => {
  if (!pendingReward) return;
  try {
    const data = await api(`/api/rewards/${pendingReward.id}/redeem`, { method: "POST" });
    showToast(`Reward redeemed. Reference: ${data.redemption_code}`);
    document.getElementById("redeem-overlay").classList.remove("show");
    pendingReward = null;
    loadRewards();
  } catch (err) {
    showToast(err.message, "error");
  }
});

// ---------- Activities ----------
async function loadActivities() {
  try {
    const { activities } = await api("/api/activities");
    const grid = document.getElementById("activities-grid");
    const empty = document.getElementById("activities-empty");
    grid.innerHTML = "";
    empty.style.display = activities.length ? "none" : "block";
    activities.forEach(a => {
      const card = document.createElement("div");
      card.className = "item-card";
      card.innerHTML = `
        <span class="item-points">${fmtDate(a.activity_date)}</span>
        <h3>${a.title}</h3>
        <p>${a.description || ""}${a.location ? " &middot; " + a.location : ""}</p>
        <button class="btn ${a.registered ? "btn-ghost" : "btn-primary"} btn-sm btn-full" ${a.registered ? "disabled" : ""}>
          ${a.registered ? "Already registered" : "Register"}
        </button>`;
      if (!a.registered) {
        card.querySelector("button").addEventListener("click", async () => {
          try {
            await api(`/api/activities/${a.id}/register`, { method: "POST" });
            showToast("You're registered for this activity.");
            loadActivities();
          } catch (err) {
            showToast(err.message, "error");
          }
        });
      }
      grid.appendChild(card);
    });
  } catch (err) {
    showToast(err.message, "error");
  }
}

// ---------- Profile ----------
async function loadProfile() {
  try {
    const { user } = await api("/api/profile");
    document.getElementById("p-first").value = user.first_name;
    document.getElementById("p-last").value = user.last_name;
    document.getElementById("p-email").value = user.email;
    document.getElementById("p-mobile").value = user.mobile_number;
    document.getElementById("p-address").value = user.address;
  } catch (err) {
    showToast(err.message, "error");
  }
}

document.getElementById("profile-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  setFormAlert("profile-alert", "");
  try {
    await api("/api/profile", {
      method: "PATCH",
      body: {
        first_name: document.getElementById("p-first").value,
        last_name: document.getElementById("p-last").value,
        mobile_number: document.getElementById("p-mobile").value,
        address: document.getElementById("p-address").value
      }
    });
    showToast("Profile updated successfully.");
  } catch (err) {
    setFormAlert("profile-alert", err.message);
  }
});

document.getElementById("password-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  setFormAlert("password-alert", "");
  const form = e.target;
  try {
    await api("/api/profile/password", {
      method: "PATCH",
      body: {
        current_password: form.current_password.value,
        new_password: form.new_password.value,
        confirm_password: form.confirm_password.value
      }
    });
    showToast("Password changed successfully.");
    form.reset();
  } catch (err) {
    setFormAlert("password-alert", err.message);
  }
});

// ---------- Notifications ----------
async function refreshNotifBell() {
  try {
    const { notifications, unread_count } = await api("/api/notifications");
    document.getElementById("bell-dot").classList.toggle("show", unread_count > 0);
    const list = document.getElementById("notif-list");
    list.innerHTML = "";
    if (!notifications.length) {
      list.innerHTML = `<div class="empty-state">You have no notifications yet.</div>`;
      return;
    }
    notifications.forEach(n => {
      const item = document.createElement("div");
      item.style.cssText = "padding:12px; border:1px solid var(--border); border-radius:8px;" + (n.is_read ? "" : "background:var(--surface-2);");
      item.innerHTML = `<div style="font-size:13.5px; font-weight:500; margin-bottom:4px;">${n.title}</div><div style="font-size:12.5px; color:var(--ink-soft);">${n.message}</div>`;
      list.appendChild(item);
    });
  } catch (err) { /* silent */ }
}

document.getElementById("bell-btn").addEventListener("click", async () => {
  document.getElementById("notif-overlay").classList.add("show");
  await api("/api/notifications/read-all", { method: "PATCH" });
  refreshNotifBell();
});
document.getElementById("notif-close").addEventListener("click", () => {
  document.getElementById("notif-overlay").classList.remove("show");
});

// ---------- Logout ----------
document.getElementById("logout-btn").addEventListener("click", async () => {
  await api("/api/auth/logout", { method: "POST" });
  window.location.href = "/login";
});

// ---------- Init ----------
loadOverview();
refreshNotifBell();
