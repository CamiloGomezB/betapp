import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "https://your-project.supabase.co";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_API_KEY ?? "your-anon-key";

console.log("Supabase URL:", supabaseUrl ? "✅ Set" : "❌ Missing");
console.log("Supabase Key:", supabaseAnonKey ? "✅ Set" : "❌ Missing");

if (supabaseUrl === "https://your-project.supabase.co" || supabaseAnonKey === "your-anon-key") {
  console.warn("⚠️  Supabase credentials not configured! Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_API_KEY in your .env file");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
