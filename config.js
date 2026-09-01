window.PEPMOSA_CONFIG = {
  SUPABASE_URL: "https://pnetzdggtlbuhuxdzzak.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_f-FUnzjqozjjeB-KIIml-A_i9zFvQ2U"
};

(function () {
  function kickCategoryMinimums() {
    const el = document.getElementById("minimumGB");
    if (!el || !el.value || typeof window.loadCategoryMinimums !== "function") return false;
    try {
      const result = window.loadCategoryMinimums();
      if (result && typeof result.catch === "function") result.catch(console.error);
    } catch (e) { console.error(e); }
    return true;
  }
  function loadFix(file) {
    if (!file || document.querySelector('script[data-pepmosa-fix="'+file+'"]')) return;
    const s = document.createElement("script");
    s.src = file + "?v=20260901-5";
    s.dataset.pepmosaFix = file;
    document.body.appendChild(s);
  }
  document.addEventListener("DOMContentLoaded", function () {
    let attempts = 0;
    const timer = setInterval(function () {
      attempts++;
      const el = document.getElementById("minimumGB");
      if (el && el.options.length > 1 && el.value && typeof window.loadCategoryMinimums === "function") {
        kickCategoryMinimums();
        clearInterval(timer);
      }
      if (attempts >= 300) clearInterval(timer);
    }, 100);
    const path = (window.location.pathname || "").toLowerCase();
    const isAdmin = path.endsWith("/admin.html") || path.endsWith("admin.html");
    const isStorefront = path === "/" || path.endsWith("/index.html") || path.endsWith("index.html");
    if (isAdmin) {
      loadFix("admin-fix.js");
      setTimeout(() => loadFix("admin-hotfix.js"), 150);
    }
    if (isStorefront) {
      loadFix("storefront-fix.js");
      setTimeout(() => loadFix("email-verification-fix.js"), 500);
    }
  });
  document.addEventListener("DOMContentLoaded", function () {
    let attempts = 0;
    const timer = setInterval(function () {
      attempts++;
      if (typeof window.renderCategories === "function" && typeof window.deleteCategory !== "function") {
        const originalRenderCategories = window.renderCategories;
        window.deleteCategory = async function (categoryName) {
          if (!categoryName || !confirm(`DELETE CATEGORY "${categoryName}"?\n\nProducts using this category will NOT be deleted. Continue?`)) return;
          try {
            const S = window.sb || window.__sb;
            if (!S) throw new Error("Supabase is not initialized. Please refresh the page and try again.");
            const { data: usedProducts, error: productError } = await S.from("products").select("product_id").eq("category", categoryName).limit(1);
            if (productError) throw productError;
            if ((usedProducts || []).length) {
              if (typeof window.showMessage === "function") window.showMessage(`Cannot delete "${categoryName}" because products are still using it.`, "error");
              return;
            }
            const { error } = await S.from("categories").delete().eq("category_name", categoryName);
            if (error) throw error;
            if (typeof window.loadCategories === "function") await window.loadCategories();
            if (typeof window.showMessage === "function") window.showMessage(`Category "${categoryName}" deleted successfully.`, "success");
          } catch (e) {
            console.error(e);
            if (typeof window.showMessage === "function") window.showMessage(e.message || "Unable to delete category.", "error");
          }
        };
        window.renderCategories = function () {
          originalRenderCategories();
          const list = document.getElementById("categoryList");
          if (!list) return;
          list.querySelectorAll(".item").forEach(function (item) {
            const nameEl = item.querySelector(".itemHead b");
            const actions = item.querySelector(".actions");
            if (!nameEl || !actions || actions.querySelector(".deleteCategoryBtn")) return;
            const categoryName = nameEl.textContent.trim();
            const btn = document.createElement("button");
            btn.type = "button"; btn.className = "btn danger deleteCategoryBtn"; btn.textContent = "DELETE";
            btn.onclick = () => window.deleteCategory(categoryName);
            actions.appendChild(btn);
          });
        };
        try { window.renderCategories(); } catch (e) { console.error(e); }
        clearInterval(timer);
      }
      if (attempts >= 300) clearInterval(timer);
    }, 100);
  });
})();