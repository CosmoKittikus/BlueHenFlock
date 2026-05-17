import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  FlatList, Modal, Alert, ScrollView, useColorScheme, SafeAreaView, ActivityIndicator 
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { createClient } from '@supabase/supabase-js';
import { Shield, AlertTriangle, LogOut, Sun, Moon, Type, X, Plus, Minus } from 'lucide-react-native';

// --- Initialization ---
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const UD_BLUE = '#00539B';
const CATEGORIES = ['Accidents', 'Construction', 'Weather Hazard', 'Auditory Hazards', 'UD Emergency'];

// --- Sub-Components (Defined outside to prevent re-mounting/flashing bugs) ---

const SettingsHeader = ({ theme, darkMode, setDarkMode, setSettingsVisible, showLogout, onLogout }: any) => (
  <View style={[styles.topBar, { borderBottomColor: theme.border }]}>
    <View style={{flexDirection: 'row', alignItems: 'center'}}>
      <TouchableOpacity onPress={() => setDarkMode(!darkMode)} style={{marginRight: 20}}>
        {darkMode ? <Sun color={UD_BLUE} size={24}/> : <Moon color={UD_BLUE} size={24}/>}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setSettingsVisible(true)}>
        <Type color={UD_BLUE} size={24}/>
      </TouchableOpacity>
    </View>
    {showLogout && (
      <TouchableOpacity onPress={onLogout}>
        <LogOut color="#FF4444" size={24}/>
      </TouchableOpacity>
    )}
  </View>
);

