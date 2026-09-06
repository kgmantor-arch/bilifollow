(() => {
  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  script.onload = init;
  document.head.appendChild(script);

  async function init() {
    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data: { user } } = await client.auth.getUser();
    if (!user) { window.showGuestPreview?.(); return; }
    const list = document.getElementById("submissionsList");
    const message = document.getElementById("message");
    const requestedTaskId = Number(new URLSearchParams(location.search).get("task_id")) || null;

    async function loadSubmissions() {
      list.textContent = "Loading submissions...";
      const { data, error } = await client.rpc("list_own_task_submissions");
      if (error) { list.innerHTML = `<div class="empty">❌ ${escapeHtml(error.message)}</div>`; return; }
      const rows = requestedTaskId ? data.filter(row => Number(row.task_id) === requestedTaskId) : data;
      if (!rows.length) { list.innerHTML = `<div class="empty">📭 No proof submissions to review yet.</div>`; return; }
      const links = await Promise.all(rows.map(async row => {
        if (row.proof_path) { const { data: signed } = await client.storage.from("proofs").createSignedUrl(row.proof_path, 300); return signed?.signedUrl || ""; }
        return row.screenshot_url || "";
      }));
      list.innerHTML = rows.map((row, index) => {
        const pending = row.status === "pending";
        const autoAt = new Date(new Date(row.created_at).getTime() + 20 * 60 * 1000).toLocaleString();
        return `<article class="submission-card"><h3>📋 ${escapeHtml(row.task_title)}</h3><p><strong>Submission #${row.id}</strong> · Status: <strong>${escapeHtml(row.status)}</strong></p><p><strong>Worker ID:</strong> ${escapeHtml(row.worker_id)}</p><p><strong>Submitted:</strong> ${new Date(row.created_at).toLocaleString()}</p>${pending ? `<p><strong>Auto approval:</strong> ${autoAt} if you do not review first.</p>` : ""}<a class="proof-link" href="${escapeHtml(links[index] || "#")}" target="_blank" rel="noopener noreferrer">🔗 View Proof</a>${row.admin_note ? `<p><strong>Note:</strong> ${escapeHtml(row.admin_note)}</p>` : ""}${pending ? `<textarea id="note-${row.id}" class="note-input" maxlength="1000" placeholder="Reason if rejecting (optional)"></textarea><div><button class="btn approve-btn" data-approve="${row.id}">✅ Approve</button><button class="btn reject-btn" data-reject="${row.id}">❌ Reject</button></div>` : ""}</article>`;
      }).join("");
      list.querySelectorAll("[data-approve]").forEach(button => button.addEventListener("click", () => review(Number(button.dataset.approve), true)));
      list.querySelectorAll("[data-reject]").forEach(button => button.addEventListener("click", () => review(Number(button.dataset.reject), false)));
    }

    async function review(submissionId, approve) {
      if (!confirm(approve ? "Approve this proof? The worker will receive Coins." : "Reject this proof?")) return;
      message.textContent = approve ? "⏳ Approving..." : "⏳ Rejecting...";
      const args = approve ? { p_submission_id: submissionId } : { p_submission_id: submissionId, p_admin_note: document.getElementById(`note-${submissionId}`)?.value.trim() || null };
      const { error } = await client.rpc(approve ? "approve_submission" : "reject_submission", args);
      if (error) { message.textContent = `❌ ${error.message}`; return; }
      message.textContent = approve ? "✅ Proof approved and Coins added." : "✅ Proof rejected.";
      await loadSubmissions();
    }

    function escapeHtml(value) { return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
    await loadSubmissions();
  }
})();
