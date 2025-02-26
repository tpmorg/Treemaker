<!-- EnhancedTreeNode.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Person, Media } from '$lib/types';
  
  export let person: Person;
  export let isSelected: boolean = false;
  export let primaryMedia: Media | null = null;
  
  // Create a dispatch for node events
  const dispatch = createEventDispatcher<{
    select: { personId: string };
    addParent: { personId: string };
    addChild: { personId: string };
    addSibling: { personId: string };
    edit: { personId: string };
  }>();
  
  // Format birth/death dates for display
  $: birthYear = person.birthDate ? new Date(person.birthDate).getFullYear().toString() : null;
  $: deathYear = person.deathDate ? new Date(person.deathDate).getFullYear().toString() : null;
  $: fullName = `${person.firstName} ${person.lastName || ''}`.trim();
  
  // Default image if no media is provided
  $: defaultImageUrl = person.gender === 'female' 
    ? '/images/default-female.svg' 
    : (person.gender === 'male' ? '/images/default-male.svg' : '/images/default-person.svg');
  
  // Get the image URL (primary media or default)
  $: imageUrl = primaryMedia?.url || defaultImageUrl;
  
  // Handle node selection
  function handleNodeClick() {
    dispatch('select', { personId: person.id });
  }
  
  // Handle relationship buttons
  function handleAddParent() {
    dispatch('addParent', { personId: person.id });
  }
  
  function handleAddChild() {
    dispatch('addChild', { personId: person.id });
  }
  
  function handleAddSibling() {
    dispatch('addSibling', { personId: person.id });
  }
  
  function handleEdit() {
    dispatch('edit', { personId: person.id });
  }
</script>

<div 
  class="tree-node relative p-2 rounded-lg transition-all {isSelected ? 'bg-blue-50 ring-2 ring-blue-500' : 'bg-white hover:bg-gray-50'}"
  class:shadow-md={!isSelected}
  class:shadow-lg={isSelected}
  on:click={handleNodeClick}
>
  <!-- Person Image -->
  <div class="relative mb-2">
    <img
      src={imageUrl}
      alt={fullName}
      class="w-20 h-20 rounded-full mx-auto object-cover border-2 {isSelected ? 'border-blue-500' : 'border-gray-300'}"
    />
    
    <!-- Gender indicator (small icon top right of image) -->
    {#if person.gender}
      <div class="absolute top-0 right-0 rounded-full w-5 h-5 flex items-center justify-center text-white text-xs"
        class:bg-blue-500={person.gender === 'male'}
        class:bg-pink-500={person.gender === 'female'}
        class:bg-purple-500={person.gender === 'other'}>
        {#if person.gender === 'male'}M{/if}
        {#if person.gender === 'female'}F{/if}
        {#if person.gender === 'other'}O{/if}
      </div>
    {/if}
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
  
  <!-- Action Buttons - Only shown when selected -->
  {#if isSelected}
    <div class="action-buttons flex flex-wrap justify-center gap-1 mt-3">
      <button 
        on:click|stopPropagation={handleAddParent}
        class="text-xs py-1 px-2 bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors"
        title="Add Parent">
        + Parent
      </button>
      <button 
        on:click|stopPropagation={handleAddSibling}
        class="text-xs py-1 px-2 bg-purple-100 text-purple-800 rounded hover:bg-purple-200 transition-colors"
        title="Add Sibling">
        + Sibling
      </button>
      <button 
        on:click|stopPropagation={handleAddChild}
        class="text-xs py-1 px-2 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors"
        title="Add Child">
        + Child
      </button>
      <button 
        on:click|stopPropagation={handleEdit}
        class="text-xs py-1 px-2 bg-gray-100 text-gray-800 rounded hover:bg-gray-200 transition-colors"
        title="Edit Person">
        Edit
      </button>
    </div>
  {/if}
</div>

<style>
  .tree-node {
    min-width: 120px;
    max-width: 150px;
    cursor: pointer;
  }
</style>