<!-- Dice.svelte -->
<script lang="ts">
  import { spring } from 'svelte/motion';
  import { onMount } from 'svelte';

  export let value1: number = 1;
  export let value2: number = 1;
  export let isRolling: boolean = false;

  const position = spring(
    { y: -500 },
    {
      stiffness: 0.1,
      damping: 0.15
    }
  );

  let mounted = false;

  onMount(() => {
    mounted = true;
    setTimeout(() => {
      position.set({ y: 0 });
    }, 100);
  });

  $: if (isRolling && mounted) {
    position.set({ y: -20 }, { hard: false });
    setTimeout(() => {
      position.set({ y: 0 }, { hard: false });
    }, 150);
  }

  function getDots(value: number): number[] {
    return Array.from({ length: value }, (_, i) => i + 1);
  }
</script>

<div
  class="dice-container"
  style="transform: translateY({$position.y}px)"
  class:rolling={isRolling}
>
  {#each [value1, value2] as value, i}
    <div class="dice" data-value={value}>
      {#each getDots(value) as dot}
        <div class="dot"></div>
      {/each}
    </div>
  {/each}
</div>

<style lang="postcss">
  .dice-container {
    @apply flex cursor-pointer gap-8 transition-transform duration-300 ease-out;
  }

  .dice {
    @apply grid h-24 w-24 gap-2 rounded-xl bg-white p-4 shadow-lg;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(3, 1fr);
  }

  .dot {
    @apply rounded-full bg-black;
  }

  .dice[data-value='1'] {
    .dot:nth-child(1) {
      grid-area: 2 / 2;
    }
  }

  .dice[data-value='2'] {
    .dot:nth-child(1) {
      grid-area: 1 / 1;
    }
    .dot:nth-child(2) {
      grid-area: 3 / 3;
    }
  }

  .dice[data-value='3'] {
    .dot:nth-child(1) {
      grid-area: 1 / 1;
    }
    .dot:nth-child(2) {
      grid-area: 2 / 2;
    }
    .dot:nth-child(3) {
      grid-area: 3 / 3;
    }
  }

  .dice[data-value='4'] {
    .dot:nth-child(1) {
      grid-area: 1 / 1;
    }
    .dot:nth-child(2) {
      grid-area: 1 / 3;
    }
    .dot:nth-child(3) {
      grid-area: 3 / 1;
    }
    .dot:nth-child(4) {
      grid-area: 3 / 3;
    }
  }

  .dice[data-value='5'] {
    .dot:nth-child(1) {
      grid-area: 1 / 1;
    }
    .dot:nth-child(2) {
      grid-area: 1 / 3;
    }
    .dot:nth-child(3) {
      grid-area: 2 / 2;
    }
    .dot:nth-child(4) {
      grid-area: 3 / 1;
    }
    .dot:nth-child(5) {
      grid-area: 3 / 3;
    }
  }

  .dice[data-value='6'] {
    .dot:nth-child(1) {
      grid-area: 1 / 1;
    }
    .dot:nth-child(2) {
      grid-area: 1 / 3;
    }
    .dot:nth-child(3) {
      grid-area: 2 / 1;
    }
    .dot:nth-child(4) {
      grid-area: 2 / 3;
    }
    .dot:nth-child(5) {
      grid-area: 3 / 1;
    }
    .dot:nth-child(6) {
      grid-area: 3 / 3;
    }
  }

  .rolling {
    animation: roll 0.6s ease-out;
  }

  @keyframes roll {
    0% {
      transform: rotate(0deg) scale(1);
    }
    50% {
      transform: rotate(180deg) scale(1.1);
    }
    100% {
      transform: rotate(360deg) scale(1);
    }
  }
</style>
