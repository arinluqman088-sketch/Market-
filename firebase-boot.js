const LS = "CAFE_POS_PRO_DATA_V1";
const CLOUD_COLLECTION = "pos_systems";
const CLOUD_DOC = "main";

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDCIgvPGdmIj8sZXCzW8cSNubyBBp9GcKY",
  authDomain: "ar-group-pharmacy.firebaseapp.com",
  projectId: "ar-group-pharmacy",
  storageBucket: "ar-group-pharmacy.firebasestorage.app",
  messagingSenderId: "882271082343",
  appId: "1:882271082343:web:fbb96bfe1446e379f0c1c2"
};

const originalSetItem = localStorage.setItem.bind(localStorage);
const originalGetItem = localStorage.getItem.bind(localStorage);

let cloudReady = false;
let saveTimer = null;

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const cloudRef = doc(db, CLOUD_COLLECTION, CLOUD_DOC);

function loadApp() {
  const script = document.createElement("script");
  script.src = "app.js?v=5";
  document.body.appendChild(script);
}

async function saveCloud(raw) {
  if (!cloudReady || !raw) return;

  try {
    await setDoc(cloudRef, {
      data: JSON.parse(raw),
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.log("Firebase save error:", err);
  }
}

localStorage.setItem = function(key, value) {
  originalSetItem(key, value);

  if (key === LS) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveCloud(value), 700);
  }
};

async function boot() {
  try {
    const snap = await getDoc(cloudRef);

    if (snap.exists() && snap.data().data) {
      originalSetItem(LS, JSON.stringify(snap.data().data));
    } else {
      const localData = originalGetItem(LS);
      if (localData) {
        await setDoc(cloudRef, {
          data: JSON.parse(localData),
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
    }
  } catch (err) {
    console.log("Firebase load error:", err);
  }

  cloudReady = true;
  loadApp();
}

boot();