<!-- TreeCanvas.svelte -->
<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import type { Person, Media, Node as TreeNode } from '$lib/types';
  import EnhancedTreeNode from './EnhancedTreeNode.svelte';
  import NodeConnectionLine from './NodeConnectionLine.svelte';
  import AddMediaForm from './AddMediaForm.svelte';
  
  // Props
  export let people: Person[] = [];
  export let nodes: TreeNode[] = [];
  export let media: Media[] = [];
  
  // State
  let treeContainer: HTMLDivElement;
  let zoomLevel = 0.8; // Start at 80% zoom
  let selectedNodeId: string | null = null;
  let selectedPersonId: string | null = null;
  let showMediaForm = false;
  let showEditForm = false;
  let showRelationshipDropdown = false;
  let showSpouseForm = false;
  let isPanning = false;
  let startPanX = 0;
  let startPanY = 0;
  let translateX = 0;
  let translateY = 0;
  
  // Create a dispatch function for events
  const dispatch = createEventDispatcher<{
    nodeSelect: { nodeId: string, personId: string };
    addRelationship: { personId: string, relationshipType: 'parent' | 'child' | 'sibling' | 'spouse' };
    editPerson: { personId: string };
    addMedia: { personId: string };
    addPerson: {};
    deleteNode: { nodeId: string, personId: string };
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

  // Map for storing cached family relationships
  const familyRelationshipsCache = new Map<string, any>();
  
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
  
  // Get cached relationships for the layout algorithm
  function getCachedRelationships(): NodeRelationship[] {
    const relationships: NodeRelationship[] = [];
    
    nodes.forEach(node => {
      const personId = node.personId;
      const cachedData = familyRelationshipsCache.get(personId);
      
      if (!cachedData) return;
      
      // Add parent relationships
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
      
      // Add child relationships
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
  
  // Load family relationships data
  async function loadAllFamilyRelationships() {
    const fetchPromises = nodes.map(async node => {
      const personId = node.personId;
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
    treeData = calculateTreeLayout(startingNodeId, nodes, people);
  }
  
  // Load relationships when data changes
  $: {
    if (nodes.length > 0 && people.length > 0) {
      loadAllFamilyRelationships();
    }
  }
  
  // Get relationships from cached data
  function parseRelationships(): NodeRelationship[] {
    return getCachedRelationships();
  }

  // Find parent nodes for a node
  function getParentNodes(nodeId: string): TreeNode[] {
    const relationships = getCachedRelationships();
    return relationships
      .filter(rel => rel.relationshipType === 'PARENT' && rel.relatedNodeId === nodeId)
      .map(rel => getNodeById(rel.nodeId))
      .filter((node): node is TreeNode => !!node);
  }
  
  // Find children nodes for a node
  function getChildNodes(nodeId: string): TreeNode[] {
    const relationships = getCachedRelationships();
    return relationships
      .filter(rel => rel.relationshipType === 'CHILD' && rel.relatedNodeId === nodeId)
      .map(rel => getNodeById(rel.nodeId))
      .filter((node): node is TreeNode => !!node);
  }
  
  // Find sibling nodes for a node
  function getSiblingNodes(nodeId: string): TreeNode[] {
    const relationships = getCachedRelationships();
    return relationships
      .filter(rel => rel.relationshipType === 'SIBLING' && rel.relatedNodeId === nodeId)
      .map(rel => getNodeById(rel.nodeId))
      .filter((node): node is TreeNode => !!node);
  }
  
  // Find a suitable starting node
  function findStartingNode(): string | null {
    if (nodes.length === 0) return null;
    
    // Just use the first node as the starting point
    // The tree will reorganize based on relationships
    return nodes[0].id;
  }
  
  // Auto-center the tree on mount or when data changes
  onMount(() => {
    if (treeContainer) {
      centerTree();
    }
  });
  
  // Center tree in the container
  function centerTree() {
    if (treeData.length > 0 && treeContainer) {
      translateX = 0;
      translateY = 0;
      setTimeout(() => {
        const containerWidth = treeContainer.clientWidth;
        const containerHeight = treeContainer.clientHeight;
        
        // Get the vertical extent of the tree
        let minY = Number.MAX_SAFE_INTEGER;
        let maxY = Number.MIN_SAFE_INTEGER;
        treeData.forEach(item => {
          if (item.position.y < minY) {
            minY = item.position.y;
          }
          if (item.position.y > maxY) {
            maxY = item.position.y;
          }
        });
        
        translateX = containerWidth / 2;
        
        // Calculate vertical position to show more of the tree
        // This places the tree further up in the viewport
        translateY = containerHeight / 2;
        
        // If we have only a top portion of the tree (e.g., just parents)
        // ensure they're visible by pushing content down
        if (treeData.length <= 3 && maxY - minY < 300) {
          translateY = 100; // Show at the top of the container
        }
      }, 100);
    }
  }
  
  // Center the tree whenever tree data changes
  $: if (treeData.length > 0 && treeContainer) {
    centerTree();
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
  
  // Format zoom level as percentage
  $: zoomPercentage = Math.round(zoomLevel * 100);
  
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
      selectedPersonId = personId; // Set the selectedPersonId when a node is selected
      dispatch('nodeSelect', { nodeId: node.id, personId });
    }
  }
  
  function handleAddRelationship(event: CustomEvent<{ personId: string, relationshipType: 'parent' | 'child' | 'sibling' | 'spouse' }>) {
    dispatch('addRelationship', event.detail);
  }
  
  function handleEditPerson(event: CustomEvent<{ personId: string }>) {
    dispatch('editPerson', event.detail);
  }


  function handleAddPerson() {
    dispatch('addPerson', {});
  }
  
  function handleDeleteNode(event: CustomEvent<{ personId: string, nodeId: string }>) {
    const { personId, nodeId } = event.detail;
    dispatch('deleteNode', { nodeId, personId });
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
  const LEVEL_HEIGHT = 200; // Vertical space between generations
  const NODE_WIDTH = 170;   // Width of a node including margin
  const NODE_SPACING = 50;  // Additional spacing between siblings
  const ROOT_Y = 100;       // Y position of the root node (top of the canvas)
  
  // Hierarchical tree layout calculation
  function calculateTreeLayout(rootId: string | null, nodes: TreeNode[], people: Person[]) {
    // If no root or no nodes, return empty array
    if (!rootId || nodes.length === 0) return [];
    
    const layout: LayoutNode[] = [];
    const processedNodeIds = new Set<string>();
    const nodeGenMap = new Map<string, number>();
    const nodeXPositions = new Map<number, number[]>();
    
    // Create a map from personId to the first node found for that person
    // This ensures we use a consistent node when there are duplicates
    const personToNodeMap = new Map<string, TreeNode>();
    
    // First, populate the personToNodeMap to ensure we consistently use the same node for each person
    nodes.forEach(node => {
      if (!personToNodeMap.has(node.personId)) {
        personToNodeMap.set(node.personId, node);
      }
    });
    
    // First pass - determine generation numbers for all nodes (higher generation = older)
    function determineGenerations(nodeId: string, generation: number, visited = new Set<string>()) {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      
      // Get current generation or update if the new one is higher
      const currentGen = nodeGenMap.get(nodeId);
      if (currentGen === undefined || generation > currentGen) {
        nodeGenMap.set(nodeId, generation);
      } else {
        // If we already assigned a higher generation, use that
        generation = currentGen;
      }
      
      // Process parents (one generation higher)
      const parentNodes = getParentNodes(nodeId);
      parentNodes.forEach(parent => {
        determineGenerations(parent.id, generation + 1, visited);
      });
      
      // Process children (one generation lower)
      const childNodes = getChildNodes(nodeId);
      childNodes.forEach(child => {
        determineGenerations(child.id, Math.max(0, generation - 1), visited);
      });
      
      // Process siblings (same generation)
      const siblingNodes = getSiblingNodes(nodeId);
      siblingNodes.forEach(sibling => {
        determineGenerations(sibling.id, generation, visited);
      });
    }
    
    // Start with the root node at generation 0
    determineGenerations(rootId, 0);
    
    // Normalize generations so the oldest is 0
    const highestGeneration = Math.max(...Array.from(nodeGenMap.values()));
    
    nodeGenMap.forEach((gen, nodeId) => {
      // Keep generations as-is (higher number = older generation)
      nodeGenMap.set(nodeId, gen);
    });
    
    // Map to track nodes already added to the layout by personId
    // This ensures we don't add duplicate nodes for the same person
    const personNodesInLayout = new Map<string, boolean>();
    
    // Setup position calculation for each generation
    const genNodesCount = new Map<number, number>();
    nodeGenMap.forEach((gen, nodeId) => {
      genNodesCount.set(gen, (genNodesCount.get(gen) || 0) + 1);
    });
    
    // Process root node first
    const rootNode = nodes.find(n => n.id === rootId);
    if (!rootNode) return layout;
    
    const rootPerson = people.find(p => p.id === rootNode.personId);
    if (!rootPerson) return layout;
    
    const rootGeneration = nodeGenMap.get(rootId) || 0;
    
    // Track which personIds have already been added to the layout
    const personIdsInLayout = new Map<string, boolean>();
    
    // Second pass - calculate positions for each node
    // First place the root node in the center
    layout.push({
      node: rootNode,
      person: rootPerson,
      level: rootGeneration,
      position: { x: 0, y: ROOT_Y + (highestGeneration - rootGeneration) * LEVEL_HEIGHT },
      childIds: [],
      siblingIds: []
    });
    processedNodeIds.add(rootId);
    personIdsInLayout.set(rootPerson.id, true);
    
    // Calculate positions for each generation
    const queue: string[] = [rootId];
    
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      const currentGen = nodeGenMap.get(nodeId)!;
      const currentLayoutNode = layout.find(item => item.node.id === nodeId);
      
      if (!currentLayoutNode) continue;
      
      // Get related nodes
      const childNodes = getChildNodes(nodeId);
      const parentNodes = getParentNodes(nodeId);
      const siblingNodes = getSiblingNodes(nodeId);
      
      // Update relations in current node
      currentLayoutNode.childIds = childNodes.map(n => n.id);
      currentLayoutNode.siblingIds = siblingNodes.map(n => n.id);
      
      // Initialize positions for the current generation if not done yet
      if (!nodeXPositions.has(currentGen)) {
        nodeXPositions.set(currentGen, []);
      }
      
      // Calculate child positions - place them centered below the parent
      const childGen = currentGen + 1; // Children are one generation below parents
      
      // Get all unique person IDs from child nodes
      const uniqueChildPersonIds = new Set<string>();
      childNodes.forEach(node => uniqueChildPersonIds.add(node.personId));
      
      // Filter out persons already in the layout
      const unprocessedPersonIds = [...uniqueChildPersonIds].filter(
        personId => !personIdsInLayout.has(personId)
      );
      
      const childCount = unprocessedPersonIds.length;
      
      if (childCount > 0) {
        const totalChildWidth = childCount * (NODE_WIDTH + NODE_SPACING) - NODE_SPACING;
        const startX = currentLayoutNode.position.x - totalChildWidth / 2 + NODE_WIDTH / 2;
        
        unprocessedPersonIds.forEach((personId, index) => {
          // Get the consistent node for this person
          const childNode = personToNodeMap.get(personId);
          if (!childNode) return;
          
          // Skip if we've already processed this node
          if (processedNodeIds.has(childNode.id)) return;
          
          const childPerson = people.find(p => p.id === personId);
          if (!childPerson) return;
          
          const childX = startX + index * (NODE_WIDTH + NODE_SPACING);
          const childY = ROOT_Y + (highestGeneration - childGen) * LEVEL_HEIGHT;
          
          // Check if position is occupied
          const levelPositions = nodeXPositions.get(childGen) || [];
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
            level: childGen,
            position: { x: adjustedX, y: childY },
            parentId: nodeId,
            childIds: [],
            siblingIds: []
          });
          
          // Record this position
          levelPositions.push(adjustedX);
          nodeXPositions.set(childGen, levelPositions);
          
          processedNodeIds.add(childNode.id);
          personIdsInLayout.set(personId, true);
          queue.push(childNode.id);
        });
      }
      
      // Calculate parent positions
      const parentGen = currentGen - 1; // Parents are one generation above children
      
      // Get all unique person IDs from parent nodes
      const uniqueParentPersonIds = new Set<string>();
      parentNodes.forEach(node => uniqueParentPersonIds.add(node.personId));
      
      // Filter out persons already in the layout
      const unprocessedParentIds = [...uniqueParentPersonIds].filter(
        personId => !personIdsInLayout.has(personId)
      );
      
      const parentCount = unprocessedParentIds.length;
      
      if (parentCount > 0) {
        const totalParentWidth = parentCount * (NODE_WIDTH + NODE_SPACING) - NODE_SPACING;
        const startX = currentLayoutNode.position.x - totalParentWidth / 2 + NODE_WIDTH / 2;
        
        unprocessedParentIds.forEach((personId, index) => {
          // Get the consistent node for this person
          const parentNode = personToNodeMap.get(personId);
          if (!parentNode) return;
          
          // Skip if we've already processed this node
          if (processedNodeIds.has(parentNode.id)) return;
          
          const parentPerson = people.find(p => p.id === personId);
          if (!parentPerson) return;
          
          const parentX = startX + index * (NODE_WIDTH + NODE_SPACING);
          const parentY = ROOT_Y + (highestGeneration - parentGen) * LEVEL_HEIGHT;
          
          // Check if position is occupied
          const levelPositions = nodeXPositions.get(parentGen) || [];
          let adjustedX = parentX;
          
          const occupied = levelPositions.some(x => Math.abs(x - adjustedX) < NODE_WIDTH);
          if (occupied) {
            // Move to the right until we find a free spot
            adjustedX = Math.max(...levelPositions) + NODE_WIDTH + NODE_SPACING;
          }
          
          layout.push({
            node: parentNode,
            person: parentPerson,
            level: parentGen,
            position: { x: adjustedX, y: parentY },
            childIds: [nodeId],
            siblingIds: []
          });
          
          // Record this position
          levelPositions.push(adjustedX);
          nodeXPositions.set(parentGen, levelPositions);
          
          processedNodeIds.add(parentNode.id);
          personIdsInLayout.set(personId, true);
          queue.push(parentNode.id);
        });
      }
      
      // Calculate sibling positions
      const siblingGen = currentGen; // Siblings are in the same generation
      
      // Filter out siblings whose personId is already represented in the layout
      const uniqueSiblingNodes = siblingNodes.filter(siblingNode => {
        const siblingPerson = people.find(p => p.id === siblingNode.personId);
        return siblingPerson && !personNodesInLayout.has(siblingPerson.id);
      });
      
      uniqueSiblingNodes.forEach((siblingNode) => {
        if (processedNodeIds.has(siblingNode.id)) return;
        
        const siblingPerson = people.find(p => p.id === siblingNode.personId);
        if (!siblingPerson) return;
        
        // Find the rightmost node at this generation
        const levelPositions = nodeXPositions.get(siblingGen) || [];
        const rightmostX = levelPositions.length > 0 
          ? Math.max(...levelPositions) 
          : currentLayoutNode.position.x;
        
        const siblingX = rightmostX + NODE_WIDTH + NODE_SPACING;
        const siblingY = ROOT_Y + (highestGeneration - siblingGen) * LEVEL_HEIGHT;
        
        layout.push({
          node: siblingNode,
          person: siblingPerson,
          level: siblingGen,
          position: { x: siblingX, y: siblingY },
          parentId: currentLayoutNode?.parentId,
          childIds: [],
          siblingIds: []
        });
        
        // Record this position
        levelPositions.push(siblingX);
        nodeXPositions.set(siblingGen, levelPositions);
        
        processedNodeIds.add(siblingNode.id);
        personNodesInLayout.set(siblingPerson.id, true);
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
      subtype?: 'current' | 'former';
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
  <div class="zoom-controls absolute top-4 right-4 flex items-center space-x-2 bg-white p-2 rounded-md shadow-md z-10">
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
    <span class="text-sm font-medium text-gray-700 mx-1">{zoomPercentage}%</span>
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
          <svg class="absolute line-container" style="pointer-events: none; overflow: visible; position: absolute; top: 0; left: 0; width: 100%; height: 100%;">
            {#each connections as connection}
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
            {/each}
          </svg>
          
          <!-- Draw each node -->
          {#each treeData as item}
            <div class="absolute" style="left: {item.position.x}px; top: {item.position.y}px; transform: translate(-50%, -50%);">
              <EnhancedTreeNode
                person={item.person}
                nodeId={item.node.id}
                primaryMedia={getPrimaryMedia(item.person.id)}
                isSelected={selectedNodeId === item.node.id}
                on:select={handleNodeSelect}
                on:edit={handleEditPerson}
                on:delete={handleDeleteNode}
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
  
  <!-- Sliding side panel for person details -->
  <div 
    class="side-panel fixed right-0 top-0 h-full bg-white shadow-lg z-20 transform transition-transform duration-300 ease-in-out"
    class:slide-in={selectedNodeId}
    class:slide-out={!selectedNodeId}
    style="width: 400px; {selectedNodeId ? '' : 'transform: translateX(100%)'}"
  >
    {#if selectedNodeId && selectedPersonId && findPerson(selectedPersonId)}
      <div class="h-full flex flex-col overflow-hidden">
        <!-- Panel header -->
        <div class="bg-gray-100 p-4 flex justify-between items-center border-b">
          <h2 class="text-lg font-semibold">Person Details</h2>
          <button 
            on:click={() => { selectedNodeId = null; selectedPersonId = null; }}
            class="text-gray-500 hover:text-gray-700"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        <!-- Person details -->
        <div class="p-4 flex-grow overflow-y-auto">
          <div class="flex items-center mb-6">
            {#if selectedPersonId && findPerson(selectedPersonId)}
              {@const person = findPerson(selectedPersonId)!}
              <img
                src={getPrimaryMedia(selectedPersonId)?.url || (person.gender === 'female' ? '/src/images/default-female.svg' : '/src/images/default-male.svg')}
                alt={person.firstName}
                class="w-20 h-20 rounded-full object-cover border-2 border-gray-300 mr-4"
              />
              <div>
                <h3 class="text-xl font-semibold">{person.firstName} {person.lastName || ''}</h3>
                {#if person.birthDate || person.deathDate}
                  <p class="text-gray-600">
                    {person.birthDate ? new Date(person.birthDate).getFullYear() : '?'} -
                    {person.deathDate ? new Date(person.deathDate).getFullYear() : 'Present'}
                  </p>
                {/if}
                <p class="text-gray-600 capitalize">{person.gender || 'Unknown'}</p>
              </div>
            {/if}
          </div>
          
          <!-- Relationship dropdown -->
          <div class="mb-6">
            <div class="relative">
              <button
                on:click={() => showRelationshipDropdown = !showRelationshipDropdown}
                class="w-full flex items-center justify-between py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
              >
                <span>Add Relationship</span>
                <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {#if showRelationshipDropdown}
                <div class="absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg overflow-hidden">
                  <button
                    on:click={() => {
                      if (selectedPersonId) {
                        dispatch('addRelationship', { personId: selectedPersonId, relationshipType: 'parent' });
                        showRelationshipDropdown = false;
                      }
                    }}
                    class="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100"
                  >
                    Add Parent
                  </button>
                  <button
                    on:click={() => {
                      if (selectedPersonId) {
                        dispatch('addRelationship', { personId: selectedPersonId, relationshipType: 'child' });
                        showRelationshipDropdown = false;
                      }
                    }}
                    class="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100"
                  >
                    Add Child
                  </button>
                  <button
                    on:click={() => {
                      if (selectedPersonId) {
                        dispatch('addRelationship', { personId: selectedPersonId, relationshipType: 'sibling' });
                        showRelationshipDropdown = false;
                      }
                    }}
                    class="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100"
                  >
                    Add Sibling
                  </button>
                  <button
                    on:click={() => {
                      if (selectedPersonId) {
                        dispatch('addRelationship', { personId: selectedPersonId, relationshipType: 'spouse' });
                        showRelationshipDropdown = false;
                      }
                    }}
                    class="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100"
                  >
                    Add Spouse
                  </button>
                </div>
              {/if}
            </div>
          </div>
          
          <!-- Action buttons -->
          <div class="grid grid-cols-2 gap-3 mb-6">
            <button 
              on:click={() => showEditForm = true}
              class="py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Edit Person
            </button>
            
            <button 
              on:click={() => showMediaForm = true}
              class="py-2 px-4 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
            >
              Add Photo
            </button>
          </div>
          
          <!-- Show family relationships -->
          <div class="mt-6">
            <h3 class="text-lg font-semibold mb-3">Family Relationships</h3>
            
            {#if familyRelationshipsCache.has(selectedPersonId)}
              {@const familyData = familyRelationshipsCache.get(selectedPersonId)}
              
              {#if familyData.parents && familyData.parents.length > 0}
                <div class="mb-4">
                  <h4 class="font-medium text-gray-700 mb-2">Parents</h4>
                  <ul class="space-y-1">
                    {#each familyData.parents as parent}
                      <li class="p-2 bg-gray-50 rounded flex justify-between items-center">
                        <span>{parent.firstName} {parent.lastName || ''}</span>
                      </li>
                    {/each}
                  </ul>
                </div>
              {/if}
              
              {#if familyData.siblings && familyData.siblings.length > 0}
                <div class="mb-4">
                  <h4 class="font-medium text-gray-700 mb-2">Siblings</h4>
                  <ul class="space-y-1">
                    {#each familyData.siblings as sibling}
                      <li class="p-2 bg-gray-50 rounded flex justify-between items-center">
                        <span>{sibling.firstName} {sibling.lastName || ''}</span>
                      </li>
                    {/each}
                  </ul>
                </div>
              {/if}
              
              {#if familyData.children && familyData.children.length > 0}
                <div>
                  <h4 class="font-medium text-gray-700 mb-2">Children</h4>
                  <ul class="space-y-1">
                    {#each familyData.children as child}
                      <li class="p-2 bg-gray-50 rounded flex justify-between items-center">
                        <span>{child.firstName} {child.lastName || ''}</span>
                      </li>
                    {/each}
                  </ul>
                </div>
              {/if}
              
              {#if (!familyData.parents || familyData.parents.length === 0) && 
                   (!familyData.siblings || familyData.siblings.length === 0) && 
                   (!familyData.children || familyData.children.length === 0)}
                <p class="text-gray-500 italic">No family relationships found</p>
              {/if}
            {:else}
              <p class="text-gray-500 italic">Loading family data...</p>
            {/if}
          </div>
        </div>
      </div>
    {/if}
  </div>
  
  <!-- Edit Person Form Modal -->
  {#if showEditForm && selectedPersonId}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-30">
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div class="p-4 border-b flex justify-between items-center">
          <h3 class="text-lg font-semibold">Edit Person</h3>
          <button
            on:click={() => showEditForm = false}
            class="text-gray-400 hover:text-gray-600"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <div class="p-4">
          <!-- Dispatch to parent to handle editing -->
          <button 
            on:click={() => {
              if (selectedPersonId) {
                dispatch('editPerson', { personId: selectedPersonId });
                showEditForm = false;
              }
            }}
            class="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Continue to Edit
          </button>
        </div>
      </div>
    </div>
  {/if}
  
  <!-- Add Media Form Modal -->
  {#if showMediaForm && selectedPersonId}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-30">
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div class="p-4 border-b flex justify-between items-center">
          <h3 class="text-lg font-semibold">Add Photo</h3>
          <button
            on:click={() => showMediaForm = false}
            class="text-gray-400 hover:text-gray-600"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <div class="p-5">
          <AddMediaForm 
            personId={selectedPersonId} 
            on:mediaAdded={() => showMediaForm = false}
          />
        </div>
      </div>
    </div>
  {/if}
  

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
  
  /* Sliding panel styles */
  .side-panel {
    box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
  }
  
  .slide-in {
    animation: slideIn 0.3s forwards;
  }
  
  .slide-out {
    animation: slideOut 0.3s forwards;
  }
  
  @keyframes slideIn {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }
  
  @keyframes slideOut {
    from { transform: translateX(0); }
    to { transform: translateX(100%); }
  }
</style>
