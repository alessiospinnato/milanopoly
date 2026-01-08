import React, { useState, useEffect, useRef } from 'react';
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, MapPin, DollarSign, Train, AlertCircle, Trophy, User, Users, Clock, LogOut, Play, Plus, Settings } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, updateDoc, onSnapshot, arrayUnion, getDocs } from 'firebase/firestore';

// --- CONFIGURAZIONE FIREBASE ---
// ISTRUZIONI PER IL DEPLOY:
// 1. Vai su Firebase Console > Project Settings > General > Your Apps.
// 2. Copia i valori della tua configurazione.
// 3. Incollali qui sotto al posto delle stringhe vuote.
const firebaseConfig = {
  apiKey: "AIzaSyCdF-gTcyLWPopiUpc7Jeyo8v6eVYS21Tk",
  authDomain: "milanopoly-b37cc.firebaseapp.com",
  projectId: "milanopoly-b37cc",
  storageBucket: "milanopoly-b37cc.firebasestorage.app",
  messagingSenderId: "1046490976168",
  appId: "1:1046490976168:web:46a9a9e828ce5b673e979d",
  measurementId: "G-M6LKX7791H"
};

// --- LOGICA DI INIZIALIZZAZIONE ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
let db, auth;
let firebaseInitialized = false;

// Funzione helper per determinare se la config è stata inserita nel codice
const isConfigValid = (config) => config && config.apiKey && config.apiKey.length > 0;

// Tentativo di inizializzazione
try {
  // 1. Priorità assoluta: Configurazione hardcodata nel file (per il deploy)
  if (isConfigValid(firebaseConfig)) {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    firebaseInitialized = true;
  } 
  // 2. Fallback: Ambiente Canvas (Preview)
  else if (typeof __firebase_config !== 'undefined' && __firebase_config) {
    const app = initializeApp(JSON.parse(__firebase_config));
    auth = getAuth(app);
    db = getFirestore(app);
    firebaseInitialized = true;
  }
  // 3. Fallback: LocalStorage (Sviluppo Locale senza hardcoding)
  else {
    const localConfig = localStorage.getItem('milanopoly_firebase_config');
    if (localConfig) {
      const parsed = JSON.parse(localConfig);
      const app = initializeApp(parsed);
      auth = getAuth(app);
      db = getFirestore(app);
      firebaseInitialized = true;
    }
  }
} catch (e) {
  console.error("Errore inizializzazione Firebase:", e);
}

// --- COSTANTI DI GIOCO ---
const BOARD_SIZE = 24;
const INITIAL_MONEY = 1500;
const PASSING_GO_REWARD = 200;
const TURN_TIMEOUT_SECONDS = 120; // 2 minuti
const TIMEOUT_PENALTY = 100;

// Tipi di caselle
const SPACES = [
  { id: 0, name: "VIA!", type: "CORNER", color: "bg-green-100" },
  { id: 1, name: "Via Padova", type: "PROPERTY", price: 60, rent: 4, group: "brown", color: "bg-amber-800" },
  { id: 2, name: "Viale Monza", type: "PROPERTY", price: 60, rent: 4, group: "brown", color: "bg-amber-800" },
  { id: 3, name: "Tassa Rifiuti", type: "TAX", amount: 100, color: "bg-gray-200" },
  { id: 4, name: "Stazione Centrale", type: "STATION", price: 200, rent: 25, color: "bg-slate-800" },
  { id: 5, name: "Porta Romana", type: "PROPERTY", price: 100, rent: 8, group: "light_blue", color: "bg-sky-300" },
  { id: 6, name: "C.so Buenos Aires", type: "PROPERTY", price: 120, rent: 10, group: "light_blue", color: "bg-sky-300" },
  { id: 7, name: "Prigione", type: "CORNER", color: "bg-orange-100" },
  { id: 8, name: "Navigli", type: "PROPERTY", price: 140, rent: 14, group: "pink", color: "bg-fuchsia-400" },
  { id: 9, name: "Darsena", type: "PROPERTY", price: 160, rent: 16, group: "pink", color: "bg-fuchsia-400" },
  { id: 10, name: "Metro M1", type: "STATION", price: 200, rent: 25, color: "bg-red-600" },
  { id: 11, name: "Brera", type: "PROPERTY", price: 180, rent: 18, group: "orange", color: "bg-orange-500" },
  { id: 12, name: "Via Solferino", type: "PROPERTY", price: 200, rent: 20, group: "orange", color: "bg-orange-500" },
  { id: 13, name: "Parcheggio", type: "CORNER", color: "bg-blue-100" },
  { id: 14, name: "City Life", type: "PROPERTY", price: 220, rent: 22, group: "red", color: "bg-red-500" },
  { id: 15, name: "P.zza Gae Aulenti", type: "PROPERTY", price: 240, rent: 24, group: "red", color: "bg-red-500" },
  { id: 16, name: "Metro M5", type: "STATION", price: 200, rent: 25, color: "bg-purple-600" },
  { id: 17, name: "Castello Sforzesco", type: "PROPERTY", price: 260, rent: 26, group: "yellow", color: "bg-yellow-400" },
  { id: 18, name: "Parco Sempione", type: "PROPERTY", price: 280, rent: 28, group: "yellow", color: "bg-yellow-400" },
  { id: 19, name: "Andare in Prigione", type: "CORNER", color: "bg-gray-800 text-white" },
  { id: 20, name: "Galleria V.E.", type: "PROPERTY", price: 300, rent: 30, group: "green", color: "bg-green-600" },
  { id: 21, name: "Area C", type: "TAX", amount: 200, color: "bg-gray-300" },
  { id: 22, name: "Piazza Duomo", type: "PROPERTY", price: 350, rent: 35, group: "blue", color: "bg-blue-800" },
  { id: 23, name: "Via Montenapoleone", type: "PROPERTY", price: 400, rent: 50, group: "blue", color: "bg-blue-800" },
];

