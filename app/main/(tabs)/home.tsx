// app/main/(tabs)/index.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  FlatList,
  Image,
  Pressable,
} from "react-native";

const ACCENT = "#6C8DFF";
const BG = "#12151C";
const BG_MID = "#1C2230";
const TEXT = "#E6EAF2";
const MUTED = "#8A93A6";
const BORDER = "#2A3242";

type Bet = {
  id: string;
  league: string;
  match: string;
  kickoff: string;
  img: string;   // img remota placeholder temática fútbol
  odds: { home: number; draw: number; away: number };
};

const DATA: Bet[] = [
  {
    id: "1",
    league: "Premier League",
    match: "Liverpool vs. Chelsea",
    kickoff: "Today • 18:30",
    img: "https://images.unsplash.com/photo-1518091043644-c1d4457512c6?q=80&w=1200",
    odds: { home: 1.95, draw: 3.4, away: 3.7 },
  },
  {
    id: "2",
    league: "LaLiga",
    match: "Barcelona vs. Sevilla",
    kickoff: "Today • 21:00",
    img: "https://library.sportingnews.com/styles/crop_style_16_9_desktop_webp/s3/2024-10/Barcelona%20vs.%20Sevilla.jpeg.webp?itok=p2ZaS13G",
    odds: { home: 1.65, draw: 3.8, away: 5.2 },
  },
  {
    id: "3",
    league: "Serie A",
    match: "Inter vs. Napoli",
    kickoff: "Tomorrow • 19:45",
    img: "https://images.unsplash.com/photo-1522778526097-ce0a22ceb253?q=80&w=1200",
    odds: { home: 2.1, draw: 3.2, away: 3.4 },
  },
];

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Text style={styles.title}>Featured Football Bets</Text>

      <FlatList
        data={DATA}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Image source={{ uri: item.img }} style={styles.image} />
            <View style={styles.cardBody}>
              <Text style={styles.league}>{item.league}</Text>
              <Text style={styles.match}>{item.match}</Text>
              <Text style={styles.kickoff}>{item.kickoff}</Text>

              <View style={styles.oddsRow}>
                <Pressable style={({ pressed }) => [styles.oddBtn, pressed && styles.oddPressed]}>
                  <Text style={styles.oddText}>Home {item.odds.home.toFixed(2)}</Text>
                </Pressable>
                <Pressable style={({ pressed }) => [styles.oddBtn, pressed && styles.oddPressed]}>
                  <Text style={styles.oddText}>Draw {item.odds.draw.toFixed(2)}</Text>
                </Pressable>
                <Pressable style={({ pressed }) => [styles.oddBtn, pressed && styles.oddPressed]}>
                  <Text style={styles.oddText}>Away {item.odds.away.toFixed(2)}</Text>
                </Pressable>
              </View>

              <View style={styles.actionRow}>
                <Pressable style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryPressed]}>
                  <Text style={styles.primaryText}>Add to Slip</Text>
                </Pressable>
                <Pressable style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryPressed]}>
                  <Text style={styles.secondaryText}>Details</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG, paddingHorizontal: 16, paddingTop: 8 },
  title: { color: TEXT, fontSize: 22, fontWeight: "800", marginVertical: 8, alignSelf: "center" },

  card: {
    backgroundColor: BG_MID,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: BORDER,
    marginTop: 14,
  },
  image: { width: "100%", height: 160 },
  cardBody: { padding: 12 },
  league: { color: MUTED, fontSize: 12, marginBottom: 2 },
  match: { color: TEXT, fontSize: 16, fontWeight: "800" },
  kickoff: { color: MUTED, marginTop: 2 },

  oddsRow: { flexDirection: "row", marginTop: 10 },
  oddBtn: {
    backgroundColor: "#0F1520",
    borderColor: BORDER,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginRight: 8,
  },
  oddPressed: { opacity: 0.7 },
  oddText: { color: TEXT, fontWeight: "700" },

  actionRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  primaryBtn: {
    flex: 1,
    backgroundColor: ACCENT,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    height: 46,
    marginRight: 8,
  },
  primaryPressed: { opacity: 0.85 },
  primaryText: { color: "#fff", fontWeight: "800" },

  secondaryBtn: {
    width: 110,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryPressed: { opacity: 0.85 },
  secondaryText: { color: TEXT, fontWeight: "700" },
});
