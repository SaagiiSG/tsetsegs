// Instagram, Facebook, TikTok and similar apps open links in their own browser. It keeps separate
// storage and a different user agent, so the 90-day device lock treats it as another device than
// Chrome or Safari on the same phone, and students get locked out.
const IN_APP = /Instagram|FBAN|FBAV|FB_IAB|musical_ly|BytedanceWebview|Snapchat|KAKAOTALK|\bLine\//i;

const ua = () => (typeof navigator === 'undefined' ? '' : navigator.userAgent);

export const isInAppBrowser = (userAgent = ua()) => IN_APP.test(userAgent);
export const isAndroid = (userAgent = ua()) => /Android/i.test(userAgent);

/** Android only: opens the same page in Chrome. iOS has no reliable equivalent. */
export const chromeIntentUrl = (href: string) => {
  const u = new URL(href);
  return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;package=com.android.chrome;end`;
};
