(function () {
  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  script.onload = async () => {
    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
    const { data: { session } } = await client.auth.getSession();
    const accountLink = document.getElementById("accountLink");
    if (accountLink && session) { accountLink.href = "dashboard.html"; accountLink.textContent = "Dashboard"; }
  };
  document.head.appendChild(script);
})();
