<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  
  export let personId: string;
  
  const dispatch = createEventDispatcher();
  
  let formData = {
    url: '',
    type: 'IMAGE',
    title: '',
    description: ''
  };
  
  let errors: Record<string, string> = {};
  let isSubmitting = false;
  let successMessage = '';
  let isUploading = false;
  let uploadProgress = 0;
  let selectedFile: File | null = null;
  
  const mediaTypes = [
    { value: 'IMAGE', label: 'Image' },
    { value: 'DOCUMENT', label: 'Document' },
    { value: 'VIDEO', label: 'Video' }
  ];
  
  const validateForm = () => {
    errors = {};
    
    if (!formData.url) {
      errors.url = 'Media URL is required';
    }
    
    if (!formData.type) {
      errors.type = 'Media type is required';
    }
    
    return Object.keys(errors).length === 0;
  };
  
  const handleFileChange = (event: Event) => {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      selectedFile = input.files[0];
    }
  };
  
  const uploadToCloudinary = async () => {
    if (!selectedFile) return null;
    
    isUploading = true;
    uploadProgress = 0;
    
    try {
      // Create a FormData object to send the file
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('upload_preset', 'treemaker_uploads'); // You'll need to create this preset in Cloudinary
      
      // Upload to Cloudinary via a proxy endpoint
      const response = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload image');
      }
      
      const result = await response.json();
      isUploading = false;
      uploadProgress = 100;
      
      return result.url;
    } catch (error) {
      isUploading = false;
      if (error instanceof Error) {
        errors.upload = error.message;
      } else {
        errors.upload = 'An unexpected error occurred during upload';
      }
      return null;
    }
  };
  
  const handleSubmit = async () => {
    errors = {};
    
    // If a file is selected, upload it first
    if (selectedFile) {
      const uploadedUrl = await uploadToCloudinary();
      if (uploadedUrl) {
        formData.url = uploadedUrl;
      } else {
        return; // Stop if upload failed
      }
    }
    
    if (!validateForm()) return;
    
    try {
      isSubmitting = true;
      const response = await fetch('/api/media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          personId
        })
      });
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error);
      }
      
      successMessage = 'Media added successfully!';
      dispatch('mediaAdded', result.media);
      
      // Reset form
      formData = {
        url: '',
        type: 'IMAGE',
        title: '',
        description: ''
      };
      selectedFile = null;
      
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
  <h2 class="text-xl font-semibold text-gray-800 mb-6">Add Media</h2>
  
  {#if successMessage}
    <div class="mb-4 p-3 bg-green-100 text-green-700 rounded">
      {successMessage}
    </div>
  {/if}
  
  {#if errors.submit || errors.upload}
    <div class="mb-4 p-3 bg-red-100 text-red-700 rounded">
      {errors.submit || errors.upload}
    </div>
  {/if}
  
  <form on:submit|preventDefault={handleSubmit} class="space-y-4">
    <div>
      <label for="mediaType" class="block text-sm font-medium text-gray-700">
        Media Type *
      </label>
      <select
        id="mediaType"
        bind:value={formData.type}
        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
      >
        {#each mediaTypes as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
      {#if errors.type}
        <p class="mt-1 text-sm text-red-600">{errors.type}</p>
      {/if}
    </div>
    
    <div>
      <label class="block text-sm font-medium text-gray-700">
        Upload File
      </label>
      <div class="mt-1 flex items-center">
        <input
          type="file"
          on:change={handleFileChange}
          class="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100"
        />
      </div>
      
      {#if isUploading}
        <div class="w-full bg-gray-200 rounded-full h-2.5 mt-2">
          <div class="bg-blue-600 h-2.5 rounded-full" style="width: {uploadProgress}%"></div>
        </div>
        <p class="text-xs text-gray-500 mt-1">Uploading... {uploadProgress}%</p>
      {/if}
    </div>
    
    <div>
      <label for="url" class="block text-sm font-medium text-gray-700">
        Media URL *
      </label>
      <input
        type="text"
        id="url"
        bind:value={formData.url}
        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        placeholder="Enter URL or upload a file"
      />
      {#if errors.url}
        <p class="mt-1 text-sm text-red-600">{errors.url}</p>
      {/if}
      <p class="text-xs text-gray-500 mt-1">
        You can either enter a URL directly or upload a file above
      </p>
    </div>
    
    <div>
      <label for="title" class="block text-sm font-medium text-gray-700">
        Title
      </label>
      <input
        type="text"
        id="title"
        bind:value={formData.title}
        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        placeholder="Enter media title"
      />
    </div>
    
    <div>
      <label for="description" class="block text-sm font-medium text-gray-700">
        Description
      </label>
      <textarea
        id="description"
        bind:value={formData.description}
        rows="3"
        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        placeholder="Add a description"
      ></textarea>
    </div>
    
    <button
      type="submit"
      disabled={isSubmitting || isUploading}
      class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
    >
      {#if isSubmitting}
        Adding...
      {:else}
        Add Media
      {/if}
    </button>
  </form>
</div>