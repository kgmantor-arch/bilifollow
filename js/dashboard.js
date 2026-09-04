const SUPABASE_SCRIPT =
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

function loadSupabase() {
  return new Promise((resolve, reject) => {

    if (window.supabase) {
      resolve();
      return;
    }

    const script = document.createElement("script");

    script.src = SUPABASE_SCRIPT;

    script.onload = resolve;

    script.onerror = () => {
      reject(
        new Error("Unable to load Supabase.")
      );
    };

    document.head.appendChild(script);
  });
}


async function startDashboard() {

  try {

    await loadSupabase();

    const client = createSupabaseClient();


    const {
      data: {
        user
      }
    } = await client.auth.getUser();


    if (!user) {

      window.showGuestPreview?.();

      return;
    }


    const {
      data: profile,
      error
    } = await client
      .from("profiles")
      .select(
        "username, coins, level, status, bilibili_url, is_admin"
      )
      .eq("id", user.id)
      .single();


    if (error) {
      throw error;
    }

    if (profile.status === "suspended") {
      await client.auth.signOut();
      window.location.href = "login.html";
      return;
    }

    if (profile.is_admin) {
      document.getElementById("adminCard").hidden = false;
    }


    document.getElementById(
      "username"
    ).textContent =
      profile.username || "User";


    document.getElementById(
      "profileUsername"
    ).textContent =
      profile.username || "User";


    document.getElementById(
      "profileEmail"
    ).textContent =
      user.email || "Not available";


    document.getElementById(
      "coinBalance"
    ).textContent =
      profile.coins ?? 0;


    document.getElementById(
      "profileLevel"
    ).textContent =
      profile.level ?? 1;


    document.getElementById(
      "profileStatus"
    ).textContent =
      profile.status || "Active";


    document.getElementById(
      "bilibiliProfile"
    ).textContent =
      profile.bilibili_url || "Not added";


    document.getElementById(
      "logoutButton"
    ).addEventListener(
      "click",
      async () => {

        await client.auth.signOut();

        window.location.href =
          "login.html";

      }
    );

  } catch (error) {

    console.error(error);

    alert(
      "Unable to load dashboard."
    );
  }
}


document.addEventListener(
  "DOMContentLoaded",
  startDashboard
);
