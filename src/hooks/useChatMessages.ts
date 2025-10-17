import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { ChatService } from '../services/api/chatService';

//NOT USING THIS HOOK RIGHT NOW - 05-04-2025

export interface ChatMessage {
    id: number | string;
    text?: string;
    image?: string;
    type?: string;
    sender: 'sender' | 'receiver';
    animate?: boolean;
}

interface ServerMessage {
    _id: string;
    role: 'user' | 'assistant';
    content: string;
    url: string;
    timestamp: Date;
}

// Función de utilidad para transformar mensajes del servidor al formato local
const mapServerMessageToLocal = (message: ServerMessage, index: number, isHistoryMessage: boolean = true): ChatMessage => {
    return {
        id: message._id || `history-${index}`,
        text: message.content,
        image: message.url && message.url.length > 0 ? message.url : undefined,
        sender: message.role === 'user' ? 'sender' : 'receiver',
        // Los mensajes del historial NUNCA se animan, solo los nuevos mensajes del asistente
        animate: message.role === 'assistant' && !isHistoryMessage
    };
};

const handleSendMessage = async (
    message: string, 
    selectedImage: any, 
    currentThreadId: string | null,
    userId: string | null,
    email: string | undefined,
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
    setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
    setThreadId: React.Dispatch<React.SetStateAction<string | null>>,
    flatListRef: any,
    setShouldAutoScroll: React.Dispatch<React.SetStateAction<boolean>>
) => {
    if (!message.trim() && !selectedImage) return;

    // Activar auto-scroll al enviar un nuevo mensaje
    setShouldAutoScroll(true);
    setIsLoading(true);
    try {
        const body: any = {
            message: message.trim(),
            userId,
            email
        };

        if (selectedImage) {
            if (body.message === '') {
                body.message = 'Imagen enviada';
            }
            const imageFile = {
                uri: selectedImage.uri,
                type: 'image/jpeg',
                name: selectedImage.name
            };
            body.file = imageFile;
        }

        // Add user message to chat
        const newUserMessage: ChatMessage = {
            id: Date.now().toString(),
            text: message || 'Imagen enviada',
            image: selectedImage?.uri,
            sender: 'sender'
        };

        // Add loading message
        const loadingMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            type: 'loading',
            sender: 'receiver'
        };

        // Usar función de actualización para evitar cierres y garantizar estado actualizado
        // Para un FlatList invertido, los nuevos mensajes se añaden al final del array
        // ya que la lista mostrará los elementos en orden inverso
        setMessages(prev => [...prev, newUserMessage, loadingMessage]);

        // No es necesario hacer scroll aquí, ya que FlatList inverted mostrará automáticamente los mensajes más recientes
        // scrollToBottom(flatListRef, true, true);

        let response: any;
        if (!currentThreadId) {
            response = await ChatService.startConversation(null, null, body);
            setThreadId(response.message.threadId);

            setMessages(prev => [
                ...prev.slice(0, -1),
                {
                    id: (Date.now() + 2).toString(),
                    text: response.message.message,
                    sender: 'receiver',
                    animate: true // Solo animar nuevas respuestas
                }
            ]);
        } else {
            body.threadId = currentThreadId;
            response = await ChatService.sendMessageToAssistant(null, null, body);

            setMessages(prev => {
                const prevMessages = prev.slice(0, -1);
                return [...prevMessages, {
                    id: (Date.now() + 2).toString(),
                    text: response.message,
                    sender: 'receiver',
                    animate: true // Solo animar nuevas respuestas
                }];
            });
        }

        // No es necesario hacer scroll aquí, ya que FlatList inverted mostrará automáticamente los mensajes más recientes
        // scrollToBottom(flatListRef, true, true);

    } catch (error) {
        console.error('Error sending message:', error);
        setMessages(prev => [...prev.slice(0, -1)]);
        Alert.alert(
            "Error",
            "Error al enviar el mensaje, inténtalo nuevamente.",
            [
                {
                    text: "Cerrar",
                    style: "cancel"
                }
            ]
        );
    } finally {
        setIsLoading(false);
    }
};

export const useChatMessages = (userId: string | null, email: string | undefined, flatListRef: any) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [threadId, setThreadId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(true);
    const [hasHistory, setHasHistory] = useState<boolean>(false);
    const [shouldAutoScroll, setShouldAutoScroll] = useState<boolean>(true);

    // Cargar historial de chat al iniciar
    useEffect(() => {
        if (!userId) return;
        
        const loadChatHistory = async () => {
            setIsLoadingHistory(true);
            try {
                const response = await ChatService.getChatByUserId(userId);
                
                if (response.chat) {
                    setHasHistory(true);
                    setThreadId(response.chat.threadId);
                    
                    // Convertir mensajes del servidor al formato local
                    // Todos los mensajes del historial tienen animate=false
                    const transformedMessages = response.chat.messages.map((msg: ServerMessage, index: number) => 
                        mapServerMessageToLocal(msg, index, true)
                    );
                    
                    // No es necesario invertir los mensajes aquí ya que:
                    // 1. Ya se invirtieron en chatService.ts
                    // 2. El FlatList tiene la propiedad inverted={true}
                    setMessages(transformedMessages);
                } else {
                    setHasHistory(false);
                }
            } catch (error) {
                console.error('Error loading chat history:', error);
                setHasHistory(false);
            } finally {
                setIsLoadingHistory(false);
            }
        };
        
        loadChatHistory();
    }, [userId]);

    // Memoizar la función handleSendMessage para evitar recreaciones
    const memoizedHandleSendMessage = useCallback((
        message: string, 
        selectedImage: any, 
        currentThreadId: string | null
    ) => {
        return handleSendMessage(
            message, 
            selectedImage, 
            currentThreadId,
            userId,
            email,
            setIsLoading,
            setMessages,
            setThreadId,
            flatListRef,
            setShouldAutoScroll
        );
    }, [userId, email, flatListRef]);

    return {
        messages,
        setMessages,
        threadId,
        isLoading,
        isLoadingHistory,
        hasHistory,
        handleSendMessage: memoizedHandleSendMessage,
        setShouldAutoScroll
    };
};