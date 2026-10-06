const navButtons = document.querySelectorAll(".side-nav button[data-view]");
const views = document.querySelectorAll(".view");
const pageTitle = document.getElementById("page-title");
const titles = {
  overview: "Overview", users: "User management", staff: "Staff management",
  rewards: "Reward management", settings: "System settings", audit: "Audit logs"
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
  if (viewName === "users") loadUsers();
  if (viewName === "staff") loadStaff();
  if (viewName === "rewards") loadRewards();
  if (viewName === "settings") loadSettings();
  if (viewName === "audit") loadAudit();
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d.replace(" ", "T")).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

// ---------- Overview ----------
async function loadOverview() {
  try {
    const { stats } = await api("/api/admin/stats");
    const vals = document.querySelectorAll("#overview-stats .value");
    vals[0].textContent = stats.total_users;
    vals[1].textContent = stats.total_residents;
    vals[2].textContent = stats.total_staff;
    vals[3].textContent = stats.total_reports;
    vals[4].textContent = stats.pending_reports;
    vals[5].textContent = stats.resolved_reports;
    vals[6].textContent = stats.total_rewards;
    vals[7].textContent = stats.total_redemptions;
  } catch (err) { showToast(err.message, "error"); }
}

// ---------- Users ----------
async function loadUsers() {
  try {
    const q = document.getElementById("user-search").value;
    const role = document.getElementById("role-filter").value;
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (role) params.set("role", role);
    const { users } = await api("/api/admin/users?" + params.toString());

    const table = document.getElementById("users-table");
    table.querySelectorAll("tr:not(:first-child)").forEach(r => r.remove());
    users.forEach(u => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${u.first_name} ${u.last_name}</td><td>${u.username}</td><td>${u.email}</td>
        <td>${u.role}</td><td><span class="badge badge-${u.status}">${u.status}</span></td>
        <td><button class="btn btn-ghost btn-sm">${u.status === "active" ? "Deactivate" : "Activate"}</button></td>`;
      tr.querySelector("button").addEventListener("click", async () => {
        try {
          await api(`/api/admin/users/${u.id}/status`, {
            method: "PATCH", body: { status: u.status === "active" ? "inactive" : "active" }
          });
          showToast("Account status updated.");
          loadUsers();
        } catch (err) { showToast(err.message, "error"); }
      });
      table.appendChild(tr);
    });
  } catch (err) { showToast(err.message, "error"); }
}
document.getElementById("user-search").addEventListener("input", debounce(loadUsers, 300));
document.getElementById("role-filter").addEventListener("change", loadUsers);
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

// ---------- Staff ----------
async function loadStaff() {
  try {
    const { users } = await api("/api/admin/users?role=staff");
    const table = document.getElementById("staff-table");
    table.querySelectorAll("tr:not(:first-child)").forEach(r => r.remove());
    users.forEach(u => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${u.first_name} ${u.last_name}</td><td>${u.email}</td>
        <td><span class="badge badge-${u.status}">${u.status}</span></td>
        <td><button class="btn btn-ghost btn-sm">${u.status === "active" ? "Deactivate" : "Activate"}</button></td>`;
      tr.querySelector("button").addEventListener("click", async () => {
        try {
          await api(`/api/admin/users/${u.id}/status`, {
            method: "PATCH", body: { status: u.status === "active" ? "inactive" : "active" }
          });
          showToast("Staff status updated.");
          loadStaff();
        } catch (err) { showToast(err.message, "error"); }
      });
      table.appendChild(tr);
    });
  } catch (err) { showToast(err.message, "error"); }
}

document.getElementById("staff-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  setFormAlert("staff-alert", "");
  const fd = new FormData(e.target);
  const body = Object.fromEntries(fd.entries());
  try {
    await api("/api/admin/staff", { method: "POST", body });
    showToast("Staff account created successfully.");
    e.target.reset();
    loadStaff();
  } catch (err) {
    setFormAlert("staff-alert", err.message);
  }
});

