<!-- EnhancedFamilyTree.svelte -->
<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import type { Person, Media, Node as TreeNode } from '$lib/types';
  import TreeCanvas from './TreeCanvas.svelte';
  import AddPersonForm from './AddPersonForm.svelte';
  import AddExistingUserForm from './AddExistingUserForm.svelte';
  import PersonSearch from './PersonSearch.svelte';
  import AddMediaForm from './AddMediaForm.svelte';
  
  // Props
  export let treeId: string;
  export let people: Person[] = [];
  export let nodes: TreeNode[] = [];
  export let media: Media[] = [];
  
  // State
  let selectedNodeId: string | null = null;
  let selectedPersonId: string | null = null;
  let relationshipType: 'parent' | 'child' | 'sibling' | 'spouse' | null = null;
  let isLoading = true;
  let error: string | null = null;
  let showAddPersonForm = false;
  let showAddExistingUserForm = false;
  let showMediaForm = false;
  let showPersonForm = false;
  let addingRootPerson = false;
  let relatedToPersonId: string | null = null;
  let existingUserRelationshipType: 'parent' | 'child' | 'sibling' | null = null;
  let activeTab: 'create' | 'search' = 'create';
  let selectedSearchPerson: { id: string; firstName: string; lastName: string | null } | null = null;
  
  // Create a dispatch for tree events
  const dispatch = createEventDispatcher<{
    personAdded: Person;
    personUpdated: Person;
    error: { message: string };
  }>();
  
  // Fetch tree data if not provided
  onMount(async () => {
    if (people.length === 0) {
      await fetchPeople();
    }
    
    if (nodes.length === 0) {
      await fetchNodes();
    }
    
    if (media.length === 0) {
      await fetchMedia();
    }
    
    isLoading = false;
  });
  
  // Helper functions
  function findPerson(personId: string): Person | undefined {
    return people.find(p => p.id === personId);
  }
  
  async function fetchPeople() {
    try {
      const response = await fetch(`/api/people?treeId=${treeId}`);
      const result = await response.json() as { success: boolean; people: Person[]; error?: string };
      
      if (result.success) {
        people = result.people;
      } else {
        error = result.error || 'Failed to load people';
        dispatch('error', { message: error });
      }
    } catch (err) {
      error = 'An error occurred while fetching people';
      dispatch('error', { message: error });
    }
  }
  
  async function fetchNodes() {
    try {
      const response = await fetch(`/api/nodes?treeId=${treeId}`);
      const result = await response.json() as { success: boolean; nodes: TreeNode[]; error?: string };
      
      if (result.success) {
        nodes = result.nodes;
      } else {
        error = result.error || 'Failed to load tree nodes';
        dispatch('error', { message: error });
      }
    } catch (err) {
      error = 'An error occurred while fetching nodes';
      dispatch('error', { message: error });
    }
  }
  
  async function fetchMedia() {
    try {
      // Fetch media for all people in this tree
      const personIds = people.map(p => p.id).join(',');
      if (!personIds) return;
      
      const response = await fetch(`/api/media/multiple?personIds=${personIds}`);
      const result = await response.json() as { success: boolean; media: Media[]; error?: string };
      
      if (result.success) {
        media = result.media;
      } else {
        error = result.error || 'Failed to load media';
        dispatch('error', { message: error });
      }
    } catch (err) {
      error = 'An error occurred while fetching media';
      dispatch('error', { message: error });
    }
  }
  
  function handleNodeSelect(event: CustomEvent<{ nodeId: string, personId: string }>) {
    const { nodeId, personId } = event.detail;
    selectedNodeId = nodeId;
    selectedPersonId = personId;
    relationshipType = null;
  }
  
  function handleAddRelationship(event: CustomEvent<{ personId: string, relationshipType: 'parent' | 'child' | 'sibling' | 'spouse' }>) {
    const { personId, relationshipType } = event.detail;
    selectedPersonId = personId;
    relatedToPersonId = personId;
    showAddPersonForm = true;
  }
  
  function handleAddPerson() {
    // Open add person form without any relationship constraints
    addingRootPerson = false;
    relationshipType = null;
    relatedToPersonId = null;
    showAddPersonForm = true;
  }
  
  function handleEditPerson(event: CustomEvent<{ personId: string }>) {
    const { personId } = event.detail;
    selectedPersonId = personId;
    showPersonForm = true;
  }
  
  function handleClosePersonForm() {
    showPersonForm = false;
    selectedPersonId = null;
  }
  
  function handlePersonUpdated(event: CustomEvent<Person>) {
    const updatedPerson = event.detail;
    
    // Update the person in our local state
    people = people.map(p => 
      p.id === updatedPerson.id ? updatedPerson : p
    );
    
    // Close the form
    showPersonForm = false;
    
    // Forward the event
    dispatch('personUpdated', updatedPerson);
  }
  
  function handleCloseActions() {
    selectedNodeId = null;
    selectedPersonId = null;
    relationshipType = null;
  }
  
  function handleCloseAddPersonForm() {
    showAddPersonForm = false;
    addingRootPerson = false;
    relationshipType = null;
    relatedToPersonId = null;
    activeTab = 'create';
    selectedSearchPerson = null;
  }
  
  function handleAddExistingUser(event: CustomEvent<{
    relationshipType: 'parent' | 'child' | 'sibling';
    relatedToPersonId: string;
  }>) {
    const { relationshipType: relType, relatedToPersonId: relPersonId } = event.detail;
    selectedPersonId = relPersonId;
    existingUserRelationshipType = relType;
    relatedToPersonId = relPersonId;
    showAddExistingUserForm = true;
  }
  
  function handleCloseAddExistingUserForm() {
    showAddExistingUserForm = false;
    existingUserRelationshipType = null;
    relatedToPersonId = null;
  }
  
  
  function handlePersonSelected(event: CustomEvent<{
    id: string;
    firstName: string;
    lastName: string | null;
  }>) {
    selectedSearchPerson = event.detail;
  }
  
  function handlePersonAdded(event: CustomEvent<Person>) {
    const newPerson = event.detail;
    
    // Add the new person to our local state
    people = [newPerson, ...people];
    
    // Create node and relationships based on the context
    if (!relationshipType || !relatedToPersonId) {
      // Just create a visual node for this person
      createVisualNode(newPerson.id);
    } else {
      // Create a relationship node with the related person
      createRelationshipNode(newPerson.id, relatedToPersonId, relationshipType);
    }
    
    // Reset state
    showAddPersonForm = false;
    addingRootPerson = false;
    relationshipType = null;
    relatedToPersonId = null;
    
    // Forward the event to parent components
    dispatch('personAdded', newPerson);
  }
  
  // Create a visual node for a person
  async function createVisualNode(personId: string, x = 0, y = 0, relatedToId?: string, relationType?: string) {
    try {
      const requestBody: any = {
        personId,
        treeId,
        x,
        y
      };
      
      // Add relationship data if provided
      if (relatedToId && relationType) {
        requestBody.relatedToPersonId = relatedToId;
        requestBody.relationType = relationType;
      }
      
      const response = await fetch('/api/nodes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      const result = await response.json();
      
      if (result.success) {
        nodes = [...nodes, result.node];
        selectedNodeId = result.node.id;
      } else {
        error = result.error || 'Failed to create node';
      }
    } catch (err) {
      error = 'An error occurred while creating the node';
    }
  }
  
  // Create a relationship node and connection
  async function createRelationshipNode(personId: string, relatedToPersonId: string, relationshipType: string) {
    try {
      // Create the visual node with relationship data
      const response = await fetch('/api/nodes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personId,
          treeId,
          x: 0,
          y: 0,
          relatedToPersonId,
          relationType: relationshipType,
          subType: 'BIOLOGICAL' // Default subtype
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        error = result.error || `Failed to create node for ${relationshipType} relationship`;
        return;
      }
      
      // If the node API fails to create the relationship, we'll create it manually as a fallback
      if (!result.relationshipCreated) {
        // Now create the appropriate relationship
        if (relationshipType.toUpperCase() === 'PARENT') {
          // Create parent-child relationship (current person is the parent)
          const relationResponse = await fetch('/api/family-relations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              parentId: personId,
              childId: relatedToPersonId,
              relationType: 'BIOLOGICAL',
              treeId
            })
          });
        } else if (relationshipType.toUpperCase() === 'CHILD') {
          // Create child-parent relationship (current person is the child)
          const relationResponse = await fetch('/api/family-relations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              parentId: relatedToPersonId,
              childId: personId,
              relationType: 'BIOLOGICAL',
              treeId
            })
          });
        } else if (relationshipType.toUpperCase() === 'SIBLING') {
          // Create sibling relationship
          const relationResponse = await fetch('/api/relationships', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fromPersonId: personId,
              toPersonId: relatedToPersonId,
              type: 'SIBLING',
              treeId
            })
          });
        } else if (relationshipType.toUpperCase() === 'SPOUSE') {
          // Create spouse relationship
          const relationResponse = await fetch('/api/relationships', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fromPersonId: personId,
              toPersonId: relatedToPersonId,
              type: 'SPOUSE',
              treeId
            })
          });
        }
      }
      
      // Update local state
      nodes = [...nodes, result.node];
      selectedNodeId = result.node.id;
    } catch (err) {
      error = `An error occurred while creating the ${relationshipType} relationship`;
    }
  }
  
  // Get the related person based on selected person and relationship
  $: relatedPerson = relatedToPersonId ? findPerson(relatedToPersonId) : null;
  
  // Get the selected person
  $: selectedPerson = selectedPersonId ? findPerson(selectedPersonId) : null;

  // Handle node deletion
  async function handleDeleteNode(event: CustomEvent<{ nodeId: string, personId: string }>) {
    const { nodeId, personId } = event.detail;
    
    try {
      isLoading = true;
      
      // Delete the node
      const response = await fetch(`/api/nodes?nodeId=${nodeId}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Update local state
        nodes = nodes.filter(n => n.id !== nodeId);
        
        // Reset selection if this was the selected node
        if (selectedNodeId === nodeId) {
          selectedNodeId = null;
          selectedPersonId = null;
        }
      } else {
        error = result.error || 'Failed to delete node';
      }
    } catch (err) {
      if (err instanceof Error) {
        error = err.message;
      } else {
        error = 'An unexpected error occurred while deleting the node';
      }
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="enhanced-family-tree">
  {#if isLoading}
    <div class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  {:else if error}
    <div class="bg-red-50 p-4 rounded-md">
      <p class="text-red-700">{error}</p>
      <button 
        on:click={() => { isLoading = true; error = null; fetchPeople(); fetchNodes(); fetchMedia(); }}
        class="mt-2 py-2 px-4 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
      >
        Try Again
      </button>
    </div>
  {:else}
    <!-- Add Person Form Modal -->
    {#if showAddPersonForm}
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
        <div class="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div class="p-4 border-b flex justify-between items-center">
            <h3 class="text-lg font-semibold">
              {#if relationshipType && relatedPerson}
                Add {relationshipType.charAt(0).toUpperCase() + relationshipType.slice(1)} for {relatedPerson.firstName} {relatedPerson.lastName || ''}
              {:else}
                Add Person
              {/if}
            </h3>
            <button
              on:click={handleCloseAddPersonForm}
              class="text-gray-400 hover:text-gray-600"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          
          <!-- Tab navigation -->
          <div class="flex border-b border-gray-200">
            <button
              on:click={() => { activeTab = 'create'; selectedSearchPerson = null; }}
              class="flex-1 py-2 px-4 text-center {activeTab === 'create' ? 'border-b-2 border-blue-500 text-blue-600 font-medium' : 'text-gray-500 hover:text-gray-700'}"
            >
              Create New
            </button>
            <button
              on:click={() => activeTab = 'search'}
              class="flex-1 py-2 px-4 text-center {activeTab === 'search' ? 'border-b-2 border-blue-500 text-blue-600 font-medium' : 'text-gray-500 hover:text-gray-700'}"
            >
              Find Existing
            </button>
          </div>
          
          <div class="p-4">
            {#if activeTab === 'create'}
              <!-- Create new person tab -->
              <AddPersonForm
                treeId={treeId}
                on:personAdded={handlePersonAdded}
              />
            {:else}
              <!-- Search tab -->
              <div>
                {#if selectedSearchPerson}
                  <div class="mb-6">
                    <div class="bg-blue-50 p-4 rounded-md mb-4">
                      <h3 class="font-medium text-blue-800 mb-2">Selected Person</h3>
                      <p class="text-blue-700">{selectedSearchPerson.firstName} {selectedSearchPerson.lastName || ''}</p>
                    </div>
                    
                    <button
                      on:click={() => {
                        if (selectedSearchPerson) {
                          if (relationshipType && relatedToPersonId) {
                            // Pass relationship info directly to createVisualNode
                            createVisualNode(selectedSearchPerson.id, 0, 0, relatedToPersonId, relationshipType);
                          } else {
                            createVisualNode(selectedSearchPerson.id);
                          }
                          handleCloseAddPersonForm();
                        }
                      }}
                      class="w-full py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      Add to Tree
                    </button>
                    
                    <button
                      on:click={() => selectedSearchPerson = null}
                      class="w-full mt-2 py-2 px-4 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                    >
                      Clear Selection
                    </button>
                  </div>
                {/if}
                
                <PersonSearch
                  placeholder="Search by name..."
                  label="Find Person"
                  treeId={treeId}
                  on:personSelected={(e) => selectedSearchPerson = e.detail}
                  on:cancel={handleCloseAddPersonForm}
                />
              </div>
            {/if}
          </div>
        </div>
      </div>
    {/if}
    
    {#if showAddExistingUserForm}
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
        <div class="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div class="p-4 border-b flex justify-between items-center">
            <h3 class="text-lg font-semibold">
              {#if existingUserRelationshipType && relatedPerson}
                Add Existing User as {existingUserRelationshipType.charAt(0).toUpperCase() + existingUserRelationshipType.slice(1)} for {relatedPerson.firstName} {relatedPerson.lastName || ''}
              {:else}
                Add Existing User
              {/if}
            </h3>
            <button
              on:click={handleCloseAddExistingUserForm}
              class="text-gray-400 hover:text-gray-600"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          <div class="p-4">
            <AddExistingUserForm
              treeId={treeId}
              relationshipType={existingUserRelationshipType}
              relatedToPersonId={relatedToPersonId}
              on:personAdded={handlePersonAdded}
              on:cancel={handleCloseAddExistingUserForm}
            />
          </div>
        </div>
      </div>
    {/if}
    
    {#if showMediaForm && selectedPersonId}
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
        <div class="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div class="p-4 border-b flex justify-between items-center">
            <h3 class="text-lg font-semibold">
              {#if selectedPerson}
                Add Media for {selectedPerson.firstName} {selectedPerson.lastName || ''}
              {:else}
                Add Media
              {/if}
            </h3>
            <button
              on:click={() => showMediaForm = false}
              class="text-gray-400 hover:text-gray-600"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          <div class="p-4">
            <AddMediaForm
              personId={selectedPersonId}
              on:mediaAdded={async (e) => {
                // Refresh media after adding
                await fetchMedia();
                showMediaForm = false;
              }}
            />
          </div>
        </div>
      </div>
    {/if}
    
    {#if showPersonForm && selectedPersonId}
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
        <div class="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div class="p-4 border-b flex justify-between items-center">
            <h3 class="text-lg font-semibold">
              {#if selectedPerson}
                Edit {selectedPerson.firstName} {selectedPerson.lastName || ''}
              {:else}
                Edit Person
              {/if}
            </h3>
            <button
              on:click={handleClosePersonForm}
              class="text-gray-400 hover:text-gray-600"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          <div class="p-4">
            <AddPersonForm
              treeId={treeId}
              personId={selectedPersonId}
              isEditMode={true}
              on:personUpdated={handlePersonUpdated}
            />
          </div>
        </div>
      </div>
    {/if}
    
    <!-- Main tree canvas -->
    <TreeCanvas
      {people}
      {nodes}
      {media}
      on:nodeSelect={handleNodeSelect}
      on:addRelationship={handleAddRelationship}
      on:editPerson={handleEditPerson}
      on:addMedia={(e) => {
        selectedPersonId = e.detail.personId;
        showMediaForm = true;
      }}
      on:addPerson={handleAddPerson}
      on:deleteNode={handleDeleteNode}
    />
    
    <!-- Node action panel removed -->
  {/if}
</div>

<style>
  .enhanced-family-tree {
    position: relative;
    width: 100%;
    min-height: 600px;
  }
</style>
