<!-- TreeCanvas.svelte -->
<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import type { Person, Media, Node as TreeNode } from '$lib/types';
  import EnhancedTreeNode from './EnhancedTreeNode.svelte';
  import NodeConnectionLine from './NodeConnectionLine.svelte';
  
  // Props
  export let people: Person[] = [];
  export let nodes: TreeNode[] = [];
  export let media: Media[] = [];
  export let rootNodeId: string | null = null;
  
  // State
  let treeContainer: HTMLDivElement;
  let zoomLevel = 1;
  let showAddRootPersonModal = false;
  let selectedNodeId: string | null = null;
  let isPanning = false;
  let startPanX = 0;
  let startPanY = 0;
  let translateX = 0;
  let translateY = 0;
  
  // Create a dispatch function for events
  const dispatch = createEventDispatcher<{
    nodeSelect: { nodeId: string, personId: string };
    addParent: { personId: string };
    addChild: { personId: string };
    addSibling: { personId: string };
    editPerson: { personId: string };
    addRootPerson: { personId?: string };
  }>();
  
  // Helper functions
  function findPerson(personId: string): Person | undefined {
    return people.find(p => p.id === personId);
  }
  
  function findNode(personId: string): TreeNode | undefined {
    return nodes.find(n => n.personId === personId);
  }
  
  function getPrimaryMedia(personId: string): Media | null {
    const personMedia = media.filter(m => m.personId === personId);
    // Return the first image-type media or null if none exists
    return personMedia.find(m => m.type === 'IMAGE') || null;
  }
  
  // Helper functions to find related nodes
  function getNodeById(nodeId: string): TreeNode | undefined {
    return nodes.find(n => n.id === nodeId);
  }

  interface NodeRelationship {
    nodeId: string;
    relatedNodeId: string;
    relationshipType: string;
  }

  // Parse relationship data from nodes
  function parseRelationships(): NodeRelationship[] {
    const relationships: NodeRelationship[] = [];
    
    // Assuming each node with type PARENT, CHILD, or SIBLING has a position field
    // that contains a relatedToNodeId property
    nodes.forEach(node => {
      if (node.type === 'PARENT' || node.type === 'CHILD' || node.type === 'SIBLING') {
        try {
          const position = node.position ? JSON.parse(node.position) : null;
          if (position && position.relatedToNodeId) {
            relationships.push({
              nodeId: node.id,
              relatedNodeId: position.relatedToNodeId,
              relationshipType: node.type
            });
          }
        } catch (e) {
          console.error("Failed to parse position for node", node.id, e);
        }
      }
    });
    
    return relationships;
  }
  
  // Find parent nodes for a node
  function getParentNodes(nodeId: string): TreeNode[] {
    const relationships = parseRelationships();
    const parentRelationships = relationships.filter(
      rel => rel.relationshipType === 'PARENT' && rel.relatedNodeId === nodeId
    );
    
    return parentRelationships
      .map(rel => getNodeById(rel.nodeId))
      .filter((node): node is TreeNode => !!node);
  }
  
  // Find children nodes for a node
  function getChildNodes(nodeId: string): TreeNode[] {
    const relationships = parseRelationships();
    const childRelationships = relationships.filter(
      rel => rel.relationshipType === 'CHILD' && rel.relatedNodeId === nodeId
    );
    
    return childRelationships
      .map(rel => getNodeById(rel.nodeId))
      .filter((node): node is TreeNode => !!node);
  }
  
  // Find sibling nodes for a node
  function getSiblingNodes(nodeId: string): TreeNode[] {
    const relationships = parseRelationships();
    const siblingRelationships = relationships.filter(
      rel => rel.relationshipType === 'SIBLING' && rel.relatedNodeId === nodeId
    );
    
    return siblingRelationships
      .map(rel => getNodeById(rel.nodeId))
      .filter((node): node is TreeNode => !!node);
  }
  
  // Determine initial root node if not provided
  $: {
    if (nodes.length > 0 && !rootNodeId) {
      // Default to the first node if no root is specified
      rootNodeId = nodes[0].id;
    }
  }
  
  // Handle zoom in/out
  function handleZoomIn() {
    zoomLevel = Math.min(zoomLevel + 0.1, 2);
  }
  
  function handleZoomOut() {
    zoomLevel = Math.max(zoomLevel - 0.1, 0.5);
  }
  
  function handleResetZoom() {
    zoomLevel = 1;
    translateX = 0;
    translateY = 0;
  }
  
  // Handle panning
  function handleMouseDown(event: MouseEvent) {
    isPanning = true;
    startPanX = event.clientX - translateX;
    startPanY = event.clientY - translateY;
  }
  
  function handleMouseMove(event: MouseEvent) {
    if (!isPanning) return;
    translateX = event.clientX - startPanX;
    translateY = event.clientY - startPanY;
  }
  
  function handleMouseUp() {
    isPanning = false;
  }
  
  function handleMouseLeave() {
    isPanning = false;
  }
  
  // Node event handlers
  function handleNodeSelect(event: CustomEvent<{ personId: string }>) {
    const { personId } = event.detail;
    const node = findNode(personId);
    if (node) {
      selectedNodeId = node.id;
      dispatch('nodeSelect', { nodeId: node.id, personId });
    }
  }
  
  function handleAddParent(event: CustomEvent<{ personId: string }>) {
    dispatch('addParent', event.detail);
  }
  
  function handleAddChild(event: CustomEvent<{ personId: string }>) {
    dispatch('addChild', event.detail);
  }
  
  function handleAddSibling(event: CustomEvent<{ personId: string }>) {
    dispatch('addSibling', event.detail);
  }
  
  function handleEditPerson(event: CustomEvent<{ personId: string }>) {
    dispatch('editPerson', event.detail);
  }

  function handleAddRootPerson() {
    dispatch('addRootPerson', {});
  }
  
  interface LayoutNode {
    node: TreeNode;
    person: Person;
    level: number;
    position: { x: number, y: number };
    parentId?: string;
    childIds: string[];
    siblingIds: string[];
  }
  
  // Calculate tree nodes for rendering
  $: treeData = calculateTreeLayout(rootNodeId, nodes, people);
  $: connections = calculateConnections(treeData);
  
  // Constants for layout
  const LEVEL_HEIGHT = 150; // Vertical space between levels
  const NODE_WIDTH = 150;   // Width of a node including margin
  const ROOT_Y = 100;       // Y position of the root node
  
  // Hierarchical tree layout calculation
  function calculateTreeLayout(rootId: string | null, nodes: TreeNode[], people: Person[]) {
    // If no root or no nodes, return empty array
    if (!rootId || nodes.length === 0) return [];
    
    const layout: LayoutNode[] = [];
    const processedNodeIds = new Set<string>();
    
    // Process root node first
    const rootNode = nodes.find(n => n.id === rootId);
    if (!rootNode) return layout;
    
    const rootPerson = people.find(p => p.id === rootNode.personId);
    if (!rootPerson) return layout;
    
    // Add root to layout
    layout.push({
      node: rootNode,
      person: rootPerson,
      level: 0,
      position: { x: 0, y: ROOT_Y },
      childIds: [],
      siblingIds: []
    });
    processedNodeIds.add(rootId);
    
    // Queue for breadth-first traversal
    const queue: { nodeId: string; level: number; parentX: number; index: number }[] = [
      { nodeId: rootId, level: 0, parentX: 0, index: 0 }
    ];
    
    while (queue.length > 0) {
      const { nodeId, level, parentX, index } = queue.shift()!;
      
      // Get children, parents, and siblings
      const childNodes = getChildNodes(nodeId);
      const parentNodes = getParentNodes(nodeId);
      const siblingNodes = getSiblingNodes(nodeId);
      
      // Update the current node with child and sibling IDs
      const currentLayoutNode = layout.find(item => item.node.id === nodeId);
      if (currentLayoutNode) {
        currentLayoutNode.childIds = childNodes.map(n => n.id);
        currentLayoutNode.siblingIds = siblingNodes.map(n => n.id);
      }
      
      // Process children
      const childCount = childNodes.length;
      childNodes.forEach((childNode, childIndex) => {
        if (processedNodeIds.has(childNode.id)) return;
        
        const childPerson = people.find(p => p.id === childNode.personId);
        if (!childPerson) return;
        
        // Calculate child position:
        // - x: Start from parent's x, offset by child index, center the group
        // - y: Increase y based on level
        const childX = parentX + (childIndex - (childCount - 1) / 2) * NODE_WIDTH;
        const childY = ROOT_Y + (level + 1) * LEVEL_HEIGHT;
        
        layout.push({
          node: childNode,
          person: childPerson,
          level: level + 1,
          position: { x: childX, y: childY },
          parentId: nodeId,
          childIds: [],
          siblingIds: []
        });
        
        processedNodeIds.add(childNode.id);
        queue.push({
          nodeId: childNode.id,
          level: level + 1,
          parentX: childX,
          index: childIndex
        });
      });
      
      // Process parents (if we're not at the root)
      if (level > 0) {
        parentNodes.forEach((parentNode, parentIndex) => {
          if (processedNodeIds.has(parentNode.id)) return;
          
          const parentPerson = people.find(p => p.id === parentNode.personId);
          if (!parentPerson) return;
          
          // Calculate parent position:
          // - x: Similar to child, but above
          // - y: Decrease y based on level
          const newParentX = parentX - NODE_WIDTH + parentIndex * NODE_WIDTH;
          const parentY = ROOT_Y + (level - 1) * LEVEL_HEIGHT;
          
          layout.push({
            node: parentNode,
            person: parentPerson,
            level: level - 1,
            position: { x: newParentX, y: parentY },
            childIds: [nodeId],
            siblingIds: []
          });
          
          processedNodeIds.add(parentNode.id);
          queue.push({
            nodeId: parentNode.id,
            level: level - 1,
            parentX: newParentX,
            index: parentIndex
          });
        });
      }
      
      // Process siblings
      siblingNodes.forEach((siblingNode, siblingIndex) => {
        if (processedNodeIds.has(siblingNode.id)) return;
        
        const siblingPerson = people.find(p => p.id === siblingNode.personId);
        if (!siblingPerson) return;
        
        // Calculate sibling position:
        // - x: To the right of the current node
        // - y: Same level
        const siblingX = parentX + (index + siblingIndex + 1) * NODE_WIDTH;
        const siblingY = ROOT_Y + level * LEVEL_HEIGHT;
        
        layout.push({
          node: siblingNode,
          person: siblingPerson,
          level,
          position: { x: siblingX, y: siblingY },
          parentId: currentLayoutNode?.parentId,
          childIds: [],
          siblingIds: []
        });
        
        processedNodeIds.add(siblingNode.id);
        queue.push({
          nodeId: siblingNode.id,
          level,
          parentX: siblingX,
          index: index + siblingIndex + 1
        });
      });
    }
    
    return layout;
  }
  
  // Calculate connections between nodes for rendering
  function calculateConnections(layoutData: LayoutNode[]) {
    const connections: {
      from: { x: number, y: number };
      to: { x: number, y: number };
      type: 'parent-child' | 'spouse' | 'sibling';
    }[] = [];
    
    // For each node in the layout
    layoutData.forEach(item => {
      // Connect to children
      item.childIds.forEach(childId => {
        const childNode = layoutData.find(n => n.node.id === childId);
        if (childNode) {
          connections.push({
            from: item.position,
            to: childNode.position,
            type: 'parent-child'
          });
        }
      });
      
      // Connect to siblings
      item.siblingIds.forEach(siblingId => {
        const siblingNode = layoutData.find(n => n.node.id === siblingId);
        if (siblingNode) {
          // Only add connection if this is the "left" sibling
          // to avoid duplicate connections
          if (item.position.x < siblingNode.position.x) {
            connections.push({
              from: item.position,
              to: siblingNode.position,
              type: 'sibling'
            });
          }
        }
      });
    });
    
    return connections;
  }
