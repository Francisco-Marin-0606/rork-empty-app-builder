import { NoInternetAlert } from '@/components/NoInternetAlert'
import { StackScreenTopBar, SettingsButton } from '@/constants/layout'
import { useNetworkStore } from '@/store/networkStore'
import { defaultStyles } from '@/styles'
import { Stack } from 'expo-router'
import { Platform, Text, View, Dimensions } from 'react-native'

const { width: SCREEN_WIDTH } = Dimensions.get('window');



const AudiosScreenLayout = () => {
	const { isConnected } = useNetworkStore();
	
	return (
		<View style={defaultStyles.container}>
			<Stack>

				<Stack.Screen
					name="index"
					options={{
						headerShown: true,
						...StackScreenTopBar,
						title: "",
					    headerLeft: ()=><View style={{ 
							height: 60, 
							justifyContent: 'flex-end', 
							marginLeft: Platform.OS === 'ios' ? SCREEN_WIDTH * 0.07 : SCREEN_WIDTH * 0.06,
							alignItems: 'flex-start'
						}}>
						<View style={{ alignItems: 'flex-start', marginTop: !isConnected ? 40 : 0 }}>
							<Text maxFontSizeMultiplier={1} style={{ 
								fontSize: 30,
								color: 'white', 
								fontFamily: 'Geist-SemiBold', 
								textAlign: 'left'
							}}>
								{isConnected ? 'Mis hipnosis' : 'Mis descargas'}
							</Text>
							{!isConnected && (
								<Text maxFontSizeMultiplier={1} style={{ 
									color: 'white', 
									fontSize: 14, 
									fontFamily: 'Inter-Regular',
									opacity: 0.7,
									textAlign: 'left',
									flexWrap: 'nowrap',
									marginTop: 4
								}}>
									Por si tienes un vuelo, o no pagaste el wifi.
								</Text>
							)}
						</View>
                     </View>,
					headerRight: () => <SettingsButton isConnected={isConnected} />
					  }}
				/>

			</Stack>
			{ !isConnected && <NoInternetAlert />}
		</View>
	)
}

export default AudiosScreenLayout