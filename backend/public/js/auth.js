const loginForm = document.getElementById("login-form");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearFieldErrors(loginForm);
    setFormAlert("form-alert", "");

    const email = loginForm.email.value.trim();
    const password = loginForm.password.value;
    let hasError = false;

    if (!/^\S+@\S+\.\S+$/.test(email)) { showFieldError(loginForm, "email"); hasError = true; }
    if (!password) { showFieldError(loginForm, "password"); hasError = true; }
    if (hasError) return;

    const submitBtn = document.getElementById("login-submit");
    submitBtn.disabled = true;
    submitBtn.textContent = "Logging in...";

    try {
      const data = await api("/api/auth/login", { method: "POST", body: { email, password } });
      window.location.href = data.redirect || "/resident/dashboard";
    } catch (err) {
      setFormAlert("form-alert", err.message);
      submitBtn.disabled = false;
      submitBtn.textContent = "Log in";
    }
  });
}

const signupForm = document.getElementById("signup-form");
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearFieldErrors(signupForm);
    setFormAlert("form-alert", "");

    const f = signupForm;
    const values = {
      first_name: f.first_name.value.trim(),
      middle_name: f.middle_name.value.trim(),
      last_name: f.last_name.value.trim(),
      suffix: f.suffix.value.trim(),
      username: f.username.value.trim(),
      email: f.email.value.trim(),
      mobile_number: f.mobile_number.value.trim(),
      address: f.address.value.trim(),
      barangay: f.barangay.value.trim(),
      password: f.password.value,
      confirm_password: f.confirm_password.value,
      terms: f.terms.checked
    };

    let hasError = false;
    if (!values.first_name) { showFieldError(f, "first_name"); hasError = true; }
    if (!values.last_name) { showFieldError(f, "last_name"); hasError = true; }
    if (values.username.length < 3 || !/^[a-zA-Z0-9_.]+$/.test(values.username)) { showFieldError(f, "username"); hasError = true; }
    if (!/^\S+@\S+\.\S+$/.test(values.email)) { showFieldError(f, "email"); hasError = true; }
    if (!/^(09|\+639)\d{9}$/.test(values.mobile_number)) { showFieldError(f, "mobile_number"); hasError = true; }
    if (!values.address) { showFieldError(f, "address"); hasError = true; }
    if (!values.barangay) { showFieldError(f, "barangay"); hasError = true; }
    if (values.password.length < 8 || !/\d/.test(values.password)) { showFieldError(f, "password"); hasError = true; }
    if (values.confirm_password !== values.password) { showFieldError(f, "confirm_password"); hasError = true; }
    if (!values.terms) { setFormAlert("form-alert", "You must agree to the Terms and Conditions."); hasError = true; }

    if (hasError) return;

    const submitBtn = document.getElementById("signup-submit");
    submitBtn.disabled = true;
    submitBtn.textContent = "Creating account...";

    try {
      await api("/api/auth/register", {
        method: "POST",
        body: { ...values, terms: values.terms ? "on" : "" }
      });
      window.location.href = "/resident/dashboard";
    } catch (err) {
      setFormAlert("form-alert", err.message);
      submitBtn.disabled = false;
      submitBtn.textContent = "Create account";
    }
  });
}
