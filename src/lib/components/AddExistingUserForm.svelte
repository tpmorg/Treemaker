<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Person, User } from '$lib/types';
  import UserSearchForm from './UserSearchForm.svelte';
  
  export let treeId: string;
  export let relationshipType: 'parent' | 'child' | 'sibling' | null = null;
  export let relatedToPersonId: string | null = null;
  
  const dispatch = createEventDispatcher<{
    personAdded: Person;
    cancel: void;
  }>();
  
  let selectedUser: User | null = null;
  let showUserSearch = true;
  
  let formData = {
    firstName: '',
    lastName: '',
    birthDate: '',
    deathDate: '',
    gender: '',
    notes: '',
    userId: ''
  };
  
  let errors: Record<string, string> = {};
  let isSubmitting = false;
  
  function handleUserSelected(event: CustomEvent<User>) {
    selectedUser = event.detail;
    formData.userId = selectedUser.id;
    // Prefill name from username (optional)
    const nameParts = selectedUser.username.split(' ');
    formData.firstName = nameParts[0] || '';
    formData.lastName = nameParts.slice(1).join(' ') || '';
    showUserSearch = false;
  }
  
  function handleCancel() {
    dispatch('cancel');
  }
  
  const validateForm = () => {
    errors = {};
    
    if (!formData.firstName) {
      errors.firstName = 'First name is required';
    }
    
    if (!formData.userId) {
      errors.user = 'Please select a user';
    }
    
    // Validate dates if provided
    if (formData.birthDate && formData.deathDate) {
      const birth = new Date(formData.birthDate);
      const death = new Date(formData.deathDate);
      
      if (birth > death) {
        errors.deathDate = 'Death date cannot be before birth date';
      }
    }
    
    return Object.keys(errors).length === 0;
  };
  
  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    try {
      isSubmitting = true;
      const response = await fetch('/api/people', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          treeId
        })
      });
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error);
      }
      
      dispatch('personAdded', result.person);
    } catch (error) {
      if (error instanceof Error) {
        errors.submit = error.message;
      } else {
        errors.submit = 'An unexpected error occurred';
      }
    } finally {
      isSubmitting = false;
    }
  };
</script>

<div class="bg-white rounded-lg shadow p-6">
  <h2 class="text-xl font-semibold text-gray-800 mb-6">
    {#if relationshipType}
      Add Existing User as {relationshipType.charAt(0).toUpperCase() + relationshipType.slice(1)}
    {:else}
      Add Existing User to Tree
    {/if}
  </h2>
  
  {#if errors.submit}
    <div class="mb-4 p-3 bg-red-100 text-red-700 rounded">
      {errors.submit}
    </div>
  {/if}
  
  {#if showUserSearch}
    <UserSearchForm
      on:userSelected={handleUserSelected}
      on:cancel={handleCancel}
    />
  {:else}
    <div class="mb-4 p-3 bg-blue-50 text-blue-800 rounded flex justify-between items-center">
      <div>
        <div class="font-medium">Selected User: {selectedUser?.username}</div>
        <div class="text-sm">{selectedUser?.email}</div>
      </div>
      <button 
        on:click={() => { showUserSearch = true; }}
        class="text-blue-700 hover:text-blue-900"
      >
        Change
      </button>
    </div>
    
    <form on:submit|preventDefault={handleSubmit} class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label for="firstName" class="block text-sm font-medium text-gray-700">
            First Name *
          </label>
          <input
            type="text"
            id="firstName"
            bind:value={formData.firstName}
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          {#if errors.firstName}
            <p class="mt-1 text-sm text-red-600">{errors.firstName}</p>
          {/if}
        </div>
        
        <div>
          <label for="lastName" class="block text-sm font-medium text-gray-700">
            Last Name
          </label>
          <input
            type="text"
            id="lastName"
            bind:value={formData.lastName}
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label for="birthDate" class="block text-sm font-medium text-gray-700">
            Birth Date
          </label>
          <input
            type="date"
            id="birthDate"
            bind:value={formData.birthDate}
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label for="deathDate" class="block text-sm font-medium text-gray-700">
            Death Date
          </label>
          <input
            type="date"
            id="deathDate"
            bind:value={formData.deathDate}
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          {#if errors.deathDate}
            <p class="mt-1 text-sm text-red-600">{errors.deathDate}</p>
          {/if}
        </div>
      </div>
      
      <div>
        <label for="gender" class="block text-sm font-medium text-gray-700">
          Gender
        </label>
        <select
          id="gender"
          bind:value={formData.gender}
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="">Select Gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
      </div>
      
      <div>
        <label for="notes" class="block text-sm font-medium text-gray-700">
          Notes
        </label>
        <textarea
          id="notes"
          bind:value={formData.notes}
          rows="3"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        ></textarea>
      </div>
      
      <div class="flex justify-end space-x-3">
        <button
          type="button"
          on:click={handleCancel}
          class="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Cancel
        </button>
        
        <button
          type="submit"
          disabled={isSubmitting}
          class="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {#if isSubmitting}
            Adding...
          {:else}
            Add to Tree
          {/if}
        </button>
      </div>
    </form>
  {/if}
</div>