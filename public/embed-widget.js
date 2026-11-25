/**
 * OmniAI Studio - Floating Website Widget
 * Paste this ONE line before </body> on ANY website:
 * <script src="https://YOUR-APP.vercel.app/embed-widget.js" data-url="https://YOUR-APP.vercel.app"></script>
 */
(function () {
  const script = document.currentScript;
  const appUrl = (script && script.getAttribute("data-url")) || window.location.origin;
  const accent = (script && script.getAttribute("data-color")) || "#6366f1";

  const btn = document.createElement("button");
  btn.setAttribute("aria-label", "Open AI Assistant");
  btn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>`;
  Object.assign(btn.style, {
    position: "fixed",
    bottom: "22px",
    right: "22px",
    width: "58px",
    height: "58px",
    borderRadius: "50%",
    border: "none",
    background: `linear-gradient(135deg, ${accent}, #a855f7)`,
    color: "#ffffff",
    cursor: "pointer",
    boxShadow: "0 10px 30px rgba(99, 102, 241, 0.45)",
    zIndex: "999999",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "transform 0.2s ease"
  });

  const frameWrap = document.createElement("div");
  Object.assign(frameWrap.style, {
    position: "fixed",
    bottom: "92px",
    right: "22px",
    width: "min(420px, calc(100vw - 32px))",
    height: "min(640px, calc(100vh - 120px))",
    borderRadius: "18px",
    overflow: "hidden",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.45)",
    border: "1px solid rgba(255,255,255,0.14)",
    zIndex: "999998",
    display: "none",
    background: "#0b0f19"
  });

  const iframe = document.createElement("iframe");
  iframe.src = `${appUrl.replace(/\/+$/, "")}/?embed=true`;
  Object.assign(iframe.style, { width: "100%", height: "100%", border: "none" });
  frameWrap.appendChild(iframe);

  let open = false;
  btn.addEventListener("click", () => {
    open = !open;
    frameWrap.style.display = open ? "block" : "none";
    btn.style.transform = open ? "rotate(45deg) scale(0.95)" : "scale(1)";
  });

  document.body.appendChild(frameWrap);
  document.body.appendChild(btn);
})();