</script>

<div class="tree-canvas-container">
  <!-- Tree zoom controls -->
  <div class="zoom-controls absolute top-4 right-4 flex space-x-2 bg-white p-2 rounded-md shadow-md z-10">
    <button 
      on:click={handleZoomIn} 
      class="p-1 rounded hover:bg-gray-100" 
      title="Zoom In"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
      </svg>
    </button>
    <button 
      on:click={handleZoomOut} 
      class="p-1 rounded hover:bg-gray-100" 
      title="Zoom Out"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>
      </svg>
    </button>
    <button 
      on:click={handleResetZoom} 
      class="p-1 rounded hover:bg-gray-100" 
      title="Reset View"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5"></path>
      </svg>
    </button>
  </div>

  <!-- Main tree canvas -->
  <div 
    bind:this={treeContainer}
    class="tree-canvas w-full h-full overflow-hidden bg-gray-50 rounded-lg"
    on:mousedown={handleMouseDown}
    on:mousemove={handleMouseMove}
    on:mouseup={handleMouseUp}
    on:mouseleave={handleMouseLeave}
  >
    <div 
      class="tree-content relative"
      style="transform: translate({translateX}px, {translateY}px) scale({zoomLevel}); transform-origin: center;"
    >
      {#if treeData.length > 0}
        <!-- Tree Structure with hierarchical layout -->
        <div class="relative min-h-[600px] min-w-[800px]">
          <!-- Draw connection lines first so they appear behind the nodes -->
          {#each connections as connection}
            <div class="absolute"
                 style="
                   left: {(connection.from.x + connection.to.x) / 2}px;
                   top: {(connection.from.y + connection.to.y) / 2}px;
                   width: {Math.sqrt(
                     Math.pow(connection.to.x - connection.from.x, 2) +
                     Math.pow(connection.to.y - connection.from.y, 2)
                   )}px;
                   height: {connection.type === 'parent-child' ? LEVEL_HEIGHT : 2}px;
                   transform: translate(-50%, -50%) rotate({Math.atan2(
                     connection.to.y - connection.from.y,
                     connection.to.x - connection.from.x
                   ) * (180/Math.PI)}deg);
                   transform-origin: center;
                 ">
              <div class="line {connection.type}"
                   style="
                     width: 100%;
                     height: 100%;
                     background-color: #718096;
                   ">
              </div>
            </div>
          {/each}
          
          <!-- Draw each node -->
          {#each treeData as item}
            <div class="absolute" style="left: {item.position.x}px; top: {item.position.y}px; transform: translate(-50%, -50%);">
              <EnhancedTreeNode
                person={item.person}
                primaryMedia={getPrimaryMedia(item.person.id)}
                isSelected={selectedNodeId === item.node.id}
                on:select={handleNodeSelect}
                on:addParent={handleAddParent}
                on:addChild={handleAddChild}
                on:addSibling={handleAddSibling}
                on:edit={handleEditPerson}
              />
            </div>
          {/each}
        </div>
      {:else if people.length > 0}
        <!-- Fallback when no tree structure is defined but people exist -->
        <div class="flex flex-col items-center justify-center p-8 min-h-[400px]">
          <div class="text-center mb-8">
            <h3 class="text-xl font-semibold text-gray-800 mb-2">No tree structure defined yet</h3>
            <p class="text-md text-gray-600">Select a person below to make them the root of your tree.</p>
          </div>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-4">
            {#each people.slice(0, 8) as person (person.id)}
              <div 
                on:click={() => {
                  const node = findNode(person.id);
                  if (node) {
                    selectedNodeId = node.id;
                    rootNodeId = node.id;
                    dispatch('nodeSelect', { nodeId: node.id, personId: person.id });
                  } else {
                    // If no node exists for this person, create one as root
                    dispatch('addRootPerson', { personId: person.id });
                  }
                }}
                class="cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-md"
              >
                <EnhancedTreeNode
                  {person}
                  primaryMedia={getPrimaryMedia(person.id)}
                  isSelected={false}
                />
              </div>
            {/each}
            
            {#if people.length > 8}
              <div class="flex items-center justify-center p-4 text-gray-500">
                <span>+ {people.length - 8} more</span>
              </div>
            {/if}
          </div>
        </div>
      {:else}
        <!-- No data state -->
        <div class="flex flex-col items-center justify-center h-full p-8 text-center">
          <svg class="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
          </svg>
          <h3 class="text-lg font-medium text-gray-900 mb-2">No People Added Yet</h3>
          <p class="text-gray-600 mb-6">
            Start by adding people to your family tree.
          </p>
          
          <button 
            on:click={handleAddRootPerson}
            class="py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Add Root Person
          </button>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .tree-canvas-container {
    position: relative;
    width: 100%;
    height: 600px;
  }
  
  .tree-canvas {
    cursor: grab;
  }
  .tree-canvas:active {
    cursor: grabbing;
  }
  
  .line {
    position: absolute;
    border-radius: 0;
  }
  
  .line.parent-child {
    background-color: #4a5568; /* Darker gray for parent-child */
  }
  
  .line.sibling {
    background-color: #718096; /* Medium gray for siblings */
    height: 2px !important; /* Override the inline style to ensure thin lines */
  }
</style>
