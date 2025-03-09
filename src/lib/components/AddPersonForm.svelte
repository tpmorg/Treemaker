<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import type { Person } from '$lib/types';
  
  export let treeId: string;
  export let personId: string | null = null;
  export let isEditMode: boolean = false;
  
  const dispatch = createEventDispatcher();
  
  let formData = {
    firstName: '',
    lastName: '',
    birthDate: '',
    deathDate: '',
    gender: '',
    notes: ''
  };
  
  let errors: Record<string, string> = {};
  let isSubmitting = false;
  let successMessage = '';
  
  // If in edit mode and personId is provided, fetch the person data
  onMount(async () => {
    if (isEditMode && personId) {
      try {
        const response = await fetch(`/api/people/${personId}`);
        const result = await response.json();
        
        if (result.success && result.person) {
          // Format dates properly for date inputs
          const formatDate = (dateString: string | null) => {
            if (!dateString) return '';
            const date = new Date(dateString);
            return date.toISOString().split('T')[0];
          };
          
          formData = {
            firstName: result.person.firstName || '',
            lastName: result.person.lastName || '',
            birthDate: formatDate(result.person.birthDate),
            deathDate: formatDate(result.person.deathDate),
            gender: result.person.gender || '',
            notes: result.person.notes || ''
          };
        } else {
          errors.submit = result.error || 'Failed to load person data';
        }
      } catch (error) {
        errors.submit = 'An error occurred while fetching person data';
      }
    }
  });
  
  const genderOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' }
  ];
  
  const validateForm = () => {
    errors = {};
    
    if (!formData.firstName) {
      errors.firstName = 'First name is required';
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
      
      let url = '/api/people';
      let method = 'POST';
      
      // If in edit mode, use PUT request to update
      if (isEditMode && personId) {
        url = `/api/people/${personId}`;
        method = 'PUT';
      }
      
      const response = await fetch(url, {
        method,
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
      
      successMessage = isEditMode 
        ? 'Person updated successfully!' 
        : 'Person added successfully!';
      
      if (isEditMode) {
        dispatch('personUpdated', result.person);
      } else {
        dispatch('personAdded', result.person);
      }
      
      // Only reset form if not in edit mode
      if (!isEditMode) {
        formData = {
          firstName: '',
          lastName: '',
          birthDate: '',
          deathDate: '',
          gender: '',
          notes: ''
        };
      }
      
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
  <h2 class="text-xl font-semibold text-gray-800 mb-6">
    {isEditMode ? 'Edit Person' : 'Add New Person'}
  </h2>
  
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
          placeholder="Enter first name"
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
          placeholder="Enter last name"
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
        <option value="">Select gender</option>
        {#each genderOptions as option}
          <option value={option.value}>{option.label}</option>
        {/each}
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
        placeholder="Add any additional information"
      ></textarea>
    </div>
    
    <button
      type="submit"
      disabled={isSubmitting}
      class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
    >
      {#if isSubmitting}
        {isEditMode ? 'Updating...' : 'Adding...'}
      {:else}
        {isEditMode ? 'Update Person' : 'Add Person'}
      {/if}
    </button>
  </form>
</div>