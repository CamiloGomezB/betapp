// app/main/(tabs)/profile.tsx
import { AuthContext } from "@/contexts/AuthContext";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraType, CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from 'expo-image-picker';
import { router } from "expo-router";
import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Modal,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
} from "react-native";
import { supabase } from "../../../utils/supabase"; // <- ajusta si tu path es distinto

const BG = "#12151C",
  TEXT = "#E6EAF2",
  MUTED = "#8A93A6",
  BG_MID = "#1C2230",
  BORDER = "#2A3242",
  ACCENT = "#6C8DFF",
  RED = "#FF6B6B",
  GREEN = "#38D39F";

type ProfileRow = {
  name: string | null;
  username: string | null;
  email: string | null;
  bio: string | null;
  phone: string | null;
  avatar_url: string | null;
};

export default function Profile() {
  const { logout, isLoading: isAuthLoading, user } = useContext(AuthContext);
  
  console.log("Profile component - User state:", { user, isAuthLoading });

  // switches (visual only)
  const [twoFA, setTwoFA] = useState(false);
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [publicProfile, setPublicProfile] = useState(false);
  const [adsPersonalized, setAdsPersonalized] = useState(true);
  const [pushNotif, setPushNotif] = useState(true);
  const [emailNotif, setEmailNotif] = useState(false);

  // profile data
  const [profile, setProfile] = useState<ProfileRow>({
    name: null,
    username: null,
    email: null,
    bio: null,
    phone: null,
    avatar_url: null,
  });
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // camera state
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [facing, setFacing] = useState<CameraType>("back");
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const uploadProfileImage = useCallback(async (localUri: string) => {
    if (!user?.id) return null;
    try {
      const response = await fetch(localUri);
      const buffer = await response.arrayBuffer();
      const fileName = `${user.id}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("ProfileImages")
        .upload(fileName, buffer, { contentType: "image/jpeg", upsert: true });
      if (uploadError) {
        console.warn("Upload error:", uploadError.message);
        return null;
      }
      const { data } = supabase.storage.from("ProfileImages").getPublicUrl(fileName);
      return data.publicUrl ?? null;
    } catch (_e) {
      console.warn("Upload exception:", _e);
      return null;
    }
  }, [user?.id]);

  const persistAvatarUrl = useCallback(async (publicUrl: string) => {
    if (!user?.id) return;
    try {
      // 1) UPDATE ONLY avatar_url to avoid overwriting other fields like name
      const updateRes = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id)
        .select("id");

      if (!updateRes.error && Array.isArray(updateRes.data) && updateRes.data.length > 0) {
        setProfile((p) => ({ ...p, avatar_url: publicUrl }));
        return true;
      }

      // 2) If no row exists yet, INSERT minimal required fields
      const safeName = (profile?.name ?? "");
      const insertRes = await supabase
        .from("profiles")
        .insert({ id: user.id, email: user.email ?? null, name: safeName, avatar_url: publicUrl })
        .select("id");

      if (!insertRes.error) {
        setProfile((p) => ({ ...p, avatar_url: publicUrl }));
        return true;
      }

      console.warn('Failed to persist avatar_url:', updateRes.error || insertRes.error);
      setErrorMsg(`DB error (${(updateRes.error as any)?.code || (insertRes.error as any)?.code || 'unknown'}): ${(updateRes.error as any)?.message || (insertRes.error as any)?.message || 'Could not save avatar in database.'}`);
      return false;
    } catch (err: any) {
      console.warn('Persist avatar exception:', err?.message || err);
      setErrorMsg(`DB exception: ${err?.message ?? err}`);
      return false;
    }
  }, [user?.id]);

  // modal fields
  const [mName, setMName] = useState("");
  const [mUsername, setMUsername] = useState("");
  const [mEmail, setMEmail] = useState("");
  const [mBio, setMBio] = useState("");
  const [mPhone, setMPhone] = useState("");

  const loadProfile = useCallback(async () => {
    if (!user?.id) return;
    console.log("Loading profile for user:", user.id);
    setLoadingProfile(true);
    setErrorMsg("");
    try {
      // Try to load from database first
      const { data, error } = await supabase
        .from("profiles")
        .select("name, username, email, bio, phone, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      console.log("Profile data from DB:", data);
      console.log("Profile error:", error);

      let profileData: ProfileRow;

      if (data && !error) {
        // Data exists in database
        profileData = {
          name: data.name ?? null,
          username: data.username ?? null,
          email: data.email ?? user.email ?? null,
          bio: data.bio ?? null,
          phone: data.phone ?? null,
          avatar_url: data.avatar_url ?? null,
        };
        console.log("Using database data");
      } else {
        // Fallback to local storage
        console.log("Database failed, trying local storage...");
        const localData = await AsyncStorage.getItem(`profile_${user.id}`);
        
        if (localData) {
          const parsed = JSON.parse(localData);
          profileData = {
            name: parsed.name ?? null,
            username: parsed.username ?? null,
            email: user.email ?? null,
            bio: parsed.bio ?? null,
            phone: parsed.phone ?? null,
            avatar_url: parsed.avatar_url ?? null,
          };
          console.log("Using local storage data:", profileData);
        } else {
          // No data anywhere, use defaults
          profileData = {
            name: null,
            username: null,
            email: user.email ?? null,
            bio: null,
            phone: null,
            avatar_url: null,
          };
          console.log("Using default data");
        }
      }

      console.log("Setting profile state:", profileData);
      setProfile(profileData);
      if (profileData.avatar_url) {
        setPhotoUri(profileData.avatar_url);
      }
    } catch (e: any) {
      console.error("Error loading profile:", e);
      setErrorMsg(e?.message ?? "Failed to load profile");
    } finally {
      setLoadingProfile(false);
    }
  }, [user?.id, user?.email]);

  useEffect(() => {
    if (!user?.id) return;
    loadProfile();
  }, [user?.id, loadProfile]);

  const openEdit = () => {
    console.log("Opening edit modal with profile data:", profile);
    console.log("User email:", user?.email);
    
    // Prefill inputs with loaded values (or auth email)
    const nameValue = profile.name ?? "";
    const usernameValue = profile.username ?? "";
    const emailValue = profile.email ?? user?.email ?? "";
    const bioValue = profile.bio ?? "";
    const phoneValue = profile.phone ?? "";
    
    console.log("Setting modal values:", {
      name: nameValue,
      username: usernameValue,
      email: emailValue,
      bio: bioValue,
      phone: phoneValue
    });
    
    setMName(nameValue);
    setMUsername(usernameValue);
    setMEmail(emailValue);
    setMBio(bioValue);
    setMPhone(phoneValue);
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!user?.id) return;
    console.log("Saving profile with data:", {
      mName, mUsername, mEmail, mBio, mPhone
    });
    
    setSaving(true);
    setErrorMsg("");
    try {
      // Email is read-only here and not upserted
      const payload = {
        id: user.id, // PK = auth.users.id
        email: user.email, // Include email for initial creation
        name: mName.trim() || null,
        username: mUsername.trim() || null,
        bio: mBio.trim() || null,
        phone: mPhone.trim() || null,
      };

      console.log("Payload to save:", payload);

      // Try to save to database first
      let { error } = await supabase
        .from("profiles")
        .upsert(payload, { onConflict: "id", ignoreDuplicates: false })
        .select("id")
        .single();

      console.log("Upsert result error:", error);

      // If upsert fails due to RLS, try insert
      if (error && error.code === '42501') {
        console.log("Upsert failed due to RLS, trying insert...");
        const { error: insertError } = await supabase
          .from("profiles")
          .insert(payload)
          .select("id")
          .single();
        
        error = insertError;
        console.log("Insert result error:", error);
      }

      // If database save fails, save to local storage as fallback
      if (error) {
        console.log("Database save failed, saving to local storage as fallback...");
        console.log("Database error:", error);
        try {
          await AsyncStorage.setItem(`profile_${user.id}`, JSON.stringify({
            name: payload.name,
            username: payload.username,
            bio: payload.bio,
            phone: payload.phone,
          }));
          console.log("Profile saved to local storage successfully");
          // Don't throw error, just warn that it's using local storage
          console.warn("Using local storage due to database error. Check RLS policies.");
        } catch (storageError) {
          console.error("Local storage save failed:", storageError);
          throw new Error("Failed to save profile to both database and local storage");
        }
      } else {
        console.log("Profile saved to database successfully");
        // Clear local storage since we successfully saved to database
        try {
          await AsyncStorage.removeItem(`profile_${user.id}`);
          console.log("Cleared local storage since data is now in database");
        } catch (e) {
          console.warn("Could not clear local storage:", e);
        }
      }

      console.log("Profile saved successfully, reloading...");
      // Refresh from DB to keep UI in sync (and keep email from auth/db)
      await loadProfile();
      setEditOpen(false);
    } catch (e: any) {
      console.error("Error saving profile:", e);
      setErrorMsg(e?.message ?? "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      router.replace("/(auth)/login");
    }
  };

  const displayOrPlaceholder = (val?: string | null) =>
    val && val.trim().length > 0 ? val : "Not set";

  // Si no hay usuario autenticado, mostrar mensaje
  if (!isAuthLoading && !user) {
    return (
      <View style={s.root}>
        <StatusBar barStyle="light-content" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ color: TEXT, fontSize: 18, textAlign: 'center', marginBottom: 20 }}>
            No estás autenticado
          </Text>
          <Text style={{ color: MUTED, fontSize: 14, textAlign: 'center', marginBottom: 30 }}>
            Por favor, inicia sesión para acceder a tu perfil
          </Text>
          <Pressable
            onPress={() => router.push('/(auth)/login')}
            style={({ pressed }) => [
              s.logoutBtn,
              { backgroundColor: ACCENT },
              pressed && { opacity: 0.8 }
            ]}
          >
            <Text style={s.logoutText}>Ir al Login</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Header / user card */}
        <View style={s.cardRow}>
          <View style={s.avatarWrap}>
            <Image
              source={{
                uri: photoUri ?? "https://i.pinimg.com/564x/bd/cc/de/bdccde33dea7c9e549b325635d2c432e.jpg",
              }}
              style={s.avatar}
            />
              <Pressable
              style={s.cameraBtn}
              onPress={async () => {
                try {
                  if (!permission?.granted) {
                    const res = await requestPermission();
                    if (!res.granted) return;
                  }
                  setCameraOpen(true);
                } catch (_e) {
                  // noop
                }
              }}
            >
              <Feather name="camera" size={14} color={TEXT} />
            </Pressable>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{displayOrPlaceholder(profile.name)}</Text>
            <Text style={s.sub}>Available balance</Text>
            <Text style={s.money}>$ 0.00</Text>
          </View>
          <Pressable
            onPress={openEdit}
            style={({ pressed }) => [s.ghostBtn, pressed && s.pressed]}
          >
            <Feather name="edit-3" size={18} color={TEXT} />
            <Text style={s.ghostText}>Edit</Text>
          </Pressable>
        </View>

        {/* Loading / errors */}
        {loadingProfile ? (
          <View style={{ padding: 12, alignItems: "center" }}>
            <ActivityIndicator />
            <Text style={{ color: MUTED, marginTop: 8, fontSize: 12 }}>
              Loading profile...
            </Text>
          </View>
        ) : null}
        {!!errorMsg && (
          <Text style={{ color: "#ff6b6b", marginTop: 10, fontSize: 12 }}>
            {errorMsg}
          </Text>
        )}

        {/* Account */}
        <Section title="Account">
          {/* Email (from DB or auth) */}
          <Row
            icon={<Ionicons name="at-outline" size={18} color={ACCENT} />}
            label="Email"
            helper={displayOrPlaceholder(profile.email ?? user?.email ?? "")}
            right={<Badge label="Verified" color={GREEN} />}
          />

          {/* Username (from DB) */}
          <Row
            icon={<Feather name="user" size={18} color={ACCENT} />}
            label="Username"
            helper={displayOrPlaceholder(profile.username)}
            right={<Chevron />}
          />

          {/* Phone (from DB) */}
          <Row
            icon={<Feather name="phone" size={18} color={ACCENT} />}
            label="Phone"
            helper={displayOrPlaceholder(profile.phone)}
            right={<Chevron />}
          />

          <Row
            icon={<MaterialCommunityIcons name="id-card" size={18} color={ACCENT} />}
            label="Identity (KYC)"
            helper="Not verified"
            right={<Badge label="Action needed" color={RED} />}
          />
        </Section>

        {/* Security */}
        <Section title="Security">
          <Row
            icon={<Feather name="lock" size={18} color={ACCENT} />}
            label="Change password"
            right={<Chevron />}
          />
          <Row
            icon={<Feather name="shield" size={18} color={ACCENT} />}
            label="Two-factor authentication"
            helper="Add an extra layer of security"
            right={
              <Switch
                value={twoFA}
                onValueChange={setTwoFA}
                trackColor={{ false: "#2A3242", true: ACCENT }}
                thumbColor={twoFA ? "#fff" : "#bbb"}
              />
            }
          />
          <Row
            icon={<Ionicons name="notifications-outline" size={18} color={ACCENT} />}
            label="Login alerts"
            helper="Notify when a new device signs in"
            right={
              <Switch
                value={loginAlerts}
                onValueChange={setLoginAlerts}
                trackColor={{ false: "#2A3242", true: ACCENT }}
                thumbColor={loginAlerts ? "#fff" : "#bbb"}
              />
            }
          />
          <Row
            icon={<Ionicons name="phone-portrait-outline" size={18} color={ACCENT} />}
            label="Trusted devices"
            helper="Manage recognized devices"
            right={<Chevron />}
          />
          <Row
            icon={<Feather name="activity" size={18} color={ACCENT} />}
            label="Active sessions"
            helper="See where you’re logged in"
            right={<Chevron />}
          />
        </Section>

        {/* Privacy */}
        <Section title="Privacy">
          <Row
            icon={<Ionicons name="eye-outline" size={18} color={ACCENT} />}
            label="Public profile"
            helper={publicProfile ? "Visible to everyone" : "Only you"}
            right={
              <Switch
                value={publicProfile}
                onValueChange={setPublicProfile}
                trackColor={{ false: "#2A3242", true: ACCENT }}
                thumbColor={publicProfile ? "#fff" : "#bbb"}
              />
            }
          />
          <Row
            icon={<Feather name="target" size={18} color={ACCENT} />}
            label="Personalized ads"
            helper={adsPersonalized ? "Enabled" : "Disabled"}
            right={
              <Switch
                value={adsPersonalized}
                onValueChange={setAdsPersonalized}
                trackColor={{ false: "#2A3242", true: ACCENT }}
                thumbColor={adsPersonalized ? "#fff" : "#bbb"}
              />
            }
          />
          <Row
            icon={<Feather name="download-cloud" size={18} color={ACCENT} />}
            label="Download my data"
            right={<Chevron />}
          />
        </Section>

        {/* Notifications */}
        <Section title="Notifications">
          <Row
            icon={<Ionicons name="notifications-circle-outline" size={20} color={ACCENT} />}
            label="Push notifications"
            right={
              <Switch
                value={pushNotif}
                onValueChange={setPushNotif}
                trackColor={{ false: "#2A3242", true: ACCENT }}
                thumbColor={pushNotif ? "#fff" : "#bbb"}
              />
            }
          />
          <Row
            icon={<Feather name="mail" size={18} color={ACCENT} />}
            label="Email notifications"
            right={
              <Switch
                value={emailNotif}
                onValueChange={setEmailNotif}
                trackColor={{ false: "#2A3242", true: ACCENT }}
                thumbColor={emailNotif ? "#fff" : "#bbb"}
              />
            }
          />
        </Section>

        {/* Payments & Support */}
        <Section title="Payments & Support">
          <Row
            icon={<Feather name="credit-card" size={18} color={ACCENT} />}
            label="Payment methods"
            helper="Cards and wallets"
            right={<Chevron />}
          />
          <Row
            icon={<MaterialCommunityIcons name="cash-multiple" size={20} color={ACCENT} />}
            label="Deposit / Withdraw"
            helper="Manage funds"
            right={<Chevron />}
          />
          <Row
            icon={<Feather name="help-circle" size={18} color={ACCENT} />}
            label="Help Center"
            right={<Chevron />}
          />
          <Row
            icon={<Feather name="file-text" size={18} color={ACCENT} />}
            label="Terms of Service"
            right={<Chevron />}
          />
          <Row
            icon={<Ionicons name="shield-checkmark-outline" size={20} color={ACCENT} />}
            label="Privacy Policy"
            right={<Chevron />}
          />
        </Section>

        {/* Danger zone */}
        <Section title="Danger zone">
          <Row
            icon={<Feather name="trash-2" size={18} color={RED} />}
            label={<Text style={{ color: RED, fontWeight: "800" }}>Delete account</Text>}
            helper="This action cannot be undone"
            right={<Chevron color={RED} />}
          />
        </Section>

        {/* Log out button */}
        <Pressable
          onPress={handleLogout}
          disabled={isAuthLoading}
          style={({ pressed }) => [
            s.logoutBtn,
            (pressed || isAuthLoading) && { opacity: 0.8 },
          ]}
        >
          <Ionicons name="log-out-outline" size={18} color="#fff" />
          <Text style={s.logoutText}>
            {isAuthLoading ? "Logging out..." : "Log out"}
          </Text>
        </Pressable>
      </ScrollView>

      {/* ---------- Edit modal ---------- */}
      <Modal visible={editOpen} animationType="fade" transparent>
        <View style={s.modalOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => !saving && setEditOpen(false)} />
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Edit profile</Text>

            {/* Email (read-only) */}
            <Text style={s.modalLabel}>Email</Text>
            <TextInput
              style={[s.modalInput, { opacity: 0.7 }]}
              value={mEmail}
              editable={false}
              placeholder="Email"
              placeholderTextColor={MUTED}
            />

            {/* Name */}
            <Text style={s.modalLabel}>Name</Text>
            <TextInput
              style={s.modalInput}
              value={mName}
              onChangeText={setMName}
              placeholder="Your name"
              placeholderTextColor={MUTED}
            />

            {/* Username */}
            <Text style={s.modalLabel}>Username</Text>
            <TextInput
              style={s.modalInput}
              value={mUsername}
              onChangeText={setMUsername}
              placeholder="@username"
              placeholderTextColor={MUTED}
              autoCapitalize="none"
            />

            {/* Phone */}
            <Text style={s.modalLabel}>Phone</Text>
            <TextInput
              style={s.modalInput}
              value={mPhone}
              onChangeText={setMPhone}
              placeholder="+57 ..."
              placeholderTextColor={MUTED}
              keyboardType="phone-pad"
            />

            {/* Bio */}
            <Text style={s.modalLabel}>Bio</Text>
            <TextInput
              style={[s.modalInput, { height: 80, textAlignVertical: "top" }]}
              value={mBio}
              onChangeText={setMBio}
              placeholder="Tell something about you"
              placeholderTextColor={MUTED}
              multiline
              numberOfLines={4}
            />

            {!!errorMsg && (
              <Text style={{ color: "#ff6b6b", marginTop: 8, fontSize: 12 }}>
                {errorMsg}
              </Text>
            )}

            <View style={s.modalActions}>
              <Pressable
                onPress={() => !saving && setEditOpen(false)}
                style={({ pressed }) => [s.cancelBtn, pressed && { opacity: 0.9 }]}
                disabled={saving}
              >
                <Text style={s.cancelText}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={saveEdit}
                style={({ pressed }) => [s.saveBtn, (pressed || saving) && { opacity: 0.9 }]}
                disabled={saving}
              >
                {saving ? <ActivityIndicator /> : <Text style={s.saveText}>Save</Text>}
              </Pressable>
            </View>
          </View>
          <Pressable style={{ flex: 1 }} onPress={() => !saving && setEditOpen(false)} />
        </View>
      </Modal>

      {/* ---------- Camera modal (full screen) ---------- */}
      <Modal visible={cameraOpen} animationType="slide" transparent={false}>
        {permission?.granted ? (
          <View style={s.cameraScreen}>
            <CameraView
              ref={(r) => {
                cameraRef.current = r;
              }}
              style={s.camera}
              facing={facing}
            />
            <Pressable style={s.closeBtnTop} onPress={() => setCameraOpen(false)}>
              <Ionicons name="close-outline" size={26} color="#fff" />
            </Pressable>
            <View style={s.cameraActions}>
              <View style={s.actionItem}>
                <Pressable
                  style={s.iconBtn}
                  onPress={async () => {
                    try {
                      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                      if (status !== 'granted') {
                        setErrorMsg('Permission to access gallery was denied');
                        return;
                      }
                      const result = await ImagePicker.launchImageLibraryAsync({
                        mediaTypes: ImagePicker.MediaTypeOptions.Images,
                        quality: 0.9,
                        allowsEditing: true,
                        aspect: [1, 1],
                      });
                      if (result.canceled) return;
                      const asset = result.assets?.[0];
                      if (!asset?.uri) return;
                      setCameraOpen(false);
                      setPhotoUri(asset.uri);
                      const publicUrl = await uploadProfileImage(asset.uri);
                      if (publicUrl) {
                        setPhotoUri(publicUrl);
                        await persistAvatarUrl(publicUrl);
                      }
                    } catch (_e) {}
                  }}
                >
                  <Ionicons name="image-outline" size={22} color="#fff" />
                </Pressable>
                <Text style={s.actionLabel}>Gallery</Text>
              </View>

              <Pressable
                style={s.shutterOuter}
                onPress={async () => {
                  try {
                    const photo = await cameraRef.current?.takePictureAsync();
                    if (photo?.uri) {
                      setCameraOpen(false);
                      setPhotoUri(photo.uri);
                      (async () => {
                        const publicUrl = await uploadProfileImage(photo.uri);
                        if (publicUrl) {
                          setPhotoUri(publicUrl);
                          await persistAvatarUrl(publicUrl);
                        }
                      })();
                    }
                  } catch (_e) {}
                }}
              >
                <View style={s.shutterInner} />
              </Pressable>

              <View style={s.actionItem}>
                <Pressable
                  style={s.iconBtn}
                  onPress={() => setFacing((prev) => (prev === 'back' ? 'front' : 'back'))}
                >
                  <Ionicons name="camera-reverse-outline" size={22} color="#fff" />
                </Pressable>
                <Text style={s.actionLabel}>Flip</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={[s.cameraScreen, { alignItems: "center", justifyContent: "center" }]}>
            <Text style={{ color: TEXT, marginBottom: 12 }}>Camera permission is required</Text>
            <Pressable style={s.saveBtn} onPress={requestPermission}>
              <Text style={s.saveText}>Grant permission</Text>
            </Pressable>
          </View>
        )}
      </Modal>
    </View>
  );
}

/* ---------- UI helpers ---------- */
function Section({ title, children }: React.PropsWithChildren<{ title: string }>) {
  return (
    <View style={{ marginTop: 18 }}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.sectionCard}>{children}</View>
    </View>
  );
}

function Chevron({ color = MUTED }: { color?: string }) {
  return <Ionicons name="chevron-forward" size={18} color={color} />;
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[s.badge, { borderColor: color }]}>
      <Text style={[s.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

function Row({
  icon,
  label,
  helper,
  right,
}: {
  icon?: React.ReactNode;
  label: React.ReactNode;
  helper?: string;
  right?: React.ReactNode;
}) {
  return (
    <Pressable style={({ pressed }) => [s.row, pressed && s.rowPressed]}>
      {icon ? <View style={s.rowIcon}>{icon}</View> : null}
      <View style={{ flex: 1 }}>
        {typeof label === "string" ? <Text style={s.rowLabel}>{label}</Text> : label}
        {!!helper && <Text style={s.rowHelper}>{helper}</Text>}
      </View>
      {right}
    </Pressable>
  );
}

/* ---------- Styles ---------- */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  cardRow: {
    flexDirection: "row",
    backgroundColor: BG_MID,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
  },
  avatarWrap: { alignItems: "center", marginRight: 12, position: "relative" },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  cameraBtn: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: ACCENT,
    borderWidth: 2,
    borderColor: BG_MID,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 2,
  },
  name: { color: TEXT, fontSize: 18, fontWeight: "800" },
  sub: { color: MUTED, marginTop: 4 },
  money: { color: TEXT, fontSize: 20, fontWeight: "900", marginTop: 2 },

  sectionTitle: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 8,
    marginTop: 8,
    paddingHorizontal: 2,
  },
  sectionCard: {
    backgroundColor: BG_MID,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    overflow: "hidden",
  },

  row: {
    minHeight: 56,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  rowPressed: { backgroundColor: "#17202B" },
  rowIcon: {
    width: 28,
    alignItems: "center",
    marginRight: 10,
  },
  rowLabel: { color: TEXT, fontSize: 15, fontWeight: "700" },
  rowHelper: { color: MUTED, marginTop: 2, fontSize: 12 },

  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeText: { fontSize: 11, fontWeight: "800" },

  ghostBtn: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  ghostText: { color: TEXT, fontWeight: "800", marginTop: -1 },
  pressed: { opacity: 0.8 },

  logoutBtn: {
    marginTop: 20,
    height: 52,
    borderRadius: 14,
    backgroundColor: RED,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  logoutText: { color: "#fff", fontWeight: "900", fontSize: 15 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 18,
  },
  modalCard: {
    backgroundColor: BG_MID,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    padding: 14,
  },
  modalTitle: {
    color: TEXT,
    fontWeight: "900",
    fontSize: 16,
    marginBottom: 10,
    textAlign: "center",
  },
  modalLabel: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 10,
    marginBottom: 6,
  },
  modalInput: {
    height: 46,
    borderRadius: 12,
    backgroundColor: "#1C2230",
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
    color: TEXT,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 14,
  },
  cancelBtn: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BG_MID,
  },
  cancelText: { color: TEXT, fontWeight: "800" },
  saveBtn: {
    height: 46,
    borderRadius: 12,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ACCENT,
  },
  saveText: { color: "#fff", fontWeight: "900" },

  // Camera
  cameraScreen: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  closeBtnTop: {
    position: "absolute",
    top: 18,
    right: 18,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraActions: {
    position: "absolute",
    bottom: 14,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },
  actionItem: { alignItems: "center", gap: 6 },
  actionLabel: { color: "#fff", fontSize: 12 },
  iconBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },
  shutterOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
  },
  shutterInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#fff",
  },
  flipBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },
});
