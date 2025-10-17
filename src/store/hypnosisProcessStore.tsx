import { create } from 'zustand'
import { OneSignal } from 'react-native-onesignal'

// Función para calcular progreso REAL basado en progreso del backend + tiempo como backup
const calculateRealProgress = (
	startDate: Date,
	publicationDate: Date,
	backendProgress?: number,
): number => {
	// SI HAY PROGRESO DEL BACKEND, USARLO CON PRIORIDAD
	if (backendProgress !== undefined && backendProgress > 0) {
		console.log(`[Progress] Usando progreso del backend: ${backendProgress}%`)
		return backendProgress / 100 // Convertir a 0-1
	}

	// Solo usar cálculo temporal si NO hay progreso del backend o es 0
	const PROCESSING_PERIOD_MS = 24 * 60 * 60 * 1000 // 24 horas en milisegundos
	const now = new Date()

	// Calcular tiempo transcurrido desde que se inició el proceso
	const elapsedTime = now.getTime() - startDate.getTime()

	// Calcular tiempo total del proceso (de inicio a publicación)
	const totalTime = publicationDate.getTime() - startDate.getTime()

	// Si la fecha de publicación es posterior a ahora, usar el tiempo hasta publicación
	if (publicationDate > now) {
		const progressByTime = elapsedTime / totalTime
		// Limitar el progreso temporal máximo a 90% si no hay progreso del backend
		const maxProgressWithoutBackend = 0.9
		const finalProgress = Math.min(progressByTime, maxProgressWithoutBackend)
		console.log(
			`[Progress] Progreso temporal limitado: ${Math.round(finalProgress * 100)}% (máx: 90%)`,
		)
		return finalProgress
	}

	// Si ya pasó la fecha de publicación, devolver 95% pero NO 100%
	// Solo el backend puede confirmar 100%
	const almostComplete = 0.95
	console.log(
		`[Progress] Fecha publicación pasada, pero backend no confirma. Progreso: ${Math.round(almostComplete * 100)}%`,
	)
	return almostComplete
}

export interface HypnosisProcessData {
	id: string
	audioRequestId: string
	title: string
	subtitle: string
	progress: number // 0-1
	timeRemaining?: string
	imageUrl?: string
	estimatedCompletionTime?: Date
	startTime: Date
	// Campos adicionales para progreso real
	backendProgress?: number
	publicationDate?: string
	audioRequestData?: any // Datos completos del audio request del backend
}

interface HypnosisProcessState {
	// Estado de proceso activo
	activeProcess: HypnosisProcessData | null
	isCollapsed: boolean

	// Configuración
	isEnabled: boolean

	// Acciones
	startProcess: (processData: HypnosisProcessData) => void
	updateProgress: (progress: number, timeRemaining?: string) => void
	completeProcess: () => void
	dismissProcess: () => void
	setCollapsed: (collapsed: boolean) => void
	setEnabled: (enabled: boolean) => void

	// Simulación para testing
	startSimulation: (title: string) => void
	stopSimulation: () => void
}

