import React from 'react';
import { StyleSheet, StatusBar, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
// ★ Deprecated 된 SafeAreaView 대신 최신 라이브러리 사용
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

export default function App() {
  return (
    <SafeAreaProvider>
      {/* 하단 제스처 바(홈 바) 영역까지 우리 색상으로 채우기 위해 edges={['top']} 설정 */}
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* 상태바 색상 최적화 */}
        <StatusBar barStyle="light-content" backgroundColor="#111827" translucent={false} />
        <WebView 
          source={{ uri: 'https://www.we-us.online/' }} 
          style={styles.webview}

          // 모바일 웹뷰 최적화 필수 옵션
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowsBackForwardNavigationGestures={true} // 스와이프 뒤로가기
          automaticallyAdjustContentInsets={false}
          scalesPageToFit={true}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // 로딩 전이나 빈 공간에 보여줄 배경색 (우리 gray-900 값)
    backgroundColor: '#111827', 
  },
  webview: {
    flex: 1,
    backgroundColor: '#111827',
  },
});