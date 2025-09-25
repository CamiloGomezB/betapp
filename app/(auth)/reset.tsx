// app/(auth)/reset.tsx
import { router } from "expo-router";
import React, { JSX, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  StatusBar,
} from "react-native";

const ACCENT = "#6C8DFF";
const BG = "#12151C";
const BG_MID = "#1C2230";
const TEXT = "#E6EAF2";
const MUTED = "#8A93A6";
const BORDER = "#2A3242";

export default function ResetScreen(): JSX.Element {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");

  const canSendCode = useMemo(() => /\S+@\S+\.\S+/.test(email), [email]);
  const canReset = useMemo(() => {
    const okCode = code.trim().length >= 4;
    const okPass = pass.length >= 6;
    return okCode && okPass && pass === confirm;
  }, [code, pass, confirm]);

  const handleSendCode = () => {
    // Lógica real de envío (API/Firebase) aquí.
    setStep(2);
  };

  const handleReset = () => {
    // Lógica real de reset (API/Firebase) aquí.
    // Si todo ok, vuelve al login:
    router.navigate("/(auth)/login");
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Text style={styles.title}>Reset Password</Text>

      <View style={styles.form}>
        {/* STEP 1: pedir email */}
        {step === 1 && (
          <>
            <View style={styles.inputRow}>
              <Text style={styles.leftIcon}>@</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor={MUTED}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.primaryBtn, !canSendCode && { opacity: 0.5 }]}
              disabled={!canSendCode}
              onPress={handleSendCode}
            >
              <Text style={styles.primaryText}>Send verification code</Text>
            </TouchableOpacity>

            <Pressable
              onPress={() => router.navigate("/(auth)/login")}
              style={styles.linkRow}
            >
              <Text style={styles.mutedText}>Remembered your password? </Text>
              <Text style={styles.linkText}>Back to Sign In</Text>
            </Pressable>
          </>
        )}

        {/* STEP 2: ingresar código + nueva contraseña */}
        {step === 2 && (
          <>
            <View style={styles.infoPill}>
              <Text style={styles.infoText}>
                We sent a code to{" "}
                <Text style={{ fontWeight: "800", color: TEXT }}>{email}</Text>
              </Text>
            </View>

            {/* Code */}
            <View style={[styles.inputRow, { marginTop: 12 }]}>
            <Text style={styles.leftIcon}>#</Text>
            <TextInput
                style={styles.input}
                placeholder="Verification code"
                placeholderTextColor={MUTED}
                autoCapitalize="none"
                keyboardType="number-pad"
                value={code}
                onChangeText={setCode}
            />
            </View>

            {/* New pass */}
            <View style={[styles.inputRow, { marginTop: 12 }]}>
            <Text style={styles.leftIcon}>*</Text>
            <TextInput
                style={styles.input}
                placeholder="New password (min 6 chars)"
                placeholderTextColor={MUTED}
                autoCapitalize="none"
                secureTextEntry
                value={pass}
                onChangeText={setPass}
            />
            </View>

            {/* Confirm */}
            <View style={[styles.inputRow, { marginTop: 12 }]}>
            <Text style={styles.leftIcon}>*</Text>
            <TextInput
                style={styles.input}
                placeholder="Confirm new password"
                placeholderTextColor={MUTED}
                autoCapitalize="none"
                secureTextEntry
                value={confirm}
                onChangeText={setConfirm}
            />
            </View>

            <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.primaryBtn, !canReset && { opacity: 0.5 }]}
            disabled={!canReset}
            onPress={handleReset}
            >
            <Text style={styles.primaryText}>Reset Password</Text>
            </TouchableOpacity>

            <Pressable
            onPress={() => router.navigate("/(auth)/login")}
            style={styles.linkRow}
            >
            <Text style={styles.mutedText}>All set? </Text>
            <Text style={styles.linkText}>Go to Sign In</Text>
            </Pressable>
        </>
        )}
    </View>
    </View>
);
}

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
  form: { width: "100%" },

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
    width: 24,
    textAlign: "center",
    color: MUTED,
    fontWeight: "700",
  },
  input: { flex: 1, color: TEXT, paddingHorizontal: 8 },

  primaryBtn: {
    marginTop: 18,
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ACCENT,
  },
  primaryText: { color: "#fff", fontSize: 16, fontWeight: "800" },

  linkRow: { alignSelf: "center", marginTop: 14, flexDirection: "row" },
  mutedText: { color: MUTED, fontSize: 12 },
  linkText: { color: ACCENT, fontSize: 12, fontWeight: "800" },

  infoPill: {
    backgroundColor: "#202636",
    borderColor: BORDER,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  infoText: { color: MUTED, fontSize: 12 },
});