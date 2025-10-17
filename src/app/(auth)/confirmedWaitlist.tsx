import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    Dimensions,
    Platform,
    TouchableOpacity,
    Animated,
    Alert,
} from 'react-native';
import { colors, fontSize, screenPadding } from '@/constants/tokens';
import CustomButton from '../../components/CustomButton';
import FastImage from 'react-native-fast-image';
import { IconChevronLeft } from '@tabler/icons-react-native';
import { router, useRouter } from 'expo-router';
import { useOnboardingStore } from '@/store/onBoardingStore';
import FormInput from '@/components/FormInput';

interface ConfirmedWaitlistProps {
    onStartHypnosis: () => void;
    onBack?: () => void;
}

const { height } = Dimensions.get('window');

const ConfirmedWaitlist: React.FC<ConfirmedWaitlistProps> = ({
}) => {
    const router = useRouter();
    const fadeAnim = useState(new Animated.Value(0))[0];
    const [email, setEmail] = useState('');
    const [touched, setTouched] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);


    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>


                <View style={styles.titleContainer}>
{/*                     
                <View style={styles.backButtonContainer}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <IconChevronLeft size={36} color="white" />
                    </TouchableOpacity>
                </View> */}

                    <Text style={styles.title}>
                        Recibido.
                    </Text>

                    <Text style={styles.message}>
                        Te enviaré un correo muy raro cuando puedas probar.{'\n'}No te asustes.

                    </Text>

                </View>


                <View style={styles.containerBottom}>


                    <View style={styles.startButtonContainer}>
                        <CustomButton
                            title="Entendido"
                            handlePress={() => router.replace('/login')}
                            containerStyles={styles.startButton}
                            textStyles={styles.startButtonText}
                        />
                    </View>
                </View>

            </View>

        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        height: '100%',
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        width: "100%",
        height: '100%',
        alignItems: 'center',
        paddingHorizontal: Platform.OS === 'ios' ? screenPadding.horizontalIos : screenPadding.horizontalAndroid,
    },
    backButtonContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 999,

    },
    backButton: {
        position: 'absolute',
        top: 20,
        left: 0,
        zIndex: 10,
        padding: 0,

    },
    containerBottom: {
        position: 'absolute',
        flexDirection: 'column',
        bottom: 30,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    titleContainer: {
        width: '100%',
        alignItems: 'flex-start',
        justifyContent: 'flex-end',
        height: 260,


    },
    title: {
        color: 'white',

        fontFamily: Platform.OS === 'ios' ? 'Geist-Semibold' : 'Geist-Bold',
        textAlign: 'left',
        letterSpacing: -3.5,

        fontSize: 60,
        lineHeight: 60 * 0.9,
        paddingTop: 60 - (60 * 0.75),
    },

    messageContainer: {
        width: '100%',
    },
    message: {
        color: 'white',
        letterSpacing: -1.7,
        fontSize: fontSize.lg,
        fontFamily: 'Geist-Regular',
        textAlign: 'left',
        lineHeight: fontSize.xl * 1.2,
    },
    startButton: {
        width: '100%',
        backgroundColor: 'white',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    startButtonText: {
        color: 'black',
        fontFamily: 'Geist-SemiBold',
    },
    startButtonContainer: {
        width: '100%',
    }
});

export default ConfirmedWaitlist; 