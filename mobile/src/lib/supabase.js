import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://hiainpwkiybuupalhhpk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpYWlucHdraXlidXVwYWxoaHBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NTc4ODQsImV4cCI6MjA4ODIzMzg4NH0.HR95nYLORNy1GpjyCsh8cE1HlRl_vf4AEUG1tBpRuk0";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
