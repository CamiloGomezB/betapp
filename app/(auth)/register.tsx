// app/(auth)/register.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from "expo-router";
import React, { JSX, useMemo, useState } from "react";
import {
    Pressable,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../../utils/supabase"; // <-- usa tu cliente actual

const ACCENT = "#6C8DFF";
const BG = "#12151C";
const BG_MID = "#1C2230";
const TEXT = "#E6EAF2";
const MUTED = "#8A93A6";
const BORDER = "#2A3242";

export default function RegisterScreen(): JSX.Element {
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirm, setConfirm] = useState<string>("");
  const [role, setRole] = useState<string>("CLIENT");

  const [isLoading, setIsLoading] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [error, setError] = useState<string>("");

  const canSubmit = useMemo(() => {
    const okName = name.trim().length >= 2;
    const okEmail = /\S+@\S+\.\S+/.test(email);
    const okPass = password.length >= 6;
    const match = password === confirm && confirm.length > 0;
    return okName && okEmail && okPass && match;
  }, [name, email, password, confirm]);

  const slugify = (s: string) =>
    s
      .toLowerCase()
      .trim()
      .replace(/[^\p{L}\p{N}]+/gu, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 24);

  // Función para guardar el perfil en la base de datos de forma asíncrona
  const saveProfileToDatabase = async (userId: string) => {
    try {
      setIsSavingProfile(true);
      console.log("💾 Starting async profile save to database...");
      
      const username = slugify(name || email.split("@")[0]);
      const profilePayload = {
        id: userId,         // FK -> auth.users.id
        email: email.trim(),
        name: name.trim(),
        username,           // generado automáticamente
        role: role,         // ADMIN o CLIENT
        bio: null,          // campos adicionales para completar el perfil
        phone: null,
        avatar_url: null,
        points: 0,
      };

      console.log("📦 Profile payload:", { 
        id: profilePayload.id, 
        email: profilePayload.email, 
        name: profilePayload.name,
        username: profilePayload.username,
        role: profilePayload.role 
      });

      // Intentar guardar en la base de datos
      let { data: savedProfile, error: dbError } = await supabase
        .from("profiles")
        .upsert(profilePayload, { onConflict: "id", ignoreDuplicates: false })
        .select("id, name, email, username, role")
        .single();

      // Si falla el upsert, intentar insert directo
      if (dbError && (dbError.code === '42501' || dbError.message.includes('row-level security'))) {
        console.log("⚠️ Upsert failed due to RLS, trying direct insert...");
        const { data: insertData, error: insertError } = await supabase
          .from("profiles")
          .insert(profilePayload)
          .select("id, name, email, username, role")
          .single();
        
        savedProfile = insertData;
        dbError = insertError;
      }

      // Si la base de datos falla completamente, usar AsyncStorage como fallback
      if (dbError) {
        console.log("❌ Database save failed, using local storage fallback...");
        console.log("Database error details:", {
          code: dbError.code,
          message: dbError.message,
          details: dbError.details
        });
        
        try {
          // Guardar en AsyncStorage como respaldo
          const localProfileData = {
            id: userId,
            email: profilePayload.email,
            name: profilePayload.name,
            username: profilePayload.username,
            role: profilePayload.role,
            created_at: new Date().toISOString(),
            source: 'local_storage_fallback'
          };
          
          await AsyncStorage.setItem(`profile_${userId}`, JSON.stringify(localProfileData));
          console.log("✅ Profile saved to local storage successfully");
          console.warn("⚠️ Using local storage due to database error. Check RLS policies in Supabase.");
        } catch (storageError) {
          console.error("❌ Local storage save also failed:", storageError);
        }
      } else {
        console.log("✅ Profile saved to database successfully:", savedProfile);
      }
      
    } catch (error) {
      console.error("❌ Error in async profile save:", error);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleRegister = async () => {
    if (!canSubmit || isLoading) return;

    setError("");
    setIsLoading(true);
    
    try {
      console.log("🚀 Starting registration process...");
      console.log("📝 Registration data:", { 
        email: email.trim(), 
        name: name.trim(), 
        role: role,
        hasPassword: !!password 
      });

      // 1) Crear usuario en Supabase Auth
      console.log("🔐 Creating user in Supabase Auth...");
      const { data, error: authErr } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      
      if (authErr) {
        console.error("❌ Auth registration failed:", authErr);
        throw new Error(authErr.message);
      }

      const userId = data.user?.id;
      if (!userId) {
        console.error("❌ No user ID returned from registration");
        throw new Error(
          "No se pudo obtener el ID del usuario luego del registro."
        );
      }

      console.log("✅ User created successfully with ID:", userId);

      // 2) Redirigir al login inmediatamente
      console.log("🎉 Registration completed successfully! Redirecting to login...");
      router.replace("/(auth)/login");

      // 3) Guardar perfil en la base de datos de forma asíncrona (en segundo plano)
      saveProfileToDatabase(userId);
      
    } catch (e: any) {
      console.error("❌ Registration failed:", e);
      
      // Manejo de errores específicos
      let errorMessage = "Error al registrar";
      
      if (e?.message) {
        if (e.message.includes("already registered")) {
          errorMessage = "Este correo ya está registrado";
        } else if (e.message.includes("Invalid email")) {
          errorMessage = "Correo electrónico inválido";
        } else if (e.message.includes("Password")) {
          errorMessage = "La contraseña debe tener al menos 6 caracteres";
        } else if (e.message.includes("network")) {
          errorMessage = "Error de conexión. Verifica tu internet";
        } else {
          errorMessage = e.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Text style={styles.title}>Create Account</Text>

      <View style={styles.form}>
        {/* Name */}
        <View className="input-row" style={styles.inputRow}>
          <Text style={styles.leftIcon}>👤</Text>
          <TextInput
            style={styles.input}
            placeholder="Full name"
            placeholderTextColor={MUTED}
            autoComplete="off"
            autoCorrect={false}
            textContentType="none"
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Email */}
        <View style={[styles.inputRow, { marginTop: 12 }]}>
          <Text style={styles.leftIcon}>@</Text>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={MUTED}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect={false}
            textContentType="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        {/* Password */}
        <View style={[styles.inputRow, { marginTop: 12 }]}>
          <Text style={styles.leftIcon}>*</Text>
          <TextInput
            style={styles.input}
            placeholder="Password (min 6 chars)"
            placeholderTextColor={MUTED}
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect={false}
            textContentType="none"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        {/* Confirm Password */}
        <View style={[styles.inputRow, { marginTop: 12 }]}>
          <Text style={styles.leftIcon}>*</Text>
          <TextInput
            style={styles.input}
            placeholder="Confirm password"
            placeholderTextColor={MUTED}
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect={false}
            textContentType="none"
            secureTextEntry
            value={confirm}
            onChangeText={setConfirm}
          />
        </View>

        {/* Role Selection */}
        <View style={[styles.roleContainer, { marginTop: 12 }]}>
          <Text style={styles.roleLabel}>Select Role</Text>
          <View style={styles.roleOptions}>
            <TouchableOpacity
              style={[
                styles.roleOption,
                role === "CLIENT" && styles.roleOptionSelected
              ]}
              onPress={() => setRole("CLIENT")}
            >
              <Text style={[
                styles.roleOptionText,
                role === "CLIENT" && styles.roleOptionTextSelected
              ]}>
                CLIENT
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.roleOption,
                role === "ADMIN" && styles.roleOptionSelected
              ]}
              onPress={() => setRole("ADMIN")}
            >
              <Text style={[
                styles.roleOptionText,
                role === "ADMIN" && styles.roleOptionTextSelected
              ]}>
                ADMIN
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Error */}
        {!!error && (
          <Text style={{ color: "#ff6b6b", marginTop: 10, fontSize: 12 }}>
            {error}
          </Text>
        )}

        {/* Register button */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.primaryBtn,
            (!canSubmit || isLoading) && { opacity: 0.5 },
          ]}
          disabled={!canSubmit || isLoading}
          onPress={handleRegister}
        >
          <Text style={styles.primaryText}>
            {isLoading ? "Registering..." : "Register"}
          </Text>
        </TouchableOpacity>

        {/* Loading indicator for profile saving */}
        {isSavingProfile && (
          <View style={styles.savingIndicator}>
            <Text style={styles.savingText}>
              💾 Guardando perfil en la base de datos...
            </Text>
          </View>
        )}

        {/* Back to login */}
        <Pressable
          onPress={() => router.navigate("/(auth)/login")}
          style={styles.linkRow}
          hitSlop={8}
        >
          <Text style={styles.mutedText}>Already have an account? </Text>
          <Text style={styles.linkText}>Sign In</Text>
        </Pressable>
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
  
  // Role selection styles
  roleContainer: {
    backgroundColor: BG_MID,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  roleLabel: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  roleOptions: {
    flexDirection: "row",
    gap: 8,
  },
  roleOption: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BG,
  },
  roleOptionSelected: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  roleOptionText: {
    color: MUTED,
    fontSize: 14,
    fontWeight: "700",
  },
  roleOptionTextSelected: {
    color: "#fff",
  },
  
  // Saving indicator styles
  savingIndicator: {
    marginTop: 12,
    padding: 12,
    backgroundColor: BG_MID,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: ACCENT,
    alignItems: "center",
  },
  savingText: {
    color: ACCENT,
    fontSize: 12,
    fontWeight: "600",
  },
});
