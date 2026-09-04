(() => {
  const route = window.location.pathname.split("/").pop() || "dashboard";
  const page = route.includes(".") ? route : `${route}.html`;
  const links = [
    ["dashboard.html", "🏠", "Dashboard"], ["earn.html", "🎯", "Task Board"],
    ["promote.html", "📣", "Create Task"], ["my-tasks.html", "📋", "My Posts"],
    ["my-submissions.html", "✅", "My Proofs"], ["coin-history.html", "🪙", "Coin History"],
    ["notifications.html", "🔔", "Notifications"], ["profile.html", "⚙️", "Settings"],
    ["admin.html", "🛡️", "Control Center"]
  ];
  const utilityLinks = [["about.html", "About"], ["contact.html", "Contact"], ["disclaimer.html", "Disclaimer"], ["privacy.html", "Privacy"], ["terms.html", "Terms"]];
  function buildShell() {
    // Keep legacy headers in the DOM (but hidden) so existing page scripts
    // that bind an old #logoutBtn continue to work while the new shell owns UI.
    const legacyHeader = document.querySelector("header.navbar");
    if (legacyHeader) legacyHeader.hidden = true;
    const legacyFooter = document.querySelector("footer");
    if (legacyFooter) legacyFooter.hidden = true;
    const main = document.querySelector("main");
    if (!main || document.querySelector(".app-shell")) return;
    const shell = document.createElement("div"); shell.className = "app-shell";
    const primary = links.map(([href, icon, label]) => `<a class="shell-link ${href === "admin.html" ? "admin-nav-link" : ""} ${page === href ? "is-active" : ""}" href="${href}" ${href === "admin.html" ? "hidden" : ""}><span>${icon}</span>${label}</a>`).join("");
    const utility = utilityLinks.map(([href, label]) => `<a class="shell-link shell-link-small" href="${href}">${label}</a>`).join("");
    shell.innerHTML = `<aside class="app-sidebar" aria-label="Account navigation"><a class="shell-brand" href="dashboard.html"><b>📺</b><strong>Bili<span>Follow</span></strong><small>Promote Bilibili • Earn Coins • Get Rewards</small></a><nav class="shell-nav">${primary}</nav><nav class="shell-utility">${utility}</nav><button type="button" class="shell-logout" id="shellLogout">↪ Log out</button></aside><section class="app-stage"><header class="app-topbar"><button class="sidebar-toggle" type="button" aria-label="Toggle navigation">☰</button><div class="topbar-spacer"></div><a class="topbar-bell" href="notifications.html" aria-label="Notifications">🔔<sup>•</sup></a><div class="topbar-coins"><span>🪙</span> <strong data-shell-coins>0</strong></div><a class="topbar-user" href="profile.html"><span class="user-avatar" data-shell-avatar>BF</span><strong data-shell-name>Member</strong><i>⌄</i></a></header><div class="app-content"></div></section>`;
    document.body.prepend(shell); shell.querySelector(".app-content").appendChild(main); document.body.classList.add("has-app-shell");
    shell.querySelector(".sidebar-toggle").addEventListener("click", () => document.body.classList.toggle("sidebar-open"));
    shell.querySelector("#shellLogout").addEventListener("click", async () => { try { const client = typeof createSupabaseClient === "function" ? createSupabaseClient() : null; if (client) await client.auth.signOut(); } finally { window.location.href = "login.html"; } });
    syncAccount(); syncAdminVisibility(shell); new MutationObserver(syncAccount).observe(main, { subtree: true, childList: true, characterData: true });
  }
  function syncAccount() { const coin = document.querySelector("#coinBalance"); const name = document.querySelector("#username, #profileUsername"); const coins = (coin?.textContent || "0").trim(); const userName = (name?.textContent || "Member").trim(); document.querySelectorAll("[data-shell-coins]").forEach(el => el.textContent = coins); document.querySelectorAll("[data-shell-name]").forEach(el => el.textContent = userName); document.querySelectorAll("[data-shell-avatar]").forEach(el => el.textContent = userName.slice(0, 2).toUpperCase()); }
  async function syncAdminVisibility(shell, attempt = 0) {
    if (!window.supabase || typeof createSupabaseClient !== "function") { if (attempt < 20) setTimeout(() => syncAdminVisibility(shell, attempt + 1), 250); return; }
    try {
      const client = createSupabaseClient();
      const { data: { user } } = await client.auth.getUser();
      if (!user) return;
      const { data: profile } = await client.from("profiles").select("is_admin").eq("id", user.id).single();
      if (profile?.is_admin) shell.querySelectorAll(".admin-nav-link").forEach(link => { link.hidden = false; });
    } catch (_) { /* Server-side RPCs remain the authorization boundary. */ }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", buildShell, { once: true }); else buildShell();
})();
