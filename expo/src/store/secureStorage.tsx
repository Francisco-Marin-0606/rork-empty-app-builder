import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

// Prefijo para las claves para evitar colisiones
const KEY_PREFIX = 'mm_storage_'

/**
 * Guarda un elemento en el almacenamiento
 * @param key Clave del elemento
 * @param value Valor a guardar (string o null para eliminar)
 */
export async function setStorageItemAsync(key: string, value: string | null) {
  const prefixedKey = KEY_PREFIX + key
  
  try {
    if (value === null) {
      await AsyncStorage.removeItem(prefixedKey)
    } else {
      await AsyncStorage.setItem(prefixedKey, value)
    }
    
    // Seguimos usando SecureStore para datos sensibles en dispositivos nativos
    // para mantener retrocompatibilidad
    if (Platform.OS !== 'web') {
      if (value === null) {
        await SecureStore.deleteItemAsync(key)
      } else {
        await SecureStore.setItemAsync(key, value)
      }
    }
  } catch (error) {
    console.error('Error storing data:', error)
  }
}

/**
 * Obtiene un elemento del almacenamiento
 * @param key Clave del elemento
 * @returns El valor almacenado o null si no existe
 */
export async function getStorageItemAsync(key: string): Promise<string | null> {
  const prefixedKey = KEY_PREFIX + key
  
  try {
    // Primero intentamos obtener del AsyncStorage
    const value = await AsyncStorage.getItem(prefixedKey)
    
    // Si no está en AsyncStorage y estamos en dispositivo nativo, intentamos SecureStore
    if (value === null && Platform.OS !== 'web') {
      return await SecureStore.getItemAsync(key)
    }
    
    return value
  } catch (error) {
    console.error('Error retrieving data:', error)
    return null
  }
}

/**
 * Elimina un elemento del almacenamiento
 * @param key Clave del elemento a eliminar
 */
export async function removeStorageItemAsync(key: string): Promise<void> {
  await setStorageItemAsync(key, null)
}

/**
 * Guarda un objeto en el almacenamiento serializándolo a JSON
 * @param key Clave del elemento
 * @param value Objeto a guardar o null para eliminar
 */
export async function setObjectAsync(key: string, value: any | null): Promise<void> {
  if (value === null) {
    await setStorageItemAsync(key, null)
  } else {
    const jsonValue = JSON.stringify(value)
    await setStorageItemAsync(key, jsonValue)
  }
}

/**
 * Obtiene un objeto del almacenamiento y lo deserializa de JSON
 * @param key Clave del elemento
 * @returns El objeto almacenado o null si no existe o hay un error
 */
export async function getObjectAsync<T>(key: string): Promise<T | null> {
  const jsonValue = await getStorageItemAsync(key)
  
  if (jsonValue === null) {
    return null
  }
  
  try {
    return JSON.parse(jsonValue) as T
  } catch (error) {
    console.error('Error parsing stored JSON:', error)
    return null
  }
}

/**
 * Limpia todos los elementos del almacenamiento con el prefijo
 */
export async function clearStorageAsync(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys()
    const appKeys = keys.filter(key => key.startsWith(KEY_PREFIX))
    await AsyncStorage.multiRemove(appKeys)
    
    // No podemos limpiar selectivamente SecureStore, pero podríamos
    // eliminar claves específicas si fuera necesario
  } catch (error) {
    console.error('Error clearing storage:', error)
  }
}
