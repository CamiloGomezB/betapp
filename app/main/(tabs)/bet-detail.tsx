// app/main/(tabs)/bet-detail.tsx
import { AuthContext } from "@/contexts/AuthContext";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useContext, useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
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
  opens_at: string;
  closes_at: string;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type Wager = {
  id: string;
  user_id: string;
  bet_id: string;
  option_id: string;
  stake: number;
  locked_odds: number;
  potential_payout: number;
  status: string;
  created_at: string;
  profile: {
    name: string | null;
    email: string | null;
  };
};

type BetOption = {
  id: string;
  bet_id: string;
  label: string;
  odds_decimal: number;
  is_active: boolean;
};

type Profile = {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  points: number | null;
};

export default function BetDetailScreen() {
  const { user } = useContext(AuthContext);
  const { betId } = useLocalSearchParams<{ betId: string }>();
  
  const [bet, setBet] = useState<Bet | null>(null);
  const [options, setOptions] = useState<BetOption[]>([]);
  const [wagers, setWagers] = useState<Wager[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [wagerModalOpen, setWagerModalOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<BetOption | null>(null);
  const [stakeAmount, setStakeAmount] = useState("");
  const [placingWager, setPlacingWager] = useState(false);
  const [showWagers, setShowWagers] = useState(false);

  useEffect(() => {
    if (betId) {
      loadBet();
      loadProfile();
    }
  }, [betId, user?.id]);

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

  const loadBet = async () => {
    if (!betId) return;
    
    try {
      setLoading(true);
      
      // Load bet details
      const { data: betData, error: betError } = await supabase
        .from("bets")
        .select("*")
        .eq("id", betId)
        .single();

      if (betError) {
        console.error("Error loading bet:", betError);
        return;
      }

      setBet(betData);

      // Load bet options
      const { data: optionsData, error: optionsError } = await supabase
        .from("bet_options")
        .select("*")
        .eq("bet_id", betId)
        .eq("is_active", true);

      if (optionsError) {
        console.error("Error loading options:", optionsError);
      } else {
        setOptions(optionsData || []);
      }

      // Load wagers if user is admin
      if (profile?.role === "ADMIN") {
        const { data: wagersData, error: wagersError } = await supabase
          .from("wagers")
          .select(`
            *,
            profile:profiles(name, email)
          `)
          .eq("bet_id", betId);

        if (wagersError) {
          console.error("Error loading wagers:", wagersError);
        } else {
          setWagers(wagersData || []);
        }
      }

    } catch (error) {
      console.error("Error loading bet:", error);
    } finally {
      setLoading(false);
    }
  };

  // Function to calculate dynamic odds based on wagers
  const calculateDynamicOdds = async (betId: string) => {
    try {
      // Get all wagers for this bet
      const { data: wagers, error } = await supabase
        .from("wagers")
        .select("option_id, stake")
        .eq("bet_id", betId);

      if (error || !wagers) return null;

      // Calculate total stakes per option
      const stakesByOption: { [key: string]: number } = {};
      let totalStakes = 0;

      wagers.forEach(wager => {
        const optionId = wager.option_id;
        stakesByOption[optionId] = (stakesByOption[optionId] || 0) + wager.stake;
        totalStakes += wager.stake;
      });

      // If no wagers, return equal odds
      if (totalStakes === 0) {
        return { team1: 3.0, team2: 3.0, draw: 3.0 };
      }

      // Get bet options to map stakes to odds
      const { data: options, error: optionsError } = await supabase
        .from("bet_options")
        .select("id")
        .eq("bet_id", betId)
        .eq("is_active", true)
        .order("created_at");

      if (optionsError || !options || options.length < 3) return null;

      // Calculate odds: total_stakes / option_stakes (with minimum odds of 1.1)
      const team1Stakes = stakesByOption[options[0].id] || 0;
      const team2Stakes = stakesByOption[options[1].id] || 0;
      const drawStakes = stakesByOption[options[2].id] || 0;

      const team1Odds = team1Stakes > 0 ? Math.max(1.1, totalStakes / team1Stakes) : 3.0;
      const team2Odds = team2Stakes > 0 ? Math.max(1.1, totalStakes / team2Stakes) : 3.0;
      const drawOdds = drawStakes > 0 ? Math.max(1.1, totalStakes / drawStakes) : 3.0;

      return { team1: team1Odds, team2: team2Odds, draw: drawOdds };
    } catch (error) {
      console.error("Error calculating dynamic odds:", error);
      return null;
    }
  };

  const placeWager = async () => {
    if (!user?.id || !selectedOption || !stakeAmount || !profile) return;

    const stake = parseFloat(stakeAmount);
    if (isNaN(stake) || stake <= 0) {
      alert("Por favor ingresa una cantidad válida");
      return;
    }

    if (profile.points && stake > profile.points) {
      alert("No tienes suficientes puntos");
      return;
    }

    setPlacingWager(true);
    try {
      const potentialPayout = stake * selectedOption.odds_decimal;

      const { data, error } = await supabase
        .from("wagers")
        .insert({
          user_id: user.id,
          bet_id: betId,
          option_id: selectedOption.id,
          stake: stake,
          locked_odds: selectedOption.odds_decimal,
          potential_payout: potentialPayout,
          status: 'PENDING',
        })
        .select("id");

      if (error) {
        console.error("Error placing wager:", error);
        alert("Error al apostar: " + error.message);
        return;
      }

      // Calculate new odds after this wager
      const newOdds = await calculateDynamicOdds(betId);
      
      if (newOdds) {
        // Update odds in bet_options
        const { data: options, error: optionsError } = await supabase
          .from("bet_options")
          .select("id")
          .eq("bet_id", betId)
          .eq("is_active", true)
          .order("created_at");

        if (!optionsError && options && options.length >= 3) {
          // Update Team 1 odds
          await supabase
            .from("bet_options")
            .update({ odds_decimal: newOdds.team1 })
            .eq("id", options[0].id);

          // Update Team 2 odds
          await supabase
            .from("bet_options")
            .update({ odds_decimal: newOdds.team2 })
            .eq("id", options[1].id);

          // Update Draw odds
          await supabase
            .from("bet_options")
            .update({ odds_decimal: newOdds.draw })
            .eq("id", options[2].id);
        }
      }

      // Update user points
      const newPoints = (profile.points || 0) - stake;
      await supabase
        .from("profiles")
        .update({ points: newPoints })
        .eq("id", user.id);

      alert("✅ Apuesta realizada exitosamente!");
      setWagerModalOpen(false);
      setStakeAmount("");
      setSelectedOption(null);
      loadProfile(); // Refresh profile points
      loadBet(); // Refresh bet with updated odds
      
    } catch (error) {
      console.error("Error placing wager:", error);
      alert("Error al apostar");
    } finally {
      setPlacingWager(false);
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

  const renderOption = ({ item }: { item: BetOption }) => (
    <Pressable
      style={[
        styles.optionCard,
        selectedOption?.id === item.id && styles.selectedOption
      ]}
      onPress={() => setSelectedOption(item)}
    >
      <Text style={styles.optionLabel}>{item.label}</Text>
      <Text style={styles.optionOdds}>{item.odds_decimal.toFixed(2)}x</Text>
    </Pressable>
  );

  const renderWager = ({ item }: { item: Wager }) => (
    <View style={styles.wagerCard}>
      <View style={styles.wagerInfo}>
        <Text style={styles.wagerUser}>{item.profile.name || "Usuario"}</Text>
        <Text style={styles.wagerEmail}>{item.profile.email}</Text>
      </View>
      <View style={styles.wagerDetails}>
        <Text style={styles.wagerStake}>{item.stake} puntos</Text>
        <Text style={styles.wagerOdds}>{item.locked_odds.toFixed(2)}x</Text>
        <Text style={styles.wagerPayout}>{item.potential_payout.toFixed(2)} pts</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={styles.loadingText}>Cargando apuesta...</Text>
        </View>
      </View>
    );
  }

  if (!bet) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Apuesta no encontrada</Text>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Volver</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={TEXT} />
        </Pressable>
        <Text style={styles.headerTitle}>Detalle de Apuesta</Text>
        {profile?.role === "ADMIN" && (
          <Pressable onPress={() => setShowWagers(!showWagers)}>
            <Feather name="users" size={24} color={ACCENT} />
          </Pressable>
        )}
      </View>

      <View style={styles.betCard}>
        <View style={styles.betContent}>
          <Text style={styles.betTitle}>{bet.title}</Text>
          
          {bet.description && (
            <Text style={styles.descriptionText}>{bet.description}</Text>
          )}

          <View style={styles.betInfo}>
            <View style={styles.infoRow}>
              <Feather name="calendar" size={14} color={MUTED} />
              <Text style={styles.infoText}>Cierra: {formatDate(bet.closes_at)}</Text>
            </View>
          </View>
        </View>
      </View>

      {showWagers && profile?.role === "ADMIN" && (
        <View style={styles.wagersSection}>
          <Text style={styles.sectionTitle}>Usuarios que han apostado ({wagers.length})</Text>
          {wagers.length === 0 ? (
            <Text style={styles.noWagersText}>Nadie ha apostado aún</Text>
          ) : (
            <FlatList
              data={wagers}
              keyExtractor={(item) => item.id}
              renderItem={renderWager}
              style={styles.wagersList}
            />
          )}
        </View>
      )}

        {bet.status === "OPEN" && (
        <View style={styles.optionsSection}>
          <Text style={styles.sectionTitle}>Opciones de Apuesta</Text>
          <FlatList
            data={options}
            keyExtractor={(item) => item.id}
            renderItem={renderOption}
            style={styles.optionsList}
          />
          
          {selectedOption && (
            <View style={styles.wagerForm}>
              <Text style={styles.formLabel}>Cantidad a apostar</Text>
              <TextInput
                style={styles.stakeInput}
                value={stakeAmount}
                onChangeText={setStakeAmount}
                placeholder="Ingresa la cantidad"
                placeholderTextColor={MUTED}
                keyboardType="numeric"
              />
              <Text style={styles.pointsText}>
                Puntos disponibles: {profile?.points || 0}
              </Text>
              
              {selectedOption && stakeAmount && (
                <Text style={styles.payoutText}>
                  Ganancia potencial: {(parseFloat(stakeAmount) * selectedOption.odds_decimal).toFixed(2)} puntos
                </Text>
              )}
              
              <Pressable
                style={styles.placeBtn}
                onPress={placeWager}
                disabled={placingWager || !stakeAmount}
              >
                {placingWager ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.placeBtnText}>Apostar</Text>
                )}
              </Pressable>
            </View>
          )}
        </View>
      )}

      {bet.status !== "open" && (
        <View style={styles.closedSection}>
          <Feather name="lock" size={48} color={MUTED} />
          <Text style={styles.closedText}>Esta apuesta está cerrada</Text>
        </View>
      )}
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
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: {
    color: TEXT,
    fontSize: 18,
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
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  errorText: {
    color: TEXT,
    fontSize: 18,
    fontWeight: "700",
  },
  backBtn: {
    backgroundColor: ACCENT,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  betCard: {
    backgroundColor: BG_MID,
    borderRadius: 16,
    margin: 16,
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
  betTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
  },
  matchText: {
    color: ACCENT,
    fontSize: 16,
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
  wagersSection: {
    margin: 16,
    backgroundColor: BG_MID,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  sectionTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  noWagersText: {
    color: MUTED,
    fontSize: 14,
    textAlign: "center",
    padding: 20,
  },
  wagersList: {
    maxHeight: 200,
  },
  wagerCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  wagerInfo: {
    flex: 1,
  },
  wagerUser: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "700",
  },
  wagerEmail: {
    color: MUTED,
    fontSize: 12,
  },
  wagerDetails: {
    alignItems: "flex-end",
  },
  wagerStake: {
    color: ACCENT,
    fontSize: 14,
    fontWeight: "700",
  },
  wagerOdds: {
    color: MUTED,
    fontSize: 12,
  },
  wagerPayout: {
    color: GREEN,
    fontSize: 12,
    fontWeight: "700",
  },
  optionsSection: {
    margin: 16,
  },
  optionsList: {
    marginBottom: 16,
  },
  optionCard: {
    backgroundColor: BG_MID,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectedOption: {
    borderColor: ACCENT,
    backgroundColor: `${ACCENT}20`,
  },
  optionLabel: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "700",
  },
  optionOdds: {
    color: ACCENT,
    fontSize: 18,
    fontWeight: "800",
  },
  wagerForm: {
    backgroundColor: BG_MID,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  formLabel: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  stakeInput: {
    backgroundColor: BG,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: TEXT,
    fontSize: 16,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 8,
  },
  pointsText: {
    color: MUTED,
    fontSize: 12,
    marginBottom: 8,
  },
  payoutText: {
    color: GREEN,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 16,
  },
  placeBtn: {
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  placeBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  closedSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  closedText: {
    color: MUTED,
    fontSize: 16,
    fontWeight: "700",
  },
});
