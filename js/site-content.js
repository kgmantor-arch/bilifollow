(function () {
  async function fetchPage(slug) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/site_pages?select=title,body&slug=eq.${encodeURIComponent(slug)}`, { headers: { apikey: SUPABASE_KEY } });
    if (!response.ok) throw new Error("Content unavailable");
    return (await response.json())[0];
  }
  async function init() {
    const slug = document.body.dataset.sitePage;
    if (!slug) return;
    try {
      const page = await fetchPage(slug);
      if (!page) return;
      document.getElementById("pageTitle").textContent = page.title;
      document.getElementById("pageBody").innerHTML = renderPageBody(page.body, page.title);
    } catch (error) { console.warn("Could not load managed page content", error); }
  }
  function escapeHtml(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }
  function inline(text) {
    return escapeHtml(text)
      .replace(/\[([^\]]+)]\((https?:\/\/[^\s)]+)\)/gi, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  }
  function renderPageBody(body, title) {
    let content = String(body || "").trim();
    const firstLine = content.split(/\r?\n/)[0].trim();
    if (firstLine.toLowerCase() === String(title || "").trim().toLowerCase()) content = content.slice(firstLine.length).trim();
    if (!content) return "";
    return content.split(/\r?\n\s*\r?\n/).map(block => {
      const lines = block.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
      if (lines.every(line => line.startsWith("- "))) return `<ul>${lines.map(line => `<li>${inline(line.slice(2))}</li>`).join("")}</ul>`;
      if (lines.length === 1 && lines[0].startsWith("## ")) return `<h2>${inline(lines[0].slice(3))}</h2>`;
      return `<p>${lines.map(inline).join("<br>")}</p>`;
    }).join("");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true }); else init();
})();
