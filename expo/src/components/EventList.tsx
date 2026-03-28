import { unknownTrackImageUri } from '@/constants/images';
import { colors, fontSize, screenPadding } from '@/constants/tokens';
import { StreamingEvent } from '@/services/api/streamingEventsService';
import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, TouchableOpacity, Dimensions, Modal, Platform, Alert } from 'react-native';
import FastImage from 'react-native-fast-image';
import { WebView } from 'react-native-webview';
import * as WebBrowser from 'expo-web-browser';
import { useAuthStore } from '@/store/authStore';
import { sortEventsByDate, formatUTCDate, convertUTCToLocalTime, getDeviceTimeZone } from '@/helpers/miscellaneous';


// Función de utilidad para imprimir información de fecha para debugging
const logDateInfo = (label: string, date: Date) => {
  console.log(`[DEBUG] ${label}:`, {
    ISO: date.toISOString(),
    Local: date.toString(),
    Time: date.getTime(),
    Year: date.getFullYear(),
    Month: date.getMonth() + 1,
    Day: date.getDate(),
    Hours: date.getHours(),
    Minutes: date.getMinutes(),
    UTCHours: date.getUTCHours(),
    UTCMinutes: date.getUTCMinutes()
  });
};

/**
 * Obtiene el nombre del mes en español
 */
const getNombreMes = (numeroMes: number): string => {
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  return meses[numeroMes];
};

/**
 * Convierte una hora de formato 24h a 12h con AM/PM
 */
const formatHora12h = (hora: number, minutos: string): string => {
  const periodo = hora >= 12 ? 'PM' : 'AM';
  const hora12 = hora % 12 || 12; // Convertir 0 a 12 para medianoche
  return `${hora12}:${minutos} ${periodo}`;
};

const formatDate = (dateString: string, isUpcoming: boolean): string => {
  try {
    // NOTA: Usamos el constructor Date directamente ya que es el más confiable
    // para manejar correctamente la zona horaria del dispositivo
    const localDate = new Date(dateString);
    
    // Obtener componentes de la fecha
    const day = localDate.getDate();
    const month = localDate.getMonth(); // 0-11
    const year = localDate.getFullYear();
    const hours = localDate.getHours();
    const minutes = String(localDate.getMinutes()).padStart(2, '0');
    
    // Obtener el nombre del mes en español
    const nombreMes = getNombreMes(month);
    
    if (isUpcoming) {
      // Para eventos próximos, mostrar con formato DD nombreMes YYYY - HH:MM AM/PM
      const horaFormateada = formatHora12h(hours, minutes);
      return `${day} ${nombreMes} ${horaFormateada}`;
    } else {
      // Para eventos pasados, comprobar si el año es distinto al actual
      const currentYear = new Date().getFullYear();
      
      // Solo mostrar el año si es diferente al año actual
      if (year !== currentYear) {
        return `${day} ${nombreMes} ${year}`;
      } else {
        return `${day} ${nombreMes}`;
      }
    }
  } catch (error) {
    console.error('Error al formatear fecha:', error, dateString);
    return dateString; // Devolver la fecha original en caso de error
  }
};

// Componente para mostrar logs en pantalla durante desarrollo
const TimezoneLogs: React.FC = () => {
  useEffect(() => {
    // Log una fecha de ejemplo cuando el componente se monta
    const sampleDate = '2025-03-04T02:34:00Z';
    console.log(`[DEBUG] Ejemplo con fecha: ${sampleDate}`);
    formatDate(sampleDate, true);
    
    // Info del sistema
    console.log('[DEBUG] Platform:', Platform.OS);
    console.log('[DEBUG] TimeZone Offset:', new Date().getTimezoneOffset());
    console.log('[DEBUG] Current Date ISO:', new Date().toISOString());
    console.log('[DEBUG] Current Date Local:', new Date().toString());
  }, []);
  
  return null;
};

interface EventsListProps {
  events: StreamingEvent[]
}

interface EventItemProps {
  title: string;
  date: string;
  imageUrl: string;
  eventUrl: string;
  startHour: string;
  endHour: string;
  onPress: (url: string) => void;
  isVisible: boolean;
  isLive: boolean;
  executed: boolean;
}

