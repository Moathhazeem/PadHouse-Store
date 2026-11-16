import React, { useState } from 'react';
import {
  ShieldCheck,
  Truck,
  RotateCcw,
  CreditCard,
  HelpCircle,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  FileText,
  Lock,
  ChevronDown
} from 'lucide-react';
import { useScrollReveal } from '../components/ui';

interface StaticPagesProps {
  pageType:
    | 'about'
    | 'contact'
    | 'faq'
    | 'shipping_policy'
    | 'refund_policy'
    | 'warranty_policy'
    | 'privacy_policy'
    | 'terms';
  onNavigate: (page: string) => void;
}

export const StaticPages: React.FC<StaticPagesProps> = ({ pageType, onNavigate }) => {
  // FAQ questions toggle
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const aboutBenefitsReveal = useScrollReveal<HTMLDivElement>();

  const faqs = [
    {
      q: 'هل قلم بادهاوس يدعم جميع أجهزة الآيباد ويدعم راحة اليد (Palm Rejection)؟',
      a: 'نعم، قلم بادهاوس الذكي مصمم بأحدث التقنيات ليدعم جميع أجهزة الآيباد المدعومة من عام 2018 حتى موديلات 2026 (iPad Pro, iPad Air, iPad 10th/9th/8th, iPad mini). كما يدعم تقنية رفض راحة اليد التامة وحساسية الإمالة للتظليل دون أي تقطيع.'
    },
    {
      q: 'كم تستغرق مدة التوصيل، وهل الدفع عند الاستلام متاح؟',
      a: 'يتم التوصيل إلى جميع مدن ومحافظات الضفة الغربية والقدس وضواحيها خلال 24 إلى 48 ساعة كحد أقصى، وقطاع غزة بحسب الظروف الميدانية المتاحة. الدفع عند الاستلام متاح نقداً بعد فحص ومعاينة الطرد وسلامته.'
    },
    {
      q: 'ما هي كفالة وضمان المنتجات المباعة من بادهاوس؟',
      a: 'نحن نمنح ضمان استبدال فوري لمدة 12 شهراً كاملاً على أقلام بادهاوس، كيبوردات الآيباد، وكابلات الشحن ضد أي خلل أو عيب مصنعي.'
    },
    {
      q: 'كيف أختار مقاس الكفر أو شاشة الحماية المناسبة لجهازي؟',
      a: 'يمكنك معرفة رقم موديل جهازك من خلف الآيباد أو من (الإعدادات > عام > حول). وإذا كنت غير متأكد، تواصل معنا مباشرة عبر الواتساب على 0599123456 وسنقوم بمطابقة القطعة الأنسب لجهازك فوراً.'
    },
    {
      q: 'ما هو الفرق بين شاشة الزجاج 9H وشاشة PaperFeel؟',
      a: 'شاشة الزجاج 9H توفر أقصى حماية ضد الصدمات والكسر بوضوح شاشة كريستالي. بينما شاشة PaperFeel تقدم ملمساً ورقيّاً مطفياً خشناً يمنع انعكاس الضوء ويمنح الرسامين والطلاب تجربة كتابة بالقلم مطابقة تماماً للكتابة على الورق الحقيقي.'
    }
  ];

  // Contact form submission
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setContactSubmitted(true);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 text-right">
      {/* 1. ABOUT US */}
      {pageType === 'about' && (
        <div className="space-y-8 bg-white p-6 sm:p-10 rounded-3xl border border-ph-border shadow-xl">
          <div className="space-y-3">
            <span className="text-xs font-bold text-ph-brand">قصة بادهاوس</span>
            <h1 className="text-2xl sm:text-3xl font-black text-ph-ink">
              المتجر الفلسطيني المتخصص لملحقات أجهزة الآيباد
            </h1>
            <p className="text-sm text-ph-muted leading-relaxed">
              بدأت حكاية بادهاوس في رام الله من حاجة بسيطة: أن يجد مستخدم الآيباد في فلسطين ملحقاً مناسباً لجهازه مع وصف واضح وخدمة محلية موثوقة. نعمل على جمع خيارات عملية للطلاب والمصممين والمهنيين، مع مساعدة العملاء على اختيار القطعة المتوافقة قبل الشراء.
            </p>
          </div>
          <section className="grid gap-5 border-t border-ph-border pt-7 md:grid-cols-2">
            <div><h2 className="mb-2 text-sm font-bold text-ph-ink">رسالتنا في فلسطين</h2><p className="text-sm leading-7 text-ph-muted">نسهّل استخدام الآيباد للدراسة والعمل والإبداع عبر ملحقات مختارة بعناية، ومعلومات توافق مفهومة، وخدمة تنطلق من رام الله وتصل إلى مختلف المحافظات بحسب ترتيبات التوصيل المتاحة.</p></div>
            <div><h2 className="mb-2 text-sm font-bold text-ph-ink">لماذا الملحقات المتخصصة؟</h2><p className="text-sm leading-7 text-ph-muted">اختيار القلم أو الكفر أو لوحة المفاتيح وفق موديل الجهاز يحسّن الكتابة والحماية والإنتاجية، ويقلّل من القطع غير المناسبة. لذلك نوضح الاستخدام والتوافق ونشجع على التحقق من رقم الموديل قبل الطلب.</p></div>
            <div><h2 className="mb-2 text-sm font-bold text-ph-ink">كيف نراجع الجودة؟</h2><p className="text-sm leading-7 text-ph-muted">نراجع جودة التصنيع والتشطيب، ونجرب الوظائف الأساسية مثل الاقتران والشحن واستجابة الأزرار عند توفر عينات الاختبار، ثم نتحقق من بيانات التوافق والضمان قبل عرض المنتج. تفاصيل كل منتج تبقى مرجع الاختيار النهائي.</p></div>
            <div><h2 className="mb-2 text-sm font-bold text-ph-ink">محطاتنا</h2><p className="text-sm leading-7 text-ph-muted">من متجر متخصص انطلق من رام الله، إلى كتالوج يضم فئات الأقلام والكفرات ولوحات المفاتيح والحوامل والشحن والحماية، مع خدمة استفسارات تساعد على مطابقة الملحق مع جهاز العميل.</p></div>
          </section>
          <div className="grid grid-cols-2 gap-3 border-t border-ph-border pt-6 sm:grid-cols-4">
            {[['6', 'فئات ملحقات'], ['رام الله', 'نقطة انطلاقنا'], ['iPad', 'توافق موجّه حسب الموديل'], ['12 شهراً', 'مدة الضمان حسب المنتج']].map(([value, label]) => <div key={label} className="rounded-2xl bg-ph-background p-4 text-center"><strong className="block text-lg font-black text-ph-brand">{value}</strong><span className="mt-1 block text-xs text-ph-muted">{label}</span></div>)}
          </div>

          <div>
            <h2 className="mb-4 text-sm font-bold text-ph-ink">لماذا تختار بادهاوس؟</h2>
            <div ref={aboutBenefitsReveal.ref} style={aboutBenefitsReveal.style} className={`${aboutBenefitsReveal.className} ph-stagger-reveal grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4`}>
              {[
                {
                  icon: Truck,
                  title: 'توصيل سريع وموثوق',
                  description: 'توصيل لجميع محافظات الضفة، القدس، وغزة خلال 24-48 ساعة.',
                },
                {
                  icon: ShieldCheck,
                  title: 'ضمان أصلي حقيقي',
                  description: 'جميع المنتجات مضمونة مع استبدال فوري في حال أي عيب مصنعي.',
                },
                {
                  icon: RotateCcw,
                  title: 'استرجاع واستبدال مرن',
                  description: 'إمكانية استبدال القطع ومراجعة التوافق مع موديل جهازك بكل سهولة.',
                },
                {
                  icon: CreditCard,
                  title: 'الدفع عند الاستلام',
                  description: 'ادفع نقداً عند باب منزلك بعد فحص ومعاينة الطرد وسلامته.',
                },
              ].map(({ icon: Icon, title, description }, index) => (
                <article
                  key={title}
                  className="ph-stagger-item rounded-2xl border border-ph-border bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                  style={{ '--ph-stagger-index': index } as React.CSSProperties}
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-ph-surface-soft text-ph-brand">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="mb-1 text-xs font-bold text-ph-ink">{title}</h3>
                  <p className="text-xs leading-relaxed text-ph-muted">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. CONTACT US */}
      {pageType === 'contact' && (
        <div className="space-y-8 bg-white p-6 sm:p-10 rounded-3xl border border-ph-border shadow-xl">
          <div className="space-y-2">
            <span className="text-xs font-bold text-ph-brand">يسعدنا تواصلكم دائماً</span>
            <h1 className="text-2xl sm:text-3xl font-black text-ph-ink">تواصل مع فريق خدمة عملاء بادهاوس</h1>
            <p className="text-xs text-ph-muted">
              فريق الدعم الفني والمبيعات جاهز للرد على استفساراتكم حول التوافق والشحن.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* Contact Details */}
            <div className="space-y-5 bg-white p-6 rounded-2xl border border-ph-border">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-ph-brand shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-xs text-ph-ink">المقر والمستودعات:</strong>
                  <span className="text-xs text-ph-muted">فلسطين — رام الله والبيرة، شارع الماصيون</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-ph-brand shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-xs text-ph-ink">الهاتف المباشر والواتساب:</strong>
                  <span className="text-xs text-ph-muted dir-ltr block text-right">+970 59 912 3456</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-ph-brand shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-xs text-ph-ink">البريد الإلكتروني:</strong>
                  <span className="text-xs text-ph-muted">support@padhouse.ps</span>
                </div>
              </div>

              <div className="pt-3 border-t border-ph-border">
                <span className="text-xs font-bold text-ph-ink block mb-1">أوقات العمل والدعم:</span>
                <span className="text-xs text-ph-muted block">يومياً من 9:00 صباحاً حتى 9:00 مساءً</span>
              </div>
            </div>

            {/* Contact Form */}
            <div>
              {contactSubmitted ? (
                <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3">
                  <CheckCircle2 className="w-8 h-8 text-[#16A34A] mx-auto" />
                  <h3 className="text-sm font-bold text-emerald-900">تم إرسال رسالتك بنجاح!</h3>
                  <p className="text-xs text-emerald-700">
                    سيقوم فريق الدعم بالتواصل معك عبر الواتساب أو الهاتف خلال ساعات قليلة.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-ph-ink block mb-1">الاسم الكريم *</label>
                    <input
                      type="text"
                      required
                      placeholder="أدخل اسمك"
                      className="w-full bg-white border border-ph-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-ph-brand"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-ph-ink block mb-1">رقم الهاتف *</label>
                    <input
                      type="tel"
                      required
                      placeholder="059xxxxxxx"
                      className="w-full bg-white border border-ph-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-ph-brand"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-ph-ink block mb-1">الرسالة أو الاستفسار *</label>
                    <textarea
                      required
                      rows={4}
                      placeholder="اكتب استفسارك عن التوافق أو طلبك..."
                      className="w-full bg-white border border-ph-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-ph-brand"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-ph-brand hover:bg-ph-brand-hover text-white py-2.5 rounded-xl font-bold text-xs transition-colors shadow-sm"
                  >
                    إرسال الرسالة
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. FAQ */}
      {pageType === 'faq' && (
        <div className="space-y-6 bg-white p-6 sm:p-10 rounded-3xl border border-ph-border shadow-xl">
          <div className="space-y-2">
            <span className="text-xs font-bold text-ph-brand">إجابات فورية</span>
            <h1 className="text-2xl sm:text-3xl font-black text-ph-ink">الأسئلة الشائعة والأكثر تكراراً</h1>
            <p className="text-xs text-ph-muted">
              كل ما تود معرفته حول ملحقات الآيباد، الشحن، الضمان والدفع.
            </p>
          </div>

          <div className="space-y-3 pt-4">
            {faqs.map((f, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-ph-border bg-white overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-4 flex items-center justify-between text-right font-bold text-xs sm:text-sm text-ph-ink"
                  >
                    <span>{f.q}</span>
                    <ChevronDown className={`w-4 h-4 text-ph-muted transition-transform ${isOpen ? 'rotate-180 text-ph-brand' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="p-4 pt-0 text-xs text-ph-muted leading-relaxed border-t border-ph-border mt-2">
                      {f.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. SHIPPING POLICY */}
      {pageType === 'shipping_policy' && (
        <div className="space-y-6 bg-white p-6 sm:p-10 rounded-3xl border border-ph-border shadow-xl">
          <h1 className="text-2xl font-black text-ph-ink">سياسة الشحن والتوصيل</h1>
          <div className="space-y-4 text-xs text-ph-muted leading-relaxed">
            <p>
              يحرص متجر **بادهاوس** على تقديم تجربة شحن سريعة وآمنة لكافة زبائننا في فلسطين. فيما يلي تفاصيل الشحن:
            </p>
            <h3 className="text-sm font-bold text-ph-ink">1. مدة التوصيل:</h3>
            <p>
              يتم توصيل الطلبات خلال 24 إلى 48 ساعة كحد أقصى لكافة مدن الضفة الغربية والقدس وضواحيها. يتم التواصل هاتفياً من قبل شركة الشحن قبل الوصول لتأكيد الموعد والعنوان.
            </p>
            <h3 className="text-sm font-bold text-ph-ink">2. تكلفة الشحن:</h3>
            <ul className="list-disc pr-5 space-y-1">
              <li>رام الله والبيرة: 20 ₪</li>
              <li>القدس وضواحيها: 30 ₪</li>
              <li>باقي محافظات الضفة (نابلس، الخليل، بيت لحم، جنين، طولكرم، قلقيلية، أريحا، سلفيت، طوباس): 25 ₪</li>
              <li>قطاع غزة: 35 ₪ (عند فتح المعابر وتوفر المسارات الآمنة)</li>
            </ul>
            <h3 className="text-sm font-bold text-ph-ink">3. التغليف الآمن:</h3>
            <p>
              يتم تغليف كفرات الآيباد، شاشات الحماية، والأقلام الذكية بعلب مقواة ومبطنة بمواد مضادة للصدمات لضمان وصولها بحالتها المصنعية الأصلية.
            </p>
          </div>
        </div>
      )}

      {/* 5. REFUND & RETURN POLICY */}
      {pageType === 'refund_policy' && (
        <div className="space-y-6 bg-white p-6 sm:p-10 rounded-3xl border border-ph-border shadow-xl">
          <h1 className="text-2xl font-black text-ph-ink">سياسة الاستبدال والاسترجاع</h1>
          <div className="space-y-4 text-xs text-ph-muted leading-relaxed">
            <p>
              رضاكم هو أولويتنا الأولى في متجر بادهاوس. إذا كان المنتج غير متوافق مع جهازك أو وصل بحالة غير مطابقة:
            </p>
            <h3 className="text-sm font-bold text-ph-ink">1. فترة الاستبدال:</h3>
            <p>
              يحق للعميل طلب استبدال المنتج خلال مدة 7 أيام من تاريخ الاستلام، شريطة أن يكون المنتج بحالته الأصلية وبتغليفه المصنعي.
            </p>
            <h3 className="text-sm font-bold text-ph-ink">2. في حال وجود خلل مصنعي:</h3>
            <p>
              يتم استبدال القطعة فوراً بقطعة جديدة على حساب المتجر بالكامل دون تحميل العميل أي رسوم شحن إضافية.
            </p>
            <h3 className="text-sm font-bold text-ph-ink">3. المنتجات المستثناة من الاسترجاع:</h3>
            <p>
              شاشات الحماية التي تم نزع اللصاقة الوقائية منها وتركيبها لا يمكن استرجاعها إلا في حال وجود عيب مصنعي في مقاس الشاشة أو خامتها.
            </p>
          </div>
        </div>
      )}

      {/* 6. WARRANTY POLICY */}
      {pageType === 'warranty_policy' && (
        <div className="space-y-6 bg-white p-6 sm:p-10 rounded-3xl border border-ph-border shadow-xl">
          <h1 className="text-2xl font-black text-ph-ink">سياسة الضمان والكفالة المعتمدة</h1>
          <div className="space-y-4 text-xs text-ph-muted leading-relaxed">
            <p>
              نحن نلتزم بتقديم كفالة حقيقية تضمن راحة بالك وأداء جهازك اللوحي:
            </p>
            <h3 className="text-sm font-bold text-ph-ink">1. ضمان الأقلام والكيبوردات (12 شهراً):</h3>
            <p>
              يشمل الضمان استبدال قلم بادهاوس الذكي أو لوحات المفاتيح في حال توقف الاستجابة، تعطل شحن البطارية، أو خلل في الاتصال بالبلوتوث.
            </p>
            <h3 className="text-sm font-bold text-ph-ink">2. ضمان كابلات الشحن Yesido (6-12 شهراً):</h3>
            <p>
              ضمان ضد التوقف المفاجئ لنقل الطاقة والشحن السريع.
            </p>
            <h3 className="text-sm font-bold text-ph-ink">3. ما لا يشمله الضمان:</h3>
            <p>
              الأضرار الناتجة عن سوء الاستخدام، السقوط الشديد في المياه، أو الكسر المتعمد.
            </p>
          </div>
        </div>
      )}

      {/* 7. PRIVACY POLICY */}
      {pageType === 'privacy_policy' && (
        <div className="space-y-6 bg-white p-6 sm:p-10 rounded-3xl border border-ph-border shadow-xl">
          <h1 className="text-2xl font-black text-ph-ink">سياسة الخصوصية وأمان البيانات</h1>
          <div className="space-y-4 text-xs text-ph-muted leading-relaxed">
            <p>
              نحن في متجر بادهاوس نحترم خصوصيتك ونلتزم بحماية بياناتك الشخصية:
            </p>
            <h3 className="text-sm font-bold text-ph-ink">1. البيانات التي نجمعها:</h3>
            <p>
              نجمع فقط البيانات الضرورية لتنفيذ وتوصيل طلبك (الاسم، رقم الهاتف، وعنوان التسليم في فلسطين).
            </p>
            <h3 className="text-sm font-bold text-ph-ink">2. سرية المعلومات:</h3>
            <p>
              لا نشارك بياناتك أو نبيعها لأي طرف ثالث، وتستخدم فقط من قبل شركة الشحن لإتمام عملية التوصيل بنجاح.
            </p>
          </div>
        </div>
      )}

      {/* 8. TERMS & CONDITIONS */}
      {pageType === 'terms' && (
        <div className="space-y-6 bg-white p-6 sm:p-10 rounded-3xl border border-ph-border shadow-xl">
          <h1 className="text-2xl font-black text-ph-ink">الشروط والأحكام</h1>
          <div className="space-y-4 text-xs text-ph-muted leading-relaxed">
            <p>
              مرحباً بكم في متجر بادهاوس. باستخدامك لهذا الموقع وإجراء الطلبات، فإنك توافق على الشروط التالية:
            </p>
            <h3 className="text-sm font-bold text-ph-ink">1. الأسعار والعملة:</h3>
            <p>
              جميع الأسعار المعروضة على الموقع هي بالشيكل الفلسطيني (₪) وشاملة للضرائب المقررة.
            </p>
            <h3 className="text-sm font-bold text-ph-ink">2. صحة معلومات التوصيل:</h3>
            <p>
              يتحمل العميل مسؤولية تزويدنا برقم هاتف وعنوان دقيق لضمان وصول الشحنة في الموعد المحدد دون تأخير.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

