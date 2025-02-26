<script lang="ts">
  import { page } from "$app/stores";
  import type { Tree, Person, Node, Media } from "$lib/types";
  import AddTreeForm from "$lib/components/AddTreeForm.svelte";
  import AddPersonForm from "$lib/components/AddPersonForm.svelte";
  import AddMediaForm from "$lib/components/AddMediaForm.svelte"; 
  import EnhancedFamilyTree from "$lib/components/EnhancedFamilyTree.svelte";

  // Tree and person management
  let selectedTreeId = "";
  let showGraphicalView = false; // Toggle between list view and graphical view
  let showEnhancedAddPerson = false; // Show person form in tree view
  let nodes: Node[] = []; // We'll need to fetch this later
  let treeMedia: Media[] = []; // We'll need to fetch this later
  let selectedPersonId = "";
  let showPersonForm = false;
  let showMediaForm = false;
  let showTreeForm = false;
  let trees: Tree[] = $page.data.trees || [];
  let people: Person[] = [];
  let errors: Record<string, string> = {};
  
  let activeTab: 'list' | 'tree' = 'list';

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
    selectedPersonId = "";
    fetchPeople(selectedTreeId);
  };
  
  // Handle person selection change
  const handlePersonChange = (event: Event) => {
    const select = event.target as HTMLSelectElement;
    selectedPersonId = select.value;
  };
  
  // Handle when a new person is added
  const handlePersonAdded = (event: CustomEvent) => {
    const newPerson = event.detail;
    people = [newPerson, ...people];
    selectedPersonId = newPerson.id;
    showPersonForm = false;
    showEnhancedAddPerson = false;
    
    // If we're in tree view, we may need to create a node for this person
    // This will happen automatically through EnhancedFamilyTree's handlePersonAdded
    
    // Refresh nodes if we're in tree view
    if (activeTab === 'tree') fetchNodes();
  };
  
  // Handle when new media is added
  const handleMediaAdded = () => {
    showMediaForm = false;
  };

  // Handle when a new tree is added
  const handleTreeAdded = (event: CustomEvent) => {
    const newTree = event.detail;
    trees = [newTree, ...trees];
    selectedTreeId = newTree.id;
    people = [];
    showTreeForm = false;
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
  
  // Toggle between list view and tree view
  function switchToListView() {
    activeTab = 'list';
  }
  
  function switchToTreeView() {
    activeTab = 'tree';
    // Fetch nodes for the tree view
    fetchNodes();
  }
  
  // Handle add person requested from tree view
  function handleAddPersonRequested() {
    showEnhancedAddPerson = true;
  }
  
  // Initialize data on page load
  if (trees.length > 0) {
    selectedTreeId = trees[0].id;
    fetchPeople(selectedTreeId);
  }
</script>

<div class="min-h-screen bg-gray-50">
  <div class="max-w-6xl mx-auto py-8 px-4">
    <h1 class="text-3xl font-bold text-gray-900 mb-8">Family Tree Management</h1>
    
    <!-- Tree selection always visible at the top -->
    <div class="bg-white rounded-lg shadow p-6 mb-6">
      <h2 class="text-xl font-semibold text-gray-800 mb-4">Your Family Trees</h2>
      
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
          
          <button
            on:click={() => { showTreeForm = !showTreeForm; }}
            class="ml-auto py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {showTreeForm ? 'Cancel' : 'Create New Tree'}
          </button>
        </div>
      {/if}
    </div>
    
    {#if showTreeForm}
      <div class="mb-6">
        <AddTreeForm on:treeAdded={handleTreeAdded} />
      </div>
    {/if}

    {#if selectedTreeId}
      <!-- View toggle tabs -->
      <div class="flex border-b border-gray-200 mb-6">
        <button
          on:click={switchToListView}
          class="py-2 px-4 border-b-2 font-medium text-sm {activeTab === 'list' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
        >
          List View
        </button>
        <button
          on:click={switchToTreeView}
          class="py-2 px-4 border-b-2 font-medium text-sm {activeTab === 'tree' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
        >
          Tree View
        </button>
      </div>
    {/if}
        
    {#if errors.trees || errors.people}
      <div class="mb-4 p-3 bg-red-100 text-red-700 rounded">
        {errors.trees || errors.people}
      </div>
    {/if}
    
    {#if selectedTreeId && activeTab === 'tree'}
      <!-- Graphical Tree View -->
      <div class="bg-white rounded-lg shadow p-6 relative">
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
    {:else if selectedTreeId && activeTab === 'list'}
      <!-- List View (Original UI) -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Left Column: Person Management Section -->
        <div class="lg:col-span-1">
          <div class="bg-white rounded-lg shadow p-6 mb-6">
            <h2 class="text-xl font-semibold text-gray-800 mb-4">People</h2>
            
            {#if people.length === 0}
              <div class="p-4 bg-yellow-50 rounded-md mb-4">
                <p class="text-yellow-700">No people added to this tree yet.</p>
              </div>
            {:else}
              <div class="mb-4">
                <label for="personSelect" class="block text-sm font-medium text-gray-700 mb-1">
                  Select Person
                </label>
                <select
                  id="personSelect"
                  value={selectedPersonId}
                  on:change={handlePersonChange}
                  class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="" disabled>Select a person</option>
                  {#each people as person}
                    <option value={person.id}>{person.firstName} {person.lastName || ''}</option>
                  {/each}
                </select>
              </div>
            {/if}
            
            <button
              on:click={() => { showPersonForm = !showPersonForm; showMediaForm = false; }}
              class="w-full mt-4 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              {showPersonForm ? 'Cancel' : 'Add New Person'}
            </button>
          </div>
        </div>
        
        <!-- Middle Column: Forms -->
        <div class="lg:col-span-1">
          {#if showPersonForm}
            <AddPersonForm 
              treeId={selectedTreeId} 
              on:personAdded={handlePersonAdded} 
            />
          {/if}
        </div>
        
        <!-- Right Column: Media Management -->
        <div class="lg:col-span-1">
          {#if selectedPersonId}
            <div class="bg-white rounded-lg shadow p-6 mb-6">
              <h2 class="text-xl font-semibold text-gray-800 mb-4">Media</h2>
              
              <button
                on:click={() => { showMediaForm = !showMediaForm; showPersonForm = false; }}
                class="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                {showMediaForm ? 'Cancel' : 'Add Media'}
              </button>
            </div>
            
            {#if showMediaForm}
              <AddMediaForm 
                personId={selectedPersonId} 
                on:mediaAdded={handleMediaAdded} 
              />
            {/if}
          {/if}
        </div>
      </div>
    {/if}
  </div>
</div>