interface Event extends Omit<EventItemProps, 'onPress'> {
  id: string;
  eventUrl: string;
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.8;
const LIVE_CARD_WIDTH = width * 0.9;
const INITIAL_PADDING = (width - CARD_WIDTH) / 4;
const LIVE_INITIAL_PADDING = (width - LIVE_CARD_WIDTH) / 2;

const EventItem: React.FC<EventItemProps > = ({ 
  title, 
  date, 
  startHour, 
  endHour, 
  imageUrl, 
  eventUrl, 
  onPress, 
  isLive,
  executed
}) => {
  // Determine if this is an upcoming event (not executed and not live)
  const isUpcoming = !executed && !isLive;
  
  return (
    <TouchableOpacity
      style={[
        styles.eventCard,
        isLive && styles.liveEventCard
      ]}
      onPress={() => onPress(eventUrl)}
      activeOpacity={0.7}
    >
      <View style={styles.imageContainer}>
        <FastImage
          source={{
            uri: imageUrl ?? unknownTrackImageUri,
            priority: FastImage.priority.normal
          }}
          style={[
            styles.eventImage,
            isLive && styles.liveEventImage
          ]}
        />
        {isLive && (
          <View style={styles.liveTag}>
            <View style={styles.liveDot} />
            <Text maxFontSizeMultiplier={1.1} style={styles.liveText}>En vivo</Text>
          </View>
        )}
      </View>

      <View style={styles.eventInfo}>
        <Text maxFontSizeMultiplier={1.1}  
          style={[
            styles.eventTitle,
            isLive && styles.liveEventTitle
          ]} 
          numberOfLines={2}
        >
          {title}
        </Text>
        {!isLive && (
          <Text maxFontSizeMultiplier={1.1} style={styles.eventDate}>
            {formatDate(date, isUpcoming)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const EventSection: React.FC<{
  title: string;
  events: StreamingEvent[];
  onEventPress: (url: string) => void;
  emptyStateMessage: string;
  isLive?: boolean;
}> = ({ title, events, onEventPress, emptyStateMessage, isLive }) => (
  <View style={styles.section}>
    {title && ( <Text maxFontSizeMultiplier={1.1} style={styles.sectionTitle}>{title}</Text>) }
   
    {events.length > 0 ? (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={isLive ? styles.liveScrollContent : styles.normalScrollContent}
      >
        {events.map(event => (
          <EventItem
            key={event._id}
            title={event.title}
            date={event.publicationDate}
            imageUrl={event.streamImgUrl}
            eventUrl={event.streamUrl}
            onPress={onEventPress}
            isLive={event.isLive}
            executed={event.executed}
            isVisible={event.isVisible}
            startHour={event.streamHourStart}
            endHour={event.streamHourEnd}
          />
        ))}
      </ScrollView>
    ) : (
      <View style={styles.emptyStateContainer}>
        <Text maxFontSizeMultiplier={1.1}  style={styles.emptyStateText}>{emptyStateMessage}</Text>
      </View>
    )}
  </View>
);

const EventosList: React.FC<EventsListProps> = ({ events }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState('');
  const { checkMembershipStatus, getRemainingDays } = useAuthStore();

  const handleEventPress = async (url: string) => {
    const isMembershipActive = checkMembershipStatus();

    if (!isMembershipActive) {
      const remainingDays = getRemainingDays();
      Alert.alert(
        "No tienes acceso",
        "Checa el estado de tu cuenta para acceder a los en vivos.",
        // "Membresía inactiva",
        // "Para acceder a los en vivos necesitas una membresía activa. Piénsalo como un boleto. Sin boleto, no hay concierto. Gracias",
        [
          // { 
          //   text: "Renovar", 
          //   onPress: () => {
          //     // Aquí puedes agregar la navegación a la pantalla de renovación
          //     // navigation.navigate('RenovarMembresia');
          //   }
          // },
          { 
            text: "Cerrar", 
            style: "cancel" 
          }
        ]
      );
      return;
    }

    try {
      setSelectedUrl(url);
      
      const result = await WebBrowser.openBrowserAsync(url, {
        controlsColor: colors.primary,
        toolbarColor: colors.background,
        enableBarCollapsing: true,
        showTitle: false
      });
    } catch (error) {
      Alert.alert(
        'Error',
        'No se pudo abrir el enlace. Inténtalo más tarde',
        [
          { 
            text: 'Reintentar',
            onPress: () => handleEventPress(url)
          },
          {
            text: 'Cancelar',
            style: 'cancel'
          }
        ]
      );
    }
  };

  const {liveEvents,upcomingEvents,pastEvents} = sortEventsByDate(events)

  return (
    <View style={styles.container}>
      {/* Componente de logs para desarrollo */}
      {/* <TimezoneLogs /> */}
      
      <ScrollView>
        {liveEvents.length > 0 && (
          <EventSection
            title=""
            events={liveEvents}
            onEventPress={handleEventPress}
            emptyStateMessage=""
            isLive={true}
          />
        )}
        <EventSection
          title="Próximos Eventos"
          events={upcomingEvents}
          onEventPress={handleEventPress}
          emptyStateMessage="No hay eventos disponibles"
          isLive={false}
        />
        <EventSection
          title="Eventos Anteriores"
          events={pastEvents}
          onEventPress={handleEventPress}
          emptyStateMessage="No hay eventos disponibles"
          isLive={false}
        />
      </ScrollView>
    
{/*       
      <Modal
        animationType="slide"
        transparent={false}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setModalVisible(false)}
            activeOpacity={0.7}
          >
            <Text maxFontSizeMultiplier={1.1}  style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          
          <WebView
            source={{ uri: selectedUrl }}
            style={styles.webview}
          />
        </View>
      </Modal> */}
      </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.screenBackground,
    paddingHorizontal: screenPadding.horizontal,
    paddingBottom: 100
  },
  contentContainer: {
    // paddingHorizontal: screenPadding.horizontal,
    backgroundColor: colors.screenBackground,
  },
  section: {
    marginVertical: 8,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: fontSize['2.5xl'],
    fontWeight: '600',
    marginBottom: 16,
    marginLeft: 10
  },
  scrollContent: {
    gap: 16,
  },
  normalScrollContent: {
    // paddingLeft: INITIAL_PADDING,
    paddingRight: 16,
    gap: 16,
  },
  liveScrollContent: {
    // paddingLeft: LIVE_INITIAL_PADDING,
    paddingRight: 16,
    gap: 16,
  },
  eventCard: {
    width: CARD_WIDTH,
    backgroundColor: colors.screenBackground,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        // shadowColor: '#000',
        // shadowOffset: {
        //   width: 0,
        //   height: 2,
        // },
        // shadowOpacity: 0.15,
        // shadowRadius: 6,
      },
      android: {
        elevation: 0,
        borderWidth: 0,
        borderColor: 'rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  liveEventCard: {
    width: LIVE_CARD_WIDTH,
  },
  imageContainer: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
  },
  eventImage: {
    width: '100%',
    aspectRatio: 16/9,
    resizeMode: 'cover',
  },
  liveEventImage: {
    aspectRatio: 16/9, // Imagen ligeramente más alta para eventos en vivo
  },
  eventInfo: {

    paddingTop : 10,
    marginLeft: 10

  },
  eventTitle: {
    fontFamily: 'Geist-SemiBold',
    letterSpacing: -0.5,
    color: colors.text,
    fontSize: fontSize.base,
    fontWeight: '600',
    marginBottom: 1
  },
  liveEventTitle: {
    fontSize: fontSize.base, // Título ligeramente más grande para eventos en vivo
  },
  eventDate: {
    fontFamily: 'Inter-Regular',
    letterSpacing: -0.5,
    fontSize: fontSize.eventSubtitleSize,
    color: colors.textMuted,
    fontWeight: '500',
  },
  liveTag: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#FF3B30',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 1000,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFF',
  },
  liveText: {
    color: '#FFF',
    fontSize: fontSize.sm,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  emptyStateContainer: {
    padding: 20,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    marginHorizontal: 16,
  },
  emptyStateText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webview: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
});

export default EventosList;