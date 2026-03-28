import React, { ReactNode } from 'react';
import { View, ViewStyle, TextStyle } from 'react-native';
import LoadingScreen from './LoadingScreen';

interface LoadingContainer {
    isLoading: boolean;
    error?: Error | null;
    children: ReactNode;
    onRetry?: () => void;
    containerStyle?: ViewStyle;
    spinnerStyle?: ViewStyle;
    spinnerColor?: string;
    spinnerBorderColor?: string;
    textStyle?: TextStyle;
    text?: string;
  }
  
  const LoadingContainer: React.FC<LoadingContainer> = ({
    isLoading,
    error,
    children,
    onRetry,
    containerStyle,
    spinnerStyle,
    spinnerColor,
    spinnerBorderColor,
    textStyle,
    text
  }) => {
    if (isLoading) {
      return (
        <LoadingScreen 
          containerStyle={containerStyle}
          spinnerStyle={spinnerStyle}
          spinnerColor={spinnerColor}
          spinnerBorderColor={spinnerBorderColor}
          textStyle={textStyle}
          text={text}
          hideProgressBar={true}
        />
      );
    }
  
    if (error) {
    //   return <ErrorPage error={error} onRetry={onRetry} />;
    }
  
    return children;
  };

  export default LoadingContainer;
