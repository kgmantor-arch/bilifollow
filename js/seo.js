(() => {
  const publicPages = {
    "index.html": { title: "BiliFollow | Community Tasks & Rewards", description: "Discover BiliFollow, a community platform for legitimate tasks, submissions, and internal rewards." },
    "about.html": { title: "About BiliFollow", description: "Learn about BiliFollow's community task and reward platform." },
    "contact.html": { title: "Contact BiliFollow", description: "Contact the BiliFollow team for account and platform support." },
    "terms.html": { title: "BiliFollow Terms of Use", description: "Read the BiliFollow Terms of Use." },
    "privacy.html": { title: "BiliFollow Privacy Notice", description: "Read the BiliFollow Privacy Notice." },
    "disclaimer.html": { title: "BiliFollow Disclaimer", description: "Read the BiliFollow platform disclaimer." }
  };
  const route = location.pathname.split("/").pop() || "index.html";
  const isPublic = Object.hasOwn(publicPages, route);
  const canonicalPath = route === "index.html" ? "/" : `/${route}`;
  const canonicalUrl = `${location.origin}${canonicalPath}`;
  const addMeta = (name, value, property = false) => { const el = document.createElement("meta"); el.setAttribute(property ? "property" : "name", name); el.content = value; document.head.appendChild(el); };
  const canonical = document.createElement("link"); canonical.rel = "canonical"; canonical.href = canonicalUrl; document.head.appendChild(canonical);
  if (!isPublic) { addMeta("robots", "noindex, nofollow"); return; }
  const page = publicPages[route];
  document.title = page.title;
  addMeta("description", page.description); addMeta("robots", "index, follow");
  addMeta("og:type", "website", true); addMeta("og:site_name", "BiliFollow", true); addMeta("og:title", page.title, true); addMeta("og:description", page.description, true); addMeta("og:url", canonicalUrl, true);
  if (route === "index.html") { const jsonLd = document.createElement("script"); jsonLd.type = "application/ld+json"; jsonLd.textContent = JSON.stringify({ "@context": "https://schema.org", "@type": "WebSite", name: "BiliFollow", url: canonicalUrl }); document.head.appendChild(jsonLd); }
})();
