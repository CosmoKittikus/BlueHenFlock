import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  FlatList, Modal, Alert, ScrollView, useColorScheme, SafeAreaView, ActivityIndicator 
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { createClient } from '@supabase/supabase-js';
import { Shield, AlertTriangle, Plus, X, LogOut, Sun, Moon, Type } from 'lucide-react-native';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const UD_BLUE = '#00539B';
const CATEGORIES = ['Accidents', 'Construction', 'Weather Hazard', 'Auditory Hazards', 'UD Emergency'];

export default function App() {
  const systemColorScheme = useColorScheme();
  
  // Settings (Local only - will reset on refresh)
  const [darkMode, setDarkMode] = useState(systemColorScheme === 'dark');
  const [fontSize, setFontSize] = useState(1); 

  // Auth & Data State
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  
  const [events, setEvents] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState('All');
  const [isModalVisible, setModalVisible] = useState(false);
  
  // New Post State
  const [tempCoords, setTempCoords] = useState({ latitude: 39.6781, longitude: -75.7506 });
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);

  const theme = {
    bg: darkMode ? '#121212' : '#FFFFFF',
    text: darkMode ? '#FFFFFF' : '#333333',
    card: darkMode ? '#1E1E1E' : '#FFFFFF',
    input: darkMode ? '#333333' : '#EEEEEE',
    border: darkMode ? '#444444' : '#EEEEEE'
  };

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) fetchEvents();
    };
    init();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchEvents();
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*').order('created_at', { ascending: false });
    if (data) setEvents(data);
  };

  const createPost = async () => {
    if (!newTitle) return Alert.alert("Required", "Please add a title.");
    const { error } = await supabase.from('events').insert([{ 
      title: newTitle, description: newDesc, category: selectedCategory,
      lat: tempCoords.latitude, lng: tempCoords.longitude, user_id: user?.id 
    }]);
    if (!error) {
      setModalVisible(false);
      setNewTitle('');
      fetchEvents();
    }
  };

  const handleVote = async (id: string, column: 'votes' | 'flags') => {
    const item = events.find(e => e.id === id);
    await supabase.from('events').update({ [column]: (item[column] || 0) + 1 }).eq('id', id);
    fetchEvents();
  };

  if (loading) return <View style={[styles.center, {backgroundColor: theme.bg}]}><ActivityIndicator size="large" color={UD_BLUE}/></View>;

  if (!user) {
    return (
      <SafeAreaView style={[styles.loginContainer, { backgroundColor: theme.bg }]}>
        <Shield color={UD_BLUE} size={80} />
        <Text style={[styles.title, { color: darkMode ? 'white' : UD_BLUE, fontSize: 28 * fontSize }]}>Blue Hen Flock</Text>
        <TextInput style={[styles.input, { backgroundColor: theme.input, color: theme.text }]} placeholder="student@udel.edu" placeholderTextColor="#888" onChangeText={setEmail} />
        <TextInput style={[styles.input, { backgroundColor: theme.input, color: theme.text }]} placeholder="Password" secureTextEntry onChangeText={setPassword} />
        <TouchableOpacity style={styles.button} onPress={async () => {
             const { error } = isSignUp ? await supabase.auth.signUp({ email, password }) : await supabase.auth.signInWithPassword({ email, password });
             if (error) Alert.alert("Error", error.message);
        }}><Text style={styles.buttonText}>{isSignUp ? 'Sign Up' : 'Login'}</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} style={{ marginTop: 20 }}>
          <Text style={{ color: UD_BLUE }}>{isSignUp ? 'Already have an account?' : 'Create Account'}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const filteredEvents = events.filter(e => (activeFilter === 'All' || e.category === activeFilter) && e.flags < 5);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.topBar, { borderBottomColor: theme.border }]}>
        <View style={{flexDirection: 'row'}}>
          <TouchableOpacity onPress={() => setDarkMode(!darkMode)} style={{marginRight: 15}}>
            {darkMode ? <Sun color={UD_BLUE} size={24}/> : <Moon color={UD_BLUE} size={24}/>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setFontSize(prev => prev >= 1.5 ? 1 : prev + 0.2)}>
            <Type color={UD_BLUE} size={24}/>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => supabase.auth.signOut()}><LogOut color="red" size={20}/></TouchableOpacity>
      </View>

      <MapView 
        style={{height: '35%'}} 
        initialRegion={{ latitude: 39.6781, longitude: -75.7506, latitudeDelta: 0.015, longitudeDelta: 0.015 }}
        onLongPress={(e) => { setTempCoords(e.nativeEvent.coordinate); setModalVisible(true); }}
      >
        {filteredEvents.map(ev => <Marker key={ev.id} coordinate={{ latitude: ev.lat, longitude: ev.lng }} pinColor={ev.category === 'UD Emergency' ? 'red' : UD_BLUE} />)}
      </MapView>

      <View style={{paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.border}}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['All', ...CATEGORIES].map(cat => (
            <TouchableOpacity key={cat} onPress={() => setActiveFilter(cat)} style={[styles.chip, activeFilter === cat && {backgroundColor: UD_BLUE}]}>
              <Text style={{color: activeFilter === cat ? 'white' : theme.text, fontSize: 14 * fontSize}}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList 
        data={filteredEvents}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
            <View style={{flex: 1}}>
              <Text style={{fontSize: 10, color: UD_BLUE, fontWeight: 'bold'}}>{item.category.toUpperCase()}</Text>
              <Text style={[styles.cardTitle, { color: theme.text, fontSize: 18 * fontSize }]}>{item.title}</Text>
              <Text style={{color: darkMode ? '#AAA' : '#666', fontSize: 14 * fontSize}}>{item.description}</Text>
            </View>
            <View style={{alignItems: 'center'}}>
              <TouchableOpacity onPress={() => handleVote(item.id, 'votes')} style={styles.voteBtn}><Text style={{color: 'green', fontSize: 12}}>Confirm ({item.votes || 0})</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => handleVote(item.id, 'flags')}><AlertTriangle color="red" size={20} /></TouchableOpacity>
            </View>
          </View>
        )}
      />

      <Modal visible={isModalVisible} animationType="slide">
        <SafeAreaView style={[styles.modal, { backgroundColor: theme.bg }]}>
          <View style={styles.modalHeader}>
            <Text style={{color: theme.text, fontSize: 24 * fontSize, fontWeight: 'bold'}}>Drop Pin Alert</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}><X color={theme.text} size={30}/></TouchableOpacity>
          </View>
          <View style={styles.catPicker}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity key={cat} onPress={() => setSelectedCategory(cat)} style={[styles.catOpt, {borderColor: theme.border}, selectedCategory === cat && {backgroundColor: UD_BLUE}]}>
                <Text style={{color: selectedCategory === cat ? 'white' : theme.text}}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput style={[styles.input, { backgroundColor: theme.input, color: theme.text }]} placeholder="Title" placeholderTextColor="#888" onChangeText={setNewTitle} />
          <TextInput style={[styles.input, { backgroundColor: theme.input, color: theme.text, height: 80 }]} placeholder="Details..." placeholderTextColor="#888" multiline onChangeText={setNewDesc} />
          <TouchableOpacity style={styles.button} onPress={createPost}><Text style={styles.buttonText}>Post to Flock</Text></TouchableOpacity>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loginContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1 },
  title: { fontWeight: 'bold', marginVertical: 15 },
  input: { width: '100%', padding: 15, borderRadius: 10, marginVertical: 8 },
  button: { backgroundColor: UD_BLUE, padding: 18, borderRadius: 10, width: '100%', alignItems: 'center', marginTop: 10 },
  buttonText: { color: 'white', fontWeight: 'bold' },
  chip: { paddingHorizontal: 15, paddingVertical: 8, marginHorizontal: 5, borderRadius: 20, backgroundColor: '#eee' },
  card: { padding: 15, borderBottomWidth: 1, flexDirection: 'row' },
  cardTitle: { fontWeight: 'bold' },
  voteBtn: { marginBottom: 10, padding: 5, borderRadius: 5, backgroundColor: '#f0fff0' },
  modal: { flex: 1, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  catPicker: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 15 },
  catOpt: { padding: 8, borderWidth: 1, borderRadius: 5, marginRight: 5, marginBottom: 5 }
});
