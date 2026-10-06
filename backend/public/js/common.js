function showToast(message, type = "info") {
  const root = document.getElementById("toast-root");
  if (!root) { alert(message); return; }
  const el = document.createElement("div");
  el.className = "toast" + (type === "error" ? " error" : "");
  el.textContent = message;
  root.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

async function api(path, options = {}) {
  const opts = {
    method: options.method || "GET",
    headers: {},
    credentials: "same-origin"
  };
  if (options.body instanceof FormData) {
    opts.body = options.body;
  } else if (options.body) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(options.body);
  }
  const res = await fetch(path, opts);
  let data = {};
  try { data = await res.json(); } catch (e) { /* no body */ }
  if (!res.ok) {
    const err = new Error(data.error || "Something went wrong. Please try again.");
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function clearFieldErrors(form) {
  form.querySelectorAll(".field.has-error").forEach(f => f.classList.remove("has-error"));
}

function showFieldError(form, fieldId) {
  const field = form.querySelector(`#f-${fieldId}`);
  if (field) field.classList.add("has-error");
}

function setFormAlert(id, message, type = "error") {
  const el = document.getElementById(id);
  if (!el) return;
  if (!message) { el.classList.remove("show"); return; }
  el.textContent = message;
  el.className = `form-alert ${type} show`;
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest(".password-toggle");
  if (!btn) return;
  const input = document.getElementById(btn.dataset.toggle);
  if (!input) return;
  const isPw = input.type === "password";
  input.type = isPw ? "text" : "password";
  btn.textContent = isPw ? "Hide" : "Show";
});
