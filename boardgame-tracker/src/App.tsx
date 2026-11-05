import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  addDoc, 
  setDoc,
  deleteDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  Trophy, 
  Dices, 
  Users, 
  Plus, 
  Calendar, 
  Trash2, 
  Cloud, 
  CloudOff, 
  Sparkles, 
  Award, 
  Gamepad2, 
  TrendingUp, 
  ChevronRight, 
  Info,
  CheckCircle2,
  Medal,
  Star,
  FileText,
  Clock,
  Zap,
  Filter,
  Image as ImageIcon,
  Edit,
  Layers,
  Check,
  X
} from 'lucide-react';

// --- CONFIGURAZIONE E INIZIALIZZAZIONE FIREBASE ---
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : {
      apiKey: "demo-api-key",
      authDomain: "demo-project.firebaseapp.com",
      projectId: "demo-project",
      storageBucket: "demo-project.appspot.com",
      messagingSenderId: "123456789",
      appId: "1:123456789:web:demo"
    };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'board-game-tracker-default';

// Predefined board games with emojis & sample imagery
const PRESET_GAMES = [
  { id: 'catan', name: "Catan", icon: "🌾", imageUrl: "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=400&q=80" },
  { id: 'ticket-to-ride', name: "Ticket to Ride", icon: "🚂", imageUrl: "https://images.unsplash.com/photo-1543783207-ec64e4d95325?auto=format&fit=crop&w=400&q=80" },
  { id: 'carcassonne', name: "Carcassonne", icon: "🏰", imageUrl: "https://images.unsplash.com/photo-1563941433-b6a0946530d8?auto=format&fit=crop&w=400&q=80" },
  { id: 'terraforming-mars', name: "Terraforming Mars", icon: "🚀", imageUrl: "https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?auto=format&fit=crop&w=400&q=80" },
  { id: 'wingspan', name: "Wingspan", icon: "🐦", imageUrl: "https://images.unsplash.com/photo-1552728089-57bdde30beb3?auto=format&fit=crop&w=400&q=80" },
  { id: 'azul', name: "Azul", icon: "🧩", imageUrl: "https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=400&q=80" }
];

