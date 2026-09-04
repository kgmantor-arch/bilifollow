const SUPABASE_SCRIPT =
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

function loadSupabase() {
  return new Promise((resolve, reject) => {
    if (window.supabase) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = SUPABASE_SCRIPT;

    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Supabase library could not be loaded."));

    document.head.appendChild(script);
  });
}

let supabaseClient;

async function initSupabase() {
  await loadSupabase();

  supabaseClient = createSupabaseClient();
}


/* =========================
   REGISTER
========================= */

async function registerUser(event) {
  event.preventDefault();

  const form = document.getElementById("registerForm");
  const message = document.getElementById("registerMessage");

  const username =
    document.getElementById("username").value.trim();

  const email =
    document.getElementById("email").value.trim();

  const password =
    document.getElementById("password").value;

  const confirmPassword =
    document.getElementById("confirmPassword").value;

  message.style.display = "block";

  if (password !== confirmPassword) {
    message.textContent = "❌ Passwords do not match.";
    return;
  }

  if (password.length < 6) {
    message.textContent =
      "❌ Password must be at least 6 characters.";
    return;
  }

  message.textContent = "Creating your account...";

  try {
    await initSupabase();

    const { data, error } =
      await supabaseClient.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            username: username
          }
        }
      });

    if (error) {
      throw error;
    }

    if (data.user) {
      message.textContent =
        "✅ Account created successfully!";

      form.reset();

      setTimeout(() => {
        window.location.href = data.session ? "dashboard.html" : "login.html";
      }, data.session ? 700 : 1800);
    }

  } catch (error) {

    console.error(error);

    message.textContent =
      "❌ " + error.message;
  }
}


/* =========================
   LOGIN
========================= */

async function loginUser(event) {
  event.preventDefault();

  const message =
    document.getElementById("loginMessage");

  const email =
    document.getElementById("email").value.trim();

  const password =
    document.getElementById("password").value;

  message.style.display = "block";
  message.textContent = "Logging in...";

  try {

    await initSupabase();

    const { data, error } =
      await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
      });

    if (error) {
      throw error;
    }

    if (data.user) {

      message.textContent =
        "✅ Login successful!";

      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 800);
    }

  } catch (error) {

    console.error(error);

    message.textContent =
      "❌ " + error.message;
  }
}


/* =========================
   AUTO CONNECT FORMS
========================= */

document.addEventListener("DOMContentLoaded", () => {

  const registerForm =
    document.getElementById("registerForm");

  if (registerForm) {
    registerForm.addEventListener(
      "submit",
      registerUser
    );
  }


  const loginForm =
    document.getElementById("loginForm");

  if (loginForm) {
    loginForm.addEventListener(
      "submit",
      loginUser
    );
  }

});
