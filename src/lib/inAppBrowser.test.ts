import { describe, expect, it } from 'vitest';
import { chromeIntentUrl, isInAppBrowser } from './inAppBrowser';

const UA = {
  instagramIos: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 334.0.4.32.98 (iPhone14,5; iOS 17_5; en_US; en; scale=3.00; 1170x2532; 606553134)',
  instagramAndroid: 'Mozilla/5.0 (Linux; Android 14; SM-S918B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/125.0.6422.165 Mobile Safari/537.36 Instagram 334.0.0.42.95 Android (34/14; 480dpi; 1080x2340; samsung; SM-S918B; dm3q; qcom; en_US; 606307453)',
  facebookIos: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/470.0.0.37.106;FBBV/625048186;FBDV/iPhone14,5;FBMD/iPhone;FBSN/iOS;FBSV/17.5;FBSS/3;FBID/phone;FBLC/en_US;FBOP/5]',
  tiktokAndroid: 'Mozilla/5.0 (Linux; Android 13; Pixel 7 Build/TQ3A.230805.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/116.0.0.0 Mobile Safari/537.36 trill_340002 JsSdk/1.0 NetType/WIFI Channel/googleplay AppName/musical_ly app_version/34.0.2 ByteLocale/en BytedanceWebview/d8a21c6',
  chromeAndroid: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36',
  safariIos: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
};

describe('isInAppBrowser', () => {
  it('spots Instagram, Facebook and TikTok browsers', () => {
    for (const ua of [UA.instagramIos, UA.instagramAndroid, UA.facebookIos, UA.tiktokAndroid]) expect(isInAppBrowser(ua)).toBe(true);
  });
  it('leaves normal Chrome and Safari alone', () => {
    expect(isInAppBrowser(UA.chromeAndroid)).toBe(false);
    expect(isInAppBrowser(UA.safariIos)).toBe(false);
  });
});

describe('chromeIntentUrl', () => {
  it('reopens the same page in Chrome on Android', () => {
    expect(chromeIntentUrl('https://flowersos.co/practice?lang=mon')).toBe('intent://flowersos.co/practice?lang=mon#Intent;scheme=https;package=com.android.chrome;end');
  });
});
