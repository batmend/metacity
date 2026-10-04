import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { CATEGORY_ICON, type Service } from '@metacity/services';
import type { ThemeColors } from '../theme';

export function ServiceRow({ s: svc, c, onWhere }: { s: Service; c: ThemeColors; onWhere?: (id: string) => void }) {
  const act = () => {
    if (svc.url) void Linking.openURL(svc.url);
    else if (svc.phone) void Linking.openURL(`tel:${svc.phone}`);
  };
  return (
    <View style={[st.row, { borderColor: c.line }]}>
      <Text style={st.ico}>{CATEGORY_ICON[svc.category]}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[st.title, { color: c.fg }]}>{svc.title}</Text>
        <Text style={[st.desc, { color: c.muted }]}>{svc.description}</Text>
        <View style={st.foot}>
          <Text style={[st.chip, { borderColor: c.line, color: c.muted }]}>
            {svc.channel === 'online' ? 'Онлайн' : svc.channel === 'onsite' ? 'Биечлэн' : 'Онлайн / биечлэн'}
          </Text>
          {svc.phone && <Text style={[st.chip, { borderColor: c.line, color: c.muted }]}>☎ {svc.phone}</Text>}
          {(svc.url || svc.phone) && (
            <Pressable onPress={act} style={[st.btn, { backgroundColor: c.accent }]}>
              <Text style={{ color: c.accentFg, fontWeight: '600', fontSize: 12 }}>{svc.url ? 'Үйлчилгээ авах' : 'Залгах'}</Text>
            </Pressable>
          )}
          {onWhere && (
            <Pressable onPress={() => onWhere(svc.id)} style={[st.btn, { borderWidth: 1, borderColor: c.line }]}>
              <Text style={{ color: c.fg, fontSize: 12 }}>Хаана?</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, paddingVertical: 10, borderTopWidth: 1 },
  ico: { fontSize: 20 },
  title: { fontWeight: '600', fontSize: 15 },
  desc: { fontSize: 13, marginTop: 2 },
  foot: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginTop: 8 },
  chip: { fontSize: 11, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  btn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
});
