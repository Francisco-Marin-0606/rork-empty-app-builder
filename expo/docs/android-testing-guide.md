# Guía Completa para Testing de Android - App Mental

## 📱 Información General de la App

- **Nombre de la App**: Mental
- **Package Name**: `com.mentalmagnet.mentalMagnetApp`
- **Application ID**: `com.mentalmagnet.mentalMagnetApp`
- **Versión Actual**: 3.1.70
- **Version Code**: 1 (configurado en build.gradle)
- **Version Name**: 3.1.22 (configurado en build.gradle)
- **Target SDK**: 35
- **Min SDK**: Configurado en gradle.properties

## 🛠️ Prerrequisitos

### 1. Herramientas Necesarias
- [EAS CLI](https://docs.expo.dev/build/setup/) instalado globalmente
- Cuenta de Google Play Console (para testing externo)
- Cuenta de Firebase (opcional, para Firebase App Distribution)
- Node.js y npm instalados
- Android Studio (opcional, para debugging local)

### 2. Configuración Inicial
```bash
# Instalar EAS CLI si no está instalado
npm install -g @expo/eas-cli

# Iniciar sesión en EAS
eas login

# Configurar el proyecto (si es necesario)
eas build:configure
```

## 🚀 Opciones de Testing para Android

### Opción 1: APK para Testing Interno (Recomendado para desarrollo)

#### 1.1 Crear APK de Desarrollo
```bash
# Crear APK para testing interno
eas build --platform android --profile preview

# O crear APK de producción
eas build --platform android --profile production-apk
```

#### 1.2 Distribuir APK
1. **Descargar el APK**:
   ```bash
   # Descargar el build una vez completado
   eas build:download [BUILD_ID]
   ```

2. **Métodos de distribución**:
   - **Email**: Enviar el archivo APK por email
   - **Google Drive/Dropbox**: Subir y compartir enlace
   - **Slack/Teams**: Compartir en canales internos
   - **Firebase App Distribution**: Para distribución más profesional

### Opción 2: Google Play Console (Testing Interno/Externo)

#### 2.1 Configurar Google Play Console
1. Acceder a [Google Play Console](https://play.google.com/console)
2. Crear o seleccionar la app "Mental"
3. Configurar información básica de la app

#### 2.2 Crear Build para Google Play
```bash
# Crear AAB (Android App Bundle) para Google Play
eas build --platform android --profile production

# O si quieres especificar el canal
eas build --platform android --profile production --channel production
```

#### 2.3 Subir a Google Play Console
```bash
# Subir automáticamente a Google Play Console
eas submit --platform android --profile production

# O subir un build específico
eas submit --platform android --profile production --id [BUILD_ID]
```

#### 2.4 Configurar Testing en Google Play Console

**Testing Interno**:
1. Ve a **Testing > Internal testing**
2. Crea una nueva release
3. Sube el AAB generado
4. Agrega notas de la versión
5. Invita testers internos por email

**Testing Cerrado (Externo)**:
1. Ve a **Testing > Closed testing**
2. Crea un grupo de testers
3. Agrega emails de testers externos
4. Sube el AAB
5. Envía invitaciones

### Opción 3: Firebase App Distribution (Recomendado para equipos)

#### 3.1 Configurar Firebase
1. Ir a [Firebase Console](https://console.firebase.google.com)
2. Crear proyecto o seleccionar existente
3. Agregar app Android
4. Descargar `google-services.json`
5. Configurar en el proyecto

#### 3.2 Instalar Firebase CLI
```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Iniciar sesión
firebase login

# Inicializar proyecto
firebase init appdistribution
```

#### 3.3 Distribuir APK via Firebase
```bash
# Distribuir APK a testers
firebase appdistribution:distribute path/to/app.apk \
  --app YOUR_APP_ID \
  --groups "testers" \
  --release-notes "Nueva versión con mejoras"
```

## 🔧 Configuración Técnica

### Configuración de EAS (eas.json)
```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "channel": "preview",
      "android": {
        "buildType": "apk"
      },
      "ios": {
        "simulator": true
      }
    },
    "production": {
      "autoIncrement": true,
      "channel": "production"
    },
    "production-apk": {
      "autoIncrement": true,
      "channel": "production",
      "android": {
        "buildType": "apk"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

### Configuración de la App (app.json)
- **Package Name**: `com.mentalmagnet.mentalMagnetApp`
- **Permissions**: Configuradas en `android.permissions`
- **Intent Filters**: Configurados para deep linking
- **Adaptive Icon**: Configurado con logo de la app

### Configuración de Android (build.gradle)
- **Application ID**: `com.mentalmagnet.mentalMagnetApp`
- **Version Code**: 1
- **Version Name**: 3.1.22
- **Target SDK**: 35
- **Min SDK**: Configurado en gradle.properties

## 📋 Checklist Pre-Build

- [ ] Verificar que la versión esté actualizada en `app.json`
- [ ] Incrementar el version code en `build.gradle` si es necesario
- [ ] Verificar que todas las dependencias estén actualizadas
- [ ] Ejecutar `npm run lint` para verificar el código
- [ ] Probar la app localmente
- [ ] Verificar que los assets estén correctos
- [ ] Revisar permisos de Android
- [ ] Verificar configuración de signing

## 🚨 Solución de Problemas Comunes

### Error: "No matching signing key found"
```bash
# Limpiar y regenerar credenciales
eas credentials:clear --platform android
eas build --platform android --profile preview --clear-cache
```

### Error: "Build failed"
1. Verificar logs del build en EAS
2. Revisar configuración de `eas.json`
3. Verificar que todas las dependencias sean compatibles
4. Limpiar cache: `eas build --clear-cache`

### Error: "Upload failed"
1. Verificar credenciales de Google Play Console
2. Verificar que la app exista en Google Play Console
3. Verificar que el package name coincida

### APK no se instala en dispositivo
1. Verificar que el dispositivo permita instalación de fuentes desconocidas
2. Verificar que el APK sea compatible con la versión de Android
3. Verificar que no haya conflictos con versiones anteriores

## 📊 Monitoreo y Métricas

### En Google Play Console
- **Instalaciones**: Número de testers que instalaron la app
- **Crashes**: Reportes de crashes durante el testing
- **Feedback**: Comentarios de los testers
- **Métricas de uso**: Tiempo de uso, pantallas más visitadas

### En Firebase App Distribution
- **Instalaciones**: Número de testers que instalaron
- **Crashes**: Reportes de crashes en tiempo real
- **Feedback**: Comentarios y screenshots de testers
- **Métricas de rendimiento**: Tiempo de carga, memoria

### En EAS
- **Tiempo de build**: Duración del proceso de build
- **Tamaño del build**: Tamaño del archivo final
- **Logs de build**: Información detallada del proceso

## 🔄 Flujo de Trabajo Recomendado

### Para Testing Interno (Desarrollo)
1. **Desarrollo**: Trabajar en la rama `release`
2. **Testing Local**: Probar cambios localmente
3. **Build APK**: Crear APK con `eas build --platform android --profile preview`
4. **Distribución**: Compartir APK con el equipo
5. **Feedback**: Recopilar comentarios del equipo
6. **Iteración**: Hacer cambios basados en feedback

### Para Testing Externo (Pre-release)
1. **Build AAB**: Crear AAB con `eas build --platform android --profile production`
2. **Google Play Console**: Subir a testing cerrado
3. **Testing**: Invitar testers externos
4. **Feedback**: Recopilar comentarios
5. **Release**: Una vez aprobado, proceder con el release

## 📱 Configuración de Dispositivos para Testing

### Configuración de Android
1. **Habilitar Opciones de Desarrollador**:
   - Ir a Configuración > Acerca del teléfono
   - Tocar 7 veces en "Número de compilación"

2. **Habilitar Instalación de Fuentes Desconocidas**:
   - Configuración > Seguridad > Instalar apps desconocidas
   - Habilitar para la fuente que usarás (Chrome, Gmail, etc.)

3. **Habilitar USB Debugging** (para testing local):
   - Configuración > Opciones de desarrollador
   - Habilitar "Depuración USB"

### Testing en Diferentes Dispositivos
- **Emuladores**: Usar Android Studio para testing en diferentes versiones
- **Dispositivos Físicos**: Probar en diferentes marcas y versiones de Android
- **Diferentes Resoluciones**: Probar en tablets y teléfonos

## 🔐 Configuración de Seguridad

### Signing de la App
- **Debug**: Usa keystore de debug (automático)
- **Release**: Usa keystore de producción (configurado en EAS)

### Permisos de Android
La app requiere los siguientes permisos:
- `INTERNET`: Para conexión de red
- `ACCESS_NETWORK_STATE`: Para verificar estado de red
- `RECORD_AUDIO`: Para grabación de audio
- `READ_EXTERNAL_STORAGE`: Para acceso a archivos
- `WRITE_EXTERNAL_STORAGE`: Para guardar archivos
- `VIBRATE`: Para vibración
- `BILLING`: Para compras in-app

## 📞 Contacto y Soporte

- **EAS Support**: [Expo Documentation](https://docs.expo.dev/)
- **Google Play Support**: [Google Play Console Help](https://support.google.com/googleplay/android-developer/)
- **Firebase Support**: [Firebase Documentation](https://firebase.google.com/docs)

## 📝 Notas Importantes

1. **APK vs AAB**: 
   - APK: Para testing interno, más fácil de distribuir
   - AAB: Para Google Play Store, mejor optimización

2. **Versioning**: 
   - Version Code: Debe incrementarse con cada build
   - Version Name: Versión visible para usuarios

3. **Testing**: 
   - Siempre probar en dispositivos reales
   - Probar en diferentes versiones de Android
   - Verificar que todas las funcionalidades trabajen

4. **Distribución**: 
   - APK: Más rápido para testing interno
   - Google Play Console: Más profesional para testing externo
   - Firebase App Distribution: Mejor para equipos grandes

---

*Última actualización: $(date)*
*Versión de la documentación: 1.0*
