import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, Volume2, RotateCw, CheckCircle, AlertCircle, Moon, Sun, Play, Type, Clock, Grid, Trophy, ArrowRight, Layout, Keyboard, Brain, RefreshCw, X, Zap, ShieldAlert, Star, Headphones, Search, Crosshair, Calendar, Flame, Target } from 'lucide-react';

/**
 * Flashcards: Learn English – Uzbek (Ultimate Edition)
 * * MODES:
 * 1. Smart Mode (Default): Structured learning (Groups of 10)
 * 2. Premium Arcade: Gamified modes (Time Attack, Boss Battle, etc.)
 * * FIXES:
 * - Boss Battle Button Layout Fixed (Always visible, premium design)
 * - Word Hunt Layout fixed (No scroll, adaptive grid)
 * - Intro Stage Redesigned (Two large cards, premium look)
 * - Global layout optimized for 100vh without overflow
 */

// --- Audio Helper ---
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

    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(500, now);
      osc.frequency.exponentialRampToValueAtTime(1000, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'error') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.linearRampToValueAtTime(100, now + 0.2);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'click') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === 'levelUp') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.2);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    }
  } catch (e) { console.error(e); }
};

// --- Confetti ---
const triggerConfetti = () => {
  const colors = ['#f59e0b', '#ec4899', '#8b5cf6', '#10b981', '#3b82f6'];
  for (let i = 0; i < 80; i++) {
    const el = document.createElement('div');
    el.classList.add('confetti');
    el.style.left = Math.random() * 100 + 'vw';
    el.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    el.style.animationDuration = (Math.random() * 2 + 1) + 's';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }
};

