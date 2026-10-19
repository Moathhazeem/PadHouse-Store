import { useMemo, useState } from "react";
import {
  ArrowLeft, Check, ChevronDown, CircleHelp, Headphones,
  Laptop, PackageCheck, Plus, ShieldCheck, Sparkles, Tablet,
  Truck, WandSparkles,
} from "lucide-react";
import "./padhousebundlepicker.css";

type Device = { id: string; name: string; size: string; detail: string; image: string };
type Accessory = {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  image: string;
  compatible: string[];
  badge?: string;
  color?: string;
};

const devices: Device[] = [
  { id: "ipad-air-11", name: "iPad Air", size: '11"', detail: "الجيل السادس · 2024", image: "✳" },
  { id: "ipad-10", name: "iPad", size: '10.9"', detail: "الجيل العاشر · 2022", image: "◉" },
  { id: "ipad-pro-13", name: "iPad Pro", size: '13"', detail: "شريحة M4 · 2024", image: "⌁" },
];

const accessories: Accessory[] = [
  {
    id: "pencil", name: "قلم باد هاوس", category: "كتابة ورسم",
    description: "استجابة دقيقة، وراحة يد على الشاشة.", price: 120,
    image: "https://padhouse.ps/wp-content/uploads/2024/11/PadHouse-Pencil-Product-Image.jpg",
    compatible: ["ipad-air-11", "ipad-10", "ipad-pro-13"], badge: "الأكثر اختيارًا", color: "قلم أبيض",
  },
  {
    id: "clear-case", name: "كفر سيليكون شفاف", category: "حماية يومية",
    description: "خفيف وشفاف، مصمّم لقياس جهازك.", price: 25,
    image: "https://padhouse.ps/wp-content/uploads/2025/06/TC-1.jpg",
    compatible: ["ipad-air-11", "ipad-10", "ipad-pro-13"], color: "شفاف",
  },
  {
    id: "keyboard", name: "كفر كيبورد وتتش باد", category: "إنجاز أكثر",
    description: "مساحة عمل كاملة أينما كان يومك.", price: 160,
    image: "https://padhouse.ps/wp-content/uploads/2025/06/KTC-1.jpg",
    compatible: ["ipad-air-11", "ipad-10", "ipad-pro-13"], badge: "ترقية عملية", color: "أسود",
  },
  {
    id: "carbon", name: "كفر كاربون فايبر", category: "حماية إضافية",
    description: "ملمس مميّز وحواف تحمي جهازك.", price: 45,
    image: "https://padhouse.ps/wp-content/uploads/2025/10/Front-Black.jpg",
    compatible: ["ipad-air-11", "ipad-10", "ipad-pro-13"], color: "أسود",
  },
];

const money = (value: number) => `₪${new Intl.NumberFormat("ar").format(value)}`;

