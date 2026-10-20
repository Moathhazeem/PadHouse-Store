import React, { useState } from 'react';
import { Pressable, Share, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { formatShekel, PRODUCTS } from '@/constants/products';
import {
  AppHeader,
  Button,
  Card,
  Chip,
  EmptyState,
  Notice,
  Page,
  PHText,
  SectionTitle,
  TextField,
} from '@/components/PadHouseUI';
import { useStore } from '@/store/StoreContext';

const names: Record<string, string> = {
  dashboard: 'لوحة الإدارة التجريبية',
  products: 'إدارة المنتجات',
  orders: 'الطلبات التجريبية',
  customers: 'إدارة العملاء',
  campaigns: 'الحملات التسويقية',
  content: 'استوديو المحتوى',
  automation: 'مركز الأتمتة',
  intelligence: 'ذكاء التسويق',
  workflows: 'سجل المحاكاة',
};

const workflows = [
  { id: 'content-pipeline', title: 'مسار إعداد المحتوى', detail: 'إنشاء مسودة ثم مراجعتها يدويًا.' },
  { id: 'customer-support', title: 'مساعدة العملاء', detail: 'استرجاع معلومات موثقة ثم تحويل الأسئلة غير المؤكدة.' },
  { id: 'weekly-intelligence', title: 'ملخص التسويق الأسبوعي', detail: 'يحتاج بيانات فعلية قبل احتساب أي مؤشرات.' },
  { id: 'cart-recovery', title: 'تذكير السلة المتروكة', detail: 'يتطلب موافقة المستخدم وخدمة رسائل وبيانات شراء.' },
];

function ContentStudio() {
  const colors = useColors();
  const { drafts, saveDraft } = useStore();
  const [productId, setProductId] = useState(PRODUCTS[0].id);
  const [platform, setPlatform] = useState('منشور اجتماعي');
  const [audience, setAudience] = useState('مستخدمو iPad');
  const [tone, setTone] = useState('مباشر');
  const [content, setContent] = useState('');
  const [saved, setSaved] = useState(false);
  const product = PRODUCTS.find((item) => item.id === productId) ?? PRODUCTS[0];

  const makeDraft = () => {
    setContent(`${product.name} — ${formatShekel(product.price)} كسعر مرجعي منشور. ${product.description} تأكد من التوافق والسعر الحالي والتوفر مع المتجر قبل الشراء.`);
    setSaved(false);
  };
  const save = () => {
    if (!content.trim()) return;
    saveDraft(`${platform}: ${product.name}`, content.trim());
    setSaved(true);
  };

  return (
    <>
      <Notice tone="warning">خدمة توليد الذكاء الاصطناعي والنشر غير متصلة. النص التالي قالب محلي، ويبقى مسودة غير منشورة.</Notice>
      <SectionTitle title="إنشاء مسودة محلية" />
      <PHText weight="semibold" style={{ marginBottom: 7 }}>المنتج أو الفئة</PHText>
      <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 7 }}>
        {PRODUCTS.map((item) => <Chip key={item.id} title={item.name} selected={productId === item.id} onPress={() => setProductId(item.id)} />)}
      </View>
      <SectionTitle title="المنصة والجمهور والنبرة" />
      <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 7 }}>
        {['منشور اجتماعي', 'وصف منتج', 'فكرة حملة'].map((item) => <Chip key={item} title={item} selected={platform === item} onPress={() => setPlatform(item)} />)}
        {['مستخدمو iPad', 'طلاب', 'رسامون'].map((item) => <Chip key={item} title={item} selected={audience === item} onPress={() => setAudience(item)} />)}
        {['مباشر', 'ودود', 'مختصر'].map((item) => <Chip key={item} title={item} selected={tone === item} onPress={() => setTone(item)} />)}
      </View>
      <PHText color={colors.mutedForeground} style={{ fontSize: 11, marginTop: 7 }}>الإعدادات: {platform} · {audience} · {tone}. تبقى جميع النصوص للتدقيق اليدوي.</PHText>
      <Button title="إنشاء نص قالب محلي" icon="create-outline" onPress={makeDraft} style={{ marginTop: 12 }} />
      {content ? <>
        <TextField label="المسودة" value={content} onChangeText={(value) => { setContent(value); setSaved(false); }} multiline style={{ marginTop: 12 }} />
        <View style={{ flexDirection: 'row-reverse', gap: 8, marginTop: 9 }}>
          <View style={{ flex: 1 }}><Button title={saved ? 'حُفظت محليًا' : 'حفظ كمسودة'} icon="save-outline" onPress={save} /></View>
          <View style={{ flex: 1 }}><Button title="مشاركة" icon="share-outline" kind="secondary" onPress={() => { void Share.share({ message: content }); }} /></View>
        </View>
      </> : null}
      <SectionTitle title={`المسودات المحلية (${drafts.length})`} />
      {drafts.length ? drafts.map((draft) => <Card key={draft.id}><PHText weight="bold">{draft.title}</PHText><PHText color={colors.mutedForeground} style={{ fontSize: 11, marginTop: 3 }}>مسودة غير منشورة · {new Date(draft.createdAt).toLocaleDateString('ar-PS')}</PHText><PHText style={{ marginTop: 8, lineHeight: 21 }}>{draft.content}</PHText></Card>)
        : <EmptyState title="لا توجد مسودات محفوظة" detail="أنشئ نصًا قالبًا محليًا؛ لا يتم نشر أي محتوى تلقائيًا." icon="document-text-outline" />}
    </>
  );
}

