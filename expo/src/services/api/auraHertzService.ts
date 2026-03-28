import apiManager from './apiManager';

// Tipado mínimo basado en el diseño de .json
export interface TrackItem {
  title?: { man?: string; woman?: string } | string
  trackUrl?: { man?: string; woman?: string } | string
}

export interface AlbumItem {
  title?: { man?: string; woman?: string } | string
  description?: { man?: string; woman?: string } | string
  imageUrl?: { man?: string; woman?: string } | string
  vinillo?: { man?: string; woman?: string } | string
  colorBackground?: { man?: string; woman?: string } | string
  colorText?: { man?: string; woman?: string } | string
  frecuencia?: { man?: string; woman?: string } | string
  tracks?: TrackItem[]
}

export interface ForYou {
	title?: { man?: string; woman?: string } | string
	description?: { man?: string; woman?: string } | string
	trackUrl?: { man?: string; woman?: string } | string
	imageUrl?: { man?: string; woman?: string } | string
	vinillo?: { man?: string; woman?: string } | string
	colorBackground?: { man?: string; woman?: string } | string
	colorText?: { man?: string; woman?: string } | string
	frecuencia?: { man?: string; woman?: string } | string
}

export interface RootEntry {
	instrumentals?: AlbumItem[][]
	forYou?: ForYou[]
}

export class AuraHertzService {
  private static instance: AuraHertzService

  private constructor() {}

  static getInstance(): AuraHertzService {
    if (!AuraHertzService.instance) {
      AuraHertzService.instance = new AuraHertzService()
    }
    return AuraHertzService.instance
  }

  // ÚNICO MÉTODO: llamar al servicio y devolver el payload con estructura 
  async getAuraHertzConfig( genre: string): Promise<RootEntry[] | RootEntry> {
    const { data } = await apiManager.get('aura-hertz')

   const instrumentals = Object.keys(data[1].instrumentals)
   const instrumentalsKeys = instrumentals.map((key: string) => data[1].instrumentals[key] as AlbumItem[]) 
   return this.filterGenre({
    instrumentals: instrumentalsKeys,
	forYou: data[1].forYou
   }, genre)
  }

filterGenre(value: RootEntry, genre: string) {
   return {
	instrumentals: value.instrumentals?.map((album) => {
		 return album.map((item) => {
            return {
				title: typeof item.title === 'object' ? (genre === 'woman' ? item.title?.woman : item.title?.man) : item.title,
  				description: typeof item.description === 'object' ? (genre === 'woman' ? item.description?.woman : item.description?.man) : item.description,
  				imageUrl: typeof item.imageUrl === 'object' ? (genre === 'woman' ? item.imageUrl?.woman : item.imageUrl?.man) : item.imageUrl,
  				vinillo: typeof item.vinillo === 'object' ? (genre === 'woman' ? item.vinillo?.woman : item.vinillo?.man) : item.vinillo,
  				colorBackground: typeof item.colorBackground === 'object' ? (genre === 'woman' ? item.colorBackground?.woman : item.colorBackground?.man) : item.colorBackground,
  				colorText: typeof item.colorText === 'object' ? (genre === 'woman' ? item.colorText?.woman : item.colorText?.man) : item.colorText,
  				frecuencia: typeof item.frecuencia === 'object' ? (genre === 'woman' ? item.frecuencia?.woman : item.frecuencia?.man) : item.frecuencia,
  				tracks: item.tracks?.map((track) => ({
					title: typeof track.title === 'object' ? (genre === 'woman' ? track.title?.woman : track.title?.man) : track.title,
					trackUrl: typeof track.trackUrl === 'object' ? (genre === 'woman' ? track.trackUrl?.woman : track.trackUrl?.man) : track.trackUrl,
				}))
			}
		 })
	}),
	forYou: value.forYou?.map((item) => ({
		title: typeof item.title === 'object' ? (genre === 'woman' ? item.title?.woman : item.title?.man) : item.title,
		description: typeof item.description === 'object' ? (genre === 'woman' ? item.description?.woman : item.description?.man) : item.description,
		trackUrl: typeof item.trackUrl === 'object' ? (genre === 'woman' ? item.trackUrl?.woman : item.trackUrl?.man) : item.trackUrl,
		imageUrl: typeof item.imageUrl === 'object' ? (genre === 'woman' ? item.imageUrl?.woman : item.imageUrl?.man) : item.imageUrl,
		vinillo: typeof item.vinillo === 'object' ? (genre === 'woman' ? item.vinillo?.woman : item.vinillo?.man) : item.vinillo,
		colorBackground: typeof item.colorBackground === 'object' ? (genre === 'woman' ? item.colorBackground?.woman : item.colorBackground?.man) : item.colorBackground,
		colorText: typeof item.colorText === 'object' ? (genre === 'woman' ? item.colorText?.woman : item.colorText?.man) : item.colorText,
		frecuencia: typeof item.frecuencia === 'object' ? (genre === 'woman' ? item.frecuencia?.woman : item.frecuencia?.man) : item.frecuencia,
	}))
   }
}
}
const auraService = AuraHertzService.getInstance()
export { auraService }
