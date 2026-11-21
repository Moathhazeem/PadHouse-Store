import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Truck,
  RotateCcw,
  ShieldCheck,
  Lock,
  FileText,
  ChevronLeft,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react';
import { useScrollReveal } from '../components/ui';

export type PolicySectionId = 'shipping' | 'returns' | 'warranty' | 'privacy' | 'terms';

interface PoliciesPageProps {
  /** Section to jump to when arriving from a deep link (e.g. footer / checkout). */
  initialSection?: PolicySectionId;
  onNavigate: (page: string, params?: any) => void;
}

interface PolicySectionDef {
  id: PolicySectionId;
  title: string;
  short: string;
  desc: string;
  icon: LucideIcon;
  body: React.ReactNode;
}

/** Small leading paragraph used across sections. */
const Lead: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-xs leading-7 text-ph-muted sm:text-sm">{children}</p>
);

/** Titled sub-block with a brand bullet for scannable content. */
const Block: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="space-y-2">
    <h3 className="flex items-center gap-2 text-sm font-bold text-ph-ink">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ph-brand" aria-hidden="true" />
      {title}
    </h3>
    <div className="text-xs leading-6 text-ph-muted sm:text-sm">{children}</div>
  </div>
);

const sections: PolicySectionDef[] = [
  {
    id: 'shipping',
    title: 'معالجة الطلبات والتوصيل',
    short: 'الشحن والتوصيل',
    desc: 'مدة التسليم، معالجة الطلبات، الرسوم والتغليف.',
    icon: Truck,
    body: (
      <>
        <Lead>
          نحرص في بادهاوس على تجهيز طلبك بعناية وإيصاله بأسرع وقت ممكن إلى جميع مدن الضفة الغربية والقدس وضواحيها.
        </Lead>
        <Block title="مدة التوصيل">
          <ul className="list-disc space-y-1.5 pr-5">
            <li>يتم تسليم الطلبات خلال 24 إلى 48 ساعة كحد أقصى لمدن الضفة الغربية والقدس وضواحيها.</li>
            <li>تتواصل شركة الشحن هاتفياً قبل الوصول لتأكيد الموعد والعنوان.</li>
          </ul>
        </Block>
        <Block title="معالجة الطلبات">
          <ul className="list-disc space-y-1.5 pr-5">
            <li>تُجهّز الطلبات خلال ساعات العمل من 9:00 صباحاً حتى 9:00 مساءً.</li>
            <li>الطلبات المستلمة بعد ساعات العمل أو في العطل تُجهّز في أول يوم عمل يليها.</li>
            <li>الدفع عند الاستلام متاح نقداً بعد فحص الطرد ومعاينته.</li>
          </ul>
        </Block>
        <Block title="رسوم التوصيل">
          <ul className="list-disc space-y-1.5 pr-5">
            <li>رام الله والبيرة: 20 ₪</li>
            <li>القدس وضواحيها: 30 ₪</li>
            <li>باقي محافظات الضفة (نابلس، الخليل، بيت لحم، جنين، طولكرم، قلقيلية، أريحا، سلفيت، طوباس): 25 ₪</li>
            <li>الداخل المحتل (48): 50 ₪</li>
          </ul>
        </Block>
        <Block title="التغليف الآمن">
          <p>
            تُغلّف الكفرات وشاشات الحماية والأقلام بعلب مقوّاة ومبطّنة بمواد مضادة للصدمات لضمان وصولها بحالتها المصنعية
            الأصلية.
          </p>
        </Block>
      </>
    ),
  },
  {
    id: 'returns',
    title: 'الاستبدال والاسترجاع',
    short: 'الاستبدال والاسترجاع',
    desc: 'شروط الاستبدال والاسترجاع وخطواته.',
    icon: RotateCcw,
    body: (
      <>
        <Lead>رضاكم هو أولويتنا الأولى. وإذا كان المنتج غير متوافق مع جهازك أو وصل بحالة غير مطابقة، فهذه شروط الاستبدال:</Lead>
        <Block title="فترة الاستبدال">
          <p>يحق للعميل طلب استبدال المنتج خلال 7 أيام من تاريخ الاستلام، شرط أن يكون بحالته الأصلية وبتغليفه المصنعي.</p>
        </Block>
        <Block title="في حال وجود خلل مصنعي">
          <p>يتم استبدال القطعة فوراً بقطعة جديدة على حساب المتجر بالكامل دون تحميل العميل أي رسوم شحن إضافية.</p>
        </Block>
        <Block title="المنتجات المستثناة من الاسترجاع">
          <p>شاشات الحماية التي تم نزع اللصاقة الوقائية منها وتركيبها لا يمكن استرجاعها إلا في حال وجود عيب مصنعي في المقاس أو الخامة.</p>
        </Block>
        <Block title="خطوات الاستبدال">
          <ul className="list-disc space-y-1.5 pr-5">
            <li>تواصل مع الدعم عبر الواتساب أو الهاتف مع رقم الطلب.</li>
            <li>أعِد المنتج بحالته الأصلية وبتغليفه المصنعي.</li>
            <li>بعد الفحص، يتم الاستبدال أو الإرجاع حسب رغبتك.</li>
          </ul>
        </Block>
      </>
    ),
  },
  {
    id: 'warranty',
    title: 'الضمان والكفالة',
    short: 'الضمان',
    desc: 'مدد الضمان لكل فئة وما لا يشمله.',
    icon: ShieldCheck,
    body: (
      <>
        <Lead>نلتزم بتقديم كفالة حقيقية تضمن راحة بالك وأداء جهازك اللوحي:</Lead>
        <Block title="الأقلام ولوحات المفاتيح (12 شهراً)">
          <p>يشمل الضمان استبدال قلم بادهاوس الذكي أو لوحات المفاتيح في حال توقف الاستجابة، تعطل شحن البطارية، أو خلل في الاتصال بالبلوتوث.</p>
        </Block>
        <Block title="كابلات الشحن Yesido (6–12 شهراً)">
          <p>ضمان ضد التوقف المفاجئ لنقل الطاقة والشحن السريع.</p>
        </Block>
        <Block title="ما لا يشمله الضمان">
          <p>الأضرار الناتجة عن سوء الاستخدام، السقوط الشديد، ملامسة المياه، أو الكسر المتعمد.</p>
        </Block>
        <Block title="كيفية المطالبة بالضمان">
          <p>تواصل مع الدعم مع إثبات الشراء ورقم موديل الجهاز، وسنرتب عملية الاستبدال بسرعة.</p>
        </Block>
      </>
    ),
  },
  {
    id: 'privacy',
    title: 'الخصوصية ومعالجة البيانات',
    short: 'الخصوصية',
    desc: 'البيانات التي نجمعها وكيف نحميها.',
    icon: Lock,
    body: (
      <>
        <Lead>نحترم خصوصيتك ونلتزم بحماية بياناتك الشخصية، وهذه أبرز المبادئ التي نعمل بها:</Lead>
        <Block title="البيانات التي نجمعها">
          <p>نجمع فقط البيانات الضرورية لتنفيذ وتوصيل طلبك: الاسم، رقم الهاتف، عنوان التسليم، والبريد الإلكتروني عند إنشاء الحساب.</p>
        </Block>
        <Block title="كيف نستخدم بياناتك">
          <p>لتنفيذ الطلب وتوصيله، تقديم الدعم الفني، وتحسين تجربة التسوق على الموقع.</p>
        </Block>
        <Block title="السرية والمشاركة">
          <p>لا نبيع بياناتك ولا نشاركها مع أي طرف ثالث، وتُستخدم فقط من قِبل شركة الشحن لإتمام عملية التوصيل بنجاح.</p>
        </Block>
        <Block title="المدفوعات">
          <p>تُعالج عمليات الدفع عبر بوابات آمنة (بال باي) أو نقداً عند الاستلام، ولا نقوم بتخزين بيانات بطاقتك.</p>
        </Block>
        <Block title="حقوقك">
          <p>يمكنك طلب الوصول إلى بياناتك أو تصحيحها أو حذفها عبر البريد الإلكتروني support@padhouse.ps.</p>
        </Block>
      </>
    ),
  },
  {
    id: 'terms',
    title: 'الشروط العامة للاستخدام',
    short: 'الشروط والأحكام',
    desc: 'قواعد استخدام المتجر والشراء.',
    icon: FileText,
    body: (
      <>
        <Lead>مرحباً بكم في بادهاوس. باستخدامك للموقع وإجراء الطلبات فإنك توافق على الشروط التالية:</Lead>
        <Block title="الأسعار والعملة">
          <p>جميع الأسعار المعروضة على الموقع بالشيكل الفلسطيني (₪) وهي شاملة للضرائب المقررة.</p>
        </Block>
        <Block title="صحة معلومات التوصيل">
          <p>يتحمل العميل مسؤولية تزويدنا برقم هاتف وعنوان دقيق لضمان وصول الشحنة في الموعد المحدد دون تأخير.</p>
        </Block>
        <Block title="استخدام الحساب">
          <p>العميل مسؤول عن الحفاظ على سرية بيانات الدخول وعن أي نشاط يتم عبر حسابه، ويُمنع استخدام الموقع لأي غرض غير مشروع.</p>
        </Block>
        <Block title="الملكية الفكرية">
          <p>جميع محتويات الموقع من صور ونصوص وشعارات مملوكة لمتجر بادهاوس، ولا يجوز إعادة استخدامها دون إذن.</p>
        </Block>
        <Block title="القانون المطبق">
          <p>تُنظّم هذه الشروط والأحكام وفقاً للأنظمة والقوانين السارية في فلسطين.</p>
        </Block>
      </>
    ),
  },
];

