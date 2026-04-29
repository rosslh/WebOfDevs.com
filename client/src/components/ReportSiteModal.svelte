<script lang="ts">
  export let reportWebsite: (websiteId: number, reportReason: string) => Promise<void>;
  export let showReportSiteModalForEntry: number;

  import Modal from "./Modal.svelte";
  import PrimaryButton from "./PrimaryButton.svelte";
  import SecondaryButton from "./SecondaryButton.svelte";

  let step = 1;

  let reportReason = "";
</script>

<Modal>
  {#if step === 1}
    <h2>Report Website</h2>
    <p>
      Websites may be removed for any reason including if they no longer meet the
      <a href="/about#criteria" class="gradient-link" target="_blank" rel="noopener noreferrer">submission criteria</a>.
    </p>
    <label for="reportReason">
      Reason for report:
    </label>
    <input type="text" id="reportReason" bind:value={reportReason} />
    <div class="button-wrapper">
      <PrimaryButton
        onClick={() => {
          reportWebsite(showReportSiteModalForEntry, reportReason);
          step = 2;
        }}
        disabled={!reportReason}
      >
        Report
      </PrimaryButton>
      <SecondaryButton
        onClick={() => {
          showReportSiteModalForEntry = null;
        }}
      >
        Cancel
      </SecondaryButton>
    </div>
  {:else}
    <h2>Report Sent</h2>
    <p>
      Your report has been sent.
    </p>
    <div class="button-wrapper">
      <PrimaryButton
        onClick={() => {
          showReportSiteModalForEntry = null;
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

  label {
    @apply font-medium text-slate-700 mb-2 block;
  }

  input {
    @apply p-2 border border-slate-200 rounded-sm text-slate-700 block mb-8 w-3/4;
  }
</style>