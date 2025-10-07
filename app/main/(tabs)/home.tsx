// app/main/(tabs)/home.tsx
import { AuthContext } from "@/contexts/AuthContext";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useContext, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Modal,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    View
} from "react-native";
import { supabase } from "../../../utils/supabase";

const ACCENT = "#6C8DFF";
const BG = "#12151C";
const BG_MID = "#1C2230";
const TEXT = "#E6EAF2";
const MUTED = "#8A93A6";
const BORDER = "#2A3242";
const GREEN = "#38D39F";
const RED = "#FF6B6B";

type Bet = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  opens_at: string;
  closes_at: string;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  bet_options: Array<{
    id: string;
    label: string;
    odds_decimal: number;
    is_active: boolean;
  }>;
};

type Profile = {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  points: number | null;
};

type BetOption = {
  id: string;
  label: string;
  odds_decimal: number;
  is_active: boolean;
};

export default function HomeScreen() {
  const { user } = useContext(AuthContext);
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  
  // Modal states
  const [viewBetModalOpen, setViewBetModalOpen] = useState(false);
  const [wagerModalOpen, setWagerModalOpen] = useState(false);
  const [selectedBet, setSelectedBet] = useState<Bet | null>(null);
  const [selectedOption, setSelectedOption] = useState<BetOption | null>(null);
  const [stakeAmount, setStakeAmount] = useState("");
  const [placingWager, setPlacingWager] = useState(false);

  useEffect(() => {
    loadProfile();
    loadBets();
  }, [user?.id]);

  // Reload bets when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadBets();
    }, [])
  );

  const loadProfile = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email, role, points")
        .eq("id", user.id)
        .single();

      if (data && !error) {
        setProfile(data);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  };

  const loadBets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("bets")
        .select(`
          *,
          bet_options(*)
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading bets:", error);
        return;
      }

      setBets(data || []);
    } catch (error) {
      console.error("Error loading bets:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OPEN":
        return GREEN;
      case "CLOSED":
        return MUTED;
      case "RESOLVED":
        return ACCENT;
      default:
        return MUTED;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "OPEN":
        return "Abierta";
      case "CLOSED":
        return "Cerrada";
      case "RESOLVED":
        return "Resuelta";
      default:
        return status;
    }
  };

  // Modal functions
  const openViewBetModal = (bet: Bet) => {
    setSelectedBet(bet);
    setViewBetModalOpen(true);
  };

  const openWagerModal = (bet: Bet) => {
    setSelectedBet(bet);
    setWagerModalOpen(true);
  };

  const placeWager = async () => {
    if (!user?.id || !selectedOption || !stakeAmount || !profile || !selectedBet) {
      Alert.alert("Error", "Faltan datos requeridos para realizar la apuesta");
      return;
    }

    // Ensure user has a profile record
    if (!profile.id) {
      Alert.alert("Error", "Perfil de usuario no encontrado. Por favor, inicia sesión nuevamente.");
      return;
    }

    const stake = parseFloat(stakeAmount);
    if (isNaN(stake) || stake <= 0) {
      Alert.alert("Error", "Por favor ingresa una cantidad válida");
      return;
    }

    const currentPoints = profile.points || 0;
    if (stake > currentPoints) {
      Alert.alert("Error", `No tienes suficientes puntos. Disponibles: ${currentPoints} pts`);
      return;
    }

    setPlacingWager(true);
    try {
      const potentialPayout = stake * selectedOption.odds_decimal;

      console.log("🔍 Creating wager with data:", {
        user_id: user.id,
        bet_id: selectedBet.id,
        option_id: selectedOption.id,
        stake: stake,
        locked_odds: selectedOption.odds_decimal,
        potential_payout: potentialPayout,
        status: 'PENDING'
      });

      const { data: wagerData, error: wagerError } = await supabase
        .from("wagers")
        .insert({
          user_id: user.id,
          bet_id: selectedBet.id,
          option_id: selectedOption.id,
          stake: stake,
          locked_odds: selectedOption.odds_decimal,
          status: 'PENDING',
        })
        .select("id")
        .single();

      if (wagerError) {
        console.error("Error creating wager:", wagerError);
        Alert.alert("Error", "Error al apostar: " + wagerError.message);
        return;
      }

      console.log("✅ Wager created successfully:", wagerData);

      // Update potential_payout after insertion
      const { error: payoutError } = await supabase
        .from("wagers")
        .update({ potential_payout: potentialPayout })
        .eq("id", wagerData.id);

      if (payoutError) {
        console.error("Error updating potential_payout:", payoutError);
      }

      // Update user points
      const newPoints = currentPoints - stake;
      const { error: pointsError } = await supabase
        .from("profiles")
        .update({ points: newPoints })
        .eq("id", user.id);

      if (pointsError) {
        console.error("Error updating points:", pointsError);
        Alert.alert("Advertencia", "Apuesta realizada pero error al actualizar puntos");
      }

      Alert.alert("Éxito", "✅ Apuesta realizada exitosamente!");
      setWagerModalOpen(false);
      setStakeAmount("");
      setSelectedOption(null);
      loadProfile(); // Refresh profile points
      loadBets(); // Refresh bets with updated odds
      
    } catch (error: any) {
      console.error("Exception placing wager:", error);
      Alert.alert("Error", "Error al realizar la apuesta: " + (error?.message || "Error desconocido"));
    } finally {
      setPlacingWager(false);
    }
  };

  const renderBet = ({ item }: { item: Bet }) => {
    // Priority: bet image from storage > profile avatar
    const displayImage = item.image_url || profile?.avatar_url;
    
    return (
      <View style={styles.betCard}>
        {displayImage && (
          <Image 
            source={{ uri: displayImage }} 
            style={styles.betImage}
            resizeMode="cover"
          />
        )}
      
      <View style={styles.betContent}>
        <View style={styles.betHeader}>
          <Text style={styles.betTitle}>{item.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
        </View>

        <Text style={styles.matchText}>{item.title}</Text>
        
        {item.bet_options && item.bet_options.length >= 2 && (
          <View style={styles.optionsContainer}>
            <View style={styles.optionRow}>
              <Text style={styles.optionLabel}>{item.bet_options[0]?.label}</Text>
              <Text style={styles.oddsText}>{item.bet_options[0]?.odds_decimal}x</Text>
            </View>
            <View style={styles.optionRow}>
              <Text style={styles.optionLabel}>Empate</Text>
              <Text style={styles.oddsText}>{item.bet_options[2]?.odds_decimal}x</Text>
            </View>
            <View style={styles.optionRow}>
              <Text style={styles.optionLabel}>{item.bet_options[1]?.label}</Text>
              <Text style={styles.oddsText}>{item.bet_options[1]?.odds_decimal}x</Text>
            </View>
          </View>
        )}
        
        {item.description && (
          <Text style={styles.descriptionText}>{item.description}</Text>
        )}

        <View style={styles.betInfo}>
          <View style={styles.infoRow}>
            <Feather name="calendar" size={14} color={MUTED} />
            <Text style={styles.infoText}>Cierra: {formatDate(item.closes_at)}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Feather name="clock" size={14} color={MUTED} />
            <Text style={styles.infoText}>Creada: {formatDate(item.created_at)}</Text>
          </View>
        </View>

        <View style={styles.betActions}>
          {profile?.role === "ADMIN" && (
            <Pressable 
              style={styles.adminBtn}
              onPress={() => openViewBetModal(item)}
            >
              <Feather name="eye" size={16} color={ACCENT} />
              <Text style={styles.adminBtnText}>Ver Apuesta</Text>
            </Pressable>
          )}
          
          {item.status === "OPEN" && (
            <Pressable 
              style={styles.betBtn}
              onPress={() => openWagerModal(item)}
            >
              <Feather name="plus" size={16} color="#fff" />
              <Text style={styles.betBtnText}>Apostar</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <Text style={styles.title}>Apuestas Disponibles</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={styles.loadingText}>Cargando apuestas...</Text>
        </View>
      ) : bets.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather name="trophy" size={48} color={MUTED} />
          <Text style={styles.emptyTitle}>No hay apuestas</Text>
          <Text style={styles.emptyText}>
            {profile?.role === "ADMIN" 
              ? "Crea tu primera apuesta desde el perfil"
              : "Espera a que se publiquen nuevas apuestas"
            }
          </Text>
        </View>
      ) : (
        <FlatList
          data={bets}
          keyExtractor={(item) => item.id}
          renderItem={renderBet}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ---------- View Bet Modal (Admin) ---------- */}
      <Modal visible={viewBetModalOpen} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => setViewBetModalOpen(false)} />
          <View style={[styles.modalCard, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalles de la Apuesta</Text>
              <Pressable onPress={() => setViewBetModalOpen(false)}>
                <Feather name="x" size={24} color={MUTED} />
              </Pressable>
            </View>

            {selectedBet && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.betDetailCard}>
                  {(selectedBet.image_url || profile?.avatar_url) && (
                    <Image 
                      source={{ uri: selectedBet.image_url || profile?.avatar_url }} 
                      style={{ width: '100%', height: 200, borderRadius: 8, marginBottom: 16 }}
                      resizeMode="cover"
                    />
                  )}
                  <Text style={styles.betDetailTitle}>{selectedBet.title}</Text>
                  
                  {selectedBet.description && (
                    <Text style={styles.betDetailDescription}>{selectedBet.description}</Text>
                  )}

                  <View style={styles.betDetailInfo}>
                    <View style={styles.infoRow}>
                      <Feather name="calendar" size={16} color={MUTED} />
                      <Text style={styles.infoText}>Cierra: {formatDate(selectedBet.closes_at)}</Text>
                    </View>
                    
                    <View style={styles.infoRow}>
                      <Feather name="clock" size={16} color={MUTED} />
                      <Text style={styles.infoText}>Creada: {formatDate(selectedBet.created_at)}</Text>
                    </View>

                    <View style={styles.infoRow}>
                      <Feather name="flag" size={16} color={MUTED} />
                      <Text style={styles.infoText}>Estado: {getStatusText(selectedBet.status)}</Text>
                    </View>
                  </View>

                  {selectedBet.bet_options && selectedBet.bet_options.length >= 2 && (
                    <View style={styles.optionsContainer}>
                      <Text style={styles.optionsTitle}>Opciones de Apuesta</Text>
                      {selectedBet.bet_options.map((option, index) => (
                        <View key={option.id} style={styles.optionRow}>
                          <Text style={styles.optionLabel}>{option.label}</Text>
                          <Text style={styles.oddsText}>{option.odds_decimal.toFixed(2)}x</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
          <Pressable style={{ flex: 1 }} onPress={() => setViewBetModalOpen(false)} />
        </View>
      </Modal>

      {/* ---------- Wager Modal ---------- */}
      <Modal visible={wagerModalOpen} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => !placingWager && setWagerModalOpen(false)} />
          <View style={[styles.modalCard, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Realizar Apuesta</Text>
              <Pressable onPress={() => !placingWager && setWagerModalOpen(false)}>
                <Feather name="x" size={24} color={MUTED} />
              </Pressable>
            </View>

            {selectedBet && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.betDetailCard}>
                  {(selectedBet.image_url || profile?.avatar_url) && (
                    <Image 
                      source={{ uri: selectedBet.image_url || profile?.avatar_url }} 
                      style={{ width: '100%', height: 200, borderRadius: 8, marginBottom: 16 }}
                      resizeMode="cover"
                    />
                  )}
                  <Text style={styles.betDetailTitle}>{selectedBet.title}</Text>
                  
                  <View style={styles.userPointsContainer}>
                    <Text style={styles.userPointsText}>
                      Saldo disponible: {profile?.points || 0} pts
                    </Text>
                    {(!profile?.points || profile.points === 0) && (
                      <Text style={styles.noPointsText}>
                        ⚠️ No tienes puntos. Contacta a un administrador.
                      </Text>
                    )}
                  </View>

                  <Text style={styles.sectionTitle}>Selecciona tu apuesta:</Text>
                  
                  {selectedBet.bet_options && selectedBet.bet_options.map((option) => (
                    <Pressable
                      key={option.id}
                      style={[
                        styles.optionCard,
                        selectedOption?.id === option.id && styles.selectedOptionCard
                      ]}
                      onPress={() => setSelectedOption(option)}
                    >
                      <Text style={styles.optionCardLabel}>{option.label}</Text>
                      <Text style={styles.optionCardOdds}>{option.odds_decimal.toFixed(2)}x</Text>
                    </Pressable>
                  ))}

                  {selectedOption && (
                    <View style={styles.stakeContainer}>
                      <Text style={styles.stakeLabel}>Cantidad a apostar:</Text>
                      <TextInput
                        style={styles.stakeInput}
                        value={stakeAmount}
                        onChangeText={setStakeAmount}
                        placeholder="0"
                        placeholderTextColor={MUTED}
                        keyboardType="numeric"
                      />
                      
                      {stakeAmount && !isNaN(parseFloat(stakeAmount)) && parseFloat(stakeAmount) > 0 && (
                        <View style={styles.payoutContainer}>
                          <Text style={styles.payoutText}>
                            Ganancia potencial: {(parseFloat(stakeAmount) * selectedOption.odds_decimal).toFixed(2)} pts
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  <View style={styles.modalActions}>
                    <Pressable
                      onPress={() => !placingWager && setWagerModalOpen(false)}
                      style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.9 }]}
                      disabled={placingWager}
                    >
                      <Text style={styles.cancelText}>Cancelar</Text>
                    </Pressable>

                    <Pressable
                      onPress={placeWager}
                      style={({ pressed }) => [styles.saveBtn, (pressed || placingWager) && { opacity: 0.9 }]}
                      disabled={placingWager || !selectedOption || !stakeAmount}
                    >
                      {placingWager ? <ActivityIndicator /> : <Text style={styles.saveText}>Apostar</Text>}
                    </Pressable>
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
          <Pressable style={{ flex: 1 }} onPress={() => !placingWager && setWagerModalOpen(false)} />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    color: TEXT,
    fontSize: 22,
    fontWeight: "800",
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ACCENT,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  createBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    color: MUTED,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  emptyTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: "700",
  },
  emptyText: {
    color: MUTED,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  betCard: {
    backgroundColor: BG_MID,
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: BORDER,
  },
  betImage: {
    width: "100%",
    height: 160,
  },
  betContent: {
    padding: 16,
  },
  betHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  betTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "800",
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  matchText: {
    color: ACCENT,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  descriptionText: {
    color: MUTED,
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 12,
  },
  betInfo: {
    gap: 6,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoText: {
    color: MUTED,
    fontSize: 12,
  },
  betActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  adminBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 12,
    gap: 6,
  },
  adminBtnText: {
    color: ACCENT,
    fontSize: 14,
    fontWeight: "700",
  },
  betBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 12,
    gap: 6,
  },
  betBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  optionsContainer: {
    backgroundColor: BG,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  optionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  optionLabel: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "600",
  },
  oddsText: {
    color: ACCENT,
    fontSize: 14,
    fontWeight: "700",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    backgroundColor: BG_MID,
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: BORDER,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 20,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: {
    color: TEXT,
    fontSize: 14,
    fontWeight: '700',
  },
  saveBtn: {
    flex: 1,
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  // Bet detail styles
  betDetailCard: {
    backgroundColor: BG,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  betDetailTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  betDetailDescription: {
    color: MUTED,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  betDetailInfo: {
    gap: 8,
    marginBottom: 16,
  },
  optionsTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  // Wager modal styles
  userPointsContainer: {
    backgroundColor: BG,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: ACCENT,
  },
  userPointsText: {
    color: ACCENT,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  sectionTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  optionCard: {
    backgroundColor: BG,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedOptionCard: {
    borderColor: ACCENT,
    backgroundColor: BG_MID,
  },
  optionCardLabel: {
    color: TEXT,
    fontSize: 14,
    fontWeight: '600',
  },
  optionCardOdds: {
    color: ACCENT,
    fontSize: 14,
    fontWeight: '700',
  },
  stakeContainer: {
    marginTop: 16,
  },
  stakeLabel: {
    color: TEXT,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  stakeInput: {
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    padding: 12,
    color: TEXT,
    fontSize: 16,
  },
  payoutContainer: {
    backgroundColor: BG,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: GREEN,
  },
  payoutText: {
    color: GREEN,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  noPointsText: {
    color: '#FF6B6B',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
});
