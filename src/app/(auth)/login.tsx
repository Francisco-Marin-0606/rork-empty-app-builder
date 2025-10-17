import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { useSimpleAuthStore } from '@/store/simpleAuthStore'
import { router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { LinearGradient } from 'expo-linear-gradient'

export default function LoginScreen() {
	const { signIn } = useSimpleAuthStore()
	const [email, setEmail] = useState('')
	const [isSubmitting, setIsSubmitting] = useState(false)

	const handleLogin = async () => {
		if (!email.trim()) {
			alert('Por favor ingresa tu email')
			return
		}

		setIsSubmitting(true)
		try {
			await signIn(email)
			router.replace('/(app)/(tabs)/(audios)')
		} catch (error) {
			console.error('Error al iniciar sesión:', error)
			alert('Error al iniciar sesión')
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<View style={styles.container}>
			<StatusBar style="light" />
			<LinearGradient
				colors={['#1a1a2e', '#16213e', '#0f3460']}
				style={styles.gradient}
			>
				<KeyboardAvoidingView 
					behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
					style={styles.content}
				>
					<View style={styles.logoContainer}>
						<Text style={styles.logo}>Mental</Text>
						<Text style={styles.subtitle}>Bienvenido a tu app</Text>
					</View>

					<View style={styles.formContainer}>
						<TextInput
							style={styles.input}
							placeholder="Email"
							placeholderTextColor="#888"
							value={email}
							onChangeText={setEmail}
							keyboardType="email-address"
							autoCapitalize="none"
							autoCorrect={false}
						/>

						<TouchableOpacity
							style={[styles.button, isSubmitting && styles.buttonDisabled]}
							onPress={handleLogin}
							disabled={isSubmitting}
						>
							<Text style={styles.buttonText}>
								{isSubmitting ? 'Ingresando...' : 'Ingresar'}
							</Text>
						</TouchableOpacity>
					</View>
				</KeyboardAvoidingView>
			</LinearGradient>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#000',
	},
	gradient: {
		flex: 1,
	},
	content: {
		flex: 1,
		justifyContent: 'space-around',
		paddingHorizontal: 24,
	},
	logoContainer: {
		alignItems: 'center',
		marginTop: 60,
	},
	logo: {
		fontSize: 48,
		fontWeight: 'bold',
		color: '#fff',
		marginBottom: 8,
	},
	subtitle: {
		fontSize: 18,
		color: '#aaa',
	},
	formContainer: {
		width: '100%',
		marginBottom: 40,
	},
	input: {
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 16,
		fontSize: 16,
		marginBottom: 16,
	},
	button: {
		backgroundColor: '#4CAF50',
		borderRadius: 12,
		padding: 16,
		alignItems: 'center',
	},
	buttonDisabled: {
		backgroundColor: '#666',
	},
	buttonText: {
		color: '#fff',
		fontSize: 18,
		fontWeight: '600',
	},
})