const GlobalSettingsModal = ({ isVisible, setVisible, theme, fontSize, adjustFontSize }: any) => (
  <Modal visible={isVisible} transparent animationType="fade">
    <View style={styles.overlay}>
      <View style={[styles.settingsModal, { backgroundColor: theme.card }]}>
        <View style={styles.modalHeader}>
          <Text style={{color: theme.text, fontSize: 20, fontWeight: 'bold'}}>Display Settings</Text>
          <TouchableOpacity onPress={() => setVisible(false)}><X color={theme.text} size={24}/></TouchableOpacity>
        </View>
        <View style={styles.settingRow}>
           <Text style={{color: theme.text, fontSize: 16}}>Text Scaling</Text>
           <View style={styles.stepper}>
              <TouchableOpacity onPress={() => adjustFontSize(-0.1)} style={styles.stepBtn}>
                <Minus color={UD_BLUE} size={20} />
              </TouchableOpacity>
              <Text style={{color: theme.text, marginHorizontal: 15, fontWeight: 'bold', width: 45, textAlign: 'center'}}>
                {Math.round(fontSize * 100)}%
              </Text>
              <TouchableOpacity onPress={() => adjustFontSize(0.1)} style={styles.stepBtn}>
                <Plus color={UD_BLUE} size={20} />
              </TouchableOpacity>
           </View>
        </View>
        <Text style={{color: theme.subtext, fontSize: 12 * fontSize, fontStyle: 'italic', textAlign: 'center'}}>
          Sample: The quick blue hen jumps over the hazard.
        </Text>
        <TouchableOpacity style={[styles.button, {marginTop: 20}]} onPress={() => setVisible(false)}>
          <Text style={styles.buttonText}>Save Changes</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

// --- Main Application ---

export default function App() {
  const systemColorScheme = useColorScheme();
  
  // Settings State
  const [darkMode, setDarkMode] = useState(systemColorScheme === 'dark');
  const [fontSize, setFontSize] = useState(1); 
  const [isSettingsVisible, setSettingsVisible] = useState(false);

  // Auth & Data State
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  
  const [events, setEvents] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState('All');
  const [isModalVisible, setModalVisible] = useState(false);
  
  const [tempCoords, setTempCoords] = useState({ latitude: 39.6781, longitude: -75.7506 });
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);

  const theme = {
    bg: darkMode ? '#121212' : '#FFFFFF',
    text: darkMode ? '#FFFFFF' : '#333333',
    subtext: darkMode ? '#AAAAAA' : '#666666',
    card: darkMode ? '#1E1E1E' : '#FFFFFF',
    input: darkMode ? '#2C2C2C' : '#F5F5F5',
    border: darkMode ? '#333333' : '#EEEEEE',
    chipUnselected: darkMode ? '#333333' : '#EEEEEE'
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
      setNewTitle(''); setNewDesc('');
      fetchEvents();
    }
  };

  const handleVote = async (id: string, column: 'votes' | 'flags') => {
    const item = events.find(e => e.id === id);
    await supabase.from('events').update({ [column]: (item[column] || 0) + 1 }).eq('id', id);
    fetchEvents();
  };

  const adjustFontSize = (delta: number) => {
    setFontSize(prev => {
      const next = prev + delta;
      return next < 0.8 ? 0.8 : next > 2 ? 2 : parseFloat(next.toFixed(1));
    });
  };

  if (loading) return <View style={[styles.center, {backgroundColor: theme.bg}]}><ActivityIndicator size="large" color={UD_BLUE}/></View>;

  // Login Screen
  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
        <SettingsHeader 
          theme={theme} darkMode={darkMode} setDarkMode={setDarkMode} 
          setSettingsVisible={setSettingsVisible} showLogout={false} 
        />
        <View style={styles.loginContent}>
          <Shield color={UD_BLUE} size={80} />
          <Text style={[styles.title, { color: darkMode ? '#FFFFFF' : UD_BLUE, fontSize: 28 * fontSize }]}>Blue Hen Flock</Text>
          <TextInput 
            style={[styles.input, { backgroundColor: theme.input, color: theme.text }]} 
            placeholder="student@udel.edu" placeholderTextColor={darkMode ? "#888" : "#999"} 
            onChangeText={setEmail} autoCapitalize="none"
          />
          <TextInput 
            style={[styles.input, { backgroundColor: theme.input, color: theme.text }]} 
            placeholder="Password" placeholderTextColor={darkMode ? "#888" : "#999"} 
            secureTextEntry onChangeText={setPassword} 
          />
          <TouchableOpacity style={styles.button} onPress={async () => {
               const { error } = isSignUp ? await supabase.auth.signUp({ email, password }) : await supabase.auth.signInWithPassword({ email, password });
               if (error) Alert.alert("Error", error.message);
          }}>
            <Text style={styles.buttonText}>{isSignUp ? 'Sign Up' : 'Login'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} style={{ marginTop: 20 }}>
            <Text style={{ color: UD_BLUE, fontWeight: '600', fontSize: 14 * fontSize }}>
              {isSignUp ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
            </Text>
          </TouchableOpacity>
        </View>
        <GlobalSettingsModal 
          isVisible={isSettingsVisible} setVisible={setSettingsVisible} 
          theme={theme} fontSize={fontSize} adjustFontSize={adjustFontSize} 
        />
      </SafeAreaView>
    );
  }

  // Main App Screen
  const filteredEvents = events.filter(e => (activeFilter === 'All' || e.category === activeFilter) && (e.flags || 0) < 5);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <SettingsHeader 
        theme={theme} darkMode={darkMode} setDarkMode={setDarkMode} 
        setSettingsVisible={setSettingsVisible} showLogout={true} onLogout={() => supabase.auth.signOut()} 
      />
      
      <MapView 
        style={{height: '35%'}} userInterfaceStyle={darkMode ? 'dark' : 'light'}
        initialRegion={{ latitude: 39.6781, longitude: -75.7506, latitudeDelta: 0.015, longitudeDelta: 0.015 }}
        onLongPress={(e) => { setTempCoords(e.nativeEvent.coordinate); setModalVisible(true); }}
      >
        {filteredEvents.map(ev => (
          <Marker key={ev.id} coordinate={{ latitude: ev.lat, longitude: ev.lng }} pinColor={ev.category === 'UD Emergency' ? 'red' : UD_BLUE} />
        ))}
      </MapView>

      <View style={{paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.border}}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal: 10}}>
          {['All', ...CATEGORIES].map(cat => (
            <TouchableOpacity key={cat} onPress={() => setActiveFilter(cat)} style={[styles.chip, { backgroundColor: activeFilter === cat ? UD_BLUE : theme.chipUnselected }]}>
              <Text style={{ color: activeFilter === cat ? '#FFFFFF' : theme.text, fontSize: 14 * fontSize, fontWeight: activeFilter === cat ? 'bold' : 'normal' }}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList 
        data={filteredEvents}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
            <View style={{flex: 1}}>
              <Text style={{fontSize: 10, color: UD_BLUE, fontWeight: 'bold', marginBottom: 2}}>{item.category.toUpperCase()}</Text>
              <Text style={[styles.cardTitle, { color: theme.text, fontSize: 18 * fontSize }]}>{item.title}</Text>
              <Text style={{color: theme.subtext, fontSize: 14 * fontSize, marginTop: 4}}>{item.description}</Text>
            </View>
            <View style={{alignItems: 'center', marginLeft: 10}}>
              <TouchableOpacity onPress={() => handleVote(item.id, 'votes')} style={[styles.voteBtn, { backgroundColor: darkMode ? '#1B3320' : '#F0FFF0' }]}>
                <Text style={{color: '#4CAF50', fontSize: 12, fontWeight: 'bold'}}>Confirm ({item.votes || 0})</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleVote(item.id, 'flags')} style={{padding: 5}}><AlertTriangle color="#FF4444" size={20} /></TouchableOpacity>
            </View>
          </View>
        )}
      />

      <GlobalSettingsModal 
        isVisible={isSettingsVisible} setVisible={setSettingsVisible} 
        theme={theme} fontSize={fontSize} adjustFontSize={adjustFontSize} 
      />

      <Modal visible={isModalVisible} animationType="slide">
        <SafeAreaView style={[styles.modal, { backgroundColor: theme.bg }]}>
          <View style={styles.modalHeader}>
            <Text style={{color: theme.text, fontSize: 24 * fontSize, fontWeight: 'bold'}}>Report Hazard</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}><X color={theme.text} size={30}/></TouchableOpacity>
          </View>
          <View style={styles.catPicker}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity key={cat} onPress={() => setSelectedCategory(cat)} style={[styles.catOpt, { borderColor: theme.border, backgroundColor: theme.input }, selectedCategory === cat && { backgroundColor: UD_BLUE, borderColor: UD_BLUE }]}>
                <Text style={{ color: selectedCategory === cat ? 'white' : theme.text, fontSize: 13 * fontSize }}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput style={[styles.input, { backgroundColor: theme.input, color: theme.text }]} placeholder="Title..." placeholderTextColor="#888" onChangeText={setNewTitle} />
          <TextInput style={[styles.input, { backgroundColor: theme.input, color: theme.text, height: 100, textAlignVertical: 'top' }]} placeholder="Description..." placeholderTextColor="#888" multiline onChangeText={setNewDesc} />
          <TouchableOpacity style={styles.button} onPress={createPost}><Text style={styles.buttonText}>Post to Flock</Text></TouchableOpacity>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loginContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1 },
  title: { fontWeight: 'bold', marginVertical: 15 },
  input: { width: '100%', padding: 15, borderRadius: 10, marginVertical: 8 },
  button: { backgroundColor: UD_BLUE, padding: 18, borderRadius: 10, width: '100%', alignItems: 'center', marginTop: 10 },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, marginHorizontal: 5, borderRadius: 20 },
  card: { padding: 15, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center' },
  cardTitle: { fontWeight: 'bold' },
  voteBtn: { marginBottom: 10, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  modal: { flex: 1, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  catPicker: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
  catOpt: { padding: 10, borderWidth: 1, borderRadius: 8, marginRight: 8, marginBottom: 8 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  settingsModal: { padding: 25, borderRadius: 20 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 20 },
  stepper: { flexDirection: 'row', alignItems: 'center' },
  stepBtn: { backgroundColor: 'rgba(0,83,155,0.1)', padding: 10, borderRadius: 10 }
});
