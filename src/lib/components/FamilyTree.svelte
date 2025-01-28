<!-- FamilyTree.svelte -->
<script lang="ts">
  import TreeNode from './TreeNode.svelte';

  interface Person {
    id: string;
    name: string;
    birthYear?: string;
    deathYear?: string;
    imageUrl?: string;
    parents?: string[];
    children?: string[];
  }

  interface TreeNodeData {
    person: Person;
    parents: (TreeNodeData | null)[];
    level: number;
  }

  export let data: Person[];
  export let rootId: string;

  // Find person by ID
  const findPerson = (id: string) => data.find(p => p.id === id);

  // Get parents of a person
  const getParents = (person: Person) => {
    if (!person.parents) return [];
    return person.parents
      .map(id => findPerson(id))
      .filter((p): p is Person => p !== undefined);
  };

  // Get children of a person
  const getChildren = (person: Person) => {
    if (!person.children) return [];
    return person.children
      .map(id => findPerson(id))
      .filter((p): p is Person => p !== undefined);
  };

  // Recursive function to render a person and their ancestors
  const renderPerson = (id: string, level: number = 0): TreeNodeData | null => {
    const person = findPerson(id);
    if (!person) return null;

    const parents = getParents(person);
    
    return {
      person,
      parents: parents.map(p => renderPerson(p.id, level + 1)),
      level
    };
  };

  $: treeData = renderPerson(rootId);
</script>

<div class="family-tree p-8 min-h-screen print:p-0 print:min-h-0">
  {#if treeData}
    <div class="flex flex-col items-center">
      <!-- Recursive template for rendering tree nodes -->
      {#if treeData.parents && treeData.parents.length > 0}
        <div class="flex gap-x-tree-x mb-tree-y relative">
          {#each treeData.parents as parentNode}
            {#if parentNode}
              <div class="flex flex-col items-center">
                <TreeNode
                  name={parentNode.person.name}
                  birthYear={parentNode.person.birthYear}
                  deathYear={parentNode.person.deathYear}
                  imageUrl={parentNode.person.imageUrl}
                />
              </div>
            {/if}
          {/each}
          <!-- Parent connector lines -->
          <div class="tree-connector-horizontal absolute bottom-0 left-0 right-0" />
        </div>
        <!-- Vertical connector line -->
        <div class="tree-connector-vertical h-8" />
      {/if}
      
      <!-- Root person -->
      <div class="relative">
        <TreeNode
          name={treeData.person.name}
          birthYear={treeData.person.birthYear}
          deathYear={treeData.person.deathYear}
          imageUrl={treeData.person.imageUrl}
        />
      </div>

      <!-- Children can be added here in a similar way -->
    </div>
  {/if}
</div>

<style>
  .family-tree {
    overflow-x: auto;
  }

  @media print {
    .family-tree {
      overflow: visible;
    }
  }
</style>