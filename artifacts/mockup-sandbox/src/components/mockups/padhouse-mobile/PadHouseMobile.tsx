import { useMemo, useState } from "react";
import {
  ArrowLeft, Check, ChevronDown, Clock3, Heart, MapPin, Minus,
  PackageCheck, Plus, Search, ShieldCheck, ShoppingBag, Sparkles,
  Truck, X,
} from "lucide-react";
import "./padhousemobile.css";

type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  description: string;
  variants?: string[];
  colors?: string[];
  tag?: string;
};
type CartLine = { productId: string; variant: string; color: string; qty: number };
type Screen = "shop" | "cart" | "checkout" | "success";

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
    name: "كفر آيباد سيليكون شفاف",
    category: "الكفرات والحافظات",
    price: 25,
    image: "https://padhouse.ps/wp-content/uploads/2025/06/TC-1.jpg",
    description: "حماية خفيفة وشفافة تُظهر لون جهازك. اختاري قياس الآيباد المطابق.",
    variants: ["10.2 إنش", "10.9 / 11 إنش", "12.9 / 13 إنش"],
    tag: "خيار يومي",
  },
  {
    id: "carbon-case",
    name: "كفر نقش كاربون فايبر",
    category: "الكفرات والحافظات",
    price: 45,
    image: "https://padhouse.ps/wp-content/uploads/2025/10/Front-Black.jpg",
    description: "سيليكون بملمس نقش كاربون فايبر ولمسة عملية تحمي جهازك.",
    variants: ["10.2 إنش", "10.9 / 11 إنش", "12.9 / 13 إنش"],
    colors: ["أسود"],
  },
  {
    id: "keyboard-case",
    name: "كفر آيباد مع كيبورد وتتش باد",
    category: "لوحات المفاتيح",
    price: 160,
    image: "https://padhouse.ps/wp-content/uploads/2025/06/KTC-1.jpg",
    description: "مساحة عمل عملية مع كيبورد وتتش باد مدمجين.",
    variants: ["10.2 إنش", "10.9 / 11 إنش", "12.9 / 13 إنش"],
    colors: ["أسود"],
    tag: "للتركيز",
  },
  {
    id: "cable",
    name: "سلك شاحن Type‑C إلى iPhone",
    category: "الشواحن والكابلات",
    price: 35,
    image: "https://padhouse.ps/wp-content/uploads/2025/03/CA153-Cable.jpg",
    description: "سلك Yesido CA153 من Type‑C إلى iPhone.",
  },
];

const categories = ["الكل", "أقلام الآيباد", "الكفرات والحافظات", "لوحات المفاتيح", "الشواحن والكابلات"];
const destinations: Record<string, number> = {
  "الضفة الغربية": 20,
  "القدس": 30,
  "مناطق 48": 70,
  "استلام من نابلس": 0,
};
const money = (value: number) => `₪${new Intl.NumberFormat("ar").format(value)}`;

