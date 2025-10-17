import { Stack } from 'expo-router'
import { View} from 'react-native'
import { defaultStyles } from "@/styles"
import { NoInternetAlert } from "@/components/NoInternetAlert"
import { useNetworkStore } from '@/store/networkStore'

const AuraRefactorScreenLayout = () => {
    const { isConnected } = useNetworkStore();
   
    return (
        <View style={defaultStyles.container}>
            <Stack>
                <Stack.Screen
                    name="index"
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