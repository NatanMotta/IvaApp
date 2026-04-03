import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';

export default function ProfiloScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Il mio profilo</Text>

      <TouchableOpacity
        style={styles.bottone}
        onPress={() => supabase.auth.signOut()}
      >
        <Text style={styles.bottoneText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB' },
  title: { fontSize: 22, fontWeight: '700', color: '#1A3A5C', marginBottom: 40 },
  bottone: { backgroundColor: '#E53E3E', borderRadius: 10, padding: 16, paddingHorizontal: 32 },
  bottoneText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});