const DATA_PREFIX = "AR_GROUP_POS_DATA_V8_";
const CLOUD_COLLECTION = "market_pos_data";
const ACCESS_COLLECTION = "market_access";

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

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
const auth = getAuth(app);
const db = getFirestore(app);

let cloudReady = false;
let activeMarketId = null;
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

function accessDocRef(uid) {
  return doc(db, ACCESS_COLLECTION, uid);
}

function loadApp() {
  const script = document.createElement("script");
script.src = "app.js?v=11";
  document.body.appendChild(script);
}

async function loadMarketFromCloud(marketId) {
  const snap = await getDoc(marketDocRef(marketId));

  if (snap.exists() && snap.data()?.data) {
    originalSetItem(keyFromMarketId(marketId), JSON.stringify(snap.data().data));
  }
}

async function saveMarketToCloud(key, raw) {
  if (!cloudReady || !activeMarketId || !isMarketDataKey(key) || !raw) return;

  const marketId = marketIdFromKey(key);

  if (marketId !== activeMarketId) return;

  try {
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

  if (cloudReady && activeMarketId && isMarketDataKey(key)) {
    const marketId = marketIdFromKey(key);

    if (marketId === activeMarketId) {
      deleteDoc(marketDocRef(marketId)).catch(err => {
        console.log("Firebase delete error:", err);
      });
    }
  }
};

async function cloudLogin(email, password) {
  const result = await signInWithEmailAndPassword(auth, email, password);
  const uid = result.user.uid;

  const accessSnap = await getDoc(accessDocRef(uid));

  if (!accessSnap.exists()) {
    await signOut(auth);
    throw new Error("No market access found for this user");
  }

  const access = accessSnap.data();

  if (!access.marketId) {
    await signOut(auth);
    throw new Error("marketId is missing");
  }

  activeMarketId = access.marketId;
  cloudReady = true;

  await loadMarketFromCloud(activeMarketId);

  return {
    uid,
    email: result.user.email,
    marketId: access.marketId,
    role: access.role || "owner",
    shopName: access.shopName || access.marketId,
    phone: access.phone || ""
  };
}

async function cloudLogout() {
  cloudReady = false;
  activeMarketId = null;
  await signOut(auth);
}

window.AR_GROUP_CLOUD = {
  login: cloudLogin,
  logout: cloudLogout,
  getActiveMarketId: () => activeMarketId,
  saveRaw: saveMarketToCloud
};

loadApp();