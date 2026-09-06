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
      renderVideos(page);
      const metrics = await client.rpc("public_site_metrics");
      if (metrics.data) {
        setText("siteUsersCount", Number(metrics.data.users || 0).toLocaleString());
        setText("siteActiveTasksCount", Number(metrics.data.activeTasks || 0).toLocaleString());
        setText("siteCompletedTasksCount", Number(metrics.data.completedTasks || 0).toLocaleString());
      }
    };
    document.head.appendChild(script);
  }
  function youtubeId(url) {
    try { const parsed = new URL(url); if (parsed.hostname === "youtu.be") return parsed.pathname.slice(1).split("/")[0]; if (parsed.hostname.includes("youtube.com")) return parsed.searchParams.get("v") || parsed.pathname.split("/").filter(Boolean).pop(); } catch (_) { }
    return "";
  }
  function escapeHtml(value) { return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;"); }
  function renderVideos(page) {
    const section = document.getElementById("homeVideos"), grid = document.getElementById("homeVideoGrid");
    if (!section || !grid || !page.videoEnabled) return;
    const videos = [{ title: page.videoOneTitle || "How to Create a Task", url: page.videoOneUrl }, { title: page.videoTwoTitle || "How to Complete a Task & Earn Coins", url: page.videoTwoUrl }].map(video => ({ ...video, id: youtubeId(video.url || "") })).filter(video => /^[A-Za-z0-9_-]{6,}$/.test(video.id));
    if (!videos.length) return;
    setText("homeVideosTitle", page.videoTitle); setText("homeVideosDescription", page.videoDescription);
    grid.innerHTML = videos.map(video => `<button type="button" class="home-video-card" data-video-id="${video.id}" data-video-title="${escapeHtml(video.title)}"><span class="home-video-thumbnail"><img src="https://i.ytimg.com/vi/${video.id}/hqdefault.jpg" alt="${escapeHtml(video.title)} video thumbnail" loading="lazy"><i>▶</i></span><strong>${escapeHtml(video.title)}</strong><small>Watch tutorial</small></button>`).join("");
    section.hidden = false;
    grid.querySelectorAll("[data-video-id]").forEach(button => button.addEventListener("click", () => openVideo(button.dataset.videoId, button.dataset.videoTitle)));
  }
  function openVideo(id, title) {
    const modal = document.createElement("div"); modal.className = "home-video-modal";
    modal.innerHTML = `<div class="home-video-modal-panel" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}"><button type="button" aria-label="Close video">×</button><iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1" title="${escapeHtml(title)}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>`;
    const close = () => modal.remove(); modal.addEventListener("click", event => { if (event.target === modal) close(); }); modal.querySelector("button").addEventListener("click", close); document.body.appendChild(modal);
  }
  init();
})();
