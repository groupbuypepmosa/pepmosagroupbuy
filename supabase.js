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
    // checkout-polish.js is loaded once by index.html.
    // Do not inject it here: loading it twice creates competing checkout/cart handlers.

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