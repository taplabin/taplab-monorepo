import React, { useState, useEffect, useRef } from "react";
import {
  Menu,
  X,
  ArrowRight,
  QrCode,
  BarChart3,
  Star,
  Plus,
  Minus,
} from "lucide-react";

/**
 * TapLab — marketing landing page in the style of Linktree's homepage (linktr.ee).
 * Theme customized to feature #13204d as the primary brand color.
 */

const css = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Poppins:wght@600;700;800&display=swap');

.lp {
  --bg: #f6f8fb; /* Cool light bg to match the navy theme */
  --bg-2: #ffffff;
  --ink: #0a1128; /* Very dark navy for primary text */
  --ink-soft: #4a577a; /* Slate blue for secondary text */
  --theme: #13204d; /* Primary requested theme color */
  --theme-hl: #2087e6;
  --theme-deep: #090f26; /* Darker shade for hovers/strips */
  --theme-light: #e4e9f5; /* Light wash for accents */
  --theme-soft: #d2dcf0; /* Secondary light wash */
  --line: rgba(19, 32, 77, 0.12);

  background: var(--bg);
  color: var(--ink);
  font-family: 'Inter', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  min-height: 100vh;
  overflow-x: hidden;
}
.lp * { box-sizing: border-box; }
.lp h1, .lp h2, .lp h3, .lp .display {
  font-family: 'Poppins', sans-serif;
  letter-spacing: -0.02em;
  line-height: 1.02;
  margin: 0;
}
.lp p { margin: 0; }
.lp a { text-decoration: none; color: inherit; }
.lp .wrap { max-width: 1120px; margin: 0 auto; padding: 0 24px; }

