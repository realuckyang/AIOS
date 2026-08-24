import { getPokerEconomy, setPokerBalances } from "../repository/economy.js";
import { insertGame } from "../repository/game.js";
const SUITS = ["spade", "heart", "diamond", "club"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const shuffle = () => {
  const deck = [];
  for (const suit of SUITS) for (const rank of RANKS) deck.push({ suit, rank });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};
const startGame = () => {
  const economyBefore = getPokerEconomy();
  const deck = shuffle();
  const playerCards = deck.slice(0, 3);
  const aiCards = deck.slice(3, 6);
  const ante = 10;
  if (economyBefore.playerBalance < ante || economyBefore.aiBalance < ante) {
    return { status: 400, messageKey: "poker_insufficient_chips" };
  }
  const playerChips = economyBefore.playerBalance - ante;
  const aiChips = economyBefore.aiBalance - ante;
  const actionHistory = [
    { actor: "system", action: "ante", amount: ante, text: `双方下底注 ${ante}` }
  ];
  setPokerBalances({ playerBalance: playerChips, aiBalance: aiChips });
  const ret = insertGame({
    playerCards,
    aiCards,
    actionHistory,
    playerChips,
    aiChips,
    pot: ante * 2
  });
  const economy = getPokerEconomy();
  return {
    success: true,
    game: {
      id: ret.lastInsertRowid,
      playerCards,
      aiCards: [null, null, null],
      playerChips,
      aiChips,
      pot: ante * 2,
      round: 1,
      status: "playing"
    },
    economy
  };
};
export {
  startGame
};
