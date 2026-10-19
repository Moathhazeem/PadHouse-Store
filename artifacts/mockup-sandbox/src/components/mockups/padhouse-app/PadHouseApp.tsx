import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowLeft, ArrowUpDown, BadgeCheck, BarChart3, Bot, CalendarDays, Check,
  CheckCircle2, ChevronLeft, CircleAlert, ClipboardList, Clock3, Copy,
  CreditCard, FileText, Grid2X2, Heart, HelpCircle, Home, LayoutDashboard,
  LockKeyhole, LogOut, MapPin, Megaphone, MessageCircle, Minus, Package,
  Pencil, Phone, Plus, RefreshCw, Search, Send, Settings, ShieldCheck,
  ShoppingBag, ShoppingCart, SlidersHorizontal, Smartphone, Sparkles,
  Tag, Trash2, Truck, UserRound, Users, Workflow, X,
} from "lucide-react";
import "./padhouse.css";

type Product = {
  id: string; name: string; price: number; image: string; kind: string;
  variants?: string[]; colors?: string[]; description: string; specs: string[];
  compatibility: string; warranty: string;
};
type CartLine = { productId: string; qty: number; variant?: string; color?: string };
type Page =
  | "home" | "categories" | "category" | "search" | "product" | "favorites" | "cart"
  | "checkout" | "confirmation" | "orders" | "tracking" | "profile" | "signin"
  | "register" | "forgot" | "finder" | "finderResults" | "chat" | "support" | "faq"
  | "escalation" | "compare" | "adminGate" | "admin" | "adminProducts" | "adminOrders"
  | "adminCustomers" | "campaigns" | "content" | "automation" | "workflow"
  | "history" | "intelligence" | "escalationDone";

const catalog: Product[] = [
  {
    id: "pencil", name: "قلم الباد هاوس", price: 120,
    image: "https://padhouse.ps/wp-content/uploads/2024/11/PadHouse-Pencil-Product-Image.jpg",
    kind: "أقلام الآيباد", description: "قلم باد هاوس للكتابة والرسم على الآيباد. معلومات المنتج المنشورة تذكر رفض راحة اليد والشحن السريع.",
    specs: ["رفض راحة اليد", "شحن سريع: نحو 15 دقيقة لاستخدام يقارب 9 ساعات", "كفالة سنة واحدة"],
    compatibility: "متوافق مع أجهزة iPad من إصدار 2018 فما بعد، بحسب صفحة المنتج. تحقق من موديل جهازك قبل الطلب.",
    warranty: "كفالة سنة واحدة حسب صفحة المنتج.",
  },
  {
    id: "clear-case", name: "كفر ايباد سليكون شفاف", price: 25,
    image: "https://padhouse.ps/wp-content/uploads/2025/06/TC-1.jpg",
    kind: "الكفرات والحافظات", variants: ["10.2 إنش", "10.9 / 11 إنش", "12.9 / 13 إنش"],
    description: "كفر سيليكون شفاف. يجب اختيار قياس الجهاز المناسب قبل الإضافة.",
    specs: ["النوع: سيليكون شفاف", "المقاسات المنشورة: 10.2، 10.9/11، 12.9/13 إنش"],
    compatibility: "التوافق بحسب قياس الجهاز فقط؛ الموديلات المحددة غير مؤكدة.",
    warranty: "غير متوفر.",
  },
  {
    id: "carbon-case", name: "كفر ايباد سليكون غير شفاف – نقش كاربون فايبر", price: 45,
    image: "https://padhouse.ps/wp-content/uploads/2025/10/Front-Black.jpg",
    kind: "الكفرات والحافظات", variants: ["10.2 إنش", "10.9 / 11 إنش", "12.9 / 13 إنش"],
    colors: ["أسود (كما في صورة المنتج)", "لون آخر — غير مؤكد"],
    description: "كفر سيليكون غير شفاف بنقش كاربون فايبر. تتوفر خيارات قياس وألوان بحسب صفحة المنتج.",
    specs: ["نقش كاربون فايبر", "مقاسات منشورة متعددة", "ألوان متعددة؛ الألوان الدقيقة غير مؤكدة"],
    compatibility: "الموديل المحدد غير مؤكد؛ اختر القياس المنشور المطابق لجهازك.",
    warranty: "غير متوفر.",
  },
  {
    id: "keyboard-case", name: "كفر ايباد مع كيبورد وتتش باد", price: 160,
    image: "https://padhouse.ps/wp-content/uploads/2025/06/KTC-1.jpg",
    kind: "لوحات المفاتيح", variants: ["10.2 إنش", "10.9 / 11 إنش", "12.9 / 13 إنش"],
    colors: ["أسود"], description: "كفر سيليكون غير شفاف مع كيبورد وتتش باد، باللون الأسود.",
    specs: ["كيبورد وتتش باد", "أسود", "مقاسات منشورة: 10.2، 10.9/11، 12.9/13 إنش"],
    compatibility: "الموديل المحدد غير مؤكد؛ يلزم اختيار القياس المطابق.",
    warranty: "غير متوفر.",
  },
  {
    id: "cable", name: "سلك شاحن تايب سي إلى ايفون — Yesido CA153", price: 35,
    image: "https://padhouse.ps/wp-content/uploads/2025/03/CA153-Cable.jpg",
    kind: "الشواحن والكابلات", description: "سلك Yesido CA153 من Type‑C إلى iPhone.",
    specs: ["الموديل: Yesido CA153", "Type‑C إلى iPhone", "تفاصيل الطول والقدرة: غير متوفر"],
    compatibility: "توافق الآيباد غير مؤكد؛ اتجاه الكابل المنشور إلى iPhone.",
    warranty: "غير متوفر.",
  },
];
const categories = [
  { title: "أقلام الآيباد", icon: Pencil },
  { title: "الكفرات والحافظات", icon: ShieldCheck },
  { title: "لوحات المفاتيح", icon: Smartphone },
  { title: "حمايات الشاشة", icon: ShieldCheck },
  { title: "الشواحن والكابلات", icon: CreditCard },
  { title: "المساند والحوامل", icon: LayoutDashboard },
  { title: "المحولات والملحقات", icon: Package },
];
const deliveryFees: Record<string, number> = { "الضفة الغربية": 20, "القدس": 30, "مناطق 48": 70, "استلام من نابلس": 0 };
const fmt = (n: number) => `₪${new Intl.NumberFormat("ar").format(n)}`;

