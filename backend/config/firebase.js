const { initializeApp, getApps } = require('firebase/app');
const { getFirestore } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

let firebaseApp = null;
let db = null;

function getFirebaseFirestore() {
  if (db) return db;

  let config = null;
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (e) {
      console.error('Error reading firebase-applet-config.json:', e);
    }
  }

  if (!config) {
    config = {
      projectId: process.env.FIREBASE_PROJECT_ID || "project-f94b1d41-001d-40f1-9d4",
      appId: process.env.FIREBASE_APP_ID || "1:1037206846922:web:f68bf27446df0b619f6333",
      apiKey: process.env.FIREBASE_API_KEY || "AIzaSyBVrfsweyHrf80IXOBOGUwgz6CMMMTYMIE",
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || "project-f94b1d41-001d-40f1-9d4.firebaseapp.com",
      firestoreDatabaseId: process.env.FIREBASE_DATABASE_ID || "ai-studio-dtdeportivo-d5613635-afc1-4a01-aae0-0a03a02bd6c3",
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "project-f94b1d41-001d-40f1-9d4.firebasestorage.app",
    };
  }

  if (!getApps().length) {
    firebaseApp = initializeApp({
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      projectId: config.projectId,
      storageBucket: config.storageBucket,
      appId: config.appId
    });
  } else {
    firebaseApp = getApps()[0];
  }

  if (config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)') {
    db = getFirestore(firebaseApp, config.firestoreDatabaseId);
  } else {
    db = getFirestore(firebaseApp);
  }

  return db;
}

module.exports = {
  getFirebaseFirestore
};
