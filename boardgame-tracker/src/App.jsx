import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, getDocs, addDoc, deleteDoc, doc, updateDoc, onSnapshot 
} from 'firebase/firestore';
import { 
  Trophy, Plus, Users, Calendar, Clock, Gamepad2, Trash2, Edit2, CheckCircle, AlertCircle, Sparkles, UserPlus 
} from 'lucide-react';

const firebaseConfig = {
  apiKey: "AIzaSyChEB5QgUD8sAwavqIMapleKG06i0aW-y4",
  authDomain: "boardgametracker-1b736.firebaseapp.com",
  projectId: "boardgametracker-1b736",
  storageBucket: "boardgametracker-1b736.firebasestorage.app",
  messagingSenderId: "786935723880",
  appId: "1:786935723880:web:6997fb72c0db3897d008dd"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default function BoardGameTracker() {
  const [activeTab, setActiveTab] = useState('classifica');
  const [matches, setMatches] = useState([]);
  const [games, setGames] = useState([]);
  const [playersList, setPlayersList] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(false);

  // Modale Nuova Partita
  const [showNewMatchModal, setShowNewMatchModal] = useState(false);
  const [newMatchGame, setNewMatchGame] = useState('');
  const [newMatchDate, setNewMatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [newMatchSeason, setNewMatchSeason] = useState('');
  const [newMatchNotes, setNewMatchNotes] = useState('');
  const [matchPlayers, setMatchPlayers] = useState([{ name: '', score: '' }]);

  // Modale Nuovo Giocatore Fisso
  const [showNewPlayerModal, setShowNewPlayerModal] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');

  // Modale Nuovo Gioco / Immagine
  const [showNewGameModal, setShowNewGameModal] = useState(false);
  const [newGameName, setNewGameName] = useState('');
  const [newGameImage, setNewGameImage] = useState('');
  const [editingGame, setEditingGame] = useState(null);

  // Modale Nuova / Modifica Stagione
  const [showNewSeasonModal, setShowNewSeasonModal] = useState(false);
  const [newSeasonName, setNewSeasonName] = useState('');
  const [editingSeason, setEditingSeason] = useState(null);

  // Sincronizzazione in tempo reale con Firestore
  useEffect(() => {
    try {
      const unsubMatches = onSnapshot(collection(db, 'matches'), (snapshot) => {
        setMatches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      }, (err) => { console.error(err); setDbError(true); setLoading(false); });

      const unsubGames = onSnapshot(collection(db, 'games'), (snapshot) => {
        setGames(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      const unsubPlayers = onSnapshot(collection(db, 'players'), (snapshot) => {
        setPlayersList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      const unsubSeasons = onSnapshot(collection(db, 'seasons'), (snapshot) => {
        const seasonsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSeasons(seasonsData);
        // Imposta la prima stagione di default se non è impostata
        if (seasonsData.length > 0 && !selectedSeason) {
          setSelectedSeason(seasonsData[0].name);
        } else if (seasonsData.length === 0 && !selectedSeason) {
          setSelectedSeason('Generale');
        }
      });

      return () => {
        unsubMatches();
        unsubGames();
        unsubPlayers();
        unsubSeasons();
      };
    } catch (e) {
      console.error(e);
      setDbError(true);
      setLoading(false);
    }
  }, []);

  const addPlayerRow = () => {
    setMatchPlayers([...matchPlayers, { name: '', score: '' }]);
  };

  const updatePlayerRow = (index, field, value) => {
    const updated = [...matchPlayers];
    updated[index][field] = value;
    setMatchPlayers(updated);
  };

  const removePlayerRow = (index) => {
    setMatchPlayers(matchPlayers.filter((_, i) => i !== index));
  };

  const handleSavePlayer = async (e) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    if (playersList.some(p => p.name.toLowerCase() === newPlayerName.trim().toLowerCase())) {
      alert("Questo giocatore esiste già!");
      return;
    }
    try {
      await addDoc(collection(db, 'players'), { name: newPlayerName.trim() });
      setNewPlayerName('');
      setShowNewPlayerModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveMatch = async (e) => {
    e.preventDefault();
    if (!newMatchGame || matchPlayers.length === 0) return;

    const parsedPlayers = matchPlayers.map(p => ({
      ...p,
      score: Number(p.score) || 0
    }));

    const maxScore = Math.max(...parsedPlayers.map(p => p.score));
    const finalPlayers = parsedPlayers.map(p => ({
      ...p,
      isWinner: p.score === maxScore && maxScore >= 0
    }));

    try {
      await addDoc(collection(db, 'matches'), {
        game: newMatchGame,
        date: newMatchDate,
        season: newMatchSeason || (seasons[0]?.name || 'Generale'),
        notes: newMatchNotes,
        players: finalPlayers,
        createdAt: new Date().toISOString()
      });

      if (!games.some(g => g.name.toLowerCase() === newMatchGame.toLowerCase())) {
        await addDoc(collection(db, 'games'), { name: newMatchGame, image: '' });
      }

      setShowNewMatchModal(false);
      setMatchPlayers([{ name: '', score: '' }]);
      setNewMatchNotes('');
    } catch (err) {
      console.error(err);
      alert("Errore durante il salvataggio.");
    }
  };

  const handleSaveGame = async (e) => {
    e.preventDefault();
    if (!newGameName) return;
    try {
      if (editingGame) {
        await updateDoc(doc(db, 'games', editingGame.id), { name: newGameName, image: newGameImage });
      } else {
        if (!games.some(g => g.name.toLowerCase() === newGameName.toLowerCase())) {
          await addDoc(collection(db, 'games'), { name: newGameName, image: newGameImage });
        }
      }
      setShowNewGameModal(false);
      setNewGameName('');
      setNewGameImage('');
      setEditingGame(null);
    } catch (err) { console.error(err); }
  };

  const handleSaveSeason = async (e) => {
    e.preventDefault();
    if (!newSeasonName.trim()) return;
    try {
      if (editingSeason) {
        await updateDoc(doc(db, 'seasons', editingSeason.id), { name: newSeasonName.trim() });
      } else {
        await addDoc(collection(db, 'seasons'), { name: newSeasonName.trim() });
      }
      setShowNewSeasonModal(false);
      setNewSeasonName('');
      setEditingSeason(null);
    } catch (err) { console.error(err); }
  };

  const handleDeleteSeason = async (id) => {
    if (window.confirm("Vuoi davvero eliminare questa stagione?")) {
      await deleteDoc(doc(db, 'seasons', id));
    }
  };

  const handleDeleteMatch = async (id) => {
    if (window.confirm("Vuoi eliminare questa partita?")) {
      await deleteDoc(doc(db, 'matches', id));
    }
  };

  // Filtro partite in base alla stagione selezionata (Gestisce anche 'all' solo per la classifica)
  const filteredMatches = selectedSeason === 'all' 
    ? matches 
    : matches.filter(m => m.season === selectedSeason);

  const statsMap = {};
  filteredMatches.forEach(m => {
    m.players?.forEach(p => {
      if (!p.name) return;
      if (!statsMap[p.name]) {
        statsMap[p.name] = { name: p.name, played: 0, wins: 0, totalScore: 0 };
      }
      statsMap[p.name].played += 1;
      statsMap[p.name].totalScore += Number(p.score) || 0;
      if (p.isWinner) statsMap[p.name].wins += 1;
    });
  });

  const leaderboard = Object.values(statsMap).sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    return b.wins - a.wins;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-12 overflow-x-hidden selection:bg-indigo-500 selection:text-white">
      {/* Header HUD Moderno */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-indigo-600 to-violet-500 p-2.5 rounded-2xl text-white shadow-lg shadow-indigo-500/20">
              <Trophy size={24} />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
                BoardGame Tracker <span className="text-[10px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded-full">Pro</span>
              </h1>
              <p className="text-[11px] text-slate-400">Gestione avanzata leghe e partite</p>
            </div>
          </div>

          {/* Selettore Stagione visibile solo in Classifica, oppure mostra la stagione attiva altrove */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 shadow-inner">
              <Calendar size={15} className="text-indigo-400" />
              <select 
                value={selectedSeason} 
                onChange={(e) => setSelectedSeason(e.target.value)}
                className="bg-transparent text-xs sm:text-sm font-semibold focus:outline-none text-white cursor-pointer"
              >
                {activeTab === 'classifica' && <option value="all" className="bg-slate-900">✨ Tutte le stagioni</option>}
                {seasons.map(s => (
                  <option key={s.id} value={s.name} className="bg-slate-900">{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      {dbError && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-4">
          <div className="bg-red-950/50 border border-red-800 p-4 rounded-2xl flex items-center gap-3 text-red-200">
            <AlertCircle size={22} className="text-red-400 shrink-0" />
            <p className="text-sm">Errore di connessione a Firebase. Controlla le chiavi di configurazione.</p>
          </div>
        </div>
      )}

      {/* Navigazione HUD a schede */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1">
            <button 
              onClick={() => setActiveTab('classifica')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold text-xs sm:text-sm transition-all whitespace-nowrap ${activeTab === 'classifica' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-400/50' : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            >
              <Trophy size={15} /> Classifica
            </button>
            <button 
              onClick={() => setActiveTab('giochi')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold text-xs sm:text-sm transition-all whitespace-nowrap ${activeTab === 'giochi' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-400/50' : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            >
              <Gamepad2 size={15} /> Giochi
            </button>
            <button 
              onClick={() => setActiveTab('giocatori')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold text-xs sm:text-sm transition-all whitespace-nowrap ${activeTab === 'giocatori' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-400/50' : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            >
              <Users size={15} /> Giocatori
            </button>
            <button 
              onClick={() => setActiveTab('stagioni')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold text-xs sm:text-sm transition-all whitespace-nowrap ${activeTab === 'stagioni' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-400/50' : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            >
              <Calendar size={15} /> Stagioni
            </button>
            <button 
              onClick={() => setActiveTab('cronologia')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold text-xs sm:text-sm transition-all whitespace-nowrap ${activeTab === 'cronologia' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-400/50' : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            >
              <Clock size={15} /> Cronologia
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                if (seasons.length > 0 && !newMatchSeason) setNewMatchSeason(seasons[0].name);
                setShowNewMatchModal(true);
              }}
              className="w-full sm:w-auto items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold text-xs sm:text-sm shadow-lg shadow-emerald-600/20 transition-all flex"
            >
              <Plus size={16} /> Registra Partita
            </button>
          </div>
        </div>
      </div>

      {/* Contenuto principale */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 mt-5">
        {loading ? (
          <div className="text-center py-20 text-slate-500 animate-pulse font-medium text-sm">Sincronizzazione dati cloud...</div>
        ) : (
          <>
            {/* CLASSIFICA */}
            {activeTab === 'classifica' && (
              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-sm">
                <div className="px-5 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/90">
                  <div>
                    <h2 className="font-bold text-base sm:text-lg text-white flex items-center gap-2">
                      <Trophy className="text-amber-400" size={18} /> Classifica Generale ({selectedSeason === 'all' ? 'Tutte le stagioni' : selectedSeason})
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">Ordinata per somma totale dei punti accumulati</p>
                  </div>
                </div>

                {leaderboard.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 text-sm">Nessuna partita registrata in questa stagione.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[500px]">
                      <thead>
                        <tr className="bg-slate-950/60 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
                          <th className="py-3.5 px-5 font-semibold">Pos</th>
                          <th className="py-3.5 px-5 font-semibold">Giocatore</th>
                          <th className="py-3.5 px-5 font-semibold text-center">Partite</th>
                          <th className="py-3.5 px-5 font-semibold text-center">Vittorie</th>
                          <th className="py-3.5 px-5 font-semibold text-center">% Vittorie</th>
                          <th className="py-3.5 px-5 font-semibold text-right">Punti Totali</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-xs sm:text-sm">
                        {leaderboard.map((item, idx) => {
                          const winRate = item.played > 0 ? ((item.wins / item.played) * 100).toFixed(1) : 0;
                          return (
                            <tr key={item.name} className="hover:bg-slate-850/50 transition-colors">
                              <td className="py-3.5 px-5 font-black text-slate-300">
                                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                              </td>
                              <td className="py-3.5 px-5 font-bold text-white flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
                                  {item.name.charAt(0).toUpperCase()}
                                </div>
                                {item.name}
                              </td>
                              <td className="py-3.5 px-5 text-center text-slate-300 font-medium">{item.played}</td>
                              <td className="py-3.5 px-5 text-center font-semibold text-emerald-400">{item.wins}</td>
                              <td className="py-3.5 px-5 text-center font-medium text-indigo-300">{winRate}%</td>
                              <td className="py-3.5 px-5 text-right font-black text-amber-400 text-sm sm:text-base">{item.totalScore}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* GIOCHI */}
            {activeTab === 'giochi' && (
              <div className="space-y-5">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-bold text-white">Libreria Giochi</h2>
                  <button 
                    onClick={() => { setEditingGame(null); setNewGameName(''); setNewGameImage(''); setShowNewGameModal(true); }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-lg shadow-indigo-600/20"
                  >
                    <Plus size={15} /> Aggiungi Gioco
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {games.map(game => {
                    const gameMatches = matches.filter(m => m.game.toLowerCase() === game.name.toLowerCase());
                    return (
                      <div key={game.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col group hover:border-slate-700 transition-all">
                        <div className="h-44 bg-slate-950 relative overflow-hidden flex items-center justify-center">
                          {game.image ? (
                            <img src={game.image} alt={game.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <Gamepad2 size={40} className="text-slate-700" />
                          )}
                          <div className="absolute top-2.5 right-2.5 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-xl text-xs font-bold text-indigo-300 border border-slate-800">
                            {gameMatches.length} partite
                          </div>
                        </div>
                        <div className="p-3.5 flex flex-col flex-1 justify-between gap-3">
                          <h3 className="font-bold text-sm text-white">{game.name}</h3>
                          <button 
                            onClick={() => { setEditingGame(game); setNewGameName(game.name); setNewGameImage(game.image || ''); setShowNewGameModal(true); }}
                            className="w-full bg-slate-800 hover:bg-slate-750 text-slate-300 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700/50 transition-all"
                          >
                            <Edit2 size={12} /> Gestisci Copertina
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* GIOCATORI FISSI */}
            {activeTab === 'giocatori' && (
              <div className="space-y-5">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-bold text-white">Anagrafica Giocatori Fissi</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Gestisci l'elenco dei partecipanti abituali del gruppo</p>
                  </div>
                  <button 
                    onClick={() => setShowNewPlayerModal(true)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-lg shadow-indigo-600/20"
                  >
                    <UserPlus size={15} /> Aggiungi Giocatore
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                  {playersList.length === 0 ? (
                    <div className="col-span-full bg-slate-900 border border-slate-800 p-10 text-center rounded-2xl text-slate-500 text-sm">
                      Nessun giocatore registrato. Aggiungine uno per trovarlo pronto nei menu a tendina!
                    </div>
                  ) : (
                    playersList.map(pl => {
                      const totalMatches = matches.filter(m => m.players?.some(p => p.name.toLowerCase() === pl.name.toLowerCase())).length;
                      return (
                        <div key={pl.id} className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl shadow-lg flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm">
                              {pl.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h3 className="font-bold text-white text-xs sm:text-sm">{pl.name}</h3>
                              <p className="text-[11px] text-slate-400 mt-0.5">{totalMatches} partite totali</p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* STAGIONI (Con tasti Modifica ed Elimina) */}
            {activeTab === 'stagioni' && (
              <div className="space-y-5">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-bold text-white">Stagioni & Leghe</h2>
                  <button 
                    onClick={() => { setEditingSeason(null); setNewSeasonName(''); setShowNewSeasonModal(true); }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-lg shadow-indigo-600/20"
                  >
                    <Plus size={15} /> Nuova Stagione
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  {seasons.map(season => {
                    const count = matches.filter(m => m.season === season.name).length;
                    return (
                      <div key={season.id} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg flex justify-between items-center">
                        <div>
                          <h3 className="font-bold text-sm sm:text-base text-white">{season.name}</h3>
                          <p className="text-xs text-slate-400 mt-0.5">{count} partite registrate</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button 
                            onClick={() => { setEditingSeason(season); setNewSeasonName(season.name); setShowNewSeasonModal(true); }}
                            className="bg-slate-800 hover:bg-slate-750 text-slate-300 p-2 rounded-xl transition-all border border-slate-700/50"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => handleDeleteSeason(season.id)}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 p-2 rounded-xl transition-all border border-red-500/20"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* CRONOLOGIA */}
            {activeTab === 'cronologia' && (
              <div className="space-y-3.5">
                <h2 className="text-lg font-bold text-white mb-2">Cronologia Partite ({selectedSeason === 'all' ? 'Tutte le stagioni' : selectedSeason})</h2>
                {filteredMatches.length === 0 ? (
                  <div className="bg-slate-900 border border-slate-800 p-10 text-center rounded-2xl text-slate-500 text-sm">Nessuna partita trovata.</div>
                ) : (
                  filteredMatches.map(m => (
                    <div key={m.id} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h3 className="font-bold text-sm sm:text-base text-white">{m.game}</h3>
                          <span className="bg-indigo-500/10 text-indigo-300 text-[11px] font-bold px-2 py-0.5 rounded-full border border-indigo-500/20">{m.season}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                          <Calendar size={12} /> {m.date}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          {m.players?.map((p, i) => (
                            <span key={i} className={`text-xs px-2.5 py-1 rounded-xl font-medium flex items-center gap-1 ${p.isWinner ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30' : 'bg-slate-950 text-slate-300 border border-slate-800'}`}>
                              {p.isWinner && '👑'} {p.name}: <strong>{p.score}</strong> pt
                            </span>
                          ))}
                        </div>
                        {m.notes && <p className="text-xs text-slate-400 mt-1.5 italic">Note: "{m.notes}"</p>}
                      </div>
                      <button 
                        onClick={() => handleDeleteMatch(m.id)}
                        className="text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 p-2 rounded-xl transition-all self-end md:self-center border border-red-500/20"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* MODALE REGISTRA PARTITA */}
      {showNewMatchModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-5 py-3.5 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
              <h3 className="font-bold text-sm sm:text-base text-white">Registra Nuova Partita</h3>
              <button onClick={() => setShowNewMatchModal(false)} className="text-slate-400 hover:text-white font-bold text-lg">&times;</button>
            </div>
            
            <form onSubmit={handleSaveMatch} className="p-5 overflow-y-auto space-y-3.5 flex-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Nome Gioco</label>
                <input 
                  type="text" 
                  list="games-list" 
                  required
                  placeholder="Es. Catan, Ticket to Ride..." 
                  value={newMatchGame}
                  onChange={(e) => setNewMatchGame(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500"
                />
                <datalist id="games-list">
                  {games.map(g => <option key={g.id} value={g.name} />)}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Data</label>
                  <input 
                    type="date" 
                    required
                    value={newMatchDate}
                    onChange={(e) => setNewMatchDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Stagione</label>
                  <select 
                    value={newMatchSeason}
                    onChange={(e) => setNewMatchSeason(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    {seasons.map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Partecipanti e Punti (Vincitore automatico)</label>
                  <button type="button" onClick={addPlayerRow} className="text-xs text-indigo-400 hover:underline font-bold">+ Aggiungi riga</button>
                </div>
                <div className="space-y-2">
                  {matchPlayers.map((p, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <select 
                        required
                        value={p.name}
                        onChange={(e) => updatePlayerRow(index, 'name', e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">Seleziona giocatore...</option>
                        {playersList.map(pl => (
                          <option key={pl.id} value={pl.name}>{pl.name}</option>
                        ))}
                      </select>
                      <input 
                        type="number" 
                        placeholder="Punti"
                        required
                        value={p.score}
                        onChange={(e) => updatePlayerRow(index, 'score', e.target.value)}
                        className="w-24 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                      {matchPlayers.length > 1 && (
                        <button type="button" onClick={() => removePlayerRow(index)} className="text-red-400 hover:text-red-300 p-1.5">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Note (Opzionale)</label>
                <textarea 
                  rows="2"
                  value={newMatchNotes}
                  onChange={(e) => setNewMatchNotes(e.target.value)}
                  placeholder="Es. Partita decisa all'ultimo turno..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500"
                ></textarea>
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button type="button" onClick={() => setShowNewMatchModal(false)} className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700">Annulla</button>
                <button type="submit" className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20">Salva Partita</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE NUOVO GIOCATORE FISSO */}
      {showNewPlayerModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="px-5 py-3.5 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
              <h3 className="font-bold text-sm sm:text-base text-white">Aggiungi Giocatore Fisso</h3>
              <button onClick={() => setShowNewPlayerModal(false)} className="text-slate-400 hover:text-white font-bold text-lg">&times;</button>
            </div>
            
            <form onSubmit={handleSavePlayer} className="p-5 space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Nome Giocatore</label>
                <input 
                  type="text" 
                  required
                  placeholder="Es. Mario"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button type="button" onClick={() => setShowNewPlayerModal(false)} className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700">Annulla</button>
                <button type="submit" className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20">Salva</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE GIOCO / IMMAGINE */}
      {showNewGameModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-5 py-3.5 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
              <h3 className="font-bold text-sm sm:text-base text-white">{editingGame ? 'Modifica Gioco' : 'Aggiungi Gioco'}</h3>
              <button onClick={() => setShowNewGameModal(false)} className="text-slate-400 hover:text-white font-bold text-lg">&times;</button>
            </div>
            
            <form onSubmit={handleSaveGame} className="p-5 space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Nome Gioco</label>
                <input 
                  type="text" 
                  required
                  disabled={!!editingGame}
                  value={newGameName}
                  onChange={(e) => setNewGameName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">URL Immagine Copertina</label>
                <input 
                  type="url" 
                  placeholder="https://esempio.com/copertina.jpg"
                  value={newGameImage}
                  onChange={(e) => setNewGameImage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button type="button" onClick={() => setShowNewGameModal(false)} className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700">Annulla</button>
                <button type="submit" className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20">Salva</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE STAGIONE (Crea o Modifica) */}
      {showNewSeasonModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="px-5 py-3.5 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
              <h3 className="font-bold text-sm sm:text-base text-white">{editingSeason ? 'Modifica Stagione' : 'Nuova Stagione'}</h3>
              <button onClick={() => setShowNewSeasonModal(false)} className="text-slate-400 hover:text-white font-bold text-lg">&times;</button>
            </div>
            
            <form onSubmit={handleSaveSeason} className="p-5 space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Nome Stagione</label>
                <input 
                  type="text" 
                  required
                  placeholder="Es. Lega Inverno 2026"
                  value={newSeasonName}
                  onChange={(e) => setNewSeasonName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button type="button" onClick={() => setShowNewSeasonModal(false)} className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700">Annulla</button>
                <button type="submit" className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20">Salva</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
