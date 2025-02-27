<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let placeholder = 'Search for people...';
  export let label = 'Search People';
  export let showLabel = true;
  export let treeId: string | null = null;
  
  interface Person {
    id: string;
    firstName: string;
    lastName: string | null;
  }
  
  const dispatch = createEventDispatcher<{
    personSelected: Person;
    cancel: void;
  }>();
  
  let searchQuery = '';
  let isSearching = false;
  let people: Person[] = [];
  let error: string | null = null;
  
  async function searchPeople() {
    if (!searchQuery.trim()) return;
    
    try {
      isSearching = true;
      let url = `/api/people/search?query=${encodeURIComponent(searchQuery)}`;
      
      // Add treeId parameter if available
      if (treeId) {
        url += `&treeId=${encodeURIComponent(treeId)}`;
      }
      
      const response = await fetch(url);
      const result = await response.json();
      
      if (result.success) {
        people = result.people;
      } else {
        error = result.error;
      }
    } catch (err) {
      error = 'An error occurred while searching';
    } finally {
      isSearching = false;
    }
  }
  
  function selectPerson(person: Person) {
    dispatch('personSelected', person);
  }
  
  function cancel() {
    dispatch('cancel');
  }
</script>

<div class="person-search">
  {#if showLabel}
    <h3 class="text-lg font-semibold mb-4">{label}</h3>
  {/if}
  
  <div class="flex space-x-2 mb-4">
    <input
      type="text"
      bind:value={searchQuery}
      placeholder={placeholder}
      class="flex-1 px-3 py-2 border rounded-md"
    />
    <button
      on:click={searchPeople}
      disabled={isSearching}
      class="px-4 py-2 bg-blue-500 text-white rounded-md"
    >
      {#if isSearching}
        Searching...
      {:else}
        Search
      {/if}
    </button>
  </div>
  
  {#if error}
    <div class="bg-red-50 p-3 rounded-md text-red-700 mb-4">
      {error}
    </div>
  {/if}
  
  {#if people.length > 0}
    <div class="border rounded-md divide-y max-h-60 overflow-y-auto">
      {#each people as person}
        <div
          class="p-3 hover:bg-gray-50 cursor-pointer flex justify-between items-center"
          on:click={() => selectPerson(person)}
        >
          <div>
            <div class="font-medium">{person.firstName} {person.lastName || ''}</div>
          </div>
          <button class="text-blue-500 hover:text-blue-700">
            Select
          </button>
        </div>
      {/each}
    </div>
  {:else if searchQuery && !isSearching}
    <div class="text-gray-500 text-center p-4">
      No people found matching your search.
    </div>
  {/if}
  
  <div class="mt-4 flex justify-end">
    <button
      on:click={cancel}
      class="px-4 py-2 text-gray-700 hover:text-gray-900"
    >
      Cancel
    </button>
  </div>
</div>