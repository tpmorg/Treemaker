<!-- NodeActions.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Person } from '$lib/types';
  
  export let person: Person;
  export let relationshipType: 'parent' | 'child' | 'sibling' | null = null;
  export let relatedToPerson: Person | null = null;
  
  // Create a dispatch for node events
  const dispatch = createEventDispatcher<{
    close: void;
    addPerson: {
      relationshipType: 'parent' | 'child' | 'sibling';
      relatedToPersonId: string;
    };
    addExistingUser: {
      relationshipType: 'parent' | 'child' | 'sibling';
      relatedToPersonId: string;
    };
    editPerson: { personId: string };
  }>();
  
  // Format relationship description
  $: relationshipDescription = relationshipType && relatedToPerson
    ? getRelationshipDescription(relationshipType, relatedToPerson)
    : '';
  
  function getRelationshipDescription(type: 'parent' | 'child' | 'sibling', related: Person): string {
    const relatedName = `${related.firstName} ${related.lastName || ''}`.trim();
    switch (type) {
      case 'parent':
        return `Adding parent for ${relatedName}`;
      case 'child':
        return `Adding child for ${relatedName}`;
      case 'sibling':
        return `Adding sibling for ${relatedName}`;
      default:
        return '';
    }
  }
  
  // Handle close
  function handleClose() {
    dispatch('close');
  }
  
  // Handle add person
  function handleAddPerson() {
    if (relationshipType && relatedToPerson) {
      dispatch('addPerson', {
        relationshipType,
        relatedToPersonId: relatedToPerson.id
      });
    }
  }
  
  // Handle edit person
  function handleEditPerson() {
    dispatch('editPerson', { personId: person.id });
  }
</script>

<div class="node-actions bg-white rounded-lg shadow-lg p-4 max-w-md">
  <!-- Header -->
  <div class="flex justify-between items-center mb-4">
    <h3 class="text-lg font-semibold text-gray-900">
      {#if relationshipType}
        {relationshipDescription}
      {:else}
        Person Details
      {/if}
    </h3>
    <button 
      on:click={handleClose}
      class="text-gray-500 hover:text-gray-700" 
      aria-label="Close"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
      </svg>
    </button>
  </div>
  
  <!-- Person Information -->
  <div class="mb-4">
    <h4 class="font-medium text-gray-800">{person.firstName} {person.lastName || ''}</h4>
    
    {#if person.birthDate || person.deathDate}
      <p class="text-sm text-gray-600">
        {#if person.birthDate}
          Born: {new Date(person.birthDate).toLocaleDateString()}
        {/if}
        {#if person.deathDate}
          {#if person.birthDate} · {/if}
          Died: {new Date(person.deathDate).toLocaleDateString()}
        {/if}
      </p>
    {/if}
    
    {#if person.gender}
      <p class="text-sm text-gray-600">
        Gender: {person.gender.charAt(0).toUpperCase() + person.gender.slice(1)}
      </p>
    {/if}
    
    {#if person.notes}
      <div class="mt-2 text-sm text-gray-700">
        <p class="font-medium">Notes:</p>
        <p>{person.notes}</p>
      </div>
    {/if}
  </div>
  
  <!-- Action Buttons -->
  <div class="flex flex-wrap gap-2">
    {#if relationshipType}
      <button
        on:click={handleAddPerson}
        class="flex-1 py-2 px-4 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
      >
        Add {relationshipType.charAt(0).toUpperCase() + relationshipType.slice(1)}
      </button>
      
      <button
        on:click={() => dispatch('addExistingUser', {
          relationshipType,
          relatedToPersonId: relatedToPerson?.id || ''
        })}
        class="flex-1 py-2 px-4 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition-colors"
      >
        Add Existing User
      </button>
      
      <button
        on:click={handleClose}
        class="py-2 px-4 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
      >
        Cancel
      </button>
    {:else}
      <button
        on:click={handleEditPerson}
        class="flex-1 py-2 px-4 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
      >
        Edit Details
      </button>
    {/if}
  </div>
</div>