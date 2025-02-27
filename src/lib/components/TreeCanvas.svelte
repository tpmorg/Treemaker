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
  
  // State
  let treeContainer: HTMLDivElement;
  let zoomLevel = 1;
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
    addPerson: {};
    searchParent: { personId: string };
    searchChild: { personId: string };
    searchSibling: { personId: string };
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

  // Get family relationship data from the API
  async function getFamilyRelationships(personId: string): Promise<any> {
    try {
      const response = await fetch(`/api/people/family?personId=${personId}`);
      const result = await response.json();
      
      if (result.success) {
        return result.person;
      }
      
      console.error('Error fetching family relationships:', result.error);
      return null;
    } catch (error) {
      console.error('Error in getFamilyRelationships:', error);
      return null;
    }
  }
  
  // Map for storing cached family relationships
  const familyRelationshipsCache = new Map<string, any>();
  
  // Synchronous version that returns cached data for the layout algorithm
  function getCachedRelationships(): NodeRelationship[] {
    const relationships: NodeRelationship[] = [];
    
    // Use only the relationships that we've already fetched
    nodes.forEach(node => {
      const personId = node.personId;
      const cachedData = familyRelationshipsCache.get(personId);
      
      if (!cachedData) return;
      
      // Add parent-child relationships
      if (cachedData.parents) {
        cachedData.parents.forEach((parent: any) => {
          const parentNode = findNode(parent.id);
          if (parentNode) {
            relationships.push({
              nodeId: parentNode.id,
              relatedNodeId: node.id,
              relationshipType: 'PARENT'
            });
          }
        });
      }
      
      // Add child-parent relationships
      if (cachedData.children) {
        cachedData.children.forEach((child: any) => {
          const childNode = findNode(child.id);
          if (childNode) {
            relationships.push({
              nodeId: node.id,
              relatedNodeId: childNode.id,
              relationshipType: 'CHILD'
            });
          }
        });
      }
      
      // Add sibling relationships
      if (cachedData.siblings) {
        cachedData.siblings.forEach((sibling: any) => {
          const siblingNode = findNode(sibling.id);
          if (siblingNode) {
            relationships.push({
              nodeId: node.id,
              relatedNodeId: siblingNode.id,
              relationshipType: 'SIBLING'
            });
          }
        });
      }
    });
    
    return relationships;
  }
  
  // Async function to fetch and populate the cache
  async function loadAllFamilyRelationships() {
    // Fetch relationships for each person and cache them
    const fetchPromises = nodes.map(async node => {
      const personId = node.personId;
      
      // Skip if already in cache
      if (familyRelationshipsCache.has(personId)) return;
      
      try {
        const data = await getFamilyRelationships(personId);
        if (data) {
          familyRelationshipsCache.set(personId, data);
        }
      } catch (error) {
        console.error(`Error fetching relationships for person ${personId}:`, error);
      }
    });
    
    await Promise.all(fetchPromises);
    
    // Force a reactive update after loading all data
    treeData = calculateTreeLayout(startingNodeId, nodes, people);
  }
  
  // Trigger loading relationships when nodes or people change
  $: {
    if (nodes.length > 0 && people.length > 0) {
      loadAllFamilyRelationships();
    }
  }
  
  // Parse relationship data using the cache
  function parseRelationships(): NodeRelationship[] {
    return getCachedRelationships();
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
  
  // Find a good starting node if there are nodes available
  function findStartingNode(): string | null {
    if (nodes.length === 0) return null;
    
    // Try to find a node that has family connections
    for (const node of nodes) {
      const personWithRelations = getFamilyRelationships(node.personId);
      if (personWithRelations) {
        return node.id;
      }
    }
    
    // Fall back to the first node if we couldn't find a better candidate
    return nodes[0].id;
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

  function handleSearchParent(event: CustomEvent<{ personId: string }>) {
    dispatch('searchParent', event.detail);
  }

  function handleSearchChild(event: CustomEvent<{ personId: string }>) {
    dispatch('searchChild', event.detail);
  }

  function handleSearchSibling(event: CustomEvent<{ personId: string }>) {
    dispatch('searchSibling', event.detail);
  }

  function handleAddPerson() {
    dispatch('addPerson', {});
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
  $: startingNodeId = findStartingNode();
  $: treeData = calculateTreeLayout(startingNodeId, nodes, people);
  $: connections = calculateConnections(treeData);
  
  // Constants for layout
  const LEVEL_HEIGHT = 250; // Vertical space between levels
  const NODE_WIDTH = 200;   // Width of a node including margin 
  const NODE_SPACING = 50;  // Additional spacing between siblings
  const ROOT_Y = 100;       // Y position of the root node
  
  // Hierarchical tree layout calculation
  function calculateTreeLayout(rootId: string | null, nodes: TreeNode[], people: Person[]) {
    // If no root or no nodes, return empty array
    if (!rootId || nodes.length === 0) return [];
    
    const layout: LayoutNode[] = [];
    const processedNodeIds = new Set<string>();
    const nodeLevelMap = new Map<string, number>();
    const nodeXPositions = new Map<number, number[]>();
    
    // First pass - determine levels for all nodes
    function determineNodeLevels(nodeId: string, level: number, processed = new Set<string>()) {
      if (processed.has(nodeId)) return;
      processed.add(nodeId);
      
      nodeLevelMap.set(nodeId, level);
      
      // Process parents (one level up)
      const parentNodes = getParentNodes(nodeId);
      parentNodes.forEach(parent => {
        determineNodeLevels(parent.id, level - 1, processed);
      });
      
      // Process children (one level down)
      const childNodes = getChildNodes(nodeId);
      childNodes.forEach(child => {
        determineNodeLevels(child.id, level + 1, processed);
      });
      
      // Process siblings (same level)
      const siblingNodes = getSiblingNodes(nodeId);
      siblingNodes.forEach(sibling => {
        determineNodeLevels(sibling.id, level, processed);
      });
    }
    
    // Start with the root node at level 0
    determineNodeLevels(rootId, 0);
    
    // Setup position calculation for each level
    const levelNodesCount = new Map<number, number>();
    nodeLevelMap.forEach((level, nodeId) => {
      levelNodesCount.set(level, (levelNodesCount.get(level) || 0) + 1);
    });
    
    // Process root node first
    const rootNode = nodes.find(n => n.id === rootId);
    if (!rootNode) return layout;
    
    const rootPerson = people.find(p => p.id === rootNode.personId);
    if (!rootPerson) return layout;
    
    // Second pass - calculate positions for each node
    // First place the root node in the center
    layout.push({
      node: rootNode,
      person: rootPerson,
      level: 0,
      position: { x: 0, y: ROOT_Y },
      childIds: [],
      siblingIds: []
    });
    processedNodeIds.add(rootId);
    
    // Setup a width for each level
    const levelWidth = new Map<number, number>();
    levelNodesCount.forEach((count, level) => {
      levelWidth.set(level, count * (NODE_WIDTH + NODE_SPACING));
    });
    
    // Calculate positions for each level
    const queue: string[] = [rootId];
    
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      const currentLevel = nodeLevelMap.get(nodeId)!;
      const currentLayoutNode = layout.find(item => item.node.id === nodeId);
      
      if (!currentLayoutNode) continue;
      
      // Get related nodes
      const childNodes = getChildNodes(nodeId);
      const parentNodes = getParentNodes(nodeId);
      const siblingNodes = getSiblingNodes(nodeId);
      
      // Update relations in current node
      currentLayoutNode.childIds = childNodes.map(n => n.id);
      currentLayoutNode.siblingIds = siblingNodes.map(n => n.id);
      
      // Initialize positions for the current level if not done yet
      if (!nodeXPositions.has(currentLevel)) {
        nodeXPositions.set(currentLevel, []);
      }
      
      // Calculate child positions - place them centered below the parent
      const childCount = childNodes.length;
      const childLevel = currentLevel + 1;
      
      if (childCount > 0) {
        const totalChildWidth = childCount * (NODE_WIDTH + NODE_SPACING) - NODE_SPACING;
        const startX = currentLayoutNode.position.x - totalChildWidth / 2 + NODE_WIDTH / 2;
        
        childNodes.forEach((childNode, index) => {
          if (processedNodeIds.has(childNode.id)) return;
          
          const childPerson = people.find(p => p.id === childNode.personId);
          if (!childPerson) return;
          
          const childX = startX + index * (NODE_WIDTH + NODE_SPACING);
          const childY = ROOT_Y + childLevel * LEVEL_HEIGHT;
          
          // Check if position is occupied
          const levelPositions = nodeXPositions.get(childLevel) || [];
          let adjustedX = childX;
          
          // Find a free spot
          const occupied = levelPositions.some(x => Math.abs(x - adjustedX) < NODE_WIDTH);
          if (occupied) {
            // Move to the right until we find a free spot
            adjustedX = Math.max(...levelPositions) + NODE_WIDTH + NODE_SPACING;
          }
          
          layout.push({
            node: childNode,
            person: childPerson,
            level: childLevel,
            position: { x: adjustedX, y: childY },
            parentId: nodeId,
            childIds: [],
            siblingIds: []
          });
          
          // Record this position
          levelPositions.push(adjustedX);
          nodeXPositions.set(childLevel, levelPositions);
          
          processedNodeIds.add(childNode.id);
          queue.push(childNode.id);
        });
      }
      
      // Calculate parent positions
      const parentCount = parentNodes.length;
      const parentLevel = currentLevel - 1;
      
      if (parentCount > 0) {
        const totalParentWidth = parentCount * (NODE_WIDTH + NODE_SPACING) - NODE_SPACING;
        const startX = currentLayoutNode.position.x - totalParentWidth / 2 + NODE_WIDTH / 2;
        
        parentNodes.forEach((parentNode, index) => {
          if (processedNodeIds.has(parentNode.id)) return;
          
          const parentPerson = people.find(p => p.id === parentNode.personId);
          if (!parentPerson) return;
          
          const parentX = startX + index * (NODE_WIDTH + NODE_SPACING);
          const parentY = ROOT_Y + parentLevel * LEVEL_HEIGHT;
          
          // Check if position is occupied
          const levelPositions = nodeXPositions.get(parentLevel) || [];
          let adjustedX = parentX;
          
          const occupied = levelPositions.some(x => Math.abs(x - adjustedX) < NODE_WIDTH);
          if (occupied) {
            // Move to the right until we find a free spot
            adjustedX = Math.max(...levelPositions) + NODE_WIDTH + NODE_SPACING;
          }
          
          layout.push({
            node: parentNode,
            person: parentPerson,
            level: parentLevel,
            position: { x: adjustedX, y: parentY },
            childIds: [nodeId],
            siblingIds: []
          });
          
          // Record this position
          levelPositions.push(adjustedX);
          nodeXPositions.set(parentLevel, levelPositions);
          
          processedNodeIds.add(parentNode.id);
          queue.push(parentNode.id);
        });
      }
      
      // Calculate sibling positions
      const siblingLevel = currentLevel;
      
      siblingNodes.forEach((siblingNode) => {
        if (processedNodeIds.has(siblingNode.id)) return;
        
        const siblingPerson = people.find(p => p.id === siblingNode.personId);
        if (!siblingPerson) return;
        
        // Find the rightmost node at this level
        const levelPositions = nodeXPositions.get(siblingLevel) || [];
        const rightmostX = levelPositions.length > 0 
          ? Math.max(...levelPositions) 
          : currentLayoutNode.position.x;
        
        const siblingX = rightmostX + NODE_WIDTH + NODE_SPACING;
        const siblingY = ROOT_Y + siblingLevel * LEVEL_HEIGHT;
        
        layout.push({
          node: siblingNode,
          person: siblingPerson,
          level: siblingLevel,
          position: { x: siblingX, y: siblingY },
          parentId: currentLayoutNode?.parentId,
          childIds: [],
          siblingIds: []
        });
        
        // Record this position
        levelPositions.push(siblingX);
        nodeXPositions.set(siblingLevel, levelPositions);
        
        processedNodeIds.add(siblingNode.id);
        queue.push(siblingNode.id);
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
            from: { 
              x: item.position.x + NODE_WIDTH / 2, 
              y: item.position.y + NODE_WIDTH / 2 
            },
            to: { 
              x: childNode.position.x + NODE_WIDTH / 2, 
              y: childNode.position.y - NODE_WIDTH / 2 
            },
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
              from: { 
                x: item.position.x + NODE_WIDTH, 
                y: item.position.y 
              },
              to: { 
                x: siblingNode.position.x, 
                y: siblingNode.position.y 
              },
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
            <svg class="absolute line-container" style="pointer-events: none; overflow: visible; position: absolute; top: 0; left: 0; width: 100%; height: 100%;">
              <path
                class="connection-line {connection.type}"
                d={connection.type === 'parent-child'
                  ? `M ${connection.from.x} ${connection.from.y} 
                     C ${connection.from.x} ${(connection.from.y + connection.to.y) / 2},
                       ${connection.to.x} ${(connection.from.y + connection.to.y) / 2},
                       ${connection.to.x} ${connection.to.y}`
                  : `M ${connection.from.x} ${connection.from.y} 
                     L ${connection.to.x} ${connection.to.y}`
                }
                stroke={connection.type === 'parent-child' ? "#4A5568" : "#718096"}
                stroke-width={connection.type === 'parent-child' ? 2 : 1.5}
                fill="none"
              />
            </svg>
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
                on:searchParent={handleSearchParent}
                on:searchChild={handleSearchChild}
                on:searchSibling={handleSearchSibling}
              />
            </div>
          {/each}
        </div>
      {:else}
        <!-- No tree data state -->
        <div class="flex flex-col items-center justify-center h-full p-8 text-center">
          <svg class="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
          </svg>
          <h3 class="text-lg font-medium text-gray-900 mb-2">No Family Tree Data</h3>
          <p class="text-gray-600 mb-6">
            Start by adding people to your family tree and establishing relationships.
          </p>
          
          <button 
            on:click={handleAddPerson}
            class="py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Add Person
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
  
  .connection-line {
    pointer-events: none;
  }
  
  .connection-line.parent-child {
    stroke-dasharray: none;
  }
  
  .connection-line.sibling {
    stroke-dasharray: 5, 3; /* Dashed line for siblings */
  }
</style>
