import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { Button, Notice, Page, PHText } from '@/components/PadHouseUI';

const modules = [
  { id: 'dashboard', title: 'لوحة الإدارة', icon: 'grid-outline' },
  { id: 'products', title: 'إدارة المنتجات', icon: 'pricetag-outline' },
  { id: 'orders', title: 'إدارة الطلبات التجريبية', icon: 'receipt-outline' },
  { id: 'customers', title: 'العملاء', icon: 'people-outline' },
  { id: 'campaigns', title: 'الحملات والتسويق', icon: 'megaphone-outline' },
  { id: 'content', title: 'استوديو المحتوى', icon: 'create-outline' },
  { id: 'automation', title: 'مركز الأتمتة', icon: 'git-network-outline' },
  { id: 'intelligence', title: 'ذكاء التسويق', icon: 'analytics-outline' },
  { id: 'workflows', title: 'سجل المحاكاة', icon: 'time-outline' },
];

export default function AdminPreviewScreen() {
  const colors = useColors();
  return (
    <Page>
      <PHText weight="bold" style={{ fontSize: 23 }}>واجهات الإدارة</PHText>
      <PHText color={colors.mutedForeground} style={{ marginTop: 2, fontSize: 12 }}>معاينة هاتفية منفصلة عن تبويبات المتسوق.</PHText>
      <Notice tone="warning">معاينة فقط، وليست لوحة إدارة حقيقية. لا يوجد تسجيل دخول إداري أو فحص صلاحيات أو بيانات عملاء متصلة؛ لا تستخدمها لإدارة المتجر.</Notice>
      <View style={{ gap: 8, marginTop: 10 }}>
        {modules.map((item) => (
          <Pressable key={item.id} onPress={() => router.push(`/admin/${item.id}` as any)} accessibilityRole="button" style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12, padding: 14, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 16 }}>
            <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={21} color={colors.primary} />
            <PHText weight="semibold" style={{ flex: 1 }}>{item.title}</PHText>
            <Ionicons name="chevron-back" size={18} color={colors.mutedForeground} />
          </Pressable>
        ))}
      </View>
      <Button title="العودة لتجربة التسوق" icon="home-outline" kind="secondary" onPress={() => router.replace('/' as any)} style={{ marginTop: 13 }} />
    </Page>
  );
}
