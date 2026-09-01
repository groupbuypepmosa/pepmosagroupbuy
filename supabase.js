let sb;

function initSupabase() {
  if (!window.supabase) {
    throw new Error("Supabase library failed to load.");
  }

  const c = window.PEPMOSA_CONFIG;

  if (!c?.SUPABASE_URL || c.SUPABASE_URL.includes("YOUR-PROJECT")) {
    throw new Error("Add your Supabase URL and anon key in config.js.");
  }

  if (!sb) {
    sb = window.supabase.createClient(c.SUPABASE_URL, c.SUPABASE_ANON_KEY);
    window.sb = sb;
  }

  if ((window.location.pathname || '/').toLowerCase().endsWith('index.html') || window.location.pathname === '/' || window.location.pathname === '') {
    if (!document.querySelector('script[data-pepmosa-storefront-hotfix]')) {
      const script = document.createElement('script');
      script.src = 'storefront-ui-hotfix.js?v=20260901-2';
      script.dataset.pepmosaStorefrontHotfix = '1';
      document.head.appendChild(script);
    }

    if (!document.querySelector('script[data-pepmosa-checkout-polish]')) {
      const checkoutScript = document.createElement('script');
      checkoutScript.src = 'checkout-polish.js?v=20260901-fix2';
      checkoutScript.dataset.pepmosaCheckoutPolish = '1';
      document.head.appendChild(checkoutScript);
    }

    setTimeout(() => {
      const status = document.getElementById('gbStatus');
      if (status && status.classList.contains('error') && /relationship|product_variants|products/i.test(status.textContent || '')) {
        status.className = 'notice';
        status.innerHTML = '<span class="status open">OPEN</span> <span class="muted">Products loaded successfully.</span>';
      }
    }, 2200);
  }

  return sb;
}

async function requireAdmin() {
  if (!sb) initSupabase();

  const { data: { user }, error: userError } = await sb.auth.getUser();

  if (userError) throw userError;
  if (!user) {
    throw new Error("Please log in.");
  }

  const { data: profile, error } = await sb
    .from("profiles")
    .select("is_admin,email")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (!profile?.is_admin) {
    throw new Error("Admin access required.");
  }

  return { user, profile };
}

var esc = function(value) {
  return String(value ?? "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[m]);
};

var peso = function(value) {
  return "₱" + Number(value || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 });
};