import { MaterialCommunityIcons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useState, useEffect } from "react";
import {
  KeyboardAvoidingView,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
  Animated,
  Dimensions,
  ActivityIndicator
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RootStackParamList } from "../../App";
import { api } from "../config/Api";
import { useTheme } from "../theme/theme";
import { CustomAlertProvider, showCustomAlert } from "../components/CustomAlert";
import Logo from "../components/logo";
import Footer from "../components/footer";

type Props = NativeStackScreenProps<RootStackParamList, "RequestPassword">;

export default function RequestPasswordReset({ navigation }: Props) {
  const { colors, fonts } = useTheme();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [counter, setCounter] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState(false);

  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];
  const buttonScale = useState(new Animated.Value(1))[0];
  const pulseAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    // Run entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true
      })
    ]).start();
  }, []);

  // Timer for 60 seconds countdown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (loading && counter > 0) {
      timer = setTimeout(() => setCounter((prev) => prev - 1), 1000);
    }
    if (counter === 0) {
      setCanResend(true);
      startPulseAnimation();
    } else {
      setCanResend(false);
    }
    if (!loading) {
      setCounter(60);
      setCanResend(false);
    }
    return () => clearTimeout(timer);
  }, [loading, counter]);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true
        })
      ])
    ).start();
  };

  const handlePressIn = () => {
    Animated.timing(buttonScale, {
      toValue: 0.95,
      duration: 100,
      useNativeDriver: true
    }).start();
  };
  
  const handlePressOut = () => {
    Animated.timing(buttonScale, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true
    }).start();
  };

  const handlePasswordRecovery = async () => {
    if (!email) {
      showCustomAlert("Por favor, insira um e-mail válido.", "Campo obrigatório");
      return;
    }

    if (!validateEmail(email)) {
      showCustomAlert("Por favor, insira um e-mail válido.", "E-mail inválido");
      return;
    }

    setLoading(true);
    setCounter(60); // Reset counter when sending
    setCanResend(false);
    
    try {
      // 1. Send email to backend
      const response = await api.post("auth/password/forget", { email });
      if (response.status !== 200) {
        throw new Error(response.data?.message || "Erro ao enviar solicitação.");
      }
      
      showCustomAlert("Verifique sua caixa de entrada e confirme o e-mail.", "E-mail enviado!");
      await AsyncStorage.setItem("email", email);

      // 2. Start polling to check if email was confirmed
      await waitForEmailConfirmation(email);
    } catch (error: any) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  // Polling: check if email was confirmed in backend
  const waitForEmailConfirmation = async (email: string) => {
    let attempts = 0;
    const maxAttempts = 25;
    await delay(5000); // Wait 5 seconds before starting to check

    while (attempts < maxAttempts) {
      try {
        const response = await api.post("auth/email/confirmed", { email });
        // Backend returns { message: "email activated." } if confirmed
        if (
          response.status === 200 &&
          typeof response.data?.message === "string" &&
          response.data.message.trim().toLowerCase() === "email activated."
        ) {
          navigation.navigate("PasswordResetEmailConfirmed");
          return;
        }
      } catch (error: any) {
        // If not confirmed, ignore and try again
      }
      await delay(5000);
      attempts++;
    }
    
    showCustomAlert(
      "Confirmação de e-mail não concluída a tempo. Tente novamente.",
      "Tempo esgotado"
    );
  };

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const handleError = (error: any) => {
    if (!error.response) {
      showCustomAlert(
        error.message || "Erro desconhecido. Tente novamente.",
        "Erro"
      );
      return;
    }
    
    const { status, data } = error.response;
    const message = data?.message || "Tente novamente mais tarde.";
    
    switch (status) {
      case 400:
        showCustomAlert(message, "Erro de Validação");
        break;
      default:
        showCustomAlert(
          `Status: ${status || "N/A"} - ${message}`,
          "Erro Desconhecido"
        );
        break;
    }
  };
  
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  return (
    <CustomAlertProvider>
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
        <LinearGradient
          colors={[colors.primary, '#222222']}
          style={styles.gradientBackground}
        >
          <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Animated.View 
                style={[
                  styles.logoContainer, 
                  { 
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }]
                  }
                ]}
              >
                <Logo source={require("../assets/logo_white_label.png")} />
                <Text style={[styles.appTitle, { color: colors.secondary, fontFamily: fonts.bold }]}>
                  CHAMAGOL
                </Text>
                <Text style={[styles.tagline, { color: '#FFFFFF' }]}>
                  Seu universo esportivo
                </Text>
              </Animated.View>
              
              <Animated.View 
                style={[
                  styles.formContainer, 
                  { 
                    backgroundColor: colors.background,
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }]
                  }
                ]}
              >
                <Text style={[styles.title, { color: colors.primary, fontFamily: fonts.bold }]}>
                  Recuperação de Senha
                </Text>
                
                <Text style={[styles.subtitle, { color: colors.muted, fontFamily: fonts.regular }]}>
                  Insira seu e-mail para receber um link de recuperação de senha.
                </Text>
                
                <View style={[
                  styles.inputContainer,
                  isEmailFocused && styles.inputContainerFocused,
                  { borderColor: isEmailFocused ? colors.secondary : colors.muted }
                ]}>
                  <MaterialCommunityIcons 
                    name="email-outline" 
                    size={20} 
                    color={isEmailFocused ? colors.secondary : colors.muted} 
                    style={styles.inputIcon}
                  />
                  <TextInput
                    placeholder="E-mail"
                    placeholderTextColor={colors.muted}
                    value={email}
                    onChangeText={setEmail}
                    style={[
                      styles.input,
                      { color: colors.primary, fontFamily: fonts.regular }
                    ]}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    onFocus={() => setIsEmailFocused(true)}
                    onBlur={() => setIsEmailFocused(false)}
                  />
                </View>
                
                <Animated.View 
                  style={[
                    { 
                      width: '100%',
                      transform: [
                        { scale: canResend ? pulseAnim : buttonScale }
                      ] 
                    }
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      styles.button,
                      { backgroundColor: canResend || !loading ? colors.secondary : colors.muted }
                    ]}
                    onPress={handlePasswordRecovery}
                    disabled={loading && !canResend}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    activeOpacity={0.8}
                  >
                    {loading && !canResend ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Text style={[styles.buttonText, { color: '#FFF', fontFamily: fonts.bold }]}>
                          {canResend ? "REENVIAR E-MAIL" : "CONFIRMAR"}
                        </Text>
                        <MaterialCommunityIcons 
                          name={canResend ? "email-send" : "lock-reset"} 
                          size={20} 
                          color="#FFF" 
                        />
                      </>
                    )}
                  </TouchableOpacity>
                </Animated.View>
                
                {loading && counter > 0 && (
                  <View style={styles.statusContainer}>
                    <MaterialCommunityIcons 
                      name="timer-sand" 
                      size={20} 
                      color={colors.muted} 
                    />
                    <Text style={[styles.statusText, { color: colors.muted, fontFamily: fonts.regular }]}>
                      Aguardando confirmação... ({counter}s)
                    </Text>
                  </View>
                )}
                
                {canResend && (
                  <View style={styles.statusContainer}>
                    <MaterialCommunityIcons 
                      name="email-alert" 
                      size={20} 
                      color={colors.secondary} 
                    />
                    <Text style={[styles.statusText, { color: colors.secondary, fontFamily: fonts.regular }]}>
                      Não recebeu o e-mail? Você pode reenviar agora.
                    </Text>
                  </View>
                )}
                
                <TouchableOpacity
                  style={styles.backToLoginButton}
                  onPress={() => navigation.navigate("Login")}
                >
                  <MaterialCommunityIcons 
                    name="keyboard-backspace" 
                    size={20} 
                    color={colors.accent} 
                  />
                  <Text style={[styles.backToLoginText, { color: colors.accent, fontFamily: fonts.medium }]}>
                    Voltar para o login
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            </ScrollView>
            
            <Footer />
          </KeyboardAvoidingView>
        </LinearGradient>
      </SafeAreaView>
    </CustomAlertProvider>
  );
}

const { width } = Dimensions.get('window');
const styles = StyleSheet.create({
  gradientBackground: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: "space-between",
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    padding: 16,
  },
  logoContainer: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 10,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: "800",
    marginTop: 8,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 16,
    marginTop: 4,
    opacity: 0.8,
  },
  formContainer: {
    width: width - 32,
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 12,
    marginBottom: 24,
    backgroundColor: "#FFFFFF",
    width: "100%",
  },
  inputContainerFocused: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputIcon: {
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
  },
  button: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    width: "100%",
    height: 56,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "bold",
    marginRight: 8,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    paddingHorizontal: 12,
  },
  statusText: {
    fontSize: 14,
    marginLeft: 8,
    textAlign: "center",
  },
  backToLoginButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 32,
    padding: 12,
  },
  backToLoginText: {
    fontSize: 16,
    marginLeft: 8,
  }
});