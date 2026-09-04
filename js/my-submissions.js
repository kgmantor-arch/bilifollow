(function () {

  const script = document.createElement("script");

  script.src =
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

  script.onload = init;

  document.head.appendChild(script);

  async function init() {

    const { createClient } = window.supabase;

    const supabaseClient =
      createClient(
        SUPABASE_URL,
        SUPABASE_KEY
      );

    const list =
      document.getElementById("submissionsList");

    const {
      data: { user }
    } = await supabaseClient.auth.getUser();

    if (!user) {
      window.showGuestPreview?.();
      return;
    }

    const { data, error } =
      await supabaseClient
        .from("submissions")
        .select(`
          id,
          task_id,
          screenshot_url,
          proof_path,
          status,
          admin_note,
          created_at,
          reviewed_at
        `)
        .eq("worker_id", user.id)
        .order("created_at", {
          ascending: false
        });

    if (error) {

      list.innerHTML =
        "❌ Failed to load submissions.";

      console.error(error);

      return;
    }

    if (!data || data.length === 0) {

      list.innerHTML = `
        <div class="card">
          <p>No submissions yet.</p>

          <a href="earn.html">
            Browse Tasks →
          </a>
        </div>
      `;

      return;
    }

    const proofLinks = await Promise.all(data.map(async item => {
      if (item.proof_path) {
        const { data: signed } = await supabaseClient.storage.from("proofs").createSignedUrl(item.proof_path, 300);
        return signed?.signedUrl || null;
      }
      return item.screenshot_url || null;
    }));

    list.innerHTML = data.map((item, index) => {

      const status =
        item.status || "pending";

      return `
        <div class="card" style="margin:15px 0;">

          <h3>
            Task #${item.task_id}
          </h3>

          <p>
            Status:
            <strong>
              ${escapeHtml(status)}
            </strong>
          </p>

          <p>
            Submitted:
            ${formatDate(item.created_at)}
          </p>

          ${
            item.reviewed_at
              ? `<p>
                  Reviewed:
                  ${formatDate(item.reviewed_at)}
                </p>`
              : ""
          }

          ${
            item.admin_note
              ? `<p>
                  Admin Note:
                  ${escapeHtml(item.admin_note)}
                </p>`
              : ""
          }

          ${
            proofLinks[index]
              ? `<p>
                  <a
                    href="${escapeHtml(proofLinks[index])}"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    🔗 View Proof
                  </a>
                </p>`
              : ""
          }

        </div>
      `;

    }).join("");

    document
      .getElementById("logoutBtn")
      .addEventListener("click", async function (e) {

        e.preventDefault();

        await supabaseClient.auth.signOut();

        window.location.href =
          "login.html";

      });

  }

  function formatDate(date) {

    if (!date) return "";

    return new Date(date)
      .toLocaleString();

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
