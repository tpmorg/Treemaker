<script lang="ts">
  import { onMount } from 'svelte';
  
  let migrationStatus: 'idle' | 'running' | 'success' | 'error' = 'idle';
  let message = '';
  
  async function runMigration() {
    if (migrationStatus === 'running') return;
    
    try {
      migrationStatus = 'running';
      message = 'Running migration...';
      
      const response = await fetch('/api/migration', {
        method: 'POST'
      });
      
      const result = await response.json();
      
      if (result.success) {
        migrationStatus = 'success';
        message = result.message || 'Migration completed successfully!';
      } else {
        migrationStatus = 'error';
        message = result.error || 'Migration failed';
      }
    } catch (error) {
      migrationStatus = 'error';
      message = error instanceof Error ? error.message : 'An unexpected error occurred';
    }
  }
</script>

<div class="container mx-auto p-6 max-w-4xl">
  <h1 class="text-3xl font-bold mb-6">Database Migration Tool</h1>
  
  <div class="bg-white p-6 rounded-lg shadow-md">
    <h2 class="text-xl font-semibold mb-4">Migrate Node Relationships</h2>
    
    <p class="mb-4">
      This tool will convert existing Node relationships to the new FamilyRelation and Relationship 
      models. This should only be run once after updating the database schema.
    </p>
    
    <div class="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6">
      <h3 class="text-amber-800 font-semibold">Warning</h3>
      <p class="text-amber-700">
        This is a one-way migration. Make sure you have a backup of your database before proceeding.
        Running this migration multiple times may create duplicate relationships.
      </p>
    </div>
    
    <div class="mb-6">
      <button 
        on:click={runMigration}
        disabled={migrationStatus === 'running'}
        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
      >
        {#if migrationStatus === 'running'}
          <span class="inline-block mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          Running Migration...
        {:else}
          Run Migration
        {/if}
      </button>
      
      {#if migrationStatus === 'success'}
        <div class="mt-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-800">
          <strong>Success:</strong> {message}
        </div>
      {:else if migrationStatus === 'error'}
        <div class="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-800">
          <strong>Error:</strong> {message}
        </div>
      {/if}
    </div>
    
    <h3 class="text-lg font-semibold mb-2">What This Migration Does:</h3>
    <ul class="list-disc pl-6 mb-6 space-y-1">
      <li>Converts Node position data to the new x,y coordinate format</li>
      <li>Creates FamilyRelation records for parent-child relationships</li>
      <li>Creates Relationship records for sibling and spouse relationships</li>
    </ul>
    
    <div class="bg-gray-50 p-4 rounded-md">
      <h3 class="text-lg font-semibold mb-2">After Migration:</h3>
      <p>
        After running this migration, your family tree should continue to work as before,
        but with the added benefit of proper family relationship data. You can now use the
        enhanced family relationship API to query family members directly.
      </p>
    </div>
  </div>
</div>