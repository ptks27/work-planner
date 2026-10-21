/**
 * Default Firebase Configuration for Work Planner.
 * Embedded directly so all devices and team members can collaborate in real-time
 * without needing to manually paste Firebase API keys.
 */

export const DEFAULT_FIREBASE_CONFIG_OBJ = {
  apiKey: "AIzaSyAcwJdBZvX1g2ceeVpgq57SOHobx9pWVCU",
  authDomain: "work-planner-9caf4.firebaseapp.com",
  projectId: "work-planner-9caf4",
  storageBucket: "work-planner-9caf4.firebasestorage.app",
  messagingSenderId: "748278000140",
  appId: "1:748278000140:web:96c9ec1e9a223f24ad9c29",
  measurementId: "G-RDF5T509GH",
};

export const DEFAULT_FIREBASE_CONFIG = JSON.stringify(DEFAULT_FIREBASE_CONFIG_OBJ, null, 2);
