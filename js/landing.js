(() => {
  function setText(id, value) { const node = document.getElementById(id); if (node && value) node.textContent = value; }
  function setLink(id, text, url) { const node = document.getElementById(id); if (!node) return; if (text) node.textContent = text; if (url && /^(https:\/\/|[a-z0-9-]+\.html$)/i.test(url)) node.href = url; }
  async function init() {
    const script = document.createElement("script"); script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    script.onload = async () => {
      const client = createSupabaseClient();
      const { data: { session } } = await client.auth.getSession();
      if (session) { window.location.replace("dashboard.html"); return; }
      const { data } = await client.from("app_settings").select("value").eq("key", "homepage").maybeSingle();
      const page = data?.value || {};
      setText("homeBadge", page.badge); setText("homeTitle", page.title); setText("homeDescription", page.description);
      setLink("homePrimaryLink", page.primaryText, page.primaryUrl); setLink("homeSecondaryLink", page.secondaryText, page.secondaryUrl);
      setText("homeHowTitle", page.howTitle); setText("homeHowDescription", page.howDescription);
      setText("homeCtaTitle", page.ctaTitle); setText("homeCtaDescription", page.ctaDescription); setLink("homeCtaLink", page.ctaText, page.ctaUrl);
      const metrics = await client.rpc("public_site_metrics");
      if (metrics.data) {
        setText("siteUsersCount", Number(metrics.data.users || 0).toLocaleString());
        setText("siteActiveTasksCount", Number(metrics.data.activeTasks || 0).toLocaleString());
        setText("siteCompletedTasksCount", Number(metrics.data.completedTasks || 0).toLocaleString());
      }
    };
    document.head.appendChild(script);
  }
  init();
})();