const PLAYER_COLORS = ['blue', 'red', 'green', 'yellow'];

const DiceIcon = ({ value, className }) => {
  const icons = [Dice1, Dice2, Dice3, Dice4, Dice5, Dice6];
  const Icon = icons[value - 1] || Dice1;
  return <Icon className={className} />;
};

// Componente per Setup Configurazione (Visibile solo se manca la config nel codice)
const ConfigScreen = () => {
  const [configInput, setConfigInput] = useState('');
  const [error, setError] = useState('');

  const handleSave = () => {
    try {
      const parsed = JSON.parse(configInput);
      if (!parsed.apiKey || !parsed.projectId) {
        throw new Error("Il JSON non sembra una configurazione Firebase valida.");
      }
      localStorage.setItem('milanopoly_firebase_config', JSON.stringify(parsed));
      window.location.reload();
    } catch (e) {
      setError("JSON non valido: " + e.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
      <div className="bg-white p-8 rounded-xl shadow-xl max-w-lg w-full">
        <h1 className="text-2xl font-bold text-blue-900 mb-4 flex items-center gap-2">
          <Settings /> Configurazione Mancante
        </h1>
        <p className="text-slate-600 mb-4 text-sm">
          Per giocare online, devi collegare un progetto Firebase.
        </p>
        
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 text-xs text-yellow-800">
           <strong>Consiglio per il Deploy:</strong> Invece di usare questo form, apri il file <code>MilanoPoly.jsx</code> e incolla la configurazione direttamente nella variabile <code>firebaseConfig</code> in alto.
        </div>

        <ol className="list-decimal list-inside text-sm text-slate-500 mb-4 space-y-1">
          <li>Vai su <a href="https://console.firebase.google.com/" target="_blank" className="text-blue-600 underline">Firebase Console</a></li>
          <li>Copia l'oggetto <code>firebaseConfig</code> della tua Web App</li>
          <li>Incollalo qui sotto (o meglio, nel codice sorgente):</li>
        </ol>
        
        <textarea
          className="w-full h-40 p-3 border rounded font-mono text-xs bg-slate-50 mb-2"
          placeholder='{ "apiKey": "...", "authDomain": "...", ... }'
          value={configInput}
          onChange={(e) => setConfigInput(e.target.value)}
        />
        
        {error && <div className="text-red-500 text-xs mb-4">{error}</div>}
        
        <button 
          onClick={handleSave}
          className="w-full py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 transition"
        >
          Salva (Solo per questo browser)
        </button>
      </div>
    </div>
  );
};

export default function MilanoPoly() {
  // Se firebase non è configurato, mostra schermata di setup
  if (!firebaseInitialized) {
    return <ConfigScreen />;
  }

  const [user, setUser] = useState(null);
  const [activeGameId, setActiveGameId] = useState(null);
  const [gameData, setGameData] = useState(null);
  const [gamesList, setGamesList] = useState([]);
  const [view, setView] = useState('LOADING'); // LOADING, MENU, LOBBY, GAME
  
  // Auth Setup
  useEffect(() => {
    if (!auth) return;

    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth error:", err);
      }
    };
    initAuth();
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) setView('MENU');
    });
  }, []);

  // iOS Scroll Fix
  useEffect(() => {
    document.body.style.overscrollBehavior = 'none';
    return () => { document.body.style.overscrollBehavior = 'auto'; };
  }, []);

  // Listener per la lista partite (Menu)
  useEffect(() => {
    if (!user || view !== 'MENU' || !db) return;
    const q = collection(db, 'artifacts', appId, 'public', 'data', 'games');
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setGamesList(list.filter(g => g.status === 'LOBBY' || g.players.some(p => p.uid === user.uid)));
    });
    return () => unsub();
  }, [user, view]);

  // Listener per la partita attiva
  useEffect(() => {
    if (!user || !activeGameId || !db) return;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'games', activeGameId);
    
    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setGameData(data);
        if (data.status === 'PLAYING' || data.status === 'GAME_OVER') {
          setView('GAME');
        } else {
          setView('LOBBY');
        }
      } else {
        setActiveGameId(null);
        setView('MENU');
      }
    });
    return () => unsub();
  }, [activeGameId, user]);

  // --- AZIONI LOBBY ---

  const createGame = async (gameName, maxPlayers) => {
    if (!gameName) return;
    const newGameRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'games'));
    const initialPlayer = {
      uid: user.uid,
      name: "Host " + user.uid.slice(0, 4),
      color: PLAYER_COLORS[0],
      money: INITIAL_MONEY,
      position: 0,
      properties: [],
      inJail: false,
      isHost: true
    };

    await setDoc(newGameRef, {
      hostId: user.uid,
      name: gameName,
      maxPlayers: parseInt(maxPlayers),
      status: 'LOBBY',
      players: [initialPlayer],
      currentTurnIndex: 0,
      turnExpiresAt: Date.now() + 999999999, // Placeholder
      dice: [1, 1],
      ownership: {},
      logs: ["Partita creata. In attesa di giocatori..."],
      winner: null
    });
    setActiveGameId(newGameRef.id);
  };

  const joinGame = async (gameId) => {
    const gameRef = doc(db, 'artifacts', appId, 'public', 'data', 'games', gameId);
    const game = gamesList.find(g => g.id === gameId);
    if (!game) return;
    
    if (game.players.some(p => p.uid === user.uid)) {
        setActiveGameId(gameId);
        return;
    }
    
    if (game.players.length >= game.maxPlayers) {
      alert("Partita piena!");
      return;
    }

    const newPlayer = {
      uid: user.uid,
      name: "Player " + user.uid.slice(0, 4),
      color: PLAYER_COLORS[game.players.length],
      money: INITIAL_MONEY,
      position: 0,
      properties: [],
      inJail: false,
      isHost: false
    };

    await updateDoc(gameRef, {
      players: arrayUnion(newPlayer),
      logs: arrayUnion(`Un nuovo giocatore si è unito!`)
    });
    setActiveGameId(gameId);
  };

  const startGame = async () => {
    if (!gameData || gameData.hostId !== user.uid) return;
    const gameRef = doc(db, 'artifacts', appId, 'public', 'data', 'games', activeGameId);
    await updateDoc(gameRef, {
      status: 'PLAYING',
      turnExpiresAt: Date.now() + (TURN_TIMEOUT_SECONDS * 1000),
      logs: arrayUnion("La partita è iniziata! Buona fortuna.")
    });
  };

  const leaveGame = async () => {
    setActiveGameId(null);
    setGameData(null);
    setView('MENU');
  };

  // --- UI SWITCHING ---

  if (view === 'LOADING') return <div className="h-screen flex items-center justify-center bg-slate-100">Caricamento...</div>;

  if (view === 'MENU') {
    return (
      <div className="min-h-screen bg-slate-100 p-4 flex flex-col items-center justify-center font-sans">
        <div className="max-w-md w-full bg-white rounded-xl shadow-xl p-6">
          <h1 className="text-3xl font-black text-blue-800 mb-6 text-center flex items-center justify-center gap-2">
            <MapPin /> MilanoPoly Online
          </h1>
          
          <div className="mb-8 border-b pb-6">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2"><Plus size={18}/> Crea Nuova Partita</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              createGame(e.target.gname.value, e.target.gmax.value);
            }} className="space-y-3">
              <input name="gname" placeholder="Nome Partita (es. Tavolo 1)" className="w-full p-2 border rounded" required maxLength={15} />
              <select name="gmax" className="w-full p-2 border rounded">
                <option value="2">2 Giocatori</option>
                <option value="3">3 Giocatori</option>
                <option value="4">4 Giocatori</option>
              </select>
              <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700">Crea Stanza</button>
            </form>
          </div>

          <div>
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2"><Users size={18}/> Unisciti a una Partita</h2>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {gamesList.length === 0 && <p className="text-gray-500 text-sm italic">Nessuna partita trovata.</p>}
              {gamesList.map(g => (
                <div key={g.id} className="border p-3 rounded flex justify-between items-center bg-slate-50">
                  <div>
                    <div className="font-bold">{g.name}</div>
                    <div className="text-xs text-gray-500">{g.players.length}/{g.maxPlayers} Giocatori • {g.status}</div>
                  </div>
                  <button 
                    onClick={() => joinGame(g.id)}
                    className="px-3 py-1 bg-green-500 text-white text-sm rounded font-bold hover:bg-green-600"
                  >
                    {g.players.some(p => p.uid === user.uid) ? "Rientra" : "Entra"}
                  </button>
                </div>
              ))}
            </div>
          </div>
          
          {/* Pulsante per resettare config */}
          <div className="mt-6 text-center">
            <button 
              onClick={() => { localStorage.removeItem('milanopoly_firebase_config'); window.location.reload(); }}
              className="text-xs text-slate-400 hover:text-red-500 underline"
            >
              Reset Configurazione Firebase
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'LOBBY') {
    return (
      <div className="min-h-screen bg-slate-100 p-4 flex flex-col items-center justify-center font-sans">
        <div className="max-w-md w-full bg-white rounded-xl shadow-xl p-6 text-center">
          <h2 className="text-2xl font-bold mb-2">{gameData?.name}</h2>
          <p className="text-gray-500 mb-6">In attesa che l'host avvii la partita...</p>
          
          <div className="space-y-2 mb-6 text-left">
            {gameData?.players.map((p, i) => (
               <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                 <div className={`w-3 h-3 rounded-full bg-${p.color}-600`}></div>
                 <span className="font-bold">{p.name}</span>
                 {p.isHost && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 rounded-full">HOST</span>}
                 {p.uid === user.uid && <span className="text-xs text-gray-400">(Tu)</span>}
               </div>
            ))}
            {Array.from({ length: gameData.maxPlayers - gameData.players.length }).map((_, i) => (
                <div key={`empty-${i}`} className="p-2 border-dashed border-2 border-gray-200 rounded text-gray-400 text-sm">Slot Vuoto</div>
            ))}
          </div>

          <div className="flex gap-2">
            <button onClick={leaveGame} className="flex-1 py-2 bg-gray-200 text-gray-700 rounded font-bold">Esci</button>
            {gameData?.hostId === user.uid && (
                <button 
                    onClick={startGame}
                    disabled={gameData.players.length < 2} 
                    className="flex-1 py-2 bg-blue-600 disabled:bg-blue-300 text-white rounded font-bold flex items-center justify-center gap-2"
                >
                    <Play size={16}/> Start
                </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <ActiveGame gameData={gameData} user={user} activeGameId={activeGameId} leaveGame={leaveGame} />;
}

// Componente separato per la logica di gioco attiva
function ActiveGame({ gameData, user, activeGameId, leaveGame }) {
  const [timeLeft, setTimeLeft] = useState(TURN_TIMEOUT_SECONDS);
  const scrollRef = useRef(null);

  const myPlayerIdx = gameData.players.findIndex(p => p.uid === user.uid);
  const isMyTurn = gameData.currentTurnIndex === myPlayerIdx;
  const currentPlayer = gameData.players[gameData.currentTurnIndex];
  
  // Timer Effect
  useEffect(() => {
    const interval = setInterval(() => {
      if (gameData.status !== 'PLAYING') return;
      const secondsRemaining = Math.max(0, Math.ceil((gameData.turnExpiresAt - Date.now()) / 1000));
      setTimeLeft(secondsRemaining);

      if (secondsRemaining <= 0 && isMyTurn) {
        handleTimeout();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [gameData, isMyTurn]);

  // Auto-scroll logs
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [gameData.logs]);

  // --- LOGICA AZIONI ---
  
  const gameRef = doc(db, 'artifacts', appId, 'public', 'data', 'games', activeGameId);

  const nextTurn = async (customLogs = []) => {
    const nextIdx = (gameData.currentTurnIndex + 1) % gameData.players.length;
    await updateDoc(gameRef, {
      currentTurnIndex: nextIdx,
      turnExpiresAt: Date.now() + (TURN_TIMEOUT_SECONDS * 1000),
      logs: arrayUnion(...customLogs)
    });
  };

  const handleTimeout = async () => {
    const newLogs = ["TEMPO SCADUTO! Penalità di €" + TIMEOUT_PENALTY + "."];
    const updatedPlayers = [...gameData.players];
    updatedPlayers[myPlayerIdx].money -= TIMEOUT_PENALTY;
    
    if (updatedPlayers[myPlayerIdx].money < 0) {
        newLogs.push(updatedPlayers[myPlayerIdx].name + " è andato in bancarotta!");
    }

    await updateDoc(gameRef, {
        players: updatedPlayers,
        currentTurnIndex: (gameData.currentTurnIndex + 1) % gameData.players.length,
        turnExpiresAt: Date.now() + (TURN_TIMEOUT_SECONDS * 1000),
        logs: arrayUnion(...newLogs)
    });
  };

  const handleRollDice = async () => {
    if (!isMyTurn) return;

    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const total = d1 + d2;
    
    let newPos = (gameData.players[myPlayerIdx].position + total);
    let money = gameData.players[myPlayerIdx].money;
    let passedGo = false;
    let logs = [`${currentPlayer.name} ha tirato ${total} (${d1}+${d2})`];

    if (newPos >= BOARD_SIZE) {
        newPos = newPos % BOARD_SIZE;
        money += PASSING_GO_REWARD;
        passedGo = true;
        logs.push("Passato dal VIA! +€" + PASSING_GO_REWARD);
    }

    const updatedPlayers = [...gameData.players];
    updatedPlayers[myPlayerIdx].position = newPos;
    updatedPlayers[myPlayerIdx].money = money;

    await updateDoc(gameRef, {
        dice: [d1, d2],
        players: updatedPlayers,
        logs: arrayUnion(...logs)
    });

    setTimeout(() => handleLandingLogic(newPos, updatedPlayers), 500);
  };

  const handleLandingLogic = async (pos, currentPlayersState) => {
    const space = SPACES[pos];
    
    let updates = {};
    let logs = [`Atterrato su: ${space.name}`];

    if (space.type === 'TAX') {
        currentPlayersState[myPlayerIdx].money -= space.amount;
        logs.push(`Pagata tassa di €${space.amount}`);
        updates = { players: currentPlayersState, logs: arrayUnion(...logs) };
        await updateDoc(gameRef, updates);
        await nextTurn();
        return;
    }

    if (space.type === 'PROPERTY' || space.type === 'STATION') {
        const ownerUid = gameData.ownership[space.id];
        
        if (ownerUid === undefined) {
            await updateDoc(gameRef, { logs: arrayUnion(...logs) });
            return; 
        } else if (ownerUid !== user.uid) {
            const owner = currentPlayersState.find(p => p.uid === ownerUid);
            if (owner) {
                currentPlayersState[myPlayerIdx].money -= space.rent;
                const ownerIdxLocal = currentPlayersState.findIndex(p => p.uid === ownerUid);
                currentPlayersState[ownerIdxLocal].money += space.rent;
                logs.push(`Pagato affitto di €${space.rent} a ${owner.name}`);
                await updateDoc(gameRef, { players: currentPlayersState, logs: arrayUnion(...logs) });
            }
            await nextTurn();
            return;
        } else {
            logs.push("Proprietà già tua.");
            await updateDoc(gameRef, { logs: arrayUnion(...logs) });
            await nextTurn();
            return;
        }
    }

    if (space.id === 19) { // Go To Jail
        currentPlayersState[myPlayerIdx].position = 7;
        logs.push("In Prigione!");
        await updateDoc(gameRef, { players: currentPlayersState, logs: arrayUnion(...logs) });
        await nextTurn();
        return;
    }

    await updateDoc(gameRef, { logs: arrayUnion(...logs) });
    await nextTurn();
  };

  const buyProperty = async () => {
    const player = gameData.players[myPlayerIdx];
    const space = SPACES[player.position];
    
    if (player.money < space.price) return;

    const updatedPlayers = [...gameData.players];
    updatedPlayers[myPlayerIdx].money -= space.price;
    updatedPlayers[myPlayerIdx].properties.push(space.id);

    const newOwnership = { ...gameData.ownership, [space.id]: user.uid };

    await updateDoc(gameRef, {
        players: updatedPlayers,
        ownership: newOwnership,
        logs: arrayUnion(`${player.name} ha comprato ${space.name}!`)
    });
    await nextTurn();
  };

  const skipBuy = async () => {
      await updateDoc(gameRef, { logs: arrayUnion(`${currentPlayer.name} ha deciso di non comprare.`) });
      await nextTurn();
  };

  // --- RENDER HELPERS ---
  const getGridArea = (id) => {
    if (id >= 0 && id <= 6) return { row: 7, col: 7 - id };
    if (id >= 7 && id <= 12) return { row: 7 - (id - 6), col: 1 };
    if (id >= 13 && id <= 18) return { row: 1, col: 1 + (id - 12) };
    if (id >= 19 && id <= 23) return { row: 1 + (id - 18), col: 7 };
    return { row: 4, col: 4 };
  };

  const SpaceComponent = ({ space }) => {
    const ownerUid = gameData.ownership[space.id];
    const owner = gameData.players.find(p => p.uid === ownerUid);
    const occupants = gameData.players.filter(p => p.position === space.id);
    const gridPos = getGridArea(space.id);
    const isProp = space.type === 'PROPERTY';
    
    let borderColor = 'border-gray-300';
    if (owner) borderColor = `border-${owner.color}-500 ring-2 ring-${owner.color}-500 ring-inset`;

    return (
      <div 
        className={`relative flex flex-col items-center justify-between p-1 border ${borderColor} bg-white text-[10px] md:text-xs shadow-sm transition-all select-none`}
        style={{ gridRow: gridPos.row, gridColumn: gridPos.col }}
      >
        {isProp && <div className={`w-full h-2 md:h-4 ${space.color} mb-1 border-b border-black/10`}></div>}
        <div className="text-center font-bold leading-tight px-1 flex-grow flex items-center justify-center text-[8px] md:text-[10px]">
            {space.type === 'STATION' && <Train size={12} className="mb-1 mx-auto text-slate-600"/>}
            {space.type === 'TAX' && <AlertCircle size={12} className="mb-1 mx-auto text-gray-600"/>}
            {space.id === 0 ? "PARTENZA" : space.name}
        </div>
        <div className="mt-1 font-mono text-gray-500 text-[8px]">{(isProp || space.type === 'STATION') ? `€${space.price}` : ''}</div>
        
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex space-x-1 pointer-events-none z-10">
          {occupants.map(p => (
            <div key={p.uid} className={`w-3 h-3 md:w-5 md:h-5 rounded-full border border-white shadow bg-${p.color}-600`}></div>
          ))}
        </div>
      </div>
    );
  };

  const currentSpace = SPACES[currentPlayer.position];
  const canBuy = isMyTurn && 
                 (currentSpace.type === 'PROPERTY' || currentSpace.type === 'STATION') && 
                 !gameData.ownership[currentSpace.id] &&
                 currentPlayer.money >= currentSpace.price &&
                 gameData.logs[gameData.logs.length-1]?.includes("Atterrato su");

  return (
    <div className="min-h-[100dvh] bg-slate-100 font-sans text-slate-900 flex flex-col md:flex-row overflow-hidden select-none overscroll-none">
      
      {/* SIDEBAR */}
      <div className="w-full md:w-80 bg-white border-r border-slate-200 p-4 flex flex-col shadow-xl z-20 pt-safe-top">
        <div className="flex justify-between items-center mb-4">
             <h1 className="text-xl font-black text-blue-800 flex items-center gap-2"><MapPin size={20}/> MilanoPoly</h1>
             <button onClick={leaveGame} className="text-xs text-red-500 flex items-center gap-1"><LogOut size={12}/> Esci</button>
        </div>

        {/* Players */}
        <div className="space-y-2 mb-4">
          {gameData.players.map((p, idx) => (
            <div key={p.uid} className={`p-2 rounded-lg border flex justify-between items-center ${gameData.currentTurnIndex === idx ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-200 opacity-70'}`}>
              <div className="flex items-center gap-2">
                 <div className={`w-3 h-3 rounded-full bg-${p.color}-600`}></div>
                 <span className="font-bold text-sm truncate w-20">{p.name} {p.uid === user.uid && "(Tu)"}</span>
              </div>
              <div className="font-mono font-bold text-green-600">€{p.money}</div>
            </div>
          ))}
        </div>

        {/* Timer & Status */}
        <div className={`text-center p-2 rounded mb-2 font-bold text-white ${timeLeft < 30 ? 'bg-red-500 animate-pulse' : 'bg-slate-800'}`}>
            <div className="flex items-center justify-center gap-2">
                <Clock size={16}/> {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </div>
            <div className="text-xs font-normal opacity-80">
                {isMyTurn ? "È il tuo turno!" : `Turno di ${currentPlayer.name}`}
            </div>
        </div>

        {/* Controls */}
        <div className="flex-grow flex flex-col items-center justify-start p-2 bg-slate-50 rounded-lg border border-slate-200 mb-4">
            <div className="flex gap-4 mb-4">
                <DiceIcon value={gameData.dice[0]} className="w-10 h-10 text-indigo-600 bg-white rounded p-1 border shadow" />
                <DiceIcon value={gameData.dice[1]} className="w-10 h-10 text-indigo-600 bg-white rounded p-1 border shadow" />
            </div>

            {isMyTurn ? (
                canBuy ? (
                    <div className="flex gap-2 w-full">
                        <button onClick={buyProperty} className="flex-1 py-3 bg-green-500 text-white font-bold rounded shadow hover:bg-green-600">
                            COMPRA (€{currentSpace.price})
                        </button>
                        <button onClick={skipBuy} className="flex-1 py-3 bg-gray-400 text-white font-bold rounded shadow hover:bg-gray-500">
                            PASSA
                        </button>
                    </div>
                ) : (
                    <button 
                        onClick={handleRollDice} 
                        disabled={gameData.logs[gameData.logs.length-1]?.includes("Atterrato")} 
                        className="w-full py-3 bg-blue-600 text-white font-bold rounded shadow hover:bg-blue-700 disabled:opacity-50"
                    >
                        LANCIA DADI
                    </button>
                )
            ) : (
                <div className="text-sm text-gray-500 italic">Attendi il tuo turno...</div>
            )}
        </div>

        {/* Logs */}
        <div className="h-24 bg-white border border-slate-300 rounded overflow-hidden flex flex-col text-xs">
            <div className="bg-slate-100 px-2 py-1 font-bold border-b text-gray-500">Log</div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 space-y-1">
                {gameData.logs.map((l, i) => <div key={i} className="border-b last:border-0 pb-1">{l}</div>)}
            </div>
        </div>
      </div>

      {/* BOARD */}
      <div className="flex-grow bg-slate-200 p-2 flex items-center justify-center pb-safe-bottom">
        <div 
            className="grid gap-1 bg-slate-300 p-1 md:p-4 shadow-2xl rounded-xl border-4 border-slate-400 relative"
            style={{
                width: 'min(90vw, 600px)',
                height: 'min(90vw, 600px)',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gridTemplateRows: 'repeat(7, 1fr)'
            }}
        >
            <div className="bg-white rounded-lg flex flex-col items-center justify-center text-center p-4 opacity-90" style={{ gridArea: '2 / 2 / 7 / 7' }}>
                 <div className="text-4xl md:text-5xl font-black text-indigo-900 tracking-tighter opacity-10 rotate-12 absolute select-none">MILANO</div>
                 <h2 className="text-xl font-bold text-slate-800 relative z-10">MILANOPOLY ONLINE</h2>
                 <p className="text-xs text-slate-500 mt-1">Stanza: {gameData.name}</p>
                 <div className="text-[10px] text-slate-400 mt-4">Codice: {activeGameId.slice(0,6)}...</div>
            </div>
            {SPACES.map(space => <SpaceComponent key={space.id} space={space} />)}
        </div>
      </div>
    </div>
  );
}