export const useHypnosisProcessStore = create<HypnosisProcessState>((set, get) => ({
	activeProcess: null,
	isCollapsed: false,
	isEnabled: true,

	startProcess: (processData: HypnosisProcessData) => {
		// ⚠️ LIMPIAR CUALQUIER INTERVAL ANTERIOR ANTES DE CREAR NUEVO
		const { activeProcess } = get()

		// 🛡️ PREVENIR MÚLTIPLES PROCESOS SIMULTÁNEOS
		if (activeProcess && activeProcess.audioRequestId === processData.audioRequestId) {
			console.log('[HypnosisProcess] Proceso ya existe para este audioRequestId, ignorando')
			return
		}

		if (activeProcess) {
			console.log('[HypnosisProcess] Limpiando proceso anterior antes de iniciar nuevo')
			if ((activeProcess as any).backendProgressInterval) {
				clearInterval((activeProcess as any).backendProgressInterval)
			}
		}

		set({
			activeProcess: processData,
			isCollapsed: true, // Comenzar colapsado
		})

		console.log('[HypnosisProcess] Proceso iniciado con PROGRESO REAL:', processData.title)

		// Usar progreso real basado en fechas reales
		const startTime = processData.startTime || new Date()
		const estimatedEnd =
			processData.estimatedCompletionTime || new Date(Date.now() + 24 * 60 * 60 * 1000)
		const backendProgress = processData.backendProgress || 0

		// Calcular progreso real inmediato incluyendo progreso del backend
		const realProgress = calculateRealProgress(startTime, estimatedEnd, backendProgress)
		console.log(`[HypnosisProcess] Progreso REAL inicial: ${Math.round(realProgress * 100)}%`)
		console.log(`[HypnosisProcess] Progreso del backend: ${Math.round(backendProgress * 100)}%`)
		console.log(`[HypnosisProcess] Tiempo de inicio: ${startTime.toISOString()}`)
		console.log(`[HypnosisProcess] Tiempo estimado de finalización: ${estimatedEnd.toISOString()}`)

		// Actualizar progreso inicial
		if (processData.id) {
			get().updateProgress(realProgress)
		}

		// ✅ VERIFICAR PROGRESO DEL BACKEND PERIÓDICAMENTE (SOLO UNO)
		const backendProgressInterval = setInterval(async () => {
			const { activeProcess } = get()
			if (!activeProcess) {
				console.log('[HypnosisProcess] No hay proceso activo, limpiando interval')
				clearInterval(backendProgressInterval)
				return
			}

			try {
				// Importar dinámicamente para evitar imports circulares
				const { AudioRequestService } = await import('@/services/api/audioRequestService')
				const { useAuthStore } = await import('./authStore')
				const { userId } = useAuthStore.getState()

				if (userId) {
					const response = await AudioRequestService.getAudioRequests(userId)
					const currentRequest = response.audiorequests?.find(
						(req: any) => req._id === activeProcess.audioRequestId,
					)

					if (currentRequest) {
						// Obtener progreso del backend
						const backendProgress = currentRequest.progress || 0

						// Calcular progreso basado en tiempo
						const timeBasedProgress = calculateRealProgress(
							startTime,
							estimatedEnd,
							backendProgress,
						)

						// Usar el progreso mayor
						const finalProgress = Math.max(backendProgress, timeBasedProgress)

						// SOLO MOSTRAR LOGS SI HAY CAMBIOS SIGNIFICATIVOS
						const currentProgress = activeProcess.progress || 0
						const progressChange = Math.abs(finalProgress - currentProgress)

						if (progressChange > 0.01) {
							// Solo si cambia más del 1%
							console.log(
								`[HypnosisProcess] Backend: ${Math.round(backendProgress * 100)}%, Tiempo: ${Math.round(timeBasedProgress * 100)}%, Final: ${Math.round(finalProgress * 100)}%`,
							)
						}

						// Actualizar progreso
						get().updateProgress(finalProgress)

						// ✅ COMPLETAR SOLO SI EL BACKEND CONFIRMA 100%
						if (backendProgress >= 1.0) {
							console.log('[HypnosisProcess] Backend confirmó 100% - completando proceso')
							clearInterval(backendProgressInterval)
							get().completeProcess()
						}
					}
				}
			} catch (error) {
				console.error('[HypnosisProcess] Error verificando progreso del backend:', error)
			}
		}, 360000) // Verificar cada 6 minutos

		// Guardar referencia al interval en el proceso activo
		set({
			activeProcess: {
				...get().activeProcess!,
				backendProgressInterval,
			} as any,
		})
	},

	updateProgress: (progress: number, timeRemaining?: string) => {
		const { activeProcess } = get()
		if (activeProcess) {
			set({
				activeProcess: {
					...activeProcess,
					progress: Math.min(Math.max(progress, 0), 1), // Clamp entre 0 y 1
					timeRemaining,
				},
			})
		}
	},

	completeProcess: () => {
		const { activeProcess } = get()
		if (activeProcess) {
			console.log('[HypnosisProcess] Proceso completado:', activeProcess.title)

			// Limpiar interval si existe
			if ((activeProcess as any).backendProgressInterval) {
				clearInterval((activeProcess as any).backendProgressInterval)
			}

			const reloadAudios = async () => {
				try {
					// Importar dinámicamente los stores necesarios
					const { useAuthStore } = await import('./authStore')
					const { useNewLibraryStore } = await import('./newLibrary')
					const { userId } = useAuthStore.getState()
					const { fetchUserAudios } = useNewLibraryStore.getState()

					if (userId) {
						console.log('[HypnosisProcess] Recargando audios después de completar proceso...')
						await fetchUserAudios(userId)
						console.log('[HypnosisProcess] Audios recargados exitosamente')
					}
				} catch (error) {
					console.error('[HypnosisProcess] Error recargando audios:', error)
				}
			}

			// Ejecutar recarga de audios
			reloadAudios()

			// Limpiar proceso activo
			set({ activeProcess: null })
		}
	},

	dismissProcess: () => {
		const { activeProcess } = get()
		if (activeProcess) {
			console.log('[HypnosisProcess] Cerrando proceso y limpiando intervalos')
			// Limpiar interval si existe
			if ((activeProcess as any).backendProgressInterval) {
				clearInterval((activeProcess as any).backendProgressInterval)
			}
		}
		set({ isCollapsed: true })
	},

	setCollapsed: (collapsed: boolean) => {
		set({ isCollapsed: collapsed })
	},

	setEnabled: (enabled: boolean) => {
		set({ isEnabled: enabled })
	},

	// Funciones de simulación para testing
	startSimulation: (title: string) => {
		const processData: HypnosisProcessData = {
			id: `sim_${Date.now()}`,
			audioRequestId: `sim_audio_${Date.now()}`,
			title: 'Tu hipnosis está siendo creada', // Texto fijo de la imagen
			subtitle: 'En menos de 24hs podrás escuchar tu hipnosis.', // Texto fijo de la imagen
			progress: 0,
			timeRemaining: undefined, // No mostrar tiempo en este diseño
			startTime: new Date(),
			estimatedCompletionTime: new Date(Date.now() + 60 * 1000), // 1 minuto
		}

		get().startProcess(processData)

		// Simular progreso cada segundo
		const interval = setInterval(() => {
			const { activeProcess } = get()
			if (!activeProcess) {
				clearInterval(interval)
				return
			}

			const newProgress = Math.min(activeProcess.progress + 1 / 60, 0.98)

			get().updateProgress(
				newProgress,
				undefined, // No actualizar timeRemaining
			)

			// Completar cuando llegue al 98%
			if (newProgress >= 0.98) {
				setTimeout(() => {
					get().completeProcess()
				}, 1000)
				clearInterval(interval)
			}
		}, 1000) // 1 segundo
	},

	stopSimulation: () => {
		const { activeProcess } = get()
		if (activeProcess) {
			console.log('[HypnosisProcess] Deteniendo simulación y limpiando intervalos')
			// Limpiar interval de progreso simulado si existe
			if ((activeProcess as any).backendProgressInterval) {
				clearInterval((activeProcess as any).backendProgressInterval)
			}
		}
		get().completeProcess()
	},
}))

