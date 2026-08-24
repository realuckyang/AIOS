import { getPokerEconomy, setPokerBalances } from "../repository/economy.js";
import { getGameById, updateGame } from "../repository/game.js";
import { instantTaskJson } from "../../app_shared/instantTask.js";
const RANK_VALUE = { "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10, "J": 11, "Q": 12, "K": 13, "A": 14 };
const handRank = (cards) => {
  const vals = cards.map((c) => RANK_VALUE[c.rank]).sort((a, b) => b - a);
  const sameSuit = cards[0].suit === cards[1].suit && cards[1].suit === cards[2].suit;
  const sorted = [...vals].sort((a, b) => a - b);
  const straight = sorted[2] - sorted[1] === 1 && sorted[1] - sorted[0] === 1 || sorted[0] === 2 && sorted[1] === 3 && sorted[2] === 14;
  if (vals[0] === vals[1] && vals[1] === vals[2]) return { type: 6, vals };
  if (sameSuit && straight) return { type: 5, vals };
  if (sameSuit) return { type: 4, vals };
  if (straight) return { type: 3, vals };
  if (vals[0] === vals[1] || vals[1] === vals[2]) {
    const pair = vals[0] === vals[1] ? vals[0] : vals[1];
    const kicker = vals.find((v) => v !== pair);
    return { type: 2, vals: [pair, kicker] };
  }
  return { type: 1, vals };
};
const compareHands = (a, b) => {
  const ra = handRank(a), rb = handRank(b);
  if (ra.type !== rb.type) return ra.type - rb.type;
  for (let i = 0; i < ra.vals.length; i++) {
    if (ra.vals[i] !== rb.vals[i]) return ra.vals[i] - rb.vals[i];
  }
  return 0;
};
const aiDecideByLlm = async ({ req, aiCards, round, aiChips, playerChips, pot, playerBet, playerAction }) => {
  const systemPrompt = `你是一个有鲜明人设的炸金花玩家。你只返回JSON，不要返回其它内容。
你必须在 call(跟注) / raise(加注) / fold(弃牌) 中三选一。
要求：
1. speech 是对外说的话（短句，接地气，带压迫感或迷惑性）
2. expression 是表情/动作（例如："(眯眼敲桌)"）
返回格式：
{"action":"call", "speech":"...", "expression":"(...)"}`;
  const userPrompt = `牌局状态：
- 当前回合: ${round} (最大5回合)
- 你的筹码: ${aiChips}
- 对手筹码: ${playerChips}
- 当前底池: ${pot}
- 对手刚刚执行的动作: ${playerAction === "raise" ? `加注到了 ${playerBet}` : `跟注了 ${playerBet}`}
- 你的手牌: ${JSON.stringify(aiCards)}

请根据胜率与风险做决策（call/raise/fold），最多5回合并将由于到达上限而自动比牌结算。仅返回JSON。`;
  let parsed;
  try {
    parsed = await instantTaskJson({
      app: "poker",
      title: `炸金花AI决策-第${round}轮`,
      prompt: "根据牌局状态做跟注/弃牌决策。",
      schema: { required: ["action", "speech", "expression"] },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      req
    });
  } catch (error) {
    return {
      status: 502,
      message: `LLM decision failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
  const action = String(parsed?.action || "").toLowerCase();
  if (action !== "call" && action !== "fold" && action !== "raise") {
    return { status: 502, message: "LLM returned an invalid decision" };
  }
  return {
    action,
    speech: String(parsed?.speech || parsed?.action || "").trim(),
    expression: String(parsed?.expression || "").trim()
  };
};
const aiSpeakOnCompareByLlm = async ({ req, actionHistory, winner, round, potBeforeOpen, aiCards }) => {
  const systemPrompt = `你是炸金花里的AI对手。现在进入比牌结算，请生成"外在表现"。
要求：
1. 只返回 JSON，不要其它内容
2. speech 句子长度 12-30 个中文字符
3. expression 是一个动作或表情，放在括号里
4. 语气像真人，避免模板化
返回格式：
{"speech":"...", "expression":"(...)"}
`;
  const resultText = winner === "ai" ? "你（AI）赢了，你赢得了底池" : winner === "player" ? "你（AI）输了，对手赢得了底池" : "平局，双方平分底池";
  const userPrompt = `对局信息：
- 回合：${round}
- 比牌前底池：${potBeforeOpen}
- 比牌结果：${resultText}
- AI手牌：${JSON.stringify(aiCards)}
- 押注记录：${JSON.stringify(actionHistory)}
请根据比牌结果给一条结算时的真人感台词。赢了就得意，输了就不甘，平局就感慨。`;
  let parsed;
  try {
    parsed = await instantTaskJson({
      app: "poker",
      title: `炸金花比牌台词-第${round}轮`,
      prompt: "根据比牌上下文生成外在台词。",
      schema: { required: ["speech", "expression"] },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      req
    });
  } catch (error) {
    return {
      status: 502,
      message: `LLM line generation failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
  const speech = String(parsed?.speech || parsed?.line || "").trim();
  const expression = String(parsed?.expression || "").trim();
  if (!speech) return { status: 502, message: "LLM returned an empty line" };
  return { speech, expression };
};
const performAction = async ({ id, action, req }) => {
  if (!id) return { status: 400, message: "Missing id" };
  const row = getGameById(id);
  if (!row) return { status: 404, message: "Game not found" };
  if (row.status !== "playing") return { status: 400, message: "Game is already finished" };
  const playerCards = JSON.parse(row.player_cards);
  const aiCards = JSON.parse(row.ai_cards);
  let actionHistory = [];
  try {
    actionHistory = JSON.parse(row.action_history || "[]");
    if (!Array.isArray(actionHistory)) actionHistory = [];
  } catch {
    actionHistory = [];
  }
  let playerChips = row.player_chips;
  let aiChips = row.ai_chips;
  let pot = row.pot;
  let round = row.round;
  let status = "playing";
  let winner = "";
  let aiAction = "";
  let aiBet = 0;
  let aiSpeech = "";
  let aiExpression = "";
  if (action === "fold") {
    actionHistory.push({ actor: "player", action: "fold", text: "玩家弃牌" });
    status = "done";
    winner = "ai";
    aiChips += pot;
    pot = 0;
  } else if (action === "call" || action === "raise") {
    let currentBet = 20;
    for (let i = actionHistory.length - 1; i >= 0; i--) {
      if (actionHistory[i].amount && actionHistory[i].action !== "ante") {
        currentBet = actionHistory[i].amount;
        break;
      }
    }
    let betAmount = action === "raise" ? currentBet * 3 : currentBet;
    betAmount = Math.min(betAmount, playerChips);
    if (betAmount <= 0) return { status: 400, message: "Insufficient chips" };
    playerChips -= betAmount;
    pot += betAmount;
    actionHistory.push({
      actor: "player",
      action,
      amount: betAmount,
      text: action === "raise" ? `玩家加注 ${betAmount}` : `玩家跟注 ${betAmount}`
    });
    const aiDecision = await aiDecideByLlm({
      req,
      aiCards,
      round,
      aiChips,
      playerChips,
      pot,
      playerBet: betAmount,
      playerAction: action
    });
    if (aiDecision?.status) return aiDecision;
    aiAction = aiDecision.action;
    aiSpeech = aiDecision.speech || "";
    aiExpression = aiDecision.expression || "";
    if (aiAction === "fold") {
      actionHistory.push({
        actor: "ai",
        action: "fold",
        text: [aiSpeech || "不玩了，弃牌", aiExpression].filter(Boolean).join(" ")
      });
      status = "done";
      winner = "player";
      playerChips += pot;
      pot = 0;
    } else {
      let aiBetAmount = aiAction === "raise" ? betAmount * 3 : betAmount;
      aiBet = Math.min(aiBetAmount, aiChips);
      aiChips -= aiBet;
      pot += aiBet;
      actionHistory.push({
        actor: "ai",
        action: aiAction,
        amount: aiBet,
        text: [aiSpeech || (aiAction === "raise" ? `加注 ${aiBet}` : `跟注 ${aiBet}`), aiExpression].filter(Boolean).join(" ")
      });
      round++;
      if (round > 5) {
        status = "done";
        const cmp = compareHands(playerCards, aiCards);
        if (cmp > 0) {
          winner = "player";
          playerChips += pot;
        } else if (cmp < 0) {
          winner = "ai";
          aiChips += pot;
        } else {
          winner = "draw";
          playerChips += Math.floor(pot / 2);
          aiChips += pot - Math.floor(pot / 2);
        }
        actionHistory.push({ actor: "system", action: "compare", text: "达到5轮上限，自动开牌比对" });
        const compareLine = await aiSpeakOnCompareByLlm({
          req,
          actionHistory,
          winner,
          round,
          potBeforeOpen: pot,
          aiCards
        });
        if (!compareLine?.status) {
          aiSpeech = compareLine.speech || aiSpeech;
          aiExpression = compareLine.expression || aiExpression;
          actionHistory.push({ actor: "ai", action: "talk", text: [compareLine.speech, compareLine.expression].filter(Boolean).join(" ") });
        }
        pot = 0;
      }
    }
  } else {
    return { status: 400, message: "Invalid action" };
  }
  updateGame({ id, playerChips, aiChips, pot, round, status, winner, actionHistory });
  setPokerBalances({ playerBalance: playerChips, aiBalance: aiChips });
  const economy = getPokerEconomy();
  return {
    success: true,
    game: {
      id,
      playerCards,
      aiCards: status === "done" ? aiCards : [null, null, null],
      playerChips,
      aiChips,
      pot,
      round,
      status,
      winner
    },
    meta: {
      playerAction: action,
      aiAction: action === "bet" ? aiAction : "",
      aiBet,
      aiSpeech,
      aiExpression
    },
    economy
  };
};
export {
  performAction
};