export function PadHouseBundlePicker() {
  const [deviceId, setDeviceId] = useState(devices[0].id);
  const [selected, setSelected] = useState<string[]>(["pencil", "clear-case"]);
  const [added, setAdded] = useState(false);
  const [showCompatibility, setShowCompatibility] = useState(false);

  const device = devices.find((item) => item.id === deviceId) ?? devices[0];
  const chosen = useMemo(() => accessories.filter((item) => selected.includes(item.id)), [selected]);
  const subtotal = chosen.reduce((sum, item) => sum + item.price, 0);
  const discount = selected.length >= 2 ? Math.round(subtotal * 0.12) : 0;
  const total = subtotal - discount;
  const toggleAccessory = (id: string) => {
    setAdded(false);
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  return (
    <div className="phbp-shell" dir="rtl">
      <div className="phbp-promo"><Sparkles size={13} /> جهّزي جهازك مرّة واحدة — ووفّري ١٢٪ على قطعتين أو أكثر</div>
      <header className="phbp-header">
        <button className="phbp-brand" type="button" aria-label="باد هاوس، الرئيسية">
          <span className="phbp-mark">P<span>H</span></span>
          <span className="phbp-brand-text"><b>PADHOUSE</b><small>كل شي لآيبادك</small></span>
        </button>
        <div className="phbp-header-actions">
          <span className="phbp-help"><CircleHelp size={15} /> محتاجة مساعدة؟</span>
          <button className="phbp-cart" type="button" aria-label={`السلة، ${selected.length} قطع`}>
            <span className="phbp-bag-icon"><PackageCheck size={18} /></span><i>{selected.length}</i>
          </button>
        </div>
      </header>

      <main className="phbp-main">
        <div className="phbp-breadcrumb"><span>المتجر</span><ArrowLeft size={12} /><span>مستلزمات آيباد</span><ArrowLeft size={12} /><b>ركّبي باقتك</b></div>
        <section className="phbp-intro">
          <div>
            <span className="phbp-kicker"><i /> اختيارات مناسبة لجهازك</span>
            <h1>باقة آيبادك،<br /><em>على مقاسك.</em></h1>
            <p>اختاري جهازك أولًا. نرتّب لك الإكسسوارات المتوافقة،<br className="phbp-desktop-break" /> ونحسب التوفير تلقائيًا.</p>
          </div>
          <div className="phbp-orbit-art" aria-hidden="true">
            <div className="phbp-orbit phbp-orbit-one" /><div className="phbp-orbit phbp-orbit-two" />
            <div className="phbp-tablet-art"><span>PH</span><i /></div>
            <span className="phbp-art-pencil" /><span className="phbp-art-tag">باقة<br /><b>أذكى</b></span>
            <span className="phbp-art-star">✳</span>
          </div>
          <div className="phbp-step-chip"><span>١</span><b>اختاري الجهاز</b><i /><span className="muted">٢</span><small>اختاري الإكسسوارات</small></div>
        </section>

        <section className="phbp-builder">
          <div className="phbp-picker-column">
            <div className="phbp-section-head">
              <span className="phbp-step-number">١</span>
              <div><span className="phbp-overline">أول خطوة</span><h2>أيّ آيباد عندك؟</h2></div>
              <button className="phbp-compat-link" type="button" onClick={() => setShowCompatibility((value) => !value)}>
                <CircleHelp size={14} /> كيف أعرف الموديل؟
              </button>
            </div>

            <div className="phbp-device-list">
              {devices.map((item, index) => (
                <button type="button" key={item.id} onClick={() => { setDeviceId(item.id); setAdded(false); }}
                  className={`phbp-device ${deviceId === item.id ? "is-selected" : ""}`}>
                  <span className={`phbp-device-glyph glyph-${index}`}><Tablet size={23} /></span>
                  <span className="phbp-device-copy"><b>{item.name} <i>{item.size}</i></b><small>{item.detail}</small></span>
                  <span className="phbp-radio">{deviceId === item.id && <i />}</span>
                </button>
              ))}
            </div>
            {showCompatibility && <div className="phbp-compat-note"><WandSparkles size={15} /><span><b>تلاقينه من الإعدادات:</b> عام ← حول. اختاري اسم الجهاز وحجمه، والباقي علينا.</span><button type="button" onClick={() => setShowCompatibility(false)} aria-label="إغلاق">×</button></div>}

            <div className="phbp-selection-head">
              <div className="phbp-section-head">
                <span className="phbp-step-number step-two">٢</span>
                <div><span className="phbp-overline">الآن اختاري اللي تحتاجيه</span><h2>ركّبي باقتك</h2></div>
              </div>
              <span className="phbp-fit-pill"><Check size={12} /> متوافق مع {device.name} {device.size}</span>
            </div>

            <div className="phbp-accessory-list">
              {accessories.map((item, index) => {
                const isSelected = selected.includes(item.id);
                return (
                  <article key={item.id} className={`phbp-accessory ${isSelected ? "is-included" : ""}`}>
                    <div className={`phbp-product-image product-${index}`}>
                      <img src={item.image} alt={item.name} loading="lazy" />
                      {item.badge && <span className="phbp-product-badge">{item.badge}</span>}
                    </div>
                    <div className="phbp-product-info">
                      <span className="phbp-category">{item.category}</span>
                      <h3>{item.name}</h3><p>{item.description}</p>
                      <span className="phbp-product-color"><i />{item.color} <b>·</b> قياس {device.size}</span>
                    </div>
                    <div className="phbp-product-action">
                      <b className="phbp-price">{money(item.price)}</b>
                      <button type="button" aria-label={`${isSelected ? "إزالة" : "إضافة"} ${item.name}`}
                        className={`phbp-add ${isSelected ? "selected" : ""}`} onClick={() => toggleAccessory(item.id)}>
                        {isSelected ? <><Check size={14} /><span>مضافة</span></> : <><Plus size={15} /><span>أضيفي</span></>}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
            <div className="phbp-footnote"><ShieldCheck size={14} /><span>كل قطعة مختارة مناسبة لقياس جهازك، ونتأكد من التفاصيل قبل الشحن.</span></div>
          </div>

          <aside className="phbp-summary">
            <div className="phbp-summary-top"><span>باقتك المخصّصة</span><span className="phbp-live-dot">حُدّثت للتو</span></div>
            <div className="phbp-summary-device"><span className="phbp-mini-tablet"><Tablet size={19} /></span><span><b>{device.name} {device.size}</b><small>{device.detail}</small></span><button type="button" onClick={() => document.querySelector(".phbp-device-list")?.scrollIntoView({ behavior: "smooth", block: "center" })}>تغيير</button></div>
            <div className="phbp-summary-items">
              {chosen.length ? chosen.map((item) => (
                <div className="phbp-summary-item" key={item.id}><span className="phbp-summary-check"><Check size={11} /></span><span>{item.name}</span><b>{money(item.price)}</b></div>
              )) : <div className="phbp-empty"><PackageCheck size={20} /><span>ابدئي بإضافة إكسسوار لباقتك.</span></div>}
            </div>
            <div className="phbp-savings">
              <span className="phbp-save-icon"><Sparkles size={15} /></span>
              <span><b>{discount ? `وفّرتِ ${money(discount)}` : "خصم الباقة بانتظارك"}</b><small>{discount ? "خصم ١٢٪ مطبّق تلقائيًا" : "أضيفي قطعة ثانية لتحصلي على ١٢٪"}</small></span>
              {discount > 0 && <span className="phbp-save-rate">−١٢٪</span>}
            </div>
            <div className="phbp-total">
              <span>المجموع</span>
              <div><b>{money(total)}</b>{discount > 0 && <del>{money(subtotal)}</del>}</div>
            </div>
            <button type="button" className={`phbp-cta ${added ? "is-added" : ""}`} onClick={() => setAdded(true)} disabled={!chosen.length}>
              {added ? <><Check size={17} /> أضيفت الباقة للسلة</> : <>أضيفي الباقة للسلة <ArrowLeft size={17} /> </>}
            </button>
            {added && <p className="phbp-added-note" role="status">باقتك جاهزة — {chosen.length} {chosen.length === 1 ? "قطعة" : "قطع"} بانتظارك في السلة.</p>}
            <div className="phbp-delivery"><Truck size={16} /><span>توصيل للضفة والقدس ومناطق ٤٨</span><ChevronDown size={14} /></div>
            <div className="phbp-trust"><span><ShieldCheck size={13} /> دفع عند الاستلام</span><i /><span><Headphones size={13} /> مساعدة قبل الطلب</span></div>
            <div className="phbp-under-note"><Laptop size={15} /><span>مش متأكدة من جهازك؟<button type="button" onClick={() => setShowCompatibility(true)}>نساعدك تلاقيه</button></span></div>
          </aside>
        </section>
        <footer className="phbp-footer"><span className="phbp-footer-mark">PH</span><span>PADHOUSE <i>·</i> اختيارات بتناسب يومك</span><span className="phbp-footer-safe"><ShieldCheck size={12} /> منتجات متوافقة بعناية</span></footer>
      </main>
      {selected.length > 0 && <div className="phbp-mobile-bar">
        <div><span>{selected.length} {selected.length === 1 ? "قطعة" : "قطع"} · وفّرتِ <b>{money(discount)}</b></span><strong>{money(total)}</strong></div>
        <button type="button" onClick={() => setAdded(true)}>{added ? "أضيفت للسلة" : "أضيفي الباقة"} <ArrowLeft size={15} /></button>
      </div>}
    </div>
  );
}
