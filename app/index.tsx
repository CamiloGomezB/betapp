import { AuthContext } from "@/contexts/AuthContext";
import { Redirect } from "expo-router";
import { useContext } from "react";
import { ActivityIndicator, Text, View } from "react-native";

export default function Index() {
  const { user, isLoading } = useContext(AuthContext);

  // Mostrar loading mientras se verifica la autenticación
  if (isLoading) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: '#12151C' 
      }}>
        <ActivityIndicator size="large" color="#6C8DFF" />
        <Text style={{ 
          color: '#E6EAF2', 
          marginTop: 16, 
          fontSize: 16 
        }}>
          Cargando...
        </Text>
      </View>
    );
  }

  // Redirigir basado en el estado de autenticación
  if (user) {
    return <Redirect href="/main/(tabs)/home" />;
  } else {
    return <Redirect href="/(auth)/login" />;
  }
}