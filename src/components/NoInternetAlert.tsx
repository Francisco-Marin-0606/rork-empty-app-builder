
  import React from 'react';
  import { View, Text } from 'react-native';
  import { colors } from '@/constants/tokens';


  export const NoInternetAlert: React.FC = ({ 
  }) => {
    return (
        <View style={{
            position: 'absolute',
            bottom: 0,
            width: '100%',
            backgroundColor: 'gray' ,
            paddingVertical: 4,
          }}>
            <Text style={{
              color: colors.text,
              textAlign: 'center',
              fontSize: 12,
              fontFamily: 'Inter-Regular',
            }}>
             No tienes conexión a Internet.
            </Text>
          </View>
    )
  };
  