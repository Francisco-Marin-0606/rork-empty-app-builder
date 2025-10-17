import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  
  return (
    <LinearGradient
      colors={["#E0F2FE", "#FFFFFF"]}
      style={styles.container}
    >
      <View style={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Text style={styles.title}>Bienvenido</Text>
        <Text style={styles.subtitle}>Tu aplicación está lista</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 36,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "400",
    color: "#64748B",
    textAlign: "center",
  },
});
