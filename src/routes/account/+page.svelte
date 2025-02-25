<script lang="ts">
  import { enhance } from "$app/forms";
  import { page } from "$app/stores";

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
</div>