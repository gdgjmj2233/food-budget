import { getApp, getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

// 브라우저에 그대로 보이는 값이라 숨기지 않아도 된다. 데이터는 Firestore 규칙으로 본인만 읽고 쓸 수 있다.
const CONFIG = {
  apiKey: 'AIzaSyA1RN8-5yJUC_9Zm0qhJzRa5C41qRX40fg',
  authDomain: 'gdgjmj-56e48.firebaseapp.com',
  projectId: 'gdgjmj-56e48',
  storageBucket: 'gdgjmj-56e48.firebasestorage.app',
  messagingSenderId: '495894377363',
  appId: '1:495894377363:web:eaf20d12ccae0f31882e66',
};

const firstRun = getApps().length === 0;
const app = firstRun ? initializeApp(CONFIG) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);

// 시험할 때만 내 컴퓨터의 가짜 Firebase 에 연결한다
if (firstRun && process.env.NEXT_PUBLIC_FIREBASE_EMULATOR) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}
