import React from 'react';
import { SafeAreaView, StatusBar, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      {/* 상태바 색상을 우리 서비스 배경색과 맞춥니다. */}
      <StatusBar barStyle="light-content" backgroundColor="#111827" />
      <WebView 
        // ★ 여기에 우리 웹사이트 주소를 넣습니다.
        source={{ uri: 'https://www.we-us.online/' }} 
        style={styles.webview}
        
        // 성능 및 모바일 최적화 옵션들
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        allowsBackForwardNavigationGestures={true} // 스와이프로 뒤로가기 가능
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827', // 로딩 중 보여줄 배경색
    // 안드로이드 상단바 겹침 방지
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  webview: {
    flex: 1,
  },
});