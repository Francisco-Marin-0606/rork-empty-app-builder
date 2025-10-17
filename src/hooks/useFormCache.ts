import { useState, useEffect, useCallback } from 'react'
import { CacheService } from '../services/cache/cacheService'
import { WizardFormData } from '../helpers/types'

interface UseFormCacheProps {
	formId: string
	cacheExpirationDays?: number
}

interface UseFormCacheReturn {
	formData: WizardFormData
	currentStep: number
	isLoadingCache: boolean
	updateFormData: (fieldName: string, value: any) => void
	updateCurrentStep: (step: number) => void
	clearCache: () => Promise<void>
	setFormData: (data: WizardFormData) => void
	setCurrentStep: (step: number) => void
}

export const useFormCache = ({
	formId,
	cacheExpirationDays = 7
}: UseFormCacheProps): UseFormCacheReturn => {
	const [formData, setFormData] = useState<WizardFormData>({})
	const [currentStep, setCurrentStep] = useState(0)
	const [isLoadingCache, setIsLoadingCache] = useState(true)
	
	const cacheService = CacheService.getInstance()
	const cacheOptions = {
		expirationTime: cacheExpirationDays * 24 * 60 * 60 * 1000, // días a milisegundos
		version: '1.0.0'
	}

	// Cargar datos del caché al inicializar
	useEffect(() => {
		const loadCachedData = async () => {
			try {
				const cachedFormData = await cacheService.get<WizardFormData>(`form_data_${formId}`, cacheOptions)
				const cachedCurrentStep = await cacheService.get<number>(`form_step_${formId}`, cacheOptions)
				
				if (cachedFormData) {
					setFormData(cachedFormData)
					//console.log('[useFormCache] Datos del formulario cargados desde caché:', cachedFormData)
				}
				
				if (cachedCurrentStep !== null && cachedCurrentStep !== undefined && cachedCurrentStep >= 0) {
					setCurrentStep(cachedCurrentStep)
					//console.log('[useFormCache] Paso actual cargado desde caché:', cachedCurrentStep)
				}
			} catch (error) {
				console.error('[useFormCache] Error cargando datos del caché:', error)
			} finally {
				setIsLoadingCache(false)
			}
		}
		
		loadCachedData()
	}, [formId])

	// Actualizar datos del formulario y guardar en caché
	const updateFormData = useCallback(async (fieldName: string, value: any) => {
		setFormData(prev => {
			const newFormData = { ...prev, [fieldName]: value }
			// Guardar en caché inmediatamente
			cacheService.set(`form_data_${formId}`, newFormData, cacheOptions).catch((error) => {
				//console.error('[useFormCache] Error guardando datos en caché:', error)
			})
			return newFormData
		})
	}, [formId, cacheService, cacheOptions])

	// Actualizar paso actual y guardar en caché
	const updateCurrentStep = useCallback(async (step: number) => {
		setCurrentStep(step)

		// Guardar paso actual en caché
		try {
			await cacheService.set(`form_step_${formId}`, step, cacheOptions)
		} catch (error) {
			console.error('[useFormCache] Error guardando paso actual en caché:', error)
		}
	}, [formId, cacheService, cacheOptions])

	// Limpiar caché del formulario
	const clearCache = useCallback(async () => {
		try {
			await cacheService.remove(`form_data_${formId}`)
			await cacheService.remove(`form_step_${formId}`)
			//console.log('[useFormCache] Caché del formulario limpiado exitosamente')
		} catch (error) {
			console.error('[useFormCache] Error limpiando caché:', error)
		}
	}, [formId, cacheService])

	return {
		formData,
		currentStep,
		isLoadingCache,
		updateFormData,
		updateCurrentStep,
		clearCache,
		setFormData,
		setCurrentStep
	}
}