function AutomationPanel() {
  const colors = useColors();
  const { workflowLogs, addWorkflowLog } = useStore();
  const [notice, setNotice] = useState('');
  return (
    <>
      <Notice tone="warning">كل المسارات متوقفة وغير متصلة. زر الاختبار ينشئ سجل محاكاة على هذا الجهاز فقط، ولا يرسل رسائل أو ينفذ إجراءً حقيقيًا.</Notice>
      {notice ? <Notice tone="success">{notice}</Notice> : null}
      {workflows.map((workflow) => (
        <Card key={workflow.id}>
          <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }}>
            <PHText weight="bold" style={{ flex: 1 }}>{workflow.title}</PHText>
            <PHText color={colors.mutedForeground} style={{ fontSize: 10 }}>غير متصل</PHText>
          </View>
          <PHText color={colors.mutedForeground} style={{ lineHeight: 20, marginTop: 5 }}>{workflow.detail}</PHText>
          <View style={{ flexDirection: 'row-reverse', gap: 8, marginTop: 10 }}>
            <View style={{ flex: 1 }}><Button title="التفاصيل" kind="secondary" onPress={() => router.push(`/admin/workflow/${workflow.id}` as any)} /></View>
            <View style={{ flex: 1 }}><Button title="اختبار محلي" kind="ghost" onPress={() => { addWorkflowLog(workflow.title); setNotice('أُضيف سجل محاكاة محلي؛ لم يتم تشغيل أي تكامل.'); }} /></View>
          </View>
        </Card>
      ))}
      <SectionTitle title={`سجلات المحاكاة (${workflowLogs.length})`} />
      {workflowLogs.slice(0, 5).map((log) => <PHText key={log.id} color={colors.mutedForeground} style={{ fontSize: 12, marginBottom: 7 }}>{log.workflow} · محاكاة محلية · {new Date(log.createdAt).toLocaleString('ar-PS')}</PHText>)}
      <Button title="عرض السجل الكامل" kind="secondary" onPress={() => router.push('/admin/workflows' as any)} />
    </>
  );
}

