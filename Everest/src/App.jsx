import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Upload, Volume2, RotateCw, CheckCircle, AlertCircle, Play, Type, Clock,
  Grid, Trophy, ArrowRight, Layout, Brain, RefreshCw, X, Zap, ShieldAlert,
  Star, Headphones, Search, Crosshair, Calendar, Flame, Target, Plus,
  FileText, Trash2, Edit2, Settings, List, Lock, Globe, Mic, Check, Keyboard,
  User, Shield, LogOut, Activity, Users, CreditCard, Monitor, Key, Filter,
  UserCheck, UserX, Crown, Timer, Minus, LogIn, BadgeCheck, Copyright,
  Download, Share // Added Icons
} from "lucide-react";

/**
 * FLASHCARDS: ULTIMATE EDITION v5.0 (FINAL PWA RELEASE)
 * Created for: Umarov
 * Updated: 2026-01-22
 * * UPDATE LOG:
 * - PWA Installation Logic (Android/PC/iOS)
 * - "Download App" button in System Bar
 * - iOS specific installation instructions
 * - Full Screen App Mode Optimization
 */

// --- UTILS & AUDIO ---

const playSound = (type) => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;

    const sounds = {
      success: { type: "sine", freq: [600, 1200], dur: 0.15 },
      error: { type: "sawtooth", freq: [150, 80], dur: 0.3 },
      click: { type: "triangle", freq: [800, 0], dur: 0.05 },
      levelUp: { type: "square", freq: [400, 800], dur: 0.4 },
      reveal: { type: "sine", freq: [300, 600], dur: 0.1 },
      bossHit: { type: "sawtooth", freq: [100, 50], dur: 0.5 },
      accessDenied: { type: "sawtooth", freq: [100, 50], dur: 0.8 }, 
    };

    const s = sounds[type] || sounds.click;
    osc.type = s.type;
    osc.frequency.setValueAtTime(s.freq[0], now);
    if (s.freq[1] > 0) osc.frequency.exponentialRampToValueAtTime(s.freq[1], now + s.dur);
    
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + s.dur);
    
    osc.start(now);
    osc.stop(now + s.dur);
  } catch (e) { console.error(e); }
};

const speak = (text) => {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.9;
    u.pitch = 1.0;
    window.speechSynthesis.speak(u);
  }
};

const triggerConfetti = () => {
  const colors = ["#f59e0b", "#ec4899", "#8b5cf6", "#10b981", "#3b82f6"];
  for (let i = 0; i < 60; i++) {
    const el = document.createElement("div");
    el.classList.add("confetti");
    el.style.left = Math.random() * 100 + "vw";
    el.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    el.style.animationDuration = Math.random() * 2 + 1 + "s";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }
};

// --- SYSTEM CONSTANTS & HELPERS ---
const API_URL = "https://6970faf178fec16a63ffae81.mockapi.io/Umarov/app";
const GROUP_SIZE = 5;

const generateVMAC = () => {
  const hex = "0123456789ABCDEF";
  let mac = "";
  for (let i = 0; i < 6; i++) {
    mac += hex.charAt(Math.floor(Math.random() * 16));
    mac += hex.charAt(Math.floor(Math.random() * 16));
    if (i < 5) mac += ":";
  }
  return mac;
};

const getFingerprint = () => {
  return btoa(navigator.userAgent + navigator.language + screen.width);
};

const isValidUsername = (username) => {
  if (username.length < 5 || username.length > 12) return false;
  const regex = /^[a-zA-Z0-9_]+$/;
  if (!regex.test(username)) return false;
  if (/^([a-z0-9_])\1+$/i.test(username)) return false;
  const badWords = ["admin", "root", "fuck", "shit", "sex", "xxx", "porn", "bot", "moderator", "system"];
  if (badWords.some(w => username.toLowerCase().includes(w))) return false;
  return true;
};

const formatTimeLeft = (ms) => {
  if (ms <= 0) return "Expired";
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  return `${days}d ${hours}h ${minutes}m`;
};

