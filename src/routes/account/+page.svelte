<script lang="ts">
  import { enhance } from "$app/forms";
  import { page } from "$app/stores";
  import AddPersonForm from "$lib/components/AddPersonForm.svelte";
  import AddMediaForm from "$lib/components/AddMediaForm.svelte";

  // Define types for our data
  interface Tree {
    id: string;
    name: string;
    description?: string;
  }
  
  interface Person {
    id: string;
    firstName: string;
    lastName?: string;
    birthDate?: string;
    deathDate?: string;
    gender?: string;
    notes?: string;
    treeId: string;
    createdAt: string;
  }
  
  // Tree and person management
  let selectedTreeId = "";
  let selectedPersonId = "";
  let showPersonForm = false;
  let showMediaForm = false;
  let trees: Tree[] = [];
  let people: Person[] = [];

  let changePasswordForm = {
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  };

  let errors: Record<string, string> = {};
  let successMessage = "";

  const validatePasswordForm = () => {
    errors = {};
    
    if (!changePasswordForm.currentPassword) {
      errors.currentPassword = "Current password is required";
    }
    
    if (!changePasswordForm.newPassword) {
      errors.newPassword = "New password is required";
    } else if (changePasswordForm.newPassword.length < 8) {
      errors.newPassword = "Password must be at least 8 characters";
    }
    
    if (!changePasswordForm.confirmPassword) {
      errors.confirmPassword = "Please confirm your new password";
    } else if (changePasswordForm.newPassword !== changePasswordForm.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    return Object.keys(errors).length === 0;
  };

  const handlePasswordChange = async () => {
    if (!validatePasswordForm()) return;

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(changePasswordForm)
      });

      const result = await response.json();
      
      if (result.success) {
        successMessage = "Password changed successfully";
        changePasswordForm = {
          currentPassword: "",
          newPassword: "",
          confirmPassword: ""
        };
      } else {
        errors.submit = result.error;
      }
    } catch (error) {
      errors.submit = "An unexpected error occurred";
    }
  };

  let twoFactorEnabled = false;
  let showQRCode = false;
  let qrCodeUrl = "";
  let totpCode = "";

  const setupTwoFactor = async () => {
    try {
      const response = await fetch('/api/auth/setup-2fa', {
        method: 'POST'
      });
      
      const result = await response.json();
      if (result.success) {
        qrCodeUrl = result.qrCode;
        showQRCode = true;
      } else {
        errors.twoFactor = result.error;
      }
    } catch (error) {
      errors.twoFactor = "Failed to setup 2FA";
    }
  };

  const verifyTwoFactor = async () => {
    try {
      const response = await fetch('/api/auth/verify-2fa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code: totpCode })
      });
      
      const result = await response.json();
      if (result.success) {
        twoFactorEnabled = true;
        showQRCode = false;
        successMessage = "Two-factor authentication enabled successfully";
      } else {
        errors.totpCode = result.error;
      }
    } catch (error) {
      errors.totpCode = "Failed to verify code";
    }
  };
  
  // Fetch user's trees on page load
  const fetchTrees = async () => {
    try {
      const response = await fetch('/api/trees');
      const result = await response.json();
      
      if (result.success) {
        trees = result.trees;
        if (trees.length > 0) {
          selectedTreeId = trees[0].id;
          fetchPeople(selectedTreeId);
        }
      }
    } catch (error) {
      console.error('Error fetching trees:', error);
    }
  };
  
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
  };
  
  // Handle when new media is added
  const handleMediaAdded = () => {
    showMediaForm = false;
  };
  
  // Initialize data on page load
  fetchTrees();
</script>

