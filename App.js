import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';

import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import ForkliftCheckScreen from './src/screens/ForkliftCheckScreen';
import DriverInspectionScreen from './src/screens/DriverInspectionScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import HistoryScreen from './src/screens/HistoryScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="ForkliftCheck" component={ForkliftCheckScreen} />
          <Stack.Screen name="DriverInspection" component={DriverInspectionScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="History" component={HistoryScreen} />
        </Stack.Navigator>
      </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
