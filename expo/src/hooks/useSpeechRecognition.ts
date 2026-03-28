
import { useState, useEffect, useCallback, useRef } from 'react'
import { Alert, Linking, Platform } from 'react-native'
import Voice, { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice'
import { openSettings } from 'expo-linking'
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions'

const showDeniedAlert = (msg = 'Ve a Configuración para darle acceso a la app.') =>
  Alert.alert('Permiso requerido', msg, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Abrir Configuración', onPress: () => (Linking.openSettings?.() ?? openSettings()) },
  ])

async function ensureSTTPermissions(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    const need = [PERMISSIONS.IOS.MICROPHONE, PERMISSIONS.IOS.SPEECH_RECOGNITION]
    for (const p of need) {
      let s = await check(p)
      if (s === RESULTS.DENIED) s = await request(p)
      if (s === RESULTS.BLOCKED || s === RESULTS.LIMITED) {
        showDeniedAlert('Activa Micrófono y Reconocimiento de voz en Ajustes.')
        return false
      }
      if (s !== RESULTS.GRANTED) return false
    }
    return true
  } else {
    // Android: solo RECORD_AUDIO
    let s = await check(PERMISSIONS.ANDROID.RECORD_AUDIO)
    if (s === RESULTS.DENIED) s = await request(PERMISSIONS.ANDROID.RECORD_AUDIO)
    if (s === RESULTS.BLOCKED) {
      showDeniedAlert('Activa el Micrófono en Ajustes.')
      return false
    }
    return s === RESULTS.GRANTED
  }
}

type UseSpeechRecognitionOptions = { registerListeners?: boolean }

export function useSpeechRecognition(options: UseSpeechRecognitionOptions = {}) {
  const { registerListeners = true } = options
  // text = resultado FINAL; partialText = resultado PARCIAL en vivo
  const [text, setText] = useState('')
  const [partialText, setPartialText] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSupported, setIsSupported] = useState(true)

  const startingRef = useRef(false)     // evita starts simultáneos
  const isListeningRef = useRef(false)

  useEffect(() => { isListeningRef.current = isListening }, [isListening])

  const normalizeRecognized = useCallback((input: string): string => {
    if (!input) return ''
    let s = input.replace(/\s+/g, ' ').trim()
    const words = s.split(' ')
    // Eliminar repetición de frase al final (A ... A)
    for (let k = Math.min(12, Math.floor(words.length / 2)); k >= 1; k--) {
      const prev = words.slice(-2 * k, -k).join(' ').toLowerCase()
      const last = words.slice(-k).join(' ').toLowerCase()
      if (prev && prev === last) {
        s = words.slice(0, words.length - k).join(' ')
        break
      }
    }
    // Colapsar palabras consecutivas duplicadas
    s = s.replace(/\b(\w+)(?:\s+\1\b)+/gi, '$1')
    return s.trim()
  }, [])

  // Listeners: registrar una vez
  useEffect(() => {
    if (!registerListeners) {
      // Si no se deben registrar listeners (p.ej., componentes que delegan control),
      // evitar suscripciones para no duplicar callbacks globales.
      return () => {}
    }
    // Asegurar que no queden listeners colgados tras reinicios/calientes
    try { Voice.removeAllListeners?.() } catch { /* noop */ }
    Voice.onSpeechStart = () => { setIsListening(true); setError(null); setText(''); setPartialText('') }
    Voice.onSpeechEnd = () => { setIsListening(false) }
    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      if (!isListeningRef.current) return
      const v = e.value?.[0]
      if (v) { setText(normalizeRecognized(v)) }
    }
    Voice.onSpeechPartialResults = (e: SpeechResultsEvent) => {
      if (!isListeningRef.current) return
      const v = e.value?.[0]
      if (v) setPartialText(normalizeRecognized(v))
    }
    Voice.onSpeechError = (e: SpeechErrorEvent) => {
      setIsListening(false)
      const m = e.error?.message || 'Error en reconocimiento de voz'
      setError(m)
      if (/denied|permission|authorized|User denied/i.test(m)) showDeniedAlert()
    }
    return () => { Voice.destroy().catch(() => {}); try { Voice.removeAllListeners?.() } catch { /* noop */ } }
  }, [normalizeRecognized, registerListeners])

  const stopListening = useCallback(async () => {
    if (!isListeningRef.current) return
    try { await Voice.stop() } catch { /* noop */ }
    setIsListening(false)
  }, [])

  const startListening = useCallback(async (locale: string = 'es-CL') => {
    if (startingRef.current || isListeningRef.current) return
    startingRef.current = true
    setError(null); setText(''); setPartialText('')

    try {
      const granted = await ensureSTTPermissions()
      if (!granted) { setIsSupported(false); return }

      const available = await Voice.isAvailable().catch(() => false)
      setIsSupported(!!available)
      if (!available) { setError('Reconocimiento de voz no disponible'); return }

      await Voice.start(locale, { EXTRA_PARTIAL_RESULTS: true })
      // isListening se activa en onSpeechStart
    } catch (e: any) {
      setError(e?.message ?? String(e))
      // Fallback simple a en-US si falla por locale
      if (!isListeningRef.current) {
        try { await Voice.start('en-US', { EXTRA_PARTIAL_RESULTS: true }) } catch { /* noop */ }
      }
    } finally {
      startingRef.current = false
    }
  }, [])

  const resetText = useCallback(() => { setText(''); setPartialText('') }, [])

  return { text, partialText, isListening, isSupported, error, startListening, stopListening, resetText }
}