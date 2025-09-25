// app/(auth)/login.tsx
import React, { JSX, useContext, useState } from "react";
import { router } from "expo-router";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { AuthContext } from "@/contexts/AuthContext";

/* ---------- Theme ---------- */
const BG = "#12151C";
const BG_MID = "#1C2230";
const TEXT = "#E6EAF2";
const MUTED = "#8A93A6";
const ACCENT = "#6C8DFF";
const BORDER = "#2A3242";

/* ---------- Screen ---------- */
export default function LoginScreen(): JSX.Element {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPass, setShowPass] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const { login, isLoading } = useContext(AuthContext);

  const onSignIn = async () => {
    setError("");
    try {
      await login(email, password); // usa el fakeDataSource del contexto
      router.replace("/main/(tabs)/home"); // entrar a tu stack principal
    } catch (e: any) {
      setError(e?.message ?? "Error al iniciar sesión");
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <Text style={styles.title}>BetApp</Text>

      <View style={styles.form}>
        {/* Email */}
        <View style={styles.inputRow}>
          <Text style={styles.leftIcon}>@</Text>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={MUTED}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            returnKeyType="next"
          />
        </View>

        {/* Password */}
        <View style={[styles.inputRow, { marginTop: 12 }]}>
          <Text style={styles.leftIcon}>*</Text>
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={MUTED}
            autoCapitalize="none"
            secureTextEntry={!showPass}
            value={password}
            onChangeText={setPassword}
            returnKeyType="done"
          />
          <Pressable
            onPress={() => setShowPass((v) => !v)}
            style={styles.eyeBtn}
            hitSlop={10}
          >
            <Text style={styles.eyeText}>{showPass ? "Hide" : "Show"}</Text>
          </Pressable>
        </View>

        {/* Forgot password */}
        <Pressable
          onPress={() => router.navigate("/(auth)/reset")}
          style={styles.linkRow}
          hitSlop={8}
        >
          <Text style={styles.linkText}>Forgot Password?</Text>
        </Pressable>

        {/* Error */}
        {!!error && (
          <Text style={styles.errorText}>
            {error}
          </Text>
        )}

        {/* Sign In */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.signInBtn, isLoading && { opacity: 0.6 }]}
          onPress={onSignIn}
          disabled={isLoading}
        >
          <Text style={styles.signInText}>
            {isLoading ? "Signing in..." : "Sign In"}
          </Text>
        </TouchableOpacity>

        {/* Register */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.signInBtn}
          onPress={() => router.navigate("/(auth)/register")}
        >
          <Text style={styles.signInText}>Register</Text>
        </TouchableOpacity>

        {/* Social (visual) */}
        <Text style={styles.socialLegend}>Or by social accounts</Text>
        <View style={styles.socialRow}>
          <View style={styles.socialCircle}>
            <Text style={styles.socialText}>f</Text>
          </View>
          <View style={styles.socialCircle}>
            <Text style={styles.socialText}>G</Text>
          </View>
          <View style={styles.socialCircle}>
            <Text style={styles.socialText}>t</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  title: {
    alignSelf: "center",
    color: TEXT,
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 28,
  },
  form: {
    width: "100%",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    borderRadius: 14,
    backgroundColor: BG_MID,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  leftIcon: {
    width: 22,
    textAlign: "center",
    color: MUTED,
    fontWeight: "700",
  },
  input: {
    flex: 1,
    color: TEXT,
    paddingHorizontal: 8,
  },
  eyeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  eyeText: {
    color: ACCENT,
    fontWeight: "700",
    fontSize: 12,
  },
  linkRow: {
    alignSelf: "flex-end",
    marginTop: 14,
    flexDirection: "row",
  },
  linkText: {
    color: ACCENT,
    fontSize: 12,
    fontWeight: "800",
  },
  errorText: {
    color: "#FF6B6B",
    marginTop: 10,
    fontSize: 12,
  },
  signInBtn: {
    marginTop: 18,
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ACCENT,
  },
  signInText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  socialLegend: {
    textAlign: "center",
    color: MUTED,
    marginTop: 18,
    fontSize: 12,
  },
  socialRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10,
  },
  socialCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 10,
    backgroundColor: BG_MID,
    borderWidth: 1,
    borderColor: BORDER,
  },
  socialText: {
    color: TEXT,
    fontWeight: "800",
  },
});
