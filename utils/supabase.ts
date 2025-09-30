import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_API_KEY;

console.log("Supabase URL:", supabaseUrl ? "✅ Set" : "❌ Missing");
console.log("Supabase Key:", supabaseAnonKey ? "✅ Set" : "❌ Missing");

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Supabase credentials not configured! Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_API_KEY in your .env file");
  throw new Error("Supabase credentials are required. Please check your .env file.");
}

// Función para verificar el estado de AsyncStorage
const checkAsyncStorage = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const supabaseKeys = keys.filter(key => key.includes('supabase'));
    console.log("📱 AsyncStorage keys:", keys.length);
    console.log("🔑 Supabase keys:", supabaseKeys);
    
    if (supabaseKeys.length > 0) {
      for (const key of supabaseKeys) {
        const sessionData = await AsyncStorage.getItem(key);
        console.log(`💾 Key "${key}" data exists:`, !!sessionData);
        if (sessionData) {
          try {
            const parsed = JSON.parse(sessionData);
            console.log(`📄 Key "${key}" content:`, Object.keys(parsed));
          } catch (e) {
            console.log(`📄 Key "${key}" content:`, sessionData.substring(0, 100) + "...");
          }
        }
      }
    } else {
      console.log("⚠️ No Supabase keys found in AsyncStorage");
    }
  } catch (error) {
    console.error("❌ Error checking AsyncStorage:", error);
  }
};

// Función para debugging avanzado de persistencia
const debugPersistence = async () => {
  try {
    console.log("🔍 === DEBUGGING PERSISTENCE ===");
    
    // Verificar AsyncStorage
    const keys = await AsyncStorage.getAllKeys();
    console.log("📱 Total AsyncStorage keys:", keys.length);
    
    // Buscar todas las claves relacionadas con auth
    const authKeys = keys.filter(key => 
      key.includes('supabase') || 
      key.includes('auth') || 
      key.includes('session') ||
      key.includes('token')
    );
    console.log("🔑 Auth-related keys:", authKeys);
    
    // Verificar cada clave de auth
    for (const key of authKeys) {
      const value = await AsyncStorage.getItem(key);
      console.log(`📄 Key "${key}":`, value ? "EXISTS" : "EMPTY");
      if (value) {
        try {
          const parsed = JSON.parse(value);
          if (parsed.access_token) {
            console.log(`  🔐 Has access_token: YES`);
            console.log(`  ⏰ Expires at: ${new Date(parsed.expires_at * 1000).toLocaleString()}`);
            const now = Math.floor(Date.now() / 1000);
            console.log(`  ✅ Is valid: ${parsed.expires_at > now ? 'YES' : 'NO'}`);
          }
        } catch (e) {
          console.log(`  📝 Raw content: ${value.substring(0, 50)}...`);
        }
      }
    }
    
    console.log("🔍 === END DEBUGGING ===");
  } catch (error) {
    console.error("❌ Error in debugPersistence:", error);
  }
};

// Verificar AsyncStorage al inicializar (solo en desarrollo)
if (__DEV__) {
  checkAsyncStorage();
  debugPersistence();
}

// Función para limpiar completamente el almacenamiento
export const clearAllStorage = async () => {
  try {
    console.log("🧹 Clearing all storage...");
    
    const keys = await AsyncStorage.getAllKeys();
    const authKeys = keys.filter(key => 
      key.includes('supabase') || 
      key.includes('auth') || 
      key.includes('session') ||
      key.includes('token') ||
      key.includes('betapp_') ||
      key.includes('backup_')
    );
    
    console.log("🗑️ Keys to remove:", authKeys);
    
    if (authKeys.length > 0) {
      await AsyncStorage.multiRemove(authKeys);
      console.log("✅ All auth storage cleared");
    } else {
      console.log("ℹ️ No auth keys found to clear");
    }
  } catch (error) {
    console.error("❌ Error clearing storage:", error);
  }
};

// Función para verificar el estado del almacenamiento
export const checkStorageHealth = async () => {
  try {
    console.log("🏥 === STORAGE HEALTH CHECK ===");
    
    const keys = await AsyncStorage.getAllKeys();
    console.log("📱 Total keys in storage:", keys.length);
    
    const authKeys = keys.filter(key => 
      key.includes('supabase') || 
      key.includes('auth') || 
      key.includes('session') ||
      key.includes('token') ||
      key.includes('betapp_') ||
      key.includes('backup_')
    );
    
    console.log("🔑 Auth-related keys found:", authKeys.length);
    
    for (const key of authKeys) {
      const value = await AsyncStorage.getItem(key);
      console.log(`📄 "${key}": ${value ? "HAS_DATA" : "EMPTY"}`);
    }
    
    console.log("🏥 === END HEALTH CHECK ===");
  } catch (error) {
    console.error("❌ Error in storage health check:", error);
  }
};

// Storage optimizado basado en los logs exitosos
const optimizedStorage = {
  getItem: async (key: string) => {
    try {
      // Intentar la clave principal primero
      const value = await AsyncStorage.getItem(key);
      if (value) {
        console.log(`✅ Storage GET "${key}": SUCCESS`);
        return value;
      }
      
      // Fallback a clave alternativa
      const altKey = `betapp_${key}`;
      const altValue = await AsyncStorage.getItem(altKey);
      if (altValue) {
        console.log(`✅ Storage GET alt "${altKey}": SUCCESS`);
        return altValue;
      }
      
      // Fallback a clave de respaldo
      const backupKey = `backup_${key}`;
      const backupValue = await AsyncStorage.getItem(backupKey);
      if (backupValue) {
        console.log(`✅ Storage GET backup "${backupKey}": SUCCESS`);
        return backupValue;
      }
      
      console.log(`ℹ️ Storage GET "${key}": NO_DATA_FOUND`);
      return null;
    } catch (error) {
      console.error(`❌ Storage GET error for "${key}":`, error);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      // Guardar en múltiples ubicaciones para máxima confiabilidad
      await Promise.all([
        AsyncStorage.setItem(key, value),
        AsyncStorage.setItem(`betapp_${key}`, value),
        AsyncStorage.setItem(`backup_${key}`, value)
      ]);
      console.log(`💾 Storage SET "${key}": SUCCESS (3 locations)`);
    } catch (error) {
      console.error(`❌ Storage SET error for "${key}":`, error);
    }
  },
  removeItem: async (key: string) => {
    try {
      // Limpiar todas las ubicaciones
      await Promise.all([
        AsyncStorage.removeItem(key),
        AsyncStorage.removeItem(`betapp_${key}`),
        AsyncStorage.removeItem(`backup_${key}`)
      ]);
      console.log(`🗑️ Storage REMOVE "${key}": SUCCESS (3 locations)`);
    } catch (error) {
      console.error(`❌ Storage REMOVE error for "${key}":`, error);
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: optimizedStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
