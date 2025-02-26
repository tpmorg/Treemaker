<!-- NodeConnectionLine.svelte -->
<script lang="ts">
  // Type of relationship to display
  export let relationshipType: 'parent-child' | 'spouse' | 'sibling' = 'parent-child';
  
  // Direction for parent-child relationships
  export let direction: 'up' | 'down' | 'left' | 'right' = 'down';
  
  // Optional customizations
  export let color: string = '#718096'; // Default: gray-600
  export let thickness: number = 2;
  export let length: number = 30; // Default length in pixels
</script>

<div class="connection-line" style="--line-color: {color}; --line-thickness: {thickness}px; --line-length: {length}px;">
  {#if relationshipType === 'parent-child'}
    <div class="parent-child-line" class:up={direction === 'up'} class:down={direction === 'down'} 
         class:left={direction === 'left'} class:right={direction === 'right'}></div>
  {:else if relationshipType === 'spouse'}
    <div class="spouse-line"></div>
  {:else if relationshipType === 'sibling'}
    <div class="sibling-line"></div>
  {/if}
</div>

<style>
  .connection-line {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  
  .parent-child-line {
    background-color: var(--line-color);
    position: absolute;
  }
  
  /* Parent-child vertical line (up/down) */
  .parent-child-line.up,
  .parent-child-line.down {
    width: var(--line-thickness);
    height: var(--line-length);
  }
  
  /* Parent-child horizontal line (left/right) */
  .parent-child-line.left,
  .parent-child-line.right {
    height: var(--line-thickness);
    width: var(--line-length);
  }
  
  /* Spouse line is always horizontal */
  .spouse-line {
    height: var(--line-thickness);
    width: var(--line-length);
    background-color: var(--line-color);
    position: absolute;
  }
  
  /* Sibling line is a T-shape */
  .sibling-line {
    height: var(--line-thickness);
    width: var(--line-length);
    background-color: var(--line-color);
    position: absolute;
  }
  
  .sibling-line::before {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: var(--line-thickness);
    height: calc(var(--line-length) / 2);
    background-color: var(--line-color);
  }
</style>