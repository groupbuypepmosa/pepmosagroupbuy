let sb;

function initSupabase() {
  if (!window.supabase) {
    throw new Error("Supabase library failed to load.");
  }

  const c = window.PEPMOSA_CONFIG;

  if (
    !c?.SUPABASE_URL ||
    c.SUPABASE_URL.includes("YOUR-PROJECT")
  ) {
    throw new Error(
      "Add your Supabase URL and anon key in config.js."
    );
  }

  sb = window.supabase.createClient(
    c.SUPABASE_URL,
    c.SUPABASE_ANON_KEY
  );

  // The legacy admin page calls getSession immediately while its inline
  // bootstrap is still parsing. Give the stable admin repair layer a moment
  // to replace the old schema-dependent loaders before the session bootstrap.
  if ((window.location.pathname || '').toLowerCase().endsWith('admin.html')) {
    const originalGetSession = sb.auth.getSession.bind(sb.auth);
    sb.auth.getSession = async function () {
      await new Promise(resolve => setTimeout(resolve, 750));
      return originalGetSession();
    };
  }

  // Expose the client on window as well. Some admin helpers use
  // window.sb explicitly, while page scripts use the global `sb` binding.
  // Keeping both references in sync prevents false "Supabase is not
  // initialized" errors after the client has already been created.
  window.sb = sb;

  // Customer storefront polish/repair layer. It is loaded here because the
  // legacy index page already loads supabase.js and this guarantees the
  // product-card, minimum-quantity, popup and Site Notice fixes are present.
  if ((window.location.pathname || '/').toLowerCase().endsWith('index.html') || window.location.pathname === '/' || window.location.pathname === '') {
    if (!document.querySelector('script[data-pepmosa-storefront-hotfix]')) {
      const script = document.createElement('script');
      script.src = 'storefront-ui-hotfix.js?v=20260901-2';
      script.dataset.pepmosaStorefrontHotfix = '1';
      document.head.appendChild(script);
    }

    // Premium checkout + final-payment flow. Loaded after the legacy
    // storefront hotfix so its cleaner product renderer and checkout UI win.
    if (!document.querySelector('script[data-pepmosa-checkout-polish]')) {
      const checkoutScript = document.createElement('script');
      checkoutScript.src = 'checkout-polish.js?v=20260901-clean';
      checkoutScript.dataset.pepmosaCheckoutPolish = '1';
      document.head.appendChild(checkoutScript);
    }
  }

  return sb;
}

async function requireAdmin() {
  if (!sb) initSupabase();

  const {
    data: { user }
  } = await sb.auth.getUser();

  if (!user) {
    throw new Error("Please log in.");
  }

  const { data: profile, error } = await sb
    .from("profiles")
    .select("is_admin,email")
    .eq("id", user.id)
    .single();

  if (error || !profile?.is_admin) {
    throw new Error("Admin access required.");
  }

  return {
    user,
    profile
  };
}

/* Shared helpers use var so individual pages can safely define their own helpers. */
var esc = function(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (m) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      })[m]
  );
};

var peso = function(value) {
  return "₱" +
    Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2
    });
};
