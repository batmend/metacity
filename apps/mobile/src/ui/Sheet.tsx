import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ThemeColors } from '../theme';

/** Доороос гарч ирэх энгийн панел (гадаад хамааралгүй). */
export function Sheet({ c, title, eyebrow, onClose, children }: { c: ThemeColors; title: string; eyebrow?: string; onClose: () => void; children: ReactNode }) {
  return (
    <View style={[s.sheet, { backgroundColor: c.bg, borderColor: c.line }]}>
      <View style={s.head}>
        <View style={{ flex: 1 }}>
          {eyebrow && <Text style={[s.eyebrow, { color: c.accent }]}>{eyebrow}</Text>}
          <Text style={[s.title, { color: c.fg }]}>{title}</Text>
        </View>
        <Pressable onPress={onClose} style={[s.close, { backgroundColor: c.bg2 }]} accessibilityLabel="Хаах">
          <Text style={{ color: c.fg, fontSize: 18 }}>×</Text>
        </Pressable>
      </View>
      <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ padding: 16, paddingTop: 0 }}>
        {children}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 18, borderTopRightRadius: 18, borderWidth: 1, elevation: 12, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12 },
  head: { flexDirection: 'row', alignItems: 'flex-start', padding: 16, paddingBottom: 8 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  title: { fontSize: 20, fontWeight: '700', marginTop: 2 },
  close: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
