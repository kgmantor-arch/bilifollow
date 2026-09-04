(function () {

  const script = document.createElement("script");

  script.src =
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

  script.onload = init;

  document.head.appendChild(script);


  async function init() {

    const { createClient } = window.supabase;

    const supabaseClient =
      createClient(SUPABASE_URL, SUPABASE_KEY);


    // =========================
    // LOGIN CHECK
    // =========================

    const {
      data: { user }
    } = await supabaseClient.auth.getUser();

    if (!user) {
      window.showGuestPreview?.();
      return;
    }


    const list =
      document.getElementById("taskList");


    // =========================
    // LOAD PROFILE
    // =========================

    const {
      data: profile,
      error: profileError
    } = await supabaseClient
      .from("profiles")
      .select("coins")
      .eq("id", user.id)
      .single();


    if (profileError) {

      console.error(profileError);

    }


    const balance =
      document.getElementById("coinBalance");

    if (balance) {

      balance.textContent =
        Number(profile?.coins || 0);

    }


    // =========================
    // LOAD ACTIVE TASKS
    // =========================

    const {
      data: tasks,
      error: taskError
    } = await supabaseClient
      .from("tasks")
      .select("*")
      .eq("status", "active")
      .neq("creator_id", user.id)
      .order("created_at", {
        ascending: false
      })
      .limit(50);


    if (taskError) {

      console.error(taskError);

      list.innerHTML = `
        <div class="card">
          ❌ Failed to load tasks.
          <br><br>
          ${escapeHtml(taskError.message)}
        </div>
      `;

      return;
    }


    if (!tasks || tasks.length === 0) {

      list.innerHTML = `
        <div class="card">
          <p>📭 No active tasks available right now.</p>
        </div>
      `;

      return;
    }


    // =========================
    // LOAD OWN SUBMISSIONS
    // =========================

    const {
      data: submissions,
      error: submissionError
    } = await supabaseClient
      .from("submissions")
      .select("task_id, status")
      .eq("worker_id", user.id);


    if (submissionError) {

      console.error(submissionError);

    }


    const submittedTaskIds =
      new Set(
        (submissions || [])
          .filter(item => item.status !== "rejected")
          .map(item => Number(item.task_id))
      );


    // =========================
    // LOAD COMPLETIONS
    // =========================

    const {
      data: completions,
      error: completionError
    } = await supabaseClient
      .from("task_completions")
      .select("task_id")
      .eq("worker_id", user.id);


    if (completionError) {

      console.error(completionError);

    }


    const completedTaskIds =
      new Set(
        (completions || [])
          .map(item => Number(item.task_id))
      );


    // =========================
    // FILTER TASKS
    // =========================

    const availableTasks =
      tasks.filter(task => {

        const id =
          Number(task.id);

        return (
          Number(task.completed || 0) < Number(task.target || 0) &&
          (!task.deadline || new Date(task.deadline) > new Date()) &&
          !submittedTaskIds.has(id) &&
          !completedTaskIds.has(id)
        );

      });


    if (availableTasks.length === 0) {

      list.innerHTML = `
        <div class="card">

          <p>
            🎉 No new tasks available for you.
          </p>

          <p>
            Check back later for new tasks.
          </p>

        </div>
      `;

      return;
    }


    // =========================
    // DISPLAY TASKS
    // =========================

    list.innerHTML =
      availableTasks.map(task => {

        const target =
          Number(task.target || 0);

        const completed =
          Number(task.completed || 0);

        const reward =
          Number(task.reward || 0);

        const remaining =
          Math.max(
            target - completed,
            0
          );


        return `
          <div
            class="card"
            style="margin:15px 0;"
          >

            <h3>
              🎯 ${escapeHtml(task.title || `Task #${task.id}`)}
            </h3>


            <p>
              ${escapeHtml(task.category || "General")}
            </p>

            <p>
              Reward:
              <strong>
                ${reward}
              </strong>
              Coins
            </p>


            <p>
              Progress:
              <strong>
                ${completed} / ${target}
              </strong>
            </p>


            <p>
              Remaining:
              <strong>
                ${remaining}
              </strong>
            </p>


            <a
              href="task.html?id=${encodeURIComponent(task.id)}"
              class="btn"
            >
              🎁 Start & Earn
            </a>

          </div>
        `;

      }).join("");


    // =========================
    // LOGOUT
    // =========================

    const logoutBtn =
      document.getElementById("logoutBtn");


    if (logoutBtn) {

      logoutBtn.addEventListener(
        "click",
        async function (e) {

          e.preventDefault();

          await supabaseClient.auth.signOut();

          window.location.href =
            "login.html";

        }
      );

    }

  }


  function escapeHtml(value) {

    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  }

})();
