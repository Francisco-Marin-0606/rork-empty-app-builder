import { create } from "zustand"

type QueueStore = {
    activeQueueId: string | null,
    setActiveQueueId: (id:string) => void
    resetQueue: () => void
}

export const useQueueStore = create<QueueStore>() ( (set) =>({
    activeQueueId : null,
    setActiveQueueId : (id)=> set({activeQueueId : id}),
    resetQueue: () => {
        set({
            activeQueueId : null,
        });
    },
}))

export const useQueue = () => useQueueStore( (state) => state)

