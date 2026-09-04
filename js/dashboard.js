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
      await loadDashboardMetrics(client);
      await loadTopTasks(client, false);
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

    await loadDashboardMetrics(client);
    await loadTopTasks(client, true);


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

async function loadDashboardMetrics(client) {
  const { data, error } = await client.rpc("dashboard_metrics");
  if (error || !data) return;
  const put = (id, value) => { const node = document.getElementById(id); if (node) node.textContent = Number(value || 0).toLocaleString(); };
  put("communityTaskCount", data.communityTasks);
  put("completedTaskCount", data.userCompleted);
  put("availableRewardCount", data.availableTasks);
}

async function loadTopTasks(client, signedIn) {
  const list = document.getElementById("topTasksList");
  if (!list) return;
  const { data, error } = await client.rpc("public_list_top_tasks", { p_limit: 5 });
  if (error) { list.innerHTML = '<p class="form-help">Top tasks are unavailable right now.</p>'; return; }
  if (!data?.length) { list.innerHTML = '<p class="form-help">No active tasks are available right now. Please check back later.</p>'; return; }
  list.innerHTML = data.map(task => {
    const href = signedIn ? `task.html?id=${encodeURIComponent(task.id)}` : "login.html";
    const label = signedIn ? "🎁 Start & Earn" : "🔐 Login to start";
    return `<article class="bf-top-task-card"><div><span class="bf-task-gift">🎁</span><strong>${escapeHtml(task.title)}</strong><small>${escapeHtml(task.category || "Bilibili Follow")} · ${task.completed}/${task.target} completed</small></div><div class="bf-top-task-reward">🪙 ${Number(task.reward).toLocaleString()} Coins</div><a class="gift-task-button" href="${href}">${label}</a></article>`;
  }).join("");
}

function escapeHtml(value) { return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }


document.addEventListener(
  "DOMContentLoaded",
  startDashboard
);
