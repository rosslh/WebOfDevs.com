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
    @apply ml-3 cursor-pointer text-slate-550;
  }

  button:hover {
    @apply underline;
  }

</style>