import ChatRefactor from "@/components/ChatRefactor"
import { colors, FLOATING_PLAYER_HEIGHT, fontSize } from "@/constants/tokens"
import { usePlayerStore } from "@/store/playerStore"
import { View, StyleSheet, SafeAreaView, ActivityIndicator, Platform } from 'react-native'
import { useNetworkStore } from "@/store/networkStore"
import { NoInternetScreen } from "@/components/NoInternetScreen"
import { Text } from "react-native"
import { useEffect, useState } from "react"
import { useAuthStore } from "@/store/authStore"
import { usePlayer } from "@/providers/PlayerProvider"
import { useSegments } from "expo-router"
import React from "react"


const MembershipExpiredView = () => (
    <View style={styles.expiredContainer}>
        <Text maxFontSizeMultiplier={1.1} style={styles.expiredTitle}>
        {/* La renovación de tu membresía está por confirmar. */}
        No tienes acceso
        </Text>
        <Text maxFontSizeMultiplier={1.1} style={styles.expiredMessage}>
        {/* En cuanto se active de nuevo podrás seguir preguntándole locuras al Mental Decoder */}
        Checa el estado de tu cuenta para acceder al Psilócogo
        </Text>
        {/* <TouchableOpacity 
            style={styles.renewButton}
            onPress={() => {
                // Navegación a renovación
            }}
        >
            <Text maxFontSizeMultiplier={1.1}  style={styles.renewButtonText}>Renovar membresía</Text>
        </TouchableOpacity> */}
    </View>
);


const ChatRefactorScreen = () => {
    const { isConnected } = useNetworkStore();
    const { checkMembershipStatus, isMembershipActive: storeMembershipActive, initialize, isLoading: authLoading } = useAuthStore();
    const [isMembershipActive, setIsMembershipActive] = useState<boolean | null>(null);
    const [isCheckingMembership, setIsCheckingMembership] = useState(true);
    const isFloatingPlayerVisible = usePlayerStore((state) => state.isFloatingPlayerVisible)
    const { current: auraCurrentTrack } = usePlayer()
    const segments = useSegments()

    useEffect(() => {

        // Check if auth is already initialized, if not wait for it
        const checkMembership = async () => {
            setIsCheckingMembership(true);
            try {
                if (authLoading) {
                    // Auth is still loading, wait for it to be fully initialized
                    return;
                }
                
                // Get membership status from store or function
                const isActive = checkMembershipStatus();
                setIsMembershipActive(isActive);
            } finally {
                setIsCheckingMembership(false);
            }
        };
        
        checkMembership();
    }, [authLoading, checkMembershipStatus]);

    // Show loading spinner while checking membership
    if (isCheckingMembership || storeMembershipActive === null) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView> 
        );
    }

    return (
         <>
        { !isConnected && <NoInternetScreen />}
        {isConnected && (
            <SafeAreaView style={styles.container}>
                <View style={[
                    styles.contentWrapper,
                    { 
                      paddingBottom: (() => {
                        // En el chat, el StickyPlayer SIEMPRE debe estar oculto
                        const shouldHideStickyPlayer = true; // Chat siempre oculta el StickyPlayer
                        
                        const auraSpace = (auraCurrentTrack && !shouldHideStickyPlayer) ? 80 : 0; // Siempre 0 en chat
                        const floatingSpace = isFloatingPlayerVisible ? FLOATING_PLAYER_HEIGHT : 0;              
                        return Math.max(auraSpace, floatingSpace);
                      })()
                    }
                ]}>
                <ChatRefactor />
                </View>
            </SafeAreaView>
        )}    
        </>
    );
    
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.screenBackground,
        paddingTop: 10,
    },
    contentWrapper: {
        paddingTop: 10,
        //paddingHorizontal: screenPadding.horizontal,
        height: '100%'
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    expiredContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24
    },
    expiredTitle: {
        fontFamily: 'Geist-SemiBold',
        letterSpacing: -0.5,
        fontSize: fontSize.lg,
        fontWeight: '600',
        color: colors.text,
        textAlign: 'center',
        marginBottom: 12,
    },
    expiredMessage: {
        fontFamily: 'Inter-Regular',
        letterSpacing: -0.5,
        fontSize: fontSize.sm,
        color: colors.textMuted,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    renewButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    renewButtonText: {
        color: colors.text,
        fontSize: fontSize.base,
        fontWeight: '600',
    }
});

export default ChatRefactorScreen; 