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


    const {
      data: { user }
    } = await supabaseClient.auth.getUser();


    if (!user) {
      window.showGuestPreview?.();
      return;
    }


    const form =
      document.getElementById("taskForm");

    const urlInput =
      document.getElementById("taskUrl");

    const titleInput = document.getElementById("taskTitle");
    const instructionsInput = document.getElementById("taskInstructions");
    const categoryInput = document.getElementById("category");
    const deadlineInput = document.getElementById("deadline");

    const targetInput =
      document.getElementById("target");

    const rewardInput =
      document.getElementById("reward");

    const costDisplay =
      document.getElementById("estimatedCost");

    const balanceDisplay =
      document.getElementById("balance");

    const message =
      document.getElementById("message");


    // =========================
    // LOAD BALANCE
    // =========================

    async function loadBalance() {

      const {
        data,
        error
      } = await supabaseClient
        .from("profiles")
        .select("coins")
        .eq("id", user.id)
        .single();


      if (error) {

        console.error(error);

        balanceDisplay.textContent =
          "Unable to load";

        return;
      }


      balanceDisplay.textContent =
        Number(data.coins || 0);

    }


    await loadBalance();


    // =========================
    // CALCULATE COST
    // =========================

    function updateCost() {

      const target =
        Number(targetInput.value || 0);

      const reward =
        Number(rewardInput.value || 0);

      const cost =
        target * reward;


      costDisplay.textContent =
        cost.toLocaleString();

    }


    targetInput.addEventListener(
      "input",
      updateCost
    );

    rewardInput.addEventListener(
      "input",
      updateCost
    );


    // =========================
    // CREATE TASK
    // =========================

    form.addEventListener(
      "submit",
      async function (e) {

        e.preventDefault();


        const taskUrl =
          urlInput.value.trim();

        const title = titleInput.value.trim();
        const instructions = instructionsInput.value.trim();
        const category = categoryInput.value;
        const deadline = deadlineInput.value || null;

        const target =
          Number(targetInput.value);

        const reward =
          Number(rewardInput.value);


        if (!taskUrl) {

          message.innerHTML =
            "❌ Please enter a task URL.";

          return;
        }

        if (!title || !instructions) {
          message.innerHTML = "❌ Please provide a title and clear instructions.";
          return;
        }


        if (!target || target < 1) {

          message.innerHTML =
            "❌ Target must be at least 1.";

          return;
        }


        if (!reward || reward < 1) {

          message.innerHTML =
            "❌ Reward must be at least 1 coin.";

          return;
        }


        const cost =
          target * reward;


        const confirmed =
          confirm(
            `Create this task?\n\n` +
            `Target: ${target}\n` +
            `Reward: ${reward} Coins\n` +
            `Total Cost: ${cost} Coins`
          );
        if (!confirmed) return;


        message.innerHTML =
          "⏳ Creating task...";


        const {
          data,
          error
        } = await supabaseClient.rpc(
          "create_task",
          {
            p_task_url: taskUrl,
            p_target: target,
            p_reward: reward,
            p_title: title,
            p_instructions: instructions,
            p_category: category,
            p_deadline: deadline ? new Date(deadline).toISOString() : null
          }
        );


        if (error) {

          console.error(error);

          message.innerHTML =
            "❌ " +
            escapeHtml(error.message);

          return;
        }


        message.innerHTML =
          `
          <div style="
            padding:15px;
            background:#dcfce7;
            border-radius:10px;
            color:#166534;
          ">
            ✅ Task created successfully!<br>
            Task ID: <strong>${data}</strong>
          </div>
          `;


        form.reset();

        updateCost();

        await loadBalance();

      });

    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {
      logoutBtn.addEventListener("click", async function (e) {
        e.preventDefault();
        await supabaseClient.auth.signOut();
        window.location.href = "login.html";
      });
    }

    function escapeHtml(value) {

      return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

    }

  }

})();
