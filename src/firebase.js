// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// 這裡貼上您剛剛從 Firebase Console 複製的內容
const firebaseConfig = {
  apiKey: 'AIzaSyC9xyXEs3lVqiSnv5JV2og7yjYMdf9Vr-M',
  authDomain: 'smart-campus-db-919b9.firebaseapp.com',
  projectId: 'smart-campus-db-919b9',
  storageBucket: 'smart-campus-db-919b9.firebasestorage.app',
  messagingSenderId: '1054476837332',
  appId: '1:1054476837332:web:4ba66b14f114bcac42b641',
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
// 初始化資料庫
export const db = getFirestore(app);
