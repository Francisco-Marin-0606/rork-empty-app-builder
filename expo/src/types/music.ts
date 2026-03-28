import { TrackItem } from "@/services/api/auraHertzService";

export type AlbumData = {
  id: string;
  title: string;
  subtitle: string;
  color?: string;
  audioRealUrl?: string;
  audioUrl?: string;
  vinylUrl?: string;
  imageUrl?: string;
};
