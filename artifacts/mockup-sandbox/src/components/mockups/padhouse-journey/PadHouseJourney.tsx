import { useMemo, useState } from "react";
import {
  ArrowLeft, ArrowRight, Check, ChevronLeft, Clock3,
  Heart, MapPin, Minus, PackageCheck, Plus, Search, ShieldCheck,
  ShoppingBag, ShoppingCart, Sparkles, Truck, X,
} from "lucide-react";
import "./padhousejourney.css";

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
type View = "catalog" | "cart" | "checkout" | "success";

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
    name: "كفر ايباد سليكون شفاف",
    category: "الكفرات والحافظات",
    price: 25,
    image: "https://padhouse.ps/wp-content/uploads/2025/06/TC-1.jpg",
    description: "حماية خفيفة وشفافة تُظهر لون جهازك. اختر قياس الآيباد المطابق.",
    variants: ["10.2 إنش", "10.9 / 11 إنش", "12.9 / 13 إنش"],
    tag: "اختيار القياس",
  },
  {
    id: "carbon-case",
    name: "كفر نقش كاربون فايبر",
    category: "الكفرات والحافظات",
    price: 45,
    image: "https://padhouse.ps/wp-content/uploads/2025/10/Front-Black.jpg",
    description: "سيليكون غير شفاف بملمس نقش كاربون فايبر ولمسة عملية.",
    variants: ["10.2 إنش", "10.9 / 11 إنش", "12.9 / 13 إنش"],
    colors: ["أسود"],
  },
  {
    id: "keyboard-case",
    name: "كفر ايباد مع كيبورد وتتش باد",
    category: "لوحات المفاتيح",
    price: 160,
    image: "https://padhouse.ps/wp-content/uploads/2025/06/KTC-1.jpg",
    description: "مساحة عمل عملية مع كيبورد وتتش باد مدمجين.",
    variants: ["10.2 إنش", "10.9 / 11 إنش", "12.9 / 13 إنش"],
    colors: ["أسود"],
    tag: "كيبورد + تتش باد",
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
const fmt = (value: number) => `₪${new Intl.NumberFormat("ar").format(value)}`;

export function PadHouseJourney() {
  const [view, setView] = useState<View>("catalog");
  const [category, setCategory] = useState("الكل");
  const [query, setQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [variant, setVariant] = useState("");
  const [color, setColor] = useState("");
  const [detailQty, setDetailQty] = useState(1);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [destination, setDestination] = useState("الضفة الغربية");
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [toast, setToast] = useState("");
  const [orderRef, setOrderRef] = useState("");
  const [payment, setPayment] = useState("عند الاستلام (محاكاة)");

  const filteredProducts = useMemo(() => products.filter((product) => {
    const matchesCategory = category === "الكل" || product.category === category;
    const normalizedQuery = query.trim().toLowerCase();
    return matchesCategory && (!normalizedQuery || `${product.name} ${product.category}`.toLowerCase().includes(normalizedQuery));
  }), [category, query]);
  const subtotal = cart.reduce((sum, line) => sum + (products.find((p) => p.id === line.productId)?.price ?? 0) * line.qty, 0);
  const delivery = destinations[destination] ?? 20;
  const total = subtotal + delivery;
  const cartCount = cart.reduce((sum, line) => sum + line.qty, 0);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2500);
  };
  const openProduct = (product: Product) => {
    setSelectedProduct(product);
    setVariant("");
    setColor(product.colors?.[0] ?? "");
    setDetailQty(1);
  };
  const addToCart = () => {
    if (!selectedProduct) return;
    if (selectedProduct.variants?.length && !variant) {
      notify("اختاري قياس جهازك أولًا");
      return;
    }
    if (selectedProduct.colors?.length && !color) {
      notify("اختاري اللون أولًا");
      return;
    }
    const selectedVariant = variant || "";
    const selectedColor = color || "";
    setCart((current) => {
      const existing = current.find((line) => line.productId === selectedProduct.id && line.variant === selectedVariant && line.color === selectedColor);
      return existing
        ? current.map((line) => line === existing ? { ...line, qty: line.qty + detailQty } : line)
        : [...current, { productId: selectedProduct.id, variant: selectedVariant, color: selectedColor, qty: detailQty }];
    });
    setSelectedProduct(null);
    setView("cart");
    notify("انضاف المنتج للسلة");
  };
  const updateQuantity = (line: CartLine, amount: number) => {
    setCart((current) => current.map((entry) => entry === line ? { ...entry, qty: Math.max(1, entry.qty + amount) } : entry));
  };
  const removeLine = (line: CartLine) => setCart((current) => current.filter((entry) => entry !== line));
  const goCheckout = () => {
    setStep(0);
    setView("checkout");
  };
  const nextStep = () => {
    if (step === 0 && (!name.trim() || phone.trim().replace(/\D/g, "").length < 7)) {
      notify("اكتبي الاسم ورقم هاتف صحيح للمتابعة");
      return;
    }
    if (step === 1 && destination !== "استلام من نابلس" && !address.trim()) {
      notify("أضيفي عنوان التوصيل بالتفصيل");
      return;
    }
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    setOrderRef(`PH-DEMO-${String(Date.now()).slice(-5)}`);
    setView("success");
  };

  const header = (
    <>
      <div className="pj-topline">توصيل لكل فلسطين · رسوم مرجعية حسب المنطقة · لا دفع فعلي في هذه التجربة</div>
      <header className="pj-header">
        <div className="pj-header-inner">
          <button className="pj-logo" onClick={() => setView("catalog")} aria-label="الرئيسية">
            <span className="pj-logo-mark">ph</span>
            <span className="pj-logo-word"><strong>PADHOUSE</strong><small>إكسسوارات الآيباد</small></span>
          </button>
          <nav className="pj-nav" aria-label="التنقل الرئيسي">
            <button onClick={() => { setView("catalog"); setCategory("الكل"); }}>الرئيسية</button>
            <button onClick={() => { setView("catalog"); setCategory("الكفرات والحافظات"); }}>الكفرات والحافظات</button>
            <button onClick={() => { setView("catalog"); setCategory("أقلام الآيباد"); }}>الأقلام</button>
            <button onClick={() => { setView("catalog"); setCategory("لوحات المفاتيح"); }}>لوحات المفاتيح</button>
          </nav>
          <div className="pj-header-actions">
            {view === "catalog" && <label className="pj-search-mini"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث عن إكسسوار" /></label>}
            <button className="pj-icon-btn" onClick={() => setView(view === "cart" ? "catalog" : "cart")} aria-label="السلة">
              <ShoppingBag size={18} />{cartCount > 0 && <span className="pj-cart-count">{cartCount}</span>}
            </button>
          </div>
        </div>
      </header>
    </>
  );

  const productGrid = (
    <div className="pj-products">
      {filteredProducts.length ? filteredProducts.map((product) => (
        <article className="pj-product" key={product.id}>
          <button className="pj-product-visual" onClick={() => openProduct(product)} aria-label={`تفاصيل ${product.name}`}>
            {product.tag && <span className="pj-product-tag">{product.tag}</span>}
            <img src={product.image} alt={product.name} />
          </button>
          <button
            className={`pj-heart ${favorites.includes(product.id) ? "saved" : ""}`}
            aria-label="حفظ في المفضلة"
            onClick={() => setFavorites((current) => current.includes(product.id) ? current.filter((id) => id !== product.id) : [...current, product.id])}
          ><Heart size={16} fill={favorites.includes(product.id) ? "currentColor" : "none"} /></button>
          <div className="pj-product-info">
            <span className="pj-product-kind">{product.category}</span>
            <h3>{product.name}</h3>
            <div className="pj-product-bottom">
              <span className="pj-price">{fmt(product.price)} <small>شيكل</small></span>
              <button className="pj-add-mini" onClick={() => openProduct(product)} aria-label={`اختيار ${product.name}`}><Plus size={17} /></button>
            </div>
            {product.variants && <div className="pj-stock-note">يتطلب اختيار قياس الآيباد</div>}
          </div>
        </article>
      )) : <div className="pj-none">ما لقينا منتج بهذا الاسم. جرّبي بحثًا آخر أو اختاري تصنيفًا مختلفًا.</div>}
    </div>
  );

  const catalogView = (
    <>
      <main className="pj-page">
        <div className="pj-breadcrumb"><button onClick={() => setCategory("الكل")}>الرئيسية</button><ChevronLeft size={12} /><strong>الكتالوج</strong></div>
        <section className="pj-hero">
          <div className="pj-hero-copy">
            <span className="pj-kicker">اختاري المناسب لجهازك</span>
            <h1>تفاصيل صغيرة.<br />فرق كبير كل يوم.</h1>
            <p>إكسسوارات الآيباد اللي تحتاجيها، مع معلومات واضحة ومقاسات تختاريها بثقة.</p>
            <button className="pj-btn" onClick={() => document.getElementById("pj-catalog")?.scrollIntoView({ behavior: "smooth" })}>تصفّحي الكتالوج <ArrowLeft size={15} /></button>
          </div>
          <div className="pj-hero-visual">
            <span className="pj-hero-orbit" />
            <img className="pj-hero-art" src={products[0].image} alt="قلم PadHouse للآيباد" />
            <span className="pj-sticker">اختيار<br />يستاهل</span>
          </div>
        </section>
        <section id="pj-catalog">
          <div className="pj-section-head">
            <div><span className="pj-kicker">من رفوفنا</span><h2>الكتالوج</h2><p>اختاري المنتج، ثم تأكدي من قياس جهازك.</p></div>
            <span className="pj-count">{filteredProducts.length} منتجات</span>
          </div>
          <div className="pj-categories">{categories.map((item) => <button key={item} className={`pj-chip ${item === category ? "active" : ""}`} onClick={() => setCategory(item)}>{item}</button>)}</div>
          {productGrid}
        </section>
        <section className="pj-feature-strip">
          <div className="pj-feature"><span className="pj-feature-icon"><Truck size={17} /></span><span><strong>توصيل بحسب الوجهة</strong><small>اختاري المنطقة وشوفي الرسوم قبل الطلب</small></span></div>
          <div className="pj-feature"><span className="pj-feature-icon"><ShieldCheck size={17} /></span><span><strong>معلومة أوضح</strong><small>اختاري مقاس الآيباد من صفحة المنتج</small></span></div>
          <div className="pj-feature"><span className="pj-feature-icon"><Clock3 size={17} /></span><span><strong>رحلة شراء كضيف</strong><small>بدون إنشاء حساب أو بيانات محفوظة</small></span></div>
        </section>
      </main>
      <footer className="pj-footer"><span>PADHOUSE · تجربة واجهة توضيحية</span><span>الأسعار والتوصيل مرجعية؛ لا يتم إرسال طلب حقيقي.</span></footer>
    </>
  );

  const cartView = (
    <main className="pj-page">
      <div className="pj-breadcrumb"><button onClick={() => setView("catalog")}>الكتالوج</button><ChevronLeft size={12} /><strong>سلة التسوق</strong></div>
      <div className="pj-section-head" style={{ marginTop: 0 }}>
        <div><span className="pj-kicker">مراجعة الاختيارات</span><h2>سلتك</h2><p>{cartCount} قطع في السلة</p></div>
        <button className="pj-back" onClick={() => setView("catalog")}><ArrowRight size={14} /> متابعة التسوق</button>
      </div>
      {cart.length === 0 ? <div className="pj-empty">
        <span className="pj-empty-icon"><ShoppingCart size={23} /></span>
        <h2>سلتك فاضية حاليًا</h2><p>تصفّحي الكتالوج واختاري إكسسواراتك المفضلة.</p>
        <button className="pj-btn" onClick={() => setView("catalog")}>استكشاف المنتجات</button>
      </div> : <div className="pj-cart-layout">
        <div className="pj-cart-lines">
          {cart.map((line, index) => {
            const product = products.find((item) => item.id === line.productId)!;
            return <article className="pj-cart-line" key={`${line.productId}-${line.variant}-${index}`}>
              <div className="pj-cart-image"><img src={product.image} alt="" /></div>
              <div className="pj-cart-info">
                <h3>{product.name}</h3>
                <p>{line.variant && `القياس: ${line.variant}`}{line.variant && line.color ? " · " : ""}{line.color && `اللون: ${line.color}`}{!line.variant && !line.color && "تفاصيل المنتج كما في الكتالوج"}</p>
                <div className="pj-cart-controls">
                  <div className="pj-qty"><button onClick={() => updateQuantity(line, -1)} aria-label="تقليل الكمية"><Minus size={13} /></button><b>{line.qty}</b><button onClick={() => updateQuantity(line, 1)} aria-label="زيادة الكمية"><Plus size={13} /></button></div>
                  <button className="pj-remove" onClick={() => removeLine(line)}>إزالة</button>
                </div>
              </div>
              <div className="pj-cart-price"><strong>{fmt(product.price * line.qty)}</strong></div>
            </article>;
          })}
        </div>
        <aside className="pj-summary">
          <h3>ملخص الطلب</h3>
          <div className="pj-summary-line"><span>المجموع الفرعي</span><b>{fmt(subtotal)}</b></div>
          <label className="pj-choice-label" htmlFor="pj-destination-cart">منطقة التوصيل</label>
          <select id="pj-destination-cart" value={destination} onChange={(event) => setDestination(event.target.value)}>
            {Object.keys(destinations).map((place) => <option key={place}>{place}</option>)}
          </select>
          <div className="pj-summary-line"><span>رسوم التوصيل</span><b>{fmt(delivery)}</b></div>
          <div className="pj-summary-line total"><span>الإجمالي</span><b>{fmt(total)}</b></div>
          <p className="pj-caption">رسوم مرجعية بحسب الوجهة، وقد تتغير. سيتم تأكيدها من المتجر قبل أي طلب فعلي.</p>
          <button className="pj-btn full" onClick={goCheckout}>إتمام الشراء كضيف <ArrowLeft size={15} /></button>
          <p className="pj-caption" style={{ textAlign: "center" }}>لا حاجة لإنشاء حساب · لا يتم تحصيل أي مبلغ</p>
        </aside>
      </div>}
    </main>
  );

  const checkoutView = (
    <main className="pj-page">
      <div className="pj-checkout">
        <div className="pj-checkout-top">
          <div><h1>إتمام الشراء</h1><p>تسوّقي كضيفة، خطوات بسيطة ونوضح لك كل الرسوم.</p></div>
          <button className="pj-back" onClick={() => setView("cart")}><ArrowRight size={14} /> العودة للسلة</button>
        </div>
        <div className="pj-steps">
          {["معلوماتك", "التوصيل", "الدفع", "المراجعة"].map((label, index) => <div key={label} className={`pj-step ${index === step ? "active" : index < step ? "complete" : ""}`}>
            <span className="pj-step-circle">{index < step ? <Check size={13} /> : index + 1}</span><span>{label}</span>
          </div>)}
        </div>
        <div className="pj-checkout-layout">
          <section className="pj-check-card">
            {step === 0 && <>
              <h2>معلومات التواصل</h2><p>رحلتك كضيف — معلوماتك محلية في هذا النموذج فقط.</p>
              <div className="pj-field"><label htmlFor="pj-name">الاسم الكامل *</label><input id="pj-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="الاسم كما تحبي نستلم الطلب" autoComplete="name" /></div>
              <div className="pj-two-fields">
                <div className="pj-field"><label htmlFor="pj-phone">رقم الهاتف *</label><input id="pj-phone" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="05X XXX XXXX" dir="ltr" inputMode="tel" autoComplete="tel" /></div>
                <div className="pj-field"><label htmlFor="pj-email">البريد الإلكتروني <span style={{ color: "#869291", fontWeight: 400 }}>اختياري</span></label><input id="pj-email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" dir="ltr" autoComplete="email" /></div>
              </div>
              <div className="pj-alert">لن يتم إنشاء حساب أو حفظ معلوماتك في هذه التجربة.</div>
            </>}
            {step === 1 && <>
              <h2>وين بتحبي نوصّل؟</h2><p>رسوم التوصيل تتغير تلقائيًا حسب المنطقة المختارة.</p>
              <div className="pj-field"><label htmlFor="pj-destination">منطقة التوصيل</label><select id="pj-destination" value={destination} onChange={(event) => setDestination(event.target.value)}>{Object.keys(destinations).map((place) => <option key={place}>{place}</option>)}</select></div>
              {destination !== "استلام من نابلس" ? <>
                <div className="pj-field"><label htmlFor="pj-address">العنوان بالتفصيل *</label><textarea id="pj-address" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="المدينة، الحي، الشارع، أقرب علامة" autoComplete="street-address" /></div>
                <div className="pj-field"><label htmlFor="pj-notes">تعليمات للمندوب <span style={{ color: "#869291", fontWeight: 400 }}>اختياري</span></label><input id="pj-notes" value={deliveryNotes} onChange={(event) => setDeliveryNotes(event.target.value)} placeholder="أي شيء يساعدنا نوصل لك" /></div>
              </> : <div className="pj-alert">استلام محلي مجاني من نابلس بحسب المعلومة المنشورة.</div>}
              <div className="pj-fee-card"><span><strong>رسوم التوصيل المرجعية</strong><small><MapPin size={11} style={{ display: "inline", verticalAlign: "-2px" }} /> {destination} · المدة المنشورة 1–3 أيام عمل</small></span><b>{fmt(delivery)}</b></div>
            </>}
            {step === 2 && <>
              <h2>طريقة الدفع</h2><p>اختاري طريقة للعرض — لن يتم تنفيذ أو تحصيل أي دفع.</p>
              {["عند الاستلام (محاكاة)", "الدفع الإلكتروني — غير متاح"].map((method) => <label className="pj-radio" key={method}>
                <input type="radio" name="payment" value={method} checked={payment === method} onChange={() => setPayment(method)} />
                <span><strong>{method}</strong><small>{method.startsWith("عند") ? "يتم تأكيد طريقة الدفع الفعلية مع المتجر." : "إعداد الدفع غير متصل في هذه التجربة."}</small></span>
              </label>)}
              <div className="pj-alert">لا توجد وسيلة دفع فعلية مفعّلة هنا. لن تُخصم أي مبالغ.</div>
            </>}
            {step === 3 && <>
              <h2>مراجعة الطلب</h2><p>راجعي المنتجات والتوصيل قبل تأكيد الطلب التجريبي.</p>
              <div className="pj-order-item"><span>الاسم</span><b>{name}</b></div>
              <div className="pj-order-item"><span>الهاتف</span><b dir="ltr">{phone}</b></div>
              <div className="pj-order-item"><span>الوجهة</span><b>{destination}</b></div>
              {address && <div className="pj-order-item"><span>العنوان</span><b>{address}</b></div>}
              <div className="pj-order-item"><span>الدفع</span><b>{payment}</b></div>
              <div className="pj-alert">بتأكيدك ننشئ رقم طلب تجريبي فقط. ما في إرسال طلب فعلي للمتجر.</div>
            </>}
            <div className="pj-check-actions">
              {step > 0 ? <button className="pj-btn secondary" onClick={() => setStep(step - 1)}><ArrowRight size={14} /> السابق</button> : <span />}
              <button className="pj-btn" onClick={nextStep}>{step === 3 ? "تأكيد الطلب التجريبي" : "متابعة"} <ArrowLeft size={14} /></button>
            </div>
          </section>
          <aside className="pj-summary">
            <h3>ملخص الطلب <span className="pj-count">· {cartCount} قطع</span></h3>
            {cart.map((line, index) => {
              const product = products.find((item) => item.id === line.productId)!;
              return <div className="pj-summary-line" key={`${line.productId}-${index}`}><span>{product.name} × {line.qty}{line.variant && <small style={{ display: "block", marginTop: 2 }}>{line.variant}</small>}</span><b>{fmt(product.price * line.qty)}</b></div>;
            })}
            <div className="pj-summary-line"><span>المجموع الفرعي</span><b>{fmt(subtotal)}</b></div>
            <div className="pj-summary-line"><span>التوصيل · {destination}</span><b>{fmt(delivery)}</b></div>
            <div className="pj-summary-line total"><span>الإجمالي</span><b>{fmt(total)}</b></div>
            <p className="pj-caption">رسوم توصيل مرجعية، مرتبطة بالوجهة وتظهر قبل تأكيد الطلب.</p>
          </aside>
        </div>
      </div>
    </main>
  );

  const successView = (
    <main className="pj-page">
      <section className="pj-success">
        <span className="pj-success-mark"><PackageCheck size={30} /></span>
        <span className="pj-kicker">تم تجهيز طلب تجريبي</span>
        <h1>شكرًا يا {name || "صديقتنا"}!</h1>
        <p>هذا ملخص تجريبي فقط. ما أرسلنا طلبًا للمتجر وما عالجنا أي دفعة.</p>
        <div className="pj-success-total"><span>رقم الطلب · {orderRef}</span><strong>{fmt(total)}</strong></div>
        <div className="pj-order-item"><span>وجهة التوصيل</span><b>{destination} · {fmt(delivery)}</b></div>
        <div className="pj-order-item"><span>الحالة</span><b>بانتظار تأكيد المتجر</b></div>
        <button className="pj-btn full" style={{ marginTop: 17 }} onClick={() => { setView("catalog"); setCart([]); }}>العودة للكتالوج <ArrowLeft size={14} /></button>
      </section>
    </main>
  );

  return <div className="pj-shell" dir="rtl" lang="ar">
    {header}
    {view === "catalog" && catalogView}
    {view === "cart" && cartView}
    {view === "checkout" && checkoutView}
    {view === "success" && successView}
    {selectedProduct && <div className="pj-overlay" onClick={() => setSelectedProduct(null)}>
      <section className="pj-modal" role="dialog" aria-modal="true" aria-labelledby="pj-detail-title" onClick={(event) => event.stopPropagation()}>
        <div className="pj-modal-head"><span>تفاصيل المنتج · معلومات الكتالوج</span><button className="pj-close" onClick={() => setSelectedProduct(null)} aria-label="إغلاق"><X size={17} /></button></div>
        <div className="pj-product-detail">
          <div className="pj-detail-photo"><img src={selectedProduct.image} alt={selectedProduct.name} /></div>
          <div className="pj-detail-copy">
            <span className="pj-kicker">{selectedProduct.category}</span>
            <h2 id="pj-detail-title">{selectedProduct.name}</h2>
            <span className="pj-detail-price">{fmt(selectedProduct.price)} <small style={{ font: "500 10px Cairo", color: "#77878a" }}>شيكل</small></span>
            <p>{selectedProduct.description}</p>
            {selectedProduct.variants && <>
              <span className="pj-choice-label">اختاري قياس الآيباد <span style={{ color: "#b45f52" }}>*</span></span>
              <div className="pj-variant-list">{selectedProduct.variants.map((item) => <button key={item} className={`pj-variant ${variant === item ? "selected" : ""}`} onClick={() => setVariant(item)}>{item}</button>)}</div>
            </>}
            {selectedProduct.colors && <>
              <span className="pj-choice-label">اللون</span>
              <div className="pj-variant-list">{selectedProduct.colors.map((item) => <button key={item} className={`pj-variant ${color === item ? "selected" : ""}`} onClick={() => setColor(item)}>{item}</button>)}</div>
            </>}
            <div className="pj-detail-note"><Sparkles size={12} style={{ display: "inline", verticalAlign: "-2px", marginLeft: 4 }} /> راجعي قياس جهازك قبل الطلب؛ توافق بعض الموديلات يحتاج تأكيدًا من المتجر.</div>
            <div className="pj-detail-action">
              <div className="pj-qty"><button onClick={() => setDetailQty(Math.max(1, detailQty - 1))} aria-label="تقليل الكمية"><Minus size={13} /></button><b>{detailQty}</b><button onClick={() => setDetailQty(detailQty + 1)} aria-label="زيادة الكمية"><Plus size={13} /></button></div>
              <button className="pj-btn" style={{ flex: 1 }} onClick={addToCart}><ShoppingCart size={15} /> أضيفي للسلة · {fmt(selectedProduct.price * detailQty)}</button>
            </div>
          </div>
        </div>
      </section>
    </div>}
    {toast && <div className="pj-toast" role="status">{toast}</div>}
  </div>;
}
