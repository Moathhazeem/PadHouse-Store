import React, { useState } from 'react';
import {
  ShieldCheck,
  Truck,
  RotateCcw,
  HelpCircle,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  FileText,
  Lock,
  ChevronDown
} from 'lucide-react';

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
        <div className="space-y-8 bg-white p-6 sm:p-10 rounded-3xl border border-slate-100 shadow-xl">
          <div className="space-y-3">
            <span className="text-xs font-bold text-[#2EC4B6]">قصة بادهاوس</span>
            <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A]">
              المتجر الفلسطيني المتخصص لملحقات أجهزة الآيباد
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              تأسس متجر **بادهاوس (PadHouse)** بهدف سد الفجوة في السوق الفلسطيني لملحقات أجهزة Apple iPad الاحترافية، وتوفير بدائل وحلول عالية الجودة بأسعار عادلة تناسب الطلاب، المهندسين، الفنانين والمحترفين.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4">
            <div className="p-5 rounded-2xl bg-[#F8FAFC] border border-slate-100 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-[#2EC4B6]/10 text-[#2EC4B6] flex items-center justify-center font-bold">
                100%
              </div>
              <h3 className="text-xs font-bold text-[#0F172A]">توافق تام ومجرب</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                كل منتج في بادهاوس يخضع لاختبار دقيق للتأكد من توافقه التام مع أجهزة iPadOS وأبعاد شاشات الآيباد.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#F8FAFC] border border-slate-100 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-[#2EC4B6]/10 text-[#2EC4B6] flex items-center justify-center font-bold">
                12M
              </div>
              <h3 className="text-xs font-bold text-[#0F172A]">ضمان استبدال مباشر</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                نحن نقف خلف جودة منتجاتنا بثقة كاملة ونقدم استبدالاً فورياً دون تعقيدات في حال حدوث أي عيب مصنعي.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#F8FAFC] border border-slate-100 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-[#2EC4B6]/10 text-[#2EC4B6] flex items-center justify-center font-bold">
                48h
              </div>
              <h3 className="text-xs font-bold text-[#0F172A]">توصيل سريع لكل الوطن</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                شبكة توصيل مباشرة تصل إلى باب منزلك في القدس، رام الله، نابلس، الخليل، جنين وكافة القرى والمخيمات.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. CONTACT US */}
      {pageType === 'contact' && (
        <div className="space-y-8 bg-white p-6 sm:p-10 rounded-3xl border border-slate-100 shadow-xl">
          <div className="space-y-2">
            <span className="text-xs font-bold text-[#2EC4B6]">يسعدنا تواصلكم دائماً</span>
            <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A]">تواصل مع فريق خدمة عملاء بادهاوس</h1>
            <p className="text-xs text-slate-500">
              فريق الدعم الفني والمبيعات جاهز للرد على استفساراتكم حول التوافق والشحن.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* Contact Details */}
            <div className="space-y-5 bg-[#F8FAFC] p-6 rounded-2xl border border-slate-100">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#2EC4B6] shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-xs text-[#0F172A]">المقر والمستودعات:</strong>
                  <span className="text-xs text-slate-500">فلسطين — رام الله والبيرة، شارع الماصيون</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-[#2EC4B6] shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-xs text-[#0F172A]">الهاتف المباشر والواتساب:</strong>
                  <span className="text-xs text-slate-500 dir-ltr block text-right">+970 59 912 3456</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-[#2EC4B6] shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-xs text-[#0F172A]">البريد الإلكتروني:</strong>
                  <span className="text-xs text-slate-500">support@padhouse.ps</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200">
                <span className="text-xs font-bold text-[#0F172A] block mb-1">أوقات العمل والدعم:</span>
                <span className="text-xs text-slate-500 block">يومياً من 9:00 صباحاً حتى 9:00 مساءً</span>
              </div>
            </div>

            {/* Contact Form */}
            <div>
              {contactSubmitted ? (
                <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <h3 className="text-sm font-bold text-emerald-900">تم إرسال رسالتك بنجاح!</h3>
                  <p className="text-xs text-emerald-700">
                    سيقوم فريق الدعم بالتواصل معك عبر الواتساب أو الهاتف خلال ساعات قليلة.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-[#0F172A] block mb-1">الاسم الكريم *</label>
                    <input
                      type="text"
                      required
                      placeholder="أدخل اسمك"
                      className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#2EC4B6]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#0F172A] block mb-1">رقم الهاتف *</label>
                    <input
                      type="tel"
                      required
                      placeholder="059xxxxxxx"
                      className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#2EC4B6]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#0F172A] block mb-1">الرسالة أو الاستفسار *</label>
                    <textarea
                      required
                      rows={4}
                      placeholder="اكتب استفسارك عن التوافق أو طلبك..."
                      className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#2EC4B6]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#0F172A] hover:bg-[#2EC4B6] text-white py-2.5 rounded-xl font-bold text-xs transition-colors shadow-sm"
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
        <div className="space-y-6 bg-white p-6 sm:p-10 rounded-3xl border border-slate-100 shadow-xl">
          <div className="space-y-2">
            <span className="text-xs font-bold text-[#2EC4B6]">إجابات فورية</span>
            <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A]">الأسئلة الشائعة والأكثر تكراراً</h1>
            <p className="text-xs text-slate-500">
              كل ما تود معرفته حول ملحقات الآيباد، الشحن، الضمان والدفع.
            </p>
          </div>

          <div className="space-y-3 pt-4">
            {faqs.map((f, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200 bg-[#F8FAFC] overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-4 flex items-center justify-between text-right font-bold text-xs sm:text-sm text-[#0F172A]"
                  >
                    <span>{f.q}</span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-[#2EC4B6]' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="p-4 pt-0 text-xs text-slate-600 leading-relaxed border-t border-slate-100 mt-2">
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
        <div className="space-y-6 bg-white p-6 sm:p-10 rounded-3xl border border-slate-100 shadow-xl">
          <h1 className="text-2xl font-black text-[#0F172A]">سياسة الشحن والتوصيل</h1>
          <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
            <p>
              يحرص متجر **بادهاوس** على تقديم تجربة شحن سريعة وآمنة لكافة زبائننا في فلسطين. فيما يلي تفاصيل الشحن:
            </p>
            <h3 className="text-sm font-bold text-[#0F172A]">1. مدة التوصيل:</h3>
            <p>
              يتم توصيل الطلبات خلال 24 إلى 48 ساعة كحد أقصى لكافة مدن الضفة الغربية والقدس وضواحيها. يتم التواصل هاتفياً من قبل شركة الشحن قبل الوصول لتأكيد الموعد والعنوان.
            </p>
            <h3 className="text-sm font-bold text-[#0F172A]">2. تكلفة الشحن:</h3>
            <ul className="list-disc pr-5 space-y-1">
              <li>رام الله والبيرة: 20 ₪</li>
              <li>القدس وضواحيها: 30 ₪</li>
              <li>باقي محافظات الضفة (نابلس، الخليل، بيت لحم، جنين، طولكرم، قلقيلية، أريحا، سلفيت، طوباس): 25 ₪</li>
              <li>قطاع غزة: 35 ₪ (عند فتح المعابر وتوفر المسارات الآمنة)</li>
            </ul>
            <h3 className="text-sm font-bold text-[#0F172A]">3. التغليف الآمن:</h3>
            <p>
              يتم تغليف كفرات الآيباد، شاشات الحماية، والأقلام الذكية بعلب مقواة ومبطنة بمواد مضادة للصدمات لضمان وصولها بحالتها المصنعية الأصلية.
            </p>
          </div>
        </div>
      )}

      {/* 5. REFUND & RETURN POLICY */}
      {pageType === 'refund_policy' && (
        <div className="space-y-6 bg-white p-6 sm:p-10 rounded-3xl border border-slate-100 shadow-xl">
          <h1 className="text-2xl font-black text-[#0F172A]">سياسة الاستبدال والاسترجاع</h1>
          <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
            <p>
              رضاكم هو أولويتنا الأولى في متجر بادهاوس. إذا كان المنتج غير متوافق مع جهازك أو وصل بحالة غير مطابقة:
            </p>
            <h3 className="text-sm font-bold text-[#0F172A]">1. فترة الاستبدال:</h3>
            <p>
              يحق للعميل طلب استبدال المنتج خلال مدة 7 أيام من تاريخ الاستلام، شريطة أن يكون المنتج بحالته الأصلية وبتغليفه المصنعي.
            </p>
            <h3 className="text-sm font-bold text-[#0F172A]">2. في حال وجود خلل مصنعي:</h3>
            <p>
              يتم استبدال القطعة فوراً بقطعة جديدة على حساب المتجر بالكامل دون تحميل العميل أي رسوم شحن إضافية.
            </p>
            <h3 className="text-sm font-bold text-[#0F172A]">3. المنتجات المستثناة من الاسترجاع:</h3>
            <p>
              شاشات الحماية التي تم نزع اللصاقة الوقائية منها وتركيبها لا يمكن استرجاعها إلا في حال وجود عيب مصنعي في مقاس الشاشة أو خامتها.
            </p>
          </div>
        </div>
      )}

      {/* 6. WARRANTY POLICY */}
      {pageType === 'warranty_policy' && (
        <div className="space-y-6 bg-white p-6 sm:p-10 rounded-3xl border border-slate-100 shadow-xl">
          <h1 className="text-2xl font-black text-[#0F172A]">سياسة الضمان والكفالة المعتمدة</h1>
          <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
            <p>
              نحن نلتزم بتقديم كفالة حقيقية تضمن راحة بالك وأداء جهازك اللوحي:
            </p>
            <h3 className="text-sm font-bold text-[#0F172A]">1. ضمان الأقلام والكيبوردات (12 شهراً):</h3>
            <p>
              يشمل الضمان استبدال قلم بادهاوس الذكي أو لوحات المفاتيح في حال توقف الاستجابة، تعطل شحن البطارية، أو خلل في الاتصال بالبلوتوث.
            </p>
            <h3 className="text-sm font-bold text-[#0F172A]">2. ضمان كابلات الشحن Yesido (6-12 شهراً):</h3>
            <p>
              ضمان ضد التوقف المفاجئ لنقل الطاقة والشحن السريع.
            </p>
            <h3 className="text-sm font-bold text-[#0F172A]">3. ما لا يشمله الضمان:</h3>
            <p>
              الأضرار الناتجة عن سوء الاستخدام، السقوط الشديد في المياه، أو الكسر المتعمد.
            </p>
          </div>
        </div>
      )}

      {/* 7. PRIVACY POLICY */}
      {pageType === 'privacy_policy' && (
        <div className="space-y-6 bg-white p-6 sm:p-10 rounded-3xl border border-slate-100 shadow-xl">
          <h1 className="text-2xl font-black text-[#0F172A]">سياسة الخصوصية وأمان البيانات</h1>
          <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
            <p>
              نحن في متجر بادهاوس نحترم خصوصيتك ونلتزم بحماية بياناتك الشخصية:
            </p>
            <h3 className="text-sm font-bold text-[#0F172A]">1. البيانات التي نجمعها:</h3>
            <p>
              نجمع فقط البيانات الضرورية لتنفيذ وتوصيل طلبك (الاسم، رقم الهاتف، وعنوان التسليم في فلسطين).
            </p>
            <h3 className="text-sm font-bold text-[#0F172A]">2. سرية المعلومات:</h3>
            <p>
              لا نشارك بياناتك أو نبيعها لأي طرف ثالث، وتستخدم فقط من قبل شركة الشحن لإتمام عملية التوصيل بنجاح.
            </p>
          </div>
        </div>
      )}

      {/* 8. TERMS & CONDITIONS */}
      {pageType === 'terms' && (
        <div className="space-y-6 bg-white p-6 sm:p-10 rounded-3xl border border-slate-100 shadow-xl">
          <h1 className="text-2xl font-black text-[#0F172A]">الشروط والأحكام</h1>
          <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
            <p>
              مرحباً بكم في متجر بادهاوس. باستخدامك لهذا الموقع وإجراء الطلبات، فإنك توافق على الشروط التالية:
            </p>
            <h3 className="text-sm font-bold text-[#0F172A]">1. الأسعار والعملة:</h3>
            <p>
              جميع الأسعار المعروضة على الموقع هي بالشيكل الفلسطيني (₪) وشاملة للضرائب المقررة.
            </p>
            <h3 className="text-sm font-bold text-[#0F172A]">2. صحة معلومات التوصيل:</h3>
            <p>
              يتحمل العميل مسؤولية تزويدنا برقم هاتف وعنوان دقيق لضمان وصول الشحنة في الموعد المحدد دون تأخير.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

