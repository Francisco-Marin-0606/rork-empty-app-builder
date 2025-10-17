import { Stack } from "expo-router"
import { Text, View } from "react-native"
import { defaultStyles } from "@/styles"
import { StackScreenTopBar } from '@/constants/layout'
import { useHeaderStore } from '@/store/headerStore'
import { NoInternetAlert } from "@/components/NoInternetAlert"
import { useNetworkStore } from "@/store/networkStore"

const ChatRefactorScreenLayout = () => {
    const headerTitle = useHeaderStore((state) => state.headerTitle)
    const showHeader = useHeaderStore((state) => state.showHeader)
    const { isConnected } = useNetworkStore();

    return (
        <View style={defaultStyles.container}>
            <Stack>
                <Stack.Screen name='index' options={{
                    headerShown: true,
                    ...StackScreenTopBar,
                    headerTitle: () => <View style={{height: 60,  justifyContent: 'center',alignContent: 'flex-end' }}>
                        {isConnected && showHeader && <Text maxFontSizeMultiplier={1}  style={{ fontSize: 18,color: 'white', fontFamily: 'Geist-SemiBold', marginTop: 10}}>{headerTitle}</Text>}
                    </View>,
                }}></Stack.Screen>
            </Stack>
            { !isConnected && <NoInternetAlert />}
        </View>
    );
};

export default ChatRefactorScreenLayout 