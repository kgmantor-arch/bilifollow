(() => {
  function loadSupabase() {
    if (window.supabase) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
      script.onload = resolve;
      script.onerror = () => reject(new Error("Unable to load Supabase."));
      document.head.appendChild(script);
    });
  }

  async function init() {
    const allowed = await (window.bfAdminGate || Promise.resolve(true));
    if (!allowed) return;
    await loadSupabase();
    const client = createSupabaseClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) { window.showGuestPreview?.(); return; }
    const message = document.getElementById("message");
    const say = (value) => { message.textContent = value; };
    const rpc = async (name, args = {}) => {
      const result = await client.rpc(name, args);
      if (result.error) throw result.error;
      return result.data;
    };
    setupAdminSections();
    setupPageEditor();

    const saveSetting = async (key, value) => {
      try { await rpc("admin_set_setting", { p_key: key, p_value: value }); say("Settings saved. Refresh the website to see them."); }
      catch (error) { say(`Save failed: ${error.message}`); }
    };

    document.getElementById("logoutBtn").addEventListener("click", async (event) => { event.preventDefault(); await client.auth.signOut(); window.location.href = "login.html"; });
    document.getElementById("memberSearch").addEventListener("submit", async (event) => { event.preventDefault(); await loadMembers(); });
    document.getElementById("noticeForm").addEventListener("submit", async (event) => { event.preventDefault(); await saveSetting("site_notice", { enabled: document.getElementById("noticeEnabled").checked, title: document.getElementById("noticeTitle").value.trim(), message: document.getElementById("noticeMessage").value.trim() }); });
    document.getElementById("footerNoticeForm").addEventListener("submit", async (event) => { event.preventDefault(); await saveSetting("footer_notice", { enabled: document.getElementById("footerNoticeEnabled").checked, title: document.getElementById("footerNoticeTitle").value.trim(), message: document.getElementById("footerNoticeMessage").value.trim() }); });
    document.getElementById("footerForm").addEventListener("submit", async (event) => { event.preventDefault(); await saveSetting("footer", { copyright: document.getElementById("footerCopyright").value.trim(), disclaimer: document.getElementById("footerDisclaimer").value.trim() }); });
    document.getElementById("statsSettingsForm").addEventListener("submit", async (event) => { event.preventDefault(); await saveSetting("site_stats", { manual: document.getElementById("statsManualEnabled").checked, users: Number(document.getElementById("statsUsers").value) || 0, activeTasks: Number(document.getElementById("statsActiveTasks").value) || 0, completedTasks: Number(document.getElementById("statsCompletedTasks").value) || 0 }); });
    document.getElementById("welcomeOfferForm").addEventListener("submit", async (event) => { event.preventDefault(); await saveSetting("welcome_offer", { enabled: document.getElementById("welcomeOfferEnabled").checked, coins: Number(document.getElementById("welcomeOfferCoins").value), message: document.getElementById("welcomeOfferMessage").value.trim() }); });
    document.getElementById("supportChatForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const url = document.getElementById("supportChatUrl").value.trim();
      if (url && !/^https:\/\/embed\.tawk\.to\/[a-z0-9/_-]+$/i.test(url)) { say("Use the Tawk.to embed URL beginning with https://embed.tawk.to/"); return; }
      await saveSetting("support_chat", { enabled: document.getElementById("supportChatEnabled").checked, embedUrl: url });
    });
    document.getElementById("homeForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const fields = ["homePrimaryUrl", "homeSecondaryUrl", "homeCtaUrl", "homeVideoOneUrl", "homeVideoTwoUrl"];
      if (fields.some(id => { const value = document.getElementById(id).value.trim(); return value && !/^(https:\/\/|[a-z0-9-]+\.html$)/i.test(value); })) { say("Homepage links must use https:// or a local .html page."); return; }
      const videoUrls = ["homeVideoOneUrl", "homeVideoTwoUrl"];
      if (videoUrls.some(id => { const value = document.getElementById(id).value.trim(); return value && !/^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(value); })) { say("Video links must be valid YouTube links beginning with https://"); return; }
      await saveSetting("homepage", { badge: document.getElementById("homeBadge").value.trim(), title: document.getElementById("homeTitle").value.trim(), description: document.getElementById("homeDescription").value.trim(), primaryText: document.getElementById("homePrimaryText").value.trim(), primaryUrl: document.getElementById("homePrimaryUrl").value.trim(), secondaryText: document.getElementById("homeSecondaryText").value.trim(), secondaryUrl: document.getElementById("homeSecondaryUrl").value.trim(), howTitle: document.getElementById("homeHowTitle").value.trim(), howDescription: document.getElementById("homeHowDescription").value.trim(), videoEnabled: document.getElementById("homeVideoEnabled").checked, videoTitle: document.getElementById("homeVideoTitle").value.trim(), videoDescription: document.getElementById("homeVideoDescription").value.trim(), videoOneTitle: document.getElementById("homeVideoOneTitle").value.trim(), videoOneUrl: document.getElementById("homeVideoOneUrl").value.trim(), videoTwoTitle: document.getElementById("homeVideoTwoTitle").value.trim(), videoTwoUrl: document.getElementById("homeVideoTwoUrl").value.trim(), ctaTitle: document.getElementById("homeCtaTitle").value.trim(), ctaDescription: document.getElementById("homeCtaDescription").value.trim(), ctaText: document.getElementById("homeCtaText").value.trim(), ctaUrl: document.getElementById("homeCtaUrl").value.trim() });
    });
    document.getElementById("adsForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const url = document.getElementById("popupUrl").value.trim();
      if (url && !/^https:\/\//i.test(url)) { say("Popup URL must start with https://"); return; }
      const directUrl = document.getElementById("directUrl").value.trim();
      if (directUrl && !/^https:\/\//i.test(directUrl)) { say("Direct-link URL must start with https://"); return; }
      const provider = document.getElementById("adProvider").value;
      const adsterraCode = document.getElementById("adsterraCode").value.trim();
      if ((provider === "adsterra-banner" || provider === "adsterra-social") && (!/atOptions/i.test(adsterraCode) || !/<script[^>]+src=/i.test(adsterraCode))) { say("Paste the complete Adsterra Get Code: it must include atOptions and the final script src line."); return; }
      await saveSetting("ads", { enabled: document.getElementById("adsEnabled").checked, provider, adPlacement: document.getElementById("adPlacement").value, adsenseClient: document.getElementById("adsenseClient").value.trim(), adsenseBannerSlot: document.getElementById("adsenseBannerSlot").value.trim(), adsterraCode, adsterraWidth: Number(document.getElementById("adsterraWidth").value) || 728, adsterraHeight: Number(document.getElementById("adsterraHeight").value) || 90, directTitle: document.getElementById("directTitle").value.trim(), directMessage: document.getElementById("directMessage").value.trim(), directUrl, directButton: document.getElementById("directButton").value.trim(), popupEnabled: document.getElementById("popupEnabled").checked, popupTitle: document.getElementById("popupTitle").value.trim(), popupMessage: document.getElementById("popupMessage").value.trim(), popupUrl: url, popupButton: document.getElementById("popupButton").value.trim() });
    });
    document.getElementById("pageForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      try { await rpc("admin_save_site_page", { p_slug: document.getElementById("pageSlug").value, p_title: document.getElementById("pageTitle").value, p_body: document.getElementById("pageBody").value }); say("Website page saved."); }
      catch (error) { say(`Save failed: ${error.message}`); }
    });
    document.getElementById("pageSlug").addEventListener("change", () => loadSelectedPage().catch(error => say(`Could not load page: ${error.message}`)));
    document.getElementById("broadcastForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      try { await rpc("admin_send_notice", { p_title: document.getElementById("broadcastTitle").value, p_message: document.getElementById("broadcastMessage").value }); say("Notice sent to active members."); event.target.reset(); }
      catch (error) { say(`Send failed: ${error.message}`); }
    });

    async function loadStats() {
      const data = await rpc("admin_dashboard");
      document.getElementById("stats").innerHTML = Object.entries(data).map(([key, value]) => `<div class="card"><strong>${value}</strong><span>${key.replace(/([A-Z])/g, " $1")}</span></div>`).join("");
    }
    async function loadSettings() {
      const { data, error } = await client.from("app_settings").select("key,value");
      if (error) throw error;
      const settings = Object.fromEntries(data.map(item => [item.key, item.value]));
      const notice = settings.site_notice || {}, footerNotice = settings.footer_notice || {}, ads = settings.ads || {}, footer = settings.footer || {}, homepage = settings.homepage || {}, welcome = settings.welcome_offer || { enabled: true, coins: 50 }, stats = settings.site_stats || {}, supportChat = settings.support_chat || {};
      document.getElementById("noticeEnabled").checked = !!notice.enabled;
      document.getElementById("noticeTitle").value = notice.title || "";
      document.getElementById("noticeMessage").value = notice.message || "";
      document.getElementById("footerNoticeEnabled").checked = !!footerNotice.enabled;
      document.getElementById("footerNoticeTitle").value = footerNotice.title || "";
      document.getElementById("footerNoticeMessage").value = footerNotice.message || "";
      document.getElementById("footerCopyright").value = footer.copyright || "";
      document.getElementById("footerDisclaimer").value = footer.disclaimer || "";
      document.getElementById("statsManualEnabled").checked = !!stats.manual;
      document.getElementById("statsUsers").value = stats.users || 0;
      document.getElementById("statsActiveTasks").value = stats.activeTasks || 0;
      document.getElementById("statsCompletedTasks").value = stats.completedTasks || 0;
      document.getElementById("welcomeOfferEnabled").checked = welcome.enabled !== false;
      document.getElementById("welcomeOfferCoins").value = Number.isFinite(Number(welcome.coins)) ? Number(welcome.coins) : 50;
      document.getElementById("welcomeOfferMessage").value = welcome.message || "Welcome to BiliFollow! Your 50 free Coins are ready to use.";
      document.getElementById("supportChatEnabled").checked = supportChat.enabled !== false;
      document.getElementById("supportChatUrl").value = supportChat.embedUrl || "https://embed.tawk.to/6a9ade7201ac02344ed3b885/1k1mf9sgb";
      document.getElementById("adsEnabled").checked = !!ads.enabled;
      document.getElementById("adProvider").value = ads.provider === "adsterra" ? "adsterra-banner" : (ads.provider || "adsense");
      document.getElementById("adPlacement").value = ads.adPlacement || "top";
      document.getElementById("adsenseClient").value = ads.adsenseClient || "";
      document.getElementById("adsenseBannerSlot").value = ads.adsenseBannerSlot || "";
      document.getElementById("adsterraCode").value = ads.adsterraCode || (String(ads.adsterraKey || "").includes("<script") ? ads.adsterraKey : "");
      document.getElementById("adsterraWidth").value = ads.adsterraWidth || 728;
      document.getElementById("adsterraHeight").value = ads.adsterraHeight || 90;
      document.getElementById("directTitle").value = ads.directTitle || "";
      document.getElementById("directMessage").value = ads.directMessage || "";
      document.getElementById("directUrl").value = ads.directUrl || "";
      document.getElementById("directButton").value = ads.directButton || "";
      document.getElementById("popupEnabled").checked = !!ads.popupEnabled;
      document.getElementById("popupTitle").value = ads.popupTitle || "";
      document.getElementById("popupMessage").value = ads.popupMessage || ads.popupHtml || "";
      document.getElementById("popupUrl").value = ads.popupUrl || "";
      document.getElementById("popupButton").value = ads.popupButton || "";
      document.getElementById("homeBadge").value = homepage.badge || "";
      document.getElementById("homeTitle").value = homepage.title || "";
      document.getElementById("homeDescription").value = homepage.description || "";
      document.getElementById("homePrimaryText").value = homepage.primaryText || "";
      document.getElementById("homePrimaryUrl").value = homepage.primaryUrl || "";
      document.getElementById("homeSecondaryText").value = homepage.secondaryText || "";
      document.getElementById("homeSecondaryUrl").value = homepage.secondaryUrl || "";
      document.getElementById("homeHowTitle").value = homepage.howTitle || "";
      document.getElementById("homeHowDescription").value = homepage.howDescription || "";
      document.getElementById("homeVideoEnabled").checked = !!homepage.videoEnabled;
      document.getElementById("homeVideoTitle").value = homepage.videoTitle || "Learn BiliFollow in Minutes";
      document.getElementById("homeVideoDescription").value = homepage.videoDescription || "Watch these short guides before you start.";
      document.getElementById("homeVideoOneTitle").value = homepage.videoOneTitle || "How to Create a Task";
      document.getElementById("homeVideoOneUrl").value = homepage.videoOneUrl || "";
      document.getElementById("homeVideoTwoTitle").value = homepage.videoTwoTitle || "How to Complete a Task & Earn Coins";
      document.getElementById("homeVideoTwoUrl").value = homepage.videoTwoUrl || "";
      document.getElementById("homeCtaTitle").value = homepage.ctaTitle || "";
      document.getElementById("homeCtaDescription").value = homepage.ctaDescription || "";
      document.getElementById("homeCtaText").value = homepage.ctaText || "";
      document.getElementById("homeCtaUrl").value = homepage.ctaUrl || "";
    }
    async function loadSelectedPage() {
      const slug = document.getElementById("pageSlug").value;
      const { data, error } = await client.from("site_pages").select("title,body").eq("slug", slug).single();
      if (error) throw error;
      document.getElementById("pageTitle").value = data.title || "";
      document.getElementById("pageBody").value = data.body || "";
    }
    async function loadMembers() {
      const rows = await rpc("admin_list_members", { p_search: document.getElementById("memberQuery").value.trim(), p_limit: 100 });
      const list = document.getElementById("memberList");
      list.innerHTML = rows.map(member => `<article class="admin-row"><strong>${escapeHtml(member.username)}</strong><small>${member.id}</small><span>${member.coins} Coins · ${escapeHtml(member.status)} · ${member.is_admin ? "Administrator" : "Member"}</span><input id="coins-${member.id}" type="number" placeholder="+/- coins"><input id="note-${member.id}" placeholder="Reason"><button data-coin="${member.id}">Apply Coins</button><button data-status="${member.id}" data-next="${member.status === "active" ? "suspended" : "active"}">${member.status === "active" ? "Suspend" : "Activate"}</button><button data-role="${member.id}" data-admin="${member.is_admin ? "false" : "true"}">${member.is_admin ? "Remove Admin" : "Make Admin"}</button></article>`).join("") || "No members found.";
      list.querySelectorAll("button[data-coin]").forEach(button => button.addEventListener("click", () => adjustCoins(button.dataset.coin)));
      list.querySelectorAll("button[data-status]").forEach(button => button.addEventListener("click", () => updateStatus(button.dataset.status, button.dataset.next)));
      list.querySelectorAll("button[data-role]").forEach(button => button.addEventListener("click", () => updateRole(button.dataset.role, button.dataset.admin === "true")));
    }
    async function adjustCoins(id) { try { await rpc("admin_adjust_coins", { p_user_id: id, p_amount: Number(document.getElementById(`coins-${id}`).value), p_note: document.getElementById(`note-${id}`).value }); say("Coin balance updated."); await loadMembers(); } catch (error) { say(`Coin update failed: ${error.message}`); } }
    async function updateStatus(id, next) { try { await rpc("admin_set_member_status", { p_user_id: id, p_status: next }); say("Member status updated."); await loadMembers(); } catch (error) { say(`Status update failed: ${error.message}`); } }
    async function updateRole(id, isAdmin) { try { await rpc("admin_set_member_admin", { p_user_id: id, p_is_admin: isAdmin }); say("Member role updated."); await loadMembers(); } catch (error) { say(`Role update failed: ${error.message}`); } }
    async function loadTasks() {
      const rows = await rpc("admin_list_tasks", { p_limit: 100 });
      const list = document.getElementById("taskList");
      list.innerHTML = rows.map(task => `<article class="admin-row"><strong>#${task.id} ${escapeHtml(task.title || "Task")}</strong><span>${escapeHtml(task.status)} · ${task.completed}/${task.target} · ${task.reward} Coins</span><button data-task="${task.id}" data-action="${task.status === "active" ? "pause" : "activate"}">${task.status === "active" ? "Pause" : "Activate"}</button></article>`).join("") || "No tasks found.";
      list.querySelectorAll("button[data-task]").forEach(button => button.addEventListener("click", async () => { try { await rpc("admin_manage_task", { p_task_id: Number(button.dataset.task), p_action: button.dataset.action }); say("Task updated."); await loadTasks(); } catch (error) { say(`Task update failed: ${error.message}`); } }));
    }
    async function loadActivity() {
      const rows = await rpc("admin_list_activity", { p_limit: 150 });
      const list = document.getElementById("activityList");
      list.innerHTML = rows.map(item => `<article class="admin-row"><strong>${escapeHtml(item.kind.replaceAll("_", " "))}${item.task_title ? ` · ${escapeHtml(item.task_title)}` : ""}</strong><span>${item.creator ? `Task creator: ${escapeHtml(item.creator)} · ` : ""}${item.worker ? `Member: ${escapeHtml(item.worker)} · ` : ""}${item.reviewer ? `Reviewed by: ${escapeHtml(item.reviewer)} · ` : ""}${item.amount ? `${item.amount > 0 ? "+" : ""}${item.amount} Coins · ` : ""}${escapeHtml(item.detail || "")}</span><small>${new Date(item.happened_at).toLocaleString()}</small></article>`).join("") || "No activity yet.";
    }
    async function loadReports() {
      const { data, error } = await client.from("reports").select("id,task_id,category,details,status,created_at").order("created_at", { ascending: false });
      if (error) throw error;
      const list = document.getElementById("reportList");
      list.innerHTML = data?.map(report => `<article class="admin-row"><strong>Report #${report.id} · ${escapeHtml(report.category)}</strong><span>${escapeHtml(report.details)} · ${escapeHtml(report.status)}</span><textarea id="rnote-${report.id}" placeholder="Moderator note"></textarea><label><input type="checkbox" id="pause-${report.id}"> Pause task</label><button data-report="${report.id}" data-state="resolved">Resolve</button><button data-report="${report.id}" data-state="dismissed">Dismiss</button></article>`).join("") || "No reports found.";
      list.querySelectorAll("button[data-report]").forEach(button => button.addEventListener("click", async () => { try { await rpc("moderate_report", { p_report_id: Number(button.dataset.report), p_status: button.dataset.state, p_note: document.getElementById(`rnote-${button.dataset.report}`).value || null, p_pause_task: document.getElementById(`pause-${button.dataset.report}`).checked }); say("Report updated."); await loadReports(); } catch (error) { say(`Report update failed: ${error.message}`); } }));
    }
    async function loadContacts() {
      const rows = await rpc("admin_list_contact_messages", { p_limit: 100 });
      const list = document.getElementById("contactList");
      list.innerHTML = rows.map(contact => `<article class="admin-row"><strong>${escapeHtml(contact.subject)} · ${escapeHtml(contact.status)}</strong><span>${escapeHtml(contact.email)} — ${escapeHtml(contact.message)}</span><textarea id="cnote-${contact.id}" placeholder="Internal admin note">${escapeHtml(contact.admin_note || "")}</textarea><button type="button" data-reply="${contact.id}">Reply by email</button><button type="button" data-contact="${contact.id}" data-contact-state="${contact.status === "open" ? "closed" : "open"}">${contact.status === "open" ? "Close" : "Reopen"}</button></article>`).join("") || "No contact messages found.";
      list.querySelectorAll("button[data-reply]").forEach(button => button.addEventListener("click", () => {
        const contact = rows.find(item => String(item.id) === button.dataset.reply);
        if (!contact || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact.email)) { say("This contact message has an invalid reply email."); return; }
        const subject = contact.subject.toLowerCase().startsWith("re:") ? contact.subject : `Re: ${contact.subject}`;
        const body = `Hello,\n\n\n\n--- Original message ---\n${contact.message}`;
        window.location.href = `mailto:${encodeURIComponent(contact.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      }));
      list.querySelectorAll("button[data-contact]").forEach(button => button.addEventListener("click", async () => { try { await rpc("admin_moderate_contact_message", { p_message_id: Number(button.dataset.contact), p_status: button.dataset.contactState, p_note: document.getElementById(`cnote-${button.dataset.contact}`).value }); say("Contact message updated."); await loadContacts(); await loadStats(); } catch (error) { say(`Contact update failed: ${error.message}`); } }));
    }
    try { await Promise.all([loadStats(), loadSettings(), loadSelectedPage(), loadMembers(), loadTasks(), loadActivity(), loadReports(), loadContacts()]); }
    catch (error) { say(`Admin panel could not load: ${error.message}`); }
  }

  function setupAdminSections() {
    const main = document.querySelector(".admin-page");
    const sections = [...main.querySelectorAll(":scope > section.card, :scope > .admin-grid > article.card")];
    if (!sections.length || document.querySelector(".admin-section-tabs")) return;
    const tabs = document.createElement("nav"); tabs.className = "admin-section-tabs"; tabs.setAttribute("aria-label", "Control Center sections");
    sections.forEach((section, index) => {
      const title = section.querySelector("h2")?.textContent || `Section ${index + 1}`;
      const button = document.createElement("button"); button.type = "button"; button.textContent = title; button.className = index === 0 ? "is-active" : "";
      if (index !== 0) section.hidden = true;
      button.addEventListener("click", () => { sections.forEach((item, itemIndex) => { item.hidden = itemIndex !== index; }); tabs.querySelectorAll("button").forEach(item => item.classList.remove("is-active")); button.classList.add("is-active"); });
      tabs.appendChild(button);
    });
    main.querySelector("#stats").after(tabs);
  }

  function setupPageEditor() {
    const editor = document.getElementById("pageBody");
    document.querySelectorAll("[data-page-format]").forEach(button => button.addEventListener("click", () => {
      const action = button.dataset.pageFormat;
      const start = editor.selectionStart, end = editor.selectionEnd;
      const selected = editor.value.slice(start, end);
      let replacement = selected;
      if (action === "bold") replacement = `**${selected || "bold text"}**`;
      if (action === "link") {
        if (!selected) { alert("First select the word or sentence you want to link."); return; }
        const url = prompt("Paste the HTTPS link:");
        if (!url) return;
        if (!/^https:\/\//i.test(url.trim())) { alert("Link must start with https://"); return; }
        replacement = `[${selected}](${url.trim()})`;
      }
      if (action === "heading") {
        const lineStart = editor.value.lastIndexOf("\n", start - 1) + 1;
        const lineEnd = editor.value.indexOf("\n", end);
        const line = editor.value.slice(lineStart, lineEnd < 0 ? editor.value.length : lineEnd).replace(/^##\s*/, "");
        editor.setRangeText(`## ${line || "Section heading"}`, lineStart, lineEnd < 0 ? editor.value.length : lineEnd, "end");
        editor.focus(); return;
      }
      if (action === "list") replacement = (selected || "List item").split("\n").map(line => `- ${line.replace(/^-\s*/, "")}`).join("\n");
      editor.setRangeText(replacement, start, end, "end");
      editor.focus();
    }));
  }

  function escapeHtml(value) { return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => { init().catch(error => { const box = document.getElementById("message"); if (box) box.textContent = error.message; }); }, { once: true });
  else init().catch(error => { const box = document.getElementById("message"); if (box) box.textContent = error.message; });
})();
