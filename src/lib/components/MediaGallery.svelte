<script lang="ts">
  import type { Media } from "$lib/types";
  export let personId: string;
  
  let mediaItems: Media[] = [];
  let isLoading = true;
  let error = '';
  
  // Fetch media for the person
  const fetchMedia = async () => {
    if (!personId) return;
    
    try {
      isLoading = true;
      const response = await fetch(`/api/media?personId=${personId}`);
      const result = await response.json();
      
      if (result.success) {
        mediaItems = result.media;
      } else {
        error = result.error || 'Failed to load media';
      }
    } catch (err) {
      console.error('Error fetching media:', err);
      error = 'An unexpected error occurred';
    } finally {
      isLoading = false;
    }
  };
  
  // Watch for changes to personId
  $: if (personId) {
    fetchMedia();
  }
</script>

<div class="bg-white rounded-lg shadow p-6">
  <h2 class="text-xl font-semibold text-gray-800 mb-4">Media Gallery</h2>
  
  {#if isLoading}
    <div class="flex justify-center items-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    </div>
  {:else if error}
    <div class="p-4 bg-red-50 rounded-md mb-4">
      <p class="text-red-700">{error}</p>
    </div>
  {:else if mediaItems.length === 0}
    <div class="p-4 bg-yellow-50 rounded-md mb-4">
      <p class="text-yellow-700">No media items found for this person.</p>
    </div>
  {:else}
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {#each mediaItems as item}
        <div class="border rounded-lg overflow-hidden">
          {#if item.type === 'IMAGE'}
            <img 
              src={item.url} 
              alt={item.title || 'Image'} 
              class="w-full h-48 object-cover"
            />
          {:else if item.type === 'VIDEO'}
            <div class="relative pt-[56.25%]">
              <iframe
                src={item.url}
                title={item.title || 'Video'}
                class="absolute top-0 left-0 w-full h-full"
                frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen
              ></iframe>
            </div>
          {:else}
            <div class="h-48 flex items-center justify-center bg-gray-100">
              <svg class="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          {/if}
          
          <div class="p-4">
            {#if item.title}
              <h3 class="font-medium text-gray-900">{item.title}</h3>
            {/if}
            
            {#if item.description}
              <p class="mt-1 text-sm text-gray-500">{item.description}</p>
            {/if}
            
            <p class="mt-2 text-xs text-gray-400">
              Added {new Date(item.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>