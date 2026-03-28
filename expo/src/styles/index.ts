import { colors, FLOATING_PLAYER_HEIGHT, fontSize } from '@/constants/tokens'
import { usePlayerStore } from '@/store/playerStore'
import { StyleSheet, Platform, StatusBar as RNStatusBar } from 'react-native'


export const defaultStyles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: colors.screenBackground,
		
	},
	text: {
		fontSize: fontSize.base,
		color: colors.text,
	},
	androidSafeArea: {
        flex: 1,
        backgroundColor: colors.screenBackground,
        paddingTop: Platform.OS === "android" ? RNStatusBar.currentHeight : 0
    },
})

export const utilsStyles = StyleSheet.create({
	centeredRow: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
	},
	slider: {
		height: 10,
		borderRadius: 16,
	},
	itemSeparator: {
		borderColor: colors.textMuted,
		borderWidth: StyleSheet.hairlineWidth,
		opacity: 0.3,
	},
	emptyContentText: {
		...defaultStyles.text,
		color: colors.textMuted,
		textAlign: 'center',
		marginTop: 20,
	},
	emptyContentImage: {
		width: 200,
		height: 200,
		alignSelf: 'center',
		marginTop: 40,
		opacity: 0.3,
	},
})