// ---------- Rewards ----------
async function loadRewards() {
  try {
    const { rewards } = await api("/api/admin/rewards");
    const grid = document.getElementById("rewards-grid");
    grid.innerHTML = "";
    rewards.forEach(r => {
      const card = document.createElement("div");
      card.className = "item-card";
      card.innerHTML = `
        <span class="item-points">${r.points_required} pts</span>
        <h3>${r.name}</h3>
        <p>${r.description || ""}</p>
        <p style="font-size:12px;">${r.quantity_available} available &middot; <span class="badge badge-${r.status === "active" ? "active" : "inactive"}">${r.status}</span></p>
        <div style="display:flex; gap:8px; margin-top:10px;">
          <button class="btn btn-ghost btn-sm" data-action="edit">Edit</button>
          <button class="btn btn-ghost btn-sm" data-action="toggle">${r.status === "active" ? "Deactivate" : "Activate"}</button>
        </div>`;
      card.querySelector('[data-action="edit"]').addEventListener("click", () => openRewardModal(r));
      card.querySelector('[data-action="toggle"]').addEventListener("click", async () => {
        try {
          if (r.status === "active") {
            await api(`/api/admin/rewards/${r.id}`, { method: "DELETE" });
          } else {
            await api(`/api/admin/rewards/${r.id}`, { method: "PATCH", body: { status: "active" } });
          }
          loadRewards();
        } catch (err) { showToast(err.message, "error"); }
      });
      grid.appendChild(card);
    });
  } catch (err) { showToast(err.message, "error"); }
}

document.getElementById("new-reward-btn").addEventListener("click", () => openRewardModal(null));
function openRewardModal(reward) {
  const form = document.getElementById("reward-form");
  form.reset();
  document.getElementById("reward-modal-title").textContent = reward ? "Edit reward" : "Add reward";
  form.id.value = reward ? reward.id : "";
  if (reward) {
    form.name.value = reward.name;
    form.description.value = reward.description || "";
    form.points_required.value = reward.points_required;
    form.quantity_available.value = reward.quantity_available;
  }
  document.getElementById("reward-overlay").classList.add("show");
}
document.getElementById("reward-cancel").addEventListener("click", () => {
  document.getElementById("reward-overlay").classList.remove("show");
});
document.getElementById("reward-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const body = Object.fromEntries(fd.entries());
  const id = body.id;
  delete body.id;
  try {
    if (id) {
      await api(`/api/admin/rewards/${id}`, { method: "PATCH", body });
    } else {
      await api("/api/admin/rewards", { method: "POST", body });
    }
    showToast("Reward saved successfully.");
    document.getElementById("reward-overlay").classList.remove("show");
    loadRewards();
  } catch (err) { showToast(err.message, "error"); }
});

// ---------- Settings ----------
async function loadSettings() {
  try {
    const { settings } = await api("/api/admin/settings");
    const form = document.getElementById("settings-form");
    form.barangay_name.value = settings.barangay_name || "";
    form.contact_email.value = settings.contact_email || "";
    form.contact_number.value = settings.contact_number || "";
  } catch (err) { showToast(err.message, "error"); }
}
document.getElementById("settings-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  setFormAlert("settings-alert", "");
  const fd = new FormData(e.target);
  const body = Object.fromEntries(fd.entries());
  try {
    await api("/api/admin/settings", { method: "PATCH", body });
    showToast("Settings updated successfully.");
  } catch (err) { setFormAlert("settings-alert", err.message); }
});

// ---------- Audit logs ----------
async function loadAudit() {
  try {
    const { logs } = await api("/api/admin/audit-logs");
    const table = document.getElementById("audit-table");
    table.querySelectorAll("tr:not(:first-child)").forEach(r => r.remove());
    logs.forEach(l => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${fmtDate(l.created_at)}</td><td>${l.first_name ? l.first_name + " " + l.last_name : "System"}</td><td>${l.action}</td><td>${l.details || ""}</td>`;
      table.appendChild(tr);
    });
  } catch (err) { showToast(err.message, "error"); }
}

// ---------- Logout ----------
document.getElementById("logout-btn").addEventListener("click", async () => {
  await api("/api/auth/logout", { method: "POST" });
  window.location.href = "/login";
});

loadOverview();
