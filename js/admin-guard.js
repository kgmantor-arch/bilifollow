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

  window.bfAdminGate = (async () => {
    try {
      await loadSupabase();
      const client = createSupabaseClient();
      const { data: { user } } = await client.auth.getUser();
      if (!user) { window.location.replace("admin-login.html"); return false; }
      const { data: profile, error } = await client.from("profiles").select("is_admin").eq("id", user.id).single();
      if (error || !profile?.is_admin) {
        await client.auth.signOut();
        window.location.replace("admin-login.html?denied=1");
        return false;
      }
      document.querySelector("main.admin-page")?.removeAttribute("hidden");
      return true;
    } catch (_) {
      window.location.replace("admin-login.html?error=1");
      return false;
    }
  })();
})();
