<script lang="ts">
  export let onClick: () => void = undefined;
  export let disabled = false;
</script>

<button
  on:click={onClick}
  disabled={disabled}
>
  <slot/>
</button>

<style lang="postcss">
  button {
    @apply pt-2 pr-4 pb-2 pl-4 bg-gradient-to-r from-indigo-400 to-pink-400 text-white font-bold border-t border-slate-200 cursor-pointer rounded-md;
  }

  button:hover {
    @apply bg-gradient-to-r from-indigo-500 to-pink-500;
  }

  button:disabled {
    @apply pointer-events-none opacity-80;
  }
</style>