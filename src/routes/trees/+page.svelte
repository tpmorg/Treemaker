<script lang="ts">
  import { page } from "$app/stores";
  import type { Tree, Person, Node, Media } from "$lib/types";
  import AddTreeForm from "$lib/components/AddTreeForm.svelte";
  import EnhancedFamilyTree from "$lib/components/EnhancedFamilyTree.svelte";

  // Tree and person management
  let selectedTreeId = "";
  let showEnhancedAddPerson = false; // Show person form in tree view
  let nodes: Node[] = []; // We'll need to fetch this later
  let treeMedia: Media[] = []; // We'll need to fetch this later
  let showTreeForm = false;
  let trees: Tree[] = $page.data.trees || [];
  let people: Person[] = [];
  let errors: Record<string, string> = {};

  // Fetch people for a selected tree
  const fetchPeople = async (treeId: string) => {
    if (!treeId) return;
    
    try {
      const response = await fetch(`/api/people?treeId=${treeId}`);
      const result = await response.json();
      
      if (result.success) {
        people = result.people;
      }
    } catch (error) {
      console.error('Error fetching people:', error);
      errors.people = 'Failed to load people';
    }
  };
  
  // Handle tree selection change
  const handleTreeChange = (event: Event) => {
    const select = event.target as HTMLSelectElement;
    selectedTreeId = select.value;
    fetchPeople(selectedTreeId);
    fetchNodes();
  };
  
  // Handle when a new person is added
  const handlePersonAdded = (event: CustomEvent) => {
    const newPerson = event.detail;
    people = [newPerson, ...people];
    showEnhancedAddPerson = false;
    
    // Refresh nodes
    fetchNodes();
  };

  // Handle when a new tree is added
  const handleTreeAdded = (event: CustomEvent) => {
    const newTree = event.detail;
    trees = [newTree, ...trees];
    selectedTreeId = newTree.id;
    people = [];
    showTreeForm = false;
    fetchNodes();
  };
  
  // Fetch nodes from the API
  async function fetchNodes() {
    try {
      const response = await fetch(`/api/nodes?treeId=${selectedTreeId}`);
      const result = await response.json();
      if (result.success) {
        nodes = result.nodes;
      }
    } catch (err) {
      console.error('Error fetching nodes:', err);
    }
  }
  
  // Handle add person requested from tree view
  function handleAddPersonRequested() {
    showEnhancedAddPerson = true;
  }
  
  // Initialize data on page load
  if (trees.length > 0) {
    selectedTreeId = trees[0].id;
    fetchPeople(selectedTreeId);
    fetchNodes();
  }
</script>

<div class="min-h-screen bg-gray-50">
  <div class="max-w-6xl mx-auto py-8 px-4">
    <!-- Tree selection always visible at the top -->
    <div class="bg-white rounded-lg shadow p-6 mb-6">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-semibold text-gray-800">Your Family Trees</h2>
        <button
          on:click={() => { showTreeForm = !showTreeForm; }}
          class="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {showTreeForm ? 'Cancel' : 'Add Tree'}
        </button>
      </div>
      
      {#if trees.length === 0}
        <div class="p-4 bg-yellow-50 rounded-md mb-4">
          <p class="text-yellow-700">You don't have any family trees yet. Create one to get started.</p>
        </div>
      {:else}
        <div class="flex flex-wrap items-center gap-2">
          <label for="treeSelect" class="text-sm font-medium text-gray-700">Select Family Tree:</label>
          <select
            id="treeSelect"
            value={selectedTreeId}
            on:change={handleTreeChange}
            class="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="" disabled>Select a tree</option>
            {#each trees as tree}
              <option value={tree.id}>{tree.name}</option>
            {/each}
          </select>
        </div>
      {/if}
    </div>
    
    {#if showTreeForm}
      <div class="mb-6">
        <AddTreeForm on:treeAdded={handleTreeAdded} />
      </div>
    {/if}
        
    {#if errors.trees || errors.people}
      <div class="mb-4 p-3 bg-red-100 text-red-700 rounded">
        {errors.trees || errors.people}
      </div>
    {/if}
    
    {#if selectedTreeId}
      <!-- Graphical Tree View -->
      <div class="bg-white rounded-lg shadow p-6 relative flex justify-center">
        <div class="w-full h-[70vh]"> <!-- Use viewport height to ensure visibility -->
          <EnhancedFamilyTree
            treeId={selectedTreeId}
            on:personAdded={handlePersonAdded}
            on:addPersonRequested={handleAddPersonRequested}
            on:error={(e) => errors.tree = e.detail.message}
            {people}
            {nodes}
            media={treeMedia}
            on:personAdded={handlePersonAdded}
            on:error={(e) => errors.trees = e.detail.message}
          />
        </div>
      </div>
    {/if}
  </div>
</div>