export function PadHouseApp() {
  const [page, setPage] = useState<Page>("home");
  const [activeTab, setActiveTab] = useState<"home" | "profile" | "categories" | "cart">("home");
  const [selectedProduct, setSelectedProduct] = useState<Product>(catalog[0]);
  const [selectedCategory, setSelectedCategory] = useState("الكفرات والحافظات");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [compare, setCompare] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [sort, setSort] = useState("الترتيب الافتراضي");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterPrice, setFilterPrice] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [detailQty, setDetailQty] = useState(1);
  const [toast, setToast] = useState("");
  const [checkoutStep, setCheckoutStep] = useState(0);
  const [checkoutName, setCheckoutName] = useState("");
  const [checkoutPhone, setCheckoutPhone] = useState("");
  const [checkoutEmail, setCheckoutEmail] = useState("");
  const [destination, setDestination] = useState("الضفة الغربية");
  const [address, setAddress] = useState("");
  const [instructions, setInstructions] = useState("");
  const [orderId, setOrderId] = useState("");
  const [demoOrders, setDemoOrders] = useState<string[]>([]);
  const [finderStep, setFinderStep] = useState(0);
  const [finderAnswers, setFinderAnswers] = useState<string[]>([]);
  const [chatText, setChatText] = useState("");
  const [chatMessages, setChatMessages] = useState<{ text: string; user?: boolean }[]>([
    { text: "أهلًا! أنا مساعد تجريبي من PadHouse. أقدر أساعدك بمعلومات الكتالوج المنشورة، لكن لا أستطيع تأكيد المخزون أو توافق غير مذكور." },
  ]);
  const [authMode, setAuthMode] = useState<"signin" | "register" | "forgot">("signin");
  const [formEmail, setFormEmail] = useState("");
  const [adminAllowed, setAdminAllowed] = useState(false);
  const [adminSection, setAdminSection] = useState("overview");
  const [adminSearch, setAdminSearch] = useState("");
  const [workflowName, setWorkflowName] = useState("مسار المحتوى بمراجعة بشرية");
  const [workflowEnabled, setWorkflowEnabled] = useState(false);
  const [workflowResult, setWorkflowResult] = useState("");
  const [draftStatus, setDraftStatus] = useState("مسودة");
  const [draftText, setDraftText] = useState("قلم باد هاوس يساعدك على الكتابة والرسم على الآيباد مع رفض راحة اليد. التوافق المنشور: أجهزة iPad من 2018 فما بعد. التفاصيل والكفالة سنة حسب صفحة المنتج.");

  const subtotal = useMemo(() => cart.reduce((sum, line) => {
    const product = catalog.find((item) => item.id === line.productId);
    return sum + (product?.price ?? 0) * line.qty;
  }, 0), [cart]);
  const delivery = deliveryFees[destination] ?? 20;
  const total = subtotal + delivery;
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = catalog.filter((item) => !q || `${item.name} ${item.kind} ${item.id}`.toLowerCase().includes(q));
    if (filterPrice) list = list.filter((item) => item.price <= 120);
    if (sort === "السعر: الأقل أولًا") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "السعر: الأعلى أولًا") list = [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [query, filterPrice, sort]);
  const categoryResults = useMemo(() => catalog.filter((item) => item.kind === selectedCategory), [selectedCategory]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (page === "search") searchInputRef.current?.focus();
  }, [page]);

  const go = (to: Page) => {
    setPage(to);
    if (["home", "profile", "categories", "cart"].includes(to)) setActiveTab(to as typeof activeTab);
  };
  const selectProduct = (product: Product) => {
    setSelectedProduct(product);
    setSelectedVariant("");
    setSelectedColor("");
    setDetailQty(1);
    go("product");
  };
  const toggleFavorite = (id: string) => setFavorites((old) => old.includes(id) ? old.filter((v) => v !== id) : [...old, id]);
  const addToCart = (product: Product, qty = 1, variant?: string, color?: string) => {
    if (product.variants?.length && !variant) {
      setToast("اختَر قياس جهازك أولًا");
      setSelectedProduct(product);
      setSelectedVariant("");
      go("product");
      return;
    }
    if (product.colors?.length && !color) {
      setToast("اختَر اللون أو خيار اللون غير المؤكد أولًا");
      setSelectedProduct(product);
      go("product");
      return;
    }
    setCart((old) => {
      const found = old.find((line) => line.productId === product.id && line.variant === variant && line.color === color);
      return found ? old.map((line) => line === found ? { ...line, qty: line.qty + qty } : line) : [...old, { productId: product.id, qty, variant, color }];
    });
    setToast("أُضيف المنتج إلى سلتك");
  };
  const updateQty = (line: CartLine, change: number) => {
    setCart((old) => old.map((item) => item === line ? { ...item, qty: Math.max(1, item.qty + change) } : item));
  };
  const removeLine = (line: CartLine) => {
    setCart((old) => old.filter((item) => item !== line));
    setToast("تمت إزالة المنتج من السلة");
  };
  const startSearch = (value = "") => {
    setQuery(value);
    go("search");
  };
  const submitSearch = (e?: FormEvent) => {
    e?.preventDefault();
    const value = query.trim();
    if (value) setRecentSearches((old) => [value, ...old.filter((item) => item !== value)].slice(0, 4));
    go("search");
  };
  const openCategory = (name: string) => {
    setSelectedCategory(name);
    go("category");
  };
  const toggleCompare = (id: string) => {
    setCompare((old) => {
      if (old.includes(id)) return old.filter((x) => x !== id);
      if (old.length >= 3) {
        setToast("يمكن مقارنة 3 منتجات كحد أقصى");
        return old;
      }
      return [...old, id];
    });
  };
  const nav = (target: "home" | "profile" | "categories" | "cart") => {
    setActiveTab(target);
    go(target);
  };
  const showProductGrid = (items: Product[]) => (
    <div className="ph-product-grid">
      {items.map((product) => (
        <div className="ph-product-card" key={product.id}>
          <div className="ph-product-image" onClick={() => selectProduct(product)}>
            <img src={product.image} alt={product.name} />
          </div>
          <button className={`ph-fav ${favorites.includes(product.id) ? "selected" : ""}`} aria-label="إضافة للمفضلة" onClick={() => toggleFavorite(product.id)}>
            <Heart fill={favorites.includes(product.id) ? "currentColor" : "none"} />
          </button>
          <button className="ph-prod-name" onClick={() => selectProduct(product)}>{product.name}</button>
          <div className="ph-prod-price-row">
            <span className="ph-price">{fmt(product.price)}</span>
            <button className="ph-mini-add" aria-label="عرض المنتج والإضافة" onClick={() => product.variants ? selectProduct(product) : addToCart(product)}><Plus /></button>
          </div>
          {product.variants && <div className="ph-product-note">اختيار القياس مطلوب</div>}
        </div>
      ))}
    </div>
  );
  const customerBottom = !page.startsWith("admin") && page !== "confirmation" && page !== "signin" && page !== "register" && page !== "forgot" && page !== "adminGate" && (
    <nav className="ph-bottom" aria-label="التنقل الرئيسي">
      <button className={`ph-tab ${activeTab === "home" ? "active" : ""}`} onClick={() => nav("home")}><Home /><span>الرئيسية</span></button>
      <button className={`ph-tab ${activeTab === "profile" ? "active" : ""}`} onClick={() => nav("profile")}><UserRound /><span>حسابي</span></button>
      <button className={`ph-tab ${activeTab === "categories" ? "active" : ""}`} onClick={() => nav("categories")}><Grid2X2 /><span>التصنيفات</span></button>
      <button className={`ph-tab ${activeTab === "cart" ? "active" : ""}`} onClick={() => nav("cart")}><span style={{ position: "relative" }}><ShoppingCart />{cartCount > 0 && <i className="ph-badge">{cartCount}</i>}</span><span>السلة</span></button>
    </nav>
  );
  const header = (title?: string, back = true) => (
    <div className="ph-top">
      {back ? <button className="ph-icon-btn" aria-label="رجوع" onClick={() => go("home")}><ArrowLeft /></button> : <div className="ph-brand">شعار<br />مؤقت</div>}
      <div className="ph-brand-copy"><strong>{title ?? "باد هاوس ستور"}</strong><small>{title ? "تجربة تسوق فلسطينية" : "إكسسوارات الآيباد • فلسطين"}</small></div>
      <button className="ph-icon-btn" aria-label="السلة" onClick={() => nav("cart")}><ShoppingBag />{cartCount > 0 && <i className="ph-badge">{cartCount}</i>}</button>
    </div>
  );
  const searchBar = (placeholder = "ابحث عن منتج أو موديل آيباد") => (
    <form className="ph-search" onSubmit={submitSearch}>
      <Search />
      <input ref={searchInputRef} value={query} onChange={(e) => setQuery(e.target.value)} onFocus={() => { if (page !== "search") go("search"); }} placeholder={placeholder} aria-label="ابحث عن منتج" />
      {query && <button type="button" className="ph-link" onClick={() => setQuery("")}><X size={15} /></button>}
    </form>
  );
  const sectionHeading = (title: string, action?: () => void, actionText = "عرض الكل") => (
    <div className="ph-section-head"><h3>{title}</h3>{action && <button className="ph-link" onClick={action}>{actionText}<ChevronLeft /></button>}</div>
  );
  const demoTag = (text = "بيانات تجريبية") => <span className="ph-demo"><CircleAlert size={12} />{text}</span>;

  const renderHome = () => (
    <>
      <div className="ph-title-row" style={{ marginBottom: 13 }}>
        <div><span className="ph-eyebrow">شعار نصي مؤقت · أهلًا بك في</span><h1 className="ph-title">باد هاوس ستور</h1></div>
        <button className="ph-icon-btn" aria-label="حسابي" onClick={() => nav("profile")}><UserRound /></button>
      </div>
      {searchBar()}
      <div className="ph-banner">
        <div className="ph-banner-copy">
          <small>اختيارك يبدأ من جهازك</small><h2>إكسسوارك المناسب،<br />بمعلومة واضحة</h2>
          <p>اختر موديل الآيباد أولًا — نساعدك تتحقق من المقاس.</p>
          <button className="ph-btn" onClick={() => { setFinderStep(0); setFinderAnswers([]); go("finder"); }}>ابدأ الاختيار <ArrowLeft /></button>
        </div>
        <div className="ph-banner-art"><img src={catalog[0].image} alt="قلم الباد هاوس" /></div>
      </div>
      <div className="ph-notice" style={{ marginTop: 12 }}>التوصيل متاح لمناطق فلسطين. الأسعار والكتالوج المعروض بيانات مرجعية تجريبية للتصميم.</div>
      <div className="ph-section">
        {sectionHeading("تصفّح حسب النوع", () => nav("categories"))}
        <div className="ph-cats">
          {categories.map(({ title, icon: Icon }) => <button className="ph-cat" key={title} onClick={() => openCategory(title)}><Icon /><span>{title}</span></button>)}
        </div>
      </div>
      <div className="ph-section">
        {sectionHeading("منتجات من الكتالوج", () => nav("categories"), "كل المنتجات")}
        <div className="ph-subtitle" style={{ margin: "-5px 0 11px" }}>المعلومات والأسعار بحسب صفحات المتجر؛ المخزون غير متصل.</div>
        {showProductGrid(catalog.slice(0, 4))}
      </div>
      <div className="ph-section">
        <div className="ph-ai-card">
          <div className="ph-ai-icon"><Sparkles /></div><div className="ph-ai-copy"><strong>مساعد PadHouse الذكي</strong><small>توصيات ومعلومات كتالوج — تجربة توضيحية فقط</small></div>
          <button className="ph-link" onClick={() => go("chat")}>اسأل <ChevronLeft /></button>
        </div>
      </div>
      <div className="ph-section" style={{ paddingBottom: 5 }}>{demoTag("بيانات الكتالوج — تحقق قبل الاستخدام")}</div>
      <button className="ph-float" onClick={() => go("chat")} aria-label="مساعد PadHouse"><MessageCircle /></button>
    </>
  );

  const renderCategories = () => (
    <>
      <div className="ph-title-row"><div><h1 className="ph-title">التصنيفات</h1><p className="ph-subtitle">اعثر على إكسسوارك بسهولة</p></div><button className="ph-icon-btn" onClick={() => startSearch()}><Search /></button></div>
      {searchBar("ابحث داخل التصنيفات")}
      <div className="ph-section">
        <div className="ph-row-card" style={{ background: "#f1fbf9" }}>
          <div className="ph-row"><div className="ph-ai-icon"><Smartphone /></div><div className="ph-row-main"><strong>حدّد موديل الآيباد</strong><small>التوافق غير مؤكد إلا حيث ذُكر صراحةً بالكتالوج.</small></div><button className="ph-link" onClick={() => { setFinderStep(0); go("finder"); }}>اختيار <ChevronLeft /></button></div>
        </div>
        <div className="ph-admin-grid">
          {categories.map(({ title, icon: Icon }) => <button className="ph-admin-tile" key={title} onClick={() => openCategory(title)}><Icon /><strong>{title}</strong><small>{catalog.filter(p => p.kind === title).length ? `${catalog.filter(p => p.kind === title).length} منتجات معروفة` : "لا توجد بيانات كتالوج مؤكدة"}</small></button>)}
        </div>
      </div>
      <div className="ph-section">{demoTag("فئات الكتالوج التجريبي")}</div>
    </>
  );

  const renderCategory = () => (
    <>
      <div className="ph-title-row"><div><span className="ph-eyebrow">التصنيف</span><h1 className="ph-title">{selectedCategory}</h1></div><button className="ph-icon-btn" onClick={() => startSearch()}><Search /></button></div>
      {searchBar(`ابحث في ${selectedCategory}`)}
      <div className="ph-chip-row">
        <button className={`ph-chip ${filterPrice ? "active" : ""}`} onClick={() => setFilterPrice(!filterPrice)}>السعر حتى ₪120</button>
        <button className="ph-chip" onClick={() => setFilterOpen(true)}><SlidersHorizontal size={13} /> فلاتر</button>
        <button className="ph-chip" onClick={() => setSort(sort === "السعر: الأقل أولًا" ? "الترتيب الافتراضي" : "السعر: الأقل أولًا")}><ArrowUpDown size={13} /> {sort === "الترتيب الافتراضي" ? "ترتيب" : sort}</button>
      </div>
      {categoryResults.length ? showProductGrid(categoryResults.filter(p => !filterPrice || p.price <= 120)) : <div className="ph-empty"><Package /><strong>لا تتوفر منتجات مؤكدة هنا بعد</strong><p>لا توجد معلومات كتالوج منشورة لهذا التصنيف في هذه التجربة.</p><button className="ph-btn outline" onClick={() => go("chat")}>اسأل المساعد</button></div>}
    </>
  );

  const renderSearch = () => (
    <>
      <div className="ph-title-row"><div><h1 className="ph-title">البحث</h1><p className="ph-subtitle">اكتب اسم المنتج أو التصنيف</p></div><button className="ph-icon-btn" onClick={() => setFilterOpen(true)}><SlidersHorizontal /></button></div>
      {searchBar("ابحث عن منتج أو موديل آيباد")}
      {!query && <div className="ph-section">
        {sectionHeading("عبارات مقترحة")}
        <div className="ph-chip-row" style={{ flexWrap: "wrap" }}>
          {["قلم للآيباد", "كفر شفاف", "كيبورد", "سلك شاحن"].map(term => <button key={term} className="ph-chip" onClick={() => { setQuery(term); setRecentSearches(old => [term, ...old.filter(x => x !== term)].slice(0,4)); }}>{term}</button>)}
        </div>
        {recentSearches.length > 0 && <><div className="ph-divider" />{sectionHeading("عمليات بحث سابقة")}<div className="ph-chip-row">{recentSearches.map(term => <button key={term} className="ph-chip" onClick={() => setQuery(term)}>{term}</button>)}</div></>}
        <div className="ph-notice">اكتب للبحث في البيانات المرجعية المحمّلة في هذا النموذج.</div>
      </div>}
      {!!query && <div className="ph-section">
        {sectionHeading(`نتائج البحث (${searchResults.length})`)}
        <div className="ph-chip-row">
          <button className={`ph-chip ${filterPrice ? "active" : ""}`} onClick={() => setFilterPrice(!filterPrice)}>حتى ₪120</button>
          <button className="ph-chip" onClick={() => setSort(sort === "السعر: الأقل أولًا" ? "السعر: الأعلى أولًا" : "السعر: الأقل أولًا")}><ArrowUpDown size={13} />{sort}</button>
          <button className="ph-chip" onClick={() => { setFilterPrice(false); setSort("الترتيب الافتراضي"); }}>مسح الفلاتر</button>
        </div>
        {searchResults.length ? showProductGrid(searchResults) : <div className="ph-empty"><Search /><strong>ما لقينا نتيجة مطابقة</strong><p>جرّب اسمًا أقصر أو تصفّح التصنيفات. لا توجد معلومات توافق إضافية مؤكدة.</p><button className="ph-btn outline" onClick={() => setQuery("")}>مسح البحث</button></div>}
      </div>}
    </>
  );

  const renderProduct = () => (
    <>
      <div className="ph-title-row"><button className="ph-link" onClick={() => go("home")}><ArrowLeft /> رجوع</button><div style={{ display: "flex", gap: 7 }}>
        <button className="ph-icon-btn" onClick={() => { toggleCompare(selectedProduct.id); setToast(compare.includes(selectedProduct.id) ? "أزيل المنتج من المقارنة" : "أضيف المنتج للمقارنة"); }} aria-label="مقارنة"><ArrowUpDown /></button>
        <button className={`ph-icon-btn ${favorites.includes(selectedProduct.id) ? "active" : ""}`} onClick={() => toggleFavorite(selectedProduct.id)} aria-label="المفضلة"><Heart fill={favorites.includes(selectedProduct.id) ? "currentColor" : "none"} /></button>
      </div></div>
      <div className="ph-product-hero"><img src={selectedProduct.image} alt={selectedProduct.name} /></div>
      <div style={{ marginTop: 14 }}>
        <span className="ph-eyebrow">{selectedProduct.kind}</span>
        <h1 className="ph-title" style={{ fontSize: 20, marginTop: 3 }}>{selectedProduct.name}</h1>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 9 }}><strong className="ph-price" style={{ fontSize: 20 }}>{fmt(selectedProduct.price)}</strong>{demoTag("سعر منشور")}</div>
        <p className="ph-subtitle" style={{ fontSize: 12, marginTop: 9 }}>{selectedProduct.description}</p>
      </div>
      {selectedProduct.variants && <div className="ph-section">
        <strong style={{ fontSize: 12 }}>اختَر قياس الآيباد <span style={{ color: "#c04c53" }}>*</span></strong>
        <div className="ph-chip-row" style={{ flexWrap: "wrap" }}>
          {selectedProduct.variants.map(v => <button key={v} className={`ph-chip ${selectedVariant === v ? "active" : ""}`} onClick={() => setSelectedVariant(v)}>{v}</button>)}
        </div>
      </div>}
      {selectedProduct.colors && <div className="ph-section"><strong style={{ fontSize: 12 }}>اللون</strong><div className="ph-chip-row">{selectedProduct.colors.map(c => <button key={c} className={`ph-chip ${selectedColor === c ? "active" : ""}`} onClick={() => setSelectedColor(c)}>{c}</button>)}</div></div>}
      <div className="ph-row" style={{ marginTop: 15 }}>
        <strong style={{ fontSize: 12 }}>الكمية</strong><div className="ph-qty"><button onClick={() => setDetailQty(Math.max(1, detailQty - 1))}><Minus /></button><b>{detailQty}</b><button onClick={() => setDetailQty(detailQty + 1)}><Plus /></button></div>
        <button className="ph-link" onClick={() => go("chat")}><MessageCircle /> اسأل</button>
      </div>
      <button className="ph-btn full" style={{ marginTop: 14 }} onClick={() => addToCart(selectedProduct, detailQty, selectedVariant, selectedColor)}><ShoppingCart /> أضف إلى السلة · {fmt(selectedProduct.price * detailQty)}</button>
      <div className="ph-section">
        <div className="ph-row-card">
          <div className="ph-section-head"><h3>المواصفات المعروفة</h3><BadgeCheck size={16} color="#168f85" /></div>
          {selectedProduct.specs.map(spec => <div className="ph-spec" key={spec}><Check />{spec}</div>)}
          <div className="ph-divider" /><div className="ph-spec"><Smartphone />{selectedProduct.compatibility}</div>
          <div className="ph-spec"><ShieldCheck />الكفالة: {selectedProduct.warranty}</div>
          <div className="ph-spec"><Truck />توصيل مرجعي: 1–3 أيام عمل حسب الموقع المنشور؛ يُرجى التحقق قبل الاستخدام.</div>
        </div>
        <div className="ph-row" style={{ gap: 8 }}>
          <button className="ph-btn outline" style={{ flex: 1 }} onClick={() => { toggleCompare(selectedProduct.id); go("compare"); }}>قارن المنتجات</button>
          <button className="ph-btn soft" style={{ flex: 1 }} onClick={() => { setFinderStep(0); go("finder"); }}>مساعدة اختيار</button>
        </div>
      </div>
      <div className="ph-section">{sectionHeading("قد يناسبك أيضًا", () => nav("categories"))}{showProductGrid(catalog.filter(p => p.id !== selectedProduct.id).slice(0,2))}</div>
    </>
  );

  const renderFavorites = () => {
    const items = catalog.filter(p => favorites.includes(p.id));
    return <><div className="ph-title-row"><div><h1 className="ph-title">قائمة المفضلة</h1><p className="ph-subtitle">محفوظة على هذا الجهاز في النموذج</p></div></div>
      {items.length ? showProductGrid(items) : <div className="ph-empty"><Heart /><strong>لسه ما أضفت منتجات</strong><p>احفظ المنتجات اللي بدك ترجع لها، باستخدام رمز القلب.</p><button className="ph-btn" onClick={() => nav("home")}>تصفّح المنتجات</button></div>}</>;
  };

  const renderCart = () => (
    <>
      <div className="ph-title-row"><div><h1 className="ph-title">سلة التسوق</h1><p className="ph-subtitle">{cartCount} قطع في سلتك</p></div>{demoTag()}</div>
      {cart.length === 0 ? <div className="ph-empty"><ShoppingCart /><strong>سلتك فارغة الآن</strong><p>تصفّح الكتالوج وأضف ما تحتاجه. لا يتم إرسال طلب حقيقي في هذه التجربة.</p><button className="ph-btn" onClick={() => nav("categories")}>تصفّح التصنيفات</button></div> :
        <>
          {cart.map((line, index) => {
            const product = catalog.find(p => p.id === line.productId)!;
            return <div className="ph-row-card" key={`${line.productId}-${line.variant}-${line.color}-${index}`}>
              <div className="ph-row"><div style={{ width: 70, height: 70, background: "#f5f8f7", borderRadius: 11, display: "grid", placeItems: "center", flex: "none" }}><img src={product.image} alt="" style={{ maxWidth: "90%", maxHeight: "90%", objectFit: "contain", mixBlendMode: "multiply" }} /></div>
                <div className="ph-row-main"><strong>{product.name}</strong><small>{line.variant ? `القياس: ${line.variant}` : "التفاصيل بحسب صفحة المنتج"}</small><small>{fmt(product.price)} للقطعة</small></div>
                <button className="ph-icon-btn" onClick={() => removeLine(line)} aria-label="حذف المنتج"><Trash2 /></button></div>
              <div className="ph-row" style={{ justifyContent: "space-between", marginTop: 10 }}><span className="ph-price">{fmt(product.price * line.qty)}</span><div className="ph-qty"><button onClick={() => updateQty(line, -1)}><Minus /></button><b>{line.qty}</b><button onClick={() => updateQty(line, 1)}><Plus /></button></div></div>
            </div>;
          })}
          <div className="ph-row-card">
            <div className="ph-section-head"><h3>ملخص الطلب</h3></div>
            <div className="ph-line-item"><span>المجموع الفرعي</span><b>{fmt(subtotal)}</b></div>
            <div className="ph-line-item"><span>التوصيل <small>({destination})</small></span><b>{fmt(delivery)}</b></div>
            <div className="ph-line-item ph-total"><span>الإجمالي</span><b>{fmt(total)}</b></div>
            <small style={{ color: "#87939a", fontSize: 9 }}>رسوم مرجعية منشورة، يرجى التحقق منها قبل الاستخدام.</small>
          </div>
          <button className="ph-btn full" onClick={() => { setCheckoutStep(0); go("checkout"); }}>إتمام الشراء <ArrowLeft /></button>
          <button className="ph-btn outline full" style={{ marginTop: 8 }} onClick={() => nav("categories")}>متابعة التسوق</button>
        </>}
    </>
  );

  const checkoutNext = () => {
    if (checkoutStep === 0 && (!checkoutName.trim() || checkoutPhone.trim().length < 7)) { setToast("أدخل الاسم ورقم هاتف صحيحًا للمتابعة"); return; }
    if (checkoutStep === 1 && destination !== "استلام من نابلس" && !address.trim()) { setToast("أدخل عنوان التوصيل بالتفصيل"); return; }
    if (checkoutStep < 3) setCheckoutStep(checkoutStep + 1);
    else {
      const id = `DEMO-${new Date().getFullYear()}-${String(demoOrders.length + 1).padStart(3, "0")}`;
      setOrderId(id);
      setDemoOrders(old => [id, ...old]);
      go("confirmation");
    }
  };
  const renderCheckout = () => (
    <>
      <div className="ph-title-row"><div><h1 className="ph-title">إتمام الشراء</h1><p className="ph-subtitle">كضيف • لا حاجة لإنشاء حساب</p></div><button className="ph-icon-btn" onClick={() => nav("cart")}><ShoppingCart /></button></div>
      <div className="ph-stepper">{[0,1,2,3].map(i => <span key={i} className={`ph-step ${i <= checkoutStep ? "done" : ""}`} />)}</div>
      <div className="ph-row" style={{ justifyContent: "space-between", marginBottom: 12 }}><strong style={{ fontSize: 14 }}>{["معلوماتك", "التوصيل", "الدفع", "مراجعة الطلب"][checkoutStep]}</strong><span className="ph-eyebrow">الخطوة {checkoutStep + 1} من 4</span></div>
      {checkoutStep === 0 && <>
        <div className="ph-notice">يمكنك إكمال الطلب كضيف. معلوماتك هنا محلية ضمن النموذج فقط.</div>
        <div className="ph-input-wrap"><label>الاسم الكامل *</label><input className="ph-input" value={checkoutName} onChange={e => setCheckoutName(e.target.value)} placeholder="الاسم كما تحب أن نستلم الطلب" /></div>
        <div className="ph-input-wrap"><label>رقم الهاتف *</label><input className="ph-input" inputMode="tel" value={checkoutPhone} onChange={e => setCheckoutPhone(e.target.value)} placeholder="05X XXX XXXX" dir="ltr" /></div>
        <div className="ph-input-wrap"><label>البريد الإلكتروني <span style={{ color: "#849099", fontWeight: 400 }}>اختياري</span></label><input className="ph-input" type="email" value={checkoutEmail} onChange={e => setCheckoutEmail(e.target.value)} placeholder="name@example.com" dir="ltr" /></div>
      </>}
      {checkoutStep === 1 && <>
        <div className="ph-input-wrap"><label>منطقة التوصيل</label><select className="ph-input" value={destination} onChange={e => setDestination(e.target.value)}>{Object.keys(deliveryFees).map(area => <option key={area}>{area}</option>)}</select></div>
        {destination !== "استلام من نابلس" ? <><div className="ph-input-wrap"><label>العنوان بالتفصيل *</label><textarea className="ph-input" value={address} onChange={e => setAddress(e.target.value)} placeholder="المدينة، الحي، الشارع، أقرب علامة" /></div><div className="ph-input-wrap"><label>تعليمات للمندوب</label><input className="ph-input" value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="اختياري" /></div></> : <div className="ph-notice">استلام محلي مجاني من نابلس، بحسب المعلومة المنشورة.</div>}
        <div className="ph-row-card"><div className="ph-row"><Truck color="#168f85" /><div className="ph-row-main"><strong>رسوم التوصيل المرجعية</strong><small>معلومة منشورة بالموقع؛ يلزم التحقق قبل الاستخدام.</small></div><b className="ph-price">{fmt(delivery)}</b></div><div className="ph-subtitle">المدة المنشورة: 1–3 أيام عمل.</div></div>
      </>}
      {checkoutStep === 2 && <>
        <div className="ph-row-card"><div className="ph-row"><div className="ph-ai-icon"><CreditCard /></div><div className="ph-row-main"><strong>طريقة الدفع</strong><small>بانتظار تأكيد إعدادات الدفع الرسمية.</small></div></div><div className="ph-alert" style={{ marginTop: 12 }}>لا توجد وسيلة دفع مفعّلة في هذا النموذج. لن تُخصم أي مبالغ.</div></div>
        <div className="ph-notice">تجربة توضيحية فقط — لن يتم إرسال طلب إلى المتجر.</div>
      </>}
      {checkoutStep === 3 && <>
        <div className="ph-row-card"><h3 style={{ margin: "0 0 10px", fontSize: 13 }}>المنتجات</h3>{cart.map((line, i) => { const p = catalog.find(x => x.id === line.productId)!; return <div className="ph-line-item" key={i}><span>{p.name} × {line.qty}{line.variant ? ` · ${line.variant}` : ""}</span><b>{fmt(p.price * line.qty)}</b></div>; })}</div>
        <div className="ph-row-card"><h3 style={{ margin: "0 0 8px", fontSize: 13 }}>بيانات الاستلام</h3><div className="ph-line-item"><span>الاسم</span><b>{checkoutName}</b></div><div className="ph-line-item"><span>الهاتف</span><b>{checkoutPhone}</b></div><div className="ph-line-item"><span>المنطقة</span><b>{destination}</b></div>{address && <div className="ph-line-item"><span>العنوان</span><b style={{ direction: "rtl" }}>{address}</b></div>}</div>
        <div className="ph-row-card"><div className="ph-line-item"><span>المجموع الفرعي</span><b>{fmt(subtotal)}</b></div><div className="ph-line-item"><span>التوصيل</span><b>{fmt(delivery)}</b></div><div className="ph-line-item ph-total"><span>الإجمالي</span><b>{fmt(total)}</b></div><small style={{ fontSize: 9, color: "#7e8b93" }}>الدفع بانتظار التأكيد · رسوم التوصيل مرجعية منشورة</small></div>
        <div className="ph-alert">بتأكيدك هنا، سيتم إنشاء رقم طلب تجريبي فقط. لا يتم إرسال طلب حقيقي.</div>
      </>}
      <div className="ph-row" style={{ gap: 8, marginTop: 18 }}>
        {checkoutStep > 0 && <button className="ph-btn outline" style={{ flex: 1 }} onClick={() => setCheckoutStep(checkoutStep - 1)}>السابق</button>}
        <button className="ph-btn full" style={{ flex: 2 }} onClick={checkoutNext}>{checkoutStep === 3 ? "تأكيد تجريبي للطلب" : "متابعة"} <ArrowLeft /></button>
      </div>
    </>
  );

  const renderConfirmation = () => (
    <div style={{ textAlign: "center", padding: "26px 6px" }}>
      <div className="ph-ai-icon" style={{ margin: "0 auto 15px", width: 62, height: 62, borderRadius: 22 }}><CheckCircle2 size={29} /></div>
      <span className="ph-eyebrow">تم إنشاء طلب تجريبي</span>
      <h1 className="ph-title" style={{ marginTop: 5 }}>شكرًا لك، {checkoutName || "صديقنا"}</h1>
      <p className="ph-subtitle" style={{ margin: "7px 0 17px" }}>هذا النموذج لم يرسل طلبًا حقيقيًا إلى المتجر ولم يعالج أي دفعة.</p>
      <div className="ph-row-card" style={{ textAlign: "right" }}>
        <div className="ph-line-item"><span>رقم تجريبي</span><b>{orderId}</b></div>
        <div className="ph-line-item"><span>الحالة</span><span className="ph-order-status">بانتظار التأكيد — نموذج</span></div>
        <div className="ph-line-item"><span>الإجمالي المرجعي</span><b>{fmt(total)}</b></div>
        <div className="ph-divider" /><div className="ph-notice">بيانات التوصيل والدفع مرجعية؛ يجب تأكيدها من المتجر قبل أي استخدام فعلي.</div>
      </div>
      <button className="ph-btn full" onClick={() => { setCart([]); go("tracking"); }}>عرض تفاصيل الطلب</button>
      <button className="ph-btn outline full" style={{ marginTop: 9 }} onClick={() => nav("home")}>العودة للرئيسية</button>
    </div>
  );

  const renderOrders = () => (
    <>
      <div className="ph-title-row"><div><h1 className="ph-title">طلباتي</h1><p className="ph-subtitle">طلبات العرض التجريبية على هذا الجهاز</p></div>{demoTag()}</div>
      {demoOrders.length ? demoOrders.map(id => <button className="ph-row-card" key={id} style={{ width: "100%", textAlign: "right" }} onClick={() => { setOrderId(id); go("tracking"); }}><div className="ph-row"><div className="ph-ai-icon"><Package /></div><div className="ph-row-main"><strong>{id}</strong><small>بانتظار التأكيد — حالة تجريبية فقط</small></div><ChevronLeft /></div></button>) : <div className="ph-empty"><ClipboardList /><strong>ما في طلبات بعد</strong><p>أي طلب في هذا النموذج سيظهر هنا كبيانات تجريبية فقط.</p><button className="ph-btn" onClick={() => nav("home")}>ابدأ التسوق</button></div>}
    </>
  );
  const renderTracking = () => (
    <>
      <div className="ph-title-row"><div><h1 className="ph-title">تفاصيل الطلب</h1><p className="ph-subtitle">{orderId || "لا يوجد رقم طلب"}</p></div>{demoTag("حالة نموذجية")}</div>
      <div className="ph-row-card"><div className="ph-row"><Package color="#168f85" /><div className="ph-row-main"><strong>بانتظار التأكيد</strong><small>هذه الحالة لا تعكس طلبًا حقيقيًا أو تتبعًا مباشرًا.</small></div></div><div className="ph-timeline"><div><strong>تم إنشاء ملخص الطلب</strong><small>داخل النموذج فقط · لا يوجد اتصال بمتجر</small></div><div style={{ color: "#9aa5ab" }}>تأكيد المتجر<small>غير متاح</small></div><div style={{ color: "#9aa5ab" }}>التوصيل<small>غير متاح</small></div></div></div>
      <button className="ph-btn outline full" onClick={() => go("support")}>تواصل مع دعم العملاء</button>
    </>
  );

  const renderProfile = () => (
    <>
      <div className="ph-title-row"><div><span className="ph-eyebrow">مرحبًا بك</span><h1 className="ph-title">حسابي</h1></div><div className="ph-brand">شعار<br />مؤقت</div></div>
      <div className="ph-row-card" style={{ background: "#f3fbf9" }}>
        <div className="ph-row"><div className="ph-ai-icon"><UserRound /></div><div className="ph-row-main"><strong>تسوق كضيف</strong><small>سجّل الدخول لحفظ بياناتك ومتابعة طلباتك.</small></div><button className="ph-btn soft" onClick={() => { setAuthMode("signin"); go("signin"); }}>دخول</button></div>
      </div>
      <div className="ph-section">
        {[
          { label: "طلباتي وتتبع الطلب", icon: ClipboardList, action: () => go("orders") },
          { label: "قائمة المفضلة", icon: Heart, action: () => go("favorites") },
          { label: "موديل الآيباد المحفوظ", icon: Smartphone, action: () => { setFinderStep(0); go("finder"); } },
          { label: "مركز المساعدة والأسئلة", icon: HelpCircle, action: () => go("support") },
          { label: "محادثة المساعد", icon: MessageCircle, action: () => go("chat") },
          { label: "مقارنة المنتجات", icon: ArrowUpDown, action: () => go("compare") },
        ].map(({ label, icon: Icon, action }) => <button className="ph-row-card" key={label} style={{ width: "100%", textAlign: "right" }} onClick={action}><div className="ph-row"><Icon size={19} color="#168f85" /><div className="ph-row-main"><strong>{label}</strong></div><ChevronLeft /></div></button>)}
      </div>
      <div className="ph-section">
        <div className="ph-row-card">
          <div className="ph-row"><Settings color="#168f85" /><div className="ph-row-main"><strong>الإعدادات والخصوصية</strong><small>تفضيلات الإشعارات والحساب</small></div></div>
          <div className="ph-divider" /><div className="ph-row"><span className="ph-row-main" style={{ fontSize: 10, color: "#77848b" }}>لا توجد حسابات أو بيانات محفوظة في الخلفية.</span><button className="ph-link" onClick={() => { setAuthMode("register"); go("register"); }}>إنشاء حساب</button></div>
        </div>
      </div>
      <div className="ph-section">
        <div className="ph-row-card" style={{ background: "#fbfcfc" }}>
          <div className="ph-row"><LockKeyhole color="#71818a" /><div className="ph-row-main"><strong>دخول مدير — وضع العرض</strong><small>يتطلب تحققًا فعليًا من الدور في الخادم قبل الاستخدام.</small></div><button className="ph-link" onClick={() => go("adminGate")}>فتح <ChevronLeft /></button></div>
        </div>
      </div>
      {demoTag("حساب محلي تجريبي")}
    </>
  );

  const renderAuth = () => {
    const mode = page === "signin" ? "signin" : page === "register" ? "register" : "forgot";
    const title = mode === "signin" ? "أهلًا بعودتك" : mode === "register" ? "إنشاء حساب" : "نسيت كلمة المرور؟";
    return <div style={{ paddingTop: 25 }}>
      <div className="ph-title-row"><div><span className="ph-eyebrow">باد هاوس ستور</span><h1 className="ph-title">{title}</h1><p className="ph-subtitle">هذه واجهة توضيحية — لا يوجد تسجيل دخول فعلي.</p></div></div>
      {mode !== "forgot" && <div className="ph-input-wrap"><label>الاسم {mode === "register" ? "الكامل" : ""}</label><input className="ph-input" placeholder={mode === "signin" ? "اسم المستخدم أو البريد" : "اسمك الكامل"} /></div>}
      <div className="ph-input-wrap"><label>البريد الإلكتروني أو الهاتف</label><input className="ph-input" value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="أدخل بريدك أو رقم هاتفك" /></div>
      {mode !== "forgot" && <div className="ph-input-wrap"><label>كلمة المرور</label><input className="ph-input" type="password" placeholder="••••••••" /></div>}
      {mode === "register" && <div className="ph-input-wrap"><label>تأكيد كلمة المرور</label><input className="ph-input" type="password" placeholder="أعد كتابة كلمة المرور" /></div>}
      <button className="ph-btn full" onClick={() => setToast(mode === "forgot" ? "لن يتم إرسال رسالة فعلية؛ خدمة الحساب غير متصلة" : "تسجيل الدخول غير متصل في هذا النموذج")}>{mode === "signin" ? "تسجيل الدخول" : mode === "register" ? "إنشاء حساب تجريبي" : "إرسال رابط الاستعادة"}</button>
      <div className="ph-section">
        {mode === "signin" && <button className="ph-link" onClick={() => go("forgot")}>نسيت كلمة المرور؟</button>}
        <div className="ph-divider" />
        <button className="ph-link" onClick={() => go(mode === "register" ? "signin" : "register")}>{mode === "register" ? "لديك حساب؟ تسجيل الدخول" : "مستخدم جديد؟ إنشاء حساب"}</button>
        <button className="ph-btn outline full" style={{ marginTop: 18 }} onClick={() => nav("home")}>المتابعة كضيف</button>
      </div>
      <div className="ph-notice" style={{ marginTop: 20 }}>كلمة المرور والملف الشخصي لا يتم حفظهما أو إرسالهما.</div>
    </div>;
  };

  const renderFinder = () => {
    const questions = [
      { q: "ما موديل الآيباد الذي تملكه؟", opts: ["iPad 2018 أو أحدث", "10.2 إنش", "10.9 / 11 إنش", "12.9 / 13 إنش", "غير متأكد"] },
      { q: "لأي استخدام تبحث عن إكسسوار؟", opts: ["الدراسة والكتابة", "الرسم والإبداع", "العمل والتنقل", "حماية الجهاز", "أخرى"] },
      { q: "ما نوع الإكسسوار الذي تحتاجه؟", opts: ["قلم", "كفر", "كيبورد", "شاحن أو كابل", "أرشدني"] },
      { q: "ما ميزانيتك التقريبية؟", opts: ["حتى ₪40", "₪41 – ₪100", "₪101 – ₪160", "مرنة", "تخطي"] },
      { q: "تفضيلات أخرى؟", opts: ["شفاف", "أسود", "توافق مثبت فقط", "لا تفضيل", "تخطي"] },
    ];
    const choose = (value: string) => {
      const next = [...finderAnswers];
      next[finderStep] = value;
      setFinderAnswers(next);
      if (finderStep < questions.length - 1) setFinderStep(finderStep + 1);
      else go("finderResults");
    };
    return <>
      <div className="ph-title-row"><div><span className="ph-eyebrow">مساعد اختيار تجريبي</span><h1 className="ph-title">مستشار اختيار الإكسسوار</h1><p className="ph-subtitle">إجاباتك توجهنا لما هو معروف في الكتالوج فقط.</p></div><div className="ph-ai-icon"><Sparkles /></div></div>
      <div className="ph-stepper">{questions.map((_, i) => <span className={`ph-step ${i <= finderStep ? "done" : ""}`} key={i} />)}</div>
      <div className="ph-row-card"><strong style={{ fontSize: 15 }}>{questions[finderStep].q}</strong><p className="ph-subtitle">سؤال {finderStep + 1} من {questions.length}</p>
        <div style={{ display: "grid", gap: 8, marginTop: 15 }}>{questions[finderStep].opts.map(option => <button key={option} className={`ph-row-card ${finderAnswers[finderStep] === option ? "active" : ""}`} style={{ margin: 0, padding: 12, textAlign: "right", fontSize: 11 }} onClick={() => choose(option)}>{option}<ChevronLeft size={15} style={{ float: "left" }} /></button>)}</div>
      </div>
      <div className="ph-row" style={{ marginTop: 12, justifyContent: "space-between" }}>
        <button className="ph-link" onClick={() => finderStep === 0 ? go("home") : setFinderStep(finderStep - 1)}><ArrowLeft /> السابق</button>
        <button className="ph-link" onClick={() => { if (finderStep < questions.length - 1) { setFinderAnswers([...finderAnswers, "تخطي"]); setFinderStep(finderStep + 1); } else go("finderResults"); }}>تخطي السؤال</button>
      </div>
      <div className="ph-notice" style={{ marginTop: 20 }}>التوصيات التلقائية في هذا النموذج تجريبية؛ لن ندّعي توافقًا غير مذكور في معلومات المنتج.</div>
    </>;
  };
  const renderFinderResults = () => {
    const answerType = finderAnswers[2] ?? "";
    const match = answerType.includes("قلم") ? catalog.filter(p => p.id === "pencil")
      : answerType.includes("كفر") ? catalog.filter(p => ["clear-case", "carbon-case"].includes(p.id))
        : answerType.includes("كيبورد") ? catalog.filter(p => p.id === "keyboard-case")
          : answerType.includes("شاحن") ? catalog.filter(p => p.id === "cable")
            : catalog.slice(0, 3);
    return <>
      <div className="ph-title-row"><div><span className="ph-eyebrow">نتيجة الإرشاد</span><h1 className="ph-title">خيارات من الكتالوج</h1><p className="ph-subtitle">مبنية على المعلومات المنشورة فقط؛ لا يوجد AI فعلي.</p></div><div className="ph-ai-icon"><Sparkles /></div></div>
      <div className="ph-alert">الموديل المحدد: {finderAnswers[0] || "غير محدد"}. هذا لا يؤكد التوافق؛ راجع قياس المنتج ومعلوماته قبل الشراء.</div>
      <div className="ph-section">{showProductGrid(match)}</div>
      <div className="ph-row-card"><strong style={{ fontSize: 12 }}>ما الذي لا نستطيع تأكيده؟</strong><p className="ph-subtitle">لا نملك جداول توافق كاملة لكل موديلات iPad، ولا بيانات مخزون مباشرة. اسأل فريق المتجر قبل الطلب.</p><button className="ph-btn outline full" onClick={() => go("support")}>اسأل الدعم</button></div>
      <button className="ph-btn full" onClick={() => { setFinderStep(0); setFinderAnswers([]); go("finder"); }}>ابدأ من جديد</button>
    </>;
  };

  const sendChat = (message = chatText) => {
    const text = message.trim();
    if (!text) return;
    setChatMessages(old => [...old, { text, user: true }, { text: "هذه واجهة مساعدة تجريبية وليست متصلة بخدمة ذكاء اصطناعي. أستطيع تأكيد ما ورد في الكتالوج: قلم باد هاوس مذكور أنه متوافق مع أجهزة iPad من 2018 فما بعد، أما تفاصيل موديلك المحدد أو المخزون فتحتاج تأكيدًا من فريق المتجر." }]);
    setChatText("");
  };
  const renderChat = () => <>
    <div className="ph-title-row"><div><span className="ph-eyebrow">تجريبي — لا يتصل بخدمة AI</span><h1 className="ph-title">مساعد PadHouse الذكي</h1><p className="ph-subtitle">معلومات كتالوج مرجعية ومساعدة أولية</p></div><div className="ph-ai-icon"><Bot /></div></div>
    <div style={{ display: "flex", flexDirection: "column" }}>{chatMessages.map((msg, i) => <div key={i} className={`ph-chat-bubble ${msg.user ? "user" : ""}`}>{msg.text}</div>)}</div>
    <div className="ph-chip-row" style={{ flexWrap: "wrap" }}>
      {["هل القلم مناسب للآيباد؟", "كيف أختار قياس الكفر؟", "ما رسوم التوصيل؟", "قارن لي المنتجات"].map(p => <button key={p} className="ph-chip" onClick={() => p.includes("قارن") ? go("compare") : sendChat(p)}>{p}</button>)}
    </div>
    <div className="ph-chat-entry"><input value={chatText} onChange={e => setChatText(e.target.value)} onKeyDown={e => { if (e.key === "Enter") sendChat(); }} placeholder="اكتب سؤالك..." /><button onClick={() => sendChat()} aria-label="إرسال"><Send /></button></div>
    <div className="ph-notice">الإجابات محاكاة محلية. المعلومات غير الموجودة بالكتالوج تظهر كغير مؤكدة.</div>
    <button className="ph-btn outline full" style={{ marginTop: 14 }} onClick={() => go("support")}>تواصل مع دعم بشري</button>
  </>;
  const renderSupport = () => <>
    <div className="ph-title-row"><div><h1 className="ph-title">مركز المساعدة</h1><p className="ph-subtitle">نحن هنا لمساعدتك — القنوات الفعلية غير متصلة بهذا النموذج.</p></div><HelpCircle size={25} color="#168f85" /></div>
    <div className="ph-ai-card" onClick={() => go("chat")} style={{ cursor: "pointer" }}><div className="ph-ai-icon"><MessageCircle /></div><div className="ph-ai-copy"><strong>ابدأ محادثة مساعدة تجريبية</strong><small>اسأل عن منتج أو معلومة منشورة</small></div><ChevronLeft /></div>
    <div className="ph-section">{sectionHeading("مواضيع شائعة")}
      {[
        ["معلومات الشحن والتوصيل", "رسوم منشورة حسب المنطقة ومدة مرجعية 1–3 أيام", Truck],
        ["توافق المنتجات", "ساعدني أتحقق من القياس والتوافق", Smartphone],
        ["الطلبات", "لا يوجد اتصال ببيانات الطلبات الحقيقية", Package],
      ].map(([label, desc, Icon]) => {
        const I = Icon as typeof Truck;
        return <button className="ph-row-card" key={label as string} style={{ width: "100%", textAlign: "right" }} onClick={() => label === "توافق المنتجات" ? go("finder") : label === "الطلبات" ? go("orders") : go("faq")}><div className="ph-row"><I color="#168f85" /><div className="ph-row-main"><strong>{label as string}</strong><small>{desc as string}</small></div><ChevronLeft /></div></button>;
      })}
    </div>
    <button className="ph-btn full" onClick={() => go("escalation")}><Phone /> طلب التواصل مع فريق المتجر</button>
    <div className="ph-notice" style={{ marginTop: 12 }}>طلب التواصل في هذا النموذج لا يرسل رسالة حقيقية.</div>
  </>;
  const renderFaq = () => <>
    <div className="ph-title-row"><div><h1 className="ph-title">الأسئلة الشائعة</h1><p className="ph-subtitle">إجابات مبنية على المعلومات المتاحة</p></div></div>
    {[
      ["كم يستغرق التوصيل؟", "صفحة المتجر المنشورة تعرض مدة 1–3 أيام عمل. يُرجى التحقق من المدة عند الطلب."],
      ["ما رسوم التوصيل؟", "بحسب المرجع المنشور: الضفة الغربية ₪20، القدس ₪30، مناطق 48 ₪70، والاستلام المحلي في نابلس مجاني. قد تتغير الرسوم."],
      ["هل قلم باد هاوس متوافق مع جهازي؟", "الصفحة تذكر توافقه مع أجهزة iPad من 2018 فما بعد. تحقق من موديلك الدقيق مع المتجر."],
      ["ما سياسة الإرجاع؟", "تفاصيل سياسة الإرجاع غير متوفرة في معلومات النموذج؛ يرجى سؤال المتجر."],
      ["هل الدفع الإلكتروني متاح؟", "إعدادات الدفع غير مؤكدة في هذا النموذج."],
    ].map(([q, a]) => <details className="ph-row-card" key={q}><summary style={{ fontWeight: 700, fontSize: 12, cursor: "pointer" }}>{q}</summary><p className="ph-subtitle" style={{ marginTop: 8 }}>{a}</p></details>)}
    <button className="ph-btn outline full" onClick={() => go("escalation")}>أحتاج مساعدة بشرية</button>
  </>;
  const renderEscalation = () => <>
    <div className="ph-title-row"><div><span className="ph-eyebrow">الدعم البشري</span><h1 className="ph-title">طلب التواصل</h1><p className="ph-subtitle">املأ التفاصيل لتحضير طلب اتصال تجريبي.</p></div><Phone color="#168f85" /></div>
    <div className="ph-input-wrap"><label>الاسم</label><input className="ph-input" placeholder="اسمك" /></div>
    <div className="ph-input-wrap"><label>رقم الهاتف</label><input className="ph-input" placeholder="05X XXX XXXX" inputMode="tel" dir="ltr" /></div>
    <div className="ph-input-wrap"><label>كيف نساعدك؟</label><textarea className="ph-input" placeholder="اكتب استفسارك أو رقم الطلب إن وجد" /></div>
    <button className="ph-btn full" onClick={() => go("escalationDone")}>تأكيد طلب التواصل</button>
  </>;
  const renderEscalationDone = () => <>
    <div style={{ textAlign: "center", padding: "35px 6px" }}>
      <div className="ph-ai-icon" style={{ margin: "0 auto 15px", width: 62, height: 62, borderRadius: 22 }}><CheckCircle2 size={29} /></div>
      <span className="ph-eyebrow">تجربة توضيحية</span>
      <h1 className="ph-title" style={{ marginTop: 5 }}>تم تجهيز طلب التواصل</h1>
      <p className="ph-subtitle" style={{ margin: "8px 0 18px" }}>لم يتم إرسال أي رسالة أو بيانات إلى فريق المتجر.</p>
      <div className="ph-notice">يمكنك التواصل عبر قنوات PadHouse الرسمية للتحقق من الاستفسار.</div>
      <button className="ph-btn full" style={{ marginTop: 18 }} onClick={() => go("support")}>العودة لمركز المساعدة</button>
    </div>
  </>;

  const renderCompare = () => {
    const items = catalog.filter(p => compare.includes(p.id));
    return <>
      <div className="ph-title-row"><div><h1 className="ph-title">مقارنة المنتجات</h1><p className="ph-subtitle">اختر منتجين أو أكثر من الكتالوج</p></div><button className="ph-icon-btn" onClick={() => { setCompare([]); setToast("تم مسح المقارنة"); }}><Trash2 /></button></div>
      <div className="ph-chip-row" style={{ flexWrap: "wrap" }}>{catalog.map(p => <button className={`ph-chip ${compare.includes(p.id) ? "active" : ""}`} key={p.id} onClick={() => toggleCompare(p.id)}>{compare.includes(p.id) ? "✓ " : "+ "}{p.name}</button>)}</div>
      {!items.length ? <div className="ph-empty"><ArrowUpDown /><strong>ابدأ بإضافة منتجات للمقارنة</strong><p>اختر منتجين من القائمة أعلاه، أو أضف منتجًا للمقارنة من صفحة التفاصيل.</p><button className="ph-btn outline" onClick={() => nav("categories")}>تصفّح المنتجات</button></div> : items.map(p => <div className="ph-row-card" key={p.id}>
        <div className="ph-row"><img src={p.image} alt="" style={{ width: 67, height: 62, objectFit: "contain", background: "#f6f8f7", borderRadius: 10 }} /><div className="ph-row-main"><strong>{p.name}</strong><small>{p.kind}</small></div><button className="ph-icon-btn" onClick={() => toggleCompare(p.id)}><X /></button></div>
        <div className="ph-divider" /><div className="ph-line-item"><span>السعر</span><b>{fmt(p.price)}</b></div><div className="ph-line-item"><span>القياسات</span><b style={{ direction: "rtl", textAlign: "left" }}>{p.variants?.join("، ") ?? "غير متوفر"}</b></div><div className="ph-line-item"><span>التوافق</span><b style={{ direction: "rtl", textAlign: "left", maxWidth: 200 }}>{p.compatibility}</b></div><div className="ph-line-item"><span>المواصفات</span><b style={{ direction: "rtl", textAlign: "left", maxWidth: 200 }}>{p.specs.join("، ")}</b></div>
        <div className="ph-row" style={{ gap: 8, marginTop: 10 }}><button className="ph-btn outline" style={{ flex: 1 }} onClick={() => selectProduct(p)}>التفاصيل</button><button className="ph-btn" style={{ flex: 1 }} onClick={() => p.variants ? selectProduct(p) : addToCart(p)}>أضف للسلة</button></div>
      </div>)}
      <div className="ph-notice">المقارنة تجريبية. أي توافق أو مواصفة غير مذكورة موضحة كغير مؤكدة.</div>
    </>;
  };

  const renderAdminGate = () => <>
    <div className="ph-title-row"><div><span className="ph-eyebrow">مساحة الإدارة</span><h1 className="ph-title">تحقق من دور المدير</h1><p className="ph-subtitle">خطوة مرئية داخل النموذج فقط؛ ليست حماية أو مصادقة فعلية.</p></div><div className="ph-ai-icon"><LockKeyhole /></div></div>
    <div className="ph-alert">إخفاء الواجهة ليس أمنًا حقيقيًا. يجب تطبيق التحقق والصلاحيات على الخادم قبل أي استخدام تشغيلي.</div>
    <div className="ph-input-wrap"><label>رمز العرض التجريبي</label><input className="ph-input" placeholder="أدخل أي قيمة للمتابعة" /></div>
    <button className="ph-btn full" onClick={() => { setAdminAllowed(true); setAdminSection("overview"); go("admin"); }}>متابعة بدور مدير تجريبي <LockKeyhole /></button>
    <button className="ph-btn outline full" style={{ marginTop: 10 }} onClick={() => nav("profile")}>العودة لحسابي</button>
    {adminAllowed && <div className="ph-notice" style={{ marginTop: 14 }}>تم تفعيل وضع العرض محليًا فقط.</div>}
  </>;

  const adminNav = () => <nav className="ph-bottom ph-admin-bottom">
    {[
      ["overview", "نظرة عامة", LayoutDashboard],
      ["adminProducts", "المنتجات", Package],
      ["adminOrders", "الطلبات", ClipboardList],
      ["automation", "الأتمتة", Workflow],
    ].map(([dest, label, Icon]) => {
      const I = Icon as typeof LayoutDashboard;
      return <button key={dest as string} className={`ph-tab ${adminSection === dest ? "active" : ""}`} onClick={() => { setAdminSection(dest as string); go(dest as Page); }}><I /><span>{label as string}</span></button>;
    })}
  </nav>;
  const adminHeader = (title: string) => <div className="ph-admin-head">
    <div style={{ display: "flex", gap: 10, alignItems: "center" }}><div className="ph-brand">شعار<br />مؤقت</div><div><strong>{title}</strong><small>وضع مدير تجريبي · بيانات عينة</small></div></div>
    <button className="ph-icon-btn" onClick={() => nav("profile")} aria-label="العودة للتطبيق"><ArrowLeft /></button>
  </div>;
  const renderAdmin = () => <>
    {adminHeader("لوحة الإدارة")}
    <div className="ph-scroll">
      <div className="ph-title-row"><div><span className="ph-eyebrow">نظرة عامة</span><h1 className="ph-title">صباح الخير</h1></div>{demoTag("بيانات عينة")}</div>
      <div className="ph-notice">مؤشرات وأرقام هذا القسم أمثلة توضيحية وليست بيانات مبيعات أو عملاء حقيقية.</div>
      <div className="ph-admin-kpis">{[["الطلبات", "—"], ["المبيعات", "—"], ["بانتظار مراجعة", "2"], ["حالة الأتمتة", "تجريبية"]].map(([label, val]) => <div className="ph-kpi" key={label}><small>{label}</small><strong>{val}</strong></div>)}</div>
      <div className="ph-section-head"><h3>إدارة المتجر</h3></div>
      <div className="ph-admin-grid">
        {[
          ["المنتجات", "إدارة الكتالوج", Package, "adminProducts"],
          ["الطلبات", "عرض الطلبات التجريبية", ClipboardList, "adminOrders"],
          ["العملاء", "بيانات عينة فقط", Users, "adminCustomers"],
          ["الحملات", "محتوى ومؤشرات عينة", Megaphone, "campaigns"],
          ["استوديو المحتوى", "مسودات تحتاج موافقة", FileText, "content"],
          ["مركز الأتمتة", "سير عمل محاكاة", Workflow, "automation"],
          ["ذكاء التسويق", "تحليل عينة", BarChart3, "intelligence"],
          ["سجل التشغيل", "سجل توضيحي", Clock3, "history"],
        ].map(([label, sub, Icon, dest]) => {
          const I = Icon as typeof Package;
          return <button className="ph-admin-tile" key={dest as string} onClick={() => { setAdminSection(dest as string); go(dest as Page); }}><I /><strong>{label as string}</strong><small>{sub as string}</small></button>;
        })}
      </div>
      <div className="ph-section"><div className="ph-row-card"><div className="ph-row"><CircleAlert color="#d3932a" /><div className="ph-row-main"><strong>لا توجد بيانات تشغيل فعلية</strong><small>المخزون، الطلبات، العملاء والتنبيهات غير متصلة.</small></div></div></div></div>
    </div>
  </>;
  const renderAdminProducts = () => <>
    {adminHeader("إدارة المنتجات")}
    <div className="ph-scroll">
      <div className="ph-title-row"><div><h1 className="ph-title">المنتجات</h1><p className="ph-subtitle">بيانات الكتالوج المرجعية · تحرير محلي</p></div><button className="ph-icon-btn" onClick={() => setToast("إضافة منتج جديدة غير محفوظة — لا يوجد backend")}><Plus /></button></div>
      <div className="ph-search"><Search /><input value={adminSearch} onChange={e => setAdminSearch(e.target.value)} placeholder="ابحث في قائمة المنتجات" /></div>
      <div className="ph-chip-row"><button className="ph-chip active">الكل</button><button className="ph-chip">السعر</button><button className="ph-chip">التصنيف</button></div>
      {catalog.filter(p => !adminSearch || p.name.includes(adminSearch)).map(p => <div className="ph-row-card" key={p.id}><div className="ph-row"><img src={p.image} alt="" style={{ width: 62, height: 58, objectFit: "contain", background: "#f5f8f7", borderRadius: 10 }} /><div className="ph-row-main"><strong>{p.name}</strong><small>{p.kind} · {fmt(p.price)}</small><small>حالة المخزون: غير متوفر</small></div><button className="ph-icon-btn" onClick={() => setToast("التعديل محاكاة محلية فقط")}><Pencil /></button></div></div>)}
      <div className="ph-notice">لا يتم تعديل أو نشر بيانات المتجر من هذا النموذج. معلومات المخزون غير متوفرة.</div>
    </div>
  </>;
  const renderAdminOrders = () => <>
    {adminHeader("إدارة الطلبات")}
    <div className="ph-scroll"><div className="ph-title-row"><div><h1 className="ph-title">الطلبات</h1><p className="ph-subtitle">لا توجد بيانات طلبات حقيقية</p></div>{demoTag("نموذج")}</div>
      {demoOrders.length ? demoOrders.map(id => <div className="ph-row-card" key={id}><div className="ph-row"><Package color="#168f85" /><div className="ph-row-main"><strong>{id}</strong><small>طلب أنشأه المستخدم في العرض التوضيحي</small></div><span className="ph-order-status">قيد المراجعة</span></div><div className="ph-divider" /><button className="ph-link" onClick={() => setToast("تحديث الحالة غير متصل بنظام الطلبات")}>تغيير الحالة <ChevronLeft /></button></div>) : <div className="ph-empty"><ClipboardList /><strong>لا توجد طلبات نموذجية</strong><p>أنشئ طلبًا تجريبيًا من رحلة الشراء لتراه هنا.</p><button className="ph-btn" onClick={() => nav("home")}>العودة للتسوق</button></div>}
    </div>
  </>;
  const renderAdminCustomers = () => <>
    {adminHeader("إدارة العملاء")}
    <div className="ph-scroll"><div className="ph-title-row"><div><h1 className="ph-title">العملاء</h1><p className="ph-subtitle">لا توجد ملفات عملاء في النموذج</p></div><Users color="#168f85" /></div>
      <div className="ph-empty"><Users /><strong>بيانات العملاء غير متصلة</strong><p>لا يتم إنشاء أو استيراد أي سجلات شخصية في النموذج. تتطلب بيانات العملاء الفعلية صلاحيات وتكاملًا آمنًا.</p><button className="ph-btn outline" onClick={() => setToast("البيانات الحساسة غير متاحة في هذا العرض")}>متطلبات الخصوصية</button></div>
      <div className="ph-row-card"><strong style={{ fontSize: 12 }}>تفضيلات التواصل</strong><p className="ph-subtitle">لا توجد سجلات موافقة تسويقية. لا ترسل حملات دون تحقق من الموافقة.</p></div>
    </div>
  </>;
  const renderCampaigns = () => <>
    {adminHeader("الحملات والتحليلات")}
    <div className="ph-scroll"><div className="ph-title-row"><div><h1 className="ph-title">الحملات</h1><p className="ph-subtitle">إحصاءات تجريبية فقط؛ لا توجد حملات منشورة.</p></div><button className="ph-icon-btn" onClick={() => go("content")}><Plus /></button></div>
      <div className="ph-alert">الأداء، الوصول، النقرات والمبيعات غير متصلة. لا توجد نتائج فعلية.</div>
      {[
        ["تعريف قلم PadHouse", "مسودة · بانتظار مراجعة بشرية", "محتوى اجتماعي"],
        ["دليل اختيار قياس الكفر", "فكرة حملة · غير مجدولة", "توعية المنتج"],
      ].map(([title, status, label]) => <div className="ph-row-card" key={title}><div className="ph-row"><div className="ph-ai-icon"><Megaphone /></div><div className="ph-row-main"><strong>{title}</strong><small>{label}</small><small>{status}</small></div><ChevronLeft /></div><div className="ph-divider" /><div className="ph-line-item"><span>المؤشرات</span><b style={{ direction: "rtl" }}>غير متاحة</b></div><button className="ph-link" onClick={() => go("content")}>فتح المسودة <ChevronLeft /></button></div>)}
      <button className="ph-btn full" onClick={() => go("intelligence")}>عرض ذكاء التسويق <BarChart3 /></button>
    </div>
  </>;
  const renderContent = () => <>
    {adminHeader("استوديو المحتوى")}
    <div className="ph-scroll"><div className="ph-title-row"><div><h1 className="ph-title">أنشئ مسودة محتوى</h1><p className="ph-subtitle">المحتوى محاكاة محلية — لن يُنشر تلقائيًا</p></div><FileText color="#168f85" /></div>
      <div className="ph-input-wrap"><label>المنتج / الفئة</label><select className="ph-input"><option>قلم الباد هاوس</option>{catalog.map(p => <option key={p.id}>{p.name}</option>)}</select></div>
      <div className="ph-input-wrap"><label>الجمهور</label><select className="ph-input"><option>طلاب ومستخدمو iPad</option><option>المبدعون</option><option>أصحاب الأعمال</option></select></div>
      <div className="ph-input-wrap"><label>الهدف</label><select className="ph-input"><option>تعريف بالمنتج</option><option>معلومة توافق</option><option>خدمة العملاء</option></select></div>
      <div className="ph-row" style={{ gap: 8 }}><div className="ph-input-wrap" style={{ flex: 1 }}><label>المنصة</label><select className="ph-input"><option>Instagram</option><option>Facebook</option><option>صفحة المنتج</option></select></div><div className="ph-input-wrap" style={{ flex: 1 }}><label>اللغة والنبرة</label><select className="ph-input"><option>عربي · ودّي</option><option>عربي فصيح</option></select></div></div>
      <div className="ph-input-wrap"><label>المسودة — قابلة للتحرير</label><textarea className="ph-input" value={draftText} onChange={e => setDraftText(e.target.value)} /></div>
      <div className="ph-row" style={{ gap: 8 }}><button className="ph-btn soft" style={{ flex: 1 }} onClick={() => setToast("توليد المحتوى غير متصل؛ يمكنك تحرير المسودة يدويًا")}><Sparkles /> توليد تجريبي</button><button className="ph-btn outline" style={{ flex: 1 }} onClick={() => navigator.clipboard?.writeText(draftText).then(() => setToast("تم نسخ المسودة")).catch(() => setToast("تعذر النسخ على هذا الجهاز"))}><Copy /> نسخ</button></div>
      <div className="ph-row-card" style={{ marginTop: 12 }}><div className="ph-row"><span className="ph-order-status">{draftStatus}</span><div className="ph-row-main"><strong>المحتوى يبقى مسودة</strong><small>لا يوجد نشر أو جدولة متصلة.</small></div></div></div>
      <button className="ph-btn full" onClick={() => { setDraftStatus("بانتظار موافقة بشرية"); setToast("حُفظت كمسودة بانتظار مراجعة بشرية"); }}>حفظ وإرسال للمراجعة البشرية</button>
      <div className="ph-alert" style={{ marginTop: 10 }}>لا يوجد توليد AI حقيقي ولا نشر تلقائي. الموافقة والنشر يتطلبان تكاملًا وصلاحية فعلية.</div>
    </div>
  </>;
  const workflows = [
    ["مسار المحتوى بمراجعة بشرية", "اختيار منتج ← مسودة ← مراجعة بشرية", "متوقف في العرض"],
    ["مساعدة العملاء", "استفسار ← معلومات مؤكدة ← صياغة ← تصعيد", "محاكاة فقط"],
    ["ملخص التسويق الأسبوعي", "بيانات متاحة ← مؤشرات ← موجز للمدير", "بيانات غير متصلة"],
    ["تذكير السلة المتروكة", "يتطلب موافقة وتكامل رسائل وتتبع", "غير مفعّل"],
  ];
  const renderAutomation = () => <>
    {adminHeader("مركز الأتمتة")}
    <div className="ph-scroll"><div className="ph-title-row"><div><h1 className="ph-title">مركز الأتمتة</h1><p className="ph-subtitle">كل مسارات العمل هنا عرض توضيحي فقط</p></div><Workflow color="#168f85" /></div>
      <div className="ph-alert">لا توجد عمليات فعلية. تذكير السلة يتطلب أحداثًا وموافقة وتكامل رسائل؛ لا تعرضه كمسار تشغيلي.</div>
      <div className="ph-row-card"><div className="ph-row"><div className="ph-ai-icon"><Workflow /></div><div className="ph-row-main"><strong>ملخص الحالة</strong><small>4 مسارات تصميم · لا سجل تشغيل حقيقي</small></div></div></div>
      {workflows.map(([name, desc, status]) => <div className="ph-row-card" key={name}><div className="ph-row"><div className="ph-row-main"><strong>{name}</strong><small>{desc}</small><small>{status}</small></div><span className={`ph-order-status`}>{workflowEnabled && name === workflowName ? "عرض مفعّل محليًا" : "غير متصل"}</span></div><div className="ph-divider" /><div className="ph-row"><button className="ph-link" onClick={() => { setWorkflowName(name); setWorkflowResult(""); go("workflow"); }}>التفاصيل <ChevronLeft /></button><button className="ph-btn soft" onClick={() => { setWorkflowName(name); setWorkflowResult(""); go("workflow"); }}>اختبار عرض</button></div></div>)}
      <button className="ph-link" onClick={() => go("history")}>سجل التنفيذ التجريبي <ChevronLeft /></button>
    </div>
  </>;
  const renderWorkflow = () => <>
    {adminHeader("تفاصيل سير العمل")}
    <div className="ph-scroll"><div className="ph-title-row"><div><span className="ph-eyebrow">مسار عمل تجريبي</span><h1 className="ph-title">{workflowName}</h1></div><button className="ph-icon-btn" onClick={() => setWorkflowEnabled(!workflowEnabled)}>{workflowEnabled ? <Check /> : <Settings />}</button></div>
      <div className="ph-notice">لا يتم تشغيل أي تكاملات أو مهام فعلية. التبديل يغير حالة الواجهة المحلية فقط.</div>
      <div className="ph-section-head" style={{ marginTop: 17 }}><h3>خطوات المسار</h3></div>
      {["حدث البداية", "قراءة المعلومات الموثقة", "صياغة أو تجهيز المسودة", "توقف للمراجعة البشرية"].map((step, i) => <div className="ph-row-card" key={step}><div className="ph-row"><div className="ph-ai-icon" style={{ width: 30, height: 30, borderRadius: 10 }}>{i + 1}</div><div className="ph-row-main"><strong>{step}</strong><small>{i === 3 ? "لا نشر تلقائي" : "محاكاة — غير متصل"}</small></div><ChevronLeft /></div></div>)}
      <div className="ph-row-card"><div className="ph-row"><div className="ph-row-main"><strong>حالة سير العمل</strong><small>{workflowEnabled ? "مفعّل داخل العرض فقط" : "متوقف داخل العرض"}</small></div><button className={`ph-btn ${workflowEnabled ? "outline" : ""}`} onClick={() => { setWorkflowEnabled(!workflowEnabled); setToast("تم تغيير حالة العرض المحلية فقط"); }}>{workflowEnabled ? "إيقاف" : "تفعيل عرض"}</button></div></div>
      <button className="ph-btn full" onClick={() => setWorkflowResult("فشل الاختبار التجريبي: لم يتم إعداد أي تكامل أو بيانات تشغيل.")}>تشغيل اختبار توضيحي <RefreshCw /></button>
      {workflowResult && <div className="ph-alert" style={{ marginTop: 12 }}>{workflowResult}<div style={{ marginTop: 8 }}><button className="ph-link" onClick={() => setWorkflowResult("")}>إعادة الاختبار <RefreshCw /></button></div></div>}
      <button className="ph-btn outline full" style={{ marginTop: 10 }} onClick={() => go("history")}>عرض سجل التشغيل التجريبي</button>
    </div>
  </>;
  const renderHistory = () => <>
    {adminHeader("سجل التنفيذ")}
    <div className="ph-scroll"><div className="ph-title-row"><div><h1 className="ph-title">سجل التنفيذ</h1><p className="ph-subtitle">لا توجد عمليات حقيقية أو معرفات تشغيل</p></div><Clock3 color="#168f85" /></div>
      <div className="ph-empty"><ClipboardList /><strong>سجل النموذج فارغ</strong><p>لم يتم تنفيذ أي أتمتة. اختبارات العرض تظهر النتيجة مباشرة ولا تُسجّل كتاريخ فعلي.</p><button className="ph-btn outline" onClick={() => go("automation")}>العودة لمركز الأتمتة</button></div>
      <div className="ph-row-card"><strong style={{ fontSize: 12 }}>معاينة حالة فشل</strong><p className="ph-subtitle">عند غياب اتصال، تكون النتيجة: «فشل — لم يتم إعداد التكامل». إعادة المحاولة تظل اختبارًا محليًا ولا تشغّل مهمة.</p><button className="ph-link" onClick={() => go("workflow")}>التفاصيل وإعادة الاختبار <ChevronLeft /></button></div>
    </div>
  </>;
  const renderIntelligence = () => <>
    {adminHeader("ذكاء التسويق")}
    <div className="ph-scroll"><div className="ph-title-row"><div><h1 className="ph-title">ذكاء التسويق</h1><p className="ph-subtitle">تحليل توضيحي · بيانات عينة فقط</p></div><BarChart3 color="#168f85" /></div>
      <div className="ph-row-card"><div className="ph-row"><CalendarDays color="#168f85" /><div className="ph-row-main"><strong>الفترة</strong><small>غير محددة — لا توجد بيانات فعلية</small></div><button className="ph-link" onClick={() => setToast("لا توجد فترة تقرير فعلية")}>اختيار</button></div></div>
      <div className="ph-admin-kpis"><div className="ph-kpi"><small>المبيعات</small><strong>غير متاحة</strong></div><div className="ph-kpi"><small>التحويل</small><strong>غير متاح</strong></div><div className="ph-kpi"><small>أداء الحملات</small><strong>غير متاح</strong></div><div className="ph-kpi"><small>المنتجات</small><strong>كتالوج فقط</strong></div></div>
      <div className="ph-row-card"><span className="ph-eyebrow">ملاحظة تحليلية — ليست نتيجة AI</span><h3 style={{ fontSize: 13 }}>المعطيات لا تكفي لاستخلاص اتجاه</h3><p className="ph-subtitle">لا توجد بيانات مبيعات أو حملات متصلة. لا يمكن استنتاج منتج رابح أو اقتراح ميزانية تسويقية.</p></div>
      <div className="ph-row-card"><strong style={{ fontSize: 12 }}>اقتراح جمع بيانات</strong><div className="ph-spec"><Check />اربط تقارير المبيعات والحملات بعد اعتماد المصدر.</div><div className="ph-spec"><Check />تحقق من موافقات التواصل قبل أي حملة.</div><div className="ph-spec"><Check />قارن النتائج بفترة زمنية واضحة قبل توصية الإنفاق.</div><div className="ph-divider" /><small style={{ fontSize: 9, color: "#78868e" }}>المفقود: مؤشرات فعلية، فترة تقرير، ونسب إسناد موثوقة.</small></div>
      <button className="ph-btn outline full" onClick={() => go("campaigns")}>مراجعة الحملات</button>
    </div>
  </>;

  const isAdmin = (page.startsWith("admin") && page !== "adminGate") || ["campaigns", "content", "automation", "workflow", "history", "intelligence"].includes(page);
  const isAuth = ["signin", "register", "forgot"].includes(page);
  let content: ReactNode;
  switch (page) {
    case "home": content = renderHome(); break;
    case "categories": content = renderCategories(); break;
    case "category": content = renderCategory(); break;
    case "search": content = renderSearch(); break;
    case "product": content = renderProduct(); break;
    case "favorites": content = renderFavorites(); break;
    case "cart": content = renderCart(); break;
    case "checkout": content = renderCheckout(); break;
    case "confirmation": content = renderConfirmation(); break;
    case "orders": content = renderOrders(); break;
    case "tracking": content = renderTracking(); break;
    case "profile": content = renderProfile(); break;
    case "signin": case "register": case "forgot": content = renderAuth(); break;
    case "finder": content = renderFinder(); break;
    case "finderResults": content = renderFinderResults(); break;
    case "chat": content = renderChat(); break;
    case "support": content = renderSupport(); break;
    case "faq": content = renderFaq(); break;
    case "escalation": content = renderEscalation(); break;
    case "escalationDone": content = renderEscalationDone(); break;
    case "compare": content = renderCompare(); break;
    case "adminGate": content = renderAdminGate(); break;
    case "admin": content = renderAdmin(); break;
    case "adminProducts": content = renderAdminProducts(); break;
    case "adminOrders": content = renderAdminOrders(); break;
    case "adminCustomers": content = renderAdminCustomers(); break;
    case "campaigns": content = renderCampaigns(); break;
    case "content": content = renderContent(); break;
    case "automation": content = renderAutomation(); break;
    case "workflow": content = renderWorkflow(); break;
    case "history": content = renderHistory(); break;
    case "intelligence": content = renderIntelligence(); break;
    default: content = renderHome();
  }
  return (
    <div className="ph-root" dir="rtl" lang="ar">
      <div className="ph-status"><span>9:41</span><span className="ph-status-icons"><span>◔</span><span>◖</span><span style={{ border: "1px solid #52606d", borderRadius: 2, padding: "1px 3px" }}>100</span></span></div>
      {!isAdmin && !isAuth && page !== "adminGate" && page !== "confirmation" && (page === "home" ? null : header(page === "product" ? "تفاصيل المنتج" : page === "cart" ? "السلة" : page === "profile" ? "حسابي" : page === "categories" ? "التصنيفات" : undefined))}
      {!isAdmin && !isAuth && page !== "adminGate" && page !== "confirmation" ? <main className="ph-scroll" key={page}>{content}</main> : !isAdmin && isAuth ? <><div className="ph-top"><button className="ph-icon-btn" onClick={() => nav("profile")}><ArrowLeft /></button><div className="ph-brand-copy"><strong>حساب PadHouse</strong><small>تجربة واجهة محلية</small></div></div><main className="ph-scroll">{content}</main></> : !isAdmin && page === "confirmation" ? <main className="ph-scroll">{content}</main> : page === "adminGate" ? <><div className="ph-top"><button className="ph-icon-btn" onClick={() => nav("profile")}><ArrowLeft /></button><div className="ph-brand-copy"><strong>دخول الإدارة</strong><small>تحقق تجريبي من الدور</small></div></div><main className="ph-scroll">{content}</main></> : <>{content}</>}
      {isAdmin ? adminNav() : customerBottom}
      {toast && <div className="ph-toast" role="status">{toast}</div>}
      {filterOpen && <div className="ph-modal-backdrop" onClick={() => setFilterOpen(false)}><section className="ph-sheet" onClick={e => e.stopPropagation()}><div className="ph-row"><h3>فرز وتصفية</h3><button className="ph-icon-btn" onClick={() => setFilterOpen(false)}><X /></button></div><p>اختر حد السعر وطريقة الترتيب.</p><div className="ph-chip-row"><button className={`ph-chip ${filterPrice ? "active" : ""}`} onClick={() => setFilterPrice(!filterPrice)}>السعر حتى ₪120</button><button className={`ph-chip ${sort === "السعر: الأقل أولًا" ? "active" : ""}`} onClick={() => setSort("السعر: الأقل أولًا")}>الأقل سعرًا</button><button className={`ph-chip ${sort === "السعر: الأعلى أولًا" ? "active" : ""}`} onClick={() => setSort("السعر: الأعلى أولًا")}>الأعلى سعرًا</button></div><button className="ph-btn full" onClick={() => setFilterOpen(false)}>عرض النتائج</button><button className="ph-link" style={{ marginTop: 10 }} onClick={() => { setFilterPrice(false); setSort("الترتيب الافتراضي"); }}>مسح الفلاتر</button></section></div>}
    </div>
  );
}
