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


    // =========================
    // GET TASK ID
    // =========================

    const params =
      new URLSearchParams(window.location.search);

    const taskId =
      params.get("task_id");


    const list =
      document.getElementById("submissionsList");

    const message =
      document.getElementById("message");


    if (!taskId) {

      list.innerHTML = `
        <div class="empty">
          ❌ Task ID missing.
          <br><br>
          <a href="my-tasks.html">
            ← Back to My Tasks
          </a>
        </div>
      `;

      return;
    }


    // =========================
    // CHECK TASK OWNERSHIP
    // =========================

    const {
      data: task,
      error: taskError
    } = await supabaseClient
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .eq("creator_id", user.id)
      .single();


    if (taskError || !task) {

      console.error(taskError);

      list.innerHTML = `
        <div class="empty">
          ❌ You cannot access this task.
        </div>
      `;

      return;
    }


    // =========================
    // LOAD SUBMISSIONS
    // =========================

    async function loadSubmissions() {

      list.innerHTML =
        "Loading submissions...";


      const {
        data,
        error
      } = await supabaseClient
        .from("submissions")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", {
          ascending: false
        });


      if (error) {

        console.error(error);

        list.innerHTML = `
          <div class="empty">
            ❌ Failed to load submissions.
            <br><br>
            ${escapeHtml(error.message)}
          </div>
        `;

        return;
      }


      if (!data || data.length === 0) {

        list.innerHTML = `
          <div class="empty">
            📭 No submissions for this task yet.
          </div>
        `;

        return;
      }


      const proofLinks = await Promise.all(data.map(async submission => {
        if (submission.proof_path) {
          const { data: signed } = await supabaseClient.storage.from("proofs").createSignedUrl(submission.proof_path, 300);
          return signed?.signedUrl || null;
        }
        return submission.screenshot_url || null;
      }));

      list.innerHTML = "";


      data.forEach(function (submission, index) {

        const card =
          document.createElement("div");

        card.className =
          "submission-card";


        let buttons = "";


        if (submission.status === "pending") {

          buttons = `

            <div style="margin-top:15px;">

              <button
                class="btn approve-btn"
                onclick="approveSubmission(${submission.id})"
              >
                ✅ Approve
              </button>


              <button
                class="btn reject-btn"
                onclick="rejectSubmission(${submission.id})"
              >
                ❌ Reject
              </button>

            </div>

          `;
        }


        card.innerHTML = `

          <h3>
            📩 Submission #${submission.id}
          </h3>


          <p>
            <strong>Worker ID:</strong><br>
            ${escapeHtml(submission.worker_id)}
          </p>


          <p>
            <strong>Status:</strong>
            ${escapeHtml(submission.status)}
          </p>


          <p>
            <strong>Submitted:</strong>
            ${new Date(
              submission.created_at
            ).toLocaleString()}
          </p>


          <p>
            <strong>Proof:</strong>
          </p>


          <a
            class="proof-link"
            href="${escapeHtml(
              proofLinks[index] || "#"
            )}"
            target="_blank"
            rel="noopener noreferrer"
          >
            🔗 View Proof
          </a>


          ${
            submission.admin_note
              ? `
                <p>
                  <strong>Note:</strong><br>
                  ${escapeHtml(
                    submission.admin_note
                  )}
                </p>
              `
              : ""
          }


          ${
            submission.status === "pending"
              ? `
                <textarea
                  id="note-${submission.id}"
                  class="note-input"
                  placeholder="Reason if rejecting (optional)"
                ></textarea>
              `
              : ""
          }


          ${buttons}

        `;


        list.appendChild(card);

      });

    }


    // =========================
    // APPROVE
    // =========================

    window.approveSubmission =
      async function (submissionId) {

        const confirmed =
          confirm(
            "Approve this submission? The worker will receive the reward."
          );


        if (!confirmed) return;


        message.innerHTML =
          "⏳ Approving...";


        const {
          error
        } = await supabaseClient.rpc(
          "approve_submission",
          {
            p_submission_id:
              submissionId
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
          "✅ Submission approved!";


        await loadSubmissions();

      };


    // =========================
    // REJECT
    // =========================

    window.rejectSubmission =
      async function (submissionId) {

        const noteElement =
          document.getElementById(
            "note-" + submissionId
          );


        const note =
          noteElement
            ? noteElement.value.trim()
            : "";


        const confirmed =
          confirm(
            "Reject this submission?"
          );


        if (!confirmed) return;


        message.innerHTML =
          "⏳ Rejecting...";


        const {
          error
        } = await supabaseClient.rpc(
          "reject_submission",
          {
            p_submission_id:
              submissionId,

            p_admin_note:
              note || null
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
          "✅ Submission rejected.";


        await loadSubmissions();

      };


    // =========================
    // HTML ESCAPE
    // =========================

    function escapeHtml(value) {

      if (
        value === null ||
        value === undefined
      ) {
        return "";
      }


      return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

    }


    // Initial load
    await loadSubmissions();

  }

})();
