(function () {
  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  script.onload = init;
  document.head.appendChild(script);

  async function init() {
    const { createClient } = window.supabase;
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      window.showGuestPreview?.();
      return;
    }

    const taskId = new URLSearchParams(window.location.search).get("id");
    const taskTitle = document.getElementById("taskTitle");
    const taskDescription = document.getElementById("taskDescription");
    const taskMeta = document.getElementById("taskMeta");
    const taskReward = document.getElementById("taskReward");
    const taskLink = document.getElementById("taskLink");
    const submitForm = document.getElementById("submissionForm");
    const existingSubmission = document.getElementById("existingSubmission");
    const message = document.getElementById("message");
    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {
      logoutBtn.addEventListener("click", async function (e) {
        e.preventDefault();
        await supabaseClient.auth.signOut();
        window.location.href = "login.html";
      });
    }

    function showState(title, description) {
      taskTitle.textContent = title;
      taskDescription.textContent = description;
      taskMeta.textContent = "";
      taskLink.hidden = true;
      submitForm.style.display = "none";
    }

    if (!taskId) {
      showState("Task unavailable", "❌ Task ID missing.");
      return;
    }

    const { data: task, error: taskError } = await supabaseClient
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      console.error(taskError);
      showState("Task unavailable", "❌ Task not found.");
      return;
    }

    if (task.creator_id === user.id) {
      showState("Your task", "⚠️ You cannot complete your own task.");
      return;
    }

    if (task.status !== "active") {
      showState("Task unavailable", "❌ This task is no longer active.");
      return;
    }

    const { data: existingCompletion } = await supabaseClient
      .from("task_completions")
      .select("id")
      .eq("task_id", taskId)
      .eq("worker_id", user.id)
      .maybeSingle();

    if (existingCompletion) {
      showState("✅ Task completed", "You have already completed this task.");
      taskReward.textContent = Number(task.reward || 0);
      return;
    }

    const { data: previousSubmission } = await supabaseClient
      .from("submissions")
      .select("id, status")
      .eq("task_id", taskId)
      .eq("worker_id", user.id)
      .maybeSingle();

    if (previousSubmission) {
      showState("📩 Submission already sent", "Please wait for the task creator to review it.");
      existingSubmission.textContent = `Status: ${previousSubmission.status}`;
      return;
    }

    taskTitle.textContent = `🎯 ${task.title || `Task #${task.id}`}`;
    taskDescription.textContent = task.instructions || "Open the reference link, complete the instructions, then submit a proof URL.";
    const meta = [task.category, task.deadline ? `Deadline: ${new Date(task.deadline).toLocaleString()}` : null].filter(Boolean);
    taskMeta.textContent = meta.join(" · ");
    taskReward.textContent = Number(task.reward || 0);

    const taskUrl = safeHttpUrl(task.task_url || task.bilibili_url);
    if (!taskUrl) {
      taskLink.hidden = true;
      submitForm.style.display = "none";
      message.textContent = "❌ This task has an invalid link.";
      return;
    }

    taskLink.href = taskUrl;
    taskLink.hidden = false;

    submitForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const proofFile = document.getElementById("proofFile").files[0];
      const allowedTypes = ["image/png", "image/jpeg", "image/webp", "application/pdf"];
      if (!proofFile || !allowedTypes.includes(proofFile.type) || proofFile.size > 8 * 1024 * 1024) {
        message.textContent = "❌ Upload a PNG, JPG, WEBP, or PDF file up to 8 MB.";
        return;
      }

      if (!confirm("Submit this proof for review?")) return;
      message.textContent = "⏳ Submitting proof...";

      const extension = proofFile.name.split(".").pop().toLowerCase().replace(/[^a-z0-9]/g, "");
      const proofPath = `${user.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabaseClient.storage.from("proofs").upload(proofPath, proofFile, {
        contentType: proofFile.type,
        upsert: false
      });
      if (uploadError) {
        message.textContent = `❌ ${uploadError.message}`;
        return;
      }

      const { error } = await supabaseClient.rpc("submit_proof", {
        p_task_id: Number(taskId),
        p_proof_path: proofPath
      });

      if (error) {
        console.error(error);
        await supabaseClient.storage.from("proofs").remove([proofPath]);
        message.textContent = `❌ ${error.message}`;
        return;
      }

      message.textContent = "✅ Proof submitted successfully! Your submission is waiting for review.";
      submitForm.style.display = "none";
    });

    document.getElementById("reportTaskBtn").addEventListener("click", async () => {
      const details = document.getElementById("reportDetails").value.trim();
      if (!details) { message.textContent = "❌ Describe the issue before reporting."; return; }
      const { error } = await supabaseClient.rpc("report_content", {
        p_task_id: Number(taskId), p_submission_id: null,
        p_category: document.getElementById("reportCategory").value, p_details: details
      });
      message.textContent = error ? `❌ ${error.message}` : "✅ Report sent to moderation.";
    });

  }

  function safeHttpUrl(value) {
    try {
      const url = new URL(value);
      return ["http:", "https:"].includes(url.protocol) ? url.href : null;
    } catch {
      return null;
    }
  }
})();