const App = () => {
  // --- Data State ---
  const [allWords, setAllWords] = useState([]);
  const [mistakeCounts, setMistakeCounts] = useState({}); // { wordId: count }
  
  // --- UI State ---
  // 'home' | 'smart_dashboard' | 'premium_dashboard' | 'game_smart' | 'game_premium' | 'upload'
  const [view, setView] = useState('upload'); 
  const [darkMode, setDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // --- Smart Mode State ---
  const [smartGroupIndex, setSmartGroupIndex] = useState(0);
  const [smartProgress, setSmartProgress] = useState({});
  const [smartStage, setSmartStage] = useState('intro'); // intro, match, quiz, typing, think, results
  const [activeQueue, setActiveQueue] = useState([]);
  const [currentCard, setCurrentCard] = useState(null);
  
  // Smart Mode Sub-states
  const [introIndex, setIntroIndex] = useState(0);
  const [matchCards, setMatchCards] = useState([]);
  const [matchSelected, setMatchSelected] = useState(null);
  const [quizOptions, setQuizOptions] = useState([]);
  const [typeInput, setTypeInput] = useState('');
  const [timer, setTimer] = useState(0);

  // --- Premium Mode State ---
  const [premiumGame, setPremiumGame] = useState(null); // 'timeAttack', 'wordHunt', 'missingLetter', 'listenType', 'boss', 'daily'
  const [streak, setStreak] = useState(0);
  const [score, setScore] = useState(0);
  const [premiumQueue, setPremiumQueue] = useState([]);
  const [gameActive, setGameActive] = useState(false);
  const [premiumFeedback, setPremiumFeedback] = useState(null); // 'correct', 'wrong'
  
  // Helpers refs
  const timerRef = useRef(null);

  // --- Init ---
  useEffect(() => {
    if (!window.XLSX) {
      const script = document.createElement('script');
      script.src = "https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js";
      script.async = true;
      document.body.appendChild(script);
    }
    const theme = localStorage.getItem('fl_theme');
    if (theme === 'dark') setDarkMode(true);

    // Load Data
    const savedWords = localStorage.getItem('fl_words');
    const savedSmartProg = localStorage.getItem('fl_smart_progress');
    const savedMistakes = localStorage.getItem('fl_mistakes');
    
    if (savedWords) {
      setAllWords(JSON.parse(savedWords));
      setView('home');
    }
    if (savedSmartProg) setSmartProgress(JSON.parse(savedSmartProg));
    if (savedMistakes) setMistakeCounts(JSON.parse(savedMistakes));
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('fl_theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // --- Core Functions ---

  const speak = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      u.rate = 0.9;
      window.speechSynthesis.speak(u);
    }
  };

  const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

  const saveMistake = (wordId) => {
    const newCounts = { ...mistakeCounts, [wordId]: (mistakeCounts[wordId] || 0) + 1 };
    setMistakeCounts(newCounts);
    localStorage.setItem('fl_mistakes', JSON.stringify(newCounts));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = window.XLSX.read(evt.target.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = window.XLSX.utils.sheet_to_json(ws, { header: 1 });
        const words = [];
        data.forEach(row => {
          if (row[0] && row[1]) words.push({ id: Math.random().toString(36).substr(2, 9), en: row[0].toString().trim(), uz: row[1].toString().trim() });
        });
        if (words.length === 0) throw new Error("No data");
        setAllWords(words);
        localStorage.setItem('fl_words', JSON.stringify(words));
        setView('home');
      } catch (err) { alert("Format xatosi! (A: Ingliz, B: O'zbek)"); }
      setIsLoading(false);
    };
    reader.readAsBinaryString(file);
  };

  // --- SMART MODE LOGIC ---

  const startSmartGroup = (index) => {
    const slice = allWords.slice(index * 10, (index + 1) * 10);
    if (!slice.length) return;
    setSmartGroupIndex(index);
    setActiveQueue(slice);
    setSmartStage('intro');
    setIntroIndex(0);
    setView('game_smart');
    speak(slice[0].en);
  };

  const nextSmartStage = () => {
    if (smartStage === 'intro') {
       let cards = [];
       activeQueue.forEach(w => {
         cards.push({ ...w, type: 'en', uid: w.id + '-en' });
         cards.push({ ...w, type: 'uz', uid: w.id + '-uz' });
       });
       setMatchCards(shuffle(cards));
       setSmartStage('match');
    } else if (smartStage === 'match') {
       setSmartStage('quiz');
       setupQuizRound(activeQueue[0], activeQueue);
    } else if (smartStage === 'quiz') {
       setSmartStage('typing');
       setCurrentCard(activeQueue[0]);
       setTypeInput('');
    } else if (smartStage === 'typing') {
       setSmartStage('think');
       setCurrentCard(activeQueue[0]);
       setTimer(7);
       startTimer(7);
    } else if (smartStage === 'think') {
       setSmartStage('results');
       triggerConfetti();
       const newProg = { ...smartProgress, [smartGroupIndex]: true };
       setSmartProgress(newProg);
       localStorage.setItem('fl_smart_progress', JSON.stringify(newProg));
    }
  };

  const setupQuizRound = (word, queue) => {
     setCurrentCard(word);
     const distractors = shuffle(allWords.filter(w => w.id !== word.id)).slice(0, 3);
     setQuizOptions(shuffle([word, ...distractors]));
     speak(word.en);
  };

  const handleIntroNext = () => {
    if (introIndex < activeQueue.length - 1) {
      setIntroIndex(i => i + 1);
      speak(activeQueue[introIndex + 1].en);
    } else {
      nextSmartStage();
    }
  };

  const handleMatch = (card) => {
    if (matchSelected) {
       const first = matchCards.find(c => c.uid === matchSelected);
       if (first.id === card.id && first.type !== card.type) {
          playSound('success');
          const newCards = matchCards.map(c => (c.uid === card.uid || c.uid === matchSelected) ? { ...c, matched: true } : c);
          setMatchCards(newCards);
          setMatchSelected(null);
          if (newCards.every(c => c.matched)) setTimeout(nextSmartStage, 500);
       } else {
          playSound('error');
          saveMistake(card.id);
          setMatchSelected(null);
       }
    } else {
       setMatchSelected(card.uid);
       if(card.type === 'en') speak(card.en);
    }
  };

  const handleSmartQuiz = (opt) => {
     if (opt.id === currentCard.id) {
        playSound('success');
        const nextIdx = activeQueue.indexOf(currentCard) + 1;
        if (nextIdx < activeQueue.length) setupQuizRound(activeQueue[nextIdx], activeQueue);
        else nextSmartStage();
     } else {
        playSound('error');
        saveMistake(currentCard.id);
     }
  };

  const handleSmartTyping = (e) => {
     e.preventDefault();
     if (typeInput.trim().toLowerCase() === currentCard.en.toLowerCase()) {
        playSound('success');
        const nextIdx = activeQueue.indexOf(currentCard) + 1;
        if (nextIdx < activeQueue.length) { setCurrentCard(activeQueue[nextIdx]); setTypeInput(''); }
        else nextSmartStage();
     } else {
        playSound('error');
        saveMistake(currentCard.id);
        alert(`Xato! To'g'ri: ${currentCard.en}`);
     }
  };

  const startTimer = (sec) => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
       setTimer(t => {
          if (t <= 1) { clearInterval(timerRef.current); return 0; }
          return t - 1;
       });
    }, 1000);
  };

  const handleThinkResult = (correct) => {
     if (correct) {
        playSound('success');
        const nextIdx = activeQueue.indexOf(currentCard) + 1;
        if (nextIdx < activeQueue.length) { setCurrentCard(activeQueue[nextIdx]); setTimer(7); startTimer(7); }
        else nextSmartStage();
     } else {
        playSound('error');
        saveMistake(currentCard.id);
        const nextIdx = activeQueue.indexOf(currentCard) + 1;
        if (nextIdx < activeQueue.length) { setCurrentCard(activeQueue[nextIdx]); setTimer(7); startTimer(7); }
        else nextSmartStage();
     }
  };


  // --- PREMIUM ARCADE LOGIC ---

  const startPremiumGame = (type) => {
    setPremiumGame(type);
    setScore(0);
    setStreak(0);
    setGameActive(true);
    setView('game_premium');
    
    let q = [];
    if (type === 'boss') {
      q = allWords.filter(w => (mistakeCounts[w.id] || 0) > 0).sort((a,b) => mistakeCounts[b.id] - mistakeCounts[a.id]);
      if (q.length === 0) { alert("Hali 'Boss' so'zlar yo'q! Xato qilingan so'zlar shu yerda paydo bo'ladi."); setView('premium_dashboard'); return; }
    } else if (type === 'daily') {
      q = shuffle(allWords).slice(0, 10);
    } else {
      const hard = allWords.filter(w => (mistakeCounts[w.id] || 0) > 0);
      const rest = allWords.filter(w => !mistakeCounts[w.id]);
      q = shuffle([...hard, ...rest]);
    }
    
    setPremiumQueue(q);
    setupPremiumRound(q[0], type);
    
    if (type === 'timeAttack') {
        setTimer(30);
        startTimer(30);
    }
  };

  const setupPremiumRound = (word, type) => {
    setCurrentCard(word);
    setPremiumFeedback(null);
    setTypeInput('');
    
    if (type === 'wordHunt') {
        const distractors = shuffle(allWords.filter(w => w.id !== word.id)).slice(0, 8);
        setQuizOptions(shuffle([word, ...distractors]));
        setTimer(5); 
        startTimer(5);
    } else if (type === 'missingLetter') {
        const en = word.en;
        const indices = [];
        for(let i=0; i<en.length; i++) if(Math.random() > 0.5) indices.push(i);
        if(indices.length === 0) indices.push(0);
        word.masked = en.split('').map((c,i) => indices.includes(i) ? '_' : c).join('');
    } else if (type === 'listenType') {
        speak(word.en);
    } else if (type === 'confusion') {
        let distractors = allWords.filter(w => w.id !== word.id && w.en[0].toLowerCase() === word.en[0].toLowerCase());
        if (distractors.length < 3) distractors = allWords.filter(w => w.id !== word.id).slice(0, 3);
        setQuizOptions(shuffle([word, ...shuffle(distractors).slice(0,3)]));
    } else if (type === 'timeAttack' || type === 'daily' || type === 'boss') {
        const distractors = shuffle(allWords.filter(w => w.id !== word.id)).slice(0, 3);
        setQuizOptions(shuffle([word, ...distractors]));
    }
  };

  const handlePremiumAnswer = (isCorrect) => {
      if (!gameActive) return;

      if (isCorrect) {
          playSound('success');
          setStreak(s => {
             const newS = s + 1;
             if(newS % 5 === 0) playSound('levelUp');
             return newS;
          });
          const multiplier = streak > 5 ? 2 : (streak > 2 ? 1.5 : 1);
          setScore(s => s + (10 * multiplier));
          setPremiumFeedback('correct');
      } else {
          playSound('error');
          setStreak(0);
          setPremiumFeedback('wrong');
          saveMistake(currentCard.id);
      }

      setTimeout(() => {
         if (premiumGame === 'timeAttack' && timer <= 0) {
             endPremiumGame();
             return;
         }

         const nextIdx = premiumQueue.indexOf(currentCard) + 1;
         if (nextIdx < premiumQueue.length) {
             setupPremiumRound(premiumQueue[nextIdx], premiumGame);
         } else {
             endPremiumGame();
         }
      }, isCorrect ? 400 : 800);
  };

  const checkInputGame = (e) => {
      e.preventDefault();
      const cleanInput = typeInput.trim().toLowerCase();
      const cleanTarget = currentCard.en.toLowerCase();
      handlePremiumAnswer(cleanInput === cleanTarget);
  };

  const endPremiumGame = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      setGameActive(false);
      triggerConfetti();
      setTimeout(() => {
          alert(`O'yin tugadi!\nBall: ${score}\nEng katta streak: ${streak}`);
          setView('premium_dashboard');
      }, 500);
  };

  useEffect(() => {
      if (gameActive && premiumGame === 'timeAttack' && timer <= 0) {
          endPremiumGame();
      }
      if (gameActive && premiumGame === 'wordHunt' && timer <= 0) {
          handlePremiumAnswer(false);
      }
  }, [timer, gameActive, premiumGame]);


  // --- RENDERERS ---

  const renderHome = () => (
    <div className="flex flex-col gap-6 w-full max-w-md animate-fade-in">
       <div className="text-center mb-8">
          <Brain className="w-16 h-16 mx-auto text-indigo-500 mb-4" />
          <h1 className="text-4xl font-extrabold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">Umarov.A</h1>
          <p className="opacity-60">Ingliz tilini oson va qiziqarli o'rganing</p>
       </div>
       
       <button onClick={() => setView('smart_dashboard')} className="group relative p-6 bg-white dark:bg-slate-800 rounded-3xl border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-500 transition-all shadow-lg hover:shadow-indigo-500/20 text-left overflow-hidden">
          <div className="relative z-10 flex justify-between items-center">
             <div>
                <h3 className="text-xl font-bold mb-1">Smart Learning</h3>
                <p className="text-sm opacity-60">Standart o'quv dasturi</p>
             </div>
             <Layout className="w-8 h-8 text-indigo-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="absolute inset-0 bg-indigo-50 dark:bg-indigo-900/10 opacity-0 group-hover:opacity-100 transition-opacity" />
       </button>

       <button onClick={() => setView('premium_dashboard')} className="group relative p-6 bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-3xl shadow-lg hover:shadow-orange-500/30 transition-all text-left overflow-hidden">
          <div className="relative z-10 flex justify-between items-center">
             <div>
                <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-bold">Premium Arcade</h3>
                    <Star className="fill-white" size={16} />
                </div>
                <p className="text-sm opacity-90">O'yinlar, Streak va Boss Battle</p>
             </div>
             <Trophy className="w-8 h-8 text-white group-hover:rotate-12 transition-transform" />
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl -mr-10 -mt-10" />
       </button>
    </div>
  );

  const renderSmartDashboard = () => (
     <div className="w-full flex-1 flex flex-col animate-fade-in overflow-hidden">
        <div className="flex justify-between items-center mb-6 px-4">
           <h2 className="text-2xl font-bold">Smart Mode</h2>
           <button onClick={() => setView('home')} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full"><X size={20}/></button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-20 grid grid-cols-1 sm:grid-cols-2 gap-4 custom-scrollbar">
           {Array.from({ length: Math.ceil(allWords.length / 10) }).map((_, i) => (
              <button key={i} onClick={() => startSmartGroup(i)} className={`p-4 rounded-2xl border-2 text-left transition-all ${smartProgress[i] ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'}`}>
                 <div className="flex justify-between">
                    <span className="font-bold">Guruh {i+1}</span>
                    {smartProgress[i] && <CheckCircle className="text-emerald-500" size={18}/>}
                 </div>
                 <p className="text-xs opacity-60 mt-1">{i*10+1} - {Math.min((i+1)*10, allWords.length)} so'zlar</p>
              </button>
           ))}
        </div>
     </div>
  );

  const renderPremiumDashboard = () => (
     <div className="w-full flex-1 flex flex-col animate-fade-in overflow-hidden h-full">
        <div className="flex justify-between items-center mb-4 px-4 pt-2 flex-none">
           <div>
              <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-500 to-orange-600">Premium Arcade</h2>
              <p className="text-xs opacity-60 flex items-center gap-1"><ShieldAlert size={12}/> Xatolar: {Object.values(mistakeCounts).reduce((a,b)=>a+b,0)}</p>
           </div>
           <button onClick={() => setView('home')} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full"><X size={20}/></button>
        </div>

        {/* Scrollable List for Standard Games */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 custom-scrollbar min-h-0">
           <div className="grid grid-cols-2 gap-3">
              <button onClick={() => startPremiumGame('timeAttack')} className="p-4 bg-white dark:bg-slate-800 rounded-2xl border-b-4 border-blue-500 shadow-sm hover:scale-[1.02] transition">
                 <Clock className="w-8 h-8 text-blue-500 mb-2" />
                 <h4 className="font-bold">Time Attack</h4>
                 <p className="text-[10px] opacity-60">30 soniya, maksimal ball</p>
              </button>
              
              <button onClick={() => startPremiumGame('wordHunt')} className="p-4 bg-white dark:bg-slate-800 rounded-2xl border-b-4 border-green-500 shadow-sm hover:scale-[1.02] transition">
                 <Search className="w-8 h-8 text-green-500 mb-2" />
                 <h4 className="font-bold">Word Hunt</h4>
                 <p className="text-[10px] opacity-60">Tezkor qidiruv</p>
              </button>

              <button onClick={() => startPremiumGame('missingLetter')} className="p-4 bg-white dark:bg-slate-800 rounded-2xl border-b-4 border-purple-500 shadow-sm hover:scale-[1.02] transition">
                 <Type className="w-8 h-8 text-purple-500 mb-2" />
                 <h4 className="font-bold">Missing Letter</h4>
                 <p className="text-[10px] opacity-60">Spelling master</p>
              </button>

              <button onClick={() => startPremiumGame('listenType')} className="p-4 bg-white dark:bg-slate-800 rounded-2xl border-b-4 border-pink-500 shadow-sm hover:scale-[1.02] transition">
                 <Headphones className="w-8 h-8 text-pink-500 mb-2" />
                 <h4 className="font-bold">Listen & Type</h4>
                 <p className="text-[10px] opacity-60">Eshitib yozish</p>
              </button>
              
              <button onClick={() => startPremiumGame('confusion')} className="p-4 bg-white dark:bg-slate-800 rounded-2xl border-b-4 border-indigo-500 shadow-sm hover:scale-[1.02] transition">
                 <Crosshair className="w-8 h-8 text-indigo-500 mb-2" />
                 <h4 className="font-bold">Confusion</h4>
                 <p className="text-[10px] opacity-60">O'xshash so'zlar</p>
              </button>

              <button onClick={() => startPremiumGame('daily')} className="p-4 bg-white dark:bg-slate-800 rounded-2xl border-b-4 border-yellow-500 shadow-sm hover:scale-[1.02] transition">
                 <Calendar className="w-8 h-8 text-yellow-500 mb-2" />
                 <h4 className="font-bold">Daily Mix</h4>
                 <p className="text-[10px] opacity-60">Kunlik 10 ta so'z</p>
              </button>
           </div>
        </div>

        {/* Dedicated Boss Battle Button - Fixed at Bottom */}
        <div className="flex-none p-4 w-full bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-10">
           <button 
             onClick={() => startPremiumGame('boss')} 
             className="w-full py-4 px-6 bg-gradient-to-r from-red-600 to-rose-700 text-white rounded-2xl shadow-lg shadow-red-500/30 hover:shadow-red-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 relative overflow-hidden group flex items-center justify-center gap-4"
           >
              <div className="relative z-10 flex items-center justify-center gap-3">
                 <div className="p-2 bg-white/20 rounded-full backdrop-blur-sm animate-pulse">
                    <ShieldAlert className="w-6 h-6 md:w-8 md:h-8" />
                 </div>
                 <div className="text-left">
                    <h4 className="font-black text-lg md:text-xl tracking-wide uppercase">BOSS BATTLE</h4>
                    <p className="text-[10px] md:text-xs opacity-90 font-medium text-red-100">Eng qiyin so'zlar bilan jang</p>
                 </div>
              </div>
              
              {/* Decorative Elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-white/20 transition-colors"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-xl -ml-10 -mb-10"></div>
           </button>
        </div>
     </div>
  );

  const renderGameArea = () => {
    const isPremium = view === 'game_premium';
    const card = currentCard;
    const title = isPremium ? premiumGame.toUpperCase() : `GURUH ${smartGroupIndex + 1}`;
    const sub = isPremium ? `Ball: ${score} | Streak: ${streak}🔥` : `${smartStage.toUpperCase()}`;

    let content = null;

    if (!isPremium && smartStage === 'intro') {
       content = (
         <div className="flex-1 flex flex-col justify-between items-center w-full max-w-md mx-auto py-2 gap-4 animate-fade-in h-full min-h-0">
            <div className="flex-1 w-full bg-white dark:bg-slate-800 rounded-3xl shadow-lg border-2 border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center p-6 relative overflow-hidden group">
               <span className="text-xs font-bold uppercase tracking-widest opacity-40 mb-2 absolute top-6">O'zbekcha</span>
               <h3 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-slate-100 text-center break-words max-w-full px-4">{activeQueue[introIndex]?.uz}</h3>
            </div>
            <div onClick={() => speak(activeQueue[introIndex]?.en)} className="flex-1 w-full bg-indigo-600 text-white rounded-3xl shadow-xl shadow-indigo-200 dark:shadow-none flex flex-col items-center justify-center p-6 relative cursor-pointer active:scale-[0.98] transition-all duration-200 group">
               <span className="text-xs font-bold uppercase tracking-widest opacity-60 mb-2 absolute top-6">Inglizcha</span>
               <h3 className="text-4xl md:text-5xl font-extrabold text-center break-words max-w-full px-4">{activeQueue[introIndex]?.en}</h3>
               <div className="absolute bottom-6 opacity-50 group-hover:opacity-100 transition-opacity"><Volume2 size={24} /></div>
            </div>
            <button onClick={handleIntroNext} className="w-full py-4 bg-slate-900 dark:bg-slate-700 text-white rounded-2xl font-bold hover:scale-[1.02] active:scale-95 transition shadow-lg flex-none">KEYINGISI</button>
         </div>
       );
    } 
    else if (!isPremium && smartStage === 'match') {
       content = (
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2 content-center w-full h-full animate-fade-in">
             {matchCards.map(c => (
                <button key={c.uid} onClick={() => handleMatch(c)} disabled={c.matched} className={`rounded-xl border-2 flex flex-col items-center justify-center p-2 transition-all ${c.matched ? 'opacity-0 scale-0' : 'opacity-100 scale-100'} ${matchSelected === c.uid ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                   <span className="text-[10px] opacity-50 uppercase font-bold">{c.type === 'en' ? 'Ingliz' : 'Uzbek'}</span>
                   <span className="font-bold text-sm md:text-lg break-words">{c.type === 'en' ? c.en : c.uz}</span>
                </button>
             ))}
          </div>
       );
    } 
    else if (isPremium && premiumGame === 'wordHunt') {
        content = (
          <div className="flex-1 flex flex-col w-full max-w-lg mx-auto h-full min-h-0 gap-4 animate-fade-in">
             <div className="flex-none bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-md border-2 border-indigo-100 dark:border-slate-700 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 h-1 bg-amber-500 transition-all duration-1000 ease-linear" style={{width: `${(timer/5)*100}%`}}></div>
                <span className="text-[10px] uppercase tracking-widest opacity-60 font-bold">Find Translation</span>
                <h3 className="text-2xl font-black mt-1 text-indigo-600 dark:text-indigo-400 truncate px-2">{currentCard?.en}</h3>
             </div>
             <div className="flex-1 grid grid-cols-3 gap-2 min-h-0">
                {quizOptions.map((opt, i) => (
                   <button key={i} onClick={() => handlePremiumAnswer(opt.id === currentCard.id)} className="w-full h-full bg-white dark:bg-slate-800 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-500 font-bold text-sm md:text-base transition-all active:scale-95 flex items-center justify-center p-2 break-words leading-tight">
                      {opt.uz}
                   </button>
                ))}
             </div>
          </div>
       );
    }
    else if ((!isPremium && smartStage === 'quiz') || (isPremium && ['timeAttack','daily','boss','confusion'].includes(premiumGame))) {
       content = (
          <div className="flex-1 flex flex-col justify-center w-full max-w-md gap-4 animate-fade-in">
             <div className="w-full bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-lg border-2 border-indigo-100 dark:border-slate-700 text-center relative overflow-hidden">
                {isPremium && <div className="absolute top-0 left-0 h-1 bg-amber-500 transition-all duration-1000 ease-linear" style={{width: `${(timer/30)*100}%`}}></div>}
                <span className="text-xs opacity-50 uppercase tracking-widest">Translate</span>
                <h3 className="text-3xl font-extrabold mt-2 mb-2 text-indigo-600 dark:text-indigo-400">{currentCard?.en}</h3>
             </div>
             <div className="grid grid-cols-2 gap-3">
                {quizOptions.map((opt, i) => (
                   <button key={i} onClick={() => isPremium ? handlePremiumAnswer(opt.id === currentCard.id) : handleSmartQuiz(opt)} className="p-4 bg-white dark:bg-slate-800 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-500 font-bold text-sm transition-all active:scale-95">{opt.uz}</button>
                ))}
             </div>
          </div>
       );
    } else if ((!isPremium && smartStage === 'typing') || (isPremium && ['missingLetter','listenType'].includes(premiumGame))) {
       content = (
         <div className="flex-1 flex flex-col justify-center w-full max-w-md gap-6 animate-fade-in">
            <div className="text-center space-y-2">
               {premiumGame === 'listenType' ? (
                   <div onClick={() => speak(currentCard.en)} className="w-24 h-24 bg-indigo-500 rounded-full mx-auto flex items-center justify-center cursor-pointer shadow-lg hover:scale-105 transition"><Volume2 className="text-white w-10 h-10" /></div>
               ) : (
                   <h3 className="text-4xl font-mono font-bold tracking-widest">{premiumGame === 'missingLetter' ? currentCard.masked : currentCard.uz}</h3>
               )}
               <p className="text-xs opacity-50 uppercase">{premiumGame === 'listenType' ? 'Eshiting va Yozing' : (premiumGame === 'missingLetter' ? 'Harflarni to\'ldiring' : 'Tarjimasini yozing')}</p>
            </div>
            <form onSubmit={isPremium ? checkInputGame : handleSmartTyping} className="relative">
               <input type="text" autoFocus value={typeInput} onChange={e => setTypeInput(e.target.value)} placeholder="..." className="w-full p-4 text-center text-2xl font-bold bg-transparent border-b-4 border-slate-300 dark:border-slate-700 focus:border-indigo-500 outline-none transition-colors" />
               <button type="submit" className="absolute right-2 top-2 p-2 bg-indigo-500 text-white rounded-lg"><ArrowRight size={20}/></button>
            </form>
         </div>
       );
    } else if (!isPremium && smartStage === 'think') {
       content = (
         <div className="flex-1 flex flex-col justify-center items-center animate-fade-in">
            <div className="w-full max-w-xs h-2 bg-slate-200 rounded-full mb-8 overflow-hidden"><div className="h-full bg-indigo-500 transition-all duration-1000 ease-linear" style={{width: `${(timer/7)*100}%`}}></div></div>
            <div className="p-10 bg-white dark:bg-slate-800 rounded-full shadow-2xl border-4 border-indigo-100 dark:border-slate-700 text-center w-64 h-64 flex flex-col justify-center items-center">
               <h3 className="text-2xl font-bold">{currentCard?.uz}</h3>
            </div>
            <div className="flex gap-4 mt-10 w-full max-w-sm">
               <button onClick={() => handleThinkResult(false)} className="flex-1 py-4 bg-red-100 text-red-600 rounded-2xl font-bold">Xato</button>
               <button onClick={() => handleThinkResult(true)} className="flex-1 py-4 bg-emerald-100 text-emerald-600 rounded-2xl font-bold">To'g'ri</button>
            </div>
         </div>
       );
    }

    if (premiumFeedback) {
        return (
            <div className={`flex-1 flex items-center justify-center flex-col animate-fade-in ${premiumFeedback === 'correct' ? 'text-emerald-500' : 'text-red-500'}`}>
                {premiumFeedback === 'correct' ? <CheckCircle size={80} /> : <X size={80} />}
                <h2 className="text-4xl font-black mt-4">{premiumFeedback === 'correct' ? 'GREAT!' : 'OOPS!'}</h2>
            </div>
        )
    }

    return (
       <div className="flex-1 w-full flex flex-col h-full relative">
          <div className="flex justify-between items-center py-4 px-2 border-b border-slate-200 dark:border-slate-800">
             <div>
                <h2 className="font-bold text-lg">{title}</h2>
                <p className="text-xs opacity-60 font-mono">{sub}</p>
             </div>
             <button onClick={() => isPremium ? endPremiumGame() : setView('smart_dashboard')} className="text-xs font-bold text-red-400">CHIQISH</button>
          </div>
          {isPremium && streak > 0 && (
              <div className="absolute right-0 top-20 flex flex-col-reverse gap-1 pr-2 opacity-50 pointer-events-none">
                  {Array.from({length: Math.min(streak, 10)}).map((_,i) => (<div key={i} className="w-2 h-8 bg-amber-400 rounded-sm shadow-sm animate-fade-in-up"></div>))}
              </div>
          )}
          <div className="flex-1 flex flex-col items-center justify-center p-4 min-h-0 overflow-hidden">
             {content}
          </div>
       </div>
    );
  };

  // --- Main Render ---
  return (
    <div className={`h-screen w-screen flex flex-col overflow-hidden ${darkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'} font-sans`}>
       <style>{`
         ::-webkit-scrollbar { display: none; }
         * { -ms-overflow-style: none; scrollbar-width: none; }
         .custom-scrollbar::-webkit-scrollbar { display: none; }
         @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
         .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
         @keyframes fade-in-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
         .animate-fade-in-up { animation: fade-in-up 0.4s ease-out forwards; }
         .confetti { position: fixed; width: 8px; height: 8px; z-index: 100; animation: fall linear forwards; top: -10px; }
         @keyframes fall { to { transform: translateY(110vh) rotate(720deg); } }
       `}</style>
       <nav className="flex-none px-6 py-3 flex justify-between items-center z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2" onClick={() => setView('home')}>
             <Brain className="text-indigo-500" />
             <span className="font-bold tracking-tight">Umarov.A</span>
          </div>
          <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800">
             {darkMode ? <Sun size={18} className="text-yellow-400"/> : <Moon size={18} />}
          </button>
       </nav>
       <main className="flex-1 flex flex-col items-center justify-center p-4 relative overflow-hidden">
          {view === 'upload' && (
             <div className="text-center space-y-6 animate-fade-in-up">
                <h2 className="text-3xl font-extrabold">Xush kelibsiz</h2>
                <label className="block w-64 aspect-video border-3 border-dashed rounded-3xl flex flex-col items-center justify-center gap-2 cursor-pointer border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/50 dark:border-slate-700 dark:hover:bg-slate-800 transition">
                   <Upload className="text-indigo-500" />
                   <span className="text-sm font-bold">Excel Yuklash</span>
                   <input type="file" className="hidden" accept=".xlsx" onChange={handleFileUpload} />
                </label>
             </div>
          )}
          {view === 'home' && renderHome()}
          {view === 'smart_dashboard' && renderSmartDashboard()}
          {view === 'premium_dashboard' && renderPremiumDashboard()}
          {(view === 'game_smart' || view === 'game_premium') && renderGameArea()}
       </main>
    </div>
  );
};

export default App;