// Firebase Service Worker for Push Notifications
// This file should be in the public directory

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDWEW6GUsjgJiQFOmXR0hER61LN-mszazE",
  authDomain: "ecobuy-1f81e.firebaseapp.com",
  projectId: "ecobuy-1f81e",
  storageBucket: "ecobuy-1f81e.firebasestorage.app",
  messagingSenderId: "342797259826",
  appId: "1:342797259826:web:338fe4b71c2cea2c1f182b",
  measurementId: "G-JND0EDQ7KF"
};

firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || 'New Notification';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/icon.svg',
    badge: '/icon.svg',
    data: payload.data,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});




