import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, StatusBar, View, Text, TouchableOpacity, BackHandler, AppState, Platform, KeyboardAvoidingView, Modal } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// ★ 보상형 광고(RewardedAd) Import 추가
import { InterstitialAd, AdEventType, BannerAd, BannerAdSize, RewardedAd, RewardedAdEventType } from 'react-native-google-mobile-ads';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

const INTERSTITIAL_AD_UNIT_ID = 'ca-app-pub-2627794215633228/9770283736';
const BANNER_AD_UNIT_ID = 'ca-app-pub-2627794215633228/7482464492';
// ★ 신규: 대표님이 주신 보상형 광고 ID 추가
const REWARDED_AD_UNIT_ID = 'ca-app-pub-2627794215633228/3785261636';

// ★ eCPM 단가 하락의 주범이었던 requestNonPersonalizedAdsOnly 속성 삭제 (수익률 펌핑)
const interstitial = InterstitialAd.createForAdRequest(INTERSTITIAL_AD_UNIT_ID, {});
const rewarded = RewardedAd.createForAdRequest(REWARDED_AD_UNIT_ID, {});

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const [adLoaded, setAdLoaded] = useState(false);
  // ★ 신규: 보상형 광고 로드 상태 추가
  const [rewardedLoaded, setRewardedLoaded] = useState(false);
  
  const [canGoBack, setCanGoBack] = useState(false);
  const [expoPushToken, setExpoPushToken] = useState('');
  
  // ★ 추가: 종료 팝업 표시 여부 상태
  const [exitModalVisible, setExitModalVisible] = useState(false);
  const webViewRef = useRef(null);

  useEffect(() => {
    async function registerForPushNotificationsAsync() {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#10B981',
        });
      }
      if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') return;
        
        const token = (await Notifications.getExpoPushTokenAsync({ projectId: '6f5776dd-be86-429e-a050-ca04a1294385' })).data;
        setExpoPushToken(token);
      }
    }
    registerForPushNotificationsAsync();
  }, []);

  useEffect(() => {
    if (expoPushToken && webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        window.dispatchEvent(new CustomEvent('expoPushToken', { detail: '${expoPushToken}' }));
        true;
      `);
    }
  }, [expoPushToken]);

  useEffect(() => {
    // ------------------------------------
    // 전면 광고 이벤트 세팅
    // ------------------------------------
    const unsubscribeLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
      setAdLoaded(true);
    });

    const unsubscribeClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      setAdLoaded(false);
      interstitial.load();
    });

    interstitial.load();

    // ------------------------------------
    // ★ 신규: 보상형 광고 이벤트 세팅
    // ------------------------------------
    const unsubscribeRewardedLoaded = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
      setRewardedLoaded(true);
    });

    const unsubscribeRewardedEarned = rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, reward => {
      // 광고를 다 봤을 때 프론트엔드(웹뷰) 쪽에 '보상 지급해라'는 신호를 쏨
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(`
          window.dispatchEvent(new Event('REWARD_EARNED'));
          true;
        `);
      }
    });

    const unsubscribeRewardedClosed = rewarded.addAdEventListener(AdEventType.CLOSED, () => {
      setRewardedLoaded(false);
      rewarded.load(); // 닫히면 바로 다음 보상형 광고 미리 로드
    });

    rewarded.load();

    const backAction = () => {
      // 1. 웹뷰 내부에 뒤로 갈 페이지가 있으면 뒤로 가기
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      // 2. 더 이상 뒤로 갈 곳이 없으면(로비화면 등) 자체 종료 팝업 띄우기
      setExitModalVisible(true);
      return true; // 안드로이드 기본 종료 동작 방어
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active' && webViewRef.current) {
        webViewRef.current.injectJavaScript(`
          window.dispatchEvent(new Event('appStateActive'));
          true;
        `);
      }
    });

    return () => {
      unsubscribeLoaded();
      unsubscribeClosed();
      unsubscribeRewardedLoaded();
      unsubscribeRewardedEarned();
      unsubscribeRewardedClosed();
      backHandler.remove();
      subscription.remove();
    };
  }, [canGoBack]);

  const onWebViewMessage = (event) => {
    const message = event.nativeEvent.data;
    
    // 전면 광고 호출 신호
    if (message === 'SHOW_ADMOB_AD') {
      if (adLoaded) interstitial.show();
    }
    // ★ 신규: 보상형 광고 호출 신호
    else if (message === 'SHOW_REWARDED_AD') {
      if (rewardedLoaded) rewarded.show();
    }
  };

  const handleExitApp = () => {
    setExitModalVisible(false);
    BackHandler.exitApp();
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar barStyle="light-content" backgroundColor="#111827" translucent={false} />
        
        <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <WebView 
            ref={webViewRef}
            source={{ uri: 'https://www.we-us.online/' }} 
            style={styles.webview}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowsBackForwardNavigationGestures={true}
            automaticallyAdjustContentInsets={false}
            scalesPageToFit={true}
            onMessage={onWebViewMessage}
            onNavigationStateChange={(navState) => setCanGoBack(navState.canGoBack)}
          />
        </KeyboardAvoidingView>

        {/* ★ 추가: 커스텀 종료 확인 팝업 모달 */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={exitModalVisible}
          onRequestClose={() => setExitModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>앱을 종료하시겠습니까?</Text>
              
              {/* 팝업 중앙에 배너 광고 배치 */}
              <View style={styles.modalBanner}>
                {/* ★ 배너 광고도 단가를 높이기 위해 requestOptions 속성 삭제 */}
                <BannerAd
                  unitId={BANNER_AD_UNIT_ID}
                  size={BannerAdSize.MEDIUM_RECTANGLE} // 모달창에 맞는 큰 직사각형 배너
                />
              </View>

              <View style={styles.modalButtonRow}>
                <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCancel]} onPress={() => setExitModalVisible(false)}>
                  <Text style={styles.modalBtnText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, styles.modalBtnExit]} onPress={handleExitApp}>
                  <Text style={[styles.modalBtnText, styles.modalBtnTextExit]}>종료하기</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  keyboardView: { flex: 1 },
  webview: { flex: 1, backgroundColor: '#111827' },
  
  // 모달창 디자인 설정
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    backgroundColor: '#1f2937', // 다크 테마 배경
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  modalBanner: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 20,
  },
  modalButtonRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    gap: 10,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalBtnCancel: {
    backgroundColor: '#374151',
  },
  modalBtnExit: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  modalBtnText: {
    color: '#d1d5db',
    fontWeight: 'bold',
    fontSize: 15,
  },
  modalBtnTextExit: {
    color: '#fca5a5',
  },
  
});