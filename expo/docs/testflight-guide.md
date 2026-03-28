# Guía Completa para TestFlight en iOS - App Mental

## 📱 Información General de la App

- **Nombre de la App**: Mental
- **Bundle ID**: `com.mentalmagnet.mentalMagnetAppios`
- **Apple Team ID**: `8L497B766X` (configurado en app.json)
- **Apple ID para EAS Submit**: `ejemplo@gmail.com` (Cuenta personal del usuario)
- **ASC App ID**: `6474561950`
- **Apple Team ID para Submit**: `DWG6432ZV5` (ID de apple Team)
- **Versión Actual**: 3.1.70
- **Build Number**: 299

## Verificar el archivo eas.json del proyecto ya creado con todos los campos correspondientes ya configurados.

## 🛠️ Prerrequisitos

### 1. Herramientas Necesarias
- [EAS CLI](https://docs.expo.dev/build/setup/) instalado globalmente
- Cuenta de Apple Developer activa
- Acceso al proyecto en Expo/EAS
- Node.js y npm instalados

### 2. Configuración Inicial
```bash
# Instalar EAS CLI si no está instalado
npm install -g @expo/eas-cli

# Iniciar sesión en EAS
eas login

# Configurar el proyecto (si es necesario)
eas build:configure
```

## 🚀 Proceso de TestFlight

### Paso 1: Preparar el Build

#### 1.1 Verificar Configuración
Antes de crear el build, verifica que la configuración esté correcta:

- **Versión**: Actualizar en `app.json` si es necesario
- **Build Number**: Incrementar en `app.json` (iOS buildNumber)
- **Configuración de TestFlight**: Ya configurada en `eas.json`

#### 1.2 Crear el Build para TestFlight
```bash
# Crear build para TestFlight
eas build --platform ios --profile testflight

# O si quieres especificar el canal
eas build --platform ios --profile testflight --channel testflight
```

### Paso 2: Monitorear el Build

#### 2.1 Verificar Estado del Build
```bash
# Ver builds recientes
eas build:list

# Ver detalles de un build específico
eas build:view [BUILD_ID]
```

#### 2.2 Descargar el Build (Opcional)
```bash
# Descargar el build una vez completado
eas build:download [BUILD_ID]
```

### Paso 3: Subir a TestFlight

#### 3.1 Subir Automáticamente con EAS Submit
```bash
# Subir el último build a TestFlight
eas submit --platform ios --profile testflight

# O subir un build específico
eas submit --platform ios --profile testflight --id [BUILD_ID]
```

#### 3.2 Subir Manualmente (Alternativa)
Si prefieres subir manualmente:

1. Descarga el archivo `.ipa` del build
2. Abre Xcode
3. Ve a **Window > Organizer**
4. Arrastra el archivo `.ipa` a la sección de archivos
5. Selecciona **Distribute App**
6. Elige **App Store Connect**
7. Sigue el asistente

### Paso 4: Configurar en App Store Connect

#### 4.1 Acceder a App Store Connect
1. Ve a [App Store Connect](https://appstoreconnect.apple.com)
2. Inicia sesión con la cuenta de Apple Developer
3. Selecciona la app **Mental**

#### 4.2 Procesar el Build
1. Ve a **TestFlight** en el menú lateral
2. Selecciona la versión correspondiente
3. El build aparecerá en "Builds" después de unos minutos
4. Una vez procesado, aparecerá como "Ready to Test"

#### 4.3 Configurar Información de TestFlight
1. **Información de la App**:
   - Título: Mental
   - Descripción: [Descripción de la app]
   - Palabras clave: [Palabras clave relevantes]

2. **Notas de la Versión**:
   - Incluir cambios y mejoras de la versión
   - Instrucciones específicas para los testers

3. **Configuración de Testing**:
   - Duración del test: 90 días (máximo)
   - Límite de testers: 10,000 (máximo)

### Paso 5: Invitar Testers

#### 5.1 Testers Internos
1. Ve a **TestFlight > Internal Testing**
2. Crea un grupo de testers internos
3. Agrega emails de los testers internos
4. Asigna el build al grupo
5. Envía invitaciones

#### 5.2 Testers Externos
1. Ve a **TestFlight > External Testing**
2. Crea un grupo de testers externos
3. Agrega emails de los testers externos
4. Asigna el build al grupo
5. Envía invitaciones

## 🔧 Configuración Técnica

### Configuración de EAS (eas.json)
```json
{
  "build": {
    "testflight": {
      "distribution": "store",
      "channel": "testflight",
      "ios": {
        "buildConfiguration": "Release"
      },
      "env": {
        "EXPO_PUBLIC_UPDATE_CHANNEL": "testflight"
      },
      "extends": "production"
    }
  },
  "submit": {
    "testflight": {
      "ios": {
        "appleId": "agubolso2@gmail.com",
        "ascAppId": "6474561950",
        "appleTeamId": "DWG6432ZV5"
      }
    }
  }
}
```

### Configuración de la App (app.json)
- **Bundle Identifier**: `com.mentalmagnet.mentalMagnetAppios`
- **Apple Team ID**: `8L497B766X`
- **Privacy Manifests**: Configurados para cumplir con los requisitos de Apple
- **Entitlements**: Configurados para notificaciones push y grupos de apps

## 📋 Checklist Pre-Build

- [ ] Verificar que la versión esté actualizada en `app.json`
- [ ] Incrementar el build number
- [ ] Verificar que todas las dependencias estén actualizadas
- [ ] Ejecutar `npm run lint` para verificar el código
- [ ] Probar la app localmente
- [ ] Verificar que los assets estén correctos
- [ ] Revisar la configuración de privacidad
- [ ] Verificar que los certificados estén válidos

## 🚨 Solución de Problemas Comunes

### Error: "No matching provisioning profile found"
```bash
# Limpiar y regenerar certificados
eas credentials:clear --platform ios
eas build --platform ios --profile testflight --clear-cache
```

### Error: "Build failed"
1. Verificar logs del build en EAS
2. Revisar configuración de `eas.json`
3. Verificar que todas las dependencias sean compatibles
4. Limpiar cache: `eas build --clear-cache`

### Error: "Upload failed"
1. Verificar credenciales de Apple ID
2. Verificar que el Apple Team ID sea correcto
3. Verificar que la app exista en App Store Connect

### Build procesando por mucho tiempo
- Los builds pueden tardar hasta 2 horas en procesarse
- Verificar el estado en App Store Connect
- Contactar soporte de Apple si excede las 2 horas

## 📊 Monitoreo y Métricas

### En App Store Connect
- **Instalaciones**: Número de testers que instalaron la app
- **Crashes**: Reportes de crashes durante el testing
- **Feedback**: Comentarios de los testers
- **Métricas de uso**: Tiempo de uso, pantallas más visitadas

### En EAS
- **Tiempo de build**: Duración del proceso de build
- **Tamaño del build**: Tamaño del archivo final
- **Logs de build**: Información detallada del proceso

## 🔄 Flujo de Trabajo Recomendado

1. **Desarrollo**: Trabajar en la rama `release`
2. **Testing Local**: Probar cambios localmente
3. **Build**: Crear build con `eas build --platform ios --profile testflight`
4. **Submit**: Subir a TestFlight con `eas submit --platform ios --profile testflight`
5. **Testing**: Invitar testers y recopilar feedback
6. **Iteración**: Hacer cambios basados en feedback
7. **Release**: Una vez aprobado, proceder con el release a producción

## 📞 Contacto y Soporte

- **EAS Support**: [Expo Documentation](https://docs.expo.dev/)
- **Apple Developer Support**: [Apple Developer Support](https://developer.apple.com/support/)
- **TestFlight Support**: [TestFlight Documentation](https://developer.apple.com/testflight/)

## 📝 Notas Importantes

1. **Privacidad**: La app incluye Privacy Manifests configurados para cumplir con los requisitos de Apple
2. **Notificaciones**: Configuradas con OneSignal y extensiones de notificación
3. **Analytics**: Integrado con AppsFlyer para tracking
4. **Monitoreo**: Sentry configurado para crash reporting
5. **Updates**: Expo Updates configurado para actualizaciones OTA

---

*Última actualización: $(date)*
*Versión de la documentación: 1.0*
