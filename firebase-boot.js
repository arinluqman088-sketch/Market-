const DATA_PREFIX = "AR_GROUP_POS_DATA_V8_";
const CLOUD_COLLECTION = "market_pos_data";
const KNOWN_MARKETS = ["market1", "market2"];

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
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
const originalRemoveItem = localStorage.removeItem.bind(localStorage);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let cloudReady = false;
const saveTimers = {};

function isMarketDataKey(key) {
  return typeof key === "string" && key.startsWith(DATA_PREFIX);
}

function marketIdFromKey(key) {
  return key.replace(DATA_PREFIX, "");
}

function keyFromMarketId(marketId) {
  return DATA_PREFIX + marketId;
}

function marketDocRef(marketId) {
  return doc(db, CLOUD_COLLECTION, marketId);
}

function loadApp() {
  const script = document.createElement("script");
  script.src = "app.js?v=6";
  document.body.appendChild(script);
}

async function saveMarketToCloud(key, raw) {
  if (!cloudReady || !isMarketDataKey(key) || !raw) return;

  try {
    const marketId = marketIdFromKey(key);
    await setDoc(marketDocRef(marketId), {
      localStorageKey: key,
      data: JSON.parse(raw),
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.log("Firebase save error:", err);
  }
}

function scheduleCloudSave(key, raw) {
  if (!isMarketDataKey(key)) return;

  clearTimeout(saveTimers[key]);
  saveTimers[key] = setTimeout(() => saveMarketToCloud(key, raw), 700);
}

localStorage.setItem = function(key, value) {
  originalSetItem(key, value);

  if (isMarketDataKey(key)) {
    scheduleCloudSave(key, value);
  }
};

localStorage.removeItem = function(key) {
  originalRemoveItem(key);

  if (cloudReady && isMarketDataKey(key)) {
    const marketId = marketIdFromKey(key);
    deleteDoc(marketDocRef(marketId)).catch(err => {
      console.log("Firebase delete error:", err);
    });
  }
};

async function loadKnownMarketsFromCloud() {
  for (const marketId of KNOWN_MARKETS) {
    try {
      const snap = await getDoc(marketDocRef(marketId));
      if (snap.exists() && snap.data()?.data) {
        originalSetItem(keyFromMarketId(marketId), JSON.stringify(snap.data().data));
      }
    } catch (err) {
      console.log("Firebase load error:", marketId, err);
    }
  }
}

async function uploadExistingLocalMarkets() {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!isMarketDataKey(key)) continue;

    const raw = originalGetItem(key);
    if (raw) await saveMarketToCloud(key, raw);
  }
}

async function boot() {
  await loadKnownMarketsFromCloud();
  cloudReady = true;
  await uploadExistingLocalMarkets();
  loadApp();
}

boot();