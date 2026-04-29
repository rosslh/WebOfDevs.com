<script lang="ts">
  export let showAddSiteModal: boolean;
</script>

<button
  class="md:hidden flex flex-row justify-center items-center p-2 bg-gradient-to-r from-indigo-400 to-pink-400 border-t border-slate-300 font-bold text-white hover:from-indigo-500 hover:to-pink-500"
  on:click={() => { showAddSiteModal = true }}
>
  Add My Site
</button>
