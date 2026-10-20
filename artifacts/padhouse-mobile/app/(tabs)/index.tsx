import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { CATEGORIES, PRODUCTS } from '@/constants/products';
import { Button, Card, Notice, Page, PHText, ProductGrid, SectionTitle } from '@/components/PadHouseUI';
import { useStore } from '@/store/StoreContext';

export default function HomeScreen() {
  console.log('[PadHouse] home screen rendered');
  const colors = useColors();
  const { profile, cart, storageError } = useStore();
  const openCategory = (category: string) => router.push({ pathname: '/categories', params: { category } } as any);

  return (
    <Page tabbed>
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <View>
          <PHText color={colors.primary} weight="semibold" style={{ fontSize: 12 }}>شعار المتجر الرسمي سيضاف عند توفيره</PHText>
          <PHText weight="bold" style={{ fontSize: 25, marginTop: 1 }}>باد هاوس ستور</PHText>
        </View>
        <Pressable onPress={() => router.push('/profile' as any)} accessibilityRole="button" accessibilityLabel="حسابي" style={{ width: 42, height: 42, borderRadius: 15, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="person-outline" size={21} color={colors.foreground} />
        </Pressable>
      </View>

      <Pressable onPress={() => router.push('/search' as any)} accessibilityRole="button" style={{ minHeight: 48, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingHorizontal: 14 }}>
        <Ionicons name="search-outline" size={20} color={colors.mutedForeground} />
        <PHText color={colors.mutedForeground} style={{ flex: 1, fontSize: 14 }}>ابحث عن منتج أو موديل آيباد</PHText>
      </Pressable>

      <View style={{ backgroundColor: colors.primarySoft, minHeight: 190, borderRadius: 24, overflow: 'hidden', marginTop: 16, padding: 19, justifyContent: 'center' }}>
        <View style={{ position: 'absolute', width: 155, height: 155, borderRadius: 90, backgroundColor: colors.accent, bottom: -72, left: -36 }} />
        <PHText color={colors.primary} weight="bold" style={{ fontSize: 12 }}>اختيارك يبدأ من جهازك</PHText>
        <PHText weight="bold" style={{ fontSize: 22, lineHeight: 31, marginTop: 4, maxWidth: '88%' }}>إكسسوارات الآيباد المناسبة، بخطوات واضحة</PHText>
        <PHText color={colors.mutedForeground} style={{ fontSize: 13, marginTop: 5, maxWidth: '88%', lineHeight: 21 }}>مرشد تجريبي يعتمد على المعلومات المنشورة، ولا يؤكد توافقًا غير موثق.</PHText>
        <View style={{ alignSelf: 'flex-start', marginTop: 14 }}>
          <Button title="ابدأ الاختيار" onPress={() => router.push('/finder' as any)} icon="arrow-back" style={{ minWidth: 136 }} />
        </View>
      </View>

      <Notice tone="info">الأسعار المعروضة مرجعية من صفحات المتجر التي تمت مراجعتها. المخزون والطلب والدفع غير متصلين بالتطبيق.</Notice>
      {storageError ? <Notice tone="error">{storageError}</Notice> : null}

      <SectionTitle title="تصفح حسب النوع" action="كل التصنيفات" onAction={() => router.push('/categories' as any)} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row-reverse', gap: 10, paddingBottom: 3 }}>
        {CATEGORIES.map((category) => {
          const count = PRODUCTS.filter((product) => product.category === category.name).length;
          return (
            <Pressable key={category.id} onPress={() => openCategory(category.name)} accessibilityRole="button" style={{ width: 92, minHeight: 94, alignItems: 'center', justifyContent: 'center', gap: 7, padding: 10, backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1, borderRadius: 18 }}>
              <Ionicons name={category.icon as keyof typeof Ionicons.glyphMap} size={23} color={colors.primary} />
              <PHText weight="semibold" numberOfLines={2} style={{ fontSize: 11, textAlign: 'center', lineHeight: 16 }}>{category.name}</PHText>
              <PHText color={colors.mutedForeground} style={{ fontSize: 9 }}>{count ? `${count} منتجات مرجعية` : 'لا توجد بيانات'}</PHText>
            </Pressable>
          );
        })}
      </ScrollView>

      <SectionTitle title="من الكتالوج" action="عرض الكل" onAction={() => router.push('/categories' as any)} />
      <PHText color={colors.mutedForeground} style={{ fontSize: 12, marginBottom: 10 }}>الأسعار والخيارات بحاجة إلى تأكيد من المتجر قبل الشراء.</PHText>
      <ProductGrid products={PRODUCTS} />

      <Card style={{ marginTop: 4 }}>
        <PHText weight="bold" style={{ fontSize: 16 }}>هل تحتاج مساعدة؟</PHText>
        <PHText color={colors.mutedForeground} style={{ fontSize: 12, lineHeight: 20, marginTop: 4 }}>المحادثة المتاحة تجريبية، وتعرض معلومات الكتالوج دون تأكيد المخزون أو الطلبات.</PHText>
        <Button title={`مساعد المتجر${cart.length ? ` · ${cart.length} في السلة` : ''}`} icon="chatbubble-ellipses-outline" kind="secondary" onPress={() => router.push('/chat' as any)} style={{ marginTop: 10 }} />
      </Card>
    </Page>
  );
}
