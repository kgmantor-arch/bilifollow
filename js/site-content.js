(function () {
  async function fetchPage(slug) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/site_pages?select=title,body&slug=eq.${encodeURIComponent(slug)}`, { headers: { apikey: SUPABASE_KEY } });
    if (!response.ok) throw new Error("Content unavailable");
    return (await response.json())[0];
  }
  async function init() {
    const slug = document.body.dataset.sitePage;
    if (!slug) return;
    try {
      const page = await fetchPage(slug);
      if (!page) return;
      document.getElementById("pageTitle").textContent = page.title;
      document.getElementById("pageBody").textContent = page.body;
    } catch (error) { console.warn("Could not load managed page content", error); }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true }); else init();
})();
