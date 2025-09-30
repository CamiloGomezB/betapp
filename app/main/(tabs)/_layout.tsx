// app/main/(tabs)/_layout.tsx
import { Feather, Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform } from "react-native";

const ACCENT = "#6C8DFF";
const BG = "#0E1218";
const ICON = "#E6EAF2";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: ACCENT,
        tabBarInactiveTintColor: ICON,
        tabBarStyle: {
          backgroundColor: BG,
          borderTopColor: "#1B2330",
          height: Platform.select({ ios: 84, android: 66 }),
          paddingTop: 8,
          paddingBottom: Platform.select({ ios: 22, android: 10 }),
        },
      }}
    >
      {/* 1) HOME (izquierda) -> app/main/(tabs)/home.tsx */}
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={size} color={color} />
          ),
        }}
      />

      {/* 2) EXPLORE -> app/main/(tabs)/explore.tsx */}
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarIcon: ({ color, size }) => <Feather name="compass" size={size} color={color} />,
        }}
      />

      {/* 3) SEARCH (centro) -> Crea app/main/(tabs)/search.tsx */}
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color, size }) => <Feather name="search" size={size} color={color} />,
        }}
      />

      {/* 4) CHATS -> app/main/(tabs)/chats */}
      <Tabs.Screen
        name="chats"
        options={{
          title: "Chats",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "chatbubbles" : "chatbubbles-outline"} size={size} color={color} />
          ),
        }}
      />

      {/* 5) PROFILE (derecha) -> app/main/(tabs)/profile.tsx */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "person-circle" : "person-circle-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
