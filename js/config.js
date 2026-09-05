const SUPABASE_URL = "https://omergskloogfrggehkio.supabase.co";
const SUPABASE_KEY = "sb_publishable_BVkBxkSBE0DQJn7fIhNhAg_meKolhZO";

// Paste your GA4 Measurement ID here after creating a Web stream in Analytics.
// Example: const GOOGLE_ANALYTICS_ID = "G-ABC123DEF4";
const GOOGLE_ANALYTICS_ID = "";

const AD_CONFIG = { enabled: true, provider: "demo", adsenseClient: "", adsenseBannerSlot: "", networkScriptUrl: "", adsterraKey: "", adsterraWidth: 728, adsterraHeight: 90, directTitle: "BiliFollow test advertisement", directMessage: "Your advertisement will appear here. Replace this test ad in Control Center.", directUrl: "", directButton: "Learn more", popupHtml: "" };
const SUPABASE_AUTH_OPTIONS = { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } };

function createSupabaseClient() { return window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, SUPABASE_AUTH_OPTIONS); }

window.showGuestPreview = function showGuestPreview() {
  const shell = document.querySelector(".app-shell");
  const main = shell?.querySelector("main") || document.querySelector("main");
  if (!main) { window.location.href = "index.html"; return; }
  if (shell) { shell.replaceWith(main); document.body.classList.remove("has-app-shell"); }
  if (main.querySelector(".guest-nav")) return;
  main.classList.add("guest-mode");
  main.insertAdjacentHTML("afterbegin", `<header class="guest-nav"><a class="guest-brand" href="index.html">Bili<span>Follow</span></a><nav><a href="index.html">Home</a><a href="earn.html">Tasks</a><a href="about.html">About</a><a href="contact.html">Contact</a><a href="privacy.html">Privacy</a><a href="terms.html">Terms</a></nav><div><a href="login.html">Login</a><a class="guest-nav-cta" href="register.html">Create account</a></div></header><div class="guest-note">You are viewing a read-only preview. Login to use account, task, reward, and admin controls.</div>`);
  main.querySelectorAll("form").forEach(form => form.addEventListener("submit", event => {
    event.preventDefault();
    const notice = document.createElement("p");
    notice.className = "guest-note";
    notice.textContent = "Please login or create an account to use this form.";
    form.after(notice);
  }));
};

if (!document.querySelector('link[href="css/premium.css"]')) { const theme = document.createElement("link"); theme.rel = "stylesheet"; theme.href = "css/premium.css"; document.head.appendChild(theme); }

if (/^G-[A-Z0-9]+$/i.test(GOOGLE_ANALYTICS_ID)) {
  const analytics = document.createElement("script"); analytics.async = true;
  analytics.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GOOGLE_ANALYTICS_ID)}`;
  document.head.appendChild(analytics);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(){ window.dataLayer.push(arguments); };
  window.gtag("js", new Date()); window.gtag("config", GOOGLE_ANALYTICS_ID);
}

if (!document.querySelector('script[src="js/seo.js"]')) { const seo = document.createElement("script"); seo.src = "js/seo.js"; document.head.appendChild(seo); }

document.addEventListener("DOMContentLoaded", () => {
  const route = window.location.pathname.split("/").pop() || "index";
  const currentPage = route.includes(".") ? route : `${route}.html`;
  const appPages = new Set(["dashboard.html", "earn.html", "task.html", "promote.html", "my-tasks.html", "my-submissions.html", "coin-history.html", "notifications.html", "profile.html", "review-submissions.html", "admin.html"]);
  if (appPages.has(currentPage)) { const shell = document.createElement("script"); shell.src = "js/app-shell.js"; shell.defer = true; document.head.appendChild(shell); }
  const ads = document.createElement("script");
  ads.src = "js/ads.js";
  ads.defer = true;
  document.head.appendChild(ads);

  // Official Tawk.to widget: loaded once globally for real-time two-way support.
  if (!window.Tawk_API && !document.querySelector('script[data-bilifollow-tawk]')) {
    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = new Date();
    const tawk = document.createElement("script");
    tawk.async = true;
    tawk.src = "https://embed.tawk.to/6a9ade7201ac02344ed3b885/1k1mf9sgb";
    tawk.charset = "UTF-8";
    tawk.crossOrigin = "*";
    tawk.dataset.bilifollowTawk = "true";
    document.head.appendChild(tawk);
  }
});
