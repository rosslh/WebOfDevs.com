<div class="modal flex flex-col p-20 bg-white border border-slate-300 rounded-lg shadow-lg fixed overflow-y-auto z-50">
  <slot/>
</div>

<style lang="postcss">
  .modal {
    width: 55rem;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    max-height: 90vh;
    max-width: 90vw;
  }

  .modal :global(p) {
    @apply text-slate-700 pb-2 mb-3;
  }
</style>