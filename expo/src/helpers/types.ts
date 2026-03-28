import { QuestionsAnswer } from '@/services/api/audioRequestService'
import { Track } from 'react-native-track-player'

export type Playlist = {
	name: string
	tracks: Track[]
	artworkPreview: string
}

export type Artist = {
	name: string
	tracks: Track[]
}

export type TrackWithPlaylist = Track & { playlist?: string[], duration?: number, status: string}

// Nuevos tipos para manejo mejorado de tracks y audioRequests
export type TrackStatus = 'ready' | 'not-ready' | 'processing' | 'offline';

export interface UnifiedTrack {
	// Identificadores únicos
	id: string;
	audioRequestId: string;
	
	// URLs y recursos
	onlineUrl?: string;
	offlineUrl?: string;
	url: string; // URL activa actual (puede ser online u offline)
	artwork: string;
	
	// Metadatos
	title: string;
	customName?: string; 
	formattedDuration?: string;
	customData: any;
	
	// Estado y flags
	status: TrackStatus;
	isOffline: boolean;
	isProcessing: boolean; // Indica si es un audioRequest en proceso
	progress?: number;     // Para audioRequests en proceso, muestra el % completado
	
	// Datos originales
	rawAudioData?: any;    // Datos originales del audio
	rawRequestData?: any;  // Datos originales del audioRequest
	
	// Propiedades de TrackPlayer
	artist?: string;
	duration?: number;
	pitchAlgorithm?: string;
	playlist?: string[];
	rating?: number;
	voice?: string;
	frontAnalysis?: string;
	questions?: QuestionsAnswer[];
	description?: string;
	lockDays?: number | null;
	// Compatibilidad con type TrackWithPlaylist existente
	[key: string]: any;
}

export interface FieldOption {
	label: string;
	value: string;
}
  
export interface FormField {
	name: string;
	label: string;
	type: 'text' | 'email' | 'number' | 'select' | 'radio' | 'segmentedRadio' | 'date' | 'textAndNumber' | 'onlytextrestricted';
	placeholder?: string;
	options?: FieldOption[];
	minLength?: number;
	maxLength?: number;
	required?: boolean;
	optional?: boolean;
	description?: string;
	inputHeight?: string | number | null;
	disabled?: boolean;
	hideMaxLength?: boolean;
	isCapitalize?: boolean;
	textAlignVertical?: 'top' | 'center';
	inputPaddingHorizontal?: number;
	hideBorder?: boolean;
	hidePlaceholder?: boolean;
	numberOfLines?: number;
	// UI extras opcionales que algunos formularios pueden usar
	showMicrophone?: boolean;
	margin?: {
		top?: number;
		bottom?: number;
		left?: number;
		right?: number;
	};
}
  
export interface FormStep {
	title: string;
	fields: FormField[];
	description?:string;
	header?: string;

}
  
// Cambiamos el nombre de FormData a WizardFormData
export interface WizardFormData {
	[key: string]: string | number;
}

  