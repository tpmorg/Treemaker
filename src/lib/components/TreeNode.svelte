<!-- TreeNode.svelte -->
<script lang="ts">
  export let name: string;
  export let birthYear: string | null = null;
  export let deathYear: string | null = null;
  export let imageUrl: string | null = null;
</script>

<div class="tree-node relative">
  {#if imageUrl}
    <img
      src={imageUrl}
      alt={name}
      class="w-16 h-16 rounded-full mx-auto mb-2 object-cover"
    />
  {/if}
  <div class="text-center">
    <h3 class="font-semibold">{name}</h3>
    {#if birthYear || deathYear}
      <p class="text-sm text-gray-600 print:text-gray-800">
        {birthYear || '?'} - {deathYear || 'Present'}
      </p>
    {/if}
  </div>
</div>