<div class="min-h-screen bg-gray-50">
  <div class="max-w-4xl mx-auto py-8 px-4">
    <h1 class="text-3xl font-bold text-gray-900 mb-8">Account Settings</h1>

    <div class="bg-white rounded-lg shadow p-6 mb-8">
      <h2 class="text-xl font-semibold text-gray-800 mb-6">Change Password</h2>

      {#if errors.submit}
        <div class="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {errors.submit}
        </div>
      {/if}

      {#if successMessage}
        <div class="mb-4 p-3 bg-green-100 text-green-700 rounded">
          {successMessage}
        </div>
      {/if}

      <form class="space-y-4" on:submit|preventDefault={handlePasswordChange}>
        <div>
          <label for="currentPassword" class="block text-sm font-medium text-gray-700">
            Current Password
          </label>
          <input
            type="password"
            id="currentPassword"
            bind:value={changePasswordForm.currentPassword}
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          {#if errors.currentPassword}
            <p class="mt-1 text-sm text-red-600">{errors.currentPassword}</p>
          {/if}
        </div>

        <div>
          <label for="newPassword" class="block text-sm font-medium text-gray-700">
            New Password
          </label>
          <input
            type="password"
            id="newPassword"
            bind:value={changePasswordForm.newPassword}
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          {#if errors.newPassword}
            <p class="mt-1 text-sm text-red-600">{errors.newPassword}</p>
          {/if}
        </div>

        <div>
          <label for="confirmPassword" class="block text-sm font-medium text-gray-700">
            Confirm New Password
          </label>
          <input
            type="password"
            id="confirmPassword"
            bind:value={changePasswordForm.confirmPassword}
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          {#if errors.confirmPassword}
            <p class="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
          {/if}
        </div>

        <button
          type="submit"
          class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Change Password
        </button>
      </form>
    </div>

    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-xl font-semibold text-gray-800 mb-6">Two-Factor Authentication</h2>

      {#if errors.twoFactor}
        <div class="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {errors.twoFactor}
        </div>
      {/if}

      {#if !twoFactorEnabled}
        <div class="mb-4">
          <p class="text-gray-600">
            Add an extra layer of security to your account by enabling two-factor authentication.
          </p>
        </div>

        {#if !showQRCode}
          <button
            on:click={setupTwoFactor}
            class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Setup Two-Factor Authentication
          </button>
        {:else}
          <div class="mb-4">
            <p class="text-sm text-gray-600 mb-2">
              Scan this QR code with your authenticator app:
            </p>
            <img src={qrCodeUrl} alt="2FA QR Code" class="mx-auto mb-4" />
            
            <div class="max-w-xs mx-auto">
              <label for="totpCode" class="block text-sm font-medium text-gray-700">
                Enter the 6-digit code from your authenticator app:
              </label>
              <input
                type="text"
                id="totpCode"
                bind:value={totpCode}
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                maxlength="6"
                pattern="[0-9]*"
              />
              {#if errors.totpCode}
                <p class="mt-1 text-sm text-red-600">{errors.totpCode}</p>
              {/if}
              
              <button
                on:click={verifyTwoFactor}
                class="mt-4 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Verify and Enable
              </button>
            </div>
          </div>
        {/if}
      {:else}
        <div class="flex items-center justify-between p-4 bg-green-50 rounded-lg">
          <div class="flex items-center">
            <svg class="h-6 w-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span class="ml-2 text-green-700">Two-factor authentication is enabled</span>
          </div>
          <button
            class="text-sm text-red-600 hover:text-red-800"
            on:click={() => {
              // Add disable 2FA functionality
            }}
          >
            Disable
          </button>
        </div>
      {/if}
    </div>
  </div>
  
  <!-- Family Tree Management Section -->
  <div class="max-w-4xl mx-auto py-8 px-4">
    <h1 class="text-3xl font-bold text-gray-900 mb-8">Family Tree Management</h1>
    
    <!-- Tree and Person Selection -->
    <div class="bg-white rounded-lg shadow p-6 mb-8">
      <h2 class="text-xl font-semibold text-gray-800 mb-6">Select Tree and Person</h2>
      
      {#if trees.length === 0}
        <div class="p-4 bg-yellow-50 rounded-md mb-4">
          <p class="text-yellow-700">You don't have any family trees yet. Create one to get started.</p>
        </div>
      {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label for="treeSelect" class="block text-sm font-medium text-gray-700 mb-1">
              Select Family Tree
            </label>
            <select
              id="treeSelect"
              value={selectedTreeId}
              on:change={handleTreeChange}
              class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="" disabled>Select a tree</option>
              {#each trees as tree}
                <option value={tree.id}>{tree.name}</option>
              {/each}
            </select>
          </div>
          
          <div>
            <label for="personSelect" class="block text-sm font-medium text-gray-700 mb-1">
              Select Person
            </label>
            <select
              id="personSelect"
              value={selectedPersonId}
              on:change={handlePersonChange}
              class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              disabled={!selectedTreeId || people.length === 0}
            >
              <option value="" disabled>Select a person</option>
              {#each people as person}
                <option value={person.id}>{person.firstName} {person.lastName || ''}</option>
              {/each}
            </select>
          </div>
        </div>
        
        <div class="flex flex-wrap gap-4">
          <button
            on:click={() => { showPersonForm = !showPersonForm; showMediaForm = false; }}
            class="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            disabled={!selectedTreeId}
          >
            {showPersonForm ? 'Cancel' : 'Add New Person'}
          </button>
          
          <button
            on:click={() => { showMediaForm = !showMediaForm; showPersonForm = false; }}
            class="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={!selectedPersonId}
          >
            {showMediaForm ? 'Cancel' : 'Add Media'}
          </button>
        </div>
      {/if}
    </div>
    
    <!-- Add Person Form -->
    {#if showPersonForm && selectedTreeId}
      <AddPersonForm 
        treeId={selectedTreeId} 
        on:personAdded={handlePersonAdded} 
      />
    {/if}
    
    <!-- Add Media Form -->
    {#if showMediaForm && selectedPersonId}
      <AddMediaForm 
        personId={selectedPersonId} 
        on:mediaAdded={handleMediaAdded} 
      />
    {/if}
  </div>
</div>