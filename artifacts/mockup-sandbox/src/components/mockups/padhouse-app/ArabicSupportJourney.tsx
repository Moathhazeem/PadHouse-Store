import { useState, type FormEvent } from "react";
import {
  ArrowLeft, ArrowRight, BadgeCheck, Bot, Check, ChevronDown, CircleAlert,
  Headphones, HelpCircle, MessageCircle, Package, Send, ShieldCheck,
  Smartphone, Sparkles, Truck, UserRound,
} from "lucide-react";
import "./arabicsupportjourney.css";

type Section = "finder" | "chat" | "faq" | "human" | "results" | "sent";
type Message = { text: string; from: "assistant" | "customer"; note?: string };

const products = [
  {
    id: "pencil", name: "قلم PadHouse", price: "₪120", type: "قلم",
    detail: "رفض راحة اليد · شحن سريع",
    compatibility: "توافق عام منشور لأجهزة iPad من 2018 فما بعد؛ الموديل الدقيق يحتاج تأكيدًا.",
    certainty: "منشور جزئيًا",
  },
  {
    id: "clear", name: "كفر سيليكون شفاف", price: "₪25", type: "كفر",
    detail: "قياسات منشورة: 10.2 · 10.9/11 · 12.9/13 إنش",
    compatibility: "القياس وحده لا يثبت التوافق مع موديل جهازك.",
    certainty: "غير مؤكد",
  },
  {
    id: "keyboard", name: "كفر مع كيبورد وتتش باد", price: "₪160", type: "كيبورد",
    detail: "أسود · قياسات منشورة متعددة",
    compatibility: "الموديل المحدد غير مؤكد؛ طابق القياس واسأل المتجر.",
    certainty: "غير مؤكد",
  },
  {
    id: "cable", name: "سلك Yesido CA153", price: "₪35", type: "شاحن أو كابل",
    detail: "Type‑C إلى iPhone",
    compatibility: "توافقه مع الآيباد غير مؤكد؛ الوصف المنشور يذكر iPhone.",
    certainty: "غير مؤكد",
  },
];

const prompts = [
  { title: "موديل جهازك", question: "ما موديل الآيباد الذي تملكه؟", answers: ["iPad 2018 أو أحدث", "10.2 إنش", "10.9 / 11 إنش", "12.9 / 13 إنش", "مش متأكد"] },
  { title: "استخدامك", question: "شو الاستخدام الأهم بالنسبة إلك؟", answers: ["دراسة وكتابة", "رسم وإبداع", "عمل وتنقّل", "حماية الجهاز", "غير ذلك"] },
  { title: "نوع الإكسسوار", question: "أي نوع بدك تلاقي؟", answers: ["قلم", "كفر", "كيبورد", "شاحن أو كابل", "رشّح لي"] },
  { title: "ميزانيتك", question: "كم ميزانيتك التقريبية؟", answers: ["حتى ₪40", "₪41–₪100", "₪101–₪160", "مرنة", "تخطي"] },
];

const faqItems = [
  {
    q: "كيف أتأكد إن الإكسسوار بناسب موديل الآيباد تبعي؟",
    a: "المعلومات المنشورة تذكر قياسات لبعض الكفرات، وتوافقًا عامًا لقلم PadHouse مع أجهزة iPad من 2018 فما بعد. هذا لا يثبت التوافق مع كل موديل. ابعث رقم الموديل الدقيق لفريق المتجر قبل الطلب.",
    tag: "مهم للتوافق",
  },
  {
    q: "كم مدة ورسوم التوصيل؟",
    a: "المرجع المنشور يعرض 1–3 أيام عمل. الرسوم المرجعية: الضفة الغربية ₪20، القدس ₪30، مناطق 48 ₪70، والاستلام من نابلس مجاني. قد تتغير؛ أكّدها مع المتجر.",
    tag: "معلومة مرجعية",
  },
  {
    q: "هل في مخزون؟",
    a: "ما عنا اتصال مباشر بالمخزون في هالتجربة، لذلك ما بنقدر نأكد التوفر. تواصل مع المتجر قبل ما تعتمد على أي منتج.",
    tag: "غير متصل",
  },
  {
    q: "شو سياسة الإرجاع؟",
    a: "تفاصيل سياسة الإرجاع غير متاحة ضمن المعلومات المنشورة هنا. اسأل فريق المتجر عن الشروط قبل الشراء.",
    tag: "المعلومة غير متاحة",
  },
  {
    q: "هل الدفع الإلكتروني متاح؟",
    a: "طريقة الدفع غير مؤكدة في هالنموذج. ما في أي دفعة أو طلب حقيقي يتم عبر هذه الواجهة.",
    tag: "غير مؤكد",
  },
];

