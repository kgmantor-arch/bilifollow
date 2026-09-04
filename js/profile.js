(function () {
  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  script.onload = init;
  document.head.appendChild(script);

  async function init() {
    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data: { user } } = await client.auth.getUser();
    if (!user) { window.showGuestPreview?.(); return; }

    const form = document.getElementById("profileForm");
    const username = document.getElementById("username");
    const referenceUrl = document.getElementById("referenceUrl");
    const message = document.getElementById("message");
    const { data, error } = await client.from("profiles")
      .select("username, bilibili_url").eq("id", user.id).single();
    if (error) {
      message.textContent = "❌ Unable to load your profile.";
      console.error(error);
    } else {
      username.value = data.username || "";
      referenceUrl.value = data.bilibili_url || "";
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      message.textContent = "⏳ Saving...";
      const { error: saveError } = await client.rpc("update_profile", {
        p_username: username.value.trim(),
        p_reference_url: referenceUrl.value.trim() || null
      });
      message.textContent = saveError ? `❌ ${saveError.message}` : "✅ Profile updated.";
      if (saveError) console.error(saveError);
    });

    document.getElementById("logoutBtn").addEventListener("click", async (event) => {
      event.preventDefault();
      await client.auth.signOut();
      window.location.href = "login.html";
    });
  }
})();