// Configurar listeners de OneSignal para hipnosis en proceso
export const setupHypnosisProcessNotifications = () => {
	OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event) => {
		const notification = event.getNotification()
		const additionalData = notification.additionalData as any

		if (additionalData?.type === 'hypnosis_progress') {
			const store = useHypnosisProcessStore.getState()

			if (
				additionalData.audioRequestId &&
				store.activeProcess?.audioRequestId === additionalData.audioRequestId
			) {
				// Actualizar progreso existente
				store.updateProgress(additionalData.progress || 0, additionalData.timeRemaining)
			} else if (additionalData.action === 'start') {
				// Iniciar nuevo proceso
				const processData: HypnosisProcessData = {
					id: additionalData.id || `process_${Date.now()}`,
					audioRequestId: additionalData.audioRequestId,
					title: additionalData.title || 'Creando tu hipnosis',
					subtitle: additionalData.subtitle || 'Tu hipnosis está siendo creada...',
					progress: additionalData.progress || 0.1,
					timeRemaining: additionalData.timeRemaining,
					imageUrl: additionalData.imageUrl,
					startTime: new Date(),
				}

				store.startProcess(processData)
			} else if (additionalData.action === 'complete') {
				// Completar proceso
				store.completeProcess()
			}

			// Prevenir que se muestre la notificación nativa si ya tenemos el componente activo
			if (store.activeProcess && !store.isCollapsed) {
				event.preventDefault()
			}
		}
	})
}

