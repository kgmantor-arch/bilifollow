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


    // Check login
    const {
      data: { user }
    } = await supabaseClient.auth.getUser();


    if (!user) {
      window.showGuestPreview?.();
      return;
    }


    const list =
      document.getElementById("taskList");


    // Load user's tasks
    const {
      data,
      error
    } = await supabaseClient
      .from("tasks")
      .select("*")
      .eq("creator_id", user.id)
      .order("created_at", {
        ascending: false
      });


    if (error) {

      list.innerHTML =
        "❌ Failed to load tasks.";

      console.error(error);

      return;
    }


    // No tasks
    if (!data || data.length === 0) {

      list.innerHTML = `
        <div class="card">

          <p>
            You have not created any tasks yet.
          </p>

          <a href="promote.html">
            Create Your First Task →
          </a>

        </div>
      `;

      return;
    }


    // Display tasks
    list.innerHTML =
      data.map(task => {

        const target =
          Number(task.target || 0);

        const completed =
          Number(task.completed || 0);

        const reward =
          Number(task.reward || 0);

        const status =
          escapeHtml(task.status || "");


        return `
          <div
            class="card"
            style="margin:15px 0;"
          >

            <h3>
              📢 ${escapeHtml(task.title || `Task #${task.id}`)}
            </h3>


            <p>
              🔗
              <a
                href="${escapeHtml(task.task_url || task.bilibili_url || "#")}"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open Reference
              </a>
            </p>


            <p>
              Category: <strong>${escapeHtml(task.category || "General")}</strong>
            </p>

            <p>
              Progress:
              <strong>
                ${completed} / ${target}
              </strong>
            </p>


            <p>
              Reward:
              <strong>
                ${reward}
              </strong>
              Coins
            </p>


            <p>
              Status:
              <strong>
                ${status}
              </strong>
            </p>


            <!-- Review Button -->
            <p style="margin-top:20px;">

              <a
                href="review-submissions.html?task_id=${task.id}"
                style="
                  display:inline-block;
                  padding:10px 16px;
                  background:#2563eb;
                  color:white;
                  text-decoration:none;
                  border-radius:8px;
                  font-weight:600;
                "
              >
                📋 Review Submissions
              </a>

              ${task.status === "active" ? `
                <a href="edit-task.html?task_id=${task.id}" class="btn" style="display:inline-block;margin-left:8px;text-decoration:none;">
                  ✏️ Edit Task
                </a>
                <button type="button" class="btn cancel-task-btn" data-task-id="${task.id}" data-task-title="${escapeHtml(task.title || `Task #${task.id}`)}" style="margin-left:8px;background:#6b7280;">
                  🗑️ Delete / Cancel
                </button>
              ` : ""}

            </p>


          </div>
        `;

      }).join("");

    list.querySelectorAll(".cancel-task-btn").forEach((button) => {
      button.addEventListener("click", async () => {
        const taskId = Number(button.dataset.taskId);
        const title = button.dataset.taskTitle || "this task";
        if (!confirm(`Cancel "${title}"?\n\nThe task will stop immediately. Unused coins will be refunded. This cannot be undone.`)) return;
        button.disabled = true;
        button.textContent = "⏳ Cancelling...";
        const { data: refund, error: cancelError } = await supabaseClient.rpc("cancel_own_task", { p_task_id: taskId });
        if (cancelError) {
          alert(`Could not cancel task: ${cancelError.message}`);
          button.disabled = false;
          button.textContent = "🗑️ Delete / Cancel";
          return;
        }
        alert(`Task cancelled. ${Number(refund || 0).toLocaleString()} Coins were refunded.`);
        window.location.reload();
      });
    });


    // Logout
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


  // HTML escape
  function escapeHtml(value) {

    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  }

})();