export function ArabicSupportJourney() {
  const [section, setSection] = useState<Section>("finder");
  const [finderStep, setFinderStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      text: "أهلًا! بساعدك بالمعلومات المنشورة عن الإكسسوارات. إذا التوافق مش مذكور بوضوح، رح أوضّحلك إنه غير مؤكد بدل ما أخمّن.",
      from: "assistant",
      note: "مساعد تجريبي · ليس خدمة AI فعلية",
    },
  ]);
  const [openFaq, setOpenFaq] = useState(0);
  const [contact, setContact] = useState({ name: "", phone: "", question: "" });
  const [formError, setFormError] = useState("");

  const moveTo = (next: Section) => {
    setSection(next);
    setFormError("");
  };

  const chooseAnswer = (answer: string) => {
    setAnswers((old) => {
      const next = [...old];
      next[finderStep] = answer;
      return next;
    });
    if (finderStep < prompts.length - 1) setFinderStep((step) => step + 1);
    else setSection("results");
  };

  const startOver = () => {
    setAnswers([]);
    setFinderStep(0);
    setSection("finder");
  };

  const replyFor = (question: string) => {
    const normalized = question.toLowerCase();
    if (normalized.includes("توصيل") || normalized.includes("رسوم") || normalized.includes("شحن")) {
      return "المرجع المنشور يذكر 1–3 أيام عمل، ورسومًا تختلف حسب المنطقة. هاي معلومات مرجعية وقد تتغير، فالأفضل تأكيدها مع المتجر.";
    }
    if (normalized.includes("كفر") || normalized.includes("قياس") || normalized.includes("موديل") || normalized.includes("توافق") || normalized.includes("مناسب")) {
      return "للكفرات، المنشور هو قياسات مثل 10.2 و10.9/11 إنش، لكن القياس وحده ما بيثبت التوافق مع موديلك. قلم PadHouse مذكور أنه يناسب أجهزة iPad من 2018 فما بعد بشكل عام؛ التوافق مع موديل محدد غير مؤكد. ابعث رقم الموديل لفريق المتجر للتأكيد.";
    }
    if (normalized.includes("قلم")) {
      return "بحسب صفحة المنتج، قلم PadHouse مذكور أنه متوافق مع أجهزة iPad من 2018 فما بعد. هاد توافق عام، مش تأكيد لموديلك المحدد أو للمخزون.";
    }
    return "ما عندي معلومة منشورة كافية لأأكد هالنقطة. ما رح أخمّن — فريق المتجر بقدر يساعدك بتأكيدها.";
  };

  const sendMessage = (text = chatInput) => {
    const question = text.trim();
    if (!question) return;
    setMessages((old) => [
      ...old,
      { text: question, from: "customer" },
      { text: replyFor(question), from: "assistant", note: "إجابة مرجعية · التوافق غير المذكور يحتاج تأكيدًا" },
    ]);
    setChatInput("");
  };

  const submitContact = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!contact.name.trim()) {
      setFormError("اكتب اسمك عشان نجهّز طلب التواصل.");
      return;
    }
    if (contact.phone.replace(/\D/g, "").length < 7) {
      setFormError("تأكد من رقم الهاتف — لازم يكون 7 أرقام على الأقل.");
      return;
    }
    if (!contact.question.trim()) {
      setFormError("اكتب باختصار كيف ممكن نساعدك.");
      return;
    }
    setFormError("");
    setSection("sent");
  };

  const matchingProducts = () => {
    const type = answers[2] ?? "";
    if (type === "قلم") return products.filter((item) => item.id === "pencil");
    if (type === "كفر") return products.filter((item) => item.id === "clear");
    if (type === "كيبورد") return products.filter((item) => item.id === "keyboard");
    if (type === "شاحن أو كابل") return products.filter((item) => item.id === "cable");
    return products.slice(0, 3);
  };

  const navItems: { id: Section; label: string; icon: typeof Smartphone; number: string }[] = [
    { id: "finder", label: "مستشار الإكسسوارات", icon: Smartphone, number: "01" },
    { id: "chat", label: "اسأل المساعد", icon: MessageCircle, number: "02" },
    { id: "faq", label: "الأسئلة الشائعة", icon: HelpCircle, number: "03" },
    { id: "human", label: "تواصل مع شخص", icon: Headphones, number: "04" },
  ];

  const sectionLabel = section === "finder" || section === "results" ? "مستشار الإكسسوارات"
    : section === "chat" ? "اسأل المساعد"
      : section === "faq" ? "الأسئلة الشائعة"
        : section === "human" || section === "sent" ? "دعم من فريق المتجر" : "مركز المساعدة";

  return (
    <div className="asj-app" dir="rtl" lang="ar">
      <div className="asj-ambient" aria-hidden="true" />
      <div className="asj-shell">
        <aside className="asj-rail">
          <div className="asj-brand">
            <span className="asj-brand-mark"><span>p</span></span>
            <span className="asj-brand-copy"><b>PadHouse</b><small>مركز المساعدة</small></span>
          </div>
          <div className="asj-rail-intro">
            <span className="asj-overline">خدمة واضحة، قبل الطلب</span>
            <h1>خلّينا نلاقي<br />الأنسب لجهازك.</h1>
            <p>إرشاد بالعربي، ومعلومة صريحة لما التوافق لسه مش مؤكد.</p>
          </div>
          <nav className="asj-navigation" aria-label="أقسام المساعدة">
            {navItems.map(({ id, label, icon: Icon, number }) => (
              <button
                type="button"
                key={id}
                onClick={() => moveTo(id)}
                className={`asj-nav-item ${section === id || ((section === "results") && id === "finder") || ((section === "sent") && id === "human") ? "is-active" : ""}`}
                aria-current={section === id ? "page" : undefined}
              >
                <span className="asj-nav-icon"><Icon size={18} /></span>
                <span>{label}</span>
                <small>{number}</small>
              </button>
            ))}
          </nav>
          <div className="asj-rail-note">
            <ShieldCheck size={17} />
            <p><b>ما بنخمن بالتوافق.</b><br />بنفرّق بين المعلومة المنشورة واللي لسه بدها تأكيد.</p>
          </div>
          <div className="asj-rail-foot"><span className="asj-live-dot" /> تجربة واجهة توضيحية</div>
        </aside>

        <main className="asj-main">
          <header className="asj-topbar">
            <div className="asj-crumb"><span>PadHouse</span><i>/</i><b>{sectionLabel}</b></div>
            <div className="asj-topbar-right">
              <span className="asj-status"><span /> بيانات مرجعية</span>
              <button type="button" className="asj-avatar" aria-label="ملف المستخدم التجريبي"><UserRound size={17} /></button>
            </div>
          </header>

          <div className="asj-content" key={section}>
            {section === "finder" && (
              <section className="asj-view">
                <div className="asj-heading-row">
                  <div>
                    <span className="asj-kicker"><Sparkles size={15} /> دليل اختيار تفاعلي</span>
                    <h2>نبدأ من جهازك.</h2>
                    <p className="asj-lede">كم سؤال صغير، وبنفرجيك خيارات الكتالوج مع حدود التوافق بوضوح.</p>
                  </div>
                  <div className="asj-step-count"><b>0{finderStep + 1}</b><span>/ 0{prompts.length}</span></div>
                </div>
                <div className="asj-progress" aria-label={`السؤال ${finderStep + 1} من ${prompts.length}`}>
                  {prompts.map((prompt, index) => (
                    <span key={prompt.title} className={index <= finderStep ? "is-done" : ""} />
                  ))}
                </div>

                <div className="asj-finder-layout">
                  <section className="asj-question-panel">
                    <div className="asj-question-meta"><span>خطوة {finderStep + 1}</span><span>{prompts[finderStep].title}</span></div>
                    <h3>{prompts[finderStep].question}</h3>
                    <p className="asj-question-help">
                      {finderStep === 0 ? "إذا مش متأكد، اختار «مش متأكد» — ما في داعي تخمّن الموديل." : "اختار الأقرب إلك، وبتقدر تعدّل إجاباتك مع فريق المتجر."}
                    </p>
                    <div className="asj-choice-grid">
                      {prompts[finderStep].answers.map((answer, index) => (
                        <button
                          type="button"
                          key={answer}
                          onClick={() => chooseAnswer(answer)}
                          className={`asj-choice ${answers[finderStep] === answer ? "is-selected" : ""}`}
                        >
                          <span className="asj-choice-index">0{index + 1}</span>
                          <span>{answer}</span>
                          {answers[finderStep] === answer && <Check size={17} />}
                        </button>
                      ))}
                    </div>
                    <div className="asj-question-footer">
                      <button type="button" className="asj-text-action" onClick={() => finderStep === 0 ? moveTo("chat") : setFinderStep((step) => step - 1)}>
                        <ArrowRight size={16} /> {finderStep === 0 ? "اسأل المساعد بدلًا من ذلك" : "السؤال السابق"}
                      </button>
                      <button type="button" className="asj-skip" onClick={() => chooseAnswer("تخطي")}>تخطي السؤال <ArrowLeft size={14} /></button>
                    </div>
                  </section>
                  <aside className="asj-side-card">
                    <div className="asj-side-icon"><CircleAlert size={20} /></div>
                    <span className="asj-mini-label">معلومة مهمة</span>
                    <h3>القياس مش دايمًا كفاية.</h3>
                    <p>بعض المنتجات إلها قياسات منشورة، بس هاد لحاله ما بيأكد توافقها مع جيل أو موديل iPad محدد.</p>
                    <button type="button" onClick={() => moveTo("faq")}>اقرأ كيف نتحقق <ArrowLeft size={14} /></button>
                    <div className="asj-side-decoration" aria-hidden="true">?</div>
                  </aside>
                </div>
                <div className="asj-bottom-note"><span className="asj-lock"><ShieldCheck size={15} /></span><span>إجاباتك إرشادية فقط — ما في تحقق من المخزون أو إرسال بيانات.</span><button type="button" onClick={() => moveTo("human")}>بدي أحكي مع شخص</button></div>
              </section>
            )}

            {section === "results" && (
              <section className="asj-view">
                <div className="asj-heading-row">
                  <div><span className="asj-kicker"><Sparkles size={15} /> نتيجة الدليل</span><h2>خيارات قريبة من طلبك.</h2><p className="asj-lede">مبنية على إجاباتك ومعلومات المنتج المنشورة — مش فحص توافق مباشر.</p></div>
                  <button type="button" className="asj-outline-button" onClick={startOver}>ابدأ من جديد <ArrowRight size={15} /></button>
                </div>
                <div className="asj-answer-summary">
                  <span><Smartphone size={16} /> جهازك: <b>{answers[0] || "غير محدد"}</b></span>
                  <span><Package size={16} /> بتدور على: <b>{answers[2] || "خيارات متنوعة"}</b></span>
                </div>
                <div className="asj-uncertain-banner">
                  <span className="asj-alert-mark"><CircleAlert size={19} /></span>
                  <div><b>التوافق مع موديلك المحدد غير مؤكد.</b><p>الاختيار هنا يطابق نوع المنتج أو القياس المنشور فقط. أكّد رقم الموديل مع المتجر قبل الطلب.</p></div>
                  <button type="button" onClick={() => moveTo("human")}>تحقق مع الفريق <ArrowLeft size={14} /></button>
                </div>
                <div className="asj-result-list">
                  {matchingProducts().map((product, index) => (
                    <article className="asj-product" key={product.id}>
                      <div className="asj-product-visual"><span className="asj-product-number">0{index + 1}</span><Package size={25} /></div>
                      <div className="asj-product-main">
                        <div className="asj-product-heading"><span className="asj-product-type">{product.type}</span><span className={`asj-certainty ${product.id === "pencil" ? "is-partial" : "is-unknown"}`}><CircleAlert size={12} />{product.certainty}</span></div>
                        <h3>{product.name}</h3><p>{product.detail}</p>
                        <div className="asj-product-warning"><CircleAlert size={14} /><span>{product.compatibility}</span></div>
                      </div>
                      <div className="asj-product-price">{product.price}<small>سعر منشور*</small></div>
                    </article>
                  ))}
                </div>
                <div className="asj-fine-print">* الأسعار والتفاصيل مرجعية من صفحات المنتج. المخزون غير متصل ولا يتم إرسال طلب حقيقي.</div>
                <div className="asj-result-actions"><button type="button" className="asj-primary-button" onClick={() => moveTo("chat")}>اسأل عن التوافق <MessageCircle size={16} /></button><button type="button" className="asj-link-button" onClick={() => moveTo("faq")}>راجع الأسئلة الشائعة <ArrowLeft size={15} /></button></div>
              </section>
            )}

            {section === "chat" && (
              <section className="asj-view asj-chat-view">
                <div className="asj-heading-row">
                  <div><span className="asj-kicker"><Bot size={15} /> مساعدة فورية</span><h2>احكيلي شو بدك تعرف.</h2><p className="asj-lede">إجابات عربية مبنية على المرجع المتاح. ولما ما نعرف، بنقولها بصراحة.</p></div>
                  <div className="asj-bot-mark"><Bot size={24} /><span /></div>
                </div>
                <div className="asj-chat-frame">
                  <div className="asj-chat-top"><div className="asj-chat-avatar"><Bot size={18} /></div><div><b>مساعد PadHouse</b><small><span /> متاح للتجربة · ردود مرجعية</small></div><span className="asj-demo-stamp">محاكاة محلية</span></div>
                  <div className="asj-messages" aria-live="polite">
                    {messages.map((message, index) => (
                      <div className={`asj-message-row ${message.from === "customer" ? "from-customer" : ""}`} key={`${index}-${message.text.slice(0, 10)}`}>
                        {message.from === "assistant" && <span className="asj-message-avatar"><Bot size={14} /></span>}
                        <div className="asj-message">
                          <p>{message.text}</p>
                          {message.note && <small>{message.note}</small>}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="asj-suggestions">
                    <span>جرّب تسأل</span>
                    {["هل الكفر بناسب iPad 11 إنش؟", "هل القلم متوافق مع جهازي؟", "كم رسوم التوصيل؟"].map((prompt) => (
                      <button type="button" key={prompt} onClick={() => sendMessage(prompt)}>{prompt}</button>
                    ))}
                  </div>
                  <form className="asj-chat-input" onSubmit={(event) => { event.preventDefault(); sendMessage(); }}>
                    <input aria-label="اكتب سؤالك" value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="اكتب سؤالك بالعربي..." />
                    <button type="submit" aria-label="إرسال السؤال" disabled={!chatInput.trim()}><Send size={17} /></button>
                  </form>
                </div>
                <div className="asj-chat-disclaimer"><ShieldCheck size={16} /><span>المحادثة تجريبية وغير متصلة بخدمة ذكاء اصطناعي. لا نؤكد توافقًا غير مذكور في معلومات المنتج.</span></div>
                <div className="asj-escalate-inline"><span>بدك تأكيد من حدا من الفريق؟</span><button type="button" onClick={() => moveTo("human")}>اطلب تواصل بشري <ArrowLeft size={14} /></button></div>
              </section>
            )}

            {section === "faq" && (
              <section className="asj-view">
                <div className="asj-heading-row">
                  <div><span className="asj-kicker"><HelpCircle size={15} /> إجابات قبل الشراء</span><h2>أسئلة بتتكرر.</h2><p className="asj-lede">المعلومة المنشورة واضحة، واللي مش متوفر بنعلّمه بدون تخمين.</p></div>
                  <span className="asj-faq-count">{String(faqItems.length).padStart(2, "0")} <small>أسئلة</small></span>
                </div>
                <div className="asj-faq-layout">
                  <div className="asj-faq-list">
                    {faqItems.map((item, index) => (
                      <article className={`asj-faq-item ${openFaq === index ? "is-open" : ""}`} key={item.q}>
                        <button type="button" className="asj-faq-question" onClick={() => setOpenFaq(openFaq === index ? -1 : index)} aria-expanded={openFaq === index}>
                          <span className="asj-faq-index">0{index + 1}</span>
                          <span className="asj-faq-question-copy"><b>{item.q}</b>{openFaq === index && <small>{item.tag}</small>}</span>
                          <ChevronDown size={18} />
                        </button>
                        {openFaq === index && <div className="asj-faq-answer"><p>{item.a}</p>{index === 0 && <span className="asj-uncertain-inline"><CircleAlert size={14} /> توافق موديل محدد: غير مؤكد حتى يراجعه الفريق</span>}</div>}
                      </article>
                    ))}
                  </div>
                  <aside className="asj-faq-callout">
                    <div className="asj-callout-symbol"><BadgeCheck size={20} /></div>
                    <span className="asj-mini-label">نهجنا</span>
                    <h3>وضوح قبل الشراء.</h3>
                    <p>ما بنحوّل قياس عام لوعد توافق. إذا المعلومة ناقصة، منوجّهك للتأكد من فريق المتجر.</p>
                    <button type="button" onClick={() => moveTo("human")}>اسأل الفريق <ArrowLeft size={14} /></button>
                    <div className="asj-faq-counter"><b>01</b><span>من 05</span></div>
                  </aside>
                </div>
                <div className="asj-faq-bottom"><span>ما لقيت جوابك؟</span><button type="button" onClick={() => moveTo("chat")}>جرّب المساعد <MessageCircle size={15} /></button><button type="button" onClick={() => moveTo("human")}>تواصل مع شخص <Headphones size={15} /></button></div>
              </section>
            )}

            {section === "human" && (
              <section className="asj-view">
                <div className="asj-heading-row">
                  <div><span className="asj-kicker"><Headphones size={15} /> دعم من فريق المتجر</span><h2>خلّي الفريق يتابع معك.</h2><p className="asj-lede">جهّز طلب تواصل بخصوص التوافق أو أي استفسار. رح نوضح إذا الطلب تجريبي.</p></div>
                  <div className="asj-human-mark"><Headphones size={23} /></div>
                </div>
                <div className="asj-human-layout">
                  <form className="asj-contact-form" onSubmit={submitContact} noValidate>
                    <div className="asj-form-title"><span>طلب متابعة</span><small>حقول مطلوبة <i>*</i></small></div>
                    <label className="asj-field"><span>الاسم <i>*</i></span><input value={contact.name} onChange={(event) => setContact({ ...contact, name: event.target.value })} placeholder="الاسم اللي بنناديك فيه" autoComplete="name" /></label>
                    <label className="asj-field"><span>رقم الهاتف <i>*</i></span><input value={contact.phone} onChange={(event) => setContact({ ...contact, phone: event.target.value })} placeholder="05X XXX XXXX" inputMode="tel" dir="ltr" autoComplete="tel" /></label>
                    <label className="asj-field"><span>كيف ممكن نساعدك؟ <i>*</i></span><textarea value={contact.question} onChange={(event) => setContact({ ...contact, question: event.target.value })} placeholder="اكتب موديل الآيباد أو رقم المنتج وسؤالك..." rows={4} /></label>
                    {formError && <div className="asj-form-error" role="alert"><CircleAlert size={15} />{formError}</div>}
                    <button type="submit" className="asj-primary-button asj-submit">تجهيز طلب التواصل <ArrowLeft size={16} /></button>
                    <div className="asj-form-foot"><ShieldCheck size={14} /> معلوماتك ما بتنرسل في هالتجربة.</div>
                  </form>
                  <aside className="asj-contact-aside">
                    <span className="asj-mini-label">قبل الإرسال</span>
                    <h3>بدنا نساعدك بمعلومة دقيقة.</h3>
                    <p>لتأكيد التوافق، أرفق رقم موديل iPad من الإعدادات ← عام ← حول. القياس لحاله مش كافي بكل الحالات.</p>
                    <div className="asj-contact-check"><span><Check size={14} /></span><p><b>طلب تجريبي فقط</b><small>ما في اتصال أو رسالة حقيقية تنرسل.</small></p></div>
                    <div className="asj-contact-check"><span><Check size={14} /></span><p><b>لا نؤكد المخزون</b><small>بيانات المخزون غير متصلة بالنموذج.</small></p></div>
                    <div className="asj-contact-hours"><Truck size={16} /><span>معلومات التوصيل والأسعار مرجعية وقد تتغير.</span></div>
                  </aside>
                </div>
              </section>
            )}

            {section === "sent" && (
              <section className="asj-view asj-sent-view">
                <span className="asj-success-mark"><Check size={25} /></span>
                <span className="asj-kicker">تم تجهيز الطلب · تجربة توضيحية</span>
                <h2>وصلنا سؤالك…<br />داخل هالنموذج.</h2>
                <p className="asj-lede">ما انبعتت بيانات أو رسالة لفريق المتجر. تواصل مع قنوات PadHouse الرسمية إذا بدك تأكيد فعلي.</p>
                <div className="asj-sent-summary"><span>الاسم</span><b>{contact.name}</b><span>رقم الهاتف</span><b dir="ltr">{contact.phone}</b><span>الاستفسار</span><b>{contact.question}</b></div>
                <div className="asj-sent-actions"><button type="button" className="asj-primary-button" onClick={() => moveTo("faq")}>راجع الأسئلة الشائعة <HelpCircle size={16} /></button><button type="button" className="asj-link-button" onClick={() => moveTo("human")}>تجهيز طلب آخر <ArrowRight size={15} /></button></div>
              </section>
            )}
          </div>
          <footer className="asj-footer"><span>PADHOUSE / CARE</span><span>معلومات مرجعية · تحقق من المتجر قبل الطلب</span><span>01—04</span></footer>
        </main>
      </div>
    </div>
  );
}
