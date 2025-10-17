import { Stack } from 'expo-router'
import { View, Text, Platform } from 'react-native'
import { defaultStyles } from "@/styles"
import { StackScreenTopBar } from '@/constants/layout'
import { colors} from "@/constants/tokens"
import { NoInternetAlert } from "@/components/NoInternetAlert"
import { useNetworkStore } from '@/store/networkStore'
import { useAuthStore } from '@/store/authStore'
// StickyPlayer ahora se renderiza globalmente en _layout.tsx

const AuraRefactorScreenLayout = () => {
    const { isConnected } = useNetworkStore();
    const {userData} = useAuthStore()

    return (
        <View style={[defaultStyles.container, { backgroundColor: '#000000' }]}>
            <Stack>
                <Stack.Screen
                    name="index"
                    options={{
                        headerShown: true,
                        ...StackScreenTopBar,
                        title: "",
                        headerLeft: () => <View style={{ height: 60, justifyContent: 'flex-end', marginLeft: Platform.OS === 'ios' ? 28 : 24 }}>
                            <Text maxFontSizeMultiplier= {1} style={{ fontSize: 30,color: '#ffffff', fontFamily: 'Geist-SemiBold', 
							}}>
                                Aura de {(userData?.names && userData.names.trim() !== '') ? userData.names : userData?.wantToBeCalled}
                            </Text>
                        </View>,
                        headerStyle: {
                            backgroundColor: '#000000',
                        },
                    }}
                />
                <Stack.Screen
                    name="album"
                    options={{
                        headerShown: false,
                    }}
                />
            </Stack>
            {!isConnected && <NoInternetAlert />}
        </View>
    );
};

export default AuraRefactorScreenLayout