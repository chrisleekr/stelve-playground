<!-- +page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import Dice from '$lib/components/Dice.svelte';
  import type { DiceRoll } from '$lib/types';

  // Constants
  const ROLL_ANIMATION_DURATION = 600;
  const CONNECTION_STATES = {
    CONNECTING: 'Connecting to server...',
    CONNECTED: 'Connected! Getting initial numbers...',
    DISCONNECTED: 'Connection lost. Please refresh the page.',
    ROLLING: 'Rolling the dice...',
    READY: 'Click the dice to roll!'
  } as const;

  const GAME_STATES = {
    WIN: 'You win! 🎉',
    LOSE: 'You lose! 😢',
    TIE: "It's a tie! 🤝"
  } as const;

  // Types
  type GameState = (typeof GAME_STATES)[keyof typeof GAME_STATES];
  type ConnectionState = (typeof CONNECTION_STATES)[keyof typeof CONNECTION_STATES];

  // State
  let ws: WebSocket;
  let diceValues = { dice1: 1, dice2: 1 };
  let isRolling = false;
  let isConnected = false;
  let serverMessage: ConnectionState | GameState = CONNECTION_STATES.CONNECTING;
  let serverScore = 0;
  let playerScore = 0;
  let canStartNewGame = false;
  let totalGames = 0;
  let wins = 0;
  let losses = 0;
  let ties = 0;
  let showStats = false;

  // WebSocket setup
  function setupWebSocket(): WebSocket {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

    const wsPort = import.meta.env.PUBLIC_WS_PORT || 3000;
    const wsUrl = `${protocol}//${window.location.hostname}:${wsPort}/websocket`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = handleConnectionOpen;
    socket.onmessage = handleMessage;
    socket.onclose = handleConnectionClose;
    socket.onerror = handleConnectionError;

    return socket;
  }

  // Event handlers
  function handleConnectionOpen() {
    isConnected = true;
    serverMessage = CONNECTION_STATES.CONNECTED;
    ws.send('getServerNumber');
  }

  function handleConnectionClose() {
    console.log('WebSocket connection closed');
    isConnected = false;
    serverMessage = CONNECTION_STATES.DISCONNECTED;
  }

  function handleConnectionError(error: Event) {
    console.error('WebSocket error:', error);
    isConnected = false;
    serverMessage = CONNECTION_STATES.DISCONNECTED;
  }

  function handleMessage(event: MessageEvent) {
    try {
      const roll: DiceRoll = JSON.parse(event.data);

      if ('error' in roll) {
        console.error('Server error:', roll.error);
        return;
      }

      switch (roll.message) {
        case 'getServerNumber':
          handleServerRoll(roll);
          break;
        case 'getDicerNumber':
          handlePlayerRoll(roll);
          break;
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  }

  function handleServerRoll(roll: DiceRoll) {
    isRolling = false;
    serverMessage = CONNECTION_STATES.ROLLING;
    serverScore = roll.dice1 + roll.dice2;
  }

  function handlePlayerRoll(roll: DiceRoll) {
    playerScore = roll.dice1 + roll.dice2;
    isRolling = true;
    serverMessage = CONNECTION_STATES.ROLLING;

    setTimeout(() => {
      diceValues = roll;
      isRolling = false;
      updateGameState();
    }, ROLL_ANIMATION_DURATION);
  }

  function updateGameState() {
    if (serverScore < playerScore) {
      serverMessage = GAME_STATES.WIN;
      wins++;
    } else if (serverScore > playerScore) {
      serverMessage = GAME_STATES.LOSE;
      losses++;
    } else {
      serverMessage = GAME_STATES.TIE;
      ties++;
    }
    totalGames++;
    canStartNewGame = true;
  }

  function getWinRate(): string {
    if (totalGames === 0) return '0%';
    return `${Math.round((wins / totalGames) * 100)}%`;
  }

  function toggleStats() {
    showStats = !showStats;
  }

  function rollDice() {
    if (!isConnected || isRolling) return;

    if (canStartNewGame) {
      startNewGame();
    } else {
      playTurn();
    }
  }

  function startNewGame() {
    ws.send('getServerNumber');
    playerScore = 0;
    canStartNewGame = false;
  }

  function playTurn() {
    serverMessage = CONNECTION_STATES.ROLLING;
    ws.send('getDicerNumber');
  }

  // Lifecycle
  onMount(() => {
    ws = setupWebSocket();
    return () => ws?.close();
  });
</script>

<div
  class="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 p-4"
>
  <div class="text-center">
    <h1 class="mb-6 text-4xl font-bold text-white" in:scale={{ duration: 400, delay: 200 }}>
      Dice Game
    </h1>

    <button
      class="mb-4 rounded-full bg-white/20 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-white/30"
      on:click={toggleStats}
    >
      {showStats ? 'Hide Stats' : 'Show Stats'}
    </button>

    {#if showStats}
      <div class="mb-6 space-y-2 rounded-lg bg-white/10 p-4 backdrop-blur-sm" transition:fade>
        <div class="grid grid-cols-2 gap-4 text-white">
          <div class="rounded-lg bg-green-500/20 p-2">
            <p class="text-sm">Wins</p>
            <p class="text-2xl font-bold">{wins}</p>
          </div>
          <div class="rounded-lg bg-red-500/20 p-2">
            <p class="text-sm">Losses</p>
            <p class="text-2xl font-bold">{losses}</p>
          </div>
          <div class="rounded-lg bg-blue-500/20 p-2">
            <p class="text-sm">Ties</p>
            <p class="text-2xl font-bold">{ties}</p>
          </div>
          <div class="rounded-lg bg-purple-500/20 p-2">
            <p class="text-sm">Win Rate</p>
            <p class="text-2xl font-bold">{getWinRate()}</p>
          </div>
        </div>
      </div>
    {/if}

    <!-- Game Status and Scores -->
    <div class="mb-8 grid gap-4">
      <!-- Status Message -->
      <div class="rounded-lg bg-white/10 p-6 backdrop-blur-sm" class:animate-pulse={isRolling}>
        <p class="text-xl font-medium text-white">{serverMessage}</p>
      </div>

      <!-- Score Cards -->
      <div class="grid grid-cols-2 gap-4">
        <div
          class={`
            rounded-lg bg-white/10 p-6 backdrop-blur-sm transition-all duration-300
            ${serverScore > playerScore ? 'scale-105 bg-white/20 ring-2 ring-white/50' : ''}
          `}
        >
          <p class="mb-2 text-sm font-medium text-white/80">Server</p>
          <p class="text-3xl font-bold text-white">
            {serverScore === 0 ? '?' : serverScore}
          </p>
        </div>

        <div
          class={`
            rounded-lg bg-white/10 p-6 backdrop-blur-sm transition-all duration-300
            ${playerScore > serverScore ? 'scale-105 bg-white/20 ring-2 ring-white/50' : ''}
          `}
        >
          <p class="mb-2 text-sm font-medium text-white/80">Player</p>
          <p class="text-3xl font-bold text-white">
            {playerScore === 0 ? '?' : playerScore}
          </p>
        </div>
      </div>
    </div>

    <div class="relative">
      <button
        type="button"
        on:click={rollDice}
        on:keydown={(e) => e.key === 'Enter' && rollDice()}
        class="mx-auto block transform transition-all duration-300 hover:scale-110 disabled:opacity-50"
        class:animate-bounce={!isRolling && isConnected && !canStartNewGame}
        disabled={!isConnected || isRolling}
        aria-label="Roll the dice"
      >
        <Dice value1={diceValues.dice1} value2={diceValues.dice2} {isRolling} />
      </button>

      {#if canStartNewGame}
        <div
          class="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full rounded-lg bg-white/10 p-4 backdrop-blur-sm"
        >
          <p class="mb-2 text-sm text-white/80">Click to play again!</p>
          <svg
            class="mx-auto h-6 w-6 animate-bounce text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  .animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
</style>
