(() => {
  const popupKey = "bilifollow-popup-ad-seen";
  async function settings() {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/app_settings?select=key,value&key=in.(ads,site_notice,footer_notice,footer)`, { headers: { apikey: SUPABASE_KEY } });
      if (!response.ok) throw new Error("Settings unavailable");
      return Object.fromEntries((await response.json()).map(item => [item.key, item.value]));
    } catch (error) { console.warn("Using local ad settings", error); return { ads: AD_CONFIG, site_notice: null }; }
  }
  function safeHttpsUrl(value) { return typeof value === "string" && /^https:\/\//i.test(value) ? value : ""; }
  function createBanner(config) {
    if (!config.enabled) return;
    const host = document.createElement("aside"); host.className = "ad-banner"; host.setAttribute("aria-label", "Advertisement");
    host.innerHTML = '<small>Advertisement</small><div class="ad-banner-slot"></div>'; document.body.appendChild(host);
    const slot = host.querySelector(".ad-banner-slot");
    const provider = config.provider || "adsense";
    if (provider === "demo") {
      slot.innerHTML = '<div class="bf-test-ad"><b>Test Advertisement</b><span></span></div>';
      slot.querySelector("span").textContent = config.directMessage || "Replace this test ad from Control Center.";
      return;
    }
    if (provider === "direct") {
      const title = document.createElement("strong"); title.textContent = config.directTitle || "Sponsored";
      const message = document.createElement("span"); message.textContent = config.directMessage || "Sponsored message";
      const wrap = document.createElement(safeHttpsUrl(config.directUrl) ? "a" : "div"); wrap.className = "bf-direct-ad";
      if (wrap.tagName === "A") { wrap.href = config.directUrl; wrap.target = "_blank"; wrap.rel = "noopener sponsored"; }
      wrap.append(title, message); slot.appendChild(wrap); return;
    }
    if (provider === "adsense") {
      if (!config.adsenseClient || !config.adsenseBannerSlot) { slot.textContent = "AdSense banner settings are incomplete."; return; }
    const script = document.createElement("script"); script.async = true;
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(config.adsenseClient)}`; script.crossOrigin = "anonymous"; document.head.appendChild(script);
    const ad = document.createElement("ins"); ad.className = "adsbygoogle"; ad.style.display = "block";
    ad.dataset.adClient = config.adsenseClient; ad.dataset.adSlot = config.adsenseBannerSlot; ad.dataset.adFormat = "auto"; ad.dataset.fullWidthResponsive = "true"; slot.appendChild(ad);
    script.onload = () => { try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (error) { console.warn("Banner ad could not load", error); } };
      return;
    }
    const source = safeHttpsUrl(config.networkScriptUrl);
    if (!source) { slot.textContent = "Advertisement script URL is incomplete."; return; }
    if (provider === "adsterra" && config.adsterraKey) window.atOptions = { key: config.adsterraKey, format: "iframe", height: Number(config.adsterraHeight || 90), width: Number(config.adsterraWidth || 728), params: {} };
    const script = document.createElement("script"); script.async = true; script.src = source; script.referrerPolicy = "strict-origin-when-cross-origin"; slot.appendChild(script);
  }
  function createOneTimeModal(config) {
    const message = config.popupMessage || config.popupHtml || "";
    if (!config.popupEnabled || !message || localStorage.getItem(popupKey)) return;
    localStorage.setItem(popupKey, "1");
    const modal = document.createElement("div"); modal.className = "ad-modal";
    modal.innerHTML = '<div class="ad-modal-panel" role="dialog" aria-modal="true" aria-label="Sponsored message"><button type="button" class="ad-close" aria-label="Close advertisement">×</button><small>Sponsored</small><h2 class="ad-popup-title"></h2><p class="ad-popup-slot"></p><a class="ad-popup-link" target="_blank" rel="noopener sponsored"></a></div>';
    modal.querySelector(".ad-popup-title").textContent = config.popupTitle || "Sponsored message";
    modal.querySelector(".ad-popup-slot").textContent = message;
    const link = modal.querySelector(".ad-popup-link");
    if (typeof config.popupUrl === "string" && /^https:\/\//i.test(config.popupUrl)) {
      link.href = config.popupUrl;
      link.textContent = config.popupButton || "Visit sponsor";
    } else link.remove();
    modal.querySelector(".ad-close").addEventListener("click", () => modal.remove());
    document.body.appendChild(modal);
  }
  function createNotice(notice) {
    if (!notice?.enabled || !notice.title || !notice.message) return;
    const element = document.createElement("section"); element.className = "site-notice";
    element.innerHTML = `<div class="site-notice-track"><strong>${escapeHtml(notice.title)}</strong><span>${escapeHtml(notice.message)}</span></div><button type="button" aria-label="Close notice">×</button>`;
    element.querySelector("button").addEventListener("click", () => element.remove());
    if (notice.position === "footer") { const footer = document.querySelector("footer"); if (footer) footer.before(element); else document.body.appendChild(element); } else document.body.prepend(element);
  }
  function updateFooter(footer) { if (!footer) return; const copyright = document.querySelector("[data-footer-copyright]"); const disclaimer = document.querySelector("[data-footer-disclaimer]"); if (copyright && footer.copyright) copyright.textContent = footer.copyright; if (disclaimer && footer.disclaimer) disclaimer.textContent = footer.disclaimer; }
  function escapeHtml(value) { return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
  async function initAds() {
    const config = await settings();
    const savedAds = config.ads || {};
    const ads = { ...AD_CONFIG, ...savedAds };
    // Old projects stored only an empty, disabled AdSense setting. Show the
    // requested test placement until an administrator saves a real provider.
    if (!savedAds.provider && !savedAds.adsenseClient && !savedAds.adsenseBannerSlot && !savedAds.networkScriptUrl && !savedAds.directUrl) { ads.enabled = true; ads.provider = "demo"; }
    createNotice(config.site_notice); createNotice({ ...(config.footer_notice || {}), position: "footer" }); updateFooter(config.footer); createBanner(ads); createOneTimeModal(ads);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initAds, { once: true }); else initAds();
})();
