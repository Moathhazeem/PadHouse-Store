import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { Button, Card, Notice, Page, PHText, TextField } from '@/components/PadHouseUI';
import { useColors } from '@/hooks/useColors';
import { useStore } from '@/store/StoreContext';

const links = [
  { title: 'طلباتي التجريبية', detail: 'طلبات محفوظة على هذا الجهاز فقط', icon: 'receipt-outline', route: '/orders' },
  { title: 'المفضلة', detail: 'المنتجات التي حفظتها محليًا', icon: 'heart-outline', route: '/favorites' },
  { title: 'المقارنة', detail: 'قارن معلومات الكتالوج المنشورة', icon: 'git-compare-outline', route: '/compare' },
  { title: 'المساعدة والأسئلة الشائعة', detail: 'معلومات المتجر المتاحة وخيارات الدعم', icon: 'help-circle-outline', route: '/support' },
  { title: 'الإعدادات والخصوصية', detail: 'تفضيلات محفوظة على الجهاز', icon: 'settings-outline', route: '/settings' },
];

export default function ProfileScreen() {
  const colors = useColors();
  const { profile, updateProfile, orders } = useStore();
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone);
  const [email, setEmail] = useState(profile.email);
  const [deviceModel, setDeviceModel] = useState(profile.deviceModel);
  const [address, setAddress] = useState(profile.address);
  const [saved, setSaved] = useState(false);

  const save = () => {
    updateProfile({ name: name.trim(), phone: phone.trim(), email: email.trim(), deviceModel: deviceModel.trim(), address: address.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  return (
    <Page tabbed scroll={false}>
      <KeyboardAwareScrollViewCompat style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 112, paddingTop: 10 }} keyboardShouldPersistTaps="handled">
        <View style={{ paddingHorizontal: 18 }}>
          <PHText weight="bold" style={{ fontSize: 24 }}>حسابي</PHText>
          <PHText color={colors.mutedForeground} style={{ fontSize: 13, marginTop: 2, marginBottom: 14 }}>تصفح كضيف؛ هذه المعلومات تُحفظ محليًا فقط.</PHText>
          <Notice tone="warning">تسجيل الدخول وحسابات العملاء غير متصلة. لن يتم إرسال معلوماتك إلى المتجر.</Notice>
          <Card>
            <PHText weight="bold" style={{ fontSize: 17, marginBottom: 10 }}>معلومات محفوظة على هذا الجهاز</PHText>
            <View style={{ gap: 11 }}>
              <TextField label="الاسم" value={name} onChangeText={setName} placeholder="الاسم الكامل" />
              <TextField label="رقم الهاتف" value={phone} onChangeText={setPhone} placeholder="رقم للتواصل" keyboardType="phone-pad" />
              <TextField label="البريد الإلكتروني" value={email} onChangeText={setEmail} placeholder="name@example.com" keyboardType="email-address" autoCapitalize="none" />
              <TextField label="موديل iPad" value={deviceModel} onChangeText={setDeviceModel} placeholder="اكتب الموديل كما يظهر في الإعدادات" />
              <TextField label="العنوان الافتراضي" value={address} onChangeText={setAddress} placeholder="المدينة والعنوان" />
              <Button title={saved ? 'تم الحفظ على الجهاز' : 'حفظ المعلومات المحلية'} icon={saved ? 'checkmark' : 'save-outline'} onPress={save} />
            </View>
          </Card>

          <View style={{ flexDirection: 'row-reverse', gap: 10, marginBottom: 8 }}>
            <View style={{ flex: 1, backgroundColor: colors.primarySoft, borderRadius: 16, padding: 12 }}>
              <PHText color={colors.mutedForeground} style={{ fontSize: 11 }}>طلبات محلية تجريبية</PHText>
              <PHText weight="bold" style={{ fontSize: 20, marginTop: 2 }}>{orders.length}</PHText>
            </View>
            <View style={{ flex: 1, backgroundColor: colors.muted, borderRadius: 16, padding: 12 }}>
              <PHText color={colors.mutedForeground} style={{ fontSize: 11 }}>حالة الحساب</PHText>
              <PHText weight="bold" style={{ fontSize: 14, marginTop: 5 }}>ضيف</PHText>
            </View>
          </View>
          {links.map((link) => (
            <Pressable key={link.route} onPress={() => router.push(link.route as any)} accessibilityRole="button" style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Ionicons name={link.icon as keyof typeof Ionicons.glyphMap} size={21} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <PHText weight="semibold" style={{ fontSize: 14 }}>{link.title}</PHText>
                <PHText color={colors.mutedForeground} style={{ fontSize: 11 }}>{link.detail}</PHText>
              </View>
              <Ionicons name="chevron-back" size={18} color={colors.mutedForeground} />
            </Pressable>
          ))}
          <Button title="تسجيل الدخول أو إنشاء حساب" icon="person-add-outline" kind="secondary" onPress={() => router.push('/signin' as any)} style={{ marginTop: 15 }} />
          <Button title="معاينة واجهات الإدارة التجريبية" icon="shield-outline" kind="ghost" onPress={() => router.push('/admin' as any)} style={{ marginTop: 9 }} />
        </View>
      </KeyboardAwareScrollViewCompat>
    </Page>
  );
}
