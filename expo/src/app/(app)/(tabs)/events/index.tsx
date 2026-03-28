import EventosList from "@/components/EventList"
import { colors, FLOATING_PLAYER_HEIGHT, fontSize } from "@/constants/tokens"
import { StreamingEventsService } from "@/services/api/streamingEventsService"
import { usePlayerStore } from "@/store/playerStore"
import { useFocusEffect } from "expo-router"
import { useCallback, useState } from "react"
import { View, StyleSheet, RefreshControl, ScrollView } from 'react-native'
import { debounce } from 'lodash'
import { useNetworkStore } from "@/store/networkStore"
import { Error } from "@/components/Error"
import { NoInternetScreen } from "@/components/NoInternetScreen"
import { defaultStyles } from "@/styles"

const EventsScreen = () => {
    const [events, setEvents] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState("")
    const [refreshing, setRefreshing] = useState(false)

    const isFloatingPlayerVisible = usePlayerStore((state) => state.isFloatingPlayerVisible)
    const { isConnected } = useNetworkStore()

    const fetchEvents = useCallback(async () => {
        try {
            setError('')
            setIsLoading(true)
            const data = await StreamingEventsService.getStreamingEvents()
            setEvents(data)
        } catch (error) {
            setError("No pudimos cargar los eventos. Por favor, intenta de nuevo.")
            console.error("Error fetching events:", error)
        } finally {
            setIsLoading(false)
        }
    }, [])

    const debouncedFetch = useCallback(
        debounce(() => {
            fetchEvents()
        }, 300),
        [fetchEvents]
    )

    const onRefresh = useCallback(async () => {
        setRefreshing(true)
        await fetchEvents()
        setRefreshing(false)
    }, [fetchEvents])

    useFocusEffect(
        useCallback(() => {
            debouncedFetch()

            return () => {
                debouncedFetch.cancel()
            }
        }, [debouncedFetch])
    )

    return (
        <View style={[
            defaultStyles.container,
        ]}>
            {isConnected && <ScrollView
                style={[
                    styles.scrollView,
                    { backgroundColor: colors.screenBackground }
                ]}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.text || '#FF9F40'}
                    />
                }
            >

                <View
                    style={[{
                        flex: 1,
                        paddingBottom: isFloatingPlayerVisible ? FLOATING_PLAYER_HEIGHT : 0
                    }]}
                >
                    {error ? (
                        <Error title="No pudimos cargar los eventos" description="Porfavor, intenta de nuevo." />
                    ) : (
                        <EventosList events={events} />
                    )}
                </View>


            </ScrollView>}
            {!isConnected && <NoInternetScreen />}
        </View>

    )
}

const styles = StyleSheet.create({
    scrollView: {
        flex: 1,
    },
    container: {
        flex: 1,
        backgroundColor: colors.screenBackground,
    },
    contentContainer: {
        paddingHorizontal: 0
    },
    buttonContainer: {
        marginTop: 12,
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#eceded',
        justifyContent: 'flex-start',
        height: 60
    },
    logoutButton: {
        marginTop: 12,
        borderWidth: 1,
        borderColor: '#eceded',
    },
    errorContainer: {
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center'
    },
    errorText: {
        color: colors.error,
        textAlign: 'center'
    },
    title: {
        fontSize: fontSize.lg,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 8,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    description: {
        fontSize: fontSize.sm,
        color: colors.textMuted,
        marginBottom: 24,
        textAlign: 'center',
        paddingHorizontal: 20,
    }
})

export default EventsScreen