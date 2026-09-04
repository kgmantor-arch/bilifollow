(() => {
  async function loadSupabase() {
    if (window.supabase) return;
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
      script.onload = resolve;
      script.onerror = () => reject(new Error("Unable to load authentication."));
      document.head.appendChild(script);
    });
  }
  document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("adminLoginForm");
    const message = document.getElementById("adminLoginMessage");
    const denied = new URLSearchParams(location.search).get("denied");
    const error = new URLSearchParams(location.search).get("error");
    if (denied) { message.hidden = false; message.textContent = "Access denied. This account is not an administrator."; }
    if (error) { message.hidden = false; message.textContent = "Admin access could not be verified. Please sign in again."; }
    form.addEventListener("submit", async event => {
      event.preventDefault(); message.hidden = false; message.textContent = "Checking administrator access...";
      try {
        await loadSupabase();
        const client = createSupabaseClient();
        const { data, error: loginError } = await client.auth.signInWithPassword({ email: document.getElementById("email").value.trim(), password: document.getElementById("password").value });
        if (loginError) throw loginError;
        const { data: profile, error: profileError } = await client.from("profiles").select("is_admin").eq("id", data.user.id).single();
        if (profileError || !profile?.is_admin) {
          await client.auth.signOut();
          message.textContent = "Access denied. Use an administrator account for Control Center.";
          return;
        }
        window.location.replace("admin.html");
      } catch (err) { message.textContent = `Login failed: ${err.message}`; }
    });
  });
})();