export function PadHouseMobile() {
  const [screen, setScreen] = useState<Screen>("shop");
  const [category, setCategory] = useState("الكل");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Product | null>(null);
  const [variant, setVariant] = useState("");
  const [color, setColor] = useState("");
  const [detailQty, setDetailQty] = useState(1);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [destination, setDestination] = useState("الضفة الغربية");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [orderRef, setOrderRef] = useState("");

  const filtered = useMemo(() => products.filter((product) => {
    const matchesCategory = category === "الكل" || product.category === category;
    const text = `${product.name} ${product.category}`.toLowerCase();
    return matchesCategory && text.includes(query.trim().toLowerCase()) &&
      (!favoritesOnly || favorites.includes(product.id));
  }), [category, query, favoritesOnly, favorites]);

  const count = cart.reduce((sum, line) => sum + line.qty, 0);
  const subtotal = cart.reduce((sum, line) => {
    const product = products.find((item) => item.id === line.productId);
    return sum + (product?.price ?? 0) * line.qty;
  }, 0);
  const delivery = destinations[destination] ?? 0;
  const total = subtotal + (cart.length ? delivery : 0);

  const openProduct = (product: Product) => {
    setSelected(product);
    setVariant("");
    setColor(product.colors?.[0] ?? "");
    setDetailQty(1);
  };

  const addToCart = () => {
    if (!selected || (selected.variants && !variant)) return;
    setCart((current) => {
      const existing = current.findIndex((line) =>
        line.productId === selected.id && line.variant === variant && line.color === color);
      if (existing < 0) return [...current, { productId: selected.id, variant, color, qty: detailQty }];
      return current.map((line, index) => index === existing ? { ...line, qty: line.qty + detailQty } : line);
    });
    setSelected(null);
  };

  const adjustQty = (index: number, amount: number) => {
    setCart((current) => current
      .map((line, lineIndex) => lineIndex === index ? { ...line, qty: line.qty + amount } : line)
      .filter((line) => line.qty > 0));
  };

  const placeOrder = () => {
    if (!name.trim() || phone.trim().replace(/\D/g, "").length < 8 ||
      (destination !== "استلام من نابلس" && !address.trim())) {
      setError("تأكدي من الاسم ورقم الهاتف وعنوان التوصيل.");
      return;
    }
    setError("");
    setOrderRef(`PH-${Math.floor(1000 + Math.random() * 8999)}`);
    setScreen("success");
  };

  const toggleFavorite = (id: string) => setFavorites((current) =>
    current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  const backToShop = () => {
    setScreen("shop");
    setError("");
  };

  return (
    <div className="phm-shell" dir="rtl" lang="ar">
      <div className="phm-topline"><Sparkles size={13} /> توصيل لكل فلسطين · خيارات دفع مرنة</div>
      <header className="phm-header">
        <button className="phm-brand" onClick={backToShop} aria-label="العودة للمتجر">
          <span className="phm-mark">P<span>H</span></span>
          <span className="phm-brand-copy"><b>PADHOUSE</b><small>تفاصيل تصنع فرقًا</small></span>
        </button>
        <div className="phm-header-right">
          <button className={`phm-header-icon ${favoritesOnly ? "is-active" : ""}`} aria-label="المفضلة" onClick={() => { setFavoritesOnly(!favoritesOnly); setScreen("shop"); }}>
            <Heart size={19} fill={favoritesOnly ? "currentColor" : "none"} />
          </button>
          <button className="phm-header-icon phm-cart-icon" aria-label="السلة" onClick={() => setScreen("cart")}>
            <ShoppingBag size={19} />{count > 0 && <span>{count}</span>}
          </button>
        </div>
      </header>

      {screen === "shop" && <main className="phm-main">
        <section className="phm-hero">
          <div className="phm-hero-glow" />
          <div className="phm-hero-copy">
            <span className="phm-eyebrow"><i /> يومك، على طريقتك</span>
            <h1>خلي الآيباد<br /><em>يشتغل معك.</em></h1>
            <p>إكسسوارات مختارة للدراسة، الشغل وكل الأفكار اللي على بالك.</p>
            <button className="phm-hero-link" onClick={() => document.getElementById("phm-products")?.scrollIntoView({ behavior: "smooth" })}>
              اكتشفي المنتجات <ArrowLeft size={15} />
            </button>
          </div>
          <div className="phm-hero-image">
            <div className="phm-orbit" />
            <img src={products[0].image} alt="قلم الباد هاوس" />
            <span className="phm-floating-tag">اختياركم<br /><b>الأول</b></span>
          </div>
          <div className="phm-hero-index"><b>01</b><span /> 05</div>
        </section>

        <section className="phm-trust-row" aria-label="مزايا المتجر">
          <div><Truck size={17} /><span>توصيل للباب<small>في كل فلسطين</small></span></div>
          <i />
          <div><ShieldCheck size={17} /><span>اختيار مضمون<small>دعم قبل الطلب</small></span></div>
          <i />
          <div><Clock3 size={17} /><span>طلب سريع<small>بدون إنشاء حساب</small></span></div>
        </section>

        <section className="phm-catalog" id="phm-products">
          <div className="phm-section-heading">
            <div><span className="phm-overline">مختارة إلك</span><h2>{favoritesOnly ? "قائمة المفضّلة" : "جهّزي آيبادك"}</h2></div>
            <span className="phm-count">{filtered.length.toString().padStart(2, "0")} منتجات</span>
          </div>
          <label className="phm-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="دوري على إشي معيّن..." /><kbd>⌕</kbd></label>
          <div className="phm-categories" role="tablist" aria-label="تصنيفات المنتجات">
            {categories.map((item, index) => <button key={item} role="tab" aria-selected={category === item} className={category === item ? "selected" : ""} onClick={() => setCategory(item)}>
              {index === 0 ? "الكل" : item}
            </button>)}
          </div>
          {filtered.length ? <div className="phm-products">
            {filtered.map((product, index) => (
              <article className="phm-product" key={product.id} style={{ animationDelay: `${index * 55}ms` }}>
                <button className={`phm-fave ${favorites.includes(product.id) ? "is-active" : ""}`} aria-label={favorites.includes(product.id) ? "إزالة من المفضلة" : "إضافة للمفضلة"} onClick={() => toggleFavorite(product.id)}>
                  <Heart size={16} fill={favorites.includes(product.id) ? "currentColor" : "none"} />
                </button>
                <button className="phm-product-open" onClick={() => openProduct(product)} aria-label={`تفاصيل ${product.name}`}>
                  <div className={`phm-product-image image-${product.id}`}>
                    <img src={product.image} alt={product.name} loading="lazy" />
                    {product.tag && <span className="phm-product-tag">{product.tag}</span>}
                    <span className="phm-quick-add"><Plus size={17} /></span>
                  </div>
                  <div className="phm-product-info">
                    <span className="phm-product-category">{product.category}</span>
                    <h3>{product.name}</h3>
                    <div className="phm-product-foot"><b>{money(product.price)}</b><small>شيكل</small></div>
                  </div>
                </button>
              </article>
            ))}
          </div> : <div className="phm-empty"><Heart size={22} /><b>ما في منتجات هون لسه</b><span>جرّبي تصنيف ثاني أو أضيفي منتجات للمفضلة.</span><button onClick={() => { setFavoritesOnly(false); setCategory("الكل"); setQuery(""); }}>عرض كل المنتجات</button></div>}
        </section>

        <section className="phm-pickup">
          <span className="phm-pickup-icon"><MapPin size={19} /></span>
          <div><b>قريبة من نابلس؟</b><span>استلمي طلبك مجانًا من الفرع.</span></div>
          <button onClick={() => { setDestination("استلام من نابلس"); setScreen("cart"); }}>اعرفي أكثر <ArrowLeft size={14} /></button>
        </section>
        <footer className="phm-footer"><span>PADHOUSE</span><small>كل اللي بتحبيه لآيبادك، بمكان واحد.</small></footer>
      </main>}

      {screen === "cart" && <main className="phm-main phm-flow">
        <button className="phm-back" onClick={backToShop}><ArrowLeft size={16} /> متابعة التسوق</button>
        <div className="phm-flow-title"><span className="phm-overline">خطوة 01 · مراجعة</span><h1>سلّتك <small>{count} قطع</small></h1></div>
        {cart.length ? <>
          <div className="phm-cart-lines">{cart.map((line, index) => {
            const product = products.find((item) => item.id === line.productId)!;
            return <article className="phm-cart-line" key={`${line.productId}-${line.variant}-${line.color}`}>
              <div className={`phm-cart-thumb image-${product.id}`}><img src={product.image} alt="" /></div>
              <div className="phm-cart-detail"><span>{product.category}</span><b>{product.name}</b>
                {(line.variant || line.color) && <small>{[line.variant, line.color].filter(Boolean).join(" · ")}</small>}
                <strong>{money(product.price)}</strong>
              </div>
              <div className="phm-qty-control">
                <button aria-label="زيادة الكمية" onClick={() => adjustQty(index, 1)}><Plus size={14} /></button><b>{line.qty}</b>
                <button aria-label="تقليل الكمية" onClick={() => adjustQty(index, -1)}><Minus size={14} /></button>
              </div>
            </article>;
          })}</div>
          <div className="phm-cart-extra"><Sparkles size={16} /><span>راجعي قياس جهازك قبل تأكيد الطلب، وراسلينا إذا احتجتِ مساعدة.</span></div>
          <div className="phm-total-card">
            <div><span>المجموع الفرعي</span><b>{money(subtotal)}</b></div>
            <div><span>التوصيل <small>حسب المنطقة</small></span><b>{money(delivery)}</b></div>
            <div className="phm-grand-total"><span>الإجمالي</span><b>{money(total)}</b></div>
            <button className="phm-primary-button" onClick={() => setScreen("checkout")}>لإتمام الطلب <ArrowLeft size={17} /></button>
            <p><ShieldCheck size={13} /> طلب ضيف · ما في داعي لإنشاء حساب</p>
          </div>
        </> : <div className="phm-empty phm-cart-empty"><span className="phm-empty-bag"><ShoppingBag size={25} /></span><b>سلّتك لسه فاضية</b><span>اختاري قطعة بتحبيها، ومنكمل سوا.</span><button onClick={backToShop}>تصفّحي المنتجات <ArrowLeft size={14} /></button></div>}
      </main>}

      {screen === "checkout" && <main className="phm-main phm-flow">
        <button className="phm-back" onClick={() => setScreen("cart")}><ArrowLeft size={16} /> العودة للسلة</button>
        <div className="phm-flow-title"><span className="phm-overline">خطوة 02 · بدون حساب</span><h1>وين نوصّل؟</h1><p>بس تفاصيل بسيطة، وفريقنا بتواصل معك لتأكيد الطلب.</p></div>
        <div className="phm-checkout-card">
          <div className="phm-field"><label htmlFor="phm-name">الاسم الكامل <i>*</i></label><input id="phm-name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="مثال: ليان أحمد" /></div>
          <div className="phm-field"><label htmlFor="phm-phone">رقم الهاتف <i>*</i></label><input id="phm-phone" type="tel" autoComplete="tel" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="059 000 0000" /></div>
          <div className="phm-field"><label htmlFor="phm-email">البريد الإلكتروني <small>اختياري</small></label><input id="phm-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@email.com" /></div>
          <div className="phm-field"><label htmlFor="phm-destination">منطقة التوصيل <i>*</i></label><div className="phm-select-wrap"><select id="phm-destination" value={destination} onChange={(event) => setDestination(event.target.value)}>{Object.keys(destinations).map((place) => <option key={place}>{place}</option>)}</select><ChevronDown size={17} /></div></div>
          {destination !== "استلام من نابلس" && <div className="phm-field"><label htmlFor="phm-address">العنوان بالتفصيل <i>*</i></label><input id="phm-address" autoComplete="street-address" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="المدينة، الحي، أقرب نقطة دالة" /></div>}
          <div className="phm-field"><label htmlFor="phm-notes">ملاحظات للمندوب <small>اختياري</small></label><textarea id="phm-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="أي تفاصيل بتسهّل التوصيل..." rows={3} /></div>
        </div>
        <div className="phm-payment-note"><span><PackageCheck size={17} /></span><div><b>الدفع عند الاستلام</b><small>بتأكدي الطلب مع فريق المتجر قبل الإرسال.</small></div><Check size={17} /></div>
        <div className="phm-check-total"><span>الإجمالي شامل التوصيل</span><b>{money(total)}</b></div>
        {error && <div className="phm-form-error" role="alert">{error}</div>}
        <button className="phm-primary-button phm-confirm" onClick={placeOrder}>تأكيد الطلب <ArrowLeft size={17} /></button>
        <p className="phm-privacy"><ShieldCheck size={13} /> معلوماتك تُستخدم لتجهيز هذا الطلب فقط.</p>
      </main>}

      {screen === "success" && <main className="phm-main phm-success-page">
        <div className="phm-success-art"><span><PackageCheck size={33} /></span><i className="spark spark-one">✳</i><i className="spark spark-two">✦</i></div>
        <span className="phm-overline">وصلنا طلبك</span>
        <h1>يسعدنا اختيارك<br />يا {name || "صديقتنا"}.</h1>
        <p>هذا تأكيد تجريبي للواجهة. فريق المتجر رح يتواصل معك لتأكيد تفاصيل الطلب.</p>
        <div className="phm-order-summary">
          <div><span>رقم الطلب</span><b>{orderRef}</b></div>
          <div><span>التوصيل إلى</span><b>{destination}</b></div>
          <div><span>الإجمالي</span><b>{money(total)}</b></div>
          <div><span>طريقة الدفع</span><b>عند الاستلام</b></div>
        </div>
        <button className="phm-primary-button" onClick={() => { setCart([]); setScreen("shop"); setName(""); setPhone(""); setAddress(""); }}>العودة للمتجر <ArrowLeft size={17} /></button>
        <small className="phm-demo-caption">لم يتم إرسال طلب حقيقي أو معالجة دفعة.</small>
      </main>}

      {screen === "shop" && count > 0 && <button className="phm-mobile-cart-dock" onClick={() => setScreen("cart")}>
        <span className="phm-dock-bag"><ShoppingBag size={17} /><i>{count}</i></span><span>عرض السلة</span><b>{money(subtotal)}</b><ArrowLeft size={16} />
      </button>}

      {selected && <div className="phm-sheet-scrim" onClick={() => setSelected(null)}>
        <section className="phm-sheet" role="dialog" aria-modal="true" aria-labelledby="phm-detail-title" onClick={(event) => event.stopPropagation()}>
          <div className="phm-sheet-handle" />
          <button className="phm-sheet-close" aria-label="إغلاق" onClick={() => setSelected(null)}><X size={18} /></button>
          <div className={`phm-sheet-image image-${selected.id}`}><img src={selected.image} alt={selected.name} />{selected.tag && <span>{selected.tag}</span>}</div>
          <div className="phm-sheet-content">
            <span className="phm-overline">{selected.category}</span><h2 id="phm-detail-title">{selected.name}</h2>
            <p>{selected.description}</p><strong className="phm-sheet-price">{money(selected.price)} <small>شيكل</small></strong>
            {selected.variants && <div className="phm-options"><b>اختاري قياس الآيباد <i>*</i></b><div>{selected.variants.map((item) => <button key={item} className={variant === item ? "active" : ""} onClick={() => setVariant(item)}>{item}{variant === item && <Check size={13} />}</button>)}</div></div>}
            {selected.colors && <div className="phm-options"><b>اللون</b><div>{selected.colors.map((item) => <button key={item} className={color === item ? "active" : ""} onClick={() => setColor(item)}>{item}{color === item && <Check size={13} />}</button>)}</div></div>}
            {selected.variants && !variant && <span className="phm-prompt">اختاري القياس المناسب قبل الإضافة.</span>}
            <div className="phm-sheet-actions">
              <div className="phm-qty-control phm-detail-qty"><button aria-label="زيادة الكمية" onClick={() => setDetailQty(detailQty + 1)}><Plus size={14} /></button><b>{detailQty}</b><button aria-label="تقليل الكمية" onClick={() => setDetailQty(Math.max(1, detailQty - 1))}><Minus size={14} /></button></div>
              <button className="phm-primary-button" disabled={Boolean(selected.variants && !variant)} onClick={addToCart}>أضيفي للسلة · {money(selected.price * detailQty)} <ShoppingBag size={16} /></button>
            </div>
          </div>
        </section>
      </div>}
    </div>
  );
}
