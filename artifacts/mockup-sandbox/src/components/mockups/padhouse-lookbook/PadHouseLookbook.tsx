import { useMemo, useState } from "react";
import {
  ArrowDownLeft, ArrowLeft, ArrowUpLeft, Check, Heart, Minus, Plus,
  Search, ShoppingBag, X,
} from "lucide-react";
import "./padhouselookbook.css";

type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  description: string;
  variants?: string[];
  tag?: string;
};
type BagLine = { product: Product; size: string; qty: number };

const products: Product[] = [
  {
    id: "pencil",
    name: "قلم الباد هاوس",
    category: "أقلام الآيباد",
    price: 120,
    image: "https://padhouse.ps/wp-content/uploads/2024/11/PadHouse-Pencil-Product-Image.jpg",
    description: "كتابة ورسم بانسيابية على الآيباد. يدعم رفض راحة اليد وشحنًا سريعًا.",
    tag: "الأكثر طلبًا",
  },
  {
    id: "clear-case",
    name: "كفر ايباد سيليكون شفاف",
    category: "الكفرات والحافظات",
    price: 25,
    image: "https://padhouse.ps/wp-content/uploads/2025/06/TC-1.jpg",
    description: "حماية خفيفة وشفافة تُظهر لون جهازك. اختاري قياس الآيباد المطابق.",
    variants: ["10.2 إنش", "10.9 / 11 إنش", "12.9 / 13 إنش"],
    tag: "خفيف وشفاف",
  },
  {
    id: "carbon-case",
    name: "كفر نقش كاربون فايبر",
    category: "الكفرات والحافظات",
    price: 45,
    image: "/__mockup/images/padhouselookbook-carbon-case.png",
    description: "سيليكون غير شفاف بملمس نقش كاربون فايبر ولمسة عملية.",
    variants: ["10.2 إنش", "10.9 / 11 إنش", "12.9 / 13 إنش"],
  },
  {
    id: "keyboard-case",
    name: "كفر مع كيبورد وتتش باد",
    category: "لوحات المفاتيح",
    price: 160,
    image: "https://padhouse.ps/wp-content/uploads/2025/06/KTC-1.jpg",
    description: "مساحة عمل عملية مع كيبورد وتتش باد مدمجين.",
    variants: ["10.2 إنش", "10.9 / 11 إنش", "12.9 / 13 إنش"],
    tag: "مكتبك أينما كنت",
  },
  {
    id: "cable",
    name: "سلك شاحن Type‑C إلى iPhone",
    category: "الشواحن والكابلات",
    price: 35,
    image: "/__mockup/images/padhouselookbook-cable.png",
    description: "سلك Yesido CA153 من Type‑C إلى iPhone.",
  },
];
const categories = ["الكل", "أقلام الآيباد", "الكفرات والحافظات", "لوحات المفاتيح", "الشواحن والكابلات"];
const money = (amount: number) => `₪${new Intl.NumberFormat("ar").format(amount)}`;