export default function AdminSectionScreen() {
  const colors = useColors();
  const params = useLocalSearchParams<{ section?: string }>();
  const section = typeof params.section === 'string' ? params.section : '';
  const { orders, workflowLogs } = useStore();
  const title = names[section] ?? 'إدارة المتجر';

  return (
    <Page>
      <AppHeader title={title} subtitle="معاينة محلية — لا تغيّر المتجر الفعلي" />
      <Notice tone="warning">ليست هذه لوحة إدارة آمنة أو متصلة. البيانات الظاهرة محلية أو غير متاحة، ولا يوجد فحص صلاحيات.</Notice>

      {section === 'dashboard' ? <>
        <View style={{ flexDirection: 'row-reverse', gap: 8, marginTop: 5 }}>
          <Card style={{ flex: 1, marginBottom: 0 }}><PHText color={colors.mutedForeground} style={{ fontSize: 11 }}>طلبات محلية</PHText><PHText weight="bold" style={{ fontSize: 22 }}>{orders.length}</PHText></Card>
          <Card style={{ flex: 1, marginBottom: 0 }}><PHText color={colors.mutedForeground} style={{ fontSize: 11 }}>مسارات غير متصلة</PHText><PHText weight="bold" style={{ fontSize: 22 }}>{workflows.length}</PHText></Card>
        </View>
        <Notice tone="info">الأرقام هنا تخص تجربة هذا الجهاز فقط، وليست مبيعات أو طلبات المتجر.</Notice>
        <SectionTitle title="وحدات الإدارة" />
        {Object.entries(names).filter(([key]) => key !== 'dashboard').map(([key, label]) => (
          <Pressable key={key} onPress={() => router.push(`/admin/${key}` as any)} accessibilityRole="button" style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <PHText weight="semibold">{label}</PHText><PHText color={colors.primary}>فتح</PHText>
          </Pressable>
        ))}
      </> : null}

      {section === 'products' ? <>
        <Notice>الكتالوج المعروض للقراءة فقط ومأخوذ من صفحات عامة تمت مراجعتها. الإضافة والتعديل والمخزون تتطلب اتصالًا بصلاحيات المتجر.</Notice>
        {PRODUCTS.map((product) => <Card key={product.id}>
          <PHText weight="bold">{product.name}</PHText>
          <PHText color={colors.primary} weight="bold" style={{ marginTop: 4 }}>{formatShekel(product.price)} · سعر مرجعي</PHText>
          <PHText color={colors.mutedForeground} style={{ fontSize: 11, marginTop: 4 }}>{product.category} · المخزون غير متصل</PHText>
          <Button title="عرض المنتج" kind="secondary" onPress={() => router.push(`/product/${product.id}` as any)} style={{ marginTop: 9 }} />
        </Card>)}
      </> : null}

      {section === 'orders' ? <>
        <Notice>يعرض هذا القسم الطلبات التجريبية التي حفظها مستخدم هذا الجهاز فقط، ولا يعرض طلبات العملاء الفعلية.</Notice>
        {orders.length ? orders.map((order) => <Pressable key={order.id} onPress={() => router.push(`/order/${order.id}` as any)} accessibilityRole="button" style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <PHText weight="bold">{order.id} · {formatShekel(order.total)}</PHText>
          <PHText color={colors.mutedForeground} style={{ fontSize: 11 }}>{order.customer.name} · غير مرسل للمتجر</PHText>
        </Pressable>) : <EmptyState title="لا توجد طلبات تجريبية" detail="لم يُحفظ أي طلب على هذا الجهاز." icon="receipt-outline" />}
      </> : null}

      {section === 'customers' ? <EmptyState title="بيانات العملاء غير متصلة" detail="لا توجد سجلات عملاء حقيقية في هذه المعاينة. لن تظهر معلومات شخصية أو سجل مشتريات." icon="people-outline" /> : null}
      {section === 'campaigns' ? <EmptyState title="بيانات الحملات غير متصلة" detail="لا توجد حملات أو مؤشرات أداء مؤكدة. لن يتم اختراع أرقام أو نتائج." icon="megaphone-outline" /> : null}
      {section === 'content' ? <ContentStudio /> : null}
      {section === 'automation' ? <AutomationPanel /> : null}
      {section === 'intelligence' ? <EmptyState title="لا توجد بيانات تسويق متصلة" detail="تحتاج التوصيات إلى مبيعات وحملات ومقاييس فعلية. لم يتم إنشاء مؤشرات أو توصيات افتراضية." icon="analytics-outline" /> : null}
      {section === 'workflows' ? <>
        <Notice>كل سجل هنا محاكاة محلية، ولا يثبت تشغيل أي خدمة.</Notice>
        {workflowLogs.length ? workflowLogs.map((log) => <Card key={log.id}><PHText weight="bold">{log.workflow}</PHText><PHText color={colors.mutedForeground} style={{ marginTop: 4, fontSize: 11 }}>محاكاة محلية · {new Date(log.createdAt).toLocaleString('ar-PS')}</PHText></Card>) : <EmptyState title="لا توجد سجلات" detail="لم يتم إجراء أي محاكاة محلية بعد." icon="time-outline" />}
      </> : null}

      {!names[section] ? <EmptyState title="القسم غير موجود" detail="اختر وحدة من صفحة معاينة الإدارة." /> : null}
      <Button title="العودة لواجهات الإدارة" kind="secondary" onPress={() => router.replace('/admin' as any)} style={{ marginTop: 15 }} />
    </Page>
  );
}
