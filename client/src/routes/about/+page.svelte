<script>
  import SubmissionCriteria from "../../components/SubmissionCriteria.svelte";
</script>

<div class="about max-w-3xl p-5 mx-auto">
  <h2>About Web of Devs</h2>
  <p>
    Web of Devs is a community of developers with amazing personal websites, homepages, and portfolios.
  </p>
  <p>
    You can get inspiration by browsing developer websites,
    "favorite" the best ones you find, and also share your own.
  </p>

  <h2>FAQs</h2>
  <h3>How do I add my website?</h3>
  <p>
    You can add your website by logging in and clicking the "Add Website" button at the
    bottom of the sidebar. If you don't see the button after logging in, it means your site has
    already been added.
  </p>
  <h3>How do I remove my website?</h3>
  <p>
    You can remove your website by clicking the delete icon on your website entry.
  </p>
  <h3>Who is behind Web of Devs?</h3>
  <p>
    Web of Devs was created by
    <a class="gradient-link" href="https://rosshill.ca" target="_blank" rel="noopener noreferrer">Ross Hill</a>,
    a web developer from Toronto, Canada.
  </p>

  <h2 id="criteria">
    Submission Criteria
  </h2>
  <SubmissionCriteria />
</div>

<style lang="postcss">
  h2 {
    @apply mt-9;
    @apply mb-4;
    @apply text-2xl;
    @apply text-slate-700;
  }

  h3 {
    @apply mt-5;
    @apply text-lg;
    @apply text-slate-600;
  }

  .about :global(p), .about :global(ol) {
    @apply mt-2;
    @apply text-slate-550;
  }
</style>
