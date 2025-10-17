import { colors, fontSize } from '@/constants/tokens'
import { useTrackPlayerRepeatMode } from '@/hooks/useTrackPlayerRepeatMode'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import TrackPlayer, { RepeatMode } from 'react-native-track-player'
import { match } from 'ts-pattern'
import { TouchableOpacity, Text, StyleSheet, View, Animated } from 'react-native'
import { ComponentProps, useEffect, useState, useRef } from 'react'

interface PlayerButtonProps {
    iconSize?: number
}

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

const repeatOrder = [RepeatMode.Track, RepeatMode.Queue] as const

export const PlayerRepeatToggle = ({ iconSize = 30 }: PlayerButtonProps) => {
    const { repeatMode, changeRepeatMode } = useTrackPlayerRepeatMode()
    const [labelTimeout, setLabelTimeout] = useState<NodeJS.Timeout | null>(null)
    const [displayedLabel, setDisplayedLabel] = useState('')
    const fadeAnim = useRef(new Animated.Value(0)).current
    
    // Asegurar que al iniciar estemos usando uno de los modos permitidos
    useEffect(() => {
        if (repeatMode !== null && !repeatOrder.includes(repeatMode as any)) {
            changeRepeatMode(repeatOrder[1])
        }
    }, [repeatMode, changeRepeatMode])

    const showLabelWithAnimation = () => {
        // Resetear la animación
        fadeAnim.setValue(0)
        
        // Mostrar el label con animación de fade in
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true
        }).start()
    }
    
    const hideLabelWithAnimation = (callback?: () => void) => {
        // Ocultar el label con animación de fade out
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 500, // Duración más larga para el fade out
            useNativeDriver: true
        }).start(() => {
            // Callback después de que la animación termine
            if (callback) callback()
        })
    }

    const toggleRepeatMode = () => {
        if (repeatMode == null) return

        // Asegurar que el modo actual esté en nuestro repeatOrder, de lo contrario usar el primero
        let currentIndex = repeatOrder.indexOf(repeatMode as any)
        if (currentIndex === -1) {
            currentIndex = 0
        }
        
        const nextIndex = (currentIndex + 1) % repeatOrder.length
        const newRepeatMode = repeatOrder[nextIndex]

        changeRepeatMode(newRepeatMode)
        
        // Actualizar el texto de la etiqueta antes de mostrarla
        const newLabel = match(newRepeatMode)
            .returnType<string>()
            .with(RepeatMode.Track, () => 'Repetir')
            .with(RepeatMode.Queue, () => 'Una tras otra')
            .otherwise(() => '')
        
        setDisplayedLabel(newLabel)
        
        // Mostrar la etiqueta con animación
        showLabelWithAnimation()
        
        // Limpiar el timeout anterior si existe
        if (labelTimeout) {
            clearTimeout(labelTimeout)
        }
        
        // Configurar un nuevo timeout para ocultar la etiqueta después de 3 segundos
        const timeout = setTimeout(() => {
            // Ocultar con animación
            hideLabelWithAnimation(() => {
                // Limpiar el texto de la etiqueta cuando se oculta completamente
                setDisplayedLabel('')
            })
        }, 3000)
        
        setLabelTimeout(timeout)
    }

    // Limpiar el timeout al desmontar el componente
    useEffect(() => {
        return () => {
            if (labelTimeout) {
                clearTimeout(labelTimeout)
            }
        }
    }, [labelTimeout])

    const icon = match(repeatMode)
        .returnType<IconName>()
        .with(RepeatMode.Track, () => 'repeat')
        .with(RepeatMode.Queue, () => 'repeat')
        .otherwise(() => 'repeat-once')

    return (
        <View style={styles.container}>
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={toggleRepeatMode}
                style={styles.iconContainer}
            >
                <MaterialCommunityIcons
                    name={icon}
                    size={iconSize}
                    color={repeatMode === RepeatMode.Queue ? colors.icon : colors.primary}
                />
            </TouchableOpacity>
            
            {displayedLabel !== '' && (
                <Animated.Text 
                    style={[
                        styles.labelText,
                        { opacity: fadeAnim }
                    ]}
                >
                    {displayedLabel}
                </Animated.Text>
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    labelText: {
        fontSize: fontSize.xs,
        color: colors.tertiary,
        textAlign: 'center',
        marginTop: 4,
        fontFamily: 'RobotoMono-Regular',
    }
})