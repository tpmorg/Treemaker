<script>
  import '../app.css';
  import { page } from '$app/stores';
</script>

<div class="min-h-screen flex flex-col">
  <!-- Navigation -->
  <nav class="bg-white shadow">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16">
        <div class="flex">
          <div class="flex-shrink-0 flex items-center">
            <a href="/" class="text-xl font-bold text-blue-600">TreeMaker</a>
          </div>
          <div class="hidden sm:ml-6 sm:flex sm:space-x-8">
            <a 
              href="/" 
              class={`${$page.url.pathname === '/' ? 'border-blue-500 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
            >
              Home
            </a>
            
            {#if $page.data.user}
              <a 
                href="/trees" 
                class={`${$page.url.pathname === '/trees' ? 'border-blue-500 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
              >
                Family Trees
              </a>
              
              <a 
                href="/account" 
                class={`${$page.url.pathname === '/account' ? 'border-blue-500 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
              >
                Account
              </a>
            {/if}
          </div>
        </div>
        
        <div class="hidden sm:ml-6 sm:flex sm:items-center">
          {#if $page.data.user}
            <div class="text-sm text-gray-500 mr-4">
              {$page.data.user.username}
            </div>
            <form action="/logout" method="POST">
              <button 
                type="submit"
                class="px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Logout
              </button>
            </form>
          {:else}
            <a 
              href="/auth/signup" 
              class="px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mr-2"
            >
              Sign Up
            </a>
            <a 
              href="/login" 
              class="px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Login
            </a>
          {/if}
        </div>
      </div>
    </div>
  </nav>
  
  <!-- Page Content -->
  <main class="flex-grow">
    <slot />
  </main>
  
  <!-- Footer -->
  <footer class="bg-gray-100 py-4">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <p class="text-center text-sm text-gray-500">
        &copy; {new Date().getFullYear()} TreeMaker. All rights reserved.
      </p>
    </div>
  </footer>
</div>