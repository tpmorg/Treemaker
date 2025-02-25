<!-- LoginForm.svelte -->
<script lang="ts">
  let formData = {
    email: '',
    password: ''
  };

  let errors: Record<string, string> = {};
  let isSubmitting = false;

  const validateForm = () => {
    errors = {};
    
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    }

    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      isSubmitting = true;
      const response = await fetch('/api/auth/login', {
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

      // Redirect to home page on success
      window.location.href = '/';
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

<div class="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
  <h2 class="text-2xl font-bold mb-6 text-gray-800">Login</h2>

  {#if errors.submit}
    <div class="mb-4 p-3 bg-red-100 text-red-700 rounded">
      {errors.submit}
    </div>
  {/if}

  <form on:submit|preventDefault={handleSubmit} class="space-y-4">
    <div>
      <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
      <input
        type="email"
        id="email"
        bind:value={formData.email}
        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        placeholder="Enter email"
      />
      {#if errors.email}
        <p class="mt-1 text-sm text-red-600">{errors.email}</p>
      {/if}
    </div>

    <div>
      <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
      <input
        type="password"
        id="password"
        bind:value={formData.password}
        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        placeholder="Enter password"
      />
      {#if errors.password}
        <p class="mt-1 text-sm text-red-600">{errors.password}</p>
      {/if}
    </div>

    <button
      type="submit"
      disabled={isSubmitting}
      class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
    >
      {#if isSubmitting}
        Logging in...
      {:else}
        Login
      {/if}
    </button>
  </form>
</div>