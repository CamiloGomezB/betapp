// app/main/(tabs)/search.tsx
import { View, Text, StyleSheet, StatusBar } from "react-native";

const BG = "#12151C", TEXT = "#E6EAF2", MUTED = "#8A93A6";

export default function Search() {
  return (
    <View style={styles.c}>
      <StatusBar barStyle="light-content" />
      <Text style={styles.h1}>Search</Text>
      <Text style={styles.p}>Find matches and teams.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: BG, alignItems: "center", justifyContent: "center", padding: 16 },
  h1: { color: TEXT, fontSize: 22, fontWeight: "800", marginBottom: 8 },
  p: { color: MUTED }
});
