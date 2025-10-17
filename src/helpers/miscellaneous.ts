import { unknownTrackImageUri } from "@/constants/images"
import { FormField } from "./types"

export const formatSecondsToMinutes = (seconds: number) => {
	const minutes = Math.floor(seconds / 60)
	const remainingSeconds = Math.floor(seconds % 60)

	const formattedMinutes = String(minutes).padStart(2, '0')
	const formattedSeconds = String(remainingSeconds).padStart(2, '0')

	return `${formattedMinutes}:${formattedSeconds}`
}

export const generateTracksListId = (trackListName: string, search?: string) => {
	return `${trackListName}${`-${search}` || ''}`
}

export const interpolateText = (template: string, values: Record<string, string>) => {
	return template.replace(/\${(\w+)}/g, (_, key) => values[key] || '');
};

export const filterTracksByRequests = (tracks: any, requests: any) => {
	if (!requests?.audiorequests) {
	  return tracks;
	}
  
	// Crear un Set con los audioRequestId existentes en tracks
	const existingRequestIds = new Set(tracks.map((track: any) => track.audioRequestId));
	
	// Crear un Map con todos los requests para acceso rápido a su status
	const requestMap = new Map(
	  requests.audiorequests.map((request: any) => [
		request._id,
		request
	  ])
	);
	
	// Procesar tracks existentes
	const processedTracks = tracks.map((track: any) => {
	  if (track.audioRequestId?.includes('default')) {
		return { ...track, status: 'sended' };
	  }
	  
	  const request = requestMap.get(track.audioRequestId);
	  return {
		...track,
		status: request?.status || 'unknown'
	  };
	});
  
	// Agregar tracks para requests que no tienen un track correspondiente
	const missingTracks = requests.audiorequests
	  .filter((request: any) => !existingRequestIds.has(request._id))
	  .map((request: any) => ({
		_id: request._id,
		artwork: unknownTrackImageUri,
		audioRequestId: request._id,
		audioUrl: '',
		url: '',
		description: '',
		imageUrl: unknownTrackImageUri,
		playlists: [],
		publicationDate: request.requestDate || new Date().toISOString(),
		rating: 0,
		status: request.status
	  }));
  
	// Combinar tracks existentes con los nuevos
	return [...processedTracks, ...missingTracks];
  };
  
export const validateField = (field: FormField, value: any): string => {
	// Para campos tipo radio y select, consideramos válido cualquier valor no vacío
	if (field.type === 'radio' || field.type === 'select') {
		return field.required && !value ? 'Este campo es obligatorio' : '';
	}

	// Para campo tipo date, verificamos que sea una fecha válida
	if (field.type === 'date') {
		if (field.required && !value) return 'Este campo es obligatorio';
		if (value) {
			// Intentar crear una fecha desde el valor (sea ISOString o Date)
			const date = new Date(value);
			if (isNaN(date.getTime())) return 'Fecha inválida';
		}
		return '';
	}

	if (field.required && (!value || String(value).trim() === '')) {
		return 'Este campo es obligatorio';
	}

	const stringValue = String(value || '');

	if (field.minLength && stringValue.length < field.minLength) {
		return `Mínimo ${field.minLength} caracteres`;
	}

	if (field.maxLength && stringValue.length > field.maxLength) {
		return `Máximo ${field.maxLength} caracteres`;
	}

	if (field.type === 'email' && value) {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(value)) {
			return 'Email inválido';
		}
	}

	if (field.type === 'number' && value) {
		const numberValue = Number(value);
		if (isNaN(numberValue)) {
			return 'Debe ser un número válido';
		}
	}

	return '';
};



export const sortEventsByDate = (events: any) => {
	// Separar eventos por categoría
	const liveEvents = events.filter((event: any) => event.isLive)
	  .sort((a: any, b: any) => new Date(b.publicationDate).getTime() - new Date(a.publicationDate).getTime());
  
	const pastEvents = events.filter((event: any) => !event.isLive && event.executed)
	  .sort((a: any, b: any) => new Date(b.publicationDate).getTime() - new Date(a.publicationDate).getTime());
  
	const upcomingEvents = events.filter((event: any) => !event.isLive && !event.executed)
	  .sort((a: any, b: any) => new Date(a.publicationDate).getTime() - new Date(b.publicationDate).getTime());
  
	return {
	  liveEvents,
	  upcomingEvents,
	  pastEvents
	};
  };



/**
 * Obtiene información sobre la zona horaria del dispositivo
 * @returns Un objeto con información de la zona horaria
 */
