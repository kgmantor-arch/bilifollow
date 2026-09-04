(() => {
  function loadSupabase() {
    if (window.supabase) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
      script.onload = resolve;
      script.onerror = () => reject(new Error("Could not load the contact service."));
      document.head.appendChild(script);
    });
  }

  async function init() {
    const form = document.getElementById("contactForm");
    if (!form) return;
    const status = document.getElementById("contactStatus");
    await loadSupabase();
    const client = createSupabaseClient();
    const { data: { user } } = await client.auth.getUser();
    if (user?.email) document.getElementById("contactEmail").value = user.email;

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      status.textContent = "Sending…";
      const { error } = await client.rpc("submit_contact_message", {
        p_email: document.getElementById("contactEmail").value.trim(),
        p_subject: document.getElementById("contactSubject").value.trim(),
        p_message: document.getElementById("contactMessage").value.trim()
      });
      if (error) { status.textContent = `Could not send: ${error.message}`; return; }
      form.reset();
      if (user?.email) document.getElementById("contactEmail").value = user.email;
      status.textContent = "Your message was sent. We will review it soon.";
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => { init().catch(error => { const status = document.getElementById("contactStatus"); if (status) status.textContent = error.message; }); }, { once: true });
  else init().catch(error => { const status = document.getElementById("contactStatus"); if (status) status.textContent = error.message; });
})();
