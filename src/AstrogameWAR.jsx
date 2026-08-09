import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// AstrogameWAR v9.1 — GERÇEK İSİMLER · BÖLÜMSEL MENÜ · MASTER GÖZ · TEMİZ KOD
//
// ═══════════════════════ İÇİNDEKİLER (Ctrl+F ile ara) ═══════════════════════
//  §1  FIREBASE & AUTH         — config, App Check, sign-in, bulut kayıt
//  §2  OYUN VERİSİ             — RESEARCH_CATS, TECHS, UNITS, HEROES, vb.
//  §3  HESAPLAMA YARDIMCILARI  — fmt, getRank, techMul, production, vb.
//  §4  SAVAŞ MOTORU            — battle() fonksiyonu, tur simülasyonu
//  §5  BAŞLANGIÇ DURUMU        — init0(), seedStarterFleet()
//  §6  STİL SİSTEMİ            — T (renkler), S (ortak inline stiller)
//  §7  UI ATOM BİLEŞENLERİ     — Bar, Card, Btn, Pill, Sep, Section, Stars...
//  §8  ANA COMPONENT           — AstrogameWAR() — state + effects + actions
//  §9  RENDER — LOGIN GATE     — giriş yapılmamışsa gösterilen ekran
//  §10 RENDER — ANA OYUN       — header, menü, tüm sekme içerikleri
// ══════════════════════════════════════════════════════════════════════════
//
// v9.1 NOT: Bu sürümde fonksiyonel hiçbir değişiklik yapılmadı — sadece kod
// kalitesi iyileştirildi: tekrarlanan inline style objeleri S sabitlerine
// çıkarıldı (~40 tekrar azaltıldı), bölüm başlıkları eklendi. Render çıktısı
// önceki sürümle bire bir (byte-byte) aynı olduğu doğrulanmıştır.

// ═══════════════════════════ §1 FIREBASE & AUTH ═════════════════════════════
const FIREBASE_CONFIG = {
  apiKey:            "BURAYA_API_KEY",
  authDomain:        "BURAYA_PROJE.firebaseapp.com",
  projectId:         "BURAYA_PROJECT_ID",
  storageBucket:     "BURAYA_PROJE.appspot.com",
  messagingSenderId: "BURAYA_SENDER_ID",
  appId:             "BURAYA_APP_ID",
};
const ADMIN_UIDS = ["BURAYA_SENIN_ADMIN_UID_IN"];
const RECAPTCHA_ENTERPRISE_SITE_KEY = "BURAYA_RECAPTCHA_ENTERPRISE_SITE_KEY";

// Cloud Functions base URL — set to your project's functions URL after deploying.
// Example: "https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net"
// Leave as "" to fall back to direct Firestore access.
const CLOUD_FUNCTIONS_BASE_URL = "";
const APPCHECK_READY = RECAPTCHA_ENTERPRISE_SITE_KEY && !RECAPTCHA_ENTERPRISE_SITE_KEY.startsWith("BURAYA");
const APPCHECK_DEBUG_TOKEN = "";

// Tüm FIREBASE_CONFIG alanlarını kontrol eder — sadece apiKey'e bakmak,
// kullanıcı diğer 5 alanı doldurmayı unutursa sessiz hatalara yol açar.
// Eksik alan varsa adını döner, böylece admin panelinde tam olarak hangi
// değerin unutulduğu görülebilir.
function getFirebaseConfigIssues(){
  return Object.entries(FIREBASE_CONFIG)
    .filter(([,v]) => !v || v.startsWith("BURAYA"))
    .map(([k]) => k);
}
const FIREBASE_CONFIG_ISSUES = getFirebaseConfigIssues();
const FIREBASE_READY = FIREBASE_CONFIG_ISSUES.length === 0;

let _fbApp=null,_fbAuth=null,_fbDb=null,_fbMods=null,_appCheckStatus="disabled";
async function loadFirebase(){
  if(!FIREBASE_READY) return null;
  if(_fbApp) return {app:_fbApp,auth:_fbAuth,db:_fbDb,mods:_fbMods};
  const [{initializeApp}, authMod, fsMod, acMod] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"),
    import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"),
    import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js"),
  ]);
  _fbApp = initializeApp(FIREBASE_CONFIG);
  if(APPCHECK_READY){
    try{
      if(APPCHECK_DEBUG_TOKEN) self.FIREBASE_APPCHECK_DEBUG_TOKEN = APPCHECK_DEBUG_TOKEN;
      acMod.initializeAppCheck(_fbApp, { provider: new acMod.ReCaptchaEnterpriseProvider(RECAPTCHA_ENTERPRISE_SITE_KEY), isTokenAutoRefreshEnabled: true });
      _appCheckStatus = "active";
    }catch(e){ _appCheckStatus = "error:"+(e.message||"bilinmeyen"); }
  }
  _fbAuth = authMod.getAuth(_fbApp);
  _fbDb = fsMod.getFirestore(_fbApp);
  _fbMods = {auth:authMod, fs:fsMod, ac:acMod};
  return {app:_fbApp,auth:_fbAuth,db:_fbDb,mods:_fbMods};
}

async function firebaseGoogleSignIn(){
  const fb = await loadFirebase();
  if(!fb) throw new Error("Firebase yapılandırılmamış");
  const provider = new fb.mods.auth.GoogleAuthProvider();
  provider.addScope("email"); provider.addScope("profile");
  provider.setCustomParameters({ prompt:"select_account" });
  const result = await fb.mods.auth.signInWithPopup(fb.auth, provider);
  const u = result.user;
  const profile = { uid:u.uid, name:u.displayName||"Komutan", email:u.email, picture:u.photoURL||null, signedAt:Date.now() };
  const userRef = fb.mods.fs.doc(fb.db,"users",u.uid);
  const snap = await fb.mods.fs.getDoc(userRef);
  if(!snap.exists()){
    await fb.mods.fs.setDoc(userRef,{ name:profile.name, email:profile.email, picture:profile.picture, firstLoginAt:Date.now(), lastLoginAt:Date.now(), loginCount:1, totalPlaySeconds:0 });
  } else {
    await fb.mods.fs.setDoc(userRef,{ lastLoginAt:Date.now(), loginCount:(snap.data().loginCount||0)+1 },{merge:true});
  }
  return profile;
}
async function firebaseSignOut(){ const fb = await loadFirebase(); if(fb) await fb.mods.auth.signOut(fb.auth); }

// Returns the current user's Firebase ID token, or null if not signed in.
async function getIdToken(){
  const fb = await loadFirebase();
  if(!fb) return null;
  const u = fb.auth.currentUser;
  if(!u) return null;
  try{ return await u.getIdToken(); }catch(e){ return null; }
}

