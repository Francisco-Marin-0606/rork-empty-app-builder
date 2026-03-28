# Screen Capture Detection & Blocking

Este módulo implementa la detección y bloqueo de grabación de pantalla para proteger el contenido de hipnosis en la aplicación.

## Funcionalidades

### iOS
- **Detección en tiempo real**: Detecta cuando la pantalla está siendo grabada o duplicada (AirPlay)
- **Auto-pausa**: Pausa automáticamente el audio cuando se detecta grabación
- **Modal de aviso**: Muestra un modal informativo al usuario
- **Restauración automática**: El modal se oculta cuando se detiene la grabación

### Android
- **Bloqueo preventivo**: Usa FLAG_SECURE para bloquear capturas de pantalla y grabaciones
- **Sin detección en tiempo real**: Android no proporciona APIs públicas para detectar grabación

## Uso

### Hooks disponibles

#### `useAutoPauseOnCapture(pauseFn)`
Hook principal para iOS que maneja la detección y auto-pausa.

```tsx
import { useAutoPauseOnCapture } from '../hooks/useAutoPauseOnCapture';

const pauseFn = useCallback(async () => {
  await audioPlayer.pause();
}, []);

const { isVisible, hide } = useAutoPauseOnCapture(pauseFn);
```

#### `useBlockCaptureAndroid()`
Hook para Android que activa el bloqueo de capturas.

```tsx
import { useBlockCaptureAndroid } from '../hooks/useBlockCaptureAndroid';

// Activar en el componente principal o en pantallas específicas
useBlockCaptureAndroid();
```

### Componentes

#### `CaptureBlockerModal`
Modal reutilizable que muestra el aviso de grabación detectada.

```tsx
import { CaptureBlockerModal } from '../components/CaptureBlockerModal';

<CaptureBlockerModal visible={isVisible} onClose={hide} />
```

### Ejemplos de integración

#### Con expo-av
```tsx
import HipnosisPlayerExpoAV from '../examples/HipnosisPlayerExpoAV';

// Usar directamente el componente
<HipnosisPlayerExpoAV />
```

#### Con react-native-track-player
```tsx
import HipnosisPlayerTrack from '../examples/HipnosisPlayerTrack';

// Usar directamente el componente
<HipnosisPlayerTrack />
```

## Implementación técnica

### Módulo nativo iOS
- `ScreenRecordingDetector.swift`: Módulo principal que usa `UIScreen.main.isCaptured`
- `ScreenRecordingDetector.m`: Bridge Objective-C para React Native
- Escucha `UIScreen.capturedDidChangeNotification` para cambios en tiempo real

### Dependencias
- `expo-screen-capture`: Bloqueo Android y iOS
- `expo-av`: Ejemplo de reproductor de audio

## Consideraciones

### Comportamiento esperado
1. **iOS**: Al iniciar grabación → audio se pausa + modal aparece
2. **iOS**: Al detener grabación → modal desaparece automáticamente
3. **Android**: Capturas y grabaciones bloqueadas preventivamente
4. **Ambos**: El usuario debe reanudar manualmente el audio después de detener la grabación

### Limitaciones
- **Android**: No hay detección en tiempo real, solo bloqueo preventivo
- **iOS**: También detecta duplicación de pantalla (AirPlay) como "captura"
- **Grabaciones avanzadas**: Algunas herramientas de grabación pueden evadir estas protecciones

## Instalación

1. Instalar dependencias:
```bash
npx expo install expo-screen-capture expo-av
```

2. El plugin de Expo `./plugins/withScreenRecordingDetector` se ejecuta automáticamente durante el build y genera los archivos nativos necesarios en `ios/Mental/`.

3. Compilar:
```bash
npm run ios
npm run android
```

**Nota importante:** Los archivos nativos se generan automáticamente por el plugin de Expo y no deben editarse manualmente, ya que la carpeta `ios/` está en `.gitignore` y se regenera en cada build.

## Testing

### iOS
1. Abrir la app en simulador o dispositivo
2. Iniciar grabación de pantalla (Control Center)
3. Verificar que el audio se pausa y aparece el modal
4. Detener grabación y verificar que el modal desaparece

### Android
1. Intentar tomar captura de pantalla → debe estar bloqueada
2. Intentar grabar pantalla → debe estar bloqueada
3. La pantalla debe aparecer negra en las capturas