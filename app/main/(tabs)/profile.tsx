// app/main/(tabs)/profile.tsx
import { AuthContext } from "@/contexts/AuthContext";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
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
  points: number | null;
  role: string | null;
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
    points: null,
    role: null,
  });
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // wallet modal state
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [amountToAdd, setAmountToAdd] = useState("");

  // admin bet creation state
  const [betModalOpen, setBetModalOpen] = useState(false);
  const [betTitle, setBetTitle] = useState("");
  const [betDescription, setBetDescription] = useState("");
  const [betTeam1, setBetTeam1] = useState("");
  const [betTeam2, setBetTeam2] = useState("");
  const [betOpensAt, setBetOpensAt] = useState("");
  const [betClosesAt, setBetClosesAt] = useState("");
  const [betOddsTeam1, setBetOddsTeam1] = useState("");
  const [betOddsTeam2, setBetOddsTeam2] = useState("");
  const [betOddsDraw, setBetOddsDraw] = useState("");
  const [creatingBet, setCreatingBet] = useState(false);
  const [betImage, setBetImage] = useState<string | null>(null);
  const [showBetImagePicker, setShowBetImagePicker] = useState(false);
  
  // Admin view modals state
  const [viewBetsModalOpen, setViewBetsModalOpen] = useState(false);
  const [viewUsersModalOpen, setViewUsersModalOpen] = useState(false);
  const [allBets, setAllBets] = useState<any[]>([]);
  const [allWagers, setAllWagers] = useState<any[]>([]);
  const [loadingBets, setLoadingBets] = useState(false);
  const [loadingWagers, setLoadingWagers] = useState(false);
  
  // Edit bet modal state
  const [editBetModalOpen, setEditBetModalOpen] = useState(false);
  const [editingBet, setEditingBet] = useState<any>(null);
  const [editBetTitle, setEditBetTitle] = useState("");
  const [editBetTeam1, setEditBetTeam1] = useState("");
  const [editBetTeam2, setEditBetTeam2] = useState("");
  const [editBetDescription, setEditBetDescription] = useState("");
  const [editBetClosesAt, setEditBetClosesAt] = useState("");
  const [editBetOddsTeam1, setEditBetOddsTeam1] = useState("");
  const [editBetOddsTeam2, setEditBetOddsTeam2] = useState("");
  const [editBetOddsDraw, setEditBetOddsDraw] = useState("");
  const [updatingBet, setUpdatingBet] = useState(false);
  
  // Finalize and delete bet modal states
  const [finalizeBetModalOpen, setFinalizeBetModalOpen] = useState(false);
  const [finalizingBet, setFinalizingBet] = useState<any>(null);
  const [selectedWinningOption, setSelectedWinningOption] = useState<string>("");
  const [finalizing, setFinalizing] = useState(false);
  const [deleteBetModalOpen, setDeleteBetModalOpen] = useState(false);
  const [deletingBet, setDeletingBet] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Date picker states
  const [showOpensDatePicker, setShowOpensDatePicker] = useState(false);
  const [showOpensTimePicker, setShowOpensTimePicker] = useState(false);
  const [showClosesDatePicker, setShowClosesDatePicker] = useState(false);
  const [showClosesTimePicker, setShowClosesTimePicker] = useState(false);
  const [opensDate, setOpensDate] = useState(new Date());
  const [opensTime, setOpensTime] = useState(new Date());
  const [closesDate, setClosesDate] = useState(new Date());
  const [closesTime, setClosesTime] = useState(new Date());

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

  const uploadBetImage = useCallback(async (localUri: string, betId: string) => {
    if (!user?.id || !betId) return null;
    try {
      const response = await fetch(localUri);
      const buffer = await response.arrayBuffer();
      const fileName = `bet-images/${betId}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("BetImages")
        .upload(fileName, buffer, { contentType: "image/jpeg", upsert: true });
      if (uploadError) {
        console.warn("Bet image upload error:", uploadError.message);
        return null;
      }
      const { data } = supabase.storage.from("BetImages").getPublicUrl(fileName);
      return data.publicUrl ?? null;
    } catch (_e) {
      console.warn("Bet image upload exception:", _e);
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

  // Admin bet creation functions
  const createBet = useCallback(async () => {
    console.log("🔍 Validating bet creation:", {
      userId: user?.id,
      title: betTitle,
      team1: betTeam1,
      team2: betTeam2,
      closesAt: betClosesAt
    });

    if (!user?.id || !betTitle || !betTeam1 || !betTeam2 || !betClosesAt) {
      const missingFields = [];
      if (!user?.id) missingFields.push("user ID");
      if (!betTitle) missingFields.push("título");
      if (!betTeam1) missingFields.push("equipo 1");
      if (!betTeam2) missingFields.push("equipo 2");
      if (!betClosesAt) missingFields.push("fecha de cierre");
      
      setErrorMsg(`Por favor completa: ${missingFields.join(", ")}`);
      return;
    }

    // Calculate initial odds based on equal probability (33.33% each)
    const initialOdds = 3.0; // 1 / 0.333 = 3.0

    // Validate dates
    const opensAt = betOpensAt ? new Date(betOpensAt.replace(' ', 'T') + ':00.000Z') : new Date();
    const closesAt = new Date(betClosesAt.replace(' ', 'T') + ':00.000Z');
    const now = new Date();
    
    // Check if dates are valid
    if (isNaN(opensAt.getTime()) || isNaN(closesAt.getTime())) {
      setErrorMsg("Las fechas seleccionadas no son válidas");
      return;
    }
    
    if (closesAt <= now) {
      setErrorMsg("La fecha de cierre debe ser futura");
      return;
    }

    if (betOpensAt && opensAt >= closesAt) {
      setErrorMsg("La fecha de apertura debe ser anterior a la de cierre");
      return;
    }

    setCreatingBet(true);
    try {
      // Create the bet first (without image)
      const { data: betData, error: betError } = await supabase
        .from("bets")
        .insert({
          created_by: user.id,
          title: betTitle,
          description: betDescription || null,
          opens_at: opensAt.toISOString(),
          closes_at: closesAt.toISOString(),
          status: 'OPEN',
        })
        .select("id")
        .single();

      if (betError) {
        console.error("Error creating bet:", betError);
        setErrorMsg("Error al crear la apuesta: " + betError.message);
        return;
      }

      console.log("Bet created successfully:", betData);

      // Upload bet image if provided (using bet ID)
      let imageUrl = null;
      if (betImage) {
        imageUrl = await uploadBetImage(betImage, betData.id);
        if (!imageUrl) {
          console.warn("Failed to upload bet image, continuing without image");
        } else {
          // Update bet with image URL
          await supabase
            .from("bets")
            .update({ image_url: imageUrl })
            .eq("id", betData.id);
        }
      }

      // Create the 3 fixed bet options: Team 1, Team 2, Draw
      const optionsToInsert = [
        {
          bet_id: betData.id,
          label: betTeam1,
          odds_decimal: initialOdds,
          is_active: true,
        },
        {
          bet_id: betData.id,
          label: betTeam2,
          odds_decimal: initialOdds,
          is_active: true,
        },
        {
          bet_id: betData.id,
          label: "Empate",
          odds_decimal: initialOdds,
          is_active: true,
        }
      ];

      const { error: optionsError } = await supabase
        .from("bet_options")
        .insert(optionsToInsert);

      if (optionsError) {
        console.error("Error creating bet options:", optionsError);
        setErrorMsg("Error al crear las opciones: " + optionsError.message);
        return;
      }

      console.log("Bet options created successfully");
      
      // Reset form
      setBetTitle("");
      setBetDescription("");
      setBetTeam1("");
      setBetTeam2("");
      setBetOpensAt("");
      setBetClosesAt("");
      setBetImage(null);
      setBetModalOpen(false);
      setErrorMsg("");
      
      // Show success message
      setErrorMsg("✅ Apuesta creada exitosamente!");
      setTimeout(() => setErrorMsg(""), 3000);
      
      // Force reload of the entire app to show new bet in home
      setTimeout(() => {
        router.replace("/(tabs)/home");
        // Trigger a refresh by navigating away and back
        setTimeout(() => {
          router.replace("/(tabs)/profile");
        }, 100);
      }, 1500);
      
    } catch (err: any) {
      console.error("Exception creating bet:", err);
      setErrorMsg("Error al crear la apuesta: " + (err?.message || "Error desconocido"));
    } finally {
      setCreatingBet(false);
    }
  }, [user?.id, betTitle, betDescription, betTeam1, betTeam2, betOpensAt, betClosesAt, betImage, uploadBetImage]);

  // Finalize bet function
  const finalizeBet = useCallback(async (betId: string, winningOptionId: string) => {
    try {
      // Update bet status to RESOLVED
      const { error: betError } = await supabase
        .from("bets")
        .update({ status: 'RESOLVED' })
        .eq("id", betId);

      if (betError) {
        console.error("Error finalizing bet:", betError);
        setErrorMsg("Error al finalizar la apuesta: " + betError.message);
        return;
      }

      // Get all wagers for this bet
      const { data: wagers, error: wagersError } = await supabase
        .from("wagers")
        .select(`
          id,
          user_id,
          option_id,
          stake,
          locked_odds,
          potential_payout,
          profiles!inner(points)
        `)
        .eq("bet_id", betId)
        .eq("status", "PENDING");

      if (wagersError) {
        console.error("Error fetching wagers:", wagersError);
        setErrorMsg("Error al obtener las apuestas");
        return;
      }

      // Process each wager
      for (const wager of wagers || []) {
        let newStatus = 'LOST';
        let pointsToAdd = 0;

        if (wager.option_id === winningOptionId) {
          // Winner - give them the potential payout
          newStatus = 'WON';
          pointsToAdd = wager.potential_payout || (wager.stake * wager.locked_odds);
        } else {
          // Loser - they already lost their stake when they placed the bet
          newStatus = 'LOST';
          pointsToAdd = 0;
        }

        // Update wager status
        await supabase
          .from("wagers")
          .update({ status: newStatus })
          .eq("id", wager.id);

        // Update user points
        const currentPoints = wager.profiles?.points || 0;
        await supabase
          .from("profiles")
          .update({ points: currentPoints + pointsToAdd })
          .eq("id", wager.user_id);
      }

      setErrorMsg("✅ Apuesta finalizada exitosamente!");
      setTimeout(() => setErrorMsg(""), 3000);
      loadAllBets(); // Refresh the bets list
      
    } catch (error: any) {
      console.error("Error finalizing bet:", error);
      setErrorMsg("Error al finalizar la apuesta: " + (error?.message || "Error desconocido"));
    }
  }, []);

  // Delete bet function
  const deleteBet = useCallback(async (betId: string) => {
    try {
      // Get all pending wagers for this bet
      const { data: wagers, error: wagersError } = await supabase
        .from("wagers")
        .select(`
          id,
          user_id,
          stake,
          profiles!inner(points)
        `)
        .eq("bet_id", betId)
        .eq("status", "PENDING");

      if (wagersError) {
        console.error("Error fetching wagers:", wagersError);
        setErrorMsg("Error al obtener las apuestas");
        return;
      }

      // Refund each wager
      for (const wager of wagers || []) {
        // Update wager status to cancelled
        await supabase
          .from("wagers")
          .update({ status: 'CANCELLED' })
          .eq("id", wager.id);

        // Refund the stake to user
        const currentPoints = wager.profiles?.points || 0;
        await supabase
          .from("profiles")
          .update({ points: currentPoints + wager.stake })
          .eq("id", wager.user_id);
      }

      // Delete bet options first (foreign key constraint)
      await supabase
        .from("bet_options")
        .delete()
        .eq("bet_id", betId);

      // Delete the bet
      const { error: betError } = await supabase
        .from("bets")
        .delete()
        .eq("id", betId);

      if (betError) {
        console.error("Error deleting bet:", betError);
        setErrorMsg("Error al eliminar la apuesta: " + betError.message);
        return;
      }

      setErrorMsg("✅ Apuesta eliminada y dinero devuelto exitosamente!");
      setTimeout(() => setErrorMsg(""), 3000);
      loadAllBets(); // Refresh the bets list
      
    } catch (error: any) {
      console.error("Error deleting bet:", error);
      setErrorMsg("Error al eliminar la apuesta: " + (error?.message || "Error desconocido"));
    }
  }, []);

  // Date picker handlers
  const formatDateTime = (date: Date, time: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(time.getHours()).padStart(2, '0');
    const minutes = String(time.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

  const handleOpensDateChange = (event: any, selectedDate?: Date) => {
    setShowOpensDatePicker(false);
    if (selectedDate) {
      setOpensDate(selectedDate);
      setBetOpensAt(formatDateTime(selectedDate, opensTime));
    }
  };

  const handleOpensTimeChange = (event: any, selectedTime?: Date) => {
    setShowOpensTimePicker(false);
    if (selectedTime) {
      setOpensTime(selectedTime);
      setBetOpensAt(formatDateTime(opensDate, selectedTime));
    }
  };

  const handleClosesDateChange = (event: any, selectedDate?: Date) => {
    setShowClosesDatePicker(false);
    if (selectedDate) {
      setClosesDate(selectedDate);
      setBetClosesAt(formatDateTime(selectedDate, closesTime));
    }
  };

  const handleClosesTimeChange = (event: any, selectedTime?: Date) => {
    setShowClosesTimePicker(false);
    if (selectedTime) {
      setClosesTime(selectedTime);
      setBetClosesAt(formatDateTime(closesDate, selectedTime));
    }
  };

  // Admin view functions
  const loadAllBets = async () => {
    setLoadingBets(true);
    try {
      const { data, error } = await supabase
        .from("bets")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading bets:", error);
        setErrorMsg("Error al cargar las apuestas");
        return;
      }

      setAllBets(data || []);
    } catch (error) {
      console.error("Error loading bets:", error);
      setErrorMsg("Error al cargar las apuestas");
    } finally {
      setLoadingBets(false);
    }
  };

  const loadAllWagers = async () => {
    setLoadingWagers(true);
    try {
      const { data, error } = await supabase
        .from("wagers")
        .select(`
          *,
          bet:bets(title),
          option:bet_options(label),
          profile:profiles(name, email)
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading wagers:", error);
        setErrorMsg("Error al cargar las apuestas de usuarios");
        return;
      }

      setAllWagers(data || []);
    } catch (error) {
      console.error("Error loading wagers:", error);
      setErrorMsg("Error al cargar las apuestas de usuarios");
    } finally {
      setLoadingWagers(false);
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

  // Edit bet functions
  const openEditBet = async (bet: any) => {
    setEditingBet(bet);
    setEditBetTitle(bet.title);
    setEditBetDescription(bet.description || "");
    setEditBetClosesAt(bet.closes_at);
    
    // Load bet options to get team names and odds
    try {
      const { data: options, error } = await supabase
        .from("bet_options")
        .select("*")
        .eq("bet_id", bet.id)
        .eq("is_active", true)
        .order("created_at");

      if (!error && options && options.length >= 3) {
        // Assuming order: Team 1, Team 2, Draw
        setEditBetTeam1(options[0].label);
        setEditBetTeam2(options[1].label);
        setEditBetOddsTeam1(options[0].odds_decimal.toString());
        setEditBetOddsTeam2(options[1].odds_decimal.toString());
        setEditBetOddsDraw(options[2].odds_decimal.toString());
      }
    } catch (error) {
      console.error("Error loading bet options for edit:", error);
    }
    
    setEditBetModalOpen(true);
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

  const updateBet = async () => {
    if (!editingBet || !editBetTitle || !editBetTeam1 || !editBetTeam2 || !editBetClosesAt) {
      setErrorMsg("Por favor completa todos los campos requeridos");
      return;
    }

    setUpdatingBet(true);
    try {
      // Update bet
      const { error } = await supabase
        .from("bets")
        .update({
          title: editBetTitle,
          description: editBetDescription || null,
          closes_at: editBetClosesAt,
        })
        .eq("id", editingBet.id);

      if (error) {
        console.error("Error updating bet:", error);
        setErrorMsg("Error al actualizar la apuesta: " + error.message);
        return;
      }

      // Update bet options
      const { data: existingOptions, error: fetchError } = await supabase
        .from("bet_options")
        .select("id")
        .eq("bet_id", editingBet.id)
        .eq("is_active", true)
        .order("created_at");

      if (fetchError) {
        console.error("Error fetching bet options:", fetchError);
        setErrorMsg("Error al obtener las opciones de apuesta");
        return;
      }

      if (existingOptions && existingOptions.length >= 3) {
        // Calculate current dynamic odds
        const currentOdds = await calculateDynamicOdds(editingBet.id);
        const odds = currentOdds || { team1: 3.0, team2: 3.0, draw: 3.0 };

        // Update Team 1
        await supabase
          .from("bet_options")
          .update({
            label: editBetTeam1,
            odds_decimal: odds.team1,
          })
          .eq("id", existingOptions[0].id);

        // Update Team 2
        await supabase
          .from("bet_options")
          .update({
            label: editBetTeam2,
            odds_decimal: odds.team2,
          })
          .eq("id", existingOptions[1].id);

        // Update Draw
        await supabase
          .from("bet_options")
          .update({
            label: "Empate",
            odds_decimal: odds.draw,
          })
          .eq("id", existingOptions[2].id);
      }

      // Refresh bets list
      await loadAllBets();
      
      setEditBetModalOpen(false);
      setEditingBet(null);
      setErrorMsg("");
      
      // Show success message
      setErrorMsg("✅ Apuesta actualizada exitosamente!");
      setTimeout(() => setErrorMsg(""), 3000);
      
    } catch (err: any) {
      console.error("Exception updating bet:", err);
      setErrorMsg("Error al actualizar la apuesta: " + (err?.message || "Error desconocido"));
    } finally {
      setUpdatingBet(false);
    }
  };

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
        .select("name, username, email, bio, phone, avatar_url, points, role")
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
          points: data.points ?? 0,
          role: data.role ?? null,
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
            points: parsed.points ?? 0,
            role: parsed.role ?? null,
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
            points: 0,
            role: null,
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

  const addBalance = async () => {
    if (!user?.id || !amountToAdd) return;
    
    const amount = parseFloat(amountToAdd);
    if (isNaN(amount) || amount <= 0) {
      setErrorMsg("Please enter a valid amount");
      return;
    }
    
    setSaving(true);
    setErrorMsg("");
    try {
      const newPoints = (profile.points || 0) + amount;
      
      const { error } = await supabase
        .from("profiles")
        .update({ points: newPoints })
        .eq("id", user.id);

      if (error) {
        throw new Error(error.message);
      }

      setProfile(prev => ({ ...prev, points: newPoints }));
      setAmountToAdd("");
      setWalletModalOpen(false);
    } catch (e: any) {
      console.error("Error adding balance:", e);
      setErrorMsg(e?.message ?? "Failed to add balance");
    } finally {
      setSaving(false);
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
            <Text style={s.sub}>{displayOrPlaceholder(profile.bio)}</Text>
          </View>
          <Pressable
            onPress={openEdit}
            style={({ pressed }) => [s.ghostBtn, pressed && s.pressed]}
          >
            <Feather name="edit-3" size={18} color={TEXT} />
            <Text style={s.ghostText}>Edit</Text>
          </Pressable>
        </View>

        {/* Wallet Section */}
        <View style={s.walletCard}>
          <View style={s.walletHeader}>
            <Text style={s.walletTitle}>Wallet</Text>
            <Feather name="credit-card" size={20} color={ACCENT} />
          </View>
          <View style={s.walletContent}>
            <Text style={s.walletBalance}>${profile.points?.toFixed(2) || '0.00'}</Text>
            <Pressable
              onPress={() => setWalletModalOpen(true)}
              disabled={saving}
              style={({ pressed }) => [
                s.addBalanceBtn,
                (pressed || saving) && { opacity: 0.8 }
              ]}
            >
              <Feather name="plus" size={16} color="#fff" />
              <Text style={s.addBalanceText}>
                Add Balance
              </Text>
            </Pressable>
          </View>
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

        {/* Admin Section */}
        {profile.role === "ADMIN" && (
          <Section title="Administración">
            <Row
              icon={<Feather name="plus-circle" size={18} color={ACCENT} />}
              label="Crear Apuesta"
              helper="Crear nueva apuesta deportiva"
              right={
                <Pressable
                  style={{
                    backgroundColor: ACCENT,
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 8,
                  }}
                  onPress={() => setBetModalOpen(true)}
                >
                  <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>
                    Crear
                  </Text>
                </Pressable>
              }
            />
            <Row
              icon={<Feather name="list" size={18} color={ACCENT} />}
              label="Ver Apuestas"
              helper="Gestionar apuestas creadas"
              right={
                <Pressable
                  style={{
                    backgroundColor: BG_MID,
                    borderWidth: 1,
                    borderColor: ACCENT,
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 8,
                  }}
                  onPress={() => {
                    setViewBetsModalOpen(true);
                    loadAllBets();
                  }}
                >
                  <Text style={{ color: ACCENT, fontSize: 12, fontWeight: "700" }}>
                    Ver
                  </Text>
                </Pressable>
              }
            />
            <Row
              icon={<Feather name="users" size={18} color={ACCENT} />}
              label="Usuarios que Apuestan"
              helper="Ver quiénes han apostado"
              right={
                <Pressable
                  style={{
                    backgroundColor: BG_MID,
                    borderWidth: 1,
                    borderColor: ACCENT,
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 8,
                  }}
                  onPress={() => {
                    setViewUsersModalOpen(true);
                    loadAllWagers();
                  }}
                >
                  <Text style={{ color: ACCENT, fontSize: 12, fontWeight: "700" }}>
                    Ver
                  </Text>
                </Pressable>
              }
            />
          </Section>
        )}

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

      {/* ---------- Wallet Modal ---------- */}
      <Modal visible={walletModalOpen} animationType="fade" transparent>
        <View style={s.modalOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => !saving && setWalletModalOpen(false)} />
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Add Balance</Text>
            
            <Text style={s.modalLabel}>Amount to add</Text>
            <TextInput
              style={s.modalInput}
              value={amountToAdd}
              onChangeText={setAmountToAdd}
              placeholder="Enter amount"
              placeholderTextColor={MUTED}
              keyboardType="numeric"
            />

            {!!errorMsg && (
              <Text style={{ color: "#ff6b6b", marginTop: 8, fontSize: 12 }}>
                {errorMsg}
              </Text>
            )}

            <View style={s.modalActions}>
              <Pressable
                onPress={() => !saving && setWalletModalOpen(false)}
                style={({ pressed }) => [s.cancelBtn, pressed && { opacity: 0.9 }]}
                disabled={saving}
              >
                <Text style={s.cancelText}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={addBalance}
                style={({ pressed }) => [s.saveBtn, (pressed || saving) && { opacity: 0.9 }]}
                disabled={saving}
              >
                {saving ? <ActivityIndicator /> : <Text style={s.saveText}>Add</Text>}
              </Pressable>
            </View>
          </View>
          <Pressable style={{ flex: 1 }} onPress={() => !saving && setWalletModalOpen(false)} />
        </View>
      </Modal>

      {/* ---------- Bet Creation Modal ---------- */}
      <Modal visible={betModalOpen} animationType="fade" transparent>
        <View style={s.modalOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => !creatingBet && setBetModalOpen(false)} />
          <View style={[s.modalCard, { maxHeight: '90%' }]}>
            <Text style={s.modalTitle}>Crear Nueva Apuesta</Text>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.modalLabel}>Título del partido</Text>
              <TextInput
                style={s.modalInput}
                value={betTitle}
                onChangeText={setBetTitle}
                placeholder="Ej: Real Madrid vs Barcelona"
                placeholderTextColor={MUTED}
              />

              <Text style={s.modalLabel}>Equipo 1</Text>
              <TextInput
                style={s.modalInput}
                value={betTeam1}
                onChangeText={setBetTeam1}
                placeholder="Ej: Real Madrid"
                placeholderTextColor={MUTED}
              />

              <Text style={s.modalLabel}>Equipo 2</Text>
              <TextInput
                style={s.modalInput}
                value={betTeam2}
                onChangeText={setBetTeam2}
                placeholder="Ej: Barcelona"
                placeholderTextColor={MUTED}
              />

              <Text style={s.modalLabel}>Descripción (opcional)</Text>
              <TextInput
                style={[s.modalInput, { height: 80, textAlignVertical: 'top' }]}
                value={betDescription}
                onChangeText={setBetDescription}
                placeholder="Descripción del partido"
                placeholderTextColor={MUTED}
                multiline
              />

              <Text style={s.modalLabel}>Imagen (opcional)</Text>
              {betImage ? (
                <View style={{ marginBottom: 12 }}>
                  <Image source={{ uri: betImage }} style={{ width: '100%', height: 200, borderRadius: 8, marginBottom: 8 }} />
                  <Pressable
                    style={[s.modalInput, { backgroundColor: RED, borderColor: RED }]}
                    onPress={() => setBetImage(null)}
                  >
                    <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600' }}>
                      Eliminar Imagen
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  style={[s.modalInput, { backgroundColor: BG_MID, borderColor: ACCENT, borderWidth: 2 }]}
                  onPress={() => setShowBetImagePicker(true)}
                >
                  <Feather name="camera" size={20} color={ACCENT} style={{ textAlign: 'center' }} />
                  <Text style={{ color: ACCENT, textAlign: 'center', fontWeight: '600', marginTop: 4 }}>
                    Agregar Imagen
                  </Text>
                </Pressable>
              )}

              <Text style={s.modalLabel}>Fecha de apertura (opcional)</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <Pressable
                  style={[s.modalInput, { flex: 1 }]}
                  onPress={() => setShowOpensDatePicker(true)}
                >
                  <Text style={{ color: betOpensAt ? TEXT : MUTED, fontSize: 14 }}>
                    {betOpensAt ? opensDate.toLocaleDateString('es-ES') : 'Seleccionar fecha'}
                  </Text>
                </Pressable>
                <Pressable
                  style={[s.modalInput, { flex: 1 }]}
                  onPress={() => setShowOpensTimePicker(true)}
                >
                  <Text style={{ color: betOpensAt ? TEXT : MUTED, fontSize: 14 }}>
                    {betOpensAt ? opensTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : 'Seleccionar hora'}
                  </Text>
                </Pressable>
              </View>

              <Text style={s.modalLabel}>Fecha de cierre *</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <Pressable
                  style={[s.modalInput, { flex: 1 }]}
                  onPress={() => setShowClosesDatePicker(true)}
                >
                  <Text style={{ color: betClosesAt ? TEXT : MUTED, fontSize: 14 }}>
                    {betClosesAt ? closesDate.toLocaleDateString('es-ES') : 'Seleccionar fecha'}
                  </Text>
                </Pressable>
                <Pressable
                  style={[s.modalInput, { flex: 1 }]}
                  onPress={() => setShowClosesTimePicker(true)}
                >
                  <Text style={{ color: betClosesAt ? TEXT : MUTED, fontSize: 14 }}>
                    {betClosesAt ? closesTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : 'Seleccionar hora'}
                  </Text>
                </Pressable>
              </View>

              <View style={{ backgroundColor: BG, borderRadius: 8, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: BORDER }}>
                <Text style={{ color: ACCENT, fontSize: 14, fontWeight: '700', marginBottom: 8 }}>
                  ℹ️ Odds Automáticas
                </Text>
                <Text style={{ color: MUTED, fontSize: 12, lineHeight: 16 }}>
                  Las odds se calcularán automáticamente según las apuestas de los usuarios. Inician en 3.0x para cada opción y se ajustan dinámicamente.
                </Text>
              </View>

              {!!errorMsg && (
                <Text style={{ color: "#ff6b6b", marginTop: 8, fontSize: 12 }}>
                  {errorMsg}
                </Text>
              )}

              <View style={s.modalActions}>
                <Pressable
                  onPress={() => !creatingBet && setBetModalOpen(false)}
                  style={({ pressed }) => [s.cancelBtn, pressed && { opacity: 0.9 }]}
                  disabled={creatingBet}
                >
                  <Text style={s.cancelText}>Cancelar</Text>
                </Pressable>

                <Pressable
                  onPress={createBet}
                  style={({ pressed }) => [s.saveBtn, (pressed || creatingBet) && { opacity: 0.9 }]}
                  disabled={creatingBet}
                >
                  {creatingBet ? <ActivityIndicator /> : <Text style={s.saveText}>Crear Apuesta</Text>}
                </Pressable>
              </View>
            </ScrollView>
          </View>
          <Pressable style={{ flex: 1 }} onPress={() => !creatingBet && setBetModalOpen(false)} />
        </View>
      </Modal>

      {/* Date Pickers */}
      {showOpensDatePicker && (
        <DateTimePicker
          value={opensDate}
          mode="date"
          display="default"
          onChange={handleOpensDateChange}
          minimumDate={new Date()}
        />
      )}

      {showOpensTimePicker && (
        <DateTimePicker
          value={opensTime}
          mode="time"
          display="default"
          onChange={handleOpensTimeChange}
        />
      )}

      {showClosesDatePicker && (
        <DateTimePicker
          value={closesDate}
          mode="date"
          display="default"
          onChange={handleClosesDateChange}
          minimumDate={new Date()}
        />
      )}

      {showClosesTimePicker && (
        <DateTimePicker
          value={closesTime}
          mode="time"
          display="default"
          onChange={handleClosesTimeChange}
        />
      )}

      {/* ---------- View Bets Modal ---------- */}
      <Modal visible={viewBetsModalOpen} animationType="fade" transparent>
        <View style={s.modalOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => setViewBetsModalOpen(false)} />
          <View style={[s.modalCard, { maxHeight: '90%', width: '95%' }]}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Todas las Apuestas</Text>
              <Pressable onPress={() => setViewBetsModalOpen(false)}>
                <Feather name="x" size={24} color={MUTED} />
              </Pressable>
            </View>

            {loadingBets ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
                <ActivityIndicator size="large" color={ACCENT} />
                <Text style={{ color: MUTED, marginTop: 16 }}>Cargando apuestas...</Text>
              </View>
            ) : allBets.length === 0 ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
                <Feather name="trophy" size={48} color={MUTED} />
                <Text style={{ color: TEXT, fontSize: 18, fontWeight: '700', marginTop: 16 }}>
                  No hay apuestas
                </Text>
                <Text style={{ color: MUTED, fontSize: 14, textAlign: 'center', marginTop: 8 }}>
                  Crea tu primera apuesta para comenzar
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {allBets.map((item) => (
                  <View key={item.id} style={[s.betItem, { backgroundColor: BG_MID, borderRadius: 12, padding: 16, marginBottom: 12 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <Text style={{ color: TEXT, fontSize: 16, fontWeight: '700', flex: 1 }}>
                        {item.title}
                      </Text>
                      <View style={[s.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                        <Text style={s.statusText}>{getStatusText(item.status)}</Text>
                      </View>
                    </View>
                    
                    {item.description && (
                      <Text style={{ color: MUTED, fontSize: 14, marginBottom: 8 }}>
                        {item.description}
                      </Text>
                    )}
                    
                    <View style={{ gap: 4, marginBottom: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Feather name="calendar" size={12} color={MUTED} />
                        <Text style={{ color: MUTED, fontSize: 12 }}>
                          Cierra: {formatDate(item.closes_at)}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Feather name="clock" size={12} color={MUTED} />
                        <Text style={{ color: MUTED, fontSize: 12 }}>
                          Creada: {formatDate(item.created_at)}
                        </Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                      <Pressable
                        style={{
                          backgroundColor: ACCENT,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 8,
                          flex: 1,
                          minWidth: 80
                        }}
                        onPress={() => openEditBet(item)}
                      >
                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700', textAlign: 'center' }}>
                          Editar
                        </Text>
                      </Pressable>
                      
                      {item.status === 'OPEN' && (
                        <>
                          <Pressable
                            style={{
                              backgroundColor: GREEN,
                              paddingHorizontal: 12,
                              paddingVertical: 8,
                              borderRadius: 8,
                              flex: 1,
                              minWidth: 80
                            }}
                            onPress={() => {
                              setFinalizingBet(item);
                              setFinalizeBetModalOpen(true);
                            }}
                          >
                            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700', textAlign: 'center' }}>
                              Finalizar
                            </Text>
                          </Pressable>
                          
                          <Pressable
                            style={{
                              backgroundColor: RED,
                              paddingHorizontal: 12,
                              paddingVertical: 8,
                              borderRadius: 8,
                              flex: 1,
                              minWidth: 80
                            }}
                            onPress={() => {
                              setDeletingBet(item);
                              setDeleteBetModalOpen(true);
                            }}
                          >
                            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700', textAlign: 'center' }}>
                              Eliminar
                            </Text>
                          </Pressable>
                        </>
                      )}
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
          <Pressable style={{ flex: 1 }} onPress={() => setViewBetsModalOpen(false)} />
        </View>
      </Modal>

      {/* ---------- View Users Modal ---------- */}
      <Modal visible={viewUsersModalOpen} animationType="fade" transparent>
        <View style={s.modalOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => setViewUsersModalOpen(false)} />
          <View style={[s.modalCard, { maxHeight: '90%', width: '95%' }]}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Usuarios que Apuestan</Text>
              <Pressable onPress={() => setViewUsersModalOpen(false)}>
                <Feather name="x" size={24} color={MUTED} />
              </Pressable>
            </View>

            {loadingWagers ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
                <ActivityIndicator size="large" color={ACCENT} />
                <Text style={{ color: MUTED, marginTop: 16 }}>Cargando apuestas de usuarios...</Text>
              </View>
            ) : allWagers.length === 0 ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
                <Feather name="users" size={48} color={MUTED} />
                <Text style={{ color: TEXT, fontSize: 18, fontWeight: '700', marginTop: 16 }}>
                  No hay apuestas
                </Text>
                <Text style={{ color: MUTED, fontSize: 14, textAlign: 'center', marginTop: 8 }}>
                  Los usuarios aún no han realizado apuestas
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {allWagers.map((item) => (
                  <View key={item.id} style={[s.betItem, { backgroundColor: BG_MID, borderRadius: 12, padding: 16, marginBottom: 12 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: TEXT, fontSize: 16, fontWeight: '700' }}>
                          {item.profile?.name || 'Usuario'}
                        </Text>
                        <Text style={{ color: ACCENT, fontSize: 14 }}>
                          {item.profile?.email || 'Sin email'}
                        </Text>
                      </View>
                      <View style={[s.statusBadge, { backgroundColor: ACCENT }]}>
                        <Text style={s.statusText}>{item.stake} pts</Text>
                      </View>
                    </View>
                    
                    <Text style={{ color: MUTED, fontSize: 14, marginBottom: 8 }}>
                      <Text style={{ fontWeight: '600' }}>Apuesta:</Text> {item.bet?.title}
                    </Text>
                    
                    <Text style={{ color: MUTED, fontSize: 14, marginBottom: 8 }}>
                      <Text style={{ fontWeight: '600' }}>Opción:</Text> {item.option?.label}
                    </Text>
                    
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Feather name="clock" size={12} color={MUTED} />
                      <Text style={{ color: MUTED, fontSize: 12 }}>
                        Apostó: {formatDate(item.created_at)}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
          <Pressable style={{ flex: 1 }} onPress={() => setViewUsersModalOpen(false)} />
        </View>
      </Modal>

      {/* ---------- Edit Bet Modal ---------- */}
      <Modal visible={editBetModalOpen} animationType="fade" transparent>
        <View style={s.modalOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => !updatingBet && setEditBetModalOpen(false)} />
          <View style={[s.modalCard, { maxHeight: '80%' }]}>
            <Text style={s.modalTitle}>Editar Apuesta</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.modalLabel}>Título del partido</Text>
              <TextInput
                style={s.modalInput}
                value={editBetTitle}
                onChangeText={setEditBetTitle}
                placeholder="Ej: Real Madrid vs Barcelona"
                placeholderTextColor={MUTED}
              />

              <Text style={s.modalLabel}>Equipo 1</Text>
              <TextInput
                style={s.modalInput}
                value={editBetTeam1}
                onChangeText={setEditBetTeam1}
                placeholder="Ej: Real Madrid"
                placeholderTextColor={MUTED}
              />

              <Text style={s.modalLabel}>Equipo 2</Text>
              <TextInput
                style={s.modalInput}
                value={editBetTeam2}
                onChangeText={setEditBetTeam2}
                placeholder="Ej: Barcelona"
                placeholderTextColor={MUTED}
              />

              <Text style={s.modalLabel}>Descripción (opcional)</Text>
              <TextInput
                style={[s.modalInput, { height: 80, textAlignVertical: 'top' }]}
                value={editBetDescription}
                onChangeText={setEditBetDescription}
                placeholder="Descripción del partido"
                placeholderTextColor={MUTED}
                multiline
              />

              <Text style={s.modalLabel}>Fecha de cierre *</Text>
              <TextInput
                style={s.modalInput}
                value={editBetClosesAt}
                onChangeText={setEditBetClosesAt}
                placeholder="YYYY-MM-DD HH:MM (ej: 2024-12-25 20:00)"
                placeholderTextColor={MUTED}
              />

              <View style={{ backgroundColor: BG, borderRadius: 8, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: BORDER }}>
                <Text style={{ color: ACCENT, fontSize: 14, fontWeight: '700', marginBottom: 8 }}>
                  ℹ️ Odds Automáticas
                </Text>
                <Text style={{ color: MUTED, fontSize: 12, lineHeight: 16 }}>
                  Las odds se calculan automáticamente según las apuestas de los usuarios. Se actualizarán al guardar los cambios.
                </Text>
              </View>

              {!!errorMsg && (
                <Text style={{ color: "#ff6b6b", marginTop: 8, fontSize: 12 }}>
                  {errorMsg}
                </Text>
              )}

              <View style={s.modalActions}>
                <Pressable
                  onPress={() => !updatingBet && setEditBetModalOpen(false)}
                  style={({ pressed }) => [s.cancelBtn, pressed && { opacity: 0.9 }]}
                  disabled={updatingBet}
                >
                  <Text style={s.cancelText}>Cancelar</Text>
                </Pressable>

                <Pressable
                  onPress={updateBet}
                  style={({ pressed }) => [s.saveBtn, (pressed || updatingBet) && { opacity: 0.9 }]}
                  disabled={updatingBet}
                >
                  {updatingBet ? <ActivityIndicator /> : <Text style={s.saveText}>Actualizar</Text>}
                </Pressable>
              </View>
            </ScrollView>
          </View>
          <Pressable style={{ flex: 1 }} onPress={() => !updatingBet && setEditBetModalOpen(false)} />
        </View>
      </Modal>

      {/* ---------- Bet Image Picker Modal ---------- */}
      <Modal visible={showBetImagePicker} animationType="fade" transparent>
        <View style={s.modalOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => setShowBetImagePicker(false)} />
          <View style={[s.modalCard, { maxHeight: '60%' }]}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Seleccionar Imagen</Text>
              <Pressable onPress={() => setShowBetImagePicker(false)}>
                <Feather name="x" size={24} color={MUTED} />
              </Pressable>
            </View>

            <View style={{ gap: 12 }}>
              <Pressable
                style={[s.modalInput, { backgroundColor: BG_MID, borderColor: ACCENT, borderWidth: 2 }]}
                onPress={async () => {
                  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                  if (status !== 'granted') {
                    setErrorMsg('Se necesitan permisos para acceder a la galería');
                    return;
                  }
                  const result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsEditing: true,
                    aspect: [16, 9],
                    quality: 0.8,
                  });
                  if (!result.canceled && result.assets[0]) {
                    setBetImage(result.assets[0].uri);
                    setShowBetImagePicker(false);
                  }
                }}
              >
                <Feather name="image" size={20} color={ACCENT} style={{ textAlign: 'center' }} />
                <Text style={{ color: ACCENT, textAlign: 'center', fontWeight: '600', marginTop: 4 }}>
                  Elegir de Galería
                </Text>
              </Pressable>

              <Pressable
                style={[s.modalInput, { backgroundColor: BG_MID, borderColor: ACCENT, borderWidth: 2 }]}
                onPress={async () => {
                  const { status } = await ImagePicker.requestCameraPermissionsAsync();
                  if (status !== 'granted') {
                    setErrorMsg('Se necesitan permisos para acceder a la cámara');
                    return;
                  }
                  const result = await ImagePicker.launchCameraAsync({
                    allowsEditing: true,
                    aspect: [16, 9],
                    quality: 0.8,
                  });
                  if (!result.canceled && result.assets[0]) {
                    setBetImage(result.assets[0].uri);
                    setShowBetImagePicker(false);
                  }
                }}
              >
                <Feather name="camera" size={20} color={ACCENT} style={{ textAlign: 'center' }} />
                <Text style={{ color: ACCENT, textAlign: 'center', fontWeight: '600', marginTop: 4 }}>
                  Tomar Foto
                </Text>
              </Pressable>
            </View>
          </View>
          <Pressable style={{ flex: 1 }} onPress={() => setShowBetImagePicker(false)} />
        </View>
      </Modal>

      {/* ---------- Finalize Bet Modal ---------- */}
      <Modal visible={finalizeBetModalOpen} animationType="fade" transparent>
        <View style={s.modalOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => !finalizing && setFinalizeBetModalOpen(false)} />
          <View style={[s.modalCard, { maxHeight: '80%' }]}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Finalizar Apuesta</Text>
              <Pressable onPress={() => !finalizing && setFinalizeBetModalOpen(false)}>
                <Feather name="x" size={24} color={MUTED} />
              </Pressable>
            </View>

            {finalizingBet && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={[s.betItem, { backgroundColor: BG_MID, borderRadius: 12, padding: 16, marginBottom: 16 }]}>
                  <Text style={{ color: TEXT, fontSize: 18, fontWeight: '700', marginBottom: 12 }}>
                    {finalizingBet.title}
                  </Text>
                  
                  <Text style={{ color: MUTED, fontSize: 14, marginBottom: 16 }}>
                    Selecciona la opción ganadora:
                  </Text>

                  {finalizingBet.bet_options && finalizingBet.bet_options.map((option: any) => (
                    <Pressable
                      key={option.id}
                      style={[
                        { backgroundColor: BG, borderRadius: 8, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: BORDER },
                        selectedWinningOption === option.id && { borderColor: GREEN, backgroundColor: BG_MID }
                      ]}
                      onPress={() => setSelectedWinningOption(option.id)}
                    >
                      <Text style={{ color: selectedWinningOption === option.id ? GREEN : TEXT, fontSize: 14, fontWeight: '600' }}>
                        {option.label} - {option.odds_decimal.toFixed(2)}x
                      </Text>
                    </Pressable>
                  ))}

                  <View style={s.modalActions}>
                    <Pressable
                      onPress={() => !finalizing && setFinalizeBetModalOpen(false)}
                      style={({ pressed }) => [s.cancelBtn, pressed && { opacity: 0.9 }]}
                      disabled={finalizing}
                    >
                      <Text style={s.cancelText}>Cancelar</Text>
                    </Pressable>

                    <Pressable
                      onPress={async () => {
                        if (!selectedWinningOption) {
                          setErrorMsg("Por favor selecciona la opción ganadora");
                          return;
                        }
                        setFinalizing(true);
                        await finalizeBet(finalizingBet.id, selectedWinningOption);
                        setFinalizing(false);
                        setFinalizeBetModalOpen(false);
                        setSelectedWinningOption("");
                      }}
                      style={({ pressed }) => [s.saveBtn, (pressed || finalizing) && { opacity: 0.9 }]}
                      disabled={finalizing || !selectedWinningOption}
                    >
                      {finalizing ? <ActivityIndicator /> : <Text style={s.saveText}>Finalizar</Text>}
                    </Pressable>
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
          <Pressable style={{ flex: 1 }} onPress={() => !finalizing && setFinalizeBetModalOpen(false)} />
        </View>
      </Modal>

      {/* ---------- Delete Bet Modal ---------- */}
      <Modal visible={deleteBetModalOpen} animationType="fade" transparent>
        <View style={s.modalOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => !deleting && setDeleteBetModalOpen(false)} />
          <View style={[s.modalCard, { maxHeight: '60%' }]}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Eliminar Apuesta</Text>
              <Pressable onPress={() => !deleting && setDeleteBetModalOpen(false)}>
                <Feather name="x" size={24} color={MUTED} />
              </Pressable>
            </View>

            {deletingBet && (
              <View style={[s.betItem, { backgroundColor: BG_MID, borderRadius: 12, padding: 16, marginBottom: 16 }]}>
                <Text style={{ color: TEXT, fontSize: 18, fontWeight: '700', marginBottom: 12 }}>
                  {deletingBet.title}
                </Text>
                
                <View style={{ backgroundColor: RED, borderRadius: 8, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: RED }}>
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 8 }}>
                    ⚠️ Advertencia
                  </Text>
                  <Text style={{ color: '#fff', fontSize: 12, lineHeight: 16 }}>
                    Esta acción eliminará la apuesta y devolverá todo el dinero apostado a los usuarios. Esta acción no se puede deshacer.
                  </Text>
                </View>

                <View style={s.modalActions}>
                  <Pressable
                    onPress={() => !deleting && setDeleteBetModalOpen(false)}
                    style={({ pressed }) => [s.cancelBtn, pressed && { opacity: 0.9 }]}
                    disabled={deleting}
                  >
                    <Text style={s.cancelText}>Cancelar</Text>
                  </Pressable>

                  <Pressable
                    onPress={async () => {
                      setDeleting(true);
                      await deleteBet(deletingBet.id);
                      setDeleting(false);
                      setDeleteBetModalOpen(false);
                    }}
                    style={({ pressed }) => [s.saveBtn, { backgroundColor: RED }, (pressed || deleting) && { opacity: 0.9 }]}
                    disabled={deleting}
                  >
                    {deleting ? <ActivityIndicator /> : <Text style={s.saveText}>Eliminar</Text>}
                  </Pressable>
                </View>
              </View>
            )}
          </View>
          <Pressable style={{ flex: 1 }} onPress={() => !deleting && setDeleteBetModalOpen(false)} />
        </View>
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

  // Wallet styles
  walletCard: {
    backgroundColor: BG_MID,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  walletHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  walletTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "800",
  },
  walletContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  walletBalance: {
    color: TEXT,
    fontSize: 24,
    fontWeight: "900",
  },
  addBalanceBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ACCENT,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  addBalanceText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },

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

  // Image buttons
  imageBtn: {
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: BG,
    alignItems: "center",
    justifyContent: "center",
  },
  imageBtnText: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "600",
  },

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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  betItem: {
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