const App = () => {
  // --- EXISTING GLOBAL STATE ---
  const [files, setFiles] = useState({});
  const [activeFileId, setActiveFileId] = useState(null);
  const [view, setView] = useState("manager");
  
  // Editor State
  const [editingFile, setEditingFile] = useState(null);
  const [manualEn, setManualEn] = useState("");
  const [manualUz, setManualUz] = useState("");

  // Learning State
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const [queue, setQueue] = useState([]); 
  const [currentCard, setCurrentCard] = useState(null);
  const [stage, setStage] = useState("intro"); 
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState([]);
  const [quizFeedback, setQuizFeedback] = useState(null);
  const [introState, setIntroState] = useState({ index: 0, step: 1 });
  
  // Audio Typing State
  const [typingFeedback, setTypingFeedback] = useState(null);
  const [showTypingHint, setShowTypingHint] = useState(false);

  // Think State
  const [thinkIndex, setThinkIndex] = useState(0);

  // Game State
  const [gameMode, setGameMode] = useState(null);
  const [timer, setTimer] = useState(0);
  const [streak, setStreak] = useState(0);
  const [inputVal, setInputVal] = useState("");
  const [gameOptions, setGameOptions] = useState([]);
  const [gameState, setGameState] = useState("playing");
  
  // Helpers
  const timerRef = useRef(null);
  const [matchSelected, setMatchSelected] = useState(null);
  const [matchCards, setMatchCards] = useState([]);
  const [thinkRevealed, setThinkRevealed] = useState(false);

  // --- SECURITY & USER STATE ---
  const [user, setUser] = useState(null); 
  const [isGateOpen, setIsGateOpen] = useState(true); 
  const [authMode, setAuthMode] = useState("login"); 
  const [isLocked, setIsLocked] = useState(false); 
  const [globalSettings, setGlobalSettings] = useState({ money_mode: true }); 
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false); 
  
  // UI State for Security
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regError, setRegError] = useState("");
  
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [adminUser, setAdminUser] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [freeCodeInput, setFreeCodeInput] = useState("");
  const [allUsers, setAllUsers] = useState([]); 
  
  // Admin V2 States
  const [adminSearch, setAdminSearch] = useState("");

  // Translator State
  const [translatorSearch, setTranslatorSearch] = useState("");

  // --- PWA STATE ---
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

  // --- SYSTEM INITIALIZATION ---
  useEffect(() => {
    if (!window.XLSX) {
      const script = document.createElement("script");
      script.src = "https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js";
      script.async = true;
      document.body.appendChild(script);
    }
    const savedFiles = localStorage.getItem("fl_files");
    if (savedFiles) setFiles(JSON.parse(savedFiles));
    initializeSecurity();

    // PWA Install Listener
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // UseEffect for persisting files
  useEffect(() => {
    if (Object.keys(files).length > 0) {
      localStorage.setItem("fl_files", JSON.stringify(files));
    }
  }, [files]);

  // Monitor Access & Expiry
  useEffect(() => {
    if (!user) return;
    
    const checkAccess = () => {
      if (isAdmin || user.is_pro) { setIsLocked(false); return; }

      if (globalSettings.money_mode) {
        const now = Date.now();
        const expiry = user.access_until || 0;
        if (now > expiry) setIsLocked(true); else setIsLocked(false);
      } else {
        setIsLocked(false);
      }
    };

    const interval = setInterval(checkAccess, 5000); 
    checkAccess(); 

    return () => clearInterval(interval);
  }, [user, globalSettings, isAdmin]);

  const initializeSecurity = async () => {
    const localUser = JSON.parse(localStorage.getItem("fl_user"));
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      const configUser = data.find(u => u.username === "SYSTEM_CONFIG");
      if (configUser) setGlobalSettings({ money_mode: configUser.money_mode });
      
      if (localUser) {
        const apiUser = data.find(u => u.id === localUser.id);
        if (apiUser) {
          if (apiUser.password === localUser.password) {
             setUser(apiUser);
             setIsGateOpen(false); 
             if (apiUser.role === 'admin') setIsAdmin(true);
          } else {
             localStorage.removeItem("fl_user");
             setIsGateOpen(true);
          }
        } else {
          localStorage.removeItem("fl_user");
          setIsGateOpen(true);
        }
      } else {
        setIsGateOpen(true);
      }
    } catch (e) {
      console.error("API Error", e);
      if (localUser) {
         setUser(localUser);
         setIsGateOpen(false);
      }
    }
  };

  const handleRegister = async () => {
    if (!isValidUsername(regUsername)) {
      setRegError("Username yaroqsiz! (5-12 ta harf, raqam yoki _).");
      return;
    }
    if (regPassword.length < 4) {
      setRegError("Parol juda qisqa.");
      return;
    }

    try {
      setRegError("Tekshirilmoqda...");
      const res = await fetch(API_URL);
      const data = await res.json();

      if (data.find(u => u.username.toLowerCase() === regUsername.toLowerCase())) {
        setRegError("Bu nom band. Boshqa tanlang.");
        return;
      }

      let unique = false;
      let newMac = "";
      while (!unique) {
         newMac = generateVMAC();
         if (!data.find(u => u.mac_address === newMac)) unique = true;
      }

      const newUser = {
        username: regUsername,
        password: regPassword, 
        mac_address: newMac,
        fingerprint: getFingerprint(),
        created_at: Date.now(),
        access_until: Date.now(), 
        free_used: false,
        is_pro: false,
        role: "user",
        last_active: Date.now(),
        total_sessions: 0
      };

      const createRes = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser)
      });
      const createdUser = await createRes.json();
      
      localStorage.setItem("fl_user", JSON.stringify(createdUser));
      setUser(createdUser);
      setIsGateOpen(false);
      setRegError("");
    } catch (e) {
      setRegError("Internet xatosi. Qayta urining.");
    }
  };

  const handleLogin = async () => {
    if (!loginUsername || !loginPassword) {
      setRegError("Ma'lumotlarni kiriting.");
      return;
    }
    try {
      setRegError("Kirish...");
      const res = await fetch(API_URL);
      const data = await res.json();
      
      const foundUser = data.find(u => u.username.toLowerCase() === loginUsername.toLowerCase());
      
      if (foundUser && foundUser.password === loginPassword) {
        localStorage.setItem("fl_user", JSON.stringify(foundUser));
        setUser(foundUser);
        setIsGateOpen(false);
        if (foundUser.role === 'admin') setIsAdmin(true);
        setRegError("");
      } else {
        setRegError("Username yoki parol xato.");
      }
    } catch (e) {
      setRegError("Internet xatosi.");
    }
  };

  const attemptAdminLogin = () => {
    if (adminUser === "RyUmarov.A" && adminPass === "1818ea43") {
      setIsAdmin(true);
      setShowAdminLogin(false);
      setAdminPanelOpen(true);
      playSound("success");
    } else {
      alert("Xato ma'lumot!");
      playSound("error");
    }
  };

  const logout = () => {
    localStorage.removeItem("fl_user");
    window.location.reload();
  };

  const handleFreeUnlock = async () => {
    if (freeCodeInput !== "free") {
      alert("Kod xato!");
      return;
    }
    if (user.free_used) {
      alert("Siz bepul limitdan foydalanib bo'lgansiz.");
      return;
    }
    try {
      const grantTime = 72 * 60 * 60 * 1000; 
      const updatedData = { access_until: Date.now() + grantTime, free_used: true };
      const res = await fetch(`${API_URL}/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData)
      });
      const updatedUser = await res.json();
      setUser(updatedUser);
      localStorage.setItem("fl_user", JSON.stringify(updatedUser));
      setIsLocked(false);
      playSound("success");
      triggerConfetti();
      alert("Sizga 3 kun (72 soat) bepul vaqt berildi!");
    } catch (e) { alert("Server xatosi."); }
  };

  // --- PWA HANDLERS ---
  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === "accepted") {
          setDeferredPrompt(null);
        }
      });
    } else {
      // Check if iOS
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      if (isIOS) {
        setShowIOSPrompt(true);
      } else {
        alert("Ilovani brauzer menyusi (Uch nuqta -> Ilovani o'rnatish) orqali yuklab olishingiz mumkin.");
      }
    }
  };

  // --- ADMIN PANEL FUNCTIONS ---
  const fetchAllUsers = async () => {
    const res = await fetch(API_URL);
    const data = await res.json();
    setAllUsers(data.filter(u => u.username !== "SYSTEM_CONFIG"));
  };

  const adjustUserTime = async (targetUser, minutes) => {
    const currentExpiry = targetUser.access_until > Date.now() ? targetUser.access_until : Date.now();
    const newTime = currentExpiry + (minutes * 60000);
    setAllUsers(prev => prev.map(u => u.id === targetUser.id ? {...u, access_until: newTime} : u));
    await fetch(`${API_URL}/${targetUser.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ access_until: newTime }) });
  };

  const toggleProStatus = async (targetUser) => {
    const newStatus = !targetUser.is_pro;
    setAllUsers(prev => prev.map(u => u.id === targetUser.id ? {...u, is_pro: newStatus} : u));
    await fetch(`${API_URL}/${targetUser.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_pro: newStatus }) });
  };

  const deleteUser = async (targetUserId) => {
    if (!confirm("Rostdan ham bu foydalanuvchini o'chirib tashlamoqchimisiz?")) return;
    setAllUsers(prev => prev.filter(u => u.id !== targetUserId));
    await fetch(`${API_URL}/${targetUserId}`, { method: "DELETE" });
  };

  const toggleGlobalMoney = async () => {
    const res = await fetch(API_URL);
    const data = await res.json();
    let config = data.find(u => u.username === "SYSTEM_CONFIG");
    const newValue = !globalSettings.money_mode;
    
    if (config) {
      await fetch(`${API_URL}/${config.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ money_mode: newValue }) });
    } else {
      await fetch(API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "SYSTEM_CONFIG", money_mode: newValue }) });
    }
    setGlobalSettings({ money_mode: newValue });
    alert(`Global Money Mode: ${newValue ? "ON" : "OFF"}`);
  };


  // --- EXISTING FUNCTIONALITY (WRAPPED) ---
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = window.XLSX.read(evt.target.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = window.XLSX.utils.sheet_to_json(ws, { header: 1 });
        const newWords = [];
        data.forEach((row) => {
          if (row[0] && row[1]) {
            newWords.push({
              id: Math.random().toString(36).substr(2, 9),
              en: row[0].toString().trim(),
              uz: row[1].toString().trim(),
              learned: false,
              mistakes: 0
            });
          }
        });
        if (newWords.length === 0) throw new Error("Fayl bo'sh");
        const newFileId = Date.now().toString();
        // Initialize with empty completedGroups
        setFiles(prev => ({ ...prev, [newFileId]: { id: newFileId, name: file.name.replace(".xlsx", ""), words: newWords, completedGroups: [] } }));
        setActiveFileId(newFileId);
        setView("dashboard");
      } catch (err) {
        alert("Xato: Excel fayl formati (A: Ingliz, B: O'zbek) bo'lishi kerak.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const createManualFile = () => {
    const name = prompt("Fayl nomini kiriting:", "Yangi Lug'at");
    if (!name) return;
    const id = Date.now().toString();
    // Initialize with empty completedGroups
    setFiles(prev => ({ ...prev, [id]: { id, name, words: [], completedGroups: [] } }));
    setEditingFile(id);
  };

  const deleteFile = (id) => {
    if (confirm("Bu faylni o'chirmoqchimisiz?")) {
      const newFiles = { ...files };
      delete newFiles[id];
      setFiles(newFiles);
      if (activeFileId === id) setActiveFileId(null);
    }
  };

  const addWordManual = () => {
    if (!manualEn || !manualUz) return;
    const newWord = { id: Math.random().toString(36).substr(2, 9), en: manualEn, uz: manualUz, learned: false, mistakes: 0 };
    setFiles({ ...files, [editingFile]: { ...files[editingFile], words: [newWord, ...files[editingFile].words] } });
    setManualEn(""); setManualUz(""); playSound("success");
  };

  const startGroup = (groupIndex) => {
    const activeFile = files[activeFileId];
    if (!activeFile) return;
    const start = groupIndex * GROUP_SIZE;
    const slice = activeFile.words.slice(start, start + GROUP_SIZE);
    if (slice.length === 0) return;
    setActiveGroupIndex(groupIndex);
    setQueue(slice);
    setMistakes([]);
    setStage("intro");
    setIntroState({ index: 0, step: 1 });
    setCurrentCard(slice[0]); 
    setView("smart_learning");
    setTimeout(() => speak(slice[0].en), 500);
  };

  const nextStage = () => {
    const currentQueue = queue;
    if (stage === "intro") {
      let cards = [];
      currentQueue.forEach(w => {
        cards.push({ ...w, type: 'en', uid: w.id + '-en', matched: false });
        cards.push({ ...w, type: 'uz', uid: w.id + '-uz', matched: false });
      });
      setMatchCards(cards.sort(() => Math.random() - 0.5));
      setStage("match");
    } else if (stage === "match") {
      setStage("quiz");
      setupQuizCard(currentQueue[0], currentQueue);
    } else if (stage === "quiz") {
      setStage("audio_typing");
      setCurrentCard(currentQueue[0]);
      setInputVal("");
      setTypingFeedback(null);
      setShowTypingHint(false);
      speak(currentQueue[0].en);
    } else if (stage === "audio_typing") {
      setStage("think");
      const thinkQueue = [...currentQueue, ...currentQueue];
      setQueue(thinkQueue);
      setThinkIndex(0);
      setCurrentCard(thinkQueue[0]);
      setThinkRevealed(false);
      startTimer(7);
    } else if (stage === "think") {
      // Mark group as complete in files state
      setFiles(prev => {
        const file = prev[activeFileId];
        // Ensure completedGroups exists
        const completedGroups = file.completedGroups || [];
        if (!completedGroups.includes(activeGroupIndex)) {
           return {
             ...prev,
             [activeFileId]: {
               ...file,
               completedGroups: [...completedGroups, activeGroupIndex]
             }
           };
        }
        return prev;
      });

      setView("results");
      playSound("levelUp");
      triggerConfetti();
    }
  };

  const handleIntroNext = () => {
    if (introState.step === 1) {
      setIntroState(prev => ({ ...prev, step: 2 }));
    } else {
      const nextIndex = introState.index + 1;
      if (nextIndex < queue.length) {
        setIntroState({ index: nextIndex, step: 1 });
        setCurrentCard(queue[nextIndex]);
        speak(queue[nextIndex].en);
      } else {
        nextStage();
      }
    }
  };

  const handleTypingSubmit = (e) => {
    e.preventDefault();
    if (typingFeedback === "correct") return;
    const cleanInput = inputVal.trim().toLowerCase();
    const cleanTarget = currentCard.en.toLowerCase();
    if (cleanInput === cleanTarget) {
      playSound("success");
      setTypingFeedback("correct");
      setShowTypingHint(false);
      setTimeout(() => {
        const idx = queue.indexOf(currentCard);
        if (idx < queue.length - 1) {
           setCurrentCard(queue[idx + 1]);
           setInputVal("");
           setTypingFeedback(null);
           setShowTypingHint(false);
           speak(queue[idx + 1].en);
        } else {
           nextStage();
        }
      }, 1000);
    } else {
      playSound("error");
      setTypingFeedback("wrong");
      setShowTypingHint(true);
    }
  };

  const handleMatchClick = (card) => {
    if (card.matched) return;
    if (!matchSelected) {
      setMatchSelected(card.uid);
      if (card.type === 'en') speak(card.en);
      return;
    }
    if (matchSelected === card.uid) {
      setMatchSelected(null);
      return;
    }
    const first = matchCards.find(c => c.uid === matchSelected);
    const isMatch = first.id === card.id && first.type !== card.type;
    if (isMatch) {
      playSound("success");
      const updated = matchCards.map(c => (c.uid === card.uid || c.uid === matchSelected) ? { ...c, matched: true } : c);
      setMatchCards(updated);
      setMatchSelected(null);
      if (updated.every(c => c.matched)) setTimeout(nextStage, 500);
    } else {
      playSound("error");
      setMatchSelected(null);
    }
  };

  const setupQuizCard = (word, currentQueue) => {
    setCurrentCard(word);
    setQuizFeedback(null);
    speak(word.en);
    const allWords = files[activeFileId].words;
    const distractors = allWords.filter(w => w.id !== word.id).sort(() => Math.random() - 0.5).slice(0, 3);
    setGameOptions([word, ...distractors].sort(() => Math.random() - 0.5));
  };

  const handleQuizAnswer = (selectedWord) => {
    if (quizFeedback) return;
    const isCorrect = selectedWord.id === currentCard.id;
    setQuizFeedback({ id: selectedWord.id, status: isCorrect ? 'correct' : 'wrong' });
    if (isCorrect) {
      playSound("success");
      setTimeout(() => {
         const idx = queue.indexOf(currentCard);
         if (idx < queue.length - 1) {
            setupQuizCard(queue[idx + 1], queue);
         } else {
            nextStage();
         }
      }, 600);
    } else {
      playSound("error");
      setTimeout(() => setQuizFeedback(null), 1000); 
    }
  };

  const startTimer = (sec) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimer(sec);
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          if (!thinkRevealed) handleThinkReveal();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleThinkReveal = () => {
    setThinkRevealed(true);
    if (timerRef.current) clearInterval(timerRef.current);
    playSound("reveal");
    speak(currentCard.en);
  };

  const handleThinkVote = (correct) => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    let nextQueue = [...queue]; 
    if (!correct) {
      playSound("error");
      nextQueue.push(currentCard); 
      setMistakes(prev => [...prev, currentCard.id]);
    } else {
      playSound("success");
    }

    const nextIdx = thinkIndex + 1;

    if (nextIdx < nextQueue.length) {
      setQueue(nextQueue);
      setThinkIndex(nextIdx);
      setCurrentCard(nextQueue[nextIdx]);
      setThinkRevealed(false);
      startTimer(7);
    } else {
      nextStage();
    }
  };

  const startArcade = (mode) => {
    const allWords = files[activeFileId]?.words || [];
    if (allWords.length < 5) { alert("O'yin uchun kamida 5 ta so'z kerak!"); return; }
    setGameMode(mode);
    setStreak(0);
    setScore(0);
    setGameState("playing");
    setView("game_arcade");
    let gameQ = mode === "boss" ? allWords.sort(() => Math.random() - 0.5).slice(0, 20) : allWords.sort(() => Math.random() - 0.5);
    setQueue(gameQ);
    setupArcadeRound(gameQ[0], mode);
  };

  const setupArcadeRound = (word, mode) => {
    setCurrentCard(word);
    setInputVal("");
    setTimer(mode === "timeAttack" ? 30 : mode === "wordHunt" ? 5 : 0);
    if (mode === "timeAttack") {
       if (!timerRef.current) startTimer(30);
       const opts = files[activeFileId].words.filter(w => w.id !== word.id).sort(() => Math.random() - 0.5).slice(0, 3);
       setGameOptions([word, ...opts].sort(() => Math.random() - 0.5));
       speak(word.en);
    } else if (mode === "wordHunt") {
      startTimer(5);
      const opts = files[activeFileId].words.filter(w => w.id !== word.id).sort(() => Math.random() - 0.5).slice(0, 4);
      setGameOptions([word, ...opts].sort(() => Math.random() - 0.5));
      speak(word.en);
    } else if (mode === "boss") {
    } else if (mode === "confusion") {
      const firstLetter = word.en[0].toLowerCase();
      let confusing = files[activeFileId].words.filter(w => w.id !== word.id && w.en.toLowerCase().startsWith(firstLetter));
      if (confusing.length < 3) confusing = files[activeFileId].words.filter(w => w.id !== word.id).slice(0,3);
      setGameOptions([word, ...confusing.slice(0,3)].sort(() => Math.random() - 0.5));
      speak(word.en);
    }
  };

  const handleArcadeAnswer = (correct) => {
    const isBoss = gameMode === "boss";
    if (correct) {
      if (isBoss) speak(currentCard.en); else speak(currentCard.en);
      playSound("success");
      setStreak(s => s + 1);
      setScore(s => s + 10 + (streak * 2));
      const nextIdx = queue.indexOf(currentCard) + 1;
      if (nextIdx < queue.length) {
        setTimeout(() => setupArcadeRound(queue[nextIdx], gameMode), 400);
      } else {
        setGameState("success");
        triggerConfetti();
      }
    } else {
      if (isBoss) { playSound("bossHit"); setGameState("fail"); return; }
      speak(currentCard.en);
      playSound("error");
      setStreak(0);
      const nextIdx = queue.indexOf(currentCard) + 1;
      if (nextIdx < queue.length) {
        setTimeout(() => setupArcadeRound(queue[nextIdx], gameMode), 600);
      } else {
        setGameState("success");
      }
    }
  };

  const checkTyping = (e) => {
    e.preventDefault();
    const cleanIn = inputVal.trim().toLowerCase();
    const cleanTarget = currentCard.en.toLowerCase();
    handleArcadeAnswer(cleanIn === cleanTarget);
  };

  // --- RENDERERS ---
  const renderManager = () => (
    <div className="flex-1 flex flex-col p-6 max-w-lg mx-auto w-full animate-fade-in space-y-6">
      <div className="text-center mb-4 relative group">
        <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500 mb-2">UMAROV.A</h1>
        <p className="text-slate-400 text-sm">Fayl Menejeri (Offline Mode)</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <label className="bg-slate-800 p-4 rounded-2xl border-2 border-dashed border-slate-600 hover:border-blue-500 hover:bg-slate-800/50 flex flex-col items-center justify-center cursor-pointer transition">
          <Upload className="text-blue-400 mb-2" />
          <span className="text-xs font-bold">XLS Yuklash</span>
          <input type="file" accept=".xlsx" className="hidden" onChange={handleFileUpload} />
        </label>
        <button onClick={createManualFile} className="bg-slate-800 p-4 rounded-2xl border-2 border-dashed border-slate-600 hover:border-emerald-500 hover:bg-slate-800/50 flex flex-col items-center justify-center transition">
          <Plus className="text-emerald-400 mb-2" />
          <span className="text-xs font-bold">Yangi Fayl</span>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-3 min-h-[300px]">
        {Object.values(files).map(f => (
          <div key={f.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex justify-between items-center group hover:border-indigo-500 transition">
            <div onClick={() => { setActiveFileId(f.id); setView("dashboard"); }} className="flex-1 cursor-pointer">
              <h3 className="font-bold text-lg">{f.name}</h3>
              <p className="text-xs text-slate-500">{f.words.length} ta so'z</p>
            </div>
            <div className="flex gap-2">
               <button onClick={() => setEditingFile(f.id)} className="p-2 text-slate-500 hover:text-yellow-400"><Edit2 size={18} /></button>
               <button onClick={() => deleteFile(f.id)} className="p-2 text-slate-500 hover:text-red-500"><Trash2 size={18} /></button>
            </div>
          </div>
        ))}
      </div>
      {editingFile && (
        <div className="fixed inset-0 bg-slate-950/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 w-full max-w-md rounded-3xl border border-slate-700 p-6 shadow-2xl">
            <div className="flex justify-between mb-4">
               <h3 className="font-bold text-xl">Tahrirlash</h3>
               <button onClick={() => setEditingFile(null)}><X /></button>
            </div>
            <div className="space-y-3 mb-6">
              <input value={manualEn} onChange={e => setManualEn(e.target.value)} placeholder="English Word" className="w-full bg-slate-800 p-3 rounded-lg border border-slate-700 outline-none focus:border-indigo-500" />
              <input value={manualUz} onChange={e => setManualUz(e.target.value)} placeholder="O'zbekcha Tarjima" className="w-full bg-slate-800 p-3 rounded-lg border border-slate-700 outline-none focus:border-indigo-500" />
              <button onClick={addWordManual} className="w-full bg-indigo-600 py-3 rounded-lg font-bold hover:bg-indigo-500">Qo'shish</button>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2">
               {files[editingFile].words.map(w => (
                 <div key={w.id} className="flex justify-between text-sm bg-slate-800 p-2 rounded">
                   <span>{w.en} - {w.uz}</span>
                   <button onClick={() => { const updated = files[editingFile].words.filter(x => x.id !== w.id); setFiles({...files, [editingFile]: {...files[editingFile], words: updated}}); }} className="text-red-400"><X size={14}/></button>
                 </div>
               ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderDashboard = () => (
    <div className="flex-1 flex flex-col p-4 w-full max-w-lg mx-auto animate-fade-in h-full overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        <button onClick={() => setView("manager")} className="p-2 bg-slate-800 rounded-lg"><List size={20}/></button>
        <h2 className="text-lg font-bold truncate max-w-[150px]">{files[activeFileId].name}</h2>
        <button onClick={() => setView("translator")} className="p-2 bg-slate-800 rounded-lg"><Globe size={20}/></button>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pb-20">
        <section>
          <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-3">Smart Learning</h3>
          <div className="grid grid-cols-2 gap-3">
            {Array.from({length: Math.ceil(files[activeFileId].words.length / GROUP_SIZE)}).map((_, i) => {
              // Group Locking Logic
              const activeFile = files[activeFileId];
              const completed = activeFile.completedGroups || [];
              const isLocked = i > 0 && !completed.includes(i - 1);
              const isCompleted = completed.includes(i);

              return (
                <button 
                  key={i} 
                  onClick={() => !isLocked && startGroup(i)} 
                  disabled={isLocked}
                  className={`p-4 rounded-xl border text-left transition relative overflow-hidden group 
                    ${isLocked ? 'bg-slate-900 border-slate-800 opacity-60 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-700 border-slate-700'}
                  `}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xl text-white block">Guruh {i + 1}</span>
                    {isLocked ? <Lock size={16} className="text-slate-500" /> : isCompleted ? <CheckCircle size={18} className="text-emerald-500" /> : null}
                  </div>
                  <span className="text-xs text-slate-500">{i*GROUP_SIZE+1} - {Math.min((i+1)*GROUP_SIZE, files[activeFileId].words.length)}</span>
                </button>
              );
            })}
          </div>
        </section>
        <section>
          <h3 className="text-amber-500 text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2"><Star size={14} className="fill-amber-500" /> Premium Arcade</h3>
          <div className="space-y-3">
             <button onClick={() => startArcade("timeAttack")} className="w-full bg-gradient-to-r from-blue-900 to-slate-900 p-4 rounded-xl border border-blue-800 flex items-center gap-4 hover:scale-[1.02] transition">
               <div className="p-3 bg-blue-500/20 rounded-lg text-blue-400"><Clock /></div>
               <div><div className="font-bold">Time Attack</div><div className="text-xs text-slate-400">30 soniya</div></div>
             </button>
             <button onClick={() => startArcade("wordHunt")} className="w-full bg-gradient-to-r from-emerald-900 to-slate-900 p-4 rounded-xl border border-emerald-800 flex items-center gap-4 hover:scale-[1.02] transition">
               <div className="p-3 bg-emerald-500/20 rounded-lg text-emerald-400"><Search /></div>
               <div><div className="font-bold">Word Hunt</div><div className="text-xs text-slate-400">Tarjimani toping</div></div>
             </button>
             <button onClick={() => startArcade("boss")} className="w-full bg-gradient-to-r from-red-950 to-black p-6 rounded-xl border border-red-800 flex items-center justify-between hover:border-red-500 transition group relative overflow-hidden">
               <div className="relative z-10 flex items-center gap-4">
                 <div className="p-3 bg-red-600 rounded-lg text-white animate-pulse"><ShieldAlert /></div>
                 <div><div className="font-black text-xl text-red-500 tracking-widest uppercase group-hover:text-white transition">BOSS MODE</div><div className="text-xs text-red-800/80 font-bold">1 MISTAKE = FAIL</div></div>
               </div>
             </button>
          </div>
        </section>
      </div>
    </div>
  );

  const renderSmartLearning = () => (
    <div className="flex-1 flex flex-col h-full w-full max-w-lg mx-auto relative overflow-hidden">
      <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-950 z-10">
         <span className="font-bold text-slate-400 uppercase tracking-widest text-xs">Stage: {stage}</span>
         <button onClick={() => setView("dashboard")} className="text-slate-500 hover:text-white"><X size={20}/></button>
      </div>
      <div className="flex-1 relative w-full h-full overflow-hidden">
         {stage === "intro" && (
           <div className="absolute inset-0 flex flex-col items-center justify-center p-6 animate-fade-in bg-slate-950 text-center">
             <div className="w-full max-w-sm flex-1 flex flex-col justify-center">
                {introState.step === 1 ? (
                  <div className="space-y-6 animate-fade-in">
                    <div className="text-sm font-bold text-slate-500 uppercase tracking-widest">New Word</div>
                    <h2 className="text-5xl font-black text-white">{currentCard?.en}</h2>
                    <button onClick={() => speak(currentCard?.en)} className="p-4 bg-indigo-500/20 rounded-full text-indigo-400 hover:bg-indigo-500 hover:text-white transition mx-auto block"><Volume2 size={32} /></button>
                  </div>
                ) : (
                  <div className="space-y-6 animate-fade-in">
                     <div className="text-sm font-bold text-slate-500 uppercase tracking-widest">Translation</div>
                     <h2 className="text-4xl font-black text-white">{currentCard?.uz}</h2>
                     <p className="text-xl text-indigo-400 font-bold">{currentCard?.en}</p>
                     <div className="w-24 h-24 bg-slate-800 rounded-2xl mx-auto flex items-center justify-center border border-slate-700"><Brain size={40} className="text-slate-600" /></div>
                  </div>
                )}
             </div>
             <div className="flex gap-2 mb-8">
               {queue.map((_, idx) => (
                 <div key={idx} className={`w-2 h-2 rounded-full ${idx === introState.index ? 'bg-indigo-500' : 'bg-slate-800'}`}></div>
               ))}
             </div>
             <button onClick={handleIntroNext} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-900/50 flex items-center justify-center gap-2">
               {introState.step === 1 ? "Tarjima" : "Keyingisi"} <ArrowRight size={18} />
             </button>
           </div>
         )}
         {stage === "match" && (
           <div className="absolute inset-0 flex flex-wrap content-center justify-center p-2 gap-2 animate-fade-in bg-slate-950">
              {matchCards.map(card => (
                <button key={card.uid} onClick={() => handleMatchClick(card)} disabled={card.matched} className={`w-[48%] h-[18%] rounded-xl border-2 flex items-center justify-center p-2 text-center transition-all duration-300 ${card.matched ? "opacity-0 scale-90" : "opacity-100 scale-100"} ${matchSelected === card.uid ? "bg-indigo-600 border-indigo-400 text-white" : "bg-slate-900 border-slate-800 hover:border-slate-600"}`}>
                  <span className="font-bold text-sm sm:text-base leading-tight">{card.type === 'en' ? card.en : card.uz}</span>
                </button>
              ))}
           </div>
         )}
         {stage === "quiz" && (
           <div className="absolute inset-0 flex flex-col p-6 animate-fade-in bg-slate-950">
              <div className="flex-1 flex items-center justify-center"><div className="text-center"><span className="text-xs text-indigo-400 font-bold uppercase mb-2 block">Translate</span><h2 className="text-4xl font-black text-white mb-4">{currentCard?.en}</h2></div></div>
              <div className="flex flex-col gap-3 pb-8">
                 {gameOptions.map((opt, i) => {
                   let statusClass = "bg-slate-900 border-slate-800 hover:border-slate-600";
                   if (quizFeedback?.id === opt.id) statusClass = quizFeedback.status === 'correct' ? "bg-emerald-600 border-emerald-500 text-white" : "bg-red-900/80 border-red-700 text-white";
                   return (<button key={i} onClick={() => handleQuizAnswer(opt)} className={`border-2 p-4 rounded-xl font-bold text-lg transition-all duration-200 text-left active:scale-[0.98] ${statusClass}`}>{opt.uz}</button>);
                 })}
              </div>
           </div>
         )}
         {stage === "audio_typing" && (
           <div className="absolute inset-0 flex flex-col items-center justify-center p-6 animate-fade-in bg-slate-950">
             <div className="w-full max-w-sm space-y-8 text-center">
                <div onClick={() => speak(currentCard?.en)} className="w-24 h-24 bg-indigo-600 rounded-full mx-auto flex items-center justify-center shadow-lg shadow-indigo-900/50 cursor-pointer hover:scale-105 transition"><Headphones size={40} className="text-white" /></div>
                <div><h2 className="text-xl font-bold text-slate-300">Listen & Type</h2><p className="text-sm text-slate-500">So'zni eshiting va yozing</p></div>
                <form onSubmit={handleTypingSubmit} className="relative">
                   <input autoFocus value={inputVal} onChange={e => { setInputVal(e.target.value); if(typingFeedback === 'wrong') setTypingFeedback(null); }} className={`w-full bg-slate-900 border-b-4 text-center text-3xl font-black py-4 outline-none transition-colors ${typingFeedback === 'correct' ? 'border-emerald-500 text-emerald-500' : typingFeedback === 'wrong' ? 'border-red-500 text-red-500' : 'border-slate-700 text-white focus:border-indigo-500'}`} placeholder="..." />
                   <button type="submit" className="absolute right-0 top-4 text-slate-500 hover:text-white"><ArrowRight size={24} /></button>
                </form>
                {showTypingHint && (<div className="bg-red-950/30 border border-red-900/50 p-4 rounded-xl animate-fade-in-up"><p className="text-red-400 text-xs uppercase font-bold mb-1">To'g'ri javob:</p><p className="text-xl font-mono text-white tracking-widest">{currentCard?.en}</p><p className="text-xs text-slate-500 mt-2">Qaytadan to'g'ri yozing!</p></div>)}
             </div>
           </div>
         )}
         {stage === "think" && (
           <div className="absolute inset-0 flex flex-col items-center justify-center p-6 animate-fade-in bg-slate-950">
             <div className="absolute top-0 left-0 right-0 h-1 bg-slate-900"><div className="h-full bg-indigo-500 transition-all duration-1000 ease-linear" style={{width: `${(timer/7)*100}%`}}></div></div>
             <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl min-h-[300px] flex flex-col justify-center items-center">
                <h2 className="text-3xl font-bold mb-2 text-white">{currentCard?.uz}</h2>
                <p className="text-slate-500 text-sm mb-6">Inglizcha tarjimasini eslang...</p>
                {!thinkRevealed ? (
                  <button onClick={handleThinkReveal} className="w-full py-3 bg-slate-800 border border-slate-700 rounded-xl font-bold hover:bg-slate-700 transition text-indigo-400">KO'RSATISH</button>
                ) : (
                  <div className="w-full animate-fade-in-up">
                    <h3 className="text-2xl font-black text-indigo-400 mb-8">{currentCard?.en}</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <button onClick={() => handleThinkVote(false)} className="py-3 bg-red-950 border border-red-900 text-red-500 rounded-xl font-bold hover:bg-red-900 transition">XATO</button>
                      <button onClick={() => handleThinkVote(true)} className="py-3 bg-emerald-950 border border-emerald-900 text-emerald-500 rounded-xl font-bold hover:bg-emerald-900 transition">TO'G'RI</button>
                    </div>
                  </div>
                )}
             </div>
           </div>
         )}
      </div>
    </div>
  );

  const renderGameArcade = () => {
    const isBoss = gameMode === "boss";
    if (gameState === "success") return (
       <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-fade-in bg-slate-950">
          <Trophy size={64} className="text-yellow-400 mb-4" />
          <h2 className="text-3xl font-black mb-2">G'ALABA!</h2>
          <p className="text-slate-400 mb-8">Score: {score}</p>
          <button onClick={() => setView("dashboard")} className="bg-white text-black px-8 py-3 rounded-full font-bold">Davom etish</button>
       </div>
    );
    if (gameState === "fail") return (
       <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-fade-in bg-red-950/20">
          <ShieldAlert size={64} className="text-red-500 mb-4" />
          <h2 className="text-4xl font-black text-red-500 mb-2">GAME OVER</h2>
          <div className="bg-red-950/50 p-4 rounded-xl border border-red-900 mb-6">
             <div className="text-xs text-red-400 uppercase">To'g'ri javob:</div>
             <div className="text-2xl font-black text-white">{currentCard?.en}</div>
          </div>
          <button onClick={() => setView("dashboard")} className="border border-red-500 text-red-500 px-8 py-3 rounded-full font-bold hover:bg-red-900/50">Qaytish</button>
       </div>
    );
    return (
      <div className={`flex-1 flex flex-col h-full w-full max-w-lg mx-auto relative overflow-hidden ${isBoss ? 'bg-black' : 'bg-slate-950'}`}>
         <div className="flex justify-between items-center p-4 z-10">
            <div className="flex items-center gap-2">
               {isBoss && <Flame className="text-red-500 animate-pulse" />}
               <span className={`font-black ${isBoss ? 'text-red-500' : 'text-slate-400'}`}>{score}</span>
            </div>
            {timer > 0 && <div className="font-mono font-bold text-xl">{timer}s</div>}
            <button onClick={() => setView("dashboard")}><X size={20}/></button>
         </div>
         <div className="flex-1 flex flex-col items-center justify-center p-4">
            <div className={`w-full p-8 rounded-3xl text-center mb-6 border-2 ${isBoss ? 'bg-red-950/30 border-red-800' : 'bg-slate-900 border-slate-800'}`}>
              <h2 className={`text-3xl font-black mb-2 ${isBoss ? 'text-red-500' : 'text-white'}`}>{isBoss ? currentCard?.uz : currentCard?.en}</h2>
            </div>
            {gameMode === "wordHunt" && (
               <div className="grid grid-cols-1 w-full gap-2">
                  {gameOptions.map((opt, i) => (
                    <button key={i} onClick={() => handleArcadeAnswer(opt.id === currentCard.id)} className="bg-slate-900 border border-slate-700 p-4 rounded-xl font-bold hover:bg-indigo-900 hover:border-indigo-500 transition text-white">
                      {opt.uz}
                    </button>
                  ))}
               </div>
            )}
            {(gameMode === "timeAttack" || gameMode === "confusion") && (
               <div className="grid grid-cols-2 w-full gap-3">
                  {gameOptions.map((opt, i) => (
                    <button key={i} onClick={() => handleArcadeAnswer(opt.id === currentCard.id)} className="bg-slate-900 border border-slate-700 p-4 rounded-xl font-bold h-24 flex items-center justify-center hover:bg-indigo-900 hover:border-indigo-500 transition text-sm sm:text-base leading-tight text-white">
                      {opt.uz}
                    </button>
                  ))}
               </div>
            )}
            {isBoss && (
              <form onSubmit={checkTyping} className="w-full relative">
                <input autoFocus value={inputVal} onChange={e => setInputVal(e.target.value)} className="w-full bg-transparent border-b-4 border-red-800 text-center text-2xl font-black text-red-500 focus:border-red-500 outline-none p-4 placeholder-red-900/50" placeholder="TYPE IN ENGLISH..." />
                <button type="submit" className="absolute right-0 top-4 text-red-500"><ArrowRight /></button>
              </form>
            )}
         </div>
      </div>
    );
  };

  const renderTranslator = () => {
    // const [search, setSearch] = useState(""); // REMOVED HOOK
    const activeFile = files[activeFileId];
    const results = activeFile ? activeFile.words.filter(w => w.en.toLowerCase().includes(translatorSearch.toLowerCase()) || w.uz.toLowerCase().includes(translatorSearch.toLowerCase())) : [];
    return (
       <div className="flex-1 flex flex-col p-4 w-full max-w-lg mx-auto animate-fade-in bg-slate-950">
          <div className="flex items-center gap-2 mb-6"><button onClick={() => setView("dashboard")}><ArrowRight className="rotate-180" /></button><h2 className="font-bold text-xl">Tarjimon</h2></div>
          <div className="relative mb-6">
            <Search className="absolute left-4 top-4 text-slate-500" />
            <input autoFocus value={translatorSearch} onChange={e => setTranslatorSearch(e.target.value)} placeholder="Qidirish..." className="w-full bg-slate-900 p-4 pl-12 rounded-2xl border border-slate-800 focus:border-indigo-500 outline-none text-white" />
          </div>
          <div className="flex-1 overflow-y-auto space-y-2">
            {results.map(w => (
              <div key={w.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex justify-between items-center" onClick={() => speak(w.en)}>
                <div><div className="font-bold text-indigo-400">{w.en}</div><div className="text-slate-300">{w.uz}</div></div><Volume2 size={16} className="text-slate-600" />
              </div>
            ))}
          </div>
       </div>
    );
  };

  const renderResults = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-fade-in space-y-6 bg-slate-950">
       <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4"><CheckCircle size={48} className="text-emerald-500" /></div>
       <h1 className="text-3xl font-bold text-white">Guruh Yakunlandi!</h1>
       <div className="w-full max-w-xs space-y-3">
          <button onClick={() => { const nextGroup = activeGroupIndex + 1; const maxGroups = Math.ceil(files[activeFileId].words.length / GROUP_SIZE); if (nextGroup < maxGroups) startGroup(nextGroup); else setView("dashboard"); }} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold text-white shadow-lg shadow-indigo-900/50">Keyingi Guruh</button>
          <button onClick={() => setView("dashboard")} className="w-full py-4 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-slate-300">Menyuga Qaytish</button>
       </div>
    </div>
  );

  // --- OVERLAY RENDERERS ---

  if (isGateOpen) {
    return (
      <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-indigo-500 tracking-tighter">UMAROV.A</h1>
            <p className="text-slate-400">
              {authMode === 'register' ? "Ro'yxatdan o'tish" : "Kirish"}
            </p>
          </div>
          
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-2xl space-y-4">
            {authMode === 'register' ? (
              <>
                <input 
                  value={regUsername} 
                  onChange={e => { setRegUsername(e.target.value); setRegError(""); }} 
                  placeholder="Username (5-12)" 
                  className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-center font-bold text-lg outline-none focus:border-indigo-500 transition" 
                  maxLength={12}
                />
                <input 
                  type="password"
                  value={regPassword} 
                  onChange={e => { setRegPassword(e.target.value); setRegError(""); }} 
                  placeholder="Password" 
                  className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-center font-bold text-lg outline-none focus:border-indigo-500 transition" 
                />
                {regError && <div className="text-red-500 text-sm">{regError}</div>}
                <button onClick={handleRegister} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg">Boshlash</button>
                <div className="text-xs text-slate-500 pt-2 cursor-pointer hover:text-white" onClick={() => setAuthMode('login')}>Avval kirganmisiz? Kirish</div>
              </>
            ) : (
              <>
                <input 
                  value={loginUsername} 
                  onChange={e => { setLoginUsername(e.target.value); setRegError(""); }} 
                  placeholder="Username" 
                  className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-center font-bold text-lg outline-none focus:border-indigo-500 transition" 
                />
                <input 
                  type="password"
                  value={loginPassword} 
                  onChange={e => { setLoginPassword(e.target.value); setRegError(""); }} 
                  placeholder="Password" 
                  className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-center font-bold text-lg outline-none focus:border-indigo-500 transition" 
                />
                {regError && <div className="text-red-500 text-sm">{regError}</div>}
                <button onClick={handleLogin} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg">Kirish</button>
                <div className="text-xs text-slate-500 pt-2 cursor-pointer hover:text-white" onClick={() => setAuthMode('register')}>Yangi foydalanuvchimisiz? Ro'yxatdan o'tish</div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        <div className="w-full max-w-sm space-y-6">
          <div className="w-24 h-24 bg-red-950/30 rounded-full flex items-center justify-center mx-auto border border-red-900">
            <Lock size={48} className="text-red-500" />
          </div>
          <h2 className="text-3xl font-black text-white">Limit Tugadi</h2>
          <p className="text-slate-400">Sizning akkauntingizda limit yo'q.</p>
          
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
            <h3 className="text-sm font-bold text-white mb-2 uppercase tracking-wide">Bepul Limit</h3>
            <div className="flex gap-2">
              <input 
                value={freeCodeInput}
                onChange={e => setFreeCodeInput(e.target.value)}
                placeholder="Kodni kiriting..."
                className="flex-1 bg-slate-950 border border-slate-800 p-3 rounded-xl text-center font-mono outline-none focus:border-indigo-500"
              />
              <button onClick={handleFreeUnlock} className="bg-slate-800 text-white px-4 rounded-xl font-bold hover:bg-slate-700">OK</button>
            </div>
            <p className="text-[10px] text-slate-500 mt-2">Agar kodni bilsangiz kiriting.</p>
          </div>

          <div className="space-y-3">
            <a href="https://t.me/umarov_py" target="_blank" rel="noreferrer" className="block w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2">
               Premium Olish <ArrowRight size={18}/>
            </a>
            <button onClick={logout} className="text-slate-500 text-sm hover:text-white flex items-center justify-center gap-2 w-full">
              <LogOut size={14} /> Chiqish
            </button>
          </div>
        </div>
      </div>
    );
  }

  const filteredUsers = allUsers.filter(u => 
    u.username.toLowerCase().includes(adminSearch.toLowerCase()) || 
    u.mac_address.toLowerCase().includes(adminSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-slate-950 text-slate-100 font-sans overflow-hidden flex flex-col">
      <style>{`
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { bg: transparent; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
        .confetti { position: fixed; width: 8px; height: 8px; z-index: 100; animation: fall linear forwards; top: -10px; }
        @keyframes fall { to { transform: translateY(110vh) rotate(720deg); } }
      `}</style>
      
      {/* Top System Bar */}
      <div className="h-8 bg-slate-900 border-b border-slate-800 flex justify-between items-center px-4 text-[10px] font-mono select-none">
         <span 
           onClick={() => setProfileOpen(true)}
           className="text-slate-500 flex items-center gap-2 cursor-pointer hover:text-white transition"
         >
           ID: {user?.mac_address} 
           {user?.is_pro && <span className="bg-amber-500 text-black px-1 rounded text-[8px] font-bold">PRO</span>}
         </span>
         <div className="flex gap-4">
           {/* PWA INSTALL BUTTON */}
           <button onClick={handleInstallClick} className="text-emerald-500 hover:text-emerald-400 flex items-center gap-1 transition">
             <Download size={12} /> <span className="hidden sm:inline">Yuklab Olish</span>
           </button>
           <button onClick={() => setShowAdminLogin(true)} className="text-slate-700 hover:text-slate-500">Admin</button>
         </div>
      </div>

      <main className="flex-1 w-full h-full flex flex-col relative overflow-hidden">
        {view === "manager" && renderManager()}
        {view === "dashboard" && renderDashboard()}
        {view === "translator" && renderTranslator()}
        {view === "smart_learning" && renderSmartLearning()}
        {view === "game_arcade" && renderGameArcade()}
        {view === "results" && renderResults()}
      </main>

      {/* iOS Install Instructions Modal */}
      {showIOSPrompt && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-6 animate-fade-in backdrop-blur-sm" onClick={() => setShowIOSPrompt(false)}>
           <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl w-full max-w-sm relative shadow-2xl text-center space-y-4" onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowIOSPrompt(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={20}/></button>
              <div className="w-16 h-16 bg-slate-800 rounded-2xl mx-auto flex items-center justify-center"><Download className="text-indigo-500" size={32}/></div>
              <h3 className="text-xl font-bold text-white">Ilovani O'rnatish</h3>
              <p className="text-sm text-slate-400">iOS qurilmasiga o'rnatish uchun:</p>
              <ol className="text-left text-sm text-slate-300 space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <li className="flex items-center gap-2"><Share size={16} className="text-blue-500"/> 1. "Ulashish" tugmasini bosing.</li>
                <li className="flex items-center gap-2"><Plus size={16} className="text-emerald-500"/> 2. "Ekranga qo'shish" ni tanlang.</li>
              </ol>
           </div>
        </div>
      )}

      {/* User Profile Modal */}
      {profileOpen && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-6 animate-fade-in backdrop-blur-sm">
           <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl w-full max-w-sm relative shadow-2xl">
              <button onClick={() => setProfileOpen(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={20}/></button>
              
              <div className="flex flex-col items-center text-center space-y-6">
                 <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <User size={48} className="text-white" />
                 </div>
                 
                 <div>
                    <h2 className="text-2xl font-black text-white">{user?.username}</h2>
                    <p className="text-xs text-slate-500 font-mono mt-1">{user?.mac_address}</p>
                 </div>

                 <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 w-full flex items-center justify-between">
                    <span className="text-xs text-slate-400 uppercase font-bold">Status</span>
                    {user?.is_pro ? (
                      <span className="text-amber-500 font-black tracking-widest flex items-center gap-1"><Crown size={14}/> UNLIMITED</span>
                    ) : (
                      <span className="text-emerald-400 font-mono font-bold">{formatTimeLeft(user?.access_until - Date.now())}</span>
                    )}
                 </div>

                 <div className="pt-4 w-full border-t border-slate-800">
                    <div className="flex flex-col items-center gap-1 opacity-50">
                       <BadgeCheck size={16} className="text-blue-500" />
                       <span className="text-[10px] text-slate-400 uppercase tracking-widest">Admin: Umarov Abdulloh</span>
                       <span className="text-[8px] text-slate-600">OFFICIAL PRODUCT</span>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Admin Login Modal */}
      {showAdminLogin && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl w-full max-w-xs space-y-4 shadow-2xl">
            <h3 className="text-center font-bold text-white">Admin Login</h3>
            <input value={adminUser} onChange={e => setAdminUser(e.target.value)} placeholder="Username" className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-white" />
            <input type="password" value={adminPass} onChange={e => setAdminPass(e.target.value)} placeholder="Password" className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-white" />
            <div className="flex gap-2">
              <button onClick={() => setShowAdminLogin(false)} className="flex-1 p-3 bg-slate-800 rounded-lg text-slate-400">Cancel</button>
              <button onClick={attemptAdminLogin} className="flex-1 p-3 bg-indigo-600 rounded-lg text-white font-bold">Login</button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Panel V2 */}
      {adminPanelOpen && (
        <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col animate-fade-in">
           <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
             <h2 className="font-bold text-indigo-400 flex items-center gap-2"><Shield size={18} /> Admin Panel</h2>
             <button onClick={() => setAdminPanelOpen(false)} className="p-2 bg-slate-800 rounded-lg text-slate-400"><X size={18} /></button>
           </div>
           <div className="p-4 bg-slate-900 border-b border-slate-800">
              <div className="relative">
                 <Search className="absolute left-3 top-3 text-slate-500" size={18} />
                 <input 
                   value={adminSearch}
                   onChange={e => setAdminSearch(e.target.value)}
                   placeholder="Search MAC or Username..."
                   className="w-full bg-slate-950 border border-slate-800 pl-10 p-3 rounded-xl text-white outline-none focus:border-indigo-500"
                 />
              </div>
           </div>
           <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                  <h3 className="text-xs text-slate-500 uppercase font-bold mb-2">Global Config</h3>
                  <button onClick={toggleGlobalMoney} className={`w-full py-3 rounded-lg font-bold border ${globalSettings.money_mode ? 'bg-indigo-900/20 border-indigo-500 text-indigo-400' : 'bg-slate-800 border-slate-600 text-slate-400'}`}>
                    Money Mode: {globalSettings.money_mode ? "ON" : "OFF"}
                  </button>
                  <p className="text-[10px] text-slate-500 mt-2">ON: Limits apply. OFF: Free for all.</p>
                </div>
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                   <h3 className="text-xs text-slate-500 uppercase font-bold mb-2">Actions</h3>
                   <button onClick={fetchAllUsers} className="w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-white border border-slate-700 flex items-center justify-center gap-2"><RefreshCw size={14}/> Refresh Users</button>
                </div>
              </div>

              <h3 className="font-bold text-white mb-4">User List ({filteredUsers.length})</h3>
              <div className="space-y-3">
                 {filteredUsers.map(u => (
                   <div key={u.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col gap-3 relative overflow-hidden group">
                      <div className="flex justify-between items-start relative z-10">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${u.is_pro ? 'bg-amber-500/20 text-amber-500' : 'bg-slate-800 text-slate-400'}`}>
                             {u.is_pro ? <Crown size={24} /> : <User size={24} />}
                          </div>
                          <div>
                            <div className="font-bold text-white text-lg flex items-center gap-2">
                              {u.username} 
                              {u.role === 'admin' && <span className="text-[10px] bg-purple-900 text-purple-300 px-1 rounded">ADMIN</span>}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">{u.mac_address}</div>
                          </div>
                        </div>
                        
                        {/* TIME LEFT DISPLAY (TOP RIGHT) */}
                        <div className="text-right">
                           {u.is_pro ? (
                             <span className="text-amber-500 font-black text-sm tracking-widest">UNLIMITED</span>
                           ) : (
                             <div className="flex flex-col items-end">
                                <span className="text-[10px] text-slate-500 uppercase">Qolgan Vaqt</span>
                                <span className={`font-mono font-bold ${u.access_until > Date.now() ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {formatTimeLeft(u.access_until - Date.now())}
                                </span>
                             </div>
                           )}
                        </div>
                      </div>

                      {/* CONTROLS */}
                      <div className="grid grid-cols-2 gap-2 mt-2 bg-slate-950/50 p-2 rounded-lg">
                         <div className="flex items-center gap-2">
                            <button onClick={() => adjustUserTime(u, -60)} className="p-2 bg-red-900/20 text-red-400 rounded hover:bg-red-900/40"><Minus size={14}/><span className="text-[10px]">1h</span></button>
                            <button onClick={() => adjustUserTime(u, 60)} className="p-2 bg-emerald-900/20 text-emerald-400 rounded hover:bg-emerald-900/40"><Plus size={14}/><span className="text-[10px]">1h</span></button>
                            <input 
                              placeholder="Min" 
                              className="w-12 bg-slate-900 border border-slate-700 rounded p-1 text-center text-xs outline-none"
                              type="number"
                              onChange={(e) => {
                                 if(e.target.value.length > 3) return; // Limit length
                              }}
                              onKeyDown={(e) => {
                                if(e.key === 'Enter') {
                                  adjustUserTime(u, Number(e.target.value));
                                  e.target.value = '';
                                }
                              }}
                            />
                         </div>
                         <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => toggleProStatus(u)} 
                              className={`px-3 py-1 rounded text-xs font-bold border transition ${u.is_pro ? 'bg-amber-500/20 border-amber-500 text-amber-500' : 'bg-slate-800 border-slate-600 text-slate-400'}`}
                            >
                              {u.is_pro ? "PRO ACTIVE" : "SET PRO"}
                            </button>
                            <button onClick={() => deleteUser(u.id)} className="p-2 bg-red-600 text-white rounded hover:bg-red-500"><Trash2 size={14}/></button>
                         </div>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;