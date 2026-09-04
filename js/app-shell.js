(() => {
  let account = { coins: "0", name: "Member" };
  const route = window.location.pathname.split("/").pop() || "dashboard";
  const page = route.includes(".") ? route : `${route}.html`;
  const links = [
    ["dashboard.html", "🏠", "Dashboard"], ["earn.html", "🎯", "Task Board"],
    ["promote.html", "📣", "Create Task"], ["my-tasks.html", "📋", "My Posts"],
    ["my-submissions.html", "✅", "My Proofs"], ["coin-history.html", "🪙", "Coin History"],
    ["notifications.html", "🔔", "Notifications"], ["profile.html", "⚙️", "Settings"]
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
    const primary = links.map(([href, icon, label]) => `<a class="shell-link ${page === href ? "is-active" : ""}" href="${href}"><span>${icon}</span>${label}</a>`).join("");
    const utility = utilityLinks.map(([href, label]) => `<a class="shell-link shell-link-small" href="${href}">${label}</a>`).join("");
    shell.innerHTML = `<aside class="app-sidebar" aria-label="Account navigation"><a class="shell-brand" href="dashboard.html"><b>📺</b><strong>Bili<span>Follow</span></strong><small>Promote Bilibili • Earn Coins • Get Rewards</small></a><nav class="shell-nav">${primary}</nav><nav class="shell-utility">${utility}</nav><button type="button" class="shell-logout" id="shellLogout">↪ Log out</button></aside><button type="button" class="sidebar-backdrop" aria-label="Close navigation" hidden></button><section class="app-stage"><header class="app-topbar"><button class="sidebar-toggle" type="button" aria-label="Toggle navigation" aria-expanded="false">☰</button><div class="topbar-spacer"></div><a class="topbar-bell" href="notifications.html" aria-label="Notifications">🔔<sup>•</sup></a><div class="topbar-coins"><span>🪙</span> <strong data-shell-coins>0</strong></div><div class="topbar-account"><button class="topbar-user" type="button" aria-expanded="false"><span class="user-avatar" data-shell-avatar>BF</span><strong data-shell-name>Member</strong><i>⌄</i></button><nav class="account-menu" hidden><a href="profile.html">👤 My Profile</a><a href="update-password.html">🔐 Change Password</a><button type="button" data-account-logout>↪ Log out</button></nav></div></header><div class="app-content"></div></section>`;
    document.body.prepend(shell); shell.querySelector(".app-content").appendChild(main); document.body.classList.add("has-app-shell");
    const toggle = shell.querySelector(".sidebar-toggle");
    const backdrop = shell.querySelector(".sidebar-backdrop");
    const closeSidebar = () => { document.body.classList.remove("sidebar-open"); toggle.setAttribute("aria-expanded", "false"); backdrop.hidden = true; };
    toggle.addEventListener("click", () => { const open = document.body.classList.toggle("sidebar-open"); toggle.setAttribute("aria-expanded", String(open)); backdrop.hidden = !open; });
    backdrop.addEventListener("click", closeSidebar);
    shell.querySelectorAll(".shell-link, .shell-brand").forEach(link => link.addEventListener("click", closeSidebar));
    const logout = async () => { try { const client = typeof createSupabaseClient === "function" ? createSupabaseClient() : null; if (client) await client.auth.signOut(); } finally { window.location.href = "login.html"; } };
    shell.querySelector("#shellLogout").addEventListener("click", logout);
    shell.querySelector("[data-account-logout]").addEventListener("click", logout);
    const accountButton = shell.querySelector(".topbar-user"); const accountMenu = shell.querySelector(".account-menu");
    accountButton.addEventListener("click", event => { event.stopPropagation(); const visible = !accountMenu.hidden; accountMenu.hidden = visible; accountButton.setAttribute("aria-expanded", String(!visible)); });
    document.addEventListener("click", event => { if (!shell.querySelector(".topbar-account").contains(event.target)) { accountMenu.hidden = true; accountButton.setAttribute("aria-expanded", "false"); } });
    syncAccount(); loadAccount(shell); new MutationObserver(syncAccount).observe(main, { subtree: true, childList: true, characterData: true });
  }
  function syncAccount() { const coin = document.querySelector("#coinBalance"); const name = document.querySelector("#username, #profileUsername"); if (coin) account.coins = coin.textContent.trim() || account.coins; if (name) account.name = name.textContent.trim() || account.name; document.querySelectorAll("[data-shell-coins]").forEach(el => el.textContent = account.coins); document.querySelectorAll("[data-shell-name]").forEach(el => el.textContent = account.name); document.querySelectorAll("[data-shell-avatar]").forEach(el => el.textContent = account.name.slice(0, 2).toUpperCase()); }
  async function loadAccount(shell, attempt = 0) {
    if (!window.supabase || typeof createSupabaseClient !== "function") { if (attempt < 20) setTimeout(() => loadAccount(shell, attempt + 1), 250); return; }
    try {
      const client = createSupabaseClient();
      const { data: { user } } = await client.auth.getUser();
      if (!user) return;
      const { data: profile } = await client.from("profiles").select("username,coins,is_admin,avatar_path").eq("id", user.id).single();
      if (!profile) return;
      account = { coins: Number(profile.coins || 0).toLocaleString(), name: (profile.username || "Member").trim() };
      syncAccount();
      if (profile.avatar_path) {
        const { data: signed } = await client.storage.from("avatars").createSignedUrl(profile.avatar_path, 3600);
        if (signed?.signedUrl) document.querySelectorAll("[data-shell-avatar]").forEach(el => { el.textContent = ""; el.style.backgroundImage = `url("${signed.signedUrl}")`; el.classList.add("has-avatar"); });
      }
      if (profile.is_admin && !shell.querySelector(".admin-nav-link")) {
        const link = document.createElement("a");
        link.className = `shell-link admin-nav-link ${page === "admin.html" ? "is-active" : ""}`;
        link.href = "admin.html";
        link.innerHTML = "<span>🛡️</span>Control Center";
        shell.querySelector(".shell-nav").appendChild(link);
      }
    } catch (_) { /* Server-side RPCs remain the authorization boundary. */ }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", buildShell, { once: true }); else buildShell();
})();
