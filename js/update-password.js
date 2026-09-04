(function () {
  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  script.onload = async () => {
    const client = createSupabaseClient();
    const form = document.getElementById("updatePasswordForm");
    const message = document.getElementById("message");
    const { data: { session } } = await client.auth.getSession();
    if (!session) {
      message.style.display = "block";
      message.textContent = "Open this page using the password-reset link sent to your email.";
      return;
    }
    form.addEventListener("submit", async event => {
      event.preventDefault();
      const password = document.getElementById("newPassword").value;
      const confirmation = document.getElementById("confirmPassword").value;
      message.style.display = "block";
      if (password !== confirmation) { message.textContent = "Passwords do not match."; return; }
      message.textContent = "Updating password…";
      const { error } = await client.auth.updateUser({ password });
      if (error) { message.textContent = `Unable to update password: ${error.message}`; return; }
      message.textContent = "Password updated. Redirecting to your dashboard…";
      window.setTimeout(() => { window.location.href = "dashboard.html"; }, 900);
    });
  };
  document.head.appendChild(script);
})();
