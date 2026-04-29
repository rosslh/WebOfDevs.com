<script lang="ts">
  import Modal from "./Modal.svelte";
  import PrimaryButton from "./PrimaryButton.svelte";
  import SecondaryButton from "./SecondaryButton.svelte";
  import SubmissionCriteria from "./SubmissionCriteria.svelte";

  export let submitWebsite: (website: string) => Promise<void>;
  export let showAddSiteModal: boolean;
  export let detectedWebsiteUrl: string;

  let step = 0;
  let website = detectedWebsiteUrl;

  const close = () => {
    showAddSiteModal = false;
  };

  const submit = async () => {
    await submitWebsite(website);
    step += 1;
  };

  const refresh = () => {
    window.location.reload();
  }
</script>

<Modal>
  {#if step === 0}
    <h2>Submit Your Personal Website</h2> 
    <SubmissionCriteria />
    <div class="button-wrapper">
      <PrimaryButton onClick={() => { step = 1 }}>
        Got it
      </PrimaryButton>
      <SecondaryButton onClick={close}>
        Cancel
      </SecondaryButton>
    </div>
  {:else if step === 1}
    <h2>Submit Your Personal Website</h2>
    <label for="website-input">Website URL</label>
    <input
      id="website-input"
      type="text"
      placeholder="https://example.com"
      bind:value={website}
    />
    <div class="button-wrapper">
      <PrimaryButton
        onClick={submit}
        disabled={!website}
      >
        Submit
      </PrimaryButton>
      <SecondaryButton onClick={close}>
        Cancel
      </SecondaryButton>
    </div>
  {:else if step === 2}
    <h2>Thanks for submitting your website!</h2>
    <p>
      If your site meets the criteria, it will be added to the list of personal websites. Check back in a few days to see if it has been added.
    </p>
    <p class="font-medium">
      The page will refresh in a few seconds.
    </p>
    <div class="button-wrapper">
      <PrimaryButton onClick={refresh}>
        Sounds good!
      </PrimaryButton>
    </div>
  {/if}
</Modal>

<style lang="postcss">

  h2 {
    @apply text-slate-800 text-xl font-bold mb-4;
  }

  .button-wrapper {
    @apply mt-8;
  }

  label {
    @apply font-medium text-slate-700 mb-2 block;
  }

  input {
    @apply p-2 border border-slate-200 rounded-sm text-slate-700 block mb-8;
  }
</style>