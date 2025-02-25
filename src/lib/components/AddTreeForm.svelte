<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Tree } from '$lib/types';
  
  const dispatch = createEventDispatcher();
  
  let formData = {
    name: '',
    description: ''
  };
  
  let errors: Record<string, string> = {};
  let isSubmitting = false;
  let successMessage = '';
  
  const validateForm = () => {
    errors = {};
    
    if (!formData.name) {
      errors.name = 'Tree name is required';
    }
    
    return Object.keys(errors).length === 0;
  };
  
  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    try {
      isSubmitting = true;
      const response = await fetch('/api/trees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error);
      }
      
      successMessage = 'Family tree created successfully!';
      dispatch('treeAdded', result.tree);
      
      // Reset form
      formData = {
        name: '',
        description: ''
      };
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        successMessage = '';
      }, 3000);
      
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
  <h2 class="text-xl font-semibold text-gray-800 mb-6">Create New Family Tree</h2>
  
  {#if successMessage}
    <div class="mb-4 p-3 bg-green-100 text-green-700 rounded">
      {successMessage}
    </div>
  {/if}
  
  {#if errors.submit}
    <div class="mb-4 p-3 bg-red-100 text-red-700 rounded">
      {errors.submit}
    </div>
  {/if}
  
  <form on:submit|preventDefault={handleSubmit} class="space-y-4">
    <div>
      <label for="treeName" class="block text-sm font-medium text-gray-700">
        Tree Name *
      </label>
      <input
        type="text"
        id="treeName"
        bind:value={formData.name}
        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        placeholder="Enter family tree name"
      />
      {#if errors.name}
        <p class="mt-1 text-sm text-red-600">{errors.name}</p>
      {/if}
    </div>
    
    <div>
      <label for="treeDescription" class="block text-sm font-medium text-gray-700">
        Description
      </label>
      <textarea
        id="treeDescription"
        bind:value={formData.description}
        rows="3"
        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        placeholder="Add a description for this family tree"
      ></textarea>
    </div>
    
    <button
      type="submit"
      disabled={isSubmitting}
      class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
    >
      {#if isSubmitting}
        Creating...
      {:else}
        Create Family Tree
      {/if}
    </button>
  </form>
</div>