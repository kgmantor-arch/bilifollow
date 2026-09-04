(function () {
  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  script.onload = init;
  document.head.appendChild(script);

  async function init() {
    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data: { user } } = await client.auth.getUser();
    if (!user) { window.showGuestPreview?.(); return; }
    const list = document.getElementById("notificationList");
    const { data, error } = await client.from("notifications")
      .select("id, type, title, body, read_at, created_at").eq("user_id", user.id)
      .order("created_at", { ascending: false }).limit(50);
    const unreadCount = data?.filter(item => !item.read_at).length || 0;
    document.getElementById("unreadCount").textContent = unreadCount ? `${unreadCount} unread update${unreadCount === 1 ? "" : "s"}` : "You are all caught up.";
    if (error) {
      list.textContent = "❌ Unable to load notifications.";
      console.error(error);
    } else if (!data?.length) {
      list.innerHTML = '<div class="card">No notifications yet.</div>';
    } else {
      list.innerHTML = data.map(item => `<article class="card${item.read_at ? "" : " notification-unread"}"><h2>${escapeHtml(item.title)}</h2><p>${escapeHtml(item.body)}</p><small>${new Date(item.created_at).toLocaleString()}</small></article>`).join("");
    }
    await client.rpc("mark_notifications_read");
    document.getElementById("logoutBtn").addEventListener("click", async (event) => {
      event.preventDefault(); await client.auth.signOut(); window.location.href = "login.html";
    });
  }
  function escapeHtml(value) { return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
})();