export function PadHouseLookbook() {
  const [category, setCategory] = useState("الكل");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [size, setSize] = useState("");
  const [bag, setBag] = useState<BagLine[]>([]);
  const [bagOpen, setBagOpen] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [checkout, setCheckout] = useState(false);
  const [complete, setComplete] = useState(false);
  const [customer, setCustomer] = useState({ name: "", phone: "" });
  const [notice, setNotice] = useState("");

  const shownProducts = useMemo(() => products.filter((product) => {
    const categoryMatch = category === "الكل" || product.category === category;
    const searchMatch = `${product.name} ${product.category}`.toLowerCase().includes(query.trim().toLowerCase());
    return categoryMatch && searchMatch;
  }), [category, query]);
  const bagCount = bag.reduce((sum, line) => sum + line.qty, 0);
  const total = bag.reduce((sum, line) => sum + line.product.price * line.qty, 0);

  const closeDrawer = () => {
    setBagOpen(false);
    setCheckout(false);
    setComplete(false);
  };
  const addProduct = () => {
    if (!activeProduct) return;
    if (activeProduct.variants?.length && !size) {
      setNotice("اختاري قياس جهازك أولًا");
      window.setTimeout(() => setNotice(""), 2300);
      return;
    }
    setBag((current) => {
      const found = current.find((line) => line.product.id === activeProduct.id && line.size === size);
      return found
        ? current.map((line) => line === found ? { ...line, qty: line.qty + 1 } : line)
        : [...current, { product: activeProduct, size, qty: 1 }];
    });
    setActiveProduct(null);
    setSize("");
    setBagOpen(true);
  };
  const changeQty = (line: BagLine, change: number) => {
    setBag((current) => current.map((item) => item === line ? { ...item, qty: Math.max(1, item.qty + change) } : item));
  };

  return (
    <div className="pl-shell" dir="rtl" lang="ar">
      <div className="pl-ribbon"><span>فلسطين · إكسسوارات للآيباد</span><span>اختيارات يومية، بتفاصيل تفرق</span></div>
      <header className="pl-header">
        <a className="pl-brand" href="#top" aria-label="PadHouse الصفحة الرئيسية">
          <span className="pl-brand-symbol">ph<span>.</span></span>
          <span className="pl-brand-name">PADHOUSE<small>أدواتك، على طريقتك</small></span>
        </a>
        <nav className="pl-nav" aria-label="التصنيفات">
          <button onClick={() => { setCategory("الكل"); document.getElementById("lookbook")?.scrollIntoView({ behavior: "smooth" }); }}>المجموعة</button>
          <button onClick={() => { setCategory("الكفرات والحافظات"); document.getElementById("lookbook")?.scrollIntoView({ behavior: "smooth" }); }}>كفرات وحماية</button>
          <button onClick={() => { setCategory("أقلام الآيباد"); document.getElementById("lookbook")?.scrollIntoView({ behavior: "smooth" }); }}>أقلام</button>
          <button onClick={() => { setCategory("لوحات المفاتيح"); document.getElementById("lookbook")?.scrollIntoView({ behavior: "smooth" }); }}>لوحات مفاتيح</button>
        </nav>
        <div className="pl-tools">
          <button className={`pl-search-toggle ${searchOpen ? "open" : ""}`} onClick={() => setSearchOpen((open) => !open)} aria-label="بحث">
            {searchOpen ? <X size={17} /> : <Search size={17} />}
          </button>
          {searchOpen && <input autoFocus className="pl-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحثي عن قطعة..." />}
          <button className="pl-bag-button" onClick={() => { setBagOpen(true); setCheckout(false); setComplete(false); }} aria-label={`السلة، ${bagCount} قطعة`}>
            <ShoppingBag size={18} /><span>السلة</span><b>{bagCount}</b>
          </button>
        </div>
      </header>

      <main id="top">
        <section className="pl-hero">
          <div className="pl-hero-topline"><span>المجلد 01 / كل يوم</span><span>قطع مختارة بعناية</span></div>
          <div className="pl-hero-copy">
            <span className="pl-edition">PADHOUSE OBJECTS · 2025</span>
            <h1>الآيباد،<br /><em>على</em> كيفك.</h1>
            <p>قطعة صغيرة تغيّر شكل يومك.<br />اختاري اللي يشبه استخدامك، وخلي الباقي علينا.</p>
            <button className="pl-hero-link" onClick={() => document.getElementById("lookbook")?.scrollIntoView({ behavior: "smooth" })}>
              اكتشفي المجموعة <ArrowDownLeft size={17} />
            </button>
          </div>
          <div className="pl-hero-image">
            <span className="pl-image-stamp">اختاري<br />بذكاء</span>
            <img src={products[3].image} alt="كفر آيباد PadHouse مع كيبورد" />
            <div className="pl-image-caption"><span>01 — WORK / PLAY</span><span>مساحة جديدة، لكل فكرة</span></div>
          </div>
          <div className="pl-hero-vertical">إكسسوارات تواكب إيقاعك <span>—</span> نابلس، فلسطين</div>
          <span className="pl-hero-number">01</span>
        </section>

        <section className="pl-intro">
          <span className="pl-intro-index">01 / THE EDIT</span>
          <p>كل شيء يبدأ من <strong>اللمسة.</strong><br />والقطعة الصح؟ <strong>تكمّل الحكاية.</strong></p>
          <span className="pl-intro-note">إكسسوارات يومية<br />مصممة للحركة.</span>
        </section>

        <section className="pl-catalog" id="lookbook">
          <div className="pl-catalog-heading">
            <div><span className="pl-kicker">اختيرت لك · 05 قطع</span><h2>قِطَع<br /><i>تستاهل.</i></h2></div>
            <p>من أول سطر ملاحظات<br />لآخر مشوار في اليوم.</p>
            <span className="pl-side-note">المجموعة<br />01—05</span>
          </div>
          <div className="pl-filter-row">
            <div className="pl-filters" role="group" aria-label="فلترة المنتجات">
              {categories.map((item) => <button className={category === item ? "selected" : ""} key={item} onClick={() => setCategory(item)}>{item}</button>)}
            </div>
            <span className="pl-result-count">{shownProducts.length} منتجات <span>↙</span></span>
          </div>
          {shownProducts.length > 0 ? (
            <div className="pl-product-grid">
              {shownProducts.map((product, index) => (
                <article className={`pl-product-card pl-card-${product.id}`} key={product.id}>
                  <div className="pl-card-meta"><span>№ 0{index + 1}</span><span>{product.category}</span></div>
                  <button className="pl-product-image" onClick={() => { setActiveProduct(product); setSize(""); }} aria-label={`تفاصيل ${product.name}`}>
                    <span className="pl-photo-bg">{product.tag && <span className="pl-tag">{product.tag}</span>}</span>
                    <img src={product.image} alt={product.name} loading="eager" />
                    <span className="pl-view-arrow"><ArrowUpLeft size={18} /></span>
                  </button>
                  <button className={`pl-favorite ${favorites.includes(product.id) ? "saved" : ""}`} onClick={() => setFavorites((current) => current.includes(product.id) ? current.filter((id) => id !== product.id) : [...current, product.id])} aria-label={favorites.includes(product.id) ? "إزالة من المفضلة" : "إضافة للمفضلة"}>
                    <Heart size={17} fill={favorites.includes(product.id) ? "currentColor" : "none"} />
                  </button>
                  <div className="pl-product-detail">
                    <div><h3>{product.name}</h3><span>{product.description}</span></div>
                    <div className="pl-price-row"><b>{money(product.price)}</b><button onClick={() => { setActiveProduct(product); setSize(""); }} aria-label={`اختاري ${product.name}`}><Plus size={18} /></button></div>
                  </div>
                </article>
              ))}
              <aside className="pl-note-card">
                <span>ملاحظة من PadHouse</span>
                <p>شيّكي قياس الآيباد قبل ما تختاري الكفر.</p>
                <button onClick={() => setCategory("الكفرات والحافظات")}>تصفّحي الكفرات <ArrowLeft size={14} /></button>
                <b>02</b>
              </aside>
            </div>
          ) : (
            <div className="pl-no-results"><span>ما لقينا القطعة.</span><p>جرّبي كلمة ثانية أو ارجعي للمجموعة كاملة.</p><button onClick={() => { setQuery(""); setCategory("الكل"); }}>عرض كل المنتجات</button></div>
          )}
        </section>

        <section className="pl-last-word">
          <div><span>PADHOUSE / NOTE 02</span><h2>يومك<br /><i>على راحتك.</i></h2></div>
          <p>اختاري الأدوات اللي تخلي شغلك أخف، ووقتك أوسع.</p>
          <button onClick={() => document.getElementById("lookbook")?.scrollIntoView({ behavior: "smooth" })}>ارجعي للمجموعة <ArrowUpLeft size={17} /></button>
        </section>
      </main>

      <footer className="pl-footer"><span className="pl-footer-mark">ph.</span><span>PADHOUSE · إكسسوارات الآيباد</span><span>نابلس، فلسطين · تجربة كتالوج</span><span>01 — 05</span></footer>

      {activeProduct && (
        <div className="pl-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveProduct(null); }}>
          <section className="pl-product-modal" role="dialog" aria-modal="true" aria-labelledby="pl-modal-title">
            <button className="pl-modal-close" onClick={() => setActiveProduct(null)} aria-label="إغلاق"><X size={19} /></button>
            <div className="pl-modal-image"><img src={activeProduct.image} alt={activeProduct.name} /></div>
            <div className="pl-modal-copy">
              <span className="pl-kicker">{activeProduct.category} · PADHOUSE EDITION</span>
              <h2 id="pl-modal-title">{activeProduct.name}</h2>
              <p>{activeProduct.description}</p>
              <strong className="pl-modal-price">{money(activeProduct.price)} <small>شيكل</small></strong>
              {activeProduct.variants && <div className="pl-size-picker"><b>اختاري قياس جهازك</b><div>{activeProduct.variants.map((item) => <button className={size === item ? "chosen" : ""} key={item} onClick={() => setSize(item)}>{item}</button>)}</div></div>}
              <button className="pl-add-button" onClick={addProduct}>أضيفي للسلة <Plus size={17} /><span>{money(activeProduct.price)}</span></button>
              <small className="pl-modal-footnote">تأكدي من موديل جهازك قبل اختيار القياس.</small>
            </div>
          </section>
        </div>
      )}

      {bagOpen && (
        <div className="pl-overlay pl-bag-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDrawer(); }}>
          <aside className="pl-drawer" role="dialog" aria-modal="true" aria-label="سلة التسوق">
            <div className="pl-drawer-head"><span>{complete ? "تم تجهيز الطلب" : checkout ? "إتمام الطلب" : "اختياراتك"} <small>· {bagCount} قطع</small></span><button onClick={closeDrawer} aria-label="إغلاق"><X size={19} /></button></div>
            {complete ? (
              <div className="pl-complete"><span><Check size={23} /></span><h2>شكرًا {customer.name || "لك"}.</h2><p>هذا طلب تجريبي، لم يتم إرساله أو تحصيل أي مبلغ.</p><button onClick={() => { setBag([]); closeDrawer(); }}>العودة للمجموعة <ArrowLeft size={15} /></button></div>
            ) : checkout ? (
              <form className="pl-checkout" onSubmit={(event) => { event.preventDefault(); setComplete(true); }}>
                <p>بضع تفاصيل ونجهّز طلبك التجريبي.</p>
                <label>الاسم الكامل<input required value={customer.name} onChange={(event) => setCustomer((value) => ({ ...value, name: event.target.value }))} placeholder="اسمك" /></label>
                <label>رقم الهاتف<input required minLength={7} inputMode="tel" value={customer.phone} onChange={(event) => setCustomer((value) => ({ ...value, phone: event.target.value }))} placeholder="05X XXX XXXX" /></label>
                <div className="pl-drawer-total"><span>المجموع · توصيل يُؤكّد لاحقًا</span><b>{money(total)}</b></div>
                <button className="pl-submit-order" type="submit">تأكيد الطلب التجريبي <ArrowLeft size={16} /></button>
                <small>لا يتم إرسال بياناتك أو معالجة أي دفعة.</small>
                <button className="pl-back-to-bag" type="button" onClick={() => setCheckout(false)}>العودة للسلة</button>
              </form>
            ) : bag.length === 0 ? (
              <div className="pl-empty-bag"><ShoppingBag size={26} /><h2>لسّه ما اخترتي.</h2><p>القطع الحلوة ناطرتك في المجموعة.</p><button onClick={closeDrawer}>اكتشفي المجموعة <ArrowLeft size={15} /></button></div>
            ) : (
              <>
                <div className="pl-bag-lines">{bag.map((line, index) => (
                  <article className="pl-bag-line" key={`${line.product.id}-${line.size}-${index}`}>
                    <img src={line.product.image} alt="" />
                    <div className="pl-bag-line-info"><b>{line.product.name}</b><span>{line.size || "قطعة مختارة"}</span><div className="pl-qty"><button onClick={() => changeQty(line, -1)} aria-label="تقليل"><Minus size={12} /></button><span>{line.qty}</span><button onClick={() => changeQty(line, 1)} aria-label="زيادة"><Plus size={12} /></button></div></div>
                    <strong>{money(line.product.price * line.qty)}</strong>
                    <button className="pl-line-remove" onClick={() => setBag((current) => current.filter((item) => item !== line))} aria-label="إزالة المنتج"><X size={15} /></button>
                  </article>
                ))}</div>
                <div className="pl-drawer-total"><span>المجموع الفرعي</span><b>{money(total)}</b></div>
                <p className="pl-shipping-note">رسوم التوصيل تُحدد بحسب المنطقة عند تأكيد الطلب.</p>
                <button className="pl-submit-order" onClick={() => setCheckout(true)}>متابعة كضيفة <ArrowLeft size={16} /></button>
              </>
            )}
          </aside>
        </div>
      )}
      {notice && <div className="pl-toast" role="status">{notice}</div>}
    </div>
  );
}

export default PadHouseLookbook;
