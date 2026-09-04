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
      .select("username, bilibili_url, avatar_path").eq("id", user.id).single();
    if (error) {
      message.textContent = "❌ Unable to load your profile.";
      console.error(error);
    } else {
      username.value = data.username || "";
      referenceUrl.value = data.bilibili_url || "";
      if (data.avatar_path) { const { data: signed } = await client.storage.from("avatars").createSignedUrl(data.avatar_path, 3600); if (signed?.signedUrl) { const preview = document.getElementById("avatarPreview"); preview.src = signed.signedUrl; preview.hidden = false; document.getElementById("avatarFallback").hidden = true; } }
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

    document.getElementById("avatarFile").addEventListener("change", async event => {
      const file = event.target.files?.[0]; if (!file) return;
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 2 * 1024 * 1024) { message.textContent = "❌ Choose a PNG, JPG, or WEBP image up to 2 MB."; event.target.value = ""; return; }
      message.textContent = "⏳ Uploading profile photo...";
      const extension = file.name.split(".").pop().toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${user.id}/avatar.${extension}`;
      const { error: uploadError } = await client.storage.from("avatars").upload(path, file, { contentType: file.type, upsert: true });
      if (uploadError) { message.textContent = `❌ ${uploadError.message}`; return; }
      const { error: saveError } = await client.rpc("update_profile_avatar", { p_avatar_path: path });
      if (saveError) { message.textContent = `❌ ${saveError.message}`; return; }
      const { data: signed } = await client.storage.from("avatars").createSignedUrl(path, 3600);
      if (signed?.signedUrl) { document.getElementById("avatarPreview").src = signed.signedUrl; document.getElementById("avatarPreview").hidden = false; document.getElementById("avatarFallback").hidden = true; }
      message.textContent = "✅ Profile photo saved.";
    });

    document.getElementById("logoutBtn").addEventListener("click", async (event) => {
      event.preventDefault();
      await client.auth.signOut();
      window.location.href = "login.html";
    });
  }
})();
