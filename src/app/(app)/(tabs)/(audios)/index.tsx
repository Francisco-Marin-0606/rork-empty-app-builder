import React, { useState } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView } from 'react-native'
import { useSimpleAuthStore } from '@/store/simpleAuthStore'
import { router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Headphones, Play, Settings } from 'lucide-react-native'

interface Audio {
  id: string
  title: string
  duration: string
  category: string
}

const MOCK_AUDIOS: Audio[] = [
  { id: '1', title: 'Meditación Guiada', duration: '10:30', category: 'Relajación' },
  { id: '2', title: 'Concentración Profunda', duration: '15:45', category: 'Focus' },
  { id: '3', title: 'Sueño Reparador', duration: '20:00', category: 'Sueño' },
  { id: '4', title: 'Energía Matutina', duration: '8:15', category: 'Energía' },
  { id: '5', title: 'Reducción de Estrés', duration: '12:30', category: 'Bienestar' },
]

export default function AudiosScreen() {
  const { email, signOut } = useSimpleAuthStore()
  const [selectedAudio, setSelectedAudio] = useState<string | null>(null)

  const handleLogout = async () => {
    await signOut()
    router.replace('/(auth)/login')
  }

  const renderAudioItem = ({ item }: { item: Audio }) => (
    <TouchableOpacity 
      style={[
        styles.audioCard,
        selectedAudio === item.id && styles.audioCardSelected
      ]}
      onPress={() => setSelectedAudio(item.id)}
    >
      <View style={styles.audioIconContainer}>
        <Headphones size={24} color="#4CAF50" />
      </View>
      <View style={styles.audioInfo}>
        <Text style={styles.audioTitle}>{item.title}</Text>
        <Text style={styles.audioCategory}>{item.category}</Text>
      </View>
      <View style={styles.audioMeta}>
        <Text style={styles.audioDuration}>{item.duration}</Text>
        <Play size={20} color="#666" />
      </View>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Mis Audios</Text>
          <Text style={styles.headerSubtitle}>{email}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Settings size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={MOCK_AUDIOS}
        renderItem={renderAudioItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      {selectedAudio && (
        <View style={styles.playerPreview}>
          <Text style={styles.playerText}>
            Audio seleccionado: {MOCK_AUDIOS.find(a => a.id === selectedAudio)?.title}
          </Text>
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#888',
  },
  logoutButton: {
    padding: 8,
  },
  listContainer: {
    padding: 20,
  },
  audioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  audioCardSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#1a1a1a',
  },
  audioIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1a3a1a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  audioInfo: {
    flex: 1,
  },
  audioTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  audioCategory: {
    fontSize: 14,
    color: '#888',
  },
  audioMeta: {
    alignItems: 'flex-end',
  },
  audioDuration: {
    fontSize: 14,
    color: '#888',
    marginBottom: 4,
  },
  playerPreview: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  playerText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
})
