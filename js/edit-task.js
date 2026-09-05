(function () {
  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  script.onload = init;
  document.head.appendChild(script);

  async function init() {
    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data: { user } } = await client.auth.getUser();
    if (!user) { window.showGuestPreview?.(); return; }
    const taskId = Number(new URLSearchParams(location.search).get("task_id"));
    const message = document.getElementById("message");
    const form = document.getElementById("editTaskForm");
    if (!Number.isSafeInteger(taskId) || taskId < 1) { message.textContent = "❌ Invalid task."; form.hidden = true; return; }
    const { data: task, error } = await client.from("tasks").select("*").eq("id", taskId).eq("creator_id", user.id).single();
    if (error || !task || task.status !== "active") { message.textContent = "❌ This task cannot be edited."; form.hidden = true; return; }
    document.getElementById("taskTitle").value = task.title || "";
    document.getElementById("taskInstructions").value = task.instructions || "";
    document.getElementById("category").value = task.category === "Bilibili Follow" ? "Bilibili Follow" : "Community";
    document.getElementById("taskUrl").value = task.task_url || task.bilibili_url || "";
    if (task.deadline) document.getElementById("deadline").value = new Date(task.deadline).toISOString().slice(0, 16);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const confirmed = confirm("Save these task changes?");
      if (!confirmed) return;
      message.textContent = "⏳ Saving changes...";
      const deadline = document.getElementById("deadline").value;
      const { error: updateError } = await client.rpc("update_own_task", {
        p_task_id: taskId,
        p_title: document.getElementById("taskTitle").value.trim(),
        p_instructions: document.getElementById("taskInstructions").value.trim(),
        p_category: document.getElementById("category").value,
        p_task_url: document.getElementById("taskUrl").value.trim(),
        p_deadline: deadline ? new Date(deadline).toISOString() : null
      });
      if (updateError) { message.textContent = `❌ ${updateError.message}`; return; }
      message.textContent = "✅ Task updated successfully.";
      setTimeout(() => { location.href = "my-tasks.html"; }, 700);
    });
  }
})();
