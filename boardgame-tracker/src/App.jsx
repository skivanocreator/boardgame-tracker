import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, getDocs, addDoc, deleteDoc, doc, updateDoc, onSnapshot 
} from 'firebase/firestore';
import { 
  Trophy, Plus, Users, Calendar, Clock, Gamepad2, Trash2, Edit2, CheckCircle, AlertCircle, Image as ImageIcon, Sparkles 
} from 'lucide-react';

// Configurazione Firebase con le tue chiavi
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
  const [seasons, setSeasons] = useState([{ id: 'all', name: 'Tutte le stagioni' }]);
  const [selectedSeason, setSelectedSeason] = useState('all');
  
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(false);

  // Modale Nuova Partita
  const [showNewMatchModal, setShowNewMatchModal] = useState(false);
  const [newMatchGame, setNewMatchGame] = useState('');
  const [newMatchDate, setNewMatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [newMatchSeason, setNewMatchSeason] = useState('');
  const [newMatchNotes, setNewMatchNotes] = useState('');
  const [matchPlayers, setMatchPlayers] = useState([{ name: '', score: '', isWinner: false }]);

  // Modale Nuovo Gioco / Immagine
  const [showNewGameModal, setShowNewGameModal] = useState(false);
  const [newGameName, setNewGameName] = useState('');
  const [newGameImage, setNewGameImage] = useState('');
  const [editingGame, setEditingGame] = useState(null);

  // Modale Nuova Stagione
  const [showNewSeasonModal, setShowNewSeasonModal] = useState(false);
  const [newSeasonName, setNewSeasonName] = useState('');

  // Sincronizzazione in tempo reale con Firestore
  useEffect(() => {
    try {
      const unsubMatches = onSnapshot(collection(db, 'matches'), (snapshot) => {
        const matchesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMatches(matchesData);
        setLoading(false);
      }, (error) => {
        console.error("Errore matches:", error);
        setDbError(true);
        setLoading(false);
      });

      const unsubGames = onSnapshot(collection(db, 'games'), (snapshot) => {
        const gamesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setGames(gamesData);
      }, (error) => {
        console.error("Errore games:", error);
      });

      const unsubSeasons = onSnapshot(collection(db, 'seasons'), (snapshot) => {
        const seasonsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSeasons([{ id: 'all', name: 'Tutte le stagioni' }, ...seasonsData]);
      }, (error) => {
        console.error("Errore seasons:", error);
      });

      return () => {
        unsubMatches();
        unsubGames();
        unsubSeasons();
      };
    } catch (e) {
      console.error(e);
      setDbError(true);
      setLoading(false);
    }
  }, []);

  // Aggiungi Giocatore alla modale partita
  const addPlayerRow = () => {
    setMatchPlayers([...matchPlayers, { name: '', score: '', isWinner: false }]);
  };

  const updatePlayerRow = (index, field, value) => {
    const updated = [...matchPlayers];
    updated[index][field] = value;
    setMatchPlayers(updated);
  };

  const removePlayerRow = (index) => {
    setMatchPlayers(matchPlayers.filter((_, i) => i !== index));
  };

  // Salva Partita
  const handleSaveMatch = async (e) => {
    e.preventDefault();
    if (!newMatchGame || matchPlayers.length === 0) return;

    try {
      await addDoc(collection(db, 'matches'), {
        game: newMatchGame,
        date: newMatchDate,
        season: newMatchSeason || 'Generale',
        notes: newMatchNotes,
        players: matchPlayers.map(p => ({ ...p, score: Number(p.score) || 0 })),
        createdAt: new Date().toISOString()
      });

      // Se il gioco non è ancora nella lista, lo aggiungiamo in automatico
      if (!games.some(g => g.name.toLowerCase() === newMatchGame.toLowerCase())) {
        await addDoc(collection(db, 'games'), { name: newMatchGame, image: '' });
      }

      setShowNewMatchModal(false);
      setMatchPlayers([{ name: '', score: '', isWinner: false }]);
      setNewMatchNotes('');
    } catch (err) {
      console.error("Errore salvataggio partita:", err);
      alert("Errore durante il salvataggio della partita.");
    }
  };

  // Salva o Modifica Gioco
  const handleSaveGame = async (e) => {
    e.preventDefault();
    if (!newGameName) return;

    try {
      if (editingGame) {
        await updateDoc(doc(db, 'games', editingGame.id), {
          name: newGameName,
          image: newGameImage
        });
      } else {
        if (!games.some(g => g.name.toLowerCase() === newGameName.toLowerCase())) {
          await addDoc(collection(db, 'games'), { name: newGameName, image: newGameImage });
        }
      }
      setShowNewGameModal(false);
      setNewGameName('');
      setNewGameImage('');
      setEditingGame(null);
    } catch (err) {
      console.error("Errore salvataggio gioco:", err);
    }
  };

  // Salva Stagione
  const handleSaveSeason = async (e) => {
    e.preventDefault();
    if (!newSeasonName) return;
    try {
      await addDoc(collection(db, 'seasons'), { name: newSeasonName });
      setShowNewSeasonModal(false);
      setNewSeasonName('');
    } catch (err) {
      console.error("Errore salvataggio stagione:", err);
    }
  };

  const handleDeleteMatch = async (id) => {
    if (window.confirm("Vuoi davvero eliminare questa partita?")) {
      await deleteDoc(doc(db, 'matches', id));
    }
  };

  // Filtra partite per stagione selezionata
  const filteredMatches = selectedSeason === 'all' 
    ? matches 
    : matches.filter(m => m.season === selectedSeason);

  // Calcolo Classifiche
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
    if (b.wins !== a.wins) return b.wins - a.wins;
    return (b.wins / (b.played || 1)) - (a.wins / (a.played || 1));
  });

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans pb-12">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-md">
              <Trophy size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">BoardGame Tracker</h1>
              <p className="text-xs text-indigo-400 font-medium">Gestione Partite & Leghe da Tavolo</p>
            </div>
          </div>

          {/* Selettore Stagione */}
          <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700">
            <Calendar size={18} className="text-indigo-400" />
            <select 
              value={selectedSeason} 
              onChange={(e) => setSelectedSeason(e.target.value)}
              className="bg-transparent text-sm font-semibold focus:outline-none text-white cursor-pointer"
            >
              {seasons.map(s => (
                <option key={s.id} value={s.name} className="bg-slate-800">{s.name}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Notifiche Database */}
      {dbError && (
        <div className="max-w-6xl mx-auto px-4 mt-4">
          <div className="bg-red-900/40 border border-red-700 p-4 rounded-xl flex items-center gap-3 text-red-200">
            <AlertCircle size={24} className="text-red-400 shrink-0" />
            <p className="text-sm">Errore di connessione a Firebase. Verifica la configurazione nel codice.</p>
          </div>
        </div>
      )}

      {/* Navigazione */}
      <div className="max-w-6xl mx-auto px-4 mt-6">
        <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-4">
          <button 
            onClick={() => setActiveTab('classifica')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${activeTab === 'classifica' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
          >
            <Trophy size={18} /> Classifica
          </button>
          <button 
            onClick={() => setActiveTab('giochi')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${activeTab === 'giochi' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
          >
            <Gamepad2 size={18} /> Giochi & Copertine
          </button>
          <button 
            onClick={() => setActiveTab('stagioni')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${activeTab === 'stagioni' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
          >
            <Calendar size={18} /> Stagioni
          </button>
          <button 
            onClick={() => setActiveTab('cronologia')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${activeTab === 'cronologia' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
          >
            <Clock size={18} /> Cronologia Partite
          </button>

          <div className="ml-auto flex gap-2">
            <button 
              onClick={() => setShowNewMatchModal(true)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg shadow-emerald-600/30 transition-all"
            >
              <Plus size={18} /> Registra Partita
            </button>
          </div>
        </div>
      </div>

      {/* Contenuto Principale */}
      <main className="max-w-6xl mx-auto px-4 mt-6">
        {loading ? (
          <div className="text-center py-20 text-slate-400">Caricamento dati dal cloud in corso...</div>
        ) : (
          <>
            {/* TAB CLASSIFICA */}
            {activeTab === 'classifica' && (
              <div className="space-y-6">
                <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
                  <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center">
                    <h2 className="font-bold text-lg flex items-center gap-2 text-white">
                      <Trophy className="text-amber-400" size={20} /> Classifica Giocatori ({selectedSeason})
                    </h2>
                  </div>
                  {leaderboard.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">Nessuna partita registrata in questa stagione. Inizia aggiungendone una!</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-700">
                            <th className="py-3 px-6">Pos</th>
                            <th className="py-3 px-6">Giocatore</th>
                            <th className="py-3 px-6 text-center">Partite</th>
                            <th className="py-3 px-6 text-center">Vittorie</th>
                            <th className="py-3 px-6 text-center">% Vittorie</th>
                            <th className="py-3 px-6 text-right">Punti Totali</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50 text-sm">
                          {leaderboard.map((item, idx) => {
                            const winRate = item.played > 0 ? ((item.wins / item.played) * 100).toFixed(1) : 0;
                            return (
                              <tr key={item.name} className="hover:bg-slate-750 transition-colors">
                                <td className="py-4 px-6 font-black">
                                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                                </td>
                                <td className="py-4 px-6 font-bold text-white flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                                    {item.name.charAt(0).toUpperCase()}
                                  </div>
                                  {item.name}
                                </td>
                                <td className="py-4 px-6 text-center text-slate-300">{item.played}</td>
                                <td className="py-4 px-6 text-center font-semibold text-emerald-400">{item.wins}</td>
                                <td className="py-4 px-6 text-center font-medium text-indigo-300">{winRate}%</td>
                                <td className="py-4 px-6 text-right font-bold text-amber-300">{item.totalScore}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB GIOCHI */}
            {activeTab === 'giochi' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-white">Libreria Giochi & Copertine</h2>
                  <button 
                    onClick={() => { setEditingGame(null); setNewGameName(''); setNewGameImage(''); setShowNewGameModal(true); }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-md"
                  >
                    <Plus size={16} /> Aggiungi Gioco
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {games.map(game => {
                    const gameMatches = matches.filter(m => m.game.toLowerCase() === game.name.toLowerCase());
                    return (
                      <div key={game.id} className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-lg flex flex-col">
                        <div className="h-44 bg-slate-900 relative overflow-hidden flex items-center justify-center">
                          {game.image ? (
                            <img src={game.image} alt={game.name} className="w-full h-full object-cover" />
                          ) : (
                            <Gamepad2 size={48} className="text-slate-600" />
                          )}
                          <div className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur px-2.5 py-1 rounded-lg text-xs font-bold text-indigo-300 border border-slate-700">
                            {gameMatches.length} partite
                          </div>
                        </div>
                        <div className="p-4 flex flex-col flex-1 justify-between gap-4">
                          <div>
                            <h3 className="font-bold text-lg text-white">{game.name}</h3>
                          </div>
                          <button 
                            onClick={() => { setEditingGame(game); setNewGameName(game.name); setNewGameImage(game.image || ''); setShowNewGameModal(true); }}
                            className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                          >
                            <Edit2 size={14} /> Modifica Copertina
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB STAGIONI */}
            {activeTab === 'stagioni' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-white">Stagioni & Leghe</h2>
                  <button 
                    onClick={() => setShowNewSeasonModal(true)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-md"
                  >
                    <Plus size={16} /> Nuova Stagione
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {seasons.map(season => {
                    if (season.id === 'all') return null;
                    const count = matches.filter(m => m.season === season.name).length;
                    return (
                      <div key={season.id} className="bg-slate-800 border border-slate-700 p-5 rounded-2xl shadow-lg flex justify-between items-center">
                        <div>
                          <h3 className="font-bold text-lg text-white">{season.name}</h3>
                          <p className="text-xs text-slate-400 mt-1">{count} partite registrate</p>
                        </div>
                        <Calendar className="text-indigo-400" size={28} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB CRONOLOGIA */}
            {activeTab === 'cronologia' && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-white mb-4">Cronologia Partite ({selectedSeason})</h2>
                {filteredMatches.length === 0 ? (
                  <div className="bg-slate-800 border border-slate-700 p-12 text-center rounded-2xl text-slate-400">Nessuna partita trovata.</div>
                ) : (
                  filteredMatches.map(m => (
                    <div key={m.id} className="bg-slate-800 border border-slate-700 p-5 rounded-2xl shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="font-bold text-lg text-white">{m.game}</h3>
                          <span className="bg-indigo-500/20 text-indigo-300 text-xs font-bold px-2.5 py-0.5 rounded-full border border-indigo-500/30">{m.season}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                          <Calendar size={14} /> {m.date}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {m.players?.map((p, i) => (
                            <span key={i} className={`text-xs px-2.5 py-1 rounded-xl font-medium flex items-center gap-1.5 ${p.isWinner ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-900 text-slate-300 border border-slate-700'}`}>
                              {p.isWinner && '👑'} {p.name}: <strong>{p.score}</strong> pt
                            </span>
                          ))}
                        </div>
                        {m.notes && <p className="text-xs text-slate-400 mt-2 italic">Note: "{m.notes}"</p>}
                      </div>
                      <button 
                        onClick={() => handleDeleteMatch(m.id)}
                        className="text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 p-2.5 rounded-xl transition-all self-end md:self-center"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* MODALE NUOVA PARTITA */}
      {showNewMatchModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center">
              <h3 className="font-bold text-lg text-white">Registra Nuova Partita</h3>
              <button onClick={() => setShowNewMatchModal(false)} className="text-slate-400 hover:text-white font-bold text-xl">&times;</button>
            </div>
            
            <form onSubmit={handleSaveMatch} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Nome Gioco</label>
                <input 
                  type="text" 
                  list="games-list" 
                  required
                  placeholder="Es. Catan, Ticket to Ride..." 
                  value={newMatchGame}
                  onChange={(e) => setNewMatchGame(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
                <datalist id="games-list">
                  {games.map(g => <option key={g.id} value={g.name} />)}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Data</label>
                  <input 
                    type="date" 
                    required
                    value={newMatchDate}
                    onChange={(e) => setNewMatchDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Stagione</label>
                  <select 
                    value={newMatchSeason}
                    onChange={(e) => setNewMatchSeason(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Generale">Generale</option>
                    {seasons.filter(s => s.id !== 'all').map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Giocatori e Punteggi</label>
                  <button type="button" onClick={addPlayerRow} className="text-xs text-indigo-400 hover:underline font-bold">+ Aggiungi giocatore</button>
                </div>
                <div className="space-y-2">
                  {matchPlayers.map((p, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input 
                        type="text" 
                        placeholder="Nome"
                        required
                        value={p.name}
                        onChange={(e) => updatePlayerRow(index, 'name', e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                      />
                      <input 
                        type="number" 
                        placeholder="Punti"
                        value={p.score}
                        onChange={(e) => updatePlayerRow(index, 'score', e.target.value)}
                        className="w-24 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                      />
                      <label className="flex items-center gap-1 text-xs text-amber-300 font-bold cursor-pointer px-2">
                        <input 
                          type="checkbox"
                          checked={p.isWinner}
                          onChange={(e) => updatePlayerRow(index, 'isWinner', e.target.checked)}
                          className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0"
                        /> 👑 Vinto
                      </label>
                      {matchPlayers.length > 1 && (
                        <button type="button" onClick={() => removePlayerRow(index)} className="text-red-400 hover:text-red-300 p-1">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Note (Opzionale)</label>
                <textarea 
                  rows="2"
                  value={newMatchNotes}
                  onChange={(e) => setNewMatchNotes(e.target.value)}
                  placeholder="Es. Partita decisa all'ultimo turno..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                ></textarea>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowNewMatchModal(false)} className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-700 text-slate-300 hover:bg-slate-600">Annulla</button>
                <button type="submit" className="px-5 py-2 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/30">Salva Partita</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE GIOCO / IMMAGINE */}
      {showNewGameModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center">
              <h3 className="font-bold text-lg text-white">{editingGame ? 'Modifica Gioco & Copertina' : 'Aggiungi Nuovo Gioco'}</h3>
              <button onClick={() => setShowNewGameModal(false)} className="text-slate-400 hover:text-white font-bold text-xl">&times;</button>
            </div>
            
            <form onSubmit={handleSaveGame} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Nome Gioco</label>
                <input 
                  type="text" 
                  required
                  disabled={!!editingGame}
                  value={newGameName}
                  onChange={(e) => setNewGameName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">URL Immagine Copertina</label>
                <input 
                  type="url" 
                  placeholder="https://esempio.com/copertina.jpg"
                  value={newGameImage}
                  onChange={(e) => setNewGameImage(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
                <p className="text-xs text-slate-500 mt-1">Incolla il link diretto di un'immagine dal web.</p>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowNewGameModal(false)} className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-700 text-slate-300 hover:bg-slate-600">Annulla</button>
                <button type="submit" className="px-5 py-2 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/30">Salva Gioco</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE STAGIONE */}
      {showNewSeasonModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center">
              <h3 className="font-bold text-lg text-white">Nuova Stagione / Lega</h3>
              <button onClick={() => setShowNewSeasonModal(false)} className="text-slate-400 hover:text-white font-bold text-xl">&times;</button>
            </div>
            
            <form onSubmit={handleSaveSeason} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Nome Stagione</label>
                <input 
                  type="text" 
                  required
                  placeholder="Es. Lega Inverno 2026"
                  value={newSeasonName}
                  onChange={(e) => setNewSeasonName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowNewSeasonModal(false)} className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-700 text-slate-300 hover:bg-slate-600">Annulla</button>
                <button type="submit" className="px-5 py-2 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/30">Crea Stagione</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
