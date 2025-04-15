<!-- EnhancedTreeNode.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Person, Media } from '$lib/types';
  
  export let person: Person;
  export let nodeId: string;
  export let isSelected: boolean = false;
  export let primaryMedia: Media | null = null;
  
  // Create a dispatch for node events
  const dispatch = createEventDispatcher<{
    select: { personId: string };
    edit: { personId: string };
    delete: { personId: string, nodeId: string };
  }>();
  
  // State for confirmation dialog
  let showDeleteConfirm = false;
  
  // Format birth/death dates for display
  $: birthYear = person.birthDate ? new Date(person.birthDate).getFullYear().toString() : null;
  $: deathYear = person.deathDate ? new Date(person.deathDate).getFullYear().toString() : null;
  $: fullName = `${person.firstName} ${person.lastName || ''}`.trim();
  
  // Default image if no media is provided
  $: defaultImageUrl = person.gender === 'female' 
    ? '/src/images/default-female.svg' 
    : (person.gender === 'male' ? '/src/images/default-male.svg' : '/images/default-person.svg');
  
  // Get the image URL (primary media or default)
  $: imageUrl = primaryMedia?.url || defaultImageUrl;
  
  // Handle node selection
  function handleNodeClick() {
    dispatch('select', { personId: person.id });
  }
  


  function handleDeleteClick(event: MouseEvent) {
    // Stop propagation to prevent the node selection
    event.stopPropagation();
    showDeleteConfirm = true;
  }
  
  function handleConfirmDelete() {
    dispatch('delete', { personId: person.id, nodeId });
    showDeleteConfirm = false;
  }
  
  function handleCancelDelete() {
    showDeleteConfirm = false;
  }
</script>

<div 
  class="tree-node relative p-2 rounded-lg transition-all {isSelected ? 'bg-blue-50 ring-2 ring-blue-500' : 'bg-white hover:bg-gray-50'}"
  class:shadow-md={!isSelected}
  class:shadow-lg={isSelected}
  on:click={handleNodeClick}
>
  <!-- Delete button -->
  <button 
    class="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-md z-10"
    on:click={handleDeleteClick}
    title="Delete node"
  >
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
    </svg>
  </button>
  
  <!-- Person Image -->
  <div class="relative mb-2">
    <img
      src={imageUrl}
      alt={fullName}
      class="w-20 h-20 rounded-full mx-auto object-cover border-2 {isSelected ? 'border-blue-500' : 'border-gray-300'}"
    />
    
  </div>
  
  <!-- Person Details -->
  <div class="text-center">
    <h3 class="font-semibold text-gray-900">{fullName}</h3>
    {#if birthYear || deathYear}
      <p class="text-sm text-gray-600 print:text-gray-800">
        {birthYear || '?'} - {deathYear || 'Present'}
      </p>
    {/if}
  </div>
</div>

<style>
  .tree-node {
    min-width: 120px;
    max-width: 150px;
    cursor: pointer;
  }
</style>

<!-- Confirmation Dialog -->
{#if showDeleteConfirm}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" on:click|self={handleCancelDelete}>
    <div class="bg-white rounded-lg shadow-xl p-6 max-w-sm mx-auto">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Confirm Deletion</h3>
      <p class="text-gray-700 mb-6">Are you sure you want to delete {fullName} from the tree? This action cannot be undone.</p>
      
      <div class="flex justify-end space-x-3">
        <button 
          class="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
          on:click={handleCancelDelete}
        >
          Cancel
        </button>
        <button 
          class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          on:click={handleConfirmDelete}
        >
          Delete
        </button>
      </div>
    </div>
  </div>
{/if}