import { Event, useTrackPlayerEvents } from "react-native-track-player";

const events = [Event.PlaybackState, Event.PlaybackError, Event.PlaybackActiveTrackChanged];

export const useLogTrackPlayerState =  (  )=>{
        useTrackPlayerEvents(events, async (event)=>{
            if(event.type === Event.PlaybackError){
                console.error("an error ocurred", event)
            }
            if(event.type === Event.PlaybackState){
                //console.log("state changed", event.state)
            }
            if(event.type === Event.PlaybackActiveTrackChanged){
                if (event.index !== undefined) {
                    console.warn("track changed", event.index)
                } else {
                    console.log("track player reset - queue cleared")
                }
            }
        })
}