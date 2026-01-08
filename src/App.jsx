import React, { useState, useEffect, useRef } from 'react';
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, MapPin, DollarSign, Home, Train, AlertCircle, Trophy, User, Cpu } from 'lucide-react';

// --- CONFIGURAZIONE GIOCO ---

const BOARD_SIZE = 24; // Numero ridotto di caselle per giocabilità web rapida
const INITIAL_MONEY = 1500;
const PASSING_GO_REWARD = 200;

// Tipi di caselle: PROPERTY, STATION, TAX, CORNER, CHANCE
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

const DiceIcon = ({ value, className }) => {
  const icons = [Dice1, Dice2, Dice3, Dice4, Dice5, Dice6];
  const Icon = icons[value - 1] || Dice1;
  return <Icon className={className} />;
};

export default function MilanoPoly() {
  const [players, setPlayers] = useState([
    { id: 0, name: "Tu", color: "blue", position: 0, money: INITIAL_MONEY, properties: [], inJail: false, isAI: false },
    { id: 1, name: "AI Rival", color: "red", position: 0, money: INITIAL_MONEY, properties: [], inJail: false, isAI: true }
  ]);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [dice, setDice] = useState([1, 1]);
  const [gameState, setGameState] = useState('IDLE'); // IDLE, ROLLING, MOVING, DECISION, END_TURN, GAME_OVER
  const [logs, setLogs] = useState(["Benvenuto a MilanoPoly! Inizia a giocare."]);
  const [ownership, setOwnership] = useState({}); // { spaceId: playerId }
  const scrollRef = useRef(null);

  // Auto-scroll logs
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  // NEW: Prevent 'rubber banding' (bounce) effect on iOS and disable default gestures
  useEffect(() => {
    document.body.style.overscrollBehavior = 'none';
    return () => { document.body.style.overscrollBehavior = 'auto'; };
  }, []);

  const addLog = (text) => {
    setLogs(prev => [...prev, text]);
  };

  const currentPlayer = players[currentPlayerIdx];

  const nextTurn = () => {
    // Check bankruptcy
    if (players.some(p => p.money < 0)) {
      setGameState('GAME_OVER');
      return;
    }

    const nextIdx = (currentPlayerIdx + 1) % players.length;
    setCurrentPlayerIdx(nextIdx);
    setGameState('IDLE');
    
    // Trigger AI
    if (players[nextIdx].isAI) {
      setTimeout(() => handleRollDice(nextIdx), 1000);
    }
  };

  const handleRollDice = (playerOverrideIdx = null) => {
    const activeIdx = playerOverrideIdx !== null ? playerOverrideIdx : currentPlayerIdx;
    if (gameState !== 'IDLE' && players[activeIdx].isAI === false) return;

    setGameState('ROLLING');
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    setDice([d1, d2]);
    const total = d1 + d2;

    addLog(`${players[activeIdx].name} ha tirato ${total} (${d1} + ${d2})`);

    // Simple delay for animation feeling
    setTimeout(() => {
      movePlayer(activeIdx, total);
    }, 600);
  };

  const movePlayer = (pIdx, steps) => {
    setGameState('MOVING');
    setPlayers(prev => {
      const newPlayers = [...prev];
      const player = newPlayers[pIdx];
      let newPos = player.position + steps;

      // Pass VIA
      if (newPos >= BOARD_SIZE) {
        newPos = newPos % BOARD_SIZE;
        player.money += PASSING_GO_REWARD;
        addLog(`${player.name} passa dal VIA! Riceve €${PASSING_GO_REWARD}.`);
      }

      player.position = newPos;
      return newPlayers;
    });

    setTimeout(() => {
      handleLanding(pIdx);
    }, 500);
  };

  const handleLanding = (pIdx) => {
    const player = players[pIdx];
    const space = SPACES[player.position];
    const ownerId = ownership[space.id];

    addLog(`${player.name} è atterrato su: ${space.name}`);

    // Go to Jail Logic
    if (space.id === 19) { // Andare in Prigione
        setPlayers(prev => {
            const newPlayers = [...prev];
            newPlayers[pIdx].position = 7; // Prigione
            // newPlayers[pIdx].inJail = true; // Semplificato per ora, niente logica jail complessa
            return newPlayers;
        });
        addLog(`${player.name} va dritto in prigione (solo visita per ora)!`);
        setGameState('END_TURN');
        if (player.isAI) setTimeout(nextTurn, 1000);
        return;
    }

    // Tax
    if (space.type === 'TAX') {
      setPlayers(prev => {
        const copy = [...prev];
        copy[pIdx].money -= space.amount;
        return copy;
      });
      addLog(`${player.name} ha pagato €${space.amount} di tasse.`);
      setGameState('END_TURN');
      if (player.isAI) setTimeout(nextTurn, 1000);
      return;
    }

    // Property / Station
    if (space.type === 'PROPERTY' || space.type === 'STATION') {
      if (ownerId === undefined) {
        // Can buy
        if (player.money >= space.price) {
          if (player.isAI) {
            // AI always buys
            buyProperty(pIdx, space);
          } else {
            setGameState('DECISION'); // Show Buy Button
          }
        } else {
          addLog(`${player.name} non ha abbastanza soldi per comprare ${space.name}.`);
          setGameState('END_TURN');
          if (player.isAI) setTimeout(nextTurn, 1000);
        }
      } else if (ownerId !== player.id) {
        // Pay rent
        const owner = players[ownerId];
        const rent = space.rent; // Simplification: base rent
        
        setPlayers(prev => {
          const copy = [...prev];
          copy[pIdx].money -= rent;
          copy[ownerId].money += rent;
          return copy;
        });
        addLog(`${player.name} paga €${rent} di affitto a ${owner.name}.`);
        setGameState('END_TURN');
        if (player.isAI) setTimeout(nextTurn, 1000);
      } else {
        // Own property
        addLog("Proprietà già posseduta.");
        setGameState('END_TURN');
        if (player.isAI) setTimeout(nextTurn, 1000);
      }
    } else {
      setGameState('END_TURN');
      if (player.isAI) setTimeout(nextTurn, 1000);
    }
  };

  const buyProperty = (pIdx, space) => {
    setPlayers(prev => {
      const copy = [...prev];
      copy[pIdx].money -= space.price;
      copy[pIdx].properties.push(space.id);
      return copy;
    });
    setOwnership(prev => ({ ...prev, [space.id]: pIdx }));
    addLog(`${players[pIdx].name} ha comprato ${space.name} per €${space.price}.`);
    setGameState('END_TURN');
    if (players[pIdx].isAI) setTimeout(nextTurn, 1500);
  };

  // --- RENDER HELPERS ---

  // Helper to place items on a grid ring. 
  // Board is 7x7 grid. 24 spaces.
  // 0-6 (Bottom), 6-12 (Left), 12-18 (Top), 18-0 (Right) -> logic needs to map index to grid coord
  // Actually, easier to render linear for mobile, but let's try a CSS grid map for desktop
  
  // Grid Indices Logic:
  // Top Row: 13, 14, 15, 16, 17, 18, 19
  // Right Col: 20, 21, 22, 23, 0
  // Bottom Row: 1, 2, 3, 4, 5, 6, 7
  // Left Col: 8, 9, 10, 11, 12
  
  // Let's map Space ID to CSS Grid Area
  const getGridArea = (id) => {
    // A 7x7 grid
    // Corners: 7 (BL), 13 (TL), 19 (TR), 0 (BR) ?? Wait, let's map standard monopoly flow (CW from bottom right usually, but let's do customized)
    // Let's assume ID 0 is Bottom Right. Flow goes Left -> Top -> Right -> Bottom
    
    // Bottom Row (Right to Left): 0, 1, 2, 3, 4, 5, 6 (Corner)
    if (id >= 0 && id <= 6) return { row: 7, col: 7 - id };
    // Left Col (Bottom to Top): 7, 8, 9, 10, 11, 12
    if (id >= 7 && id <= 12) return { row: 7 - (id - 6), col: 1 };
    // Top Row (Left to Right): 13, 14, 15, 16, 17, 18
    if (id >= 13 && id <= 18) return { row: 1, col: 1 + (id - 12) };
    // Right Col (Top to Bottom): 19, 20, 21, 22, 23
    if (id >= 19 && id <= 23) return { row: 1 + (id - 18), col: 7 };
    
    return { row: 4, col: 4 };
  };

  const SpaceComponent = ({ space }) => {
    const ownerId = ownership[space.id];
    const occupants = players.filter(p => p.position === space.id);
    const gridPos = getGridArea(space.id);
    
    // Determine visuals based on type
    const isProp = space.type === 'PROPERTY';
    const isStation = space.type === 'STATION';
    
    let borderColor = 'border-gray-300';
    if (ownerId === 0) borderColor = 'border-blue-500 ring-2 ring-blue-500 ring-inset';
    if (ownerId === 1) borderColor = 'border-red-500 ring-2 ring-red-500 ring-inset';

    return (
      <div 
        className={`relative flex flex-col items-center justify-between p-1 border ${borderColor} bg-white text-[10px] md:text-xs shadow-sm transition-all hover:z-10 hover:scale-105 select-none`}
        style={{
          gridRow: gridPos.row,
          gridColumn: gridPos.col,
          touchAction: 'manipulation' // Improves touch response
        }}
      >
        {/* Header Bar for properties */}
        {isProp && (
          <div className={`w-full h-3 md:h-5 ${space.color} mb-1 border-b border-black/10`}></div>
        )}
        
        <div className="text-center font-bold leading-tight px-1 flex-grow flex items-center justify-center">
            {space.type === 'STATION' && <Train size={14} className="mb-1 mx-auto text-slate-600"/>}
            {space.type === 'TAX' && <AlertCircle size={14} className="mb-1 mx-auto text-gray-600"/>}
            {space.type === 'CORNER' && space.id === 0 && "PARTENZA"}
            {space.type !== 'CORNER' && space.name}
            {space.type === 'CORNER' && space.id !== 0 && space.name}
        </div>

        {/* Price or Icon */}
        <div className="mt-1 font-mono text-gray-600">
           {(isProp || isStation) && `€${space.price}`}
           {space.type === 'TAX' && `€${space.amount}`}
        </div>

        {/* Players Tokens */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex space-x-1 pointer-events-none">
          {occupants.map(p => (
            <div key={p.id} className={`w-4 h-4 md:w-6 md:h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center ${p.color === 'blue' ? 'bg-blue-600' : 'bg-red-600'} text-white text-[8px]`}>
               <User size={12} />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-[100dvh] bg-slate-100 font-sans text-slate-900 flex flex-col md:flex-row overflow-hidden select-none overscroll-none">
      
      {/* --- SIDEBAR DASHBOARD --- */}
      <div className="w-full md:w-80 bg-white border-r border-slate-200 p-4 flex flex-col shadow-xl z-20 pt-safe-top pb-safe-bottom">
        <h1 className="text-2xl font-black text-blue-800 mb-6 flex items-center gap-2">
          <MapPin /> MilanoPoly
        </h1>

        {/* Player Cards */}
        <div className="space-y-4 mb-6">
          {players.map((p, idx) => (
            <div key={p.id} className={`p-4 rounded-xl border-2 transition-all ${currentPlayerIdx === idx ? 'border-indigo-500 bg-indigo-50 scale-105 shadow-md' : 'border-slate-200 bg-slate-50 opacity-80'}`}>
              <div className="flex justify-between items-center mb-2">
                <span className={`font-bold flex items-center gap-2 ${p.id === 0 ? 'text-blue-700' : 'text-red-700'}`}>
                   {p.isAI ? <Cpu size={16}/> : <User size={16}/>} {p.name}
                </span>
                {currentPlayerIdx === idx && <span className="text-xs font-bold px-2 py-0.5 bg-indigo-200 text-indigo-800 rounded-full">TURNO</span>}
              </div>
              <div className="flex items-center gap-2 text-xl font-mono font-bold text-emerald-600">
                <DollarSign size={18} /> {p.money}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Proprietà: {p.properties.length}
              </div>
            </div>
          ))}
        </div>

        {/* Action Area */}
        <div className="flex-grow flex flex-col items-center justify-start p-2 bg-slate-50 rounded-lg border border-slate-200 mb-4 touch-manipulation">
            {gameState === 'GAME_OVER' ? (
                <div className="text-center p-4">
                   <Trophy size={48} className="mx-auto text-yellow-500 mb-2"/>
                   <h2 className="text-xl font-bold">Partita Finita!</h2>
                   <p>{players[0].money < 0 ? "Hai perso!" : "Hai vinto!"}</p>
                   <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 active:scale-95 transition-transform">Rigioca</button>
                </div>
            ) : (
                <>
                    <div className="flex gap-4 mb-4">
                        <DiceIcon value={dice[0]} className="w-12 h-12 text-indigo-600 drop-shadow-md bg-white rounded-lg p-1 border" />
                        <DiceIcon value={dice[1]} className="w-12 h-12 text-indigo-600 drop-shadow-md bg-white rounded-lg p-1 border" />
                    </div>
                    
                    {gameState === 'IDLE' && !players[currentPlayerIdx].isAI && (
                        <button 
                            onClick={() => handleRollDice()}
                            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg hover:from-blue-700 hover:to-indigo-700 active:scale-95 transition-transform touch-manipulation"
                        >
                            LANCIA I DADI
                        </button>
                    )}
                    
                    {gameState === 'DECISION' && !players[currentPlayerIdx].isAI && (
                        <div className="flex gap-2 w-full">
                             <button 
                                onClick={() => buyProperty(currentPlayerIdx, SPACES[players[currentPlayerIdx].position])}
                                className="flex-1 py-4 bg-green-500 text-white font-bold rounded-xl shadow hover:bg-green-600 active:scale-95 transition-transform touch-manipulation"
                            >
                                COMPRA (€{SPACES[players[currentPlayerIdx].position].price})
                            </button>
                            <button 
                                onClick={nextTurn}
                                className="flex-1 py-4 bg-slate-400 text-white font-bold rounded-xl shadow hover:bg-slate-500 active:scale-95 transition-transform touch-manipulation"
                            >
                                PASSA
                            </button>
                        </div>
                    )}
                    
                    {gameState === 'END_TURN' && !players[currentPlayerIdx].isAI && (
                        <button 
                            onClick={nextTurn}
                            className="w-full py-4 bg-slate-800 text-white font-bold rounded-xl shadow hover:bg-slate-900 active:scale-95 transition-transform touch-manipulation"
                        >
                            PASSA TURNO
                        </button>
                    )}

                    {players[currentPlayerIdx].isAI && (
                        <div className="text-sm font-medium text-slate-500 animate-pulse">L'AI sta pensando...</div>
                    )}
                </>
            )}
        </div>

        {/* Logs */}
        <div className="h-32 bg-white border border-slate-300 rounded-lg overflow-hidden flex flex-col">
            <div className="bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500 border-b">Log Partita</div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 space-y-1 overscroll-contain">
                {logs.map((log, i) => (
                    <div key={i} className="text-xs text-slate-700 border-b border-slate-50 last:border-0 pb-1">
                        {log}
                    </div>
                ))}
            </div>
        </div>
      </div>

      {/* --- MAIN BOARD AREA --- */}
      <div className="flex-grow bg-slate-200 p-2 md:p-8 overflow-auto flex items-center justify-center pb-safe-bottom">
        
        {/* The Grid Container */}
        <div 
            className="grid gap-1 md:gap-2 bg-slate-300 p-1 md:p-4 shadow-2xl rounded-xl border-4 border-slate-400 relative"
            style={{
                width: 'min(90vw, 700px)', // Slightly reduced max width for mobile margins
                height: 'min(90vw, 700px)', // Square aspect ratio
                gridTemplateColumns: 'repeat(7, 1fr)',
                gridTemplateRows: 'repeat(7, 1fr)'
            }}
        >
            {/* Center Hub */}
            <div className="bg-white rounded-lg flex flex-col items-center justify-center text-center p-4 opacity-90" style={{ gridArea: '2 / 2 / 7 / 7' }}>
                 <div className="text-4xl md:text-6xl font-black text-indigo-900 tracking-tighter opacity-10 rotate-12 absolute select-none pointer-events-none">MILANO</div>
                 <div className="relative z-10 pointer-events-none">
                     <h2 className="text-lg md:text-2xl font-bold text-slate-800">MILANOPOLY</h2>
                     <p className="text-xs text-slate-500 mt-2">Acquista le vie del centro,</p>
                     <p className="text-xs text-slate-500">evita l'Area C e diventa ricco!</p>
                     
                     <div className="mt-8 grid grid-cols-2 gap-4 text-left">
                        <div className="flex items-center gap-2 text-xs">
                            <div className="w-3 h-3 bg-blue-600 rounded-full"></div> Tu (Blu)
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                            <div className="w-3 h-3 bg-red-600 rounded-full"></div> AI (Rosso)
                        </div>
                     </div>
                 </div>
            </div>

            {/* Render Spaces */}
            {SPACES.map(space => (
                <SpaceComponent key={space.id} space={space} />
            ))}

        </div>
      </div>
    </div>
  );
}