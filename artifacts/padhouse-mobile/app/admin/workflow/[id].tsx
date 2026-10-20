import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, EmptyState, Notice, Page, PHText, SectionTitle, Card } from '@/components/PadHouseUI';
import { useStore } from '@/store/StoreContext';
import { useColors } from '@/hooks/useColors';

const workflowInfo: Record<string, { title: string; steps: string[]; missing: string }> = {
  'content-pipeline': {
    title: 'مسار إعداد المحتوى',
    steps: ['اختيار منتج', 'إنشاء نص مسودة', 'مراجعة بشرية', 'طلب الموافقة'],
    missing: 'مولّد AI، صلاحيات مراجعة، وربط النشر غير متصلة.',
  },
  'customer-support': {
    title: 'مساعدة العملاء',
    steps: ['استقبال السؤال', 'البحث في معلومات موثقة', 'إجابة أو تحويل بشري'],
    missing: 'خدمة AI ونظام التذاكر غير متصلين.',
  },
  'weekly-intelligence': {
    title: 'ملخص التسويق الأسبوعي',
    steps: ['مصدر بيانات', 'حساب المؤشرات', 'تلخيص ومراجعة'],
    missing: 'لا توجد بيانات مبيعات أو حملات متصلة.',
  },
  'cart-recovery': {
    title: 'تذكير السلة المتروكة',
    steps: ['حدث ترك السلة', 'فحص الموافقة', 'رسالة عبر قناة مسموحة'],
    missing: 'تتطلب بيانات سلة فعلية وموافقة وقناة مراسلة وتتبع شراء.',
  },
};

export default function WorkflowDetailScreen() {
  const colors = useColors();
  const params = useLocalSearchParams<{ id: string }>();
  const workflow = workflowInfo[params.id];
  const { workflowLogs } = useStore();
  const logs = workflowLogs.filter((log) => log.workflow === workflow?.title);
  if (!workflow) return <Page><EmptyState title="المسار غير موجود" detail="اختر مسارًا من مركز الأتمتة." /><Button title="مركز الأتمتة" onPress={() => router.replace('/admin/automation' as any)} /></Page>;
  return (
    <Page>
      <PHText weight="bold" style={{ fontSize: 23 }}>{workflow.title}</PHText>
      <Notice tone="warning">مسار تصوري فقط — غير مفعّل ولا ينفذ أي خطوة فعلية.</Notice>
      <PHText weight="bold" style={{ marginTop: 12 }}>الخطوات المقترحة</PHText>
      {workflow.steps.map((step, index) => <Card key={step}><PHText weight="semibold">الخطوة {index + 1}</PHText><PHText color={colors.mutedForeground} style={{ marginTop: 3 }}>{step}</PHText></Card>)}
      <SectionTitle title="ما يلزم قبل التشغيل" />
      <PHText color={colors.mutedForeground} style={{ lineHeight: 22 }}>{workflow.missing}</PHText>
      <SectionTitle title="سجل المحاكاة المحلية" />
      {logs.length ? logs.map((log) => <PHText key={log.id} color={colors.mutedForeground} style={{ fontSize: 12, marginBottom: 8 }}>{new Date(log.createdAt).toLocaleString('ar-PS')} · لم ينفذ تكاملًا</PHText>) : <EmptyState title="لا توجد محاكاة" detail="لم يتم حفظ سجل اختبار لهذا المسار." icon="time-outline" />}
      <Button title="العودة لمركز الأتمتة" icon="arrow-back" kind="secondary" onPress={() => router.replace('/admin/automation' as any)} style={{ marginTop: 12 }} />
    </Page>
  );
}
