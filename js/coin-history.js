(function () {

  const script = document.createElement("script");

  script.src =
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

  script.onload = init;

  document.head.appendChild(script);


  async function init() {

    const { createClient } =
      window.supabase;

    const supabaseClient =
      createClient(
        SUPABASE_URL,
        SUPABASE_KEY
      );


    const {
      data: { user }
    } =
      await supabaseClient.auth.getUser();


    if (!user) { window.showGuestPreview?.(); return; }


    // Load balance

    const { data: profile } =
      await supabaseClient
        .from("profiles")
        .select("coins")
        .eq("id", user.id)
        .single();


    document.getElementById("balance")
      .innerHTML = `
        <div class="card">
          🪙 Current Balance:
          <strong>
            ${profile?.coins || 0}
          </strong>
          Coins
        </div>
      `;


    // Load transactions

    const { data, error } =
      await supabaseClient
        .from("transactions")
        .select(`
          id,
          amount,
          type,
          reference_id,
          description,
          created_at
        `)
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false
        });


    const list =
      document.getElementById(
        "transactionList"
      );


    if (error) {

      list.innerHTML =
        "❌ Failed to load coin history.";

      console.error(error);

      return;

    }


    if (!data || data.length === 0) {

      list.innerHTML = `
        <div class="card">
          <p>
            No coin transactions yet.
          </p>
        </div>
      `;

    } else {

      list.innerHTML =
        data.map(tx => {

          const amount =
            Number(tx.amount || 0);

          const sign =
            amount >= 0 ? "+" : "";

          return `
            <div
              class="card"
              style="margin:15px 0;"
            >

              <h3>
                🪙
                ${sign}${amount}
                Coins
              </h3>

              <p>
                ${
                  escapeHtml(
                    tx.description ||
                    tx.type ||
                    "Transaction"
                  )
                }
              </p>

              <small>
                ${formatDate(
                  tx.created_at
                )}
              </small>

            </div>
          `;

        }).join("");

    }


    // Logout

    document
      .getElementById("logoutBtn")
      .addEventListener(
        "click",
        async function (e) {

          e.preventDefault();

          await supabaseClient
            .auth
            .signOut();

          window.location.href =
            "login.html";

        }
      );

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
