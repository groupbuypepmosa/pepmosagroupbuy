/* PEPMOSA CUSTOMER-FACING POLISH v20260918
   Visual/UX layer only. Does not modify Supabase, orders, admin pages, or pricing.
*/
(function(){
  "use strict";

  function ready(fn){
    if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, {once:true});
    else fn();
  }

  function esc(s){
    return String(s ?? "").replace(/[&<>"']/g, c => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[c]));
  }

  function addStyles(){
    if(document.getElementById("pep-customer-polish-20260918")) return;
    const s=document.createElement("style");
    s.id="pep-customer-polish-20260918";
    s.textContent=`
      :root{
        --pep-pink:#d92f86;
        --pep-deep:#4a2b3b;
        --pep-soft:#fff1f7;
        --pep-line:#efd7e4;
      }
      body{padding-bottom:0!important}
      .pepTopNotice{
        position:relative;display:flex;align-items:center;justify-content:center;
        min-height:42px;padding:8px 46px 8px 16px;box-sizing:border-box;
        background:linear-gradient(90deg,#fff5fa,#fff,#f8f1ff);
        border-bottom:1px solid rgba(213,43,135,.12);
        color:#6e5864;font-size:11px;font-weight:700;text-align:center;
      }
      .pepTopNotice b{color:var(--pep-pink);letter-spacing:.09em}
      .pepTopNotice button{
        position:absolute;right:12px;top:50%;transform:translateY(-50%);
        border:0;background:transparent;color:#a98494;font-size:20px;cursor:pointer;
      }
      .pepHeroActions2{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}
      .pepHeroActions2 a{
        min-height:48px;padding:0 19px;border-radius:15px;display:inline-flex;
        align-items:center;justify-content:center;gap:8px;text-decoration:none;
        font-size:11px;font-weight:950;letter-spacing:.07em;box-sizing:border-box;
        transition:transform .18s ease,box-shadow .18s ease;
      }
      .pepHeroActions2 a:first-child{
        color:#fff;background:linear-gradient(135deg,#e64b9a,#c32f88);
        box-shadow:0 12px 25px rgba(211,47,134,.22)
      }
      .pepHeroActions2 a:last-child{
        color:#674c59;background:#fff;border:1px solid var(--pep-line)
      }
      .pepHeroActions2 a:hover{transform:translateY(-2px)}
      .pepCustomerNav{
        position:sticky;top:0;z-index:80;display:flex;justify-content:center;gap:8px;
        padding:9px 14px;backdrop-filter:blur(16px);
        background:rgba(255,250,253,.88);border-bottom:1px solid rgba(224,190,208,.5);
      }
      .pepCustomerNav a{
        text-decoration:none;color:#705764;background:rgba(255,255,255,.8);
        border:1px solid #eedde6;border-radius:999px;padding:8px 13px;
        font-size:10px;font-weight:900;letter-spacing:.06em;white-space:nowrap;
      }
      .pepCustomerNav a:hover{color:var(--pep-pink);border-color:#e4aac7}
      .pepSectionIntro{
        display:flex;align-items:flex-end;justify-content:space-between;gap:16px;
        margin:8px 0 15px
      }
      .pepSectionIntro h2{margin:0!important}
      .pepProductCount{
        color:#927785;font-size:10px;font-weight:850;letter-spacing:.08em;white-space:nowrap
      }
      .pepTrustStrip{
        display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:22px 0 8px
      }
      .pepTrustItem{
        padding:15px 14px;border:1px solid rgba(222,190,207,.72);border-radius:18px;
        background:rgba(255,255,255,.74);text-align:center;box-shadow:0 8px 22px rgba(112,61,91,.045)
      }
      .pepTrustItem strong{display:block;color:#4d3540;font-size:12px}
      .pepTrustItem span{display:block;margin-top:4px;color:#907a84;font-size:10px;line-height:1.4}
      .pepMobileBar{
        display:none;position:fixed;left:10px;right:10px;bottom:10px;z-index:1000;
        padding:8px;border:1px solid rgba(221,180,203,.9);border-radius:20px;
        background:rgba(255,250,253,.94);backdrop-filter:blur(18px);
        box-shadow:0 18px 50px rgba(66,27,50,.18);grid-template-columns:repeat(4,1fr);gap:5px
      }
      .pepMobileBar a{
        min-height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;
        flex-direction:column;gap:2px;text-decoration:none;color:#6e5864;font-size:9px;font-weight:900
      }
      .pepMobileBar a span{font-size:18px;line-height:1}
      .pepMobileBar a:first-child{color:#fff;background:linear-gradient(135deg,#e64b9a,#c32f88)}
      .pepBackTop{
        position:fixed;right:18px;bottom:24px;z-index:900;width:43px;height:43px;
        border-radius:50%;border:1px solid #ead5e1;background:#fff;color:#c12e7e;
        box-shadow:0 10px 28px rgba(72,32,55,.14);display:none;place-items:center;
        cursor:pointer;font-size:18px
      }
      @media(max-width:760px){
        .pepCustomerNav{display:none}
        .pepHeroActions2{display:grid;grid-template-columns:1fr 1fr}
        .pepHeroActions2 a{width:100%;padding:0 10px}
        .pepTrustStrip{grid-template-columns:1fr;margin:16px 0 4px}
        .pepTrustItem{display:grid;grid-template-columns:38px 1fr;align-items:center;text-align:left;gap:10px;padding:12px}
        .pepTrustItem strong,.pepTrustItem span{margin:0}
        .pepMobileBar{display:grid}
        .pepBackTop{bottom:82px;right:15px}
        body{padding-bottom:78px!important}
      }
    `;
    document.head.appendChild(s);
  }

  function injectTopNotice(){
    if(document.querySelector(".pepTopNotice")) return;
    const header=document.querySelector("header");
    if(!header) return;
    const bar=document.createElement("div");
    bar.className="pepTopNotice";
    bar.innerHTML='<span>✦ <b>PEPMOSA GROUP BUY</b> &nbsp; Check the current GB before ordering.</span><button type="button" aria-label="Dismiss notice">×</button>';
    bar.querySelector("button").onclick=()=>bar.remove();
    header.parentNode.insertBefore(bar,header);
  }

  function injectCustomerNav(){
    if(document.querySelector(".pepCustomerNav")) return;
    const nav=document.createElement("nav");
    nav.className="pepCustomerNav";
    nav.setAttribute("aria-label","Customer navigation");
    nav.innerHTML=[
      ["#top","HOME"],
      ["#products","SHOP"],
      ["#track","TRACK ORDER"],
      ["#proof","PROOF"],
      ["#how-it-works","HOW IT WORKS"]
    ].map(x=>'<a href="'+x[0]+'">'+x[1]+"</a>").join("");
    const header=document.querySelector("header");
    if(header) header.insertAdjacentElement("afterend",nav);
    else document.body.prepend(nav);
  }

  function injectHeroActions(){
    if(document.querySelector(".pepHeroActions2")) return;
    const panel=document.querySelector(".gbPanel");
    if(!panel) return;
    const wrap=document.createElement("div");
    wrap.className="pepHeroActions2";
    wrap.innerHTML='<a href="#products">🛍️ SHOP OPEN GB</a><a href="#how-it-works">✦ HOW IT WORKS</a>';
    const status=document.getElementById("gbStatus");
    if(status) status.insertAdjacentElement("afterend",wrap);
    else panel.appendChild(wrap);
  }

  function injectTrustStrip(){
    if(document.querySelector(".pepTrustStrip")) return;
    const products=document.getElementById("products");
    if(!products) return;
    const strip=document.createElement("div");
    strip.className="pepTrustStrip";
    strip.innerHTML=[
      ["🔒","ORDER DETAILS","Your order information stays tied to your submitted order."],
      ["💗","CLEAR PRICING","See the selected variant and running total before checkout."],
      ["📦","ORDER TRACKING","Use the customer tracker to follow your order status."]
    ].map(x=>'<div class="pepTrustItem"><div style="font-size:21px">'+x[0]+'</div><div><strong>'+x[1]+'</strong><span>'+x[2]+'</span></div></div>').join("");
    products.parentNode.insertBefore(strip,products);
  }

  function improveProductHeading(){
    const products=document.getElementById("products");
    if(!products) return;
    const heading=products.querySelector(".sectionHead");
    if(!heading || heading.querySelector(".pepProductCount")) return;
    const intro=document.createElement("div");
    intro.className="pepSectionIntro";
    const title=heading.querySelector("h2");
    if(title) intro.appendChild(title.cloneNode(true));
    const count=document.createElement("span");
    count.className="pepProductCount";
    count.textContent="OPEN PRODUCTS";
    intro.appendChild(count);
    heading.innerHTML="";
    heading.appendChild(intro);
    const update=()=>{
      const grid=document.getElementById("productGrid");
      if(!grid)return;
      const visible=[...grid.querySelectorAll(".pepStoreCard")].filter(x=>getComputedStyle(x).display!=="none");
      count.textContent=visible.length ? visible.length+" OPEN PRODUCT"+(visible.length===1?"":"S") : "NO MATCHES";
    };
    new MutationObserver(update).observe(document.getElementById("productGrid")||heading,{childList:true,subtree:true,attributes:true});
    setTimeout(update,300);
  }

  function injectMobileBar(){
    if(document.querySelector(".pepMobileBar")) return;
    const bar=document.createElement("nav");
    bar.className="pepMobileBar";
    bar.setAttribute("aria-label","Quick customer actions");
    bar.innerHTML='<a href="#products"><span>🛍️</span>SHOP</a><a href="#track"><span>📍</span>TRACK</a><a href="#proof"><span>🧾</span>PROOF</a><a href="#how-it-works"><span>✦</span>INFO</a>';
    document.body.appendChild(bar);
  }

  function addAnchors(){
    const track=document.querySelector('a[href*="track"],a[href*="track.html"]');
    if(track && !document.getElementById("track")) {
      const holder=track.closest("section,div,li")||track;
      holder.id="track";
    }
    const proof=document.querySelector('a[href*="proof"],a[href*="submit-proof"]');
    if(proof && !document.getElementById("proof")) {
      const holder=proof.closest("section,div,li")||proof;
      holder.id="proof";
    }
    const how=document.querySelector(".pepHow");
    if(how) how.id="how-it-works";
    if(!document.getElementById("top")) document.body.id="top";
  }

  function addBackTop(){
    if(document.querySelector(".pepBackTop")) return;
    const b=document.createElement("button");
    b.className="pepBackTop";b.type="button";b.setAttribute("aria-label","Back to top");b.textContent="↑";
    b.onclick=()=>window.scrollTo({top:0,behavior:"smooth"});
    document.body.appendChild(b);
    const toggle=()=>{b.style.display=scrollY>500?"grid":"none"};
    addEventListener("scroll",toggle,{passive:true});toggle();
  }

  ready(()=>{
    addStyles();
    addAnchors();
    injectTopNotice();
    injectCustomerNav();
    injectHeroActions();
    injectTrustStrip();
    improveProductHeading();
    injectMobileBar();
    addBackTop();
  });
})();
