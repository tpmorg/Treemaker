<!-- +page.svelte -->
<script lang="ts">
  import FamilyTree from '$lib/components/FamilyTree.svelte';
  import AddUserForm from '$lib/components/AddUserForm.svelte';

  let showAddUserModal = false;

  // Sample family tree data
  const familyData = [
    {
      id: '1',
      name: 'John Smith',
      birthYear: '1980',
      parents: ['2', '3']
    },
    {
      id: '2',
      name: 'Robert Smith',
      birthYear: '1950',
      deathYear: '2015',
      children: ['1']
    },
    {
      id: '3',
      name: 'Mary Johnson',
      birthYear: '1955',
      children: ['1']
    }
  ];
</script>

<div class="min-h-screen bg-gray-50 print:bg-white">
  <header class="p-4 bg-white shadow-sm print:hidden">
    <div class="max-w-7xl mx-auto flex justify-between items-center">
      <h1 class="text-2xl font-bold text-gray-800">Family Tree Maker</h1>
      <div class="space-x-4">
        <button
          class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          on:click={() => showAddUserModal = true}
        >
          Add User
        </button>

        <button
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          on:click={() => window.print()}
        >
          Print Tree
        </button>
      </div>
    </div>
  </header>

  <main class="max-w-7xl mx-auto py-8">
    <div class="bg-white rounded-lg shadow-sm p-6 print:shadow-none print:p-0">
      <FamilyTree data={familyData} rootId="1" />
    </div>
  </main>

  <footer class="p-4 text-center text-gray-600 print:hidden">
    <p>Use the Print button above to save or print your family tree</p>
  </footer>

  {#if showAddUserModal}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 print:hidden">
      <div class="relative bg-white rounded-lg w-full max-w-md mx-4">
        <button
          class="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          on:click={() => showAddUserModal = false}
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <div class="p-1">
          <AddUserForm />
        </div>
      </div>
    </div>
  {/if}
</div>

