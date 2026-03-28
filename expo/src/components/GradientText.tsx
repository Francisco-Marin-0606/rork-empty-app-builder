import React from "react";
import { Text, TextProps } from "react-native";
import MaskedView from "@react-native-masked-view/masked-view";
import LinearGradient from "react-native-linear-gradient";
    
interface GradientTextProps extends TextProps {
  colors?: string[];
}

const GradientText = (props: GradientTextProps) => {
  const { colors = ["black", "orange"], ...restProps } = props;
  
  return (
    <MaskedView maskElement={<Text {...restProps} />}>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Text {...restProps} style={[restProps.style, { opacity: 0 }]} />
      </LinearGradient>
    </MaskedView>
  );
};

export default GradientText;