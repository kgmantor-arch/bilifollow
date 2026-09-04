(() => {
  function widget() {
    if (document.querySelector(".bf-chat")) return;
    const host = document.createElement("section");
    host.className = "bf-chat";
    host.innerHTML = '<button class="bf-chat-toggle" type="button" aria-expanded="false">💬 <span>Live support</span></button><div class="bf-chat-panel" hidden><div class="bf-chat-head"><strong>Live support</strong><button type="button" class="bf-chat-close" aria-label="Close chat">×</button></div><p>Send a message. An administrator can reply from the Control Center.</p><form><input class="bf-chat-email" type="email" placeholder="Your email" required><textarea class="bf-chat-message" maxlength="1000" placeholder="How can we help?" required></textarea><button>Send message</button><small class="bf-chat-status"></small></form></div>';
    document.body.appendChild(host);
    const panel = host.querySelector(".bf-chat-panel"), toggle = host.querySelector(".bf-chat-toggle");
    const open = () => { panel.hidden = false; toggle.setAttribute("aria-expanded", "true"); };
    toggle.addEventListener("click", () => panel.hidden ? open() : (panel.hidden = true, toggle.setAttribute("aria-expanded", "false")));
    host.querySelector(".bf-chat-close").addEventListener("click", () => { panel.hidden = true; toggle.setAttribute("aria-expanded", "false"); });
    host.querySelector("form").addEventListener("submit", async event => {
      event.preventDefault(); const status = host.querySelector(".bf-chat-status"); status.textContent = "Sending…";
      try {
        if (!window.supabase) await new Promise((resolve, reject) => { const s = document.createElement("script"); s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"; s.onload = resolve; s.onerror = reject; document.head.appendChild(s); });
        const client = createSupabaseClient();
        const { error } = await client.rpc("submit_contact_message", { p_email: host.querySelector(".bf-chat-email").value.trim(), p_subject: "Live support chat", p_message: host.querySelector(".bf-chat-message").value.trim() });
        if (error) throw error;
        host.querySelector(".bf-chat-message").value = ""; status.textContent = "Sent. Support will reply using your email.";
      } catch (error) { status.textContent = `Could not send: ${error.message}`; }
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", widget, { once: true }); else widget();
})();
