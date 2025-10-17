import { Stack } from "expo-router"
import { View } from "react-native"
import { defaultStyles } from "@/styles"
import { StackScreenTopBar } from '@/constants/layout'

const EventsScreenLayout = () => {
    return (<View style={defaultStyles.container}>
        <Stack>          
            <Stack.Screen name='index'             options={{
              headerShown: true,
              ...StackScreenTopBar
            }}></Stack.Screen>
        </Stack>
    </View>)

}


export default EventsScreenLayout