<script lang="ts">
  import type { Person } from "$lib/types";
  import { enhance } from "$app/forms";
  
  export let person: Person;

  $: ({ firstName, lastName, notes, gender } = person);
  $: birthDate = person.birthDate ? new Date(person.birthDate).toISOString().split('T')[0] : '';
  $: deathDate = person.deathDate ? new Date(person.deathDate).toISOString().split('T')[0] : '';
</script>

<form method="POST" action="/api/people/{person.id}" use:enhance>
  <div class="space-y-4">
    <div>
      <label for="name" class="block text-sm font-medium">First Name</label>
      <input
        id="name"
        name="name"
        type="text"
        bind:value={firstName}
        class="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>

    <div>
        <label for="name" class="block text-sm font-medium">Last Name</label>
        <input
          id="name"
          name="name"
          type="text"
          bind:value={lastName}
          class="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

    <div>
      <label for="bio" class="block text-sm font-medium">Notes</label>
      <textarea
        id="bio"
        name="bio"
        bind:value={notes}
        class="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        rows="4"
      />
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div>
        <label for="gender" class="block text-sm font-medium">Gender</label>
        <select
          id="gender"
          name="gender"
          bind:value={gender}
          class="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="MALE">Male</option>
          <option value="FEMALE">Female</option>
        </select>
      </div>

      <div>
        <label for="birthDate" class="block text-sm font-medium">Birth Date</label>
        <input
          id="birthDate"
          name="birthDate"
          type="date"
          bind:value={birthDate}
          class="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label for="deathDate" class="block text-sm font-medium">Death Date</label>
        <input
          id="deathDate"
          name="deathDate"
          type="date"
          bind:value={deathDate}
          class="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>

    <div class="flex justify-end">
      <button type="submit" class="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">Save Changes</button>
    </div>
  </div>
</form>