/* promo strip */
.lp-strip { background: var(--theme-deep); color: #fff; text-align: center; font-size: 13px; padding: 9px 16px; font-weight: 500; }
.lp-strip a { text-decoration: underline; text-underline-offset: 2px; }

/* nav */
.lp-nav { position: sticky; top: 0; z-index: 50; background: rgba(246, 248, 251, 0.85); backdrop-filter: blur(10px); border-bottom: 1px solid transparent; }
.lp-nav.scrolled { border-bottom-color: var(--line); }
.lp-nav .inner { display: flex; align-items: center; justify-content: space-between; height: 68px; }
.lp-logo { display: flex; align-items: center; gap: 8px; font-family: 'Poppins'; font-weight: 800; font-size: 21px; }
.lp-navlinks { display: flex; gap: 30px; align-items: center; }
.lp-navlinks a { font-weight: 500; font-size: 15px; color: var(--ink-soft); }
.lp-navlinks a:hover { color: var(--ink); }
.lp-navcta { display: flex; gap: 10px; align-items: center; }
.lp-burger { display: none; background: none; border: none; cursor: pointer; color: var(--ink); }

.btn { font-family: 'Inter'; font-weight: 600; font-size: 15px; border: none; cursor: pointer; border-radius: 999px; padding: 12px 22px; display: inline-flex; align-items: center; gap: 8px; transition: transform .12s ease, background .2s ease, box-shadow .2s ease; }
.btn:active { transform: scale(.97); }
.btn-dark { background: var(--ink); color: #fff; }
.btn-dark:hover { box-shadow: 0 8px 22px rgba(10, 17, 40, 0.22); }
.btn-theme { background: var(--theme); color: #fff !important; }
.btn-theme:hover { box-shadow: 0 8px 22px rgba(19, 32, 77, 0.25); }
.btn-ghost { background: transparent; color: var(--ink); }
.btn-ghost:hover { background: rgba(19, 32, 77, 0.06); }
.btn-lg { padding: 16px 30px; font-size: 17px; }

/* hero */
.lp-hero { padding: 56px 0 80px; }
.lp-hero .grid { display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 48px; align-items: center; }
.lp-eyebrow { display: inline-flex; align-items: center; gap: 7px; background: var(--theme-light); color: var(--theme); font-weight: 600; font-size: 13px; padding: 7px 13px; border-radius: 999px; margin-bottom: 22px; }
.lp-hero h1 { font-size: 60px; font-weight: 800; margin-bottom: 22px; }
.lp-hero h1 .hl { color: var(--theme-hl); }
.lp-hero .sub { font-size: 18px; color: var(--ink-soft); max-width: 480px; margin-bottom: 30px; line-height: 1.5; }
.lp-claim { display: flex; align-items: center; background: #fff; border: 2px solid var(--theme); border-radius: 999px; padding: 6px 6px 6px 18px; max-width: 440px; gap: 8px; }
.lp-claim .pfx { font-weight: 600; color: var(--ink-soft); white-space: nowrap; }
.lp-claim input { flex: 1; border: none; outline: none; font-size: 15px; font-family: 'Inter'; min-width: 40px; background: transparent; color: var(--ink); }
.lp-claim input::placeholder { color: #aab2ad; }
.lp-trust { display: flex; align-items: center; gap: 8px; margin-top: 18px; font-size: 14px; color: var(--ink-soft); }
.lp-trust .av { display: flex; }
.lp-trust .av span { width: 26px; height: 26px; border-radius: 50%; border: 2px solid var(--bg); margin-left: -8px; display: grid; place-items: center; font-size: 11px; font-weight: 700; color: #fff; }

/* HERO image carousel */
.lp-carousel { position: relative; width: 100%; max-width: 420px; margin: 0 auto; }
.lp-cframe { position: relative; border-radius: 28px; overflow: hidden; box-shadow: 0 30px 60px rgba(19, 32, 77, 0.15); border: 1px solid var(--line); background: var(--theme-light); }
.lp-ctrack { display: flex; transition: transform .6s cubic-bezier(.5,.05,.2,1); }
.lp-slide { position: relative; min-width: 100%; height: 480px; }
.lp-slide > img { width: 100%; height: 100%; object-fit: cover; display: block; }
.lp-slide .cap { position: absolute; left: 0; right: 0; bottom: 0; padding: 22px 22px 26px; background: linear-gradient(to top, rgba(10, 17, 40, 0.85), rgba(10, 17, 40, 0)); color: #fff; display: flex; align-items: flex-end; justify-content: space-between; gap: 10px; }
.lp-slide .cap b { font-family: 'Poppins'; font-weight: 700; font-size: 21px; }
.lp-slide .cap .tag { font-size: 12px; font-weight: 700; background: var(--theme); color: #fff; padding: 5px 11px; border-radius: 999px; white-space: nowrap; }
.lp-cnav { position: absolute; top: 50%; transform: translateY(-50%); width: 42px; height: 42px; border-radius: 50%; background: rgba(255,255,255,0.92); border: none; cursor: pointer; display: grid; place-items: center; color: var(--ink); box-shadow: 0 6px 16px rgba(19, 32, 77, 0.12); transition: background .15s ease; z-index: 2; }
.lp-cnav:hover { background: #fff; }
.lp-cnav.prev { left: 14px; }
.lp-cnav.next { right: 14px; }
.lp-dots { display: flex; gap: 8px; justify-content: center; margin-top: 18px; }
.lp-dot { width: 8px; height: 8px; border-radius: 999px; background: rgba(19, 32, 77, 0.2); border: none; cursor: pointer; padding: 0; transition: width .2s ease, background .2s ease; }
.lp-dot.active { width: 24px; background: var(--theme); }

/* rotating trusted */
.lp-rotate { padding: 70px 0; text-align: center; }
.lp-rotate h2 { font-size: 40px; font-weight: 800; }
.lp-rotate .rolling { display: block; font-family: 'Poppins'; font-weight: 800; font-size: 40px; letter-spacing: -0.02em; line-height: 1.05; color: var(--theme-hl); margin-top: 10px; }
.lp-rotate .word { display: inline-block; animation: rollIn .5s ease; }
@keyframes rollIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }

/* feature sections */
.lp-feat { padding: 0; }
.lp-card { padding: 88px 0; }
.lp-card .wrap { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: center; }
.lp-card.theme-light { background: var(--theme-light); }
.lp-card.theme-soft { background: var(--theme-soft); }
.lp-card.theme { background: var(--theme); color: #fff; }
.lp-card.reverse .lp-card-media { order: -1; }
.lp-card h2 { font-size: 38px; font-weight: 800; margin-bottom: 16px; }
.lp-card p { font-size: 16.5px; line-height: 1.55; margin-bottom: 26px; opacity: .92; }
.lp-card.theme p { color: rgba(255, 255, 255, 0.85); }
.lp-card-media { display: grid; place-items: center; }
.lp-tile { background: rgba(255,255,255,0.65); border-radius: 22px; padding: 26px; width: 100%; }
.lp-card.theme .lp-tile { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1); }
.lp-tile-row { display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: #fff; border-radius: 13px; margin-bottom: 10px; font-weight: 600; font-size: 14px; box-shadow: 0 4px 14px rgba(19, 32, 77, 0.06); }
.lp-tile-icn { width: 34px; height: 34px; border-radius: 10px; background: var(--theme-light); color: var(--theme); display: grid; place-items: center; flex-shrink: 0; }
.lp-bars { display: flex; align-items: flex-end; gap: 12px; height: 150px; }
.lp-bar { flex: 1; background: #fff; border-radius: 8px 8px 0 0; animation: grow 1s ease both; opacity: 0.9; }

/* big cta band */
.lp-band { background: var(--theme); color: #fff; border-radius: 34px; padding: 60px; text-align: center; margin: 60px 0; }
.lp-band h2 { font-size: 42px; font-weight: 800; margin-bottom: 24px; }

/* testimonials */
.lp-testi { padding: 70px 0; }
.lp-testi h2 { font-size: 38px; font-weight: 800; text-align: center; margin-bottom: 44px; }
.lp-testi .row { display: grid; grid-template-columns: repeat(3,1fr); gap: 22px; }
.lp-quote { background: var(--bg-2); border: 1px solid var(--line); border-radius: 24px; padding: 30px; box-shadow: 0 8px 24px rgba(19, 32, 77, 0.04); }
.lp-quote .stars { display: flex; gap: 3px; margin-bottom: 16px; color: var(--theme); }
.lp-quote .txt { font-size: 16px; line-height: 1.5; margin-bottom: 20px; }
.lp-quote .who { display: flex; align-items: center; gap: 12px; }
.lp-quote .who .c { width: 42px; height: 42px; border-radius: 50%; background: var(--theme-light); color: var(--theme); display: grid; place-items: center; font-weight: 700; }
.lp-quote .who b { font-family: 'Poppins'; }
.lp-quote .who span { font-size: 13px; color: var(--ink-soft); }

/* faq */
.lp-faq { padding: 30px 0 80px; }
.lp-faq h2 { font-size: 38px; font-weight: 800; text-align: center; margin-bottom: 40px; }
.lp-faq .list { max-width: 760px; margin: 0 auto; }
.lp-q { border-top: 1px solid var(--line); }
.lp-q:last-child { border-bottom: 1px solid var(--line); }
.lp-q button { width: 100%; background: none; border: none; cursor: pointer; display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 24px 4px; text-align: left; font-family: 'Poppins'; font-weight: 600; font-size: 18px; color: var(--ink); }
.lp-q .a { overflow: hidden; max-height: 0; transition: max-height .3s ease; }
.lp-q.open .a { max-height: 240px; }
.lp-q .a p { padding: 0 4px 24px; color: var(--ink-soft); font-size: 15.5px; line-height: 1.6; }
.lp-q .ic { flex-shrink: 0; color: var(--theme); }

/* final cta */
.lp-final { background: var(--theme-deep); border-radius: 40px; padding: 80px 40px; text-align: center; color: #fff; }
.lp-final h2 { font-size: 50px; font-weight: 800; margin-bottom: 16px; }
.lp-final p { color: rgba(255, 255, 255, 0.85); font-size: 18px; margin-bottom: 30px; }

/* footer */
.lp-foot { padding: 70px 0 40px; }
.lp-foot .cols { display: grid; grid-template-columns: 1.4fr 1fr 1fr 1fr; gap: 32px; margin-bottom: 50px; }
.lp-foot h4 { font-family: 'Poppins'; font-size: 14px; margin-bottom: 16px; color: var(--ink); }
.lp-foot a { display: block; color: var(--ink-soft); font-size: 14px; margin-bottom: 11px; }
.lp-foot a:hover { color: var(--theme); }
.lp-foot .bottom { border-top: 1px solid var(--line); padding-top: 24px; display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: var(--ink-soft); }
.lp-soc { display: flex; gap: 10px; }
.lp-soc a { width: 38px; height: 38px; border-radius: 50%; background: var(--theme-light); color: var(--theme); display: grid; place-items: center; margin: 0; transition: all 0.2s ease; }
.lp-soc a:hover { background: var(--theme); color: #fff; }

/* reveal */
.reveal { opacity: 0; transform: translateY(20px); animation: rise .6s cubic-bezier(.2,.7,.3,1) forwards; }
@keyframes rise { to { opacity: 1; transform: translateY(0); } }
@keyframes grow { from { height: 0; } }

/* mobile */
.lp-mobile { display: none; }
@media (max-width: 900px) {
  .lp-navlinks, .lp-navcta .btn-ghost { display: none; }
  .lp-burger { display: block; }
  .lp-hero .grid { grid-template-columns: 1fr; }
  .lp-hero h1 { font-size: 42px; }
  .lp-carousel { max-width: 360px; }
  .lp-slide { height: 380px; }
  .lp-card { padding: 56px 0; }
  .lp-card .wrap { grid-template-columns: 1fr; }
  .lp-card.reverse .lp-card-media { order: 0; }
  .lp-testi .row { grid-template-columns: 1fr; }
  .lp-foot .cols { grid-template-columns: 1fr 1fr; }
  .lp-final h2 { font-size: 34px; }
  .lp-rotate h2 { font-size: 28px; }
  .lp-rotate .rolling { font-size: 28px; }
  .lp-mobile.show { display: block; background: var(--bg-2); border-bottom: 1px solid var(--line); padding: 16px 24px; }
  .lp-mobile a { display: block; padding: 12px 0; font-weight: 600; color: var(--ink); }
}
@media (max-width: 480px) {
  .lp-hero { padding: 32px 0 48px; }
  .lp-hero h1 { font-size: 32px; }
  .lp-hero .sub { font-size: 16px; margin-bottom: 24px; }
  .lp-claim { flex-wrap: wrap; border-radius: 18px; padding: 14px 16px; gap: 10px; max-width: 100%; }
  .lp-claim input { width: 100%; min-width: 0; font-size: 14px; }
  .lp-claim .btn { width: 100%; justify-content: center; border-radius: 12px; }
  .lp-card { padding: 44px 0; }
  .lp-card h2 { font-size: 26px; }
  .lp-card p { font-size: 15px; }
  .lp-band { padding: 44px 24px; border-radius: 22px; margin: 40px 0; }
  .lp-band h2 { font-size: 28px; }
  .lp-rotate { padding: 40px 0; }
  .lp-rotate h2 { font-size: 22px; }
  .lp-rotate .rolling { font-size: 22px; }
  .lp-testi { padding: 48px 0; }
  .lp-testi h2 { font-size: 28px; margin-bottom: 28px; }
  .lp-faq { padding: 16px 0 52px; }
  .lp-faq h2 { font-size: 28px; margin-bottom: 28px; }
  .lp-q button { font-size: 15px; padding: 18px 4px; }
  .lp-final { border-radius: 22px; padding: 52px 24px; }
  .lp-final h2 { font-size: 28px; }
  .lp-final p { font-size: 15px; margin-bottom: 24px; }
  .lp-foot .cols { grid-template-columns: 1fr; gap: 28px; }
  .lp-foot .bottom { flex-direction: column; gap: 16px; text-align: center; }
  .lp-hero { overflow-x: hidden; }
  .lp-carousel { max-width: 100%; width: 100%; }
  .lp-slide { height: 300px; }
  .lp-slide .cap b { font-size: 17px; }
  .lp-trust { flex-wrap: wrap; }
}
@media (prefers-reduced-motion: reduce) {
  .reveal, .lp-blob, .lp-bar, .lp-rotate .word { animation: none !important; opacity: 1; transform: none; }
  .lp-ctrack { transition: none !important; }
}
`;

const WA = "https://wa.me/919867145439";

const showcase = [
  { word: "restaurants", img: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4", name: "Spice Route", tag: "Restaurant" },
  { word: "salons", img: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f", name: "Glow Studio", tag: "Salon" },
  { word: "gyms", img: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48", name: "Iron House", tag: "Gym" },
  { word: "clinics", img: "https://images.unsplash.com/photo-1584515933487-779824d29309", name: "Care Clinic", tag: "Clinic" },
  { word: "cafes", img: "https://images.unsplash.com/photo-1509042239860-f550ce710b93", name: "Brew & Co.", tag: "Cafe" },
  { word: "boutiques", img: "https://images.unsplash.com/photo-1441986300917-64674bd600d8", name: "Thread Boutique", tag: "Boutique" },
  { word: "studios", img: "https://images.unsplash.com/photo-1518611012118-696072aa579a", name: "Pixel Studio", tag: "Studio" },
  { word: "retailers", img: "https://images.unsplash.com/photo-1604719312566-8912e9227c6a", name: "Urban Retail", tag: "Retail" },
  { word: "spas", img: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874", name: "Aura Spa", tag: "Spa" },
  { word: "clubs", img: "https://images.unsplash.com/photo-1566737236500-c8ac43014a67", name: "Social Club", tag: "Club" },
];

const faqs = [
  { q: "What exactly does TapLab build for my business?", a: "A fast, mobile-first page on taplab.in that holds your menu or services, booking link, reviews, location, UPI payments and socials — plus an NFC card or sticker so customers reach it with one tap. We build and host it; you just send us your details." },
  { q: "Do my customers need an app to tap it?", a: "No. NFC works natively on every modern iPhone and Android. They tap your card or scan the QR code and your page opens straight in their browser — nothing to install." },
  { q: "Can I update my page after it's live?", a: "Yes. Send us a change and it's live the same day, or use your dashboard for menus, hours, links and offers. The NFC card never needs reprinting because it always points to the same page." },
  { q: "How much does it cost?", a: "A one-time setup fee plus a small monthly subscription that covers hosting, updates and your NFC card. Message us on WhatsApp for current pricing for your type of business." },
  { q: "Which businesses is this for?", a: "Local businesses that want to look sharp without building a website — restaurants, cafes, salons, gyms, clinics, boutiques and more. If you have a counter, a table or a shopfront, TapLab fits." },
];

const hideOnError = (e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = "none"; };

export default function TapLabLanding() {
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const [open, setOpen] = useState(0);
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number>(0);

  const go = (d: number) => setIndex((s) => (s + d + showcase.length) % showcase.length);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 40) go(delta > 0 ? 1 : -1);
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const id = setTimeout(() => setIndex((s) => (s + 1) % showcase.length), 3000);
    return () => clearTimeout(id);
  }, [index]);

  return (
    <div className="lp">
      <style>{css}</style>

      <div className="lp-strip">
        New: order your NFC cards online · <a href={WA}>Get 20% off your first month →</a>
      </div>

      <nav className={`lp-nav ${scrolled ? "scrolled" : ""}`}>
        <div className="wrap inner">
          <a className="lp-logo" href="#top">
            <img src="/taplab.png" alt="TapLab" style={{ height: 48, width: 'auto' }} />
          </a>
          <div className="lp-navlinks">
            <a href="#features">Products</a>
            <a href="#testimonials">Stories</a>
            <a href="#faq">FAQ</a>
            <a href={WA}>Pricing</a>
          </div>
          <div className="lp-navcta">
            <a className="btn btn-ghost" href={WA}>Log in</a>
            <a className="btn btn-theme" href={WA}>Sign up free</a>
            <button className="lp-burger" onClick={() => setMenu(!menu)} aria-label="Menu">
              {menu ? <X size={26} /> : <Menu size={26} />}
            </button>
          </div>
        </div>
        <div className={`lp-mobile ${menu ? "show" : ""}`}>
          <a href="#features">Products</a>
          <a href="#testimonials">Stories</a>
          <a href="#faq">FAQ</a>
          <a href={WA}>Pricing</a>
          <a href={WA}>Log in</a>
        </div>
      </nav>

      {/* HERO */}
      <header className="lp-hero" id="top">
        <div className="wrap grid">
          <div className="reveal">
            <h1>Everything your customers need, in <span className="hl">one tap.</span></h1>
            <p className="sub">
              TapLab turns a single NFC tap or link into your menu, bookings, reviews, payments and socials —
              designed, built and hosted for you. No website headache.
            </p>
            <div className="lp-claim">
              <span className="pfx">taplab.in/</span>
              <input placeholder="your-business" aria-label="Claim your page name" />
              <a className="btn btn-theme" href={WA}>Claim page</a>
            </div>
            <div className="lp-trust">
              <span className="av">
                <span style={{ background: "#13204d" }}>P</span>
                <span style={{ background: "#090f26" }}>H</span>
                <span style={{ background: "#4a577a" }}>S</span>
              </span>
              Trusted by local businesses across Mumbai
            </div>
          </div>

          <div className="reveal" style={{ animationDelay: ".1s" }}>
            <div className="lp-carousel">
              <div className="lp-cframe" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
                <div className="lp-ctrack" style={{ transform: `translateX(-${index * 100}%)` }}>
                  {showcase.map((s, i) => (
                    <div className="lp-slide" key={i}>
                      <img src={s.img} alt={s.name} loading="lazy" onError={hideOnError} />
                      <div className="cap"><b>{s.name}</b></div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="lp-dots">
                {showcase.map((_, i) => (
                  <button key={i} className={`lp-dot ${index === i ? "active" : ""}`} onClick={() => setIndex(i)} aria-label={`Go to slide ${i + 1}`} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ROTATING TRUSTED */}
      <section className="lp-rotate">
        <div className="wrap">
          <h2>We build cool things for</h2>
          <div className="rolling">
            <span className="word" key={index}>{showcase[index].word}</span>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features">

        <div className="lp-card theme-soft reverse reveal">
          <div className="wrap">
            <div>
              <h2>Share it anywhere — tap, scan or link</h2>
              <p>Put your TapLab card on the counter, table or shopfront. Add the QR to flyers and bills. Drop the link in every bio. One destination, everywhere your customers are.</p>
              <a className="btn btn-theme" href={WA}>See how it works <ArrowRight size={16} /></a>
            </div>
            <div className="lp-card-media">
              <div className="lp-tile" style={{ display: "grid", placeItems: "center", padding: 36 }}>
                <QrCode size={120} color="#13204d" />
              </div>
            </div>
          </div>
        </div>

        <div className="lp-card theme reveal">
          <div className="wrap">
            <div>
              <h2>See what's actually working</h2>
              <p>Know how many people tapped, what they clicked and when they came back. Tweak your offers and links on the fly to keep customers coming through the door.</p>
              <a className="btn" style={{ background: '#fff', color: '#13204d' }} href={WA}>View a demo <ArrowRight size={16} /></a>
            </div>
            <div className="lp-card-media">
              <div className="lp-tile">
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18, color: "#fff", fontWeight: 600 }}>
                  <BarChart3 size={18} /> This week's taps
                </div>
                <div className="lp-bars">
                  {[40, 65, 50, 80, 60, 95, 75].map((h, i) => (
                    <div key={i} className="lp-bar" style={{ height: `${h}%`, animationDelay: `${i * 0.08}s` }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

      </section>

      {/* TESTIMONIALS */}
      <section className="lp-testi" id="testimonials">
        <div className="wrap">
          <h2>Loved by local businesses</h2>
          <div className="row">
            {[
              { t: "Customers tap the card on the counter and order in seconds. It just looks premium.", n: "Pizza Caprina", r: "Cafe Owner", c: "P" },
              { t: "Setup was effortless — I sent my menu once and the page was live the same day.", n: "High On Shakes", r: "Cafe Owner", c: "H" },
              { t: "The table tags completely changed how our guests browse the menu. No more reprints.", n: "Seby D'costa", r: "Restaurant Owner", c: "S" },
            ].map((x, i) => (
              <div className="lp-quote reveal" key={i} style={{ animationDelay: `${i * 0.08}s` }}>
                <div className="stars">{[...Array(5)].map((_, j) => <Star key={j} size={16} fill="currentColor" />)}</div>
                <p className="txt">"{x.t}"</p>
                <div className="who"><span className="c">{x.c}</span><div><b>{x.n}</b><br /><span>{x.r}</span></div></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="lp-faq" id="faq">
        <div className="wrap">
          <h2>Questions? Answered.</h2>
          <div className="list">
            {faqs.map((f, i) => (
              <div className={`lp-q ${open === i ? "open" : ""}`} key={i}>
                <button onClick={() => setOpen(open === i ? -1 : i)}>
                  {f.q}
                  <span className="ic">{open === i ? <Minus size={22} /> : <Plus size={22} />}</span>
                </button>
                <div className="a"><p>{f.a}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="lp-foot">
        <div className="wrap">
          <div className="cols">
            <div>
              <a className="lp-logo" href="#top">
                <img src="/taplab.png" alt="TapLab" style={{ height: 28, width: 'auto' }} />
              </a>
              <p style={{ color: "var(--ink-soft)", fontSize: 14, maxWidth: 260, marginTop: 12 }}>
                Tap-ready pages for local businesses. Designed, built and hosted in Mumbai.
              </p>
            </div>
            <div>
              <h4>Products</h4>
              <a href="#features">NFC business cards</a>
              <a href="#features">Smart tags</a>
              <a href="#features">Restaurant table tags</a>
            </div>
            <div>
              <h4>Company</h4>
              <a href={WA}>About</a>
              <a href={WA}>Contact</a>
              <a href={WA}>Pricing</a>
            </div>
            <div>
              <h4>Support</h4>
              <a href={WA}>WhatsApp us</a>
              <a href="mailto:contact@taplab.in">contact@taplab.in</a>
              <a href={WA}>Help</a>
            </div>
          </div>
          <div className="bottom">
            <span>© 2025 TapLab. Upgrade how you connect.</span>
            <div className="lp-soc">
              <a href="https://www.instagram.com/taplab.in/" aria-label="Instagram">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" stroke="none" /></svg>
              </a>
              <a href="https://www.linkedin.com/company/taplabindia/" aria-label="LinkedIn">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}