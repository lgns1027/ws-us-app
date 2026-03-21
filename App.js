import React, { useState, useEffect } from 'react';
import { StyleSheet, StatusBar, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// ★ 애드몹 모듈 불러오기 (배너 및 전면 광고)
import { InterstitialAd, AdEventType, BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';

// 대표님의 실제 광고 단위 ID
const INTERSTITIAL_AD_UNIT_ID = 'ca-app-pub-2627794215633228/9770283736'; // 전면 광고
const BANNER_AD_UNIT_ID = 'ca-app-pub-2627794215633228/7482464492';      // 배너 광고

// 전면 광고 객체 생성
const interstitial = InterstitialAd.createForAdRequest(INTERSTITIAL_AD_UNIT_ID, {
  requestNonPersonalizedAdsOnly: true,
});

export default function App() {
  const [adLoaded, setAdLoaded] = useState(false);

  useEffect(() => {
    // 전면 광고 로드 완료 이벤트
    const unsubscribeLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
      setAdLoaded(true);
    });
    
    // 유저가 전면 광고를 닫았을 때 (다음 대화를 위해 새 광고 미리 장전)
    const unsubscribeClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      setAdLoaded(false);
      interstitial.load(); 
    });

    interstitial.load(); // 앱 실행 시 첫 전면 광고 장전

    return () => {
      unsubscribeLoaded();
      unsubscribeClosed();
    };
  }, []);

  // Next.js 웹에서 보내는 신호를 받는 브릿지 함수
  const onWebViewMessage = (event) => {
    const message = event.nativeEvent.data;
    if (message === 'SHOW_ADMOB_AD') {
      if (adLoaded) {
        interstitial.show(); // 전면 광고 띄우기
      } else {
        console.log("전면 광고가 아직 준비되지 않았습니다.");
      }
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar barStyle="light-content" backgroundColor="#111827" translucent={false} />
        
        {/* 1. 웹뷰 (웹앱 화면) */}
        <WebView 
          source={{ uri: 'https://www.we-us.online/' }} 
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowsBackForwardNavigationGestures={true}
          automaticallyAdjustContentInsets={false}
          scalesPageToFit={true}
          onMessage={onWebViewMessage} // 브릿지 연결
        />

        {/* 2. 하단 고정 배너 광고 */}
        <View style={styles.bannerContainer}>
          <BannerAd
            unitId={BANNER_AD_UNIT_ID}
            size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
            requestOptions={{
              requestNonPersonalizedAdsOnly: true,
            }}
          />
        </View>

      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827', 
  },
  webview: {
    flex: 1,
    backgroundColor: '#111827',
  },
  bannerContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
  }
});