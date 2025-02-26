<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { User } from '$lib/types';
  
  const dispatch = createEventDispatcher<{
    userSelected: User;
    cancel: void;
  }>();
  
  let searchQuery = '';
  let isSearching = false;
  let users: User[] = [];
  let error: string | null = null;
  
  async function searchUsers() {
    if (!searchQuery) return;
    
    try {
      isSearching = true;
      const response = await fetch(`/api/users/search?query=${encodeURIComponent(searchQuery)}`);
      const result = await response.json();
      
      if (result.success) {
        users = result.users;
      } else {
        error = result.error;
      }
    } catch (err) {
      error = 'An error occurred while searching';
    } finally {
      isSearching = false;
    }
  }
  
  function selectUser(user: User) {
    dispatch('userSelected', user);
  }
  
  function cancel() {
    dispatch('cancel');
  }
</script>

<div class="user-search">
  <h3 class="text-lg font-semibold mb-4">Find User</h3>
  
  <div class="flex space-x-2 mb-4">
    <input
      type="text"
      bind:value={searchQuery}
      placeholder="Search by name or email"
      class="flex-1 px-3 py-2 border rounded-md"
    />
    <button
      on:click={searchUsers}
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
  
  {#if users.length > 0}
    <div class="border rounded-md divide-y max-h-60 overflow-y-auto">
      {#each users as user}
        <div
          class="p-3 hover:bg-gray-50 cursor-pointer flex justify-between items-center"
          on:click={() => selectUser(user)}
        >
          <div>
            <div class="font-medium">{user.username}</div>
            <div class="text-sm text-gray-500">{user.email}</div>
          </div>
          <button class="text-blue-500 hover:text-blue-700">
            Select
          </button>
        </div>
      {/each}
    </div>
  {:else if searchQuery && !isSearching}
    <div class="text-gray-500 text-center p-4">
      No users found matching your search.
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