// Función utilitaria independiente para detectar procesos de hipnosis existentes
export const detectExistingHypnosisProcess = async (
	userId: string,
	AudioRequestService: any,
): Promise<any | null> => {
	try {
		console.log('[HypnosisDetector] Verificando procesos existentes para userId:', userId)
		const response = await AudioRequestService.getAudioRequests(userId)

		// Buscar último audio request en proceso
		const audioRequests = response.audiorequests || []
		const latestRequest = audioRequests
			.filter((req: any) => req.status !== 'sended' && req.status !== 'completed')
			.sort(
				(a: any, b: any) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime(),
			)[0]

		if (latestRequest) {
			console.log('[HypnosisDetector] Proceso encontrado:', latestRequest._id)
			console.log('[HypnosisDetector] Datos del audio request:', latestRequest)

			// Obtener el progreso real del backend si está disponible
			const backendProgress = latestRequest.progress || 0

			// Calcular fecha de finalización real
			let estimatedCompletionTime: Date

			// Si el backend envía estimatedCompletionTime, usarlo
			if (latestRequest.estimatedCompletionTime) {
				estimatedCompletionTime = new Date(latestRequest.estimatedCompletionTime)
			}
			// Si hay una fecha de publicación (publicationDate), usarla
			else if (latestRequest.publicationDate) {
				estimatedCompletionTime = new Date(latestRequest.publicationDate)
			}
			// Fallback: 24 horas desde el requestDate
			else {
				estimatedCompletionTime = new Date(
					new Date(latestRequest.requestDate).getTime() + 24 * 60 * 60 * 1000,
				)
			}

			// Calcular progreso real con backend y tiempo
			const startTime = new Date(latestRequest.requestDate)
			const initialRealProgress = calculateRealProgress(
				startTime,
				estimatedCompletionTime,
				backendProgress,
			)

			console.log(`[HypnosisDetector] Progreso del backend: ${Math.round(backendProgress * 100)}%`)
			console.log(
				`[HypnosisDetector] Progreso calculado: ${Math.round(initialRealProgress * 100)}%`,
			)
			console.log(`[HypnosisDetector] Tiempo de inicio: ${startTime.toISOString()}`)
			console.log(
				`[HypnosisDetector] Fecha de finalización: ${estimatedCompletionTime.toISOString()}`,
			)

			// 🖼️ EXTRAER IMAGEN ESPECÍFICA DEL NIVEL
			const levelImageUrl = latestRequest.settings?.exportSettings?.audioImg
			console.log(`[HypnosisDetector] Imagen del nivel: ${levelImageUrl}`)

			// Usar el progreso mayor entre el del backend y el calculado
			const finalProgress = Math.max(backendProgress, initialRealProgress)

			return {
				id: latestRequest._id,
				audioRequestId: latestRequest._id,
				title: 'Tu hipnosis está siendo creada',
				subtitle: 'En menos de 24hs podrás escuchar tu hipnosis.',
				progress: finalProgress, // Usar progreso real
				startTime: startTime,
				estimatedCompletionTime: estimatedCompletionTime,
				// 🖼️ USAR IMAGEN ESPECÍFICA DEL NIVEL
				imageUrl: levelImageUrl,
				// Datos adicionales del backend
				backendProgress: backendProgress,
				publicationDate: latestRequest.publicationDate,
				audioRequestData: latestRequest, // Guardar todos los datos para futuro uso
			}
		}

		console.log('[HypnosisDetector] No hay procesos en curso')
		return null
	} catch (error) {
		console.error('[HypnosisDetector] Error verificando procesos:', error)
		return null
	}
}