/** One policy card, animated on scroll into view. */
const PolicySection: React.FC<{
  def: PolicySectionDef;
  registerRef: (id: PolicySectionId, el: HTMLElement | null) => void;
}> = ({ def, registerRef }) => {
  const reveal = useScrollReveal<HTMLElement>();
  const { id, title, desc, icon: Icon, body } = def;

  useEffect(() => {
    registerRef(id, reveal.ref.current);
    return () => registerRef(id, null);
  }, [id, registerRef, reveal.ref]);

  return (
    <section
      id={`policy-${id}`}
      ref={reveal.ref}
      style={reveal.style}
      aria-labelledby={`policy-${id}-title`}
      className={`${reveal.className} scroll-mt-32 rounded-3xl border border-ph-border bg-white p-6 shadow-sm sm:p-8`}
    >
      <div className="mb-5 flex items-start gap-3 border-b border-ph-border pb-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ph-surface-soft text-ph-brand">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <h2 id={`policy-${id}-title`} className="text-lg font-black text-ph-ink sm:text-xl">
            {title}
          </h2>
          <p className="text-[11px] text-ph-muted">{desc}</p>
        </div>
      </div>
      <div className="space-y-5">{body}</div>
    </section>
  );
};

export const PoliciesPage: React.FC<PoliciesPageProps> = ({ initialSection, onNavigate }) => {
  const sectionsRef = useRef<Record<string, HTMLElement | null>>({});
  const [activeSection, setActiveSection] = useState<PolicySectionId>(initialSection ?? sections[0].id);

  const registerRef = useCallback((id: PolicySectionId, el: HTMLElement | null) => {
    sectionsRef.current[id] = el;
  }, []);

  const scrollToSection = useCallback((id: PolicySectionId, smooth = true) => {
    const el = sectionsRef.current[id];
    if (!el) return;
    const reduce =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: smooth && !reduce ? 'smooth' : 'auto', block: 'start' });
  }, []);

  const jumpTo = useCallback(
    (id: PolicySectionId) => {
      setActiveSection(id);
      scrollToSection(id);
    },
    [scrollToSection],
  );

  // Highlight the section currently in view while scrolling.
  useEffect(() => {
    const handleScroll = () => {
      const threshold = 160;
      let current: PolicySectionId = sections[0].id;
      for (const s of sections) {
        const el = sectionsRef.current[s.id];
        if (el && el.getBoundingClientRect().top - threshold <= 0) current = s.id;
      }
      setActiveSection(current);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  // Deep link: jump to the requested section on mount and whenever it changes.
  useEffect(() => {
    if (!initialSection) return;
    setActiveSection(initialSection);
    const raf = requestAnimationFrame(() => scrollToSection(initialSection));
    return () => cancelAnimationFrame(raf);
  }, [initialSection, scrollToSection]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 text-right sm:px-6">
      {/* Hero */}
      <header className="rounded-3xl border border-ph-border bg-white p-6 shadow-sm sm:p-10">
        <span className="text-xs font-bold text-ph-brand">مركز السياسات</span>
        <h1 className="mt-2 text-2xl font-black text-ph-ink sm:text-3xl">سياسات متجر بادهاوس</h1>
        <p className="mt-2 max-w-3xl text-xs leading-7 text-ph-muted sm:text-sm">
          كل ما تحتاج معرفته حول الشحن، الاستبدال والاسترجاع، الضمان، الخصوصية، والشروط والأحكام — في صفحة واحدة وبصيغة
          مختصرة يسهل تصفحها.
        </p>
        <p className="mt-3 text-[11px] text-ph-muted">آخر تحديث: 22 نوفمبر 2026</p>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8">
        {/* Desktop sticky side navigation */}
        <aside className="hidden lg:block">
          <nav
            aria-label="أقسام السياسات"
            className="sticky top-24 space-y-1.5 rounded-3xl border border-ph-border bg-white p-3 shadow-sm"
          >
            <p className="px-2 pb-2 text-[11px] font-bold text-ph-muted">أقسام السياسة</p>
            {sections.map((s) => {
              const Icon = s.icon;
              const isActive = activeSection === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => jumpTo(s.id)}
                  aria-current={isActive ? 'true' : undefined}
                  className={`group relative flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-right text-xs font-bold transition-all duration-300 ${
                    isActive
                      ? 'border-ph-brand/40 bg-ph-brand/10 text-ph-brand shadow-sm'
                      : 'border-transparent text-ph-ink hover:border-ph-border hover:bg-ph-surface-soft'
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors duration-300 ${
                      isActive ? 'bg-ph-brand text-white' : 'bg-ph-surface-soft text-ph-muted group-hover:text-ph-brand'
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="flex-1">{s.short}</span>
                  <span
                    aria-hidden="true"
                    className={`h-5 w-1 rounded-full bg-ph-brand transition-all duration-300 ${
                      isActive ? 'opacity-100' : 'scale-y-50 opacity-0'
                    }`}
                  />
                </button>
              );
            })}
            <div className="mt-1 border-t border-ph-border px-2 pt-3">
              <p className="text-[11px] text-ph-muted">لديك سؤال حول سياسة معينة؟</p>
              <button
                type="button"
                onClick={() => onNavigate('contact')}
                className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-ph-brand hover:underline"
              >
                تواصل مع الدعم
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </nav>
        </aside>

        <div className="space-y-6">
          {/* Mobile horizontal section jump nav */}
          <nav aria-label="أقسام السياسات" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden">
            {sections.map((s) => {
              const Icon = s.icon;
              const isActive = activeSection === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => jumpTo(s.id)}
                  aria-current={isActive ? 'true' : undefined}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors duration-300 ${
                    isActive
                      ? 'border-ph-brand bg-ph-brand text-white'
                      : 'border-ph-border bg-white text-ph-muted hover:text-ph-brand'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {s.short}
                </button>
              );
            })}
          </nav>

          {sections.map((s) => (
            <PolicySection key={s.id} def={s} registerRef={registerRef} />
          ))}

          {/* Support CTA */}
          <div className="rounded-3xl border border-ph-border bg-ph-surface-soft p-6 text-center sm:p-8">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-ph-brand shadow-[0_2px_12px_rgba(15,23,42,0.06)]">
              <HelpCircle className="h-6 w-6" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-base font-black text-ph-ink">لم تجد ما تبحث عنه؟</h2>
            <p className="mx-auto mt-1.5 max-w-md text-xs leading-6 text-ph-muted">
              فريق خدمة عملاء بادهاوس جاهز لمساعدتك في أي استفسار حول الطلبات أو السياسات.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => onNavigate('contact')}
                className="rounded-xl bg-ph-brand px-4 py-2 text-xs font-bold text-white shadow-sm transition-all duration-200 hover:bg-ph-brand-hover hover:shadow-[0_8px_20px_rgba(28,168,158,0.25)]"
              >
                تواصل معنا
              </button>
              <button
                type="button"
                onClick={() => onNavigate('faq')}
                className="rounded-xl border border-ph-border bg-white px-4 py-2 text-xs font-bold text-ph-ink transition-colors duration-200 hover:border-ph-brand hover:text-ph-brand"
              >
                الأسئلة الشائعة
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PoliciesPage;