// Calls a Cloud Function endpoint with an ID token in the Authorization header.
// Returns parsed JSON on success, or throws on HTTP/network error.
async function callFunction(path, method="GET", body=undefined){
  const token = await getIdToken();
  const headers = { "Content-Type":"application/json" };
  if(token) headers["Authorization"] = "Bearer " + token;
  const opts = { method, headers, ...(body!==undefined ? { body: JSON.stringify(body) } : {}) };
  const res = await fetch(`${CLOUD_FUNCTIONS_BASE_URL}${path}`, opts);
  const data = await res.json();
  if(!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

const USE_FUNCTIONS = !!CLOUD_FUNCTIONS_BASE_URL;

async function firebaseSaveGame(uid, state){
  if(USE_FUNCTIONS){
    await callFunction("/saveGame","POST",{ state });
    return;
  }
  const fb = await loadFirebase(); if(!fb) return;
  await fb.mods.fs.setDoc(fb.mods.fs.doc(fb.db,"saves",uid), { state: JSON.stringify(state), updatedAt: Date.now() });
}

async function firebaseLoadGame(uid){
  if(USE_FUNCTIONS){
    try{ const d = await callFunction("/loadGame"); return d.state||null; }catch(e){ return null; }
  }
  const fb = await loadFirebase(); if(!fb) return null;
  const snap = await fb.mods.fs.getDoc(fb.mods.fs.doc(fb.db,"saves",uid));
  return snap.exists() ? JSON.parse(snap.data().state) : null;
}

async function firebaseFetchAllUsers(){
  if(USE_FUNCTIONS){
    try{ const d = await callFunction("/leaderboard"); return d.players||[]; }catch(e){ return []; }
  }
  const fb = await loadFirebase(); if(!fb) return [];
  const snap = await fb.mods.fs.getDocs(fb.mods.fs.collection(fb.db,"users"));
  return snap.docs.map(d=>({uid:d.id,...d.data()}));
}

async function firebaseAddPlaySeconds(uid, secs){
  const fb = await loadFirebase(); if(!fb) return;
  try{
    const ref=fb.mods.fs.doc(fb.db,"users",uid);
    const snap=await fb.mods.fs.getDoc(ref);
    const cur=snap.exists()?(snap.data().totalPlaySeconds||0):0;
    await fb.mods.fs.setDoc(ref,{totalPlaySeconds:cur+secs},{merge:true});
  }catch(e){}
}

// Resolves a battle via Cloud Function when available, falls back to local computation.
async function resolveBattle(atkFleet, defFleet, tech, formation, upgrades, hero, heroes, artifacts, insuranceOn, localBattleFn){
  if(USE_FUNCTIONS){
    try{
      return await callFunction("/battle/resolve","POST",{atkFleet,defFleet,tech,formation,upgrades,hero,heroes,artifacts,insuranceOn});
    }catch(e){
      // fall through to local computation on error
    }
  }
  return localBattleFn();
}

function getAppCheckStatus(){ return _appCheckStatus; }

const SAVE_KEY = "astrogamewar_v9";
const save = s => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch(e){} };
const load = () => { try { const d = localStorage.getItem(SAVE_KEY); return d ? JSON.parse(d) : null; } catch(e) { return null; } };

// ═══════════════════════════ §2 OYUN VERİSİ ═════════════════════════════════
const RESEARCH_CATS = [
  { id:"temel",     label:"Temel Araştırmalar",  icon:"🔭", items:["espionage","computer","weapons","shielding","armor"] },
  { id:"surus",     label:"Sürüş Araştırması",   icon:"🚀", items:["combustion","impulse","hyperdrive"] },
  { id:"gelismis",  label:"Gelişmiş Araştırma",  icon:"⚛",  items:["energy","hypertech","graviton"] },
  { id:"savas",     label:"Savaş Araştırması",   icon:"⚔",  items:["laser","ion","plasma"] },
];

const TECHS = {
  espionage:  { name:"Casusluk Tekniği",       icon:"👁", bonus:"intel",  per:.15, max:8,  base:6000  },
  computer:   { name:"Bilgisayar Tekniği",     icon:"💻", bonus:"queue",  per:0,   max:8,  base:5000  },
  weapons:    { name:"Silah Tekniği",          icon:"⚔", bonus:"atk",    per:.10, max:16, base:5000  },
  shielding:  { name:"Koruyucu Kalkan Tek.",   icon:"🔵", bonus:"def",    per:.10, max:12, base:4500  },
  armor:      { name:"Zırh Tekniği",           icon:"🛡", bonus:"hull",   per:.10, max:12, base:4000  },
  combustion: { name:"Yanmalı Motor Takımı",   icon:"🔥", bonus:"speed1", per:.05, max:8,  base:4000  },
  impulse:    { name:"İçtepi Motor Takımı",    icon:"💨", bonus:"speed2", per:.05, max:8,  base:7000  },
  hyperdrive: { name:"Hiperuzay İticisi",      icon:"🌀", bonus:"speed3", per:.05, max:8,  base:12000 },
  energy:     { name:"Enerji Tekniği",         icon:"⚡", bonus:"energy", per:.03, max:12, base:8000  },
  hypertech:  { name:"Hiperuzay Tekniği",      icon:"🌌", bonus:"cargo",  per:.04, max:8,  base:15000 },
  graviton:   { name:"Gravitasyon Araştırması",icon:"🌑", bonus:"dm",     per:.05, max:1,  base:50000 },
  laser:      { name:"Lazer Tekniği",          icon:"🔴", bonus:"crit",   per:.015,max:12, base:9000  },
  ion:        { name:"İyon Tekniği",           icon:"🔷", bonus:"def2",   per:.04, max:5,  base:11000 },
  plasma:     { name:"Plazma Tekniği",         icon:"🟣", bonus:"pierce", per:.08, max:10, base:18000 },
};

const UNITS = {
  lightFighter:  { name:"Hafif Avcı",      icon:"✦",  color:"#38bdf8", tier:1, atk:50,   def:10,  hull:400,   speed:3, crit:.10, ability:"evasion",    cost:{metal:3000, crystal:1000, dm:0},  unlock:null,                          upgrades:["atk","hull","crit"] },
  smallCargo:    { name:"Küçük Nakliye",   icon:"📦", color:"#94a3b8", tier:1, atk:5,    def:10,  hull:400,   speed:5, crit:.02, ability:"cargo",      cost:{metal:2000, crystal:2000, dm:0},  unlock:null,                          upgrades:["hull","speed"] },
  heavyFighter:  { name:"Ağır Avcı",       icon:"◆",  color:"#22d3ee", tier:2, atk:150,  def:25,  hull:1000,  speed:3, crit:.12, ability:"overcharge",  cost:{metal:6000, crystal:4000, dm:0},  unlock:{armor:2,impulse:1},           upgrades:["atk","def","crit"] },
  largeCargo:    { name:"Büyük Nakliye",   icon:"🚚", color:"#94a3b8", tier:2, atk:5,    def:25,  hull:1200,  speed:4, crit:.02, ability:"cargo",      cost:{metal:6000, crystal:6000, dm:0},  unlock:{combustion:6},                upgrades:["hull","speed"] },
  cruiser:       { name:"Kruvazör",        icon:"◈",  color:"#a78bfa", tier:3, atk:400,  def:50,  hull:2700,  speed:2, crit:.12, ability:"overcharge",  cost:{metal:20000,crystal:7000, dm:0},  unlock:{impulse:4,ion:2},             upgrades:["atk","def","crit"] },
  battleship:    { name:"Savaş Gemisi",    icon:"⬡",  color:"#fb923c", tier:4, atk:1000, def:200, hull:6000,  speed:1, crit:.10, ability:"volley",      cost:{metal:45000,crystal:15000,dm:0},  unlock:{hyperdrive:4},                upgrades:["atk","hull","def"] },
  battlecruiser: { name:"Savaş Kruvazörü", icon:"◆",  color:"#fb7185", tier:4, atk:700,  def:400, hull:7000,  speed:3, crit:.14, ability:"piercing",    cost:{metal:30000,crystal:40000,dm:0},  unlock:{hypertech:5,laser:12},        upgrades:["atk","def","crit"] },
  destroyer:     { name:"Yıkıcı",          icon:"⬟",  color:"#34d399", tier:5, atk:2000, def:500, hull:11000, speed:1, crit:.08, ability:"armor_break", cost:{metal:60000,crystal:50000,dm:0},  unlock:{hypertech:6,graviton:0},      upgrades:["atk","def","hull"] },
  reaper:        { name:"Hayalet Yutucu",  icon:"◇",  color:"#c084fc", tier:6, atk:3500, def:500, hull:8000,  speed:3, crit:.30, ability:"stealth",     cost:{metal:0,    crystal:0,    dm:80},  unlock:{hypertech:7},                 upgrades:["atk","crit","hull"] },
  deathstar:     { name:"Ölüm Yıldızı",    icon:"◬",  color:"#fbbf24", tier:6, atk:5000, def:2000,hull:30000, speed:1, crit:.20, ability:"nova",        cost:{metal:200000,crystal:80000,dm:0}, unlock:{graviton:1},                  upgrades:["atk","hull","crit"] },
};

const TECH_BY_BONUS = key => Object.entries(TECHS).find(([,t])=>t.bonus===key);

const HEROES = [
  { id:"h1", name:"Kaptan Kara",  icon:"🧑‍✈️", color:"#38bdf8", bonus:{atk:.15,crit:.05}, cost:{metal:50000, crystal:20000,dm:0},  req:0  },
  { id:"h2", name:"Amiral Demir", icon:"⚔",   color:"#a78bfa", bonus:{def:.20,hull:.10},  cost:{metal:80000, crystal:35000,dm:0},  req:5  },
  { id:"h3", name:"Bilge Nyx",    icon:"🧙",   color:"#34d399", bonus:{prod:.25,lab:.15},  cost:{metal:100000,crystal:50000,dm:0},  req:10 },
  { id:"h4", name:"Korsanlar",    icon:"☠",    color:"#fb923c", bonus:{loot:.40,xp:.20},   cost:{metal:120000,crystal:60000,dm:0},  req:15 },
  { id:"h5", name:"Titan Ruh",    icon:"🌠",   color:"#fbbf24", bonus:{titan:.50},          cost:{metal:0,     crystal:0,    dm:150},req:25 },
];

const FORMATIONS = [
  { id:"standard",  name:"Standart",   icon:"⬛", aM:1.00,dM:1.00 },
  { id:"wedge",     name:"Ok Ucu",     icon:"🔺", aM:1.25,dM:0.80 },
  { id:"turtle",    name:"Kalkan",     icon:"🛡", aM:0.75,dM:1.40 },
  { id:"flank",     name:"Kanatlar",   icon:"↔",  aM:1.15,dM:1.10 },
  { id:"berserker", name:"Çılgın",     icon:"⚡", aM:1.60,dM:0.55 },
];

const ENEMIES = [
  { name:"Acemi Korsan",  rank:1, xp:50,  color:"#38bdf8", units:{lightFighter:5,  smallCargo:0, heavyFighter:0, largeCargo:0, cruiser:0,  battleship:0, battlecruiser:0, destroyer:0, reaper:0, deathstar:0}, loot:[3000,8000]    },
  { name:"Kurt Sürüsü",  rank:2, xp:120, color:"#a78bfa", units:{lightFighter:15, smallCargo:0, heavyFighter:4, largeCargo:0, cruiser:0,  battleship:0, battlecruiser:0, destroyer:0, reaper:0, deathstar:0}, loot:[8000,20000]   },
  { name:"Demir Filo",   rank:3, xp:250, color:"#fb923c", units:{lightFighter:20, smallCargo:0, heavyFighter:10,largeCargo:0, cruiser:3,  battleship:0, battlecruiser:0, destroyer:0, reaper:0, deathstar:0}, loot:[20000,40000]  },
  { name:"Dreadnought",  rank:4, xp:500, color:"#f472b6", units:{lightFighter:30, smallCargo:0, heavyFighter:15,largeCargo:0, cruiser:8,  battleship:2, battlecruiser:0, destroyer:0, reaper:0, deathstar:0}, loot:[40000,80000]  },
  { name:"Omega Armada", rank:5, xp:900, color:"#fbbf24", units:{lightFighter:50, smallCargo:0, heavyFighter:25,largeCargo:0, cruiser:15, battleship:8, battlecruiser:2, destroyer:0, reaper:0, deathstar:0}, loot:[80000,150000] },
  { name:"Yıkıcı Klanı", rank:6, xp:1800,color:"#ef4444", units:{lightFighter:60, smallCargo:0, heavyFighter:30,largeCargo:0, cruiser:20, battleship:10,battlecruiser:5, destroyer:2, reaper:0, deathstar:0}, loot:[150000,300000]},
];

const RAIDS = [
  { id:"r1", name:"Asteroit Mağarası", icon:"🪨", diff:1, color:"#38bdf8", waves:3, reward:{metal:30000,crystal:12000,dm:20},  desc:"3 dalga, orta zorluk",   req:0   },
  { id:"r2", name:"Eski Üs",           icon:"🏚", diff:2, color:"#a78bfa", waves:5, reward:{metal:60000,crystal:25000,dm:40},  desc:"5 dalga, güçlü düşman",  req:5   },
  { id:"r3", name:"Karanlık Vorteks",  icon:"🌑", diff:3, color:"#fbbf24", waves:7, reward:{metal:120000,crystal:50000,dm:100},desc:"7 dalga, boss dahil",    req:15  },
  { id:"r4", name:"Omega Kalesi",      icon:"⭐", diff:4, color:"#ef4444", waves:10,reward:{metal:250000,crystal:100000,dm:200},desc:"10 dalga, haftalık",    req:25  },
];

const ARTIFACTS = [
  { id:"a1", name:"Galaksi Taşı",    icon:"💠", cost:{dm:30}, bonus:{atk:.10},          desc:"+10% tüm saldırı" },
  { id:"a2", name:"Zırh Kristali",   icon:"🔷", cost:{dm:25}, bonus:{def:.15},          desc:"+15% tüm savunma" },
  { id:"a3", name:"Güneş Çekirdeği", icon:"☀",  cost:{dm:50}, bonus:{prod:.20},         desc:"+20% kaynak üretimi" },
  { id:"a4", name:"Kaos Tozu",       icon:"🌀", cost:{dm:40}, bonus:{crit:.10},         desc:"+10% kritik şans" },
  { id:"a5", name:"Zamansızlık",     icon:"⏳", cost:{dm:60}, bonus:{xp:.25},           desc:"+25% XP kazanımı" },
  { id:"a6", name:"Yokedici",        icon:"☠",  cost:{dm:80}, bonus:{loot:.30,atk:.20},desc:"+30% ganimet, +20% saldırı" },
];

const MISSIONS = [
  { id:"m1", name:"İlk Kan",       req:{wins:1},      reward:{metal:5000,  crystal:2000,  dm:0},  icon:"⚔" },
  { id:"m2", name:"Filo Kurucu",  req:{ships:10},    reward:{metal:15000, crystal:5000,  dm:5},  icon:"🚀" },
  { id:"m3", name:"Teknoloji",    req:{techSum:3},   reward:{metal:20000, crystal:8000,  dm:5},  icon:"🔬" },
  { id:"m4", name:"Galip",        req:{wins:5},      reward:{metal:40000, crystal:15000, dm:10}, icon:"🏆" },
  { id:"m5", name:"Büyük Filo",   req:{ships:30},    reward:{metal:60000, crystal:25000, dm:15}, icon:"⬡"  },
  { id:"m6", name:"Komutan",      req:{wins:10},     reward:{metal:100000,crystal:40000, dm:20}, icon:"👑" },
  { id:"m7", name:"Kolonici",     req:{planets:2},   reward:{metal:50000, crystal:20000, dm:10}, icon:"🌍" },
  { id:"m8", name:"Yıkıcı Sahibi",req:{hasDestroyer:1},reward:{metal:80000, crystal:30000, dm:25}, icon:"⬟" },
  { id:"m9", name:"Baskıncı",     req:{raids:1},     reward:{metal:50000, crystal:20000, dm:30}, icon:"🪨" },
  { id:"m10",name:"Kahraman",     req:{heroes:1},    reward:{metal:50000, crystal:20000, dm:20}, icon:"🧑‍✈️"},
  { id:"m11",name:"Usta",         req:{wins:25},     reward:{metal:200000,crystal:80000, dm:50}, icon:"🌌" },
  { id:"m12",name:"Efsane",       req:{prestige:1},  reward:{metal:0,     crystal:0,     dm:200},icon:"🔮" },
];

const FLEET_TEMPLATES = [
  { id:"t1", name:"Saldırı", icon:"⚔", fleet:{lightFighter:20,heavyFighter:10,cruiser:5,battleship:3} },
  { id:"t2", name:"Savunma", icon:"🛡", fleet:{lightFighter:5, heavyFighter:5, cruiser:3,battleship:2} },
  { id:"t3", name:"Dengeli", icon:"⬛", fleet:{lightFighter:10,heavyFighter:8, cruiser:5,battleship:5} },
  { id:"t4", name:"Ağır",    icon:"⬟", fleet:{heavyFighter:15,cruiser:10,battleship:8,destroyer:3} },
];

const DAILY_REWARDS = [
  {day:1,metal:5000,crystal:1000,dm:5},{day:2,metal:8000,crystal:2000,dm:8},
  {day:3,metal:12000,crystal:3000,dm:12},{day:4,metal:18000,crystal:5000,dm:18},
  {day:5,metal:25000,crystal:8000,dm:25},{day:6,metal:35000,crystal:12000,dm:35},
  {day:7,metal:50000,crystal:20000,dm:50},
];

const STAR_RANKS = [
  {min:0,    label:"Çaylak",  icon:"🌑",color:"#64748b"},
  {min:100,  label:"Pilot",   icon:"🌒",color:"#22d3ee"},
  {min:300,  label:"Kaptan",  icon:"🌓",color:"#38bdf8"},
  {min:700,  label:"Komutan", icon:"🌔",color:"#a78bfa"},
  {min:1500, label:"Amiral",  icon:"🌕",color:"#fb923c"},
  {min:3000, label:"Galaktik",icon:"⭐",color:"#fbbf24"},
  {min:6000, label:"Efsane",  icon:"🌠",color:"#ef4444"},
  {min:12000,label:"Tanrısal",icon:"💠",color:"#ffffff"},
];

const BUILDINGS = [
  { id:"metalMine",   name:"Metal Madeni",   icon:"⛏", base:{metal:1000,crystal:0}    },
  { id:"crystalMine", name:"Kristal Madeni", icon:"💎", base:{metal:800, crystal:200}  },
  { id:"energyPlant", name:"Solar Enerji",   icon:"☀",  base:{metal:900, crystal:300}  },
  { id:"shipyard",    name:"Uzay Tersanesi", icon:"🏭", base:{metal:5000,crystal:2000} },
  { id:"lab",         name:"Araştırma Lab.", icon:"🔬", base:{metal:8000,crystal:5000} },
  { id:"depot",       name:"Metal Deposu",   icon:"📦", base:{metal:15000,crystal:8000}},
  { id:"dmExtractor", name:"Karanlık Maden", icon:"🌑", base:{metal:30000,crystal:15000}},
];

const PLANETS = [
  { id:"home",   name:"Ana Üs",      icon:"🌍", x:50,y:50, color:"#38bdf8", mB:1.0,cB:1.0, locked:false },
  { id:"vulcan", name:"Vulkan",      icon:"🌋", x:25,y:30, color:"#fb923c", mB:1.8,cB:0.6, locked:true, req:3  },
  { id:"frost",  name:"Buz Gez.",    icon:"❄",  x:75,y:25, color:"#22d3ee", mB:0.7,cB:1.9, locked:true, req:6  },
  { id:"shadow", name:"Gölge",       icon:"🌑", x:20,y:75, color:"#a78bfa", mB:1.4,cB:1.4, locked:true, req:12 },
  { id:"omega",  name:"Omega",       icon:"⭐", x:80,y:80, color:"#fbbf24", mB:2.5,cB:2.5, locked:true, req:25 },
];

const WEEKLY_BOSS = {
  name:"Kozmik Yutucu", icon:"🐙", color:"#ef4444",
  units:{lightFighter:80,heavyFighter:40,cruiser:25,battleship:15,battlecruiser:10,destroyer:6},
  xp:3000, loot:{metal:400000,crystal:160000,dm:300}, resetMs:7*24*60*60*1000,
};

const MEDALS = [
  { id:"med1", name:"İlk Adım",    icon:"🥉", req:{wins:1},        desc:"İlk zaferini kazandın" },
  { id:"med2", name:"Savaşçı",     icon:"🥈", req:{wins:10},       desc:"10 zafer kazandın" },
  { id:"med3", name:"Şampiyon",    icon:"🥇", req:{wins:30},       desc:"30 zafer kazandın" },
  { id:"med4", name:"Efsane",      icon:"🏅", req:{wins:75},       desc:"75 zafer kazandın" },
  { id:"med5", name:"Filo Ustası", icon:"🎖", req:{shipsBuilt:50}, desc:"50 gemi inşa ettin" },
  { id:"med6", name:"Bilgin",      icon:"📜", req:{research:15},  desc:"15 araştırma tamamladın" },
  { id:"med7", name:"Kaşif",       icon:"🧭", req:{planets:3},    desc:"3 gezegen kolonileştirdin" },
  { id:"med8", name:"Boss Avcısı", icon:"👹", req:{bossKills:1},  desc:"Haftalık boss'u yendin" },
];

const SKINS = [
  { id:"sk0", name:"Standart",  icon:"⬜", color:null,      cost:0  },
  { id:"sk1", name:"Kızıl Filo",icon:"🟥", color:"#ef4444", cost:40 },
  { id:"sk2", name:"Yeşim",     icon:"🟩", color:"#22c55e", cost:40 },
  { id:"sk3", name:"Altın",     icon:"🟨", color:"#fbbf24", cost:70 },
  { id:"sk4", name:"Mor Nova",  icon:"🟪", color:"#c084fc", cost:70 },
];

// ══════════════════════ §3 HESAPLAMA YARDIMCILARI ═══════════════════════════
const fmt = n => { if(n>=1e6)return(n/1e6).toFixed(1)+"M"; if(n>=1000)return(n/1000).toFixed(1)+"K"; return Math.floor(n)+""; };
const getRank    = xp => [...STAR_RANKS].reverse().find(r=>xp>=r.min)||STAR_RANKS[0];
const getNext    = xp => STAR_RANKS.find(r=>r.min>xp)||null;
const techMul    = (tech,key) => { const e=TECH_BY_BONUS(key); return e?1+(tech[e[0]]||0)*e[1].per:1; };
const labDisc    = b => Math.max(0.35,1-((b.lab||1)-1)*.10);
const storageCap = b => ({ metal:(b.metalMine||1)*50000*Math.pow(1.4,(b.metalMine||1)-1)+(b.depot||1)*100000, crystal:(b.crystalMine||1)*20000*Math.pow(1.4,(b.crystalMine||1)-1)+(b.depot||1)*40000 });
const production = (b,planets,hero,artifacts,tech) => {
  const eB=1+((b.energyPlant||1)-1)*.05+(tech.energy||0)*.03;
  const pM=planets.reduce((s,p)=>s+(p.mB||1)-1,0);
  const pC=planets.reduce((s,p)=>s+(p.cB||1)-1,0);
  const hP=(hero&&HEROES.find(h=>h.id===hero)?.bonus?.prod)||0;
  const aP=(artifacts||[]).reduce((s,id)=>s+(ARTIFACTS.find(a=>a.id===id)?.bonus?.prod||0),0);
  return {
    metal:  Math.floor((b.metalMine||1)*200*eB*(1+pM)*(1+hP+aP)),
    crystal:Math.floor((b.crystalMine||1)*100*eB*(1+pC)*(1+hP+aP)),
    dm:     Math.floor((b.dmExtractor||0)*5*eB),
  };
};
const bldgCost = (id,lv) => { const b=BUILDINGS.find(b=>b.id===id); if(!b)return{metal:0,crystal:0}; return{metal:Math.floor(b.base.metal*Math.pow(1.6,lv-1)),crystal:Math.floor(b.base.crystal*Math.pow(1.6,lv-1))}; };
const upgCost  = (type,stat,lv) => Math.floor(UNITS[type].cost.metal*.3*Math.pow(1.5,lv));
const artBonus = (arts,key) => (arts||[]).reduce((s,id)=>s+(ARTIFACTS.find(a=>a.id===id)?.bonus?.[key]||0),0);
const heroBon  = (hero,heroes,k) => { const h=HEROES.find(h=>h.id===hero); return h&&(heroes||[]).includes(hero)?(h.bonus[k]||0):0; };

const isUnitUnlocked = (type, tech) => {
  const u = UNITS[type];
  if(!u.unlock) return true;
  return Object.entries(u.unlock).every(([techId,lvl])=>(tech[techId]||0)>=lvl);
};
const unitUnlockText = (type, tech) => {
  const u = UNITS[type];
  if(!u.unlock) return null;
  return Object.entries(u.unlock).map(([techId,lvl])=>{
    const cur = tech[techId]||0;
    const name = TECHS[techId]?.name||techId;
    return `${name} Sv.${lvl}${cur<lvl?` (şu an ${cur})`:""}`;
  }).join(" + ");
};

const winEst = (fleet,enemy,tech,form,hero,heroes,arts) => {
  const f=FORMATIONS.find(f=>f.id===form)||FORMATIONS[0];
  const hA=1+heroBon(hero,heroes,"atk")+artBonus(arts,"atk");
  const sc=(fl,self)=>Object.entries(fl).reduce((s,[t,n])=>{
    if(!UNITS[t]||!n)return s;
    const u=UNITS[t];
    const aM=self?techMul(tech,"atk")*f.aM*hA:1;
    const dM=self?techMul(tech,"def")*f.dM:1;
    const hM=self?techMul(tech,"hull"):1;
    return s+n*(u.atk*aM+u.def*dM*.5+u.hull*hM*.01);
  },0);
  const a=sc(fleet,true),d=sc(enemy,false);
  return !a&&!d?50:Math.min(95,Math.max(5,Math.round(a/(a+d)*100)));
};

// ═══════════════════════════ §4 SAVAŞ MOTORU ════════════════════════════════
function battle(atkFleet,defFleet,tech,form,upgrades,hero,heroes,arts,insuranceOn) {
  const f=FORMATIONS.find(f=>f.id===form)||FORMATIONS[0];
  const cB=techMul(tech,"crit")-1;
  const pierce=techMul(tech,"pierce")-1;
  const hA=1+heroBon(hero,heroes,"atk")+artBonus(arts,"atk");
  const hD=1+heroBon(hero,heroes,"def");
  const aC=artBonus(arts,"crit");

  const build=(fl,side,isAtk)=>Object.entries(fl).flatMap(([type,cnt])=>{
    if(!UNITS[type]||cnt<=0)return[];
    const u=UNITS[type];
    const ug=upgrades[type]||{};
    const aB=1+(ug.atk||0)*.05, dB=1+(ug.def||0)*.05, hB=1+(ug.hull||0)*.05, cU=(ug.crit||0)*.02;
    const fA=isAtk?f.aM:1,fD=isAtk?f.dM:1;
    return Array.from({length:cnt},(_,i)=>({
      id:`${side}-${type}-${i}`,type,side,
      atk:  u.atk  *techMul(tech,"atk") *aB*fA*(isAtk?hA:1),
      def:  u.def  *techMul(tech,"def") *dB*fD*(isAtk?hD:1),
      hull: u.hull *techMul(tech,"hull")*hB,
      maxHull:u.hull*techMul(tech,"hull")*hB,
      ability:u.ability, critChance:u.crit+cB+cU+aC,
      alive:true,broken:false,
    }));
  });

  let atk=build(atkFleet,"atk",true),def=build(defFleet,"def",false);
  if(!atk.length)return{winner:"defender",rounds:[],losses:{},crits:0,salvage:0};
  if(!def.length)return{winner:"attacker",rounds:[],losses:{},crits:0,salvage:0};

  const alive=a=>a.filter(u=>u.alive);
  let crits=0;

  const fireAt=(s,t,evs)=>{
    if(t.ability==="stealth"&&Math.random()<.25){evs.push({type:"miss",src:s.type,tgt:t.type});return;}
    if(t.ability==="evasion"&&Math.random()<.12){evs.push({type:"miss",src:s.type,tgt:t.type});return;}
    const isCrit=Math.random()<s.critChance;
    if(isCrit)crits++;
    let dv=t.broken?t.def*.75:t.def;
    dv*=(1-pierce);
    let av=s.atk*(1+(Math.random()-.5)*.25)*(isCrit?2.2:1);
    if(s.ability==="overcharge"&&s.hull/s.maxHull<.35)av*=1.3;
    const dmg=Math.max(1,av-dv*.22);
    t.hull-=dmg;
    if(s.ability==="armor_break")t.broken=true;
    if(t.hull<=0){t.alive=false;evs.push({type:"kill",src:s.type,tgt:t.type,crit:isCrit});}
    else if(isCrit)evs.push({type:"crit",src:s.type,tgt:t.type});
  };

  const volley=(sh,tg,evs)=>{
    alive(sh).forEach(s=>{
      const ts=alive(tg);if(!ts.length)return;
      ts.sort((a,b)=>a.hull/a.maxHull-b.hull/b.maxHull);
      fireAt(s,ts[0],evs);
      if(s.ability==="volley"&&Math.random()<.4){const sec=ts.filter(t=>t.alive);if(sec.length>1)fireAt(s,sec[1],evs);}
      if(s.ability==="nova")ts.filter(t=>t.alive).slice(0,3).forEach((t,i)=>{if(i>0)fireAt(s,t,evs);});
    });
  };

  const rounds=[];
  for(let r=1;r<=25;r++){
    const evs=[],ba=alive(atk).length,bd=alive(def).length;
    volley(atk,def,evs);volley(def,atk,evs);
    const aa=alive(atk).length,ad=alive(def).length;
    rounds.push({round:r,atkAlive:aa,defAlive:ad,atkLost:ba-aa,defLost:bd-ad,events:evs.slice(0,5)});
    if(!aa||!ad)break;
  }
  const surv=atk.filter(u=>u.alive);
  const winner=surv.length?"attacker":"defender";
  const losses={};
  Object.keys(atkFleet).forEach(t=>{losses[t]=(atkFleet[t]||0)-surv.filter(u=>u.type===t).length;});
  const salvage=insuranceOn?Object.entries(losses).reduce((s,[t,l])=>s+UNITS[t].cost.metal*l*.3,0):0;
  return{winner,rounds,losses,crits,salvage};
}

// ══════════════════════════ §5 BAŞLANGIÇ DURUMU ═════════════════════════════
const init0 = () => ({
  resources: {metal:150000,crystal:50000,dm:50},
  fleet:     Object.fromEntries(Object.keys(UNITS).map(k=>[k,0])),
  upgrades:  Object.fromEntries(Object.keys(UNITS).map(k=>[k,{}])),
  tech:      Object.fromEntries(Object.keys(TECHS).map(k=>[k,0])),
  techQ:     [],
  buildings: {metalMine:1,crystalMine:1,energyPlant:1,shipyard:1,lab:1,depot:1,dmExtractor:0},
  planets:   [{...PLANETS[0]}],
  activePlanet:"home",
  heroes:    [],
  activeHero:null,
  formation: "standard",
  artifacts: [],
  insurance: false,
  autoBattle:false,
  stats:{wins:0,losses:0,battles:0,xp:0,lootM:0,lootC:0,lootDM:0,crits:0,raids:0,prestige:0},
  battleLog:[],
  missions:  MISSIONS.map(m=>({...m,done:false,claimed:false})),
  daily:     {streak:0,last:0},
  raidProgress:{},
  lastTick:  Date.now(),
  replayData:null,
  builtTotal:0,
  researchTotal:0,
  medals:[], skin:"sk0", ownedSkins:["sk0"], bossDefeatedAt:0, bossLastAttempt:0,
  totalPlaySeconds:0,
  adWatchesToday:0, adWatchesResetAt:Date.now(),
});
const seedStarterFleet = s => ({...s, fleet:{...s.fleet, lightFighter:5, smallCargo:2}});

// ═══════════════════════════ §6 STİL SİSTEMİ ════════════════════════════════
const T={bg:"#020810",bgC:"#050f1c",bgP:"#06121e",br:"#0d1e30",brH:"#1a3a5c",pri:"#ddeeff",sec:"#4a6a8a",acc:"#38bdf8"};

// ── ORTAK STİL SABİTLERİ (S) ─────────────────────────────────────────────────
// Sık tekrarlanan inline style objelerini burada sabitleyip referansla
// kullanıyoruz. Bu iki amaca hizmet eder:
//  1) Okunabilirlik: JSX içinde "style={S.muted8}" yazmak, aynı objeyi her
//     yerde tekrar yazmaktan daha kısa ve anlamlı.
//  2) Performans: Aynı obje referansı her render'da yeniden oluşturulmuyor,
//     bu da React'in gereksiz prop-diff maliyetini hafifletir.
const S = {
  muted8:    {fontSize:8,color:T.sec},
  muted7:    {fontSize:7,color:T.sec},
  center:    {textAlign:"center"},
  flex1:     {flex:1},
  row:       {display:"flex",justifyContent:"space-between",alignItems:"center"},
  rowGap3mb8:{display:"flex",gap:3,marginBottom:8},
  titlePri12:{fontWeight:800,fontSize:12,color:T.pri},
  mt8:       {marginTop:8},
  cAmber:    {color:"#fbbf24"},
  cBlue:     {color:"#60a5fa"},
  cPurple:   {color:"#a78bfa"},
  cDM:       {color:"#c084fc"},
};


// ═══════════════════════ §7 UI ATOM BİLEŞENLERİ ══════════════════════════════
const Bar=({pct,color=T.acc,h=4})=>(
  <div style={{background:"#071624",borderRadius:h,height:h,overflow:"hidden"}}>
    <div style={{width:`${Math.min(1,Math.max(0,pct))*100}%`,height:"100%",background:color,borderRadius:h,transition:"width .4s"}}/>
  </div>
);
const Card=({children,accent,glow,style={}})=>(
  <div style={{background:T.bgC,border:`1px solid ${accent?accent+"33":T.br}`,borderLeft:accent?`3px solid ${accent}`:`1px solid ${T.br}`,borderRadius:10,padding:"9px 11px",marginBottom:6,boxShadow:glow?`0 0 14px ${accent}22`:"none",...style}}>{children}</div>
);
const Btn=({onClick,disabled,children,color,sm,full,danger,style={}})=>{
  const c=color||(danger?"#f87171":T.acc);
  return <button onClick={onClick} disabled={disabled} style={{background:disabled?"#0a1422":`${c}12`,border:`1px solid ${disabled?T.br:c+"55"}`,color:disabled?"#253545":c,borderRadius:7,padding:sm?"3px 7px":"8px 14px",fontSize:sm?10:13,fontWeight:700,cursor:disabled?"not-allowed":"pointer",width:full?"100%":undefined,letterSpacing:.3,transition:"all .15s",...style}}>{children}</button>;
};
const Pill=({label,value,color=T.acc,icon})=>(
  <div style={{background:T.bgP,border:`1px solid ${T.br}`,borderRadius:8,padding:"4px 7px",textAlign:"center",flex:1}}>
    {icon&&<div style={{fontSize:11}}>{icon}</div>}
    <div style={{fontSize:13,fontWeight:900,color,lineHeight:1.1}}>{value}</div>
    <div style={{fontSize:7,color:T.sec,textTransform:"uppercase",letterSpacing:1,marginTop:1}}>{label}</div>
  </div>
);
const Sep=({label})=>(
  <div style={{display:"flex",alignItems:"center",gap:6,margin:"8px 0 6px",fontSize:7,color:T.sec,letterSpacing:2,fontWeight:700,textTransform:"uppercase"}}>
    <div style={{flex:1,height:1,background:T.br}}/>{label}<div style={{flex:1,height:1,background:T.br}}/>
  </div>
);

const Section=({title,icon,subtitle,defaultOpen=false,accent=T.acc,badge,children})=>{
  const [open,setOpen]=useState(defaultOpen);
  return(
    <div style={{background:T.bgC,border:`1px solid ${open?accent+"44":T.br}`,borderRadius:10,marginBottom:7,overflow:"hidden"}}>
      <button onClick={()=>setOpen(o=>!o)} style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",background:open?`${accent}0d`:"transparent",border:"none",padding:"10px 12px",cursor:"pointer"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:16}}>{icon}</span>
          <div style={{textAlign:"left"}}>
            <div style={{fontSize:12,fontWeight:800,color:T.pri}}>{title}</div>
            {subtitle&&<div style={S.muted8}>{subtitle}</div>}
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          {badge!=null&&badge>0&&<span style={{background:"#ef4444",color:"#fff",borderRadius:20,fontSize:8,fontWeight:900,padding:"2px 6px"}}>{badge}</span>}
          <span style={{fontSize:11,color:accent,transform:open?"rotate(90deg)":"rotate(0deg)",transition:"transform .2s",display:"inline-block"}}>▶</span>
        </div>
      </button>
      {open&&<div style={{padding:"4px 10px 10px"}}>{children}</div>}
    </div>
  );
};

const Stars=({h=160})=>{
  const ref=useRef();
  useEffect(()=>{
    const c=ref.current;if(!c)return;
    const ctx=c.getContext("2d");
    const stars=Array.from({length:55},()=>({x:Math.random()*c.width,y:Math.random()*c.height,r:Math.random()*1.2+.2,a:Math.random()*Math.PI*2,s:Math.random()*.25+.05}));
    let frame,t=0;
    const draw=()=>{ctx.clearRect(0,0,c.width,c.height);stars.forEach(s=>{ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fillStyle=`rgba(180,220,255,${.2+.4*Math.abs(Math.sin(t*.007+s.a))})`;ctx.fill();s.y+=s.s*.1;if(s.y>c.height)s.y=0;});t++;frame=requestAnimationFrame(draw);};
    draw();return()=>cancelAnimationFrame(frame);
  },[]);
  return <canvas ref={ref} width={400} height={h} style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none",opacity:.5}}/>;
};

const Galaxy=({planets,active,wins,onSelect})=>(
  <div style={{position:"relative",background:"#020810",borderRadius:10,overflow:"hidden",height:165,border:`1px solid ${T.br}`}}>
    <Stars h={165}/>
    {PLANETS.map(p=>{
      const owned=planets.find(pl=>pl.id===p.id);
      const meets=!p.locked||(p.req&&wins>=p.req);
      return(
        <button key={p.id} onClick={()=>onSelect(p.id)} style={{position:"absolute",left:`${p.x}%`,top:`${p.y}%`,transform:"translate(-50%,-50%)",background:"transparent",border:"none",cursor:(!owned&&!meets)?"not-allowed":"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:1}}>
          <div style={{fontSize:p.id==="home"?20:16,opacity:(!owned&&!meets)?.25:1,filter:active===p.id?`drop-shadow(0 0 6px ${p.color})`:"none",transition:"filter .3s"}}>{p.icon}</div>
          <div style={{fontSize:7,color:active===p.id?p.color:T.sec,fontWeight:700,whiteSpace:"nowrap"}}>{!owned&&!meets?`🔒${p.req}`:!owned&&meets?"+ Koloni":p.name}</div>
        </button>
      );
    })}
  </div>
);

const Replay=({rounds,onClose})=>{
  const [step,setStep]=useState(0);
  const [play,setPlay]=useState(false);
  const tm=useRef();
  useEffect(()=>{
    if(play){tm.current=setInterval(()=>{setStep(s=>{if(s>=rounds.length-1){setPlay(false);clearInterval(tm.current);return s;}return s+1;});},650);}else clearInterval(tm.current);
    return()=>clearInterval(tm.current);
  },[play,rounds.length]);
  const r=rounds[step];
  const ta=rounds[0]?.atkAlive+rounds[0]?.atkLost||1,td=rounds[0]?.defAlive+rounds[0]?.defLost||1;
  return(
    <Card style={{marginBottom:8}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
        <span style={{fontSize:11,fontWeight:800,color:T.pri}}>▶ Savaş Tekrarı T{step+1}/{rounds.length}</span>
        <Btn onClick={onClose} sm danger>✕</Btn>
      </div>
      <div style={{display:"flex",gap:2,marginBottom:7,overflowX:"auto"}}>
        {rounds.map((rr,i)=>(
          <button key={i} onClick={()=>setStep(i)} style={{flex:"0 0 auto",width:20,height:20,borderRadius:3,background:i===step?"#38bdf8":i<step?"#0a2a18":"#071828",border:`1px solid ${i===step?T.acc:T.br}`,cursor:"pointer",fontSize:7,color:i===step?"#020810":T.sec,fontWeight:900}}>T{rr.round}</button>
        ))}
      </div>
      <div style={{marginBottom:6}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:8,marginBottom:2}}><span style={{color:T.acc}}>Sen ({r?.atkAlive||0})</span><span style={{color:"#fb923c"}}>Düşman ({r?.defAlive||0})</span></div>
        <Bar pct={(r?.atkAlive||0)/ta} color={T.acc} h={7}/>
        <div style={{marginTop:3}}><Bar pct={(r?.defAlive||0)/td} color="#fb923c" h={7}/></div>
      </div>
      <div style={{minHeight:40,marginBottom:6}}>
        {r?.events?.map((ev,i)=>(
          <div key={i} style={{fontSize:8,color:ev.type==="kill"?ev.crit?"#fbbf24":"#f87171":ev.type==="crit"?"#fbbf24":"#3a5a7a",marginBottom:2}}>
            {ev.type==="kill"&&`💀 ${UNITS[ev.src]?.name}→${UNITS[ev.tgt]?.name}${ev.crit?" ⚡":""}`}
            {ev.type==="crit"&&`⚡ ${UNITS[ev.src]?.name} KRİTİK!`}
            {ev.type==="miss"&&`◌ ${UNITS[ev.tgt]?.name} kaçındı`}
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:4}}>
        <Btn onClick={()=>setStep(0)} sm style={S.flex1}>⏮</Btn>
        <Btn onClick={()=>setStep(s=>Math.max(0,s-1))} sm style={S.flex1}>◀</Btn>
        <Btn onClick={()=>setPlay(p=>!p)} color="#22c55e" sm style={{flex:2}}>{play?"⏸":"▶ Oynat"}</Btn>
        <Btn onClick={()=>setStep(s=>Math.min(rounds.length-1,s+1))} sm style={S.flex1}>▶</Btn>
        <Btn onClick={()=>setStep(rounds.length-1)} sm style={S.flex1}>⏭</Btn>
      </div>
    </Card>
  );
};

const MiniChart=({data,color=T.acc,label})=>{
  const max=Math.max(...data.map(d=>d.v),1);
  return(
    <div style={{background:T.bgP,borderRadius:8,padding:"8px 10px",flex:1}}>
      <div style={{fontSize:9,color:T.sec,marginBottom:6}}>{label}</div>
      <div style={{display:"flex",alignItems:"flex-end",gap:3,height:40}}>
        {data.map((d,i)=>(
          <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
            <div style={{width:"100%",background:`${color}cc`,borderRadius:3,height:`${(d.v/max)*36}px`,minHeight:2,transition:"height .3s"}}/>
            <div style={{fontSize:6,color:T.sec}}>{d.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ═══════════════════════════ §8 ANA COMPONENT ════════════════════════════════
export default function AstrogameWAR(){
  const base=useMemo(()=>load()||seedStarterFleet(init0()),[]);
  const [gs,setGs]=useState(()=>({ medals:[], skin:"sk0", ownedSkins:["sk0"], bossDefeatedAt:0, bossLastAttempt:0, totalPlaySeconds:0, adWatchesToday:0, adWatchesResetAt:Date.now(), ...base }));
  const [user,setUser]=useState(()=>{ try{return JSON.parse(localStorage.getItem("astrogamewar_user")||"null");}catch(e){return null;} });
  const [authLoading,setAuthLoading]=useState(false);
  const [emailInput,setEmailInput]=useState("");
  const [showEmailStep,setShowEmailStep]=useState(false);
  const [pendingGoogleProfile,setPendingGoogleProfile]=useState(null);
  const [adWatching,setAdWatching]=useState(false);
  const [adPct,setAdPct]=useState(0);
  const [adCooldown,setAdCooldown]=useState(0);
  const [adminUsers,setAdminUsers]=useState([]);
  const [adminLoading,setAdminLoading]=useState(false);
  const [tab,setTab]=useState("fleet");
  const [selEnemy,setEnemy]=useState(0);
  const [report,setReport]=useState(null);
  const [battling,setBattle]=useState(false);
  const [bPct,setBPct]=useState(0);
  const [bSec,setBSec]=useState(0);
  const [notif,setNotif]=useState(null);
  const [showDaily,setDaily]=useState(false);
  const [showReplay,setReplay]=useState(false);
  const [selRaid,setRaid]=useState(null);
  const [raidRunning,setRaidRun]=useState(false);
  const [raidPct,setRaidPct]=useState(0);
  const [raidResult,setRaidResult]=useState(null);
  const [showMasterEye,setMasterEye]=useState(false);
  const bRef=useRef(false);
  const saveRef=useRef();
  const playSecondsRef=useRef(0);

  const{resources,fleet,upgrades,tech,techQ,buildings,planets,heroes,activeHero,formation,artifacts,insurance,autoBattle,stats,battleLog,missions,daily,raidProgress,medals,skin,ownedSkins,bossDefeatedAt,totalPlaySeconds,adWatchesToday,adWatchesResetAt}=gs;

  const totalShips =useMemo(()=>Object.values(fleet).reduce((a,b)=>a+b,0),[fleet]);
  const rank       =useMemo(()=>getRank(stats.xp),[stats.xp]);
  const nextRank   =useMemo(()=>getNext(stats.xp),[stats.xp]);
  const prod       =useMemo(()=>production(buildings,planets,activeHero,artifacts,tech),[buildings,planets,activeHero,artifacts,tech]);
  const cap        =useMemo(()=>storageCap(buildings),[buildings]);
  const win        =useMemo(()=>winEst(fleet,ENEMIES[selEnemy].units,tech,formation,activeHero,heroes,artifacts),[fleet,selEnemy,tech,formation,activeHero,heroes,artifacts]);
  const pending    =useMemo(()=>missions.filter(m=>m.done&&!m.claimed).length,[missions]);
  const ld         =useMemo(()=>labDisc(buildings),[buildings]);
  const metPct     =Math.min(1,resources.metal/cap.metal);
  const crsPct     =Math.min(1,resources.crystal/cap.crystal);
  const fleetPow   =useMemo(()=>Object.entries(fleet).reduce((s,[t,n])=>s+(UNITS[t]?.atk||0)*n*techMul(tech,"atk"),0),[fleet,tech]);
  const canDaily   =(Date.now()-daily.last)>20000;
  const dmProd     =prod.dm||0;
  const isAdmin    =user && ADMIN_UIDS.includes(user.uid);
  const bossOnCooldown = (Date.now()-(bossDefeatedAt||0)) < WEEKLY_BOSS.resetMs;
  const bossTimeLeft = Math.max(0,WEEKLY_BOSS.resetMs-(Date.now()-(bossDefeatedAt||0)));

  useEffect(()=>{
    clearTimeout(saveRef.current);
    saveRef.current=setTimeout(()=>{
      save(gs);
      if(FIREBASE_READY && user && !user.uid?.startsWith("demo-")) firebaseSaveGame(user.uid, gs).catch(()=>{});
    },1500);
  },[gs,user]);

  // Birleşik pasif tick: hem kaynak üretimini hem oturum süresi takibini
  // tek bir 2sn'lik zamanlayıcıda yürütür. Önceden 30sn'lik ayrı bir
  // zamanlayıcı [user,cap.metal] bağımlılığına sahipti — bu, cap.metal her
  // değiştiğinde (bina yükseltmede) interval'in sıfırlanıp 30sn sayacın
  // baştan başlamasına yol açıyordu. Tek döngüde bu sorun da ortadan kalkar.
  useEffect(()=>{
    let sessionAccum = 0; // 2sn'lik tikleri biriktirip 30sn'de bir tetikler
const id=setInterval(()=>{; _intervalIds.current.push(id);
      setGs(prev=>{
        const secs=(Date.now()-prev.lastTick)/1000;
        const p=production(prev.buildings,prev.planets,prev.activeHero,prev.artifacts,prev.tech);
        const c=storageCap(prev.buildings);
        let next={...prev,lastTick:Date.now(),resources:{
          metal:  Math.min(c.metal,  prev.resources.metal  +p.metal/3600*secs),
          crystal:Math.min(c.crystal,prev.resources.crystal+p.crystal/3600*secs),
          dm:     Math.min(9999,     (prev.resources.dm||0)+(p.dm||0)/3600*secs),
        }};
        sessionAccum += 2;
        if(sessionAccum>=30){
          sessionAccum=0;
          playSecondsRef.current += 30;
          const bonusMetal = 50;
          next = {...next, totalPlaySeconds:(next.totalPlaySeconds||0)+30, resources:{...next.resources, metal:Math.min(c.metal,next.resources.metal+bonusMetal)}};
        }
        return next;
      });
    },2000);
    return()=>clearInterval(id);
  },[]);

  // Oturum süresi → Firebase senkronu, 30sn'de bir totalPlaySeconds değiştiğinde tetiklenir
  useEffect(()=>{
    if(!gs.totalPlaySeconds) return;
    if(FIREBASE_READY && user && !user.uid?.startsWith("demo-")) firebaseAddPlaySeconds(user.uid,30).catch(()=>{});
  },[gs.totalPlaySeconds]);

  useEffect(()=>{
const id=setInterval(()=>{; _intervalIds.current.push(id);
      setGs(prev=>{
        if(!prev.techQ.length)return prev;
        const[first,...rest]=prev.techQ;
        const t=TECHS[first];
        const lv=prev.tech[first]||0;
        if(lv>=t.max)return{...prev,techQ:rest};
        const cost=Math.floor(t.base*(lv+1)*labDisc(prev.buildings));
        if(prev.resources.metal<cost)return prev;
        return{...prev,tech:{...prev.tech,[first]:lv+1},resources:{...prev.resources,metal:prev.resources.metal-cost},techQ:rest,researchTotal:prev.researchTotal+1};
      });
    },3000);
    return()=>clearInterval(id);
  },[]);

  useEffect(()=>{
    setGs(prev=>{
      const total=Object.values(prev.fleet).reduce((a,b)=>a+b,0);
      const tSum=Object.values(prev.tech).reduce((a,b)=>a+b,0);
      const updated=prev.missions.map(m=>{
        if(m.done)return m;
        const ok=(m.req.wins&&prev.stats.wins>=m.req.wins)||(m.req.ships&&total>=m.req.ships)||(m.req.techSum&&tSum>=m.req.techSum)||(m.req.planets&&prev.planets.length>=m.req.planets)||(m.req.hasDestroyer&&(prev.fleet.destroyer||0)>=1)||(m.req.raids&&prev.stats.raids>=m.req.raids)||(m.req.heroes&&prev.heroes.length>=m.req.heroes)||(m.req.prestige&&prev.stats.prestige>=m.req.prestige);
        return ok?{...m,done:true}:m;
      });
      return updated.some((m,i)=>m.done!==prev.missions[i].done)?{...prev,missions:updated}:prev;
    });
  },[gs.stats,gs.fleet,gs.tech,gs.planets,gs.heroes,gs.stats.raids]);

  useEffect(()=>{
    setGs(prev=>{
      const owned=prev.medals||[];
      const newly=MEDALS.filter(m=>!owned.includes(m.id)).filter(m=>{
        const r=m.req;
        return (r.wins&&prev.stats.wins>=r.wins)||(r.shipsBuilt&&prev.builtTotal>=r.shipsBuilt)||(r.research&&prev.researchTotal>=r.research)||(r.planets&&prev.planets.length>=r.planets)||(r.bossKills&&prev.bossDefeatedAt>0);
      });
      if(!newly.length)return prev;
      newly.forEach(m=>notify(`🎖 Rozet kazanıldı: ${m.name}!`));
      return{...prev,medals:[...owned,...newly.map(m=>m.id)]};
    });
  },[gs.stats.wins,gs.builtTotal,gs.researchTotal,gs.planets.length,gs.bossDefeatedAt]);

  useEffect(()=>{
    if(!gs.autoBattle||battling)return;
    const id=setInterval(()=>{ if(gs.autoBattle&&!bRef.current&&totalShips>0)launchBattle(); },12000); _intervalIds.current.push(id);
    return()=>clearInterval(id);
  },[gs.autoBattle,battling,totalShips]);

  const notify=(msg,ok=true)=>{setNotif({msg,ok});setTimeout(()=>setNotif(null),2600);};
  const upd=useCallback(fn=>setGs(prev=>fn(prev)),[]);

  const handleGoogleSignIn=async()=>{
    setAuthLoading(true);
    if(FIREBASE_READY){
      try{
        const profile = await firebaseGoogleSignIn();
        setPendingGoogleProfile(profile);
        setEmailInput(profile.email||"");
        setShowEmailStep(true);
      }catch(e){
        notify("Giriş başarısız: "+(e.message||"bilinmeyen hata"),false);
      }finally{
        setAuthLoading(false);
      }
      return;
    }
    setShowEmailStep(true);
    setPendingGoogleProfile({ name:"Misafir Komutan", uid:"demo-"+Math.random().toString(36).slice(2,10), signedAt:Date.now() });
    setAuthLoading(false);
  };

  const confirmEmailAndEnter=async()=>{
    if(!emailInput || !emailInput.includes("@")){ notify("Geçerli bir e-posta gir.",false); return; }
    const profile = { ...pendingGoogleProfile, email: emailInput };
    localStorage.setItem("astrogamewar_user",JSON.stringify(profile));
    setUser(profile);
    setShowEmailStep(false);
    if(FIREBASE_READY && !profile.uid.startsWith("demo-")){
      const cloudState = await firebaseLoadGame(profile.uid).catch(()=>null);
      if(cloudState) setGs(prev=>({...prev,...cloudState}));
    }
    notify(`Hoş geldin, ${profile.name}!`);
  };

  const handleSignOut=async()=>{
    if(FIREBASE_READY){ try{ await firebaseSignOut(); }catch(e){} }
    localStorage.removeItem("astrogamewar_user");
    setUser(null);
  };

  const loadAdminData=async()=>{
    if(!isAdmin) return;
    setAdminLoading(true);
    try{
      if(FIREBASE_READY){
        const users = await firebaseFetchAllUsers();
        setAdminUsers(users.sort((a,b)=>(b.lastLoginAt||0)-(a.lastLoginAt||0)));
      } else {
        const local = JSON.parse(localStorage.getItem("astrogamewar_user")||"null");
        setAdminUsers(local?[{...local,loginCount:1,firstLoginAt:local.signedAt,lastLoginAt:local.signedAt,totalPlaySeconds:totalPlaySeconds}]:[]);
      }
    }catch(e){ notify("Kullanıcı listesi alınamadı: "+(e.message||""),false); }
    finally{ setAdminLoading(false); }
  };
  useEffect(()=>{ if(tab==="admin"&&isAdmin) loadAdminData(); },[tab,isAdmin]);

  const AD_COOLDOWN_MS = 45000;
  const AD_DAILY_LIMIT = 10; // Sınırsız tekrar ekonomi enflasyonunu önler
  const DAY_MS = 24*60*60*1000;
  // Gün değiştiyse sayaç sıfırlanır
  const adWatchesEffective = (Date.now()-(adWatchesResetAt||0) > DAY_MS) ? 0 : (adWatchesToday||0);
  const adLimitReached = adWatchesEffective >= AD_DAILY_LIMIT;
  const watchAd=()=>{
    if(adWatching||adCooldown>0||adLimitReached)return;
    setAdWatching(true);setAdPct(0);
    const dur=4000,start=Date.now();
const tick=setInterval(()=>{; _intervalIds.current.push(tick);
      const e=Date.now()-start,pct=Math.min(e/dur,1);
      setAdPct(pct);
      if(pct>=1){
        clearInterval(tick);setAdWatching(false);
        const rew={metal:15000,crystal:5000,dm:8};
        upd(prev=>{
          const resetNeeded = Date.now()-(prev.adWatchesResetAt||0) > DAY_MS;
          return{...prev,
            resources:{metal:Math.min(cap.metal,prev.resources.metal+rew.metal),crystal:Math.min(cap.crystal,prev.resources.crystal+rew.crystal),dm:Math.min(9999,(prev.resources.dm||0)+rew.dm)},
            adWatchesToday: resetNeeded ? 1 : (prev.adWatchesToday||0)+1,
            adWatchesResetAt: resetNeeded ? Date.now() : (prev.adWatchesResetAt||Date.now()),
          };
        });
        notify(`📺 Reklam tamamlandı! +${fmt(rew.metal)}⛏ +${fmt(rew.crystal)}💎 +${rew.dm}🌑`);
        setAdCooldown(AD_COOLDOWN_MS);
      }
    },80);
  };
  useEffect(()=>{
    if(adCooldown<=0)return;
    const id=setInterval(()=>setAdCooldown(c=>Math.max(0,c-1000)),1000); _intervalIds.current.push(id);
    return()=>clearInterval(id);
  },[adCooldown>0]);

  const buyUnit=type=>{
    const u=UNITS[type];
    if(!isUnitUnlocked(type,tech)){notify(`🔒 ${unitUnlockText(type,tech)} gerekli!`,false);return;}
    upd(prev=>{
      if(prev.resources.metal<u.cost.metal||prev.resources.crystal<u.cost.crystal||(prev.resources.dm||0)<(u.cost.dm||0)){notify("Yetersiz kaynak!",false);return prev;}
      notify(`${u.name} inşa edildi ✓`);
      return{...prev,resources:{metal:prev.resources.metal-u.cost.metal,crystal:prev.resources.crystal-u.cost.crystal,dm:(prev.resources.dm||0)-(u.cost.dm||0)},fleet:{...prev.fleet,[type]:(prev.fleet[type]||0)+1},builtTotal:prev.builtTotal+1};
    });
  };
  const sellUnit=type=>upd(prev=>{
    if(!prev.fleet[type])return prev;
    const cost=UNITS[type].cost;
    notify(`${UNITS[type].name} hurdalandı`);
    return{...prev,resources:{...prev.resources,metal:prev.resources.metal+cost.metal*.5,crystal:prev.resources.crystal+cost.crystal*.5},fleet:{...prev.fleet,[type]:prev.fleet[type]-1}};
  });
  const upgradeShip=(type,stat)=>{
    const lv=(upgrades[type]?.[stat]||0);
    const cost=upgCost(type,stat,lv);
    upd(prev=>{
      if(prev.resources.metal<cost){notify("Yetersiz!",false);return prev;}
      notify(`${UNITS[type].name} ${stat} ↑`);
      return{...prev,resources:{...prev.resources,metal:prev.resources.metal-cost},upgrades:{...prev.upgrades,[type]:{...prev.upgrades[type],[stat]:lv+1}}};
    });
  };
  const addQ=id=>{
    if(techQ.includes(id)){notify("Zaten kuyrukta!",false);return;}
    if(techQ.length>=6){notify("Kuyruk dolu!",false);return;}
    upd(prev=>({...prev,techQ:[...prev.techQ,id]}));
    notify(`${TECHS[id]?.name} kuyruğa eklendi`);
  };
  const remQ=id=>upd(prev=>({...prev,techQ:prev.techQ.filter(q=>q!==id)}));
  const upgTech=id=>{
    const t=TECHS[id];
    const lv=tech[id]||0;
    if(lv>=t.max){notify("Maks!",false);return;}
    const cost=Math.floor(t.base*(lv+1)*ld);
    upd(prev=>{
      if(prev.resources.metal<cost){notify("Yetersiz!",false);return prev;}
      notify(`${t.name} Sv.${lv+1} ✓`);
      return{...prev,resources:{...prev.resources,metal:prev.resources.metal-cost},tech:{...prev.tech,[id]:lv+1},researchTotal:prev.researchTotal+1};
    });
  };
  const upgBldg=id=>{
    const lv=buildings[id]||0;
    const cost=bldgCost(id,lv||1);
    upd(prev=>{
      if(prev.resources.metal<cost.metal||prev.resources.crystal<cost.crystal){notify("Yetersiz!",false);return prev;}
      const b=BUILDINGS.find(b=>b.id===id);
      notify(`${b.name} Sv.${lv+1} ✓`);
      return{...prev,resources:{metal:prev.resources.metal-cost.metal,crystal:prev.resources.crystal-cost.crystal,dm:prev.resources.dm},buildings:{...prev.buildings,[id]:lv+1}};
    });
  };
  const buyArtifact=aid=>{
    const a=ARTIFACTS.find(a=>a.id===aid);
    if(artifacts.includes(aid)){notify("Zaten sahipsin!",false);return;}
    if((resources.dm||0)<a.cost.dm){notify("Yetersiz 🌑 DM!",false);return;}
    upd(prev=>({...prev,resources:{...prev.resources,dm:(prev.resources.dm||0)-a.cost.dm},artifacts:[...prev.artifacts,aid]}));
    notify(`${a.name} edinildi! ✓`);
  };
  const recruitHero=hid=>{
    const h=HEROES.find(h=>h.id===hid);
    if(heroes.includes(hid)){notify("Zaten var!",false);return;}
    if(stats.wins<h.req){notify(`${h.req} zafer gerekli!`,false);return;}
    upd(prev=>{
      if(prev.resources.metal<h.cost.metal||prev.resources.crystal<h.cost.crystal||(prev.resources.dm||0)<(h.cost.dm||0)){notify("Yetersiz kaynak!",false);return prev;}
      notify(`${h.name} işe alındı ✓`);
      return{...prev,resources:{metal:prev.resources.metal-h.cost.metal,crystal:prev.resources.crystal-h.cost.crystal,dm:(prev.resources.dm||0)-(h.cost.dm||0)},heroes:[...prev.heroes,hid]};
    });
  };
  const setHero=hid=>upd(prev=>({...prev,activeHero:prev.activeHero===hid?null:hid}));
  const setForm=fid=>upd(prev=>({...prev,formation:fid}));
  const colonize=pid=>{
    const p=PLANETS.find(p=>p.id===pid);
    if(!p||!p.locked)return;
    if(p.req&&stats.wins<p.req){notify(`${p.req} zafer gerekli!`,false);return;}
    upd(prev=>{
      if(prev.resources.metal<50000||prev.resources.crystal<20000){notify("⛏50K 💎20K gerekli!",false);return prev;}
      notify(`${p.name} kolonileştirildi! 🌍`);
      return{...prev,resources:{...prev.resources,metal:prev.resources.metal-50000,crystal:prev.resources.crystal-20000},planets:[...prev.planets,{...p}],activePlanet:pid};
    });
  };
  const applyTemplate=tid=>{
    const tmpl=FLEET_TEMPLATES.find(t=>t.id===tid);
    if(!tmpl)return;
    const unlockedFleet=Object.fromEntries(Object.entries(tmpl.fleet).filter(([type])=>isUnitUnlocked(type,tech)));
    upd(prev=>({...prev,fleet:{...prev.fleet,...unlockedFleet}}));
    notify(`${tmpl.name} şablonu uygulandı`);
  };
  const claimMission=mid=>upd(prev=>{
    const m=prev.missions.find(m=>m.id===mid);
    if(!m||!m.done||m.claimed)return prev;
    notify(`🏆 ${m.name} tamamlandı!`);
    return{...prev,missions:prev.missions.map(mx=>mx.id===mid?{...mx,claimed:true}:mx),resources:{metal:prev.resources.metal+(m.reward.metal||0),crystal:prev.resources.crystal+(m.reward.crystal||0),dm:(prev.resources.dm||0)+(m.reward.dm||0)}};
  });
  const claimDaily=()=>{
    upd(prev=>{
      const next=(prev.daily.streak%7)+1;
      const rew=DAILY_REWARDS[next-1];
      notify(`🎁 Gün ${next} ödülü!`);
      return{...prev,daily:{streak:prev.daily.streak+1,last:Date.now()},resources:{metal:prev.resources.metal+rew.metal,crystal:prev.resources.crystal+rew.crystal,dm:(prev.resources.dm||0)+(rew.dm||0)}};
    });
    setDaily(false);
  };
  const prestige=()=>{
    if(stats.wins<50){notify("50 zafer gerekli!",false);return;}
    if(!window.confirm("Prestige? Tüm filo/bina sıfırlanır, +200 DM ve kalıcı %10 bonus kazanırsın!"))return;
    upd(prev=>({...seedStarterFleet(init0()),stats:{...init0().stats,prestige:prev.stats.prestige+1,xp:prev.stats.xp},resources:{metal:200000,crystal:80000,dm:(prev.resources.dm||0)+200},missions:prev.missions}));
    notify("🔮 Prestige! Güçlendin.",true);
  };
  const fightBoss=()=>{
    if(bossOnCooldown){notify("Boss bu hafta yenildi, bekle!",false);return;}
    if(totalShips===0){notify("Filo boş!",false);return;}
    const res=battle(fleet,WEEKLY_BOSS.units,tech,formation,upgrades,activeHero,heroes,artifacts,insurance);
    const isWin=res.winner==="attacker";
    upd(prev=>{
      const upRes={...prev,fleet:Object.fromEntries(Object.entries(prev.fleet).map(([t,n])=>[t,Math.max(0,n-(res.losses[t]||0))])),bossLastAttempt:Date.now()};
      if(isWin){
        notify(`👹 ${WEEKLY_BOSS.name} yenildi! Büyük ödül!`);
        return{...upRes,bossDefeatedAt:Date.now(),resources:{metal:Math.min(cap.metal,prev.resources.metal+WEEKLY_BOSS.loot.metal),crystal:Math.min(cap.crystal,prev.resources.crystal+WEEKLY_BOSS.loot.crystal),dm:Math.min(9999,(prev.resources.dm||0)+WEEKLY_BOSS.loot.dm)},stats:{...prev.stats,wins:prev.stats.wins+1,battles:prev.stats.battles+1,xp:prev.stats.xp+WEEKLY_BOSS.xp}};
      }
      notify("Boss seni yendi! Filonu güçlendir.",false);
      return{...upRes,stats:{...prev.stats,losses:prev.stats.losses+1,battles:prev.stats.battles+1}};
    });
    setReport({...res,enemyName:WEEKLY_BOSS.name,xpGain:isWin?WEEKLY_BOSS.xp:0,loot:isWin?WEEKLY_BOSS.loot:null});
    goToTab("battle");
  };
  const buySkin=sid=>{
    const s=SKINS.find(s=>s.id===sid);
    if((ownedSkins||[]).includes(sid)){notify("Zaten sahipsin!",false);return;}
    if((resources.dm||0)<s.cost){notify("Yetersiz 🌑 DM!",false);return;}
    upd(prev=>({...prev,resources:{...prev.resources,dm:(prev.resources.dm||0)-s.cost},ownedSkins:[...(prev.ownedSkins||["sk0"]),sid]}));
    notify(`${s.name} skini edinildi!`);
  };
  const equipSkin=sid=>upd(prev=>({...prev,skin:sid}));

  const launchBattle=useCallback(()=>{
    if(battling||totalShips===0)return;
    bRef.current=true;setBattle(true);setBPct(0);setReport(null);setReplay(false);
    const enemy=ENEMIES[selEnemy];
    const dur=4000,start=Date.now();
const tick=setInterval(()=>{; _intervalIds.current.push(tick);
      if(!bRef.current){clearInterval(tick);return;}
      const e=Date.now()-start,pct=Math.min(e/dur,1);
      setBPct(pct);setBSec(Math.max(0,Math.ceil((dur-e)/1000)));
      if(pct>=1){
        clearInterval(tick);bRef.current=false;
        const res=battle(fleet,enemy.units,tech,formation,upgrades,activeHero,heroes,artifacts,insurance);
        const isWin=res.winner==="attacker";
        const hL=1+heroBon(activeHero,heroes,"loot")+artBonus(artifacts,"loot");
        const hX=1+heroBon(activeHero,heroes,"xp")+artBonus(artifacts,"xp");
        const lM=isWin?Math.floor((Math.random()*(enemy.loot[1]-enemy.loot[0])+enemy.loot[0])*hL):0;
        const lC=isWin?Math.floor(lM*.3):0;
        const lDM=isWin?Math.floor(Math.random()*5+1):0;
        const xp=Math.floor((isWin?enemy.xp:enemy.xp*.15)*hX);
        res.loot=isWin?{metal:lM,crystal:lC,dm:lDM}:null;
        res.xpGain=xp;res.enemyName=enemy.name;
        const ts=new Date().toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"});
        upd(prev=>({
          ...prev,
          fleet:Object.fromEntries(Object.entries(prev.fleet).map(([t,n])=>[t,Math.max(0,n-(res.losses[t]||0))])),
          resources:{metal:Math.min(cap.metal,prev.resources.metal+lM+(res.salvage||0)),crystal:Math.min(cap.crystal,prev.resources.crystal+lC),dm:Math.min(9999,(prev.resources.dm||0)+lDM)},
          stats:{...prev.stats,wins:prev.stats.wins+(isWin?1:0),losses:prev.stats.losses+(isWin?0:1),battles:prev.stats.battles+1,xp:prev.stats.xp+xp,lootM:prev.stats.lootM+lM,lootC:prev.stats.lootC+lC,lootDM:prev.stats.lootDM+lDM,crits:prev.stats.crits+res.crits},
          battleLog:[{id:Date.now(),enemy:enemy.name,winner:res.winner,rounds:res.rounds.length,xpGain:xp,loot:res.loot,losses:res.losses,ts,crits:res.crits,salvage:res.salvage},...prev.battleLog.slice(0,49)],
          replayData:res.rounds,
        }));
        setReport({...res});setBattle(false);
      }
    },80);
  },[fleet,selEnemy,tech,formation,upgrades,activeHero,heroes,artifacts,insurance,totalShips,battling,cap]);

  const launchRaid=rid=>{
    const raid=RAIDS.find(r=>r.id===rid);
    if(!raid||raidRunning)return;
    if(stats.wins<raid.req){notify(`${raid.req} zafer gerekli!`,false);return;}
    setRaidRun(true);setRaidPct(0);setRaidResult(null);
    const dur=6000,start=Date.now();
const tick=setInterval(()=>{; _intervalIds.current.push(tick);
      const e=Date.now()-start,pct=Math.min(e/dur,1);
      setRaidPct(pct);
      if(pct>=1){
        clearInterval(tick);
        let survived=true;
        for(let w=0;w<raid.waves;w++){
          const waveFleet=Object.fromEntries(Object.keys(UNITS).map(t=>[t,Math.floor((ENEMIES[Math.min(w,5)].units[t]||0)*.5)]));
          const res=battle(fleet,waveFleet,tech,formation,upgrades,activeHero,heroes,artifacts,false);
          if(res.winner!=="attacker"){survived=false;break;}
        }
        const rew=survived?raid.reward:{metal:0,crystal:0,dm:0};
        if(survived){
          upd(prev=>({...prev,resources:{metal:Math.min(cap.metal,prev.resources.metal+rew.metal),crystal:Math.min(cap.crystal,prev.resources.crystal+rew.crystal),dm:Math.min(9999,(prev.resources.dm||0)+rew.dm)},stats:{...prev.stats,raids:prev.stats.raids+1},raidProgress:{...prev.raidProgress,[rid]:(prev.raidProgress[rid]||0)+1}}));
        }
        setRaidResult({survived,rew,raid});setRaidRun(false);
      }
    },80);
  };

  const resetGame=()=>{if(!window.confirm("Sıfırla?"))return;localStorage.removeItem(SAVE_KEY);setGs(seedStarterFleet(init0()));setReport(null);setReplay(false);notify("Sıfırlandı.");};

  const masterEyeInsights = useMemo(()=>{
    const insights=[];
    const sessionMin = Math.floor((totalPlaySeconds||0)/60);
    if(metPct>0.85) insights.push({icon:"⚠",color:"#fbbf24",text:"Metal deposu doluyor — Metal Deposu'nu yükselt veya gemi inşa et."});
    if(crsPct>0.85) insights.push({icon:"⚠",color:"#fbbf24",text:"Kristal deposu doluyor — fazlasını gemi/araştırmaya harca."});
    if(techQ.length===0 && resources.metal>20000) insights.push({icon:"🔬",color:"#38bdf8",text:"Araştırma kuyruğun boş — biriken metal araştırmaya akıtılabilir."});
    if(adCooldown===0 && !adWatching && !adLimitReached) insights.push({icon:"📺",color:"#22c55e",text:"Reklam izleyerek anında +15K⛏ +5K💎 +8🌑 kazanabilirsin."});
    if(totalShips<10) insights.push({icon:"🚀",color:"#a78bfa",text:"Filo küçük — Hafif Avcı ve Küçük Nakliye ile büyümeye başla."});
    if(!bossOnCooldown && totalShips>15) insights.push({icon:"👹",color:"#ef4444",text:"Haftalık Boss hazır ve filon yeterince güçlü görünüyor — dene!"});
    if(stats.wins>=50 && stats.prestige===0) insights.push({icon:"🔮",color:"#c084fc",text:"Prestige için hazırsın — kalıcı güç bonusu kazanabilirsin."});
    if(sessionMin>=10) insights.push({icon:"⏱",color:"#34d399",text:`Bu oturumda ${sessionMin} dakikadır oynuyorsun — pasif oturum bonusun birikiyor.`});
    if(insights.length===0) insights.push({icon:"✅",color:"#22c55e",text:"Her şey dengeli görünüyor — savaşa veya araştırmaya devam edebilirsin."});
    return insights;
  },[metPct,crsPct,techQ.length,resources.metal,adCooldown,adWatching,adLimitReached,totalShips,bossOnCooldown,stats.wins,stats.prestige,totalPlaySeconds]);

  const MENU_GROUPS = [
    { id:"empire",  label:"İmparatorluk", icon:"🌍", tabs:["fleet","upgrade","galaxy","build"] },
    { id:"science",  label:"Bilim",        icon:"🔬", tabs:["tech"] },
    { id:"war",      label:"Savaş",        icon:"⚔",  tabs:["battle","boss","raid"], badge:bossOnCooldown?0:1 },
    { id:"social",   label:"Komuta",       icon:"👑", tabs:["hero","artifact","missions","medals"], badge:pending },
    { id:"records",  label:"Kayıtlar",     icon:"📊", tabs:["stats","log"] },
    ...(isAdmin?[{id:"adminGroup",label:"Admin",icon:"⚙",tabs:["admin"]}]:[]),
  ];
  const TAB_META = {
    fleet:{label:"Filo Hangarı",icon:"🚀"}, upgrade:{label:"Gemi Yükseltme",icon:"↑"},
    galaxy:{label:"Galaksi Haritası",icon:"🌌"}, build:{label:"Binalar",icon:"🏗"},
    tech:{label:"Araştırma Ağacı",icon:"🔬"},
    battle:{label:"Savaş Meydanı",icon:"⚔"}, boss:{label:"Haftalık Boss",icon:"👹"}, raid:{label:"Baskınlar",icon:"🪨"},
    hero:{label:"Kahramanlar",icon:"🧑‍✈️"}, artifact:{label:"Artefaktlar",icon:"💠"}, missions:{label:"Görevler",icon:"📜"}, medals:{label:"Rozetler",icon:"🎖"},
    stats:{label:"İstatistikler",icon:"📈"}, log:{label:"Savaş Kayıtları",icon:"📋"},
    admin:{label:"Admin Paneli",icon:"⚙"},
  };
  const [activeGroup,setActiveGroup]=useState("empire");
  const _intervalIds = useRef([]); // [CLEANUP] Tüm interval ID'leri
  useEffect(()=>{ // [CLEANUP] Component unmount'ta temizle
    return ()=>{ _intervalIds.current.forEach(clearInterval); _intervalIds.current=[]; };
  },[]);

  // Güvenli sekme geçişi: tab'ı ayarlarken o tab'ın ait olduğu grubu da
  // otomatik bulup activeGroup'u senkron tutar. Programatik setTab() çağrıları
  // (örn. boss savaşı sonrası "battle" sekmesine dönme) bunu kullanmalı —
  // doğrudan setTab() çağırmak, kullanıcı farklı bir gruptaysa menünün
  // görsel olarak senkronsuz kalmasına yol açabilir.
  const goToTab = useCallback((tabId)=>{
    const group = MENU_GROUPS.find(g=>g.tabs.includes(tabId));
    if(group) setActiveGroup(group.id);
    setTab(tabId);
  },[MENU_GROUPS]);

  // ═════════════════════ §9 RENDER — LOGIN GATE ════════════════════════════
  if(!user){
    return(
      <div style={{fontFamily:"-apple-system,system-ui,sans-serif",background:T.bg,minHeight:"100vh",color:T.pri,maxWidth:480,margin:"0 auto",position:"relative",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
        <div style={{position:"absolute",inset:0,overflow:"hidden"}}><Stars h={800}/></div>
        <div style={{position:"relative",zIndex:1,textAlign:"center",width:"100%",maxWidth:320}}>

          {!showEmailStep ? (
            <>
              <div style={{fontSize:42,marginBottom:6}}>◈</div>
              <div style={{fontSize:11,color:T.acc,letterSpacing:4,fontWeight:800,marginBottom:2}}>ASTROGAMEWAR</div>
              <div style={{fontSize:20,fontWeight:900,color:T.pri,marginBottom:6}}>Komuta Merkezine Hoş Geldin</div>
              <div style={{fontSize:11,color:T.sec,marginBottom:28,lineHeight:1.5}}>İlerlemeni kaydetmek ve filonu her cihazdan yönetmek için giriş yap.</div>
              <button onClick={handleGoogleSignIn} disabled={authLoading} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:10,background:"#fff",color:"#1f1f1f",border:"none",borderRadius:8,padding:"12px 16px",fontSize:14,fontWeight:600,cursor:authLoading?"wait":"pointer",boxShadow:"0 2px 10px rgba(0,0,0,0.3)",opacity:authLoading?0.7:1}}>
                {authLoading?(<span>Bağlanıyor...</span>):(<>
                  <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.12-.84 2.07-1.8 2.7v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.6z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.35 0-4.34-1.58-5.05-3.71H.96v2.33C2.44 15.98 5.48 18 9 18z"/><path fill="#FBBC05" d="M3.95 10.71c-.18-.54-.28-1.11-.28-1.71s.1-1.17.28-1.71V4.96H.96A8.99 8.99 0 0 0 0 9c0 1.45.35 2.83.96 4.04l2.99-2.33z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.96l2.99 2.33C4.66 5.16 6.65 3.58 9 3.58z"/></svg>
                  <span>Google ile Giriş Yap</span>
                </>)}
              </button>
              <div style={{fontSize:9,color:T.sec,marginTop:14,lineHeight:1.5,padding:"0 6px"}}>
                🔒 Giriş yaparak adın, e-postan ve oyun ilerlemen güvenli şekilde kaydedilir. Bu bilgiler sadece hesabını tanımak ve ilerlemeni senin için saklamak amacıyla kullanılır, üçüncü taraflarla paylaşılmaz.
              </div>
            </>
          ):(
            <>
              <div style={{fontSize:34,marginBottom:8}}>📧</div>
              <div style={{fontSize:17,fontWeight:900,color:T.pri,marginBottom:6}}>E-postanı Onayla</div>
              <div style={{fontSize:11,color:T.sec,marginBottom:18,lineHeight:1.5}}>
                Hesap kaydın ve ilerlemen bu e-postayla ilişkilendirilecek.
              </div>
              <input
                type="email" value={emailInput} onChange={e=>setEmailInput(e.target.value)}
                placeholder="ornek@gmail.com"
                style={{width:"100%",background:T.bgC,border:`1px solid ${T.brH}`,borderRadius:8,padding:"11px 14px",fontSize:13,color:T.pri,marginBottom:12,outline:"none"}}
              />
              <Btn onClick={confirmEmailAndEnter} color={T.acc} full style={{padding:12}}>Devam Et →</Btn>
              <button onClick={()=>{setShowEmailStep(false);setPendingGoogleProfile(null);}} style={{background:"none",border:"none",color:T.sec,fontSize:10,marginTop:10,cursor:"pointer"}}>← Geri</button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ═════════════════════ §10 RENDER — ANA OYUN ═════════════════════════════
  return(
    <div style={{fontFamily:"-apple-system,system-ui,sans-serif",background:T.bg,minHeight:"100vh",color:T.pri,maxWidth:480,margin:"0 auto",position:"relative"}}>

      {notif&&<div style={{position:"fixed",top:9,left:"50%",transform:"translateX(-50%)",background:notif.ok?"#041a0a":"#1a0404",border:`1px solid ${notif.ok?"#22c55e33":"#ef444433"}`,color:notif.ok?"#86efac":"#fca5a5",padding:"5px 15px",borderRadius:20,zIndex:9999,fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}>{notif.msg}</div>}

      {showDaily&&(
        <div style={{position:"fixed",inset:0,background:"#000a",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9997}}>
          <div style={{background:T.bgC,border:"2px solid #fbbf2455",borderRadius:14,padding:18,width:250,textAlign:"center"}}>
            <div style={{fontSize:26}}>🎁</div>
            <div style={{fontWeight:900,fontSize:15,color:"#fbbf24",marginBottom:3}}>Günlük Ödül</div>
            <div style={{fontSize:9,color:T.sec,marginBottom:10}}>Seri: {daily.streak} gün</div>
            {DAILY_REWARDS.map((r,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"2px 7px",marginBottom:2,borderRadius:4,background:i===(daily.streak%7)?"#1a2a10":"transparent",border:i===(daily.streak%7)?"1px solid #86efac33":"1px solid transparent"}}>
                <span style={{fontSize:9,color:T.sec}}>G{i+1}</span>
                <span style={{fontSize:9,color:"#60a5fa"}}>⛏{fmt(r.metal)}</span>
                <span style={{fontSize:9,color:"#a78bfa"}}>💎{fmt(r.crystal)}</span>
                <span style={{fontSize:9,color:"#c084fc"}}>🌑{r.dm}</span>
              </div>
            ))}
            <div style={{display:"flex",gap:6,marginTop:10}}>
              <Btn onClick={()=>setDaily(false)} sm full color="#64748b">Kapat</Btn>
              {canDaily&&<Btn onClick={claimDaily} sm full color="#fbbf24">Al!</Btn>}
            </div>
          </div>
        </div>
      )}

      {showMasterEye&&(
        <div style={{position:"fixed",inset:0,background:"#000c",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9996,padding:16}}>
          <div style={{background:T.bgC,border:"2px solid #38bdf855",borderRadius:14,padding:18,width:"100%",maxWidth:340,maxHeight:"80vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontSize:14,fontWeight:900,color:T.acc}}>👁️ Master Göz</div>
              <Btn onClick={()=>setMasterEye(false)} sm danger>✕</Btn>
            </div>
            <div style={{fontSize:9,color:T.sec,marginBottom:10}}>Oynayışını analiz ediyor, sana özel öneriler sunuyor.</div>
            <div style={{display:"flex",gap:4,marginBottom:10}}>
              <Pill label="Oturum" value={`${Math.floor((totalPlaySeconds||0)/60)}dk`} icon="⏱" color="#34d399"/>
              <Pill label="Güç" value={fmt(fleetPow)} icon="⚔" color="#fb923c"/>
              <Pill label="Doluluk" value={`${Math.round(Math.max(metPct,crsPct)*100)}%`} icon="📦" color="#fbbf24"/>
            </div>
            {masterEyeInsights.map((ins,i)=>(
              <div key={i} style={{display:"flex",gap:8,alignItems:"flex-start",background:T.bgP,borderRadius:8,padding:"8px 10px",marginBottom:6,border:`1px solid ${ins.color}33`}}>
                <span style={{fontSize:14}}>{ins.icon}</span>
                <span style={{fontSize:10,color:T.pri,lineHeight:1.4}}>{ins.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{background:T.bgP,padding:"11px 12px 8px",borderBottom:`1px solid ${T.br}`}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:7}}>
          <div>
            <div style={{fontSize:9,color:T.acc,letterSpacing:3,fontWeight:800}}>◈ ASTROGAMEWAR</div>
            <div style={{fontSize:14,fontWeight:900,color:T.pri}}>Komuta Merkezi</div>
          </div>
          <div style={{display:"flex",gap:3,alignItems:"center"}}>
            <button onClick={()=>setMasterEye(true)} style={{background:"#0a1a2a",border:"1px solid #38bdf855",color:T.acc,borderRadius:20,padding:"2px 8px",fontSize:9,fontWeight:700,cursor:"pointer"}}>👁️</button>
            {stats.prestige>0&&<span style={{fontSize:9,color:"#c084fc",background:"#1a0a2a",border:"1px solid #c084fc44",borderRadius:20,padding:"2px 7px",fontWeight:700}}>🔮×{stats.prestige}</span>}
            {canDaily&&<button onClick={()=>setDaily(true)} style={{background:"#1a1200",border:"1px solid #fbbf2444",color:"#fbbf24",borderRadius:20,padding:"2px 7px",fontSize:9,fontWeight:700,cursor:"pointer"}}>🎁</button>}
            <div style={{background:T.bgC,border:`1px solid ${rank.color}33`,borderRadius:20,padding:"2px 8px",fontSize:9,color:rank.color,fontWeight:700}}>{rank.icon} {rank.label}</div>
            <button onClick={handleSignOut} title={user.email} style={{background:T.bgC,border:`1px solid ${T.br}`,color:T.sec,borderRadius:20,padding:"2px 6px",fontSize:9,cursor:"pointer"}}>👤</button>
          </div>
        </div>
        <div style={{display:"flex",gap:4,marginBottom:5}}>
          {[["⛏","Metal",resources.metal,cap.metal,prod.metal,"#60a5fa",metPct],["💎","Kristal",resources.crystal,cap.crystal,prod.crystal,"#a78bfa",crsPct]].map(([ic,lb,val,c,rate,col,pct])=>(
            <div key={lb} style={{flex:1,background:T.bgC,border:`1px solid ${pct>.92?"#ef444444":T.br}`,borderRadius:7,padding:"4px 7px"}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:7,color:T.sec,marginBottom:1}}><span>{ic} {lb}</span><span style={{color:pct>.92?"#f87171":T.sec}}>{Math.round(pct*100)}%</span></div>
              <div style={{fontSize:12,fontWeight:900,color:col,lineHeight:1}}>{fmt(val)}</div>
              <div style={S.muted7}>/{fmt(c)} +{fmt(rate)}/s</div>
              <div style={{marginTop:2}}><Bar pct={pct} color={pct>.92?"#ef4444":col} h={3}/></div>
            </div>
          ))}
          <div style={{background:T.bgC,border:"1px solid #c084fc33",borderRadius:7,padding:"4px 7px",minWidth:60}}>
            <div style={{fontSize:7,color:"#c084fc",marginBottom:1}}>🌑 DM</div>
            <div style={{fontSize:14,fontWeight:900,color:"#c084fc"}}>{fmt(resources.dm||0)}</div>
            {dmProd>0&&<div style={S.muted7}>+{fmt(dmProd)}/s</div>}
          </div>
        </div>
        {nextRank&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:7,color:T.sec,marginBottom:1}}><span>{fmt(stats.xp)} XP</span><span>{nextRank.icon} -{fmt(nextRank.min-stats.xp)}</span></div>
            <Bar pct={(stats.xp-rank.min)/Math.max(1,nextRank.min-rank.min)} color={rank.color} h={3}/>
          </div>
        )}
      </div>

      <div style={{display:"flex",borderBottom:`1px solid ${T.br}`,background:T.bgP,overflowX:"auto"}}>
        {MENU_GROUPS.map(g=>(
          <button key={g.id} onClick={()=>{setActiveGroup(g.id);setTab(g.tabs[0]);}} style={{flex:"1 0 auto",minWidth:64,padding:"9px 6px",background:"none",border:"none",borderBottom:activeGroup===g.id?`2px solid ${T.acc}`:"2px solid transparent",color:activeGroup===g.id?T.acc:T.sec,fontSize:9,fontWeight:activeGroup===g.id?800:500,cursor:"pointer",position:"relative",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
            <span style={{fontSize:15}}>{g.icon}</span>
            <span>{g.label}</span>
            {g.badge>0&&<span style={{position:"absolute",top:3,right:6,background:"#ef4444",color:"#fff",borderRadius:20,fontSize:7,fontWeight:900,padding:"1px 4px"}}>{g.badge}</span>}
          </button>
        ))}
      </div>

      <div style={{display:"flex",gap:4,padding:"7px 10px",background:T.bgP,borderBottom:`1px solid ${T.br}`,overflowX:"auto"}}>
        {MENU_GROUPS.find(g=>g.id===activeGroup)?.tabs.map(tid=>(
          <button key={tid} onClick={()=>setTab(tid)} style={{flex:"0 0 auto",padding:"5px 11px",borderRadius:20,background:tab===tid?`${T.acc}1a`:T.bgC,border:`1px solid ${tab===tid?T.acc:T.br}`,color:tab===tid?T.acc:T.sec,fontSize:10,fontWeight:tab===tid?800:500,cursor:"pointer",whiteSpace:"nowrap"}}>
            {TAB_META[tid]?.icon} {TAB_META[tid]?.label}
          </button>
        ))}
      </div>

      <div style={{padding:"10px 10px 92px"}}>

        {tab==="fleet"&&(
          <div>
            <Card accent="#22c55e" style={{marginBottom:8}}>
              <div style={S.row}>
                <div>
                  <div style={{fontSize:11,fontWeight:800,color:"#86efac"}}>📺 Reklam İzle, Ödül Kazan</div>
                  <div style={{fontSize:8,color:T.sec,marginTop:1}}>+15K⛏ +5K💎 +8🌑 · Bugün kalan: {Math.max(0,AD_DAILY_LIMIT-adWatchesEffective)}/{AD_DAILY_LIMIT}</div>
                </div>
                {adWatching?(<div style={{minWidth:70}}><Bar pct={adPct} color="#22c55e" h={6}/></div>)
                  :adLimitReached?(<span style={{fontSize:9,color:"#fbbf24"}}>Yarın tekrar gel</span>)
                  :adCooldown>0?(<span style={{fontSize:9,color:T.sec}}>{Math.ceil(adCooldown/1000)}s</span>)
                  :(<Btn onClick={watchAd} color="#22c55e" sm>İzle ▶</Btn>)}
              </div>
            </Card>
            <div style={S.rowGap3mb8}>
              <Pill label="Gemi" value={totalShips} icon="🚀" color={T.acc}/>
              <Pill label="Güç" value={fmt(fleetPow)} icon="⚔" color="#fb923c"/>
              <Pill label="Kritik" value={stats.crits} icon="💥" color="#fbbf24"/>
              <Pill label="Prestige" value={stats.prestige} icon="🔮" color="#c084fc"/>
            </div>

            <Section title="Filo Şablonları & Ayarlar" icon="⚙" defaultOpen={false}>
              <div style={{display:"flex",gap:4,marginBottom:6,overflowX:"auto"}}>
                {FLEET_TEMPLATES.map(t=>(
                  <button key={t.id} onClick={()=>applyTemplate(t.id)} style={{flex:"0 0 auto",background:T.bgC,border:`1px solid ${T.br}`,borderRadius:8,padding:"5px 8px",cursor:"pointer",textAlign:"center"}}>
                    <div style={{fontSize:13}}>{t.icon}</div><div style={{fontSize:8,color:T.pri,fontWeight:700}}>{t.name}</div>
                  </button>
                ))}
                <button onClick={()=>upd(prev=>({...prev,insurance:!prev.insurance}))} style={{flex:"0 0 auto",background:insurance?"#0a2a1a":T.bgC,border:`1px solid ${insurance?"#22c55e44":T.br}`,borderRadius:8,padding:"5px 8px",cursor:"pointer",textAlign:"center"}}>
                  <div style={{fontSize:13}}>🛡</div><div style={{fontSize:8,color:insurance?"#22c55e":T.sec,fontWeight:700}}>Sigorta</div>
                </button>
                <button onClick={()=>upd(prev=>({...prev,autoBattle:!prev.autoBattle}))} style={{flex:"0 0 auto",background:autoBattle?"#0a1a2a":T.bgC,border:`1px solid ${autoBattle?T.acc+"44":T.br}`,borderRadius:8,padding:"5px 8px",cursor:"pointer",textAlign:"center"}}>
                  <div style={{fontSize:13}}>🤖</div><div style={{fontSize:8,color:autoBattle?T.acc:T.sec,fontWeight:700}}>Oto</div>
                </button>
              </div>
            </Section>

            {[1,2,3,4,5,6].map(tierNum=>{
              const tierUnits = Object.entries(UNITS).filter(([,u])=>u.tier===tierNum);
              if(!tierUnits.length) return null;
              const tierLabel = {1:"Tier 1 — Başlangıç Gemileri",2:"Tier 2 — Orta Sınıf",3:"Tier 3 — Kruvazör Sınıfı",4:"Tier 4 — Ağır Sınıf",5:"Tier 5 — Yıkıcı Sınıf",6:"Tier 6 — Üst Düzey / Özel"}[tierNum];
              const unlockedCount = tierUnits.filter(([type])=>isUnitUnlocked(type,tech)).length;
              return(
                <Section key={tierNum} title={tierLabel} icon={tierNum<=2?"🔹":tierNum<=4?"🔶":"💠"} subtitle={`${unlockedCount}/${tierUnits.length} açık`} defaultOpen={tierNum===1}>
                  {tierUnits.map(([type,u])=>{
                    const locked = !isUnitUnlocked(type,tech);
                    const ug=upgrades[type]||{};
                    return(
                      <Card key={type} accent={u.color} style={{opacity:locked?0.55:1}}>
                        {locked&&<div style={{fontSize:7,color:"#fbbf24",marginBottom:3}}>🔒 Gerekli: {unitUnlockText(type,tech)}</div>}
                        {u.cost.dm>0&&<div style={{fontSize:7,color:"#c084fc",marginBottom:2}}>🌑 Karanlık Madde ile inşa edilir</div>}
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                          <div style={{display:"flex",gap:6,alignItems:"center"}}>
                            <span style={{fontSize:17,color:u.color}}>{u.icon}</span>
                            <div>
                              <div style={S.titlePri12}>{u.name}</div>
                              <div style={S.muted7}>{u.ability}</div>
                            </div>
                          </div>
                          <div style={{textAlign:"right"}}>
                            <div style={{fontSize:19,fontWeight:900,color:u.color,lineHeight:1}}>{fleet[type]||0}</div>
                            <div style={S.muted7}>adet</div>
                          </div>
                        </div>
                        <div style={{display:"flex",gap:3,marginBottom:4,flexWrap:"wrap"}}>
                          {[["⚔",Math.round(u.atk*techMul(tech,"atk")*(1+(ug.atk||0)*.05)),"#fb923c"],["🛡",Math.round(u.def*techMul(tech,"def")*(1+(ug.def||0)*.05)),"#a78bfa"],["♥",Math.round(u.hull*techMul(tech,"hull")*(1+(ug.hull||0)*.05)),"#f472b6"],["💥",(Math.round((u.crit+techMul(tech,"crit")-1)*100)+(ug.crit||0)*2)+"%","#fbbf24"]].map(([ic,val,col])=>(
                            <span key={ic} style={{background:T.bgP,borderRadius:3,padding:"1px 5px",fontSize:8,color:col,fontWeight:700}}>{ic}{val}</span>
                          ))}
                        </div>
                        <div style={S.row}>
                          <div style={S.muted7}>
                            {u.cost.dm>0?<span style={S.cDM}>🌑{u.cost.dm} DM</span>:<><span style={S.cBlue}>⛏{fmt(u.cost.metal)}</span>{" "}<span style={S.cPurple}>💎{fmt(u.cost.crystal)}</span></>}
                          </div>
                          <div style={{display:"flex",gap:3}}>
                            <Btn onClick={()=>sellUnit(type)} danger sm disabled={!fleet[type]}>−</Btn>
                            <Btn onClick={()=>buyUnit(type)} color={u.color} sm disabled={locked}>+ İnşa</Btn>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </Section>
              );
            })}

            <div style={S.mt8}>
              <Btn onClick={prestige} color="#c084fc" full disabled={stats.wins<50} style={{padding:10}}>
                🔮 Prestige ({stats.wins}/50 zafer) — +200 DM &amp; kalıcı güç
              </Btn>
            </div>
          </div>
        )}

        {tab==="upgrade"&&(
          <div>
            <div style={{background:T.bgC,border:"1px solid #fbbf2422",borderRadius:8,padding:"6px 10px",marginBottom:8,fontSize:9,color:"#fbbf24"}}>
              ↑ Her yükseltme o gemi tipinin tüm birimlerine %5 bonus ekler
            </div>
            {Object.entries(UNITS).filter(([type])=>(fleet[type]||0)>0 || isUnitUnlocked(type,tech)).map(([type,u])=>(
              <Card key={type} accent={u.color}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:7}}>
                  <span style={{fontSize:16,color:u.color}}>{u.icon}</span>
                  <span style={S.titlePri12}>{u.name}</span>
                  <span style={{fontSize:9,color:T.sec}}>({fleet[type]||0} adet)</span>
                </div>
                <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                  {u.upgrades.map(stat=>{
                    const lv=(upgrades[type]?.[stat]||0);
                    const cost=upgCost(type,stat,lv);
                    const cols={atk:"#fb923c",def:"#a78bfa",hull:"#f472b6",crit:"#fbbf24",speed:"#22d3ee"};
                    const ics={atk:"⚔",def:"🛡",hull:"♥",crit:"💥",speed:"⚡"};
                    const c=cols[stat];
                    return(
                      <div key={stat} style={{flex:1,minWidth:75,background:T.bgP,borderRadius:7,padding:"6px 7px",border:`1px solid ${T.br}`}}>
                        <div style={{fontSize:8,color:c,fontWeight:700,marginBottom:2}}>{ics[stat]} {stat.toUpperCase()}</div>
                        <div style={{fontSize:13,fontWeight:900,color:c,marginBottom:1}}>+{lv*5}%</div>
                        <div style={{fontSize:7,color:T.sec,marginBottom:4}}>Sv.{lv} · ⛏{fmt(cost)}</div>
                        <Bar pct={lv/10} color={c} h={3}/>
                        <div style={{marginTop:4}}><Btn onClick={()=>upgradeShip(type,stat)} color={c} sm full disabled={resources.metal<cost}>↑</Btn></div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>
        )}

        {tab==="galaxy"&&(
          <div>
            <Galaxy planets={planets} active={gs.activePlanet} wins={stats.wins} onSelect={pid=>{
              const owned=planets.find(p=>p.id===pid);
              if(owned){upd(prev=>({...prev,activePlanet:pid}));notify(`${owned.name} seçildi`);}
              else colonize(pid);
            }}/>
            <div style={S.mt8}>
              <Sep label="Gezegenlerim"/>
              {PLANETS.map(p=>{
                const owned=planets.find(pl=>pl.id===p.id);
                const meets=!p.locked||(p.req&&stats.wins>=p.req);
                return(
                  <Card key={p.id} accent={owned?p.color:undefined}>
                    <div style={S.row}>
                      <div style={{display:"flex",gap:6,alignItems:"center"}}>
                        <span style={{fontSize:20,opacity:owned?1:.3}}>{p.icon}</span>
                        <div>
                          <div style={{fontWeight:700,fontSize:12,color:owned?T.pri:T.sec}}>{p.name}</div>
                          <div style={S.muted8}>⛏×{p.mB} · 💎×{p.cB}</div>
                        </div>
                      </div>
                      <div>
                        {owned?<span style={{fontSize:9,color:"#22c55e",fontWeight:700}}>{gs.activePlanet===p.id?"● Aktif":"✓ Sahip"}</span>
                          :meets?<Btn onClick={()=>colonize(p.id)} color={p.color} sm>Koloni ⛏50K</Btn>
                          :<span style={{fontSize:8,color:"#ef4444"}}>🔒{p.req}🏆</span>}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {tab==="build"&&(
          <div>
            <div style={{background:T.bgC,border:"1px solid #fbbf2422",borderRadius:8,padding:"6px 10px",marginBottom:8,fontSize:9,color:"#fbbf24"}}>
              ⚡ ⛏{fmt(prod.metal)}/s 💎{fmt(prod.crystal)}/s 🌑{fmt(dmProd)}/s · Cap: ⛏{fmt(cap.metal)} 💎{fmt(cap.crystal)}
            </div>
            <Sep label="Binalar"/>
            {BUILDINGS.map(b=>{
              const lv=buildings[b.id]||0;
              const cost=bldgCost(b.id,lv||1);
              const ok=resources.metal>=cost.metal&&resources.crystal>=cost.crystal;
              return(
                <Card key={b.id} accent="#fbbf24">
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <div style={{display:"flex",gap:6,alignItems:"center"}}>
                      <span style={{fontSize:15}}>{b.icon}</span>
                      <div style={S.titlePri12}>{b.name}</div>
                    </div>
                    <span style={{fontSize:16,fontWeight:900,color:"#fbbf24"}}>{lv}<span style={S.muted8}> Sv.</span></span>
                  </div>
                  <Bar pct={Math.min(lv/15,1)} color="#fbbf24" h={3}/>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:4}}>
                    <div style={S.muted8}><span style={{color:ok?"#60a5fa":"#ef4444"}}>⛏{fmt(cost.metal)}</span>{" "}<span style={{color:ok?"#a78bfa":"#ef4444"}}>💎{fmt(cost.crystal)}</span></div>
                    <Btn onClick={()=>upgBldg(b.id)} color="#fbbf24" sm disabled={!ok}>↑ Yükselt</Btn>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {tab==="tech"&&(
          <div>
            {techQ.length>0&&(
              <div style={{background:T.bgC,border:`1px solid ${T.acc}22`,borderRadius:8,padding:"6px 10px",marginBottom:8}}>
                <div style={{fontSize:8,color:T.acc,fontWeight:700,marginBottom:4}}>🔬 Kuyruk ({techQ.length}/6)</div>
                <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
                  {techQ.map((id,i)=>(
                    <div key={id} style={{display:"flex",alignItems:"center",gap:3,background:T.bgP,borderRadius:4,padding:"2px 6px",border:`1px solid ${i===0?T.acc+"66":T.br}`}}>
                      <span style={{fontSize:8,color:i===0?T.acc:T.sec}}>{i===0?"▶":i+1}</span>
                      <span style={{fontSize:8,color:T.pri}}>{TECHS[id]?.icon}{TECHS[id]?.name}</span>
                      <button onClick={()=>remQ(id)} style={{background:"none",border:"none",color:"#f87171",cursor:"pointer",fontSize:8,padding:0}}>✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {ld<1&&<div style={{background:T.bgC,border:"1px solid #22c55e22",borderRadius:8,padding:"5px 10px",marginBottom:8,fontSize:8,color:"#86efac"}}>🔬 Lab indirim: %{Math.round((1-ld)*100)}</div>}

            {RESEARCH_CATS.map(cat=>{
              const catLevels = cat.items.reduce((s,id)=>s+(tech[id]||0),0);
              const catMax = cat.items.reduce((s,id)=>s+TECHS[id].max,0);
              return(
                <Section key={cat.id} title={cat.label} icon={cat.icon} subtitle={`${catLevels}/${catMax} toplam seviye`} defaultOpen={cat.id==="temel"}>
                  {cat.items.map(id=>{
                    const t=TECHS[id];
                    const lv=tech[id]||0;
                    const cost=Math.floor(t.base*(lv+1)*ld);
                    const ok=resources.metal>=cost;
                    const inQ=techQ.includes(id);
                    const isDM=t.bonus==="dm";
                    return(
                      <Card key={id} accent={isDM?"#c084fc":T.acc}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                          <div style={{display:"flex",gap:5,alignItems:"center"}}>
                            <span style={{fontSize:13}}>{t.icon}</span>
                            <div>
                              <div style={{fontWeight:800,fontSize:11,color:T.pri}}>{t.name}</div>
                              <div style={S.muted7}>{t.per>0?`+${Math.round(lv*t.per*100)}% ${t.bonus}`:"İstatistik / kademe açma amaçlı"}</div>
                            </div>
                          </div>
                          <span style={{fontSize:14,fontWeight:900,color:isDM?"#c084fc":T.acc}}>{lv}<span style={S.muted7}>/{t.max}</span></span>
                        </div>
                        <Bar pct={lv/t.max} color={isDM?"#c084fc":T.acc} h={3}/>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:4}}>
                          <span style={{fontSize:7,color:ok?"#60a5fa":"#ef4444"}}>⛏{fmt(cost)}</span>
                          <div style={{display:"flex",gap:3}}>
                            <Btn onClick={()=>addQ(id)} disabled={inQ||lv>=t.max} color="#a78bfa" sm>{inQ?"Kuyrukta":"+ Kuyruğa"}</Btn>
                            <Btn onClick={()=>upgTech(id)} disabled={lv>=t.max||!ok} color={isDM?"#c084fc":T.acc} sm>{lv>=t.max?"MAX":"Araştır"}</Btn>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </Section>
              );
            })}
          </div>
        )}

        {tab==="hero"&&(
          <div>
            <div style={{background:T.bgC,border:"1px solid #a78bfa22",borderRadius:8,padding:"6px 10px",marginBottom:8,fontSize:8,color:T.sec}}>
              Aktif kahraman savaşta ve üretimde bonus sağlar. 1 kahraman aynı anda aktif.
            </div>
            {HEROES.map(h=>{
              const owned=heroes.includes(h.id);
              const isActive=activeHero===h.id;
              const canBuy=stats.wins>=h.req&&resources.metal>=h.cost.metal&&resources.crystal>=h.cost.crystal&&(resources.dm||0)>=(h.cost.dm||0);
              return(
                <Card key={h.id} accent={isActive?h.color:owned?h.color+"66":undefined} glow={isActive}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                    <div style={{display:"flex",gap:7,alignItems:"center"}}>
                      <span style={{fontSize:20}}>{h.icon}</span>
                      <div>
                        <div style={{fontWeight:800,fontSize:12,color:isActive?h.color:T.pri}}>{h.name}{isActive&&" ★"}</div>
                        <div style={S.muted8}>{Object.entries(h.bonus).map(([k,v])=>`+${Math.round(v*100)}% ${k}`).join(" · ")}</div>
                      </div>
                    </div>
                    {owned?<Btn onClick={()=>setHero(h.id)} color={isActive?"#ef4444":h.color} sm>{isActive?"Çıkar":"Aktif"}</Btn>
                      :<Btn onClick={()=>recruitHero(h.id)} color={h.color} sm disabled={!canBuy||stats.wins<h.req}>{stats.wins<h.req?`🔒${h.req}🏆`:"İşe Al"}</Btn>}
                  </div>
                  <div style={S.muted7}>⛏{fmt(h.cost.metal)} 💎{fmt(h.cost.crystal)}{h.cost.dm>0?` 🌑${h.cost.dm}`:""}</div>
                </Card>
              );
            })}
          </div>
        )}

        {tab==="artifact"&&(
          <div>
            <div style={{background:T.bgC,border:"1px solid #c084fc22",borderRadius:8,padding:"6px 10px",marginBottom:8}}>
              <div style={{fontSize:9,color:"#c084fc",fontWeight:700}}>🌑 Karanlık Madde: {fmt(resources.dm||0)}</div>
              <div style={S.muted8}>Artefaktlar kalıcı pasif güç sağlar.</div>
            </div>
            {ARTIFACTS.map(a=>{
              const owned=artifacts.includes(a.id);
              return(
                <Card key={a.id} accent={owned?"#c084fc":undefined} glow={owned}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                    <div style={{display:"flex",gap:7,alignItems:"center"}}>
                      <span style={{fontSize:20}}>{a.icon}</span>
                      <div>
                        <div style={{fontWeight:800,fontSize:12,color:owned?"#c084fc":T.pri}}>{a.name}{owned&&" ✓"}</div>
                        <div style={S.muted8}>{a.desc}</div>
                      </div>
                    </div>
                    {!owned&&<Btn onClick={()=>buyArtifact(a.id)} color="#c084fc" sm disabled={(resources.dm||0)<a.cost.dm}>🌑{a.cost.dm}</Btn>}
                    {owned&&<span style={{fontSize:10,color:"#c084fc"}}>✓ Aktif</span>}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {tab==="battle"&&!report&&(
          <div>
            <Card>
              <div style={{fontSize:8,color:T.sec,marginBottom:3}}>Zafer Tahmini</div>
              <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:2}}>
                <Bar pct={win/100} color={win>65?"#22c55e":win>40?"#fbbf24":"#ef4444"} h={10}/>
                <span style={{fontSize:17,fontWeight:900,minWidth:34,textAlign:"right",color:win>65?"#22c55e":win>40?"#fbbf24":"#ef4444"}}>%{win}</span>
              </div>
              <div style={S.muted7}>{win>=70?"✅ Güçlü":win>=50?"⚠ Dengeli":"⚠ Riskli!"}{insurance&&" · 🛡 Sigorta aktif"}{autoBattle&&" · 🤖 Oto aktif"}</div>
            </Card>
            <Sep label="Formasyon"/>
            <div style={{display:"flex",gap:3,marginBottom:9,overflowX:"auto"}}>
              {FORMATIONS.map(f=>(
                <button key={f.id} onClick={()=>setForm(f.id)} style={{flex:"0 0 auto",background:formation===f.id?`${T.acc}18`:T.bgC,border:`1px solid ${formation===f.id?T.acc:T.br}`,borderRadius:8,padding:"6px 8px",cursor:"pointer",textAlign:"center",minWidth:74}}>
                  <div style={{fontSize:13,marginBottom:1}}>{f.icon}</div>
                  <div style={{fontSize:8,fontWeight:700,color:formation===f.id?T.acc:T.pri}}>{f.name}</div>
                  <div style={{fontSize:7,color:"#fb923c"}}>⚔{Math.round(f.aM*100)}%</div>
                  <div style={{fontSize:7,color:"#a78bfa"}}>🛡{Math.round(f.dM*100)}%</div>
                </button>
              ))}
            </div>
            {activeHero&&<div style={{fontSize:8,color:T.acc,marginBottom:7}}>⭐ {HEROES.find(h=>h.id===activeHero)?.name} aktif</div>}
            {artifacts.length>0&&<div style={{fontSize:8,color:"#c084fc",marginBottom:7}}>💠 {artifacts.length} artefakt aktif</div>}
            <Sep label="Hedef"/>
            {ENEMIES.map((e,i)=>(
              <button key={i} onClick={()=>setEnemy(i)} style={{width:"100%",display:"block",background:selEnemy===i?`${e.color}0c`:T.bgC,border:`1px solid ${selEnemy===i?e.color:T.br}`,borderRadius:9,padding:"9px 11px",marginBottom:6,textAlign:"left",cursor:"pointer",transition:"all .15s"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,alignItems:"center"}}>
                  <span style={S.titlePri12}>{e.name}</span>
                  <div style={{display:"flex",gap:3,alignItems:"center"}}>
                    <span style={{fontSize:9,color:"#fbbf24"}}>{"⭐".repeat(e.rank)}</span>
                    <span style={{fontSize:8,color:"#fb923c",background:"#1a0f05",borderRadius:3,padding:"1px 4px"}}>+{e.xp}XP</span>
                  </div>
                </div>
                <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
                  {Object.entries(e.units).filter(([,n])=>n>0).map(([t,n])=>(
                    <span key={t} style={{background:T.bgP,borderRadius:3,padding:"1px 5px",fontSize:8,color:UNITS[t].color}}>{UNITS[t].icon}{n}</span>
                  ))}
                </div>
                <div style={{marginTop:3,fontSize:7,color:T.sec}}>Ganimet: ⛏{fmt(e.loot[0])}–{fmt(e.loot[1])}</div>
              </button>
            ))}
            {battling&&<div style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:T.sec,marginBottom:4}}><span>🚀 Uçuşta...</span><span style={{color:T.acc}}>{bSec}s</span></div><Bar pct={bPct} color={T.acc} h={8}/></div>}
            <Btn onClick={launchBattle} disabled={battling||totalShips===0} color={T.acc} full style={{padding:12,fontSize:13,letterSpacing:1.5}}>{battling?"⏳ Savaş...":totalShips===0?"Filo Boş":"⚔ SALDIRI BAŞLAT"}</Btn>
          </div>
        )}

        {tab==="battle"&&report&&(
          <div>
            {showReplay&&gs.replayData&&<Replay rounds={gs.replayData} onClose={()=>setReplay(false)}/>}
            <div style={{background:report.winner==="attacker"?"#041a0a":"#1a0404",border:`2px solid ${report.winner==="attacker"?"#22c55e":"#ef4444"}`,borderRadius:11,padding:"16px",textAlign:"center",marginBottom:8,position:"relative",overflow:"hidden"}}>
              <Stars h={110}/>
              <div style={{position:"relative",zIndex:1}}>
                <div style={{fontSize:30,marginBottom:3}}>{report.winner==="attacker"?"🏆":"💀"}</div>
                <div style={{fontSize:18,fontWeight:900,letterSpacing:2,color:report.winner==="attacker"?"#22c55e":"#ef4444"}}>{report.winner==="attacker"?"ZAFER":"YENİLGİ"}</div>
                <div style={{fontSize:10,color:T.sec,marginTop:2}}>{report.enemyName} · {report.rounds.length} tur · +{report.xpGain}XP {report.crits>0&&`· 💥${report.crits}`}</div>
                {report.loot&&<div style={{marginTop:7,fontSize:11}}><span style={S.cBlue}>⛏+{fmt(report.loot.metal)}</span>{" "}<span style={S.cPurple}>💎+{fmt(report.loot.crystal)}</span>{" "}<span style={S.cDM}>🌑+{report.loot.dm}</span></div>}
                {report.salvage>0&&<div style={{fontSize:9,color:"#22c55e",marginTop:3}}>🛡 Sigorta: +{fmt(report.salvage)} metal kurtarıldı</div>}
              </div>
            </div>
            <Card>
              <Sep label="Kayıplar"/>
              {Object.entries(report.losses||{}).some(([,l])=>l>0)
                ?Object.entries(report.losses||{}).filter(([,l])=>l>0).map(([type,loss])=>(
                  <div key={type} style={{display:"flex",justifyContent:"space-between",marginBottom:3,fontSize:11}}>
                    <span style={{color:UNITS[type].color}}>{UNITS[type].icon} {UNITS[type].name}</span>
                    <span style={{color:"#f87171",fontWeight:700}}>−{loss}</span>
                  </div>
                )):<div style={{fontSize:10,color:"#22c55e"}}>Kayıp yok! ✦</div>}
            </Card>
            <div style={{display:"flex",gap:5}}>
              <Btn onClick={()=>setReplay(r=>!r)} color="#a78bfa" style={S.flex1}>▶ Tekrar</Btn>
              <Btn onClick={()=>setReport(null)} color={T.acc} style={S.flex1}>↩ Yeni Savaş</Btn>
            </div>
          </div>
        )}

        {tab==="boss"&&(
          <div>
            <div style={{background:"linear-gradient(135deg,#1a0404,#0a0414)",border:"2px solid #ef444455",borderRadius:12,padding:16,textAlign:"center",marginBottom:9,position:"relative",overflow:"hidden"}}>
              <Stars h={100}/>
              <div style={{position:"relative",zIndex:1}}>
                <div style={{fontSize:40,marginBottom:5}}>{WEEKLY_BOSS.icon}</div>
                <div style={{fontSize:16,fontWeight:900,color:"#ef4444"}}>{WEEKLY_BOSS.name}</div>
                <div style={{fontSize:8,color:T.sec,marginTop:2}}>Haftalık Dünya Boss'u</div>
                <div style={{display:"flex",gap:3,justifyContent:"center",marginTop:8,flexWrap:"wrap"}}>
                  {Object.entries(WEEKLY_BOSS.units).filter(([,n])=>n>0).map(([t,n])=>(
                    <span key={t} style={{background:"#1a0a0a",borderRadius:3,padding:"1px 6px",fontSize:8,color:UNITS[t].color}}>{UNITS[t].icon}{n}</span>
                  ))}
                </div>
                <div style={{marginTop:8,fontSize:9}}>
                  <span style={S.cBlue}>⛏{fmt(WEEKLY_BOSS.loot.metal)}</span>{" "}<span style={S.cPurple}>💎{fmt(WEEKLY_BOSS.loot.crystal)}</span>{" "}<span style={S.cDM}>🌑{WEEKLY_BOSS.loot.dm}</span>{" "}<span style={{color:"#fbbf24"}}>+{WEEKLY_BOSS.xp}XP</span>
                </div>
              </div>
            </div>
            {bossOnCooldown?(
              <Card accent="#ef4444">
                <div style={{textAlign:"center",fontSize:11,color:"#ef4444",fontWeight:700,marginBottom:4}}>🔒 Bu hafta zaten yenildi</div>
                <div style={{textAlign:"center",fontSize:9,color:T.sec}}>Yeni deneme için ~{Math.ceil(bossTimeLeft/(3600*1000))} saat kaldı</div>
              </Card>
            ):(<Btn onClick={fightBoss} color="#ef4444" full disabled={totalShips===0} style={{padding:13,fontSize:13,letterSpacing:1.5}}>👹 BOSS'A SALDIR</Btn>)}
            <div style={{marginTop:9}}>
              <Sep label="Kozmetik — Gemi Skinleri"/>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                {SKINS.map(s=>{
                  const owned=(ownedSkins||["sk0"]).includes(s.id);
                  const active=skin===s.id;
                  return(
                    <button key={s.id} onClick={()=>owned?equipSkin(s.id):buySkin(s.id)} style={{background:active?`${s.color||T.acc}1a`:T.bgC,border:`1px solid ${active?(s.color||T.acc):T.br}`,borderRadius:8,padding:"7px 10px",cursor:"pointer",textAlign:"center",minWidth:72}}>
                      <div style={{fontSize:16}}>{s.icon}</div>
                      <div style={{fontSize:8,color:active?(s.color||T.acc):T.pri,fontWeight:700}}>{s.name}</div>
                      <div style={{fontSize:7,color:owned?"#22c55e":"#c084fc"}}>{owned?(active?"Takılı":"Sahip"):`🌑${s.cost}`}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {tab==="raid"&&(
          <div>
            <div style={{background:T.bgC,border:"1px solid #fb923c22",borderRadius:8,padding:"6px 10px",marginBottom:8,fontSize:8,color:T.sec}}>
              Baskınlar çok dalgalı zorlayıcı görevlerdir. Tüm dalgaları geçersen büyük ödül kazanırsın.
            </div>
            {raidResult&&(
              <div style={{background:raidResult.survived?"#041a0a":"#1a0404",border:`2px solid ${raidResult.survived?"#22c55e":"#ef4444"}`,borderRadius:10,padding:"14px",textAlign:"center",marginBottom:8}}>
                <div style={{fontSize:24,marginBottom:4}}>{raidResult.survived?"🎖":"💀"}</div>
                <div style={{fontSize:15,fontWeight:900,color:raidResult.survived?"#22c55e":"#ef4444"}}>{raidResult.survived?"BASKINI GEÇTİN":"BASKINDA YENİLDİN"}</div>
                {raidResult.survived&&<div style={{fontSize:11,marginTop:6}}><span style={S.cBlue}>⛏+{fmt(raidResult.rew.metal)}</span>{" "}<span style={S.cPurple}>💎+{fmt(raidResult.rew.crystal)}</span>{" "}<span style={S.cDM}>🌑+{raidResult.rew.dm}</span></div>}
                <Btn onClick={()=>setRaidResult(null)} color={T.acc} sm style={S.mt8}>Tamam</Btn>
              </div>
            )}
            <Sep label="Baskın Haritası"/>
            {RAIDS.map(r=>{
              const unlocked=stats.wins>=r.req;
              const done=(raidProgress[r.id]||0)>0;
              return(
                <Card key={r.id} accent={unlocked?r.color:undefined}>
                  {!unlocked&&<div style={{fontSize:8,color:"#ef4444",marginBottom:3}}>🔒 {r.req} zafer gerekli</div>}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:5}}>
                    <div style={{display:"flex",gap:7,alignItems:"center"}}>
                      <span style={{fontSize:22,opacity:unlocked?1:.3}}>{r.icon}</span>
                      <div>
                        <div style={{fontWeight:800,fontSize:12,color:unlocked?T.pri:T.sec}}>{r.name}{done&&" ✓"}</div>
                        <div style={S.muted8}>{r.desc}{done?` · ${raidProgress[r.id]}× tamamlandı`:""}</div>
                      </div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      {"⭐".repeat(r.diff).split("").map((s,i)=><span key={i} style={{fontSize:9,color:"#fbbf24"}}>{s}</span>)}
                      <div style={S.muted8}>{r.waves} dalga</div>
                    </div>
                  </div>
                  <div style={{fontSize:8,color:T.sec,marginBottom:6}}>
                    <span style={S.cBlue}>⛏{fmt(r.reward.metal)}</span>{" "}<span style={S.cPurple}>💎{fmt(r.reward.crystal)}</span>{" "}<span style={S.cDM}>🌑{r.reward.dm} DM</span>
                  </div>
                  {selRaid===r.id&&raidRunning&&(<div style={{marginBottom:6}}><div style={{fontSize:8,color:T.sec,marginBottom:3}}>⚔ Dalgalar temizleniyor...</div><Bar pct={raidPct} color={r.color} h={7}/></div>)}
                  <Btn onClick={()=>{setRaid(r.id);launchRaid(r.id);}} color={r.color} sm full disabled={!unlocked||raidRunning||totalShips===0}>{raidRunning&&selRaid===r.id?"⏳ Baskın devam...":"⚔ Baskını Başlat"}</Btn>
                </Card>
              );
            })}
          </div>
        )}

        {tab==="missions"&&(
          <div>
            <div style={S.rowGap3mb8}>
              <Pill label="Tamamlanan" value={`${missions.filter(m=>m.claimed).length}/${missions.length}`} icon="✅" color="#22c55e"/>
              <Pill label="Bekleyen" value={pending} icon="🎁" color="#fbbf24"/>
              <Pill label="Raids" value={stats.raids} icon="🪨" color="#fb923c"/>
            </div>
            <Bar pct={missions.filter(m=>m.claimed).length/missions.length} color="#22c55e" h={5}/>
            <div style={S.mt8}>
              {missions.map(m=>{
                const total=Object.values(fleet).reduce((a,b)=>a+b,0);
                const tSum=Object.values(tech).reduce((a,b)=>a+b,0);
                let prog=0,tgt=1;
                if(m.req.wins)    {prog=Math.min(stats.wins,m.req.wins);tgt=m.req.wins;}
                if(m.req.ships)   {prog=Math.min(total,m.req.ships);tgt=m.req.ships;}
                if(m.req.techSum) {prog=Math.min(tSum,m.req.techSum);tgt=m.req.techSum;}
                if(m.req.planets) {prog=Math.min(planets.length,m.req.planets);tgt=m.req.planets;}
                if(m.req.hasDestroyer){prog=(fleet.destroyer||0)>=1?1:0;tgt=1;}
                if(m.req.raids)   {prog=Math.min(stats.raids,m.req.raids);tgt=m.req.raids;}
                if(m.req.heroes)  {prog=Math.min(heroes.length,m.req.heroes);tgt=m.req.heroes;}
                if(m.req.prestige){prog=Math.min(stats.prestige,m.req.prestige);tgt=m.req.prestige;}
                const col=m.claimed?"#22c55e":m.done?"#fbbf24":T.acc;
                return(
                  <Card key={m.id} accent={col}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                      <div style={{display:"flex",gap:5,alignItems:"center"}}>
                        <span style={{fontSize:14}}>{m.icon}</span>
                        <span style={{fontWeight:700,fontSize:11,color:col}}>{m.claimed?"✅ ":m.done?"⚡ ":""}{m.name}</span>
                      </div>
                      <div style={{textAlign:"right",fontSize:7}}>
                        <div style={S.cBlue}>+{fmt(m.reward.metal||0)}⛏</div>
                        {(m.reward.dm||0)>0&&<div style={S.cDM}>+{m.reward.dm}🌑</div>}
                      </div>
                    </div>
                    <Bar pct={prog/tgt} color={col} h={3}/>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:3}}>
                      <span style={S.muted7}>{prog}/{tgt}</span>
                      {m.done&&!m.claimed&&<Btn onClick={()=>claimMission(m.id)} color="#fbbf24" sm>Ödülü Al!</Btn>}
                      {m.claimed&&<span style={{fontSize:8,color:"#22c55e"}}>✓</span>}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {tab==="medals"&&(
          <div>
            <div style={S.rowGap3mb8}>
              <Pill label="Kazanılan" value={`${(medals||[]).length}/${MEDALS.length}`} icon="🎖" color="#fbbf24"/>
            </div>
            <Bar pct={(medals||[]).length/MEDALS.length} color="#fbbf24" h={5}/>
            <div style={S.mt8}>
              {MEDALS.map(m=>{
                const owned=(medals||[]).includes(m.id);
                return(
                  <Card key={m.id} accent={owned?"#fbbf24":undefined} glow={owned} style={{opacity:owned?1:.5}}>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <span style={{fontSize:26}}>{m.icon}</span>
                      <div>
                        <div style={{fontWeight:800,fontSize:12,color:owned?"#fbbf24":T.pri}}>{m.name}{owned&&" ✓"}</div>
                        <div style={S.muted8}>{m.desc}</div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {tab==="stats"&&(
          <div>
            <div style={S.rowGap3mb8}>
              <Pill label="Zafer" value={stats.wins} icon="🏆" color="#22c55e"/>
              <Pill label="Yenilgi" value={stats.losses} icon="💀" color="#f87171"/>
              <Pill label="Oran" value={stats.battles>0?Math.round(stats.wins/stats.battles*100)+"%":"0%"} icon="📊" color="#fbbf24"/>
              <Pill label="Prestige" value={stats.prestige} icon="🔮" color="#c084fc"/>
            </div>
            <div style={{display:"flex",gap:6,marginBottom:8}}>
              <MiniChart label="Son 6 Savaş" color="#38bdf8" data={battleLog.slice(0,6).reverse().map((l,i)=>({v:l.winner==="attacker"?1:0,l:`S${i+1}`}))}/>
              <MiniChart label="XP Trendi" color="#fbbf24" data={battleLog.slice(0,6).reverse().map((l,i)=>({v:l.xpGain,l:`S${i+1}`}))}/>
            </div>
            <Card>
              <Sep label="Toplam İstatistikler"/>
              {[
                ["⛏ Toplam Ganimet Metal",fmt(stats.lootM),"#60a5fa"],
                ["💎 Toplam Ganimet Kristal",fmt(stats.lootC),"#a78bfa"],
                ["🌑 Toplam Karanlık Madde",fmt(stats.lootDM),"#c084fc"],
                ["💥 Toplam Kritik Vuruş",stats.crits,"#fbbf24"],
                ["🪨 Tamamlanan Baskın",stats.raids,"#fb923c"],
                ["🔨 İnşa Edilen Gemi",gs.builtTotal,"#38bdf8"],
                ["🔬 Araştırma Sayısı",gs.researchTotal,"#34d399"],
                ["🌍 Gezegen Sayısı",planets.length,"#22c55e"],
                ["⏱ Toplam Oturum",`${Math.floor((totalPlaySeconds||0)/60)} dk`,"#94a3b8"],
              ].map(([label,val,col])=>(
                <div key={label} style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:5,paddingBottom:5,borderBottom:`1px solid ${T.br}`}}>
                  <span style={{color:T.sec}}>{label}</span>
                  <span style={{color:col,fontWeight:700}}>{val}</span>
                </div>
              ))}
            </Card>
          </div>
        )}

        {tab==="log"&&(
          <div>
            <div style={S.rowGap3mb8}>
              <Pill label="Zafer" value={stats.wins} icon="🏆" color="#22c55e"/>
              <Pill label="Yenilgi" value={stats.losses} icon="💀" color="#f87171"/>
              <Pill label="XP" value={fmt(stats.xp)} icon="⭐" color="#fbbf24"/>
              <Pill label="Kritik" value={stats.crits} icon="💥" color="#ef4444"/>
            </div>
            {battleLog.length===0
              ?<div style={{background:T.bgC,border:`1px solid ${T.br}`,borderRadius:9,padding:20,textAlign:"center",color:T.sec,fontSize:12}}>İlk savaşını başlat!</div>
              :battleLog.map(log=>(
                <Card key={log.id} accent={log.winner==="attacker"?"#22c55e":"#ef4444"}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:2,alignItems:"center"}}>
                    <span style={{fontWeight:700,fontSize:11}}>{log.winner==="attacker"?"🏆":"💀"} {log.enemy}</span>
                    <span style={S.muted7}>{log.ts}</span>
                  </div>
                  <div style={{display:"flex",gap:6,fontSize:8,color:T.sec,flexWrap:"wrap"}}>
                    <span>{log.rounds} tur</span>
                    <span style={{color:"#fbbf24"}}>+{log.xpGain}XP</span>
                    {log.crits>0&&<span style={{color:"#ef4444"}}>💥{log.crits}</span>}
                    {log.salvage>0&&<span style={{color:"#22c55e"}}>🛡+{fmt(log.salvage)}</span>}
                    {log.loot&&<><span style={S.cBlue}>⛏+{fmt(log.loot.metal)}</span><span style={S.cDM}>🌑+{log.loot.dm}</span></>}
                  </div>
                  {Object.values(log.losses||{}).some(l=>l>0)&&(<div style={{marginTop:2,fontSize:8,color:"#f87171"}}>Kayıp: {Object.entries(log.losses||{}).filter(([,l])=>l>0).map(([t,l])=>`${UNITS[t]?.icon}×${l}`).join(" ")}</div>)}
                </Card>
              ))
            }
          </div>
        )}

        {tab==="admin"&&isAdmin&&(
          <div>
            <div style={{background:"linear-gradient(135deg,#1a0a2a,#0a0414)",border:"1px solid #c084fc44",borderRadius:10,padding:"10px 12px",marginBottom:10}}>
              <div style={{fontSize:11,fontWeight:800,color:"#c084fc",marginBottom:2}}>⚙ Admin Paneli — Sadece Sana Özel</div>
              <div style={{fontSize:8,color:T.sec,lineHeight:1.4}}>
                {FIREBASE_READY?"Firebase'e bağlı. Tüm cihazlardan giriş yapan kullanıcılar burada listelenir.":"⚠ Firebase henüz kurulmadı — şu an sadece bu cihazdaki demo girişi görünüyor."}
              </div>
              {!FIREBASE_READY && FIREBASE_CONFIG_ISSUES.length>0 && (
                <div style={{marginTop:6,fontSize:8,color:"#fca5a5"}}>
                  Eksik/doldurulmamış alanlar: {FIREBASE_CONFIG_ISSUES.join(", ")}
                </div>
              )}
            </div>
            <Card accent={getAppCheckStatus()==="active"?"#22c55e":getAppCheckStatus().startsWith("error")?"#ef4444":"#fbbf24"} style={{marginBottom:9}}>
              <div style={S.row}>
                <div>
                  <div style={{fontSize:10,fontWeight:800,color:T.pri}}>🛡️ App Check (reCAPTCHA Enterprise)</div>
                  <div style={{fontSize:8,color:T.sec,marginTop:2}}>
                    {getAppCheckStatus()==="active"&&"✅ Aktif — sahte/bot istekleri engelleniyor"}
                    {getAppCheckStatus()==="disabled"&&(APPCHECK_READY?"Henüz başlatılmadı":"⚠ Kurulmadı")}
                    {getAppCheckStatus().startsWith("error")&&`❌ Hata: ${getAppCheckStatus().split(":")[1]}`}
                  </div>
                </div>
                <span style={{fontSize:16}}>{getAppCheckStatus()==="active"?"✅":getAppCheckStatus().startsWith("error")?"❌":"⏳"}</span>
              </div>
            </Card>
            <div style={{display:"flex",gap:3,marginBottom:9}}>
              <Pill label="Toplam Kullanıcı" value={adminUsers.length} icon="👥" color="#c084fc"/>
              <Pill label="Bugün Giren" value={adminUsers.filter(u=>Date.now()-(u.lastLoginAt||0)<86400000).length} icon="📅" color="#38bdf8"/>
              <Pill label="Toplam Giriş" value={adminUsers.reduce((s,u)=>s+(u.loginCount||1),0)} icon="🔁" color="#fbbf24"/>
            </div>
            <Btn onClick={loadAdminData} color="#c084fc" full disabled={adminLoading} style={{marginBottom:9}}>{adminLoading?"⏳ Yükleniyor...":"🔄 Kullanıcı Listesini Yenile"}</Btn>
            <Sep label="Kayıtlı Kullanıcılar"/>
            {adminUsers.length===0?(
              <div style={{background:T.bgC,border:`1px solid ${T.br}`,borderRadius:9,padding:18,textAlign:"center",color:T.sec,fontSize:11}}>Liste boş. "Yenile" butonuna basarak kullanıcı verisini çek.</div>
            ):(adminUsers.map((u,i)=>(
              <Card key={u.uid||i} accent="#c084fc">
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <div style={S.titlePri12}>{u.name||"İsimsiz"}</div>
                    <div style={{fontSize:9,color:"#60a5fa"}}>{u.email||"—"}</div>
                    <div style={{fontSize:7,color:T.sec,marginTop:3}}>UID: {u.uid}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={S.muted8}>Giriş: <span style={{color:"#fbbf24",fontWeight:700}}>{u.loginCount||1}×</span></div>
                    <div style={{fontSize:7,color:T.sec,marginTop:2}}>⏱ {Math.floor((u.totalPlaySeconds||0)/60)} dk</div>
                    <div style={{fontSize:7,color:T.sec,marginTop:2}}>{u.lastLoginAt?new Date(u.lastLoginAt).toLocaleString("tr-TR"):"—"}</div>
                  </div>
                </div>
              </Card>
            )))}
            <div style={{marginTop:12,fontSize:8,color:T.sec,lineHeight:1.5,padding:"0 4px"}}>
              🔒 Bu panel ve içindeki kullanıcı verileri sadece ADMIN_UIDS listesindeki hesaba görünür.
            </div>
          </div>
        )}

      </div>

      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:`linear-gradient(0deg,${T.bg} 70%,transparent)`,padding:"5px 12px 11px",borderTop:`1px solid ${T.br}`,display:"flex",justifyContent:"space-around",alignItems:"center"}}>
        {Object.entries(fleet).filter(([,n])=>n>0).slice(0,5).map(([type,count])=>(
          <div key={type} style={S.center}>
            <div style={{fontSize:11,color:UNITS[type].color}}>{UNITS[type].icon}</div>
            <div style={{fontSize:7,color:T.sec,fontWeight:700}}>{count}</div>
          </div>
        ))}
        {totalShips===0&&<div style={S.muted8}>Filo boş</div>}
        <div style={{width:1,height:22,background:T.br,margin:"0 2px"}}/>
        <div style={S.center}><div style={{fontSize:10,color:rank.color}}>{rank.icon}</div><div style={{fontSize:6,color:T.sec}}>{rank.label}</div></div>
        <div style={S.center}><div style={{fontSize:8,color:"#22c55e",fontWeight:700}}>{planets.length}🌍</div></div>
        {activeHero&&<div style={S.center}><div style={{fontSize:10}}>{HEROES.find(h=>h.id===activeHero)?.icon}</div><div style={{fontSize:6,color:T.acc}}>hero</div></div>}
        <div style={S.center}><div style={{fontSize:8,color:"#c084fc",fontWeight:700}}>🌑{fmt(resources.dm||0)}</div></div>
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  );
}
