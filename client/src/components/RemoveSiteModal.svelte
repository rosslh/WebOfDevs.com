<script lang="ts">
  export let removeWebsite: () => Promise<void>;
  export let showRemoveSiteModal: boolean;

  import Modal from "./Modal.svelte";
  import PrimaryButton from "./PrimaryButton.svelte";
  import SecondaryButton from "./SecondaryButton.svelte";

  let step = 1;
</script>

<Modal>
  {#if step === 1}
    <h2>Remove Website</h2>
    <p>
      Confirm that you want to remove your website from Web of Devs. You can always add it back later.
    </p>
    <div class="button-wrapper">
      <PrimaryButton
        onClick={() => {
          removeWebsite();
          step = 2;
        }}
      >
        Remove My Website
      </PrimaryButton>
      <SecondaryButton
        onClick={() => {
          showRemoveSiteModal = false;
        }}
      >
        Cancel
      </SecondaryButton>
    </div>
  {:else}
    <h2>Website Removed</h2>
    <p class="font-medium">
      The page will refresh in a few seconds.
    </p>
    <div class="button-wrapper">
      <PrimaryButton
        onClick={() => {
          showRemoveSiteModal = false;
          window.location.reload();
        }}
      >
        Close
      </PrimaryButton>
    </div>
  {/if}
</Modal>

<style lang="postcss">

  h2 {
    @apply text-slate-800 text-xl font-bold mb-4;
  }
  p {
    @apply text-slate-700 pb-2 mb-3;
  }

  .button-wrapper {
    @apply mt-8;
  }
</style>