export const getDeviceTimeZone = (): {
	offsetMinutes: number;
	offsetHours: number;
	offsetString: string;
  } => {
	// El método getTimezoneOffset() puede dar resultados inconsistentes en React Native
	// Esta implementación asegura que obtenemos la información correcta de la zona horaria
	const now = new Date();
	
	// Obtener la cadena de representación de la fecha local
	const localString = now.toString();
	
	// Extraer la zona horaria de la cadena (ej. "GMT-0300 (hora estándar de Argentina)")
	const tzMatch = localString.match(/GMT([+-]\d{4})/);
	let offsetString = "UTC+00:00"; // Valor por defecto (UTC)
	let offsetHours = 0;
	let offsetMinutes = 0;
	
	if (tzMatch && tzMatch[1]) {
	  const tzOffset = tzMatch[1];
	  const sign = tzOffset.charAt(0) === '-' ? -1 : 1;
	  const hoursPart = parseInt(tzOffset.substring(1, 3), 10);
	  const minutesPart = parseInt(tzOffset.substring(3, 5), 10);
	  
	  offsetHours = sign * hoursPart;
	  offsetMinutes = sign * (hoursPart * 60 + minutesPart);
	  
	  // Formatear la cadena UTC+/-HH:MM
	  const absHours = Math.abs(hoursPart);
	  const absMinutes = minutesPart;
	  offsetString = `UTC${sign > 0 ? '+' : '-'}${String(absHours).padStart(2, '0')}:${String(absMinutes).padStart(2, '0')}`;
	} 
	
	// Log para depuración
	console.log('[DEBUG] getDeviceTimeZone - localString:', localString);
	console.log('[DEBUG] getDeviceTimeZone - match:', tzMatch);
	console.log('[DEBUG] getDeviceTimeZone - calculado:', { offsetHours, offsetMinutes, offsetString });
	
	return {
	  offsetMinutes: offsetMinutes,
	  offsetHours: offsetHours,
	  offsetString: offsetString
	};
  };
  
  /**
   * Convierte una fecha UTC a la zona horaria local del dispositivo
   * @param utcDate Fecha UTC a convertir
   * @returns Fecha convertida a hora local
   */
  export const convertUTCToLocalTime = (utcDate: Date | string | number): Date => {
	// En lugar de aplicar offsets manualmente, usamos el constructor de Date
	// que maneja automáticamente las conversiones de zona horaria
	const date = new Date(utcDate);
	return date;
  };
  
  /**
   * Formatea una fecha UTC al formato DD-MM-YYYY HH:MM
   * @param date Fecha a formatear
   * @param useLocalTime Si es true, convierte a hora local antes de formatear
   * @returns String formateado
   */
  export const formatUTCDate = (date: Date | string | number, useLocalTime: boolean = false): string => {
	// En React Native, es más confiable usar directamente el constructor de Date
	// para la conversión automática de zona horaria
	const dateObj = new Date(date);
	
	if (useLocalTime) {
	  // Para hora local, usamos los métodos normales de Date
	  const day = String(dateObj.getDate()).padStart(2, '0');
	  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
	  const year = dateObj.getFullYear();
	  const hours = String(dateObj.getHours()).padStart(2, '0');
	  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
	  
	  return `${day}-${month}-${year} ${hours}:${minutes}`;
	} else {
	  // Para UTC, usamos los métodos UTC
	  const day = String(dateObj.getUTCDate()).padStart(2, '0');
	  const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
	  const year = dateObj.getUTCFullYear();
	  const hours = String(dateObj.getUTCHours()).padStart(2, '0');
	  const minutes = String(dateObj.getUTCMinutes()).padStart(2, '0');
	  
	  return `${day}-${month}-${year} ${hours}:${minutes}`;
	}
  };


  export const formatTitle = (title: string, wantToBeCalled?: string): string => {
	if (!title) return '';
	if (!wantToBeCalled) return title;
	
	return title.replace(/\${name}/g, wantToBeCalled);
  };
  
/**
 * Formatea una fecha al formato "{día} de {nombre del mes} del {año}"
 * @param date Fecha a formatear (string ISO, Date, etc.)
 * @returns String formateado o cadena vacía si la fecha es inválida
 */
export const formatBirthdate = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  
  try {
    const dateObj = new Date(date);
    
    // Verificar si la fecha es válida
    if (isNaN(dateObj.getTime())) return '';
    
    const day = dateObj.getDate();
    const month = dateObj.getMonth(); // 0-11
    const year = dateObj.getFullYear();
    
    // Array con los nombres de los meses en español
    const monthNames = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    
    return `${day} de ${monthNames[month]} del ${year}`;
  } catch (error) {
    console.error('Error al formatear fecha de nacimiento:', error);
    return '';
  }
};
  
  