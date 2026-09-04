(function () {
  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  script.onload = async () => {
    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    const form = document.getElementById("resetForm");
    const message = document.getElementById("message");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      message.textContent = "⏳ Sending reset link...";
      const { error } = await client.auth.resetPasswordForEmail(document.getElementById("email").value.trim(), {
        redirectTo: `${window.location.origin}${window.location.pathname.replace("reset-password.html", "update-password.html")}`
      });
      message.textContent = error ? `❌ ${error.message}` : "✅ If an account exists, a reset link has been sent.";
    });
  };
  document.head.appendChild(script);
})();