export default function App() {
  // --- STATI PRINCIPALI ---
  const [user, setUser] = useState(null);
  const [matches, setMatches] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [gamesMetaData, setGamesMetaData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, addMatch, games, seasons, history
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // --- FILTRO STAGIONE GLOBALE ---
  const [selectedSeasonId, setSelectedSeasonId] = useState('ALL');

  // --- STATI FORM NUOVA PARTITA ---
  const [gameName, setGameName] = useState('');
  const [gameCustomInput, setGameCustomInput] = useState('');
  const [matchDate, setMatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [playersInput, setPlayersInput] = useState([
    { name: '', score: '' },
    { name: '', score: '' }
  ]);
  const [manualWinner, setManualWinner] = useState('');
  const [useManualWinner, setUseManualWinner] = useState(false);
  const [notes, setNotes] = useState('');
  const [matchSeasonId, setMatchSeasonId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- STATI EDIT IMMAGINE GIOCO ---
  const [editingGame, setEditingGame] = useState(null);
  const [editImageUrl, setEditImageUrl] = useState('');

  // --- STATI NUOVA STAGIONE ---
  const [newSeasonName, setNewSeasonName] = useState('');
  const [isCreatingSeason, setIsCreatingSeason] = useState(false);

  // --- STATI FILTRI STORICO ---
  const [historyGameFilter, setHistoryGameFilter] = useState('ALL');
  const [historyPlayerFilter, setHistoryPlayerFilter] = useState('ALL');

  // --- AUTHENTICATION EFFECT ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
        setErrorMsg("Errore di autenticazione Cloud. Riprova ricaricando la pagina.");
      }
    };

    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (usr) => {
      setUser(usr);
    });

    return () => unsubscribe();
  }, []);

  // --- FIRESTORE LISTENERS (Matches, Seasons, Games) ---
  useEffect(() => {
    if (!user) return;

    setLoading(true);
    
    // Collections
    const matchesRef = collection(db, 'artifacts', appId, 'public', 'data', 'matches');
    const seasonsRef = collection(db, 'artifacts', appId, 'public', 'data', 'seasons');
    const gamesRef = collection(db, 'artifacts', appId, 'public', 'data', 'games');

    // 1. Matches Listener
    const unsubMatches = onSnapshot(matchesRef, 
      (snapshot) => {
        const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        fetched.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
        setMatches(fetched);
        setLoading(false);
      },
      (err) => console.error("Firestore matches error:", err)
    );

    // 2. Seasons Listener
    const unsubSeasons = onSnapshot(seasonsRef,
      (snapshot) => {
        const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        fetched.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setSeasons(fetched);

        // Auto-select active season if matchSeasonId is not set
        const active = fetched.find(s => s.isActive);
        if (active) {
          setMatchSeasonId(prev => prev || active.id);
        }
      },
      (err) => console.error("Firestore seasons error:", err)
    );

    // 3. Games Listener (Immagini e dati custom dei giochi)
    const unsubGames = onSnapshot(gamesRef,
      (snapshot) => {
        const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setGamesMetaData(fetched);
      },
      (err) => console.error("Firestore games error:", err)
    );

    return () => {
      unsubMatches();
      unsubSeasons();
      unsubGames();
    };
  }, [user]);

  // Helper Notifiche
  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // Combina preset games con metadata da Firestore (es. Immagini personalizzate)
  const combinedGamesMap = useMemo(() => {
    const map = {};

    // 1. Inserisci preset
    PRESET_GAMES.forEach(g => {
      map[g.name.toLowerCase()] = { ...g };
    });

    // 2. Override o aggiungi metadata da Cloud
    gamesMetaData.forEach(g => {
      const key = (g.name || '').toLowerCase();
      if (key) {
        map[key] = {
          ...(map[key] || { id: g.id, name: g.name, icon: '🎲' }),
          ...g
        };
      }
    });

    // 3. Aggiungi anche giochi presenti nelle partite ma non in memoria
    matches.forEach(m => {
      if (m.game && !map[m.game.toLowerCase()]) {
        map[m.game.toLowerCase()] = {
          id: m.game.toLowerCase().replace(/\s+/g, '-'),
          name: m.game,
          icon: '🎲',
          imageUrl: ''
        };
      }
    });

    return map;
  }, [gamesMetaData, matches]);

  const getGameInfo = (gName) => {
    if (!gName) return { name: 'Sconosciuto', icon: '🎲', imageUrl: '' };
    return combinedGamesMap[gName.toLowerCase()] || { name: gName, icon: '🎲', imageUrl: '' };
  };

  // --- GESTIONE STAGIONI ---
  const handleCreateSeason = async (e) => {
    e.preventDefault();
    if (!newSeasonName.trim()) return;

    try {
      setIsCreatingSeason(true);
      const seasonsRef = collection(db, 'artifacts', appId, 'public', 'data', 'seasons');
      
      const newDoc = await addDoc(seasonsRef, {
        name: newSeasonName.trim(),
        isActive: seasons.length === 0, // Se è la prima, rendila attiva
        createdAt: new Date().toISOString()
      });

      if (seasons.length === 0) {
        setMatchSeasonId(newDoc.id);
      }

      setNewSeasonName('');
      showSuccess("🏆 Nuova Stagione creata con successo!");
    } catch (err) {
      console.error(err);
      setErrorMsg("Impossibile creare la stagione.");
    } finally {
      setIsCreatingSeason(false);
    }
  };

  const handleSetActiveSeason = async (seasonId) => {
    try {
      // Imposta tutte le altre come non attive e questa come attiva
      for (const s of seasons) {
        const seasonDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'seasons', s.id);
        await setDoc(seasonDocRef, { ...s, isActive: s.id === seasonId }, { merge: true });
      }
      setMatchSeasonId(seasonId);
      showSuccess("Stagione attiva aggiornata!");
    } catch (err) {
      console.error(err);
      setErrorMsg("Errore nell'aggiornamento della stagione attiva.");
    }
  };

  // --- GESTIONE IMMAGINE GIOCO ---
  const handleSaveGameImage = async () => {
    if (!editingGame) return;

    try {
      const gameKey = editingGame.name.toLowerCase().replace(/\s+/g, '-');
      const gameDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'games', gameKey);

      await setDoc(gameDocRef, {
        name: editingGame.name,
        imageUrl: editImageUrl.trim(),
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setEditingGame(null);
      setEditImageUrl('');
      showSuccess(`Immagine per "${editingGame.name}" aggiornata!`);
    } catch (err) {
      console.error(err);
      setErrorMsg("Errore nel salvataggio dell'immagine del gioco.");
    }
  };

  // --- LOGICA FORM NUOVA PARTITA ---
  const handleAddPlayerRow = () => {
    if (playersInput.length < 10) {
      setPlayersInput([...playersInput, { name: '', score: '' }]);
    }
  };

  const handleRemovePlayerRow = (index) => {
    if (playersInput.length > 2) {
      setPlayersInput(playersInput.filter((_, i) => i !== index));
    }
  };

  const handlePlayerChange = (index, field, value) => {
    const updated = [...playersInput];
    updated[index][field] = value;
    setPlayersInput(updated);
  };

  const finalGameName = gameName === 'CUSTOM' ? gameCustomInput.trim() : gameName;

  const calculatedWinner = useMemo(() => {
    const valid = playersInput.filter(p => p.name.trim() !== '' && p.score !== '');
    if (valid.length === 0) return '';
    const sorted = [...valid].sort((a, b) => parseFloat(b.score) - parseFloat(a.score));
    return sorted[0] ? sorted[0].name.trim() : '';
  }, [playersInput]);

  const handleSubmitMatch = async (e) => {
    e.preventDefault();
    if (!user) return setErrorMsg("Connessione cloud non pronta.");
    if (!finalGameName) return setErrorMsg("Seleziona o inserisci il nome del gioco.");

    const validPlayers = playersInput
      .filter(p => p.name.trim() !== '')
      .map(p => ({ name: p.name.trim(), score: parseFloat(p.score) || 0 }));

    if (validPlayers.length < 2) return setErrorMsg("Inserisci almeno 2 giocatori validi.");

    const winner = useManualWinner ? manualWinner.trim() : calculatedWinner;
    if (!winner) return setErrorMsg("Specificare un vincitore.");

    setIsSubmitting(true);

    try {
      const matchesRef = collection(db, 'artifacts', appId, 'public', 'data', 'matches');
      
      await addDoc(matchesRef, {
        game: finalGameName,
        date: matchDate,
        players: validPlayers,
        winner: winner,
        notes: notes.trim(),
        seasonId: matchSeasonId || 'DEFAULT',
        createdAt: new Date().toISOString(),
        createdBy: user.uid
      });

      // Salva anche il gioco nella collezione giochi se è custom per non perderlo
      const gameKey = finalGameName.toLowerCase().replace(/\s+/g, '-');
      const gameDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'games', gameKey);
      await setDoc(gameDocRef, { name: finalGameName }, { merge: true });

      // Reset
      setGameName('');
      setGameCustomInput('');
      setMatchDate(new Date().toISOString().split('T')[0]);
      setPlayersInput([{ name: '', score: '' }, { name: '', score: '' }]);
      setNotes('');
      setUseManualWinner(false);
      setManualWinner('');

      showSuccess("🎉 Partita salvata con successo!");
      setActiveTab('dashboard');
    } catch (err) {
      console.error(err);
      setErrorMsg("Errore nel salvataggio della partita.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMatch = async (matchId) => {
    if (!window.confirm("Sei sicuro di voler eliminare questa partita dalla cronologia condivisa?")) return;
    try {
      const matchDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'matches', matchId);
      await deleteDoc(matchDocRef);
      showSuccess("Partita eliminata dal Cloud.");
    } catch (err) {
      console.error(err);
      setErrorMsg("Errore durante l'eliminazione.");
    }
  };

  // --- FILTRAGGIO PARTITE IN BASE ALLA STAGIONE SELEZIONATA ---
  const seasonFilteredMatches = useMemo(() => {
    if (selectedSeasonId === 'ALL') return matches;
    return matches.filter(m => m.seasonId === selectedSeasonId);
  }, [matches, selectedSeasonId]);

  // Classifica Giocatori (Calcolata sulla stagione selezionata)
  const playerStats = useMemo(() => {
    const stats = {};

    seasonFilteredMatches.forEach(m => {
      if (!m.players || !Array.isArray(m.players)) return;

      m.players.forEach(p => {
        if (!stats[p.name]) {
          stats[p.name] = {
            name: p.name,
            played: 0,
            wins: 0,
            totalScore: 0,
            highestScore: -Infinity
          };
        }

        stats[p.name].played += 1;
        stats[p.name].totalScore += (p.score || 0);
        if ((p.score || 0) > stats[p.name].highestScore) {
          stats[p.name].highestScore = p.score;
        }

        if (m.winner && m.winner.toLowerCase() === p.name.toLowerCase()) {
          stats[p.name].wins += 1;
        }
      });
    });

    return Object.values(stats)
      .map(s => ({
        ...s,
        winRate: s.played > 0 ? ((s.wins / s.played) * 100).toFixed(1) : 0,
        avgScore: s.played > 0 ? (s.totalScore / s.played).toFixed(1) : 0
      }))
      .sort((a, b) => b.wins - a.wins || parseFloat(b.winRate) - parseFloat(a.winRate));
  }, [seasonFilteredMatches]);

  // Statistiche Giochi (Calcolata sulla stagione selezionata)
  const gameStats = useMemo(() => {
    const stats = {};

    seasonFilteredMatches.forEach(m => {
      if (!m.game) return;
      if (!stats[m.game]) {
        stats[m.game] = {
          game: m.game,
          totalMatches: 0,
          winnersCount: {}
        };
      }

      stats[m.game].totalMatches += 1;
      if (m.winner) {
        stats[m.game].winnersCount[m.winner] = (stats[m.game].winnersCount[m.winner] || 0) + 1;
      }
    });

    return Object.values(stats).map(g => {
      let topWinner = 'Nessuno';
      let maxWins = 0;
      Object.entries(g.winnersCount).forEach(([wName, count]) => {
        if (count > maxWins) {
          maxWins = count;
          topWinner = wName;
        }
      });

      return {
        ...g,
        topWinner,
        topWinnerWins: maxWins
      };
    }).sort((a, b) => b.totalMatches - a.totalMatches);
  }, [seasonFilteredMatches]);

  // Filtraggio Cronologia (Stagione + Gioco + Giocatore)
  const filteredHistoryMatches = useMemo(() => {
    return seasonFilteredMatches.filter(m => {
      const matchGame = historyGameFilter === 'ALL' || m.game === historyGameFilter;
      const matchPlayer = historyPlayerFilter === 'ALL' || (m.players && m.players.some(p => p.name === historyPlayerFilter));
      return matchGame && matchPlayer;
    });
  }, [seasonFilteredMatches, historyGameFilter, historyPlayerFilter]);

  const allUniquePlayers = useMemo(() => {
    const set = new Set();
    matches.forEach(m => m.players?.forEach(p => set.add(p.name)));
    return Array.from(set);
  }, [matches]);

  const allUniqueGames = useMemo(() => {
    const set = new Set();
    matches.forEach(m => m.game && set.add(m.game));
    return Array.from(set);
  }, [matches]);

  // Componente per Immagine di Copertina del Gioco con Fallback
  const GameImageCover = ({ gameName, className = "w-12 h-12 rounded-xl" }) => {
    const info = getGameInfo(gameName);
    const [imgError, setImgError] = useState(false);

    if (info.imageUrl && !imgError) {
      return (
        <img
          src={info.imageUrl}
          alt={info.name}
          onError={() => setImgError(true)}
          className={`${className} object-cover shadow-md`}
        />
      );
    }

    return (
      <div className={`${className} bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center shrink-0`}>
        <span className="text-xl">{info.icon || '🎲'}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* HEADER / NAVBAR */}
      <header className="bg-slate-900/90 border-b border-slate-800 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="p-2.5 bg-gradient-to-tr from-amber-500 to-orange-600 rounded-xl shadow-lg shadow-orange-500/20 text-slate-950">
              <Dices className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-amber-200 via-orange-300 to-amber-500 bg-clip-text text-transparent">
                BoardGame Tracker
              </h1>
              <p className="text-xs text-slate-400">Database & Leghe Condivise</p>
            </div>
          </div>

          {/* STATUS CLOUD & SELETTORE STAGIONE */}
          <div className="flex items-center space-x-3 flex-wrap">
            <div className="flex items-center space-x-2 text-xs px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700">
              {loading ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span className="text-amber-400 font-medium">Sincro Cloud...</span>
                </>
              ) : (
                <>
                  <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">Cloud Attivo</span>
                </>
              )}
            </div>

            {/* SELETTORE STAGIONE GLOBALE */}
            <div className="flex items-center space-x-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 px-3 py-1.5 rounded-full text-xs font-semibold">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <select
                value={selectedSeasonId}
                onChange={(e) => setSelectedSeasonId(e.target.value)}
                className="bg-transparent text-amber-300 focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-slate-900 text-slate-100">🏆 Tutte le Stagioni</option>
                {seasons.map(s => (
                  <option key={s.id} value={s.id} className="bg-slate-900 text-slate-100">
                    {s.name} {s.isActive ? '(Attiva)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* NAV BUTTONS */}
          <nav className="flex items-center space-x-1 sm:space-x-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === 'dashboard'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>Classifica</span>
            </button>

            <button
              onClick={() => setActiveTab('addMatch')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === 'addMatch'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-500/20'
                  : 'bg-amber-600/20 text-amber-300 border border-amber-500/30 hover:bg-amber-600/30'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Nuova Partita</span>
            </button>

            <button
              onClick={() => setActiveTab('games')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === 'games'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Gamepad2 className="w-4 h-4" />
              <span>Giochi</span>
            </button>

            <button
              onClick={() => setActiveTab('seasons')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === 'seasons'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Stagioni</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === 'history'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Cronologia</span>
            </button>
          </nav>
        </div>
      </header>

      {/* NOTIFICHE */}
      <div className="max-w-6xl mx-auto px-4 pt-4 w-full">
        {errorMsg && (
          <div className="mb-4 p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-200 flex items-center justify-between text-sm shadow-lg">
            <div className="flex items-center space-x-2">
              <Info className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-rose-200 font-bold ml-2">✕</button>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-4 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-200 flex items-center justify-between text-sm shadow-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-200 font-bold ml-2">✕</button>
          </div>
        )}
      </div>

      {/* MAIN CONTAINER */}
      <main className="max-w-6xl mx-auto px-4 py-4 flex-grow w-full">
        {/* ================= SEZIONE DASHBOARD / CLASSIFICA ================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* INDICATORE STAGIONE */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-medium">Stagione Attualmente Visualizzata</span>
                  <h3 className="text-base font-bold text-amber-300">
                    {selectedSeasonId === 'ALL' 
                      ? 'Storico Globale (Tutte le stagioni)' 
                      : (seasons.find(s => s.id === selectedSeasonId)?.name || 'Stagione Selezionata')}
                  </h3>
                </div>
              </div>
            </div>

            {/* STATS RAPIDE */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center space-x-3">
                <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
                  <Dices className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Partite Giocate</p>
                  <p className="text-2xl font-bold text-slate-100">{seasonFilteredMatches.length}</p>
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center space-x-3">
                <div className="p-3 bg-orange-500/10 text-orange-400 rounded-xl">
                  <Gamepad2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Giochi Giocati</p>
                  <p className="text-2xl font-bold text-slate-100">{gameStats.length}</p>
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center space-x-3">
                <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Giocatori</p>
                  <p className="text-2xl font-bold text-slate-100">{playerStats.length}</p>
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center space-x-3">
                <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Primo in Classifica</p>
                  <p className="text-lg font-bold text-amber-400 truncate">
                    {playerStats[0] ? playerStats[0].name : '-'}
                  </p>
                </div>
              </div>
            </div>

            {/* PODIO TOP 3 */}
            {playerStats.length >= 3 && (
              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                <h2 className="text-lg font-bold text-slate-200 mb-6 flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <span>Podio dei Campioni</span>
                </h2>
                <div className="grid grid-cols-3 gap-3 items-end pt-4">
                  {/* Segundo */}
                  <div className="flex flex-col items-center">
                    <div className="relative mb-2">
                      <div className="w-14 h-14 rounded-full bg-slate-800 border-2 border-slate-400 flex items-center justify-center font-bold text-lg text-slate-300">
                        {playerStats[1].name.charAt(0).toUpperCase()}
                      </div>
                      <div className="absolute -bottom-2 -right-1 bg-slate-400 text-slate-950 rounded-full p-1 shadow">
                        <Medal className="w-4 h-4" />
                      </div>
                    </div>
                    <span className="font-bold text-slate-200 text-sm text-center truncate w-full">{playerStats[1].name}</span>
                    <span className="text-xs text-slate-400">{playerStats[1].wins} vittorie</span>
                    <div className="w-full bg-slate-800/80 rounded-t-xl h-24 mt-3 flex items-center justify-center text-slate-400 font-bold text-xl border-t-2 border-slate-400">
                      2
                    </div>
                  </div>

                  {/* Primero */}
                  <div className="flex flex-col items-center">
                    <div className="relative mb-2">
                      <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center font-bold text-xl text-amber-300 shadow-lg shadow-amber-500/20">
                        {playerStats[0].name.charAt(0).toUpperCase()}
                      </div>
                      <div className="absolute -bottom-2 -right-1 bg-amber-400 text-slate-950 rounded-full p-1 shadow">
                        <Trophy className="w-4 h-4 fill-slate-950" />
                      </div>
                    </div>
                    <span className="font-bold text-amber-300 text-base text-center truncate w-full">{playerStats[0].name}</span>
                    <span className="text-xs text-amber-400/80 font-medium">{playerStats[0].wins} vittorie</span>
                    <div className="w-full bg-gradient-to-t from-amber-600/30 to-amber-500/10 rounded-t-xl h-36 mt-3 flex items-center justify-center text-amber-400 font-extrabold text-2xl border-t-2 border-amber-400">
                      1
                    </div>
                  </div>

                  {/* Tercero */}
                  <div className="flex flex-col items-center">
                    <div className="relative mb-2">
                      <div className="w-14 h-14 rounded-full bg-slate-800 border-2 border-amber-700 flex items-center justify-center font-bold text-lg text-amber-600">
                        {playerStats[2].name.charAt(0).toUpperCase()}
                      </div>
                      <div className="absolute -bottom-2 -right-1 bg-amber-700 text-slate-100 rounded-full p-1 shadow">
                        <Medal className="w-4 h-4" />
                      </div>
                    </div>
                    <span className="font-bold text-slate-200 text-sm text-center truncate w-full">{playerStats[2].name}</span>
                    <span className="text-xs text-slate-400">{playerStats[2].wins} vittorie</span>
                    <div className="w-full bg-slate-800/80 rounded-t-xl h-18 mt-3 flex items-center justify-center text-amber-700 font-bold text-xl border-t-2 border-amber-700">
                      3
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TABELLA CLASSIFICA */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <h2 className="text-lg font-bold text-slate-200 mb-4 flex items-center space-x-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <span>Classifica Giocatori</span>
              </h2>

              {playerStats.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-3">
                  <Dices className="w-12 h-12 mx-auto stroke-1 opacity-50 text-slate-500" />
                  <p>Nessuna partita registrata per questa stagione.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="text-xs uppercase bg-slate-800/50 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4 rounded-l-xl">Pos.</th>
                        <th className="py-3 px-4">Giocatore</th>
                        <th className="py-3 px-4 text-center">Vittorie</th>
                        <th className="py-3 px-4 text-center">Partite</th>
                        <th className="py-3 px-4 text-center">% Vittorie</th>
                        <th className="py-3 px-4 text-right rounded-r-xl">Punt. Medio</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {playerStats.map((p, idx) => (
                        <tr key={p.name} className="hover:bg-slate-800/30 transition">
                          <td className="py-4 px-4 font-bold">
                            {idx === 0 && <span className="text-amber-400">🥇 1°</span>}
                            {idx === 1 && <span className="text-slate-300">🥈 2°</span>}
                            {idx === 2 && <span className="text-amber-700">🥉 3°</span>}
                            {idx > 2 && <span className="text-slate-500 px-2">{idx + 1}°</span>}
                          </td>
                          <td className="py-4 px-4 font-semibold text-slate-100 flex items-center space-x-2">
                            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-amber-400">
                              {p.name.charAt(0).toUpperCase()}
                            </div>
                            <span>{p.name}</span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className="inline-block px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20">
                              {p.wins}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center font-medium text-slate-300">{p.played}</td>
                          <td className="py-4 px-4 text-center">
                            <span className="font-semibold">{p.winRate}%</span>
                          </td>
                          <td className="py-4 px-4 text-right font-medium text-slate-300">{p.avgScore}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= SEZIONE GIOCHI E GESTIONE IMMAGINI ================= */}
        {activeTab === 'games' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
                  <Gamepad2 className="w-6 h-6 text-amber-400" />
                  <span>Libreria Giochi & Copertine</span>
                </h2>
                <p className="text-xs text-slate-400">Gestisci o modifica l'URL dell'immagine di ciascun gioco</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.values(combinedGamesMap).map(g => {
                const isEditing = editingGame?.name === g.name;
                const stats = gameStats.find(s => s.game.toLowerCase() === g.name.toLowerCase());

                return (
                  <div key={g.name} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition flex flex-col justify-between space-y-4">
                    <div className="flex items-start space-x-4">
                      <GameImageCover gameName={g.name} className="w-16 h-16 rounded-xl shrink-0" />
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-slate-100 text-base truncate">{g.name}</h3>
                          <button
                            onClick={() => {
                              setEditingGame(g);
                              setEditImageUrl(g.imageUrl || '');
                            }}
                            className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition"
                            title="Modifica Immagine"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          {stats ? `${stats.totalMatches} partite in questa stagione` : 'Nessuna partita registrata'}
                        </p>
                      </div>
                    </div>

                    {stats && (
                      <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 flex items-center justify-between text-xs">
                        <span className="text-slate-400 flex items-center space-x-1">
                          <Trophy className="w-3.5 h-3.5 text-amber-400" />
                          <span>Re del gioco:</span>
                        </span>
                        <span className="font-bold text-amber-300">
                          {stats.topWinner} ({stats.topWinnerWins} vittorie)
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* MODALE EDIT IMMAGINE */}
            {editingGame && (
              <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="font-bold text-slate-100 flex items-center space-x-2">
                      <ImageIcon className="w-5 h-5 text-amber-400" />
                      <span>Modifica Immagine per {editingGame.name}</span>
                    </h3>
                    <button onClick={() => setEditingGame(null)} className="text-slate-400 hover:text-slate-200">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-2">
                      URL Immagine (Link Diretto alla Foto)
                    </label>
                    <input
                      type="url"
                      placeholder="https://esempio.com/immagine.jpg"
                      value={editImageUrl}
                      onChange={(e) => setEditImageUrl(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {editImageUrl && (
                    <div className="space-y-2">
                      <span className="text-xs text-slate-400">Anteprima:</span>
                      <img
                        src={editImageUrl}
                        alt="Preview"
                        className="w-full h-32 object-cover rounded-xl border border-slate-800"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    </div>
                  )}

                  <div className="flex items-center space-x-2 pt-2">
                    <button
                      onClick={handleSaveGameImage}
                      className="flex-1 py-2.5 bg-amber-500 text-slate-950 font-bold rounded-xl hover:bg-amber-400 transition text-sm"
                    >
                      Salva Immagine
                    </button>
                    <button
                      onClick={() => setEditingGame(null)}
                      className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition text-sm"
                    >
                      Annulla
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= SEZIONE GESTIONE STAGIONI ================= */}
        {activeTab === 'seasons' && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-100">Gestione Stagioni & Leghe</h2>
                <p className="text-xs text-slate-400">Crea nuove stagioni e seleziona la lega attualmente in corso</p>
              </div>
            </div>

            {/* FORM CREA STAGIONE */}
            <form onSubmit={handleCreateSeason} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-slate-200">Crea Nuova Stagione</h3>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Es. Stagione Autunno 2026, Lega di Natale..."
                  value={newSeasonName}
                  onChange={(e) => setNewSeasonName(e.target.value)}
                  className="flex-grow bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                />
                <button
                  type="submit"
                  disabled={isCreatingSeason}
                  className="px-5 py-2.5 bg-amber-500 text-slate-950 font-bold rounded-xl hover:bg-amber-400 transition text-sm shrink-0 flex items-center space-x-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Crea</span>
                </button>
              </div>
            </form>

            {/* ELENCO STAGIONI */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-200 mb-3">Elenco Stagioni Registrate</h3>

              {seasons.length === 0 ? (
                <p className="text-xs text-slate-500">Nessuna stagione ancora creata. Tutte le partite sono nello storico globale.</p>
              ) : (
                <div className="space-y-2">
                  {seasons.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
                      <div className="flex items-center space-x-3">
                        <Layers className="w-4 h-4 text-amber-400" />
                        <div>
                          <span className="font-semibold text-slate-100 text-sm">{s.name}</span>
                          {s.isActive && (
                            <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                              ATTIVA AL MOMENTO
                            </span>
                          )}
                        </div>
                      </div>

                      {!s.isActive && (
                        <button
                          onClick={() => handleSetActiveSeason(s.id)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold rounded-lg transition"
                        >
                          Imposta come Attiva
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= SEZIONE FORM NUOVA PARTITA ================= */}
        {activeTab === 'addMatch' && (
          <div className="max-w-2xl mx-auto bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-800">
              <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
                <Plus className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-100">Registra Nuova Partita</h2>
                <p className="text-xs text-slate-400">Assegnata automaticamente alla stagione selezionata</p>
              </div>
            </div>

            <form onSubmit={handleSubmitMatch} className="space-y-6">
              {/* STAGIONE ASSOCCIATA */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 flex items-center space-x-1.5">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span>Stagione / Lega della Partita</span>
                </label>
                <select
                  value={matchSeasonId}
                  onChange={(e) => setMatchSeasonId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                >
                  <option value="DEFAULT">Generale (Nessuna Stagione)</option>
                  {seasons.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.isActive ? '(Attiva Ora)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* SELEZIONE GIOCO CON ANTEPRIMA COPERTINE */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Nome del Gioco *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-3">
                  {Object.values(combinedGamesMap).slice(0, 9).map(preset => (
                    <button
                      type="button"
                      key={preset.name}
                      onClick={() => {
                        setGameName(preset.name);
                        setGameCustomInput('');
                      }}
                      className={`p-2 rounded-xl border text-xs font-medium text-left flex items-center space-x-2 transition ${
                        gameName === preset.name
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-semibold'
                          : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <GameImageCover gameName={preset.name} className="w-7 h-7 rounded-lg shrink-0" />
                      <span className="truncate">{preset.name}</span>
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Oppure scrivi un altro nome del gioco..."
                  value={gameName === 'CUSTOM' ? gameCustomInput : (combinedGamesMap[gameName.toLowerCase()] ? '' : gameName)}
                  onChange={(e) => {
                    setGameName('CUSTOM');
                    setGameCustomInput(e.target.value);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* DATA PARTITA */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2 flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  <span>Data della Partita *</span>
                </label>
                <input
                  type="date"
                  value={matchDate}
                  onChange={(e) => setMatchDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-amber-500 text-sm"
                  required
                />
              </div>

              {/* GIOCATORI E PUNTEGGI */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-slate-300 flex items-center space-x-2">
                    <Users className="w-4 h-4 text-amber-400" />
                    <span>Partecipanti e Punteggi *</span>
                  </label>
                </div>

                <div className="space-y-3">
                  {playersInput.map((player, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <div className="flex-grow grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder={`Giocatore ${idx + 1}`}
                          value={player.name}
                          onChange={(e) => handlePlayerChange(idx, 'name', e.target.value)}
                          className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                        />
                        <input
                          type="number"
                          placeholder="Punti"
                          value={player.score}
                          onChange={(e) => handlePlayerChange(idx, 'score', e.target.value)}
                          className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      {playersInput.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePlayerRow(idx)}
                          className="p-2.5 text-slate-500 hover:text-rose-400 rounded-xl transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddPlayerRow}
                  className="mt-3 inline-flex items-center space-x-2 text-xs font-semibold text-amber-400 hover:text-amber-300 py-1.5 px-3 rounded-lg bg-amber-500/10 border border-amber-500/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Aggiungi Giocatore</span>
                </button>
              </div>

              {/* VINCITORE */}
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-300">Vincitore Calcolato:</span>
                  <button
                    type="button"
                    onClick={() => setUseManualWinner(!useManualWinner)}
                    className="text-xs text-amber-400 underline"
                  >
                    {useManualWinner ? "Automatico" : "Manuale"}
                  </button>
                </div>

                {!useManualWinner ? (
                  <div className="flex items-center space-x-2 text-amber-300 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 text-sm font-medium">
                    <Trophy className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>{calculatedWinner || "Inserisci i punteggi per determinare il vincitore"}</span>
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder="Nome vincitore manuale..."
                    value={manualWinner}
                    onChange={(e) => setManualWinner(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 text-sm"
                  />
                )}
              </div>

              {/* NOTE */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2 flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span>Note sulla Partita</span>
                </label>
                <textarea
                  placeholder="Es. Strategia usata, momento divertente..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-6 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 hover:from-amber-400 transition"
              >
                {isSubmitting ? 'Salvataggio...' : 'Salva e Sincronizza Partita'}
              </button>
            </form>
          </div>
        )}

        {/* ================= SEZIONE CRONOLOGIA ================= */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
                <Clock className="w-6 h-6 text-amber-400" />
                <span>Cronologia Partite</span>
              </h2>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={historyGameFilter}
                    onChange={(e) => setHistoryGameFilter(e.target.value)}
                    className="bg-transparent text-slate-200 focus:outline-none"
                  >
                    <option value="ALL">Tutti i Giochi</option>
                    {allUniqueGames.map(g => <option key={g} value={g} className="bg-slate-900">{g}</option>)}
                  </select>
                </div>

                <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={historyPlayerFilter}
                    onChange={(e) => setHistoryPlayerFilter(e.target.value)}
                    className="bg-transparent text-slate-200 focus:outline-none"
                  >
                    <option value="ALL">Tutti i Giocatori</option>
                    {allUniquePlayers.map(p => <option key={p} value={p} className="bg-slate-900">{p}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {filteredHistoryMatches.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center text-slate-400 space-y-3">
                <Clock className="w-12 h-12 mx-auto stroke-1 opacity-50 text-slate-500" />
                <p>Nessuna partita trovata in questa stagione.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredHistoryMatches.map(m => {
                  const matchSeason = seasons.find(s => s.id === m.seasonId);
                  return (
                    <div key={m.id} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 hover:border-slate-700/80 transition space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <GameImageCover gameName={m.game} className="w-12 h-12 rounded-xl shrink-0" />
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="font-bold text-slate-100 text-lg">{m.game}</h3>
                              {matchSeason && (
                                <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 text-[10px] border border-amber-500/20 font-semibold">
                                  {matchSeason.name}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>{new Date(m.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
                            <Trophy className="w-3.5 h-3.5 text-amber-400" />
                            <span>Vincitore: {m.winner}</span>
                          </div>
                          <button
                            onClick={() => handleDeleteMatch(m.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/60">
                        {m.players?.map((p, pIdx) => {
                          const isWinner = m.winner && m.winner.toLowerCase() === p.name.toLowerCase();
                          return (
                            <div
                              key={pIdx}
                              className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                                isWinner 
                                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-200' 
                                  : 'bg-slate-950/40 border-slate-800 text-slate-300'
                              }`}
                            >
                              <span className="font-medium truncate mr-2">{p.name}</span>
                              <span className="font-bold text-slate-100 px-2 py-0.5 rounded bg-slate-800">{p.score} pt</span>
                            </div>
                          );
                        })}
                      </div>

                      {m.notes && (
                        <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/60 text-xs text-slate-400 italic">
                          "{m.notes}"
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="bg-slate-900 border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>🎲 Board Game Tracker Cloud &bull; Leghe & Immagini Sincronizzate</span>
        </div>
      </footer>
    </div>
  );
}