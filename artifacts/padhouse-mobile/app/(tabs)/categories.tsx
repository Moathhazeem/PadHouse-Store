import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { CATEGORIES, PRODUCTS } from '@/constants/products';
import { Chip, EmptyState, Page, PHText, ProductGrid, SectionTitle, TextField } from '@/components/PadHouseUI';

export default function CategoriesScreen() {
  const colors = useColors();
  const params = useLocalSearchParams<{ category?: string }>();
  const selected = typeof params.category === 'string' ? params.category : '';
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [sort, setSort] = useState<'default' | 'low' | 'high'>('default');
  const [model, setModel] = useState('');
  const categoryProducts = useMemo(() => {
    let result = PRODUCTS.filter((product) => !selected || product.category === selected);
    if (maxPrice !== null) result = result.filter((product) => product.price <= maxPrice);
    if (model.trim()) {
      const query = model.trim().toLocaleLowerCase('ar');
      result = result.filter((product) => product.compatibility.toLocaleLowerCase('ar').includes(query));
    }
    if (sort === 'low') result = [...result].sort((a, b) => a.price - b.price);
    if (sort === 'high') result = [...result].sort((a, b) => b.price - a.price);
    return result;
  }, [selected, maxPrice, sort, model]);

  return (
    <Page tabbed>
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <PHText weight="bold" style={{ fontSize: 23 }}>{selected || 'التصنيفات'}</PHText>
          <PHText color={colors.mutedForeground} style={{ fontSize: 12, marginTop: 2 }}>{selected ? 'نتائج الكتالوج المرجعي' : 'اختر نوع الإكسسوار الذي تبحث عنه'}</PHText>
        </View>
        {selected ? <Pressable onPress={() => router.replace('/categories' as any)} accessibilityRole="button"><PHText weight="semibold" color={colors.primary}>كل الأنواع</PHText></Pressable> : null}
      </View>

      {!selected ? (
        <View style={{ marginTop: 18, gap: 10 }}>
          {CATEGORIES.map((category) => {
            const count = PRODUCTS.filter((product) => product.category === category.name).length;
            return (
              <Pressable key={category.id} onPress={() => router.push({ pathname: '/categories', params: { category: category.name } } as any)} accessibilityRole="button" style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 14 }}>
                <View style={{ width: 46, height: 46, borderRadius: 15, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={category.icon as keyof typeof Ionicons.glyphMap} size={23} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <PHText weight="bold" style={{ fontSize: 14 }}>{category.name}</PHText>
                  <PHText color={colors.mutedForeground} style={{ fontSize: 11, marginTop: 2 }}>{count ? `${count} منتجات مرجعية` : 'لا توجد منتجات مؤكدة في الكتالوج الحالي'}</PHText>
                </View>
                <Ionicons name="chevron-back" size={19} color={colors.mutedForeground} />
              </Pressable>
            );
          })}
        </View>
      ) : (
        <>
          <View style={{ marginTop: 16 }}>
            <TextField label="تصفية حسب توافق منشور" value={model} onChangeText={setModel} placeholder="اكتب ما ورد في وصف التوافق" />
            <PHText color={colors.mutedForeground} style={{ fontSize: 11, marginTop: 4 }}>لن تظهر المنتجات إلا إذا احتوى وصفها المنشور على النص المطابق.</PHText>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row-reverse', gap: 8, paddingVertical: 12 }}>
            <Chip title="كل الأسعار" selected={maxPrice === null} onPress={() => setMaxPrice(null)} />
            {[40, 60, 130, 200].map((price) => <Chip key={price} title={`حتى ${price}₪`} selected={maxPrice === price} onPress={() => setMaxPrice(price)} />)}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row-reverse', gap: 8, paddingBottom: 8 }}>
            <Chip title="الترتيب الافتراضي" selected={sort === 'default'} onPress={() => setSort('default')} />
            <Chip title="الأقل سعرًا" selected={sort === 'low'} onPress={() => setSort('low')} />
            <Chip title="الأعلى سعرًا" selected={sort === 'high'} onPress={() => setSort('high')} />
          </ScrollView>
          <SectionTitle title={`${categoryProducts.length} نتائج مرجعية`} action={maxPrice !== null || model ? 'مسح التصفية' : undefined} onAction={() => { setMaxPrice(null); setModel(''); setSort('default'); }} />
          {categoryProducts.length ? <ProductGrid products={categoryProducts} /> : <EmptyState title="لا توجد نتائج مطابقة" detail="جرّب إزالة السعر أو عبارة التوافق. بيانات المخزون وموديلات iPad الكاملة غير متصلة." />}
          <PHText color={colors.mutedForeground} style={{ fontSize: 11, textAlign: 'center', marginTop: 8 }}>المخزون غير متصل؛ لا يمكن تصفية المنتجات حسب التوفر.</PHText>
        </>
      )}
    </Page>
  );
}
