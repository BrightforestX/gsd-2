// Canvas Document Model
// Provides in-memory manipulation and JSON serialization

export interface Position {
  x: number;
  y: number;
}

export interface NodeData {
  label?: string;
  [key: string]: any;
}

export interface EdgeData {
  label?: string;
  [key: string]: any;
}

export interface CanvasNode {
  id: string;
  type: string;
  position: Position;
  data: NodeData;
}

export interface CanvasEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  data: EdgeData;
}

export interface CanvasDocument {
  id: string;
  title: string;
  version: number;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

export class Canvas {
  static readonly CURRENT_VERSION = 1;

  static readonly migrations: Record<number, (doc: any) => CanvasDocument> = {
    0: (doc: any): CanvasDocument => {
      // Version 0 -> 1: Add version field if missing
      return {
        id: doc.id,
        title: doc.title,
        version: 1,
        nodes: doc.nodes || [],
        edges: doc.edges || []
      };
    }
  };

  static migrateToLatest(document: any): CanvasDocument {
    let doc = { ...document };
    let currentVersion = doc.version || 0;

    while (currentVersion < Canvas.CURRENT_VERSION) {
      const migrate = Canvas.migrations[currentVersion];
      if (!migrate) {
        throw new Error(`No migration available from version ${currentVersion} to ${currentVersion + 1}`);
      }
      doc = migrate(doc);
      currentVersion = doc.version;
    }

    return doc as CanvasDocument;
  }

  id: string;
  title: string;
  nodes: CanvasNode[] = [];
  edges: CanvasEdge[] = [];

  constructor(id?: string, title: string = "Untitled Canvas") {
    this.id = id || this.generateId();
    this.title = title;
  }

  private generateId(): string {
    return 'canvas-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  // Node operations
  addNode(type: string, position: Position, data: NodeData = {}, id?: string): string {
    const nodeId = id || 'node-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    this.nodes.push({
      id: nodeId,
      type,
      position,
      data
    });
    return nodeId;
  }

  removeNode(nodeId: string): boolean {
    const index = this.nodes.findIndex(node => node.id === nodeId);
    if (index !== -1) {
      this.nodes.splice(index, 1);
      // Remove edges connected to this node
      this.edges = this.edges.filter(edge => edge.source !== nodeId && edge.target !== nodeId);
      return true;
    }
    return false;
  }

  updateNode(nodeId: string, updates: Partial<CanvasNode>): boolean {
    const node = this.nodes.find(node => node.id === nodeId);
    if (node) {
      Object.assign(node, updates);
      return true;
    }
    return false;
  }

  getNode(nodeId: string): CanvasNode | undefined {
    return this.nodes.find(node => node.id === nodeId);
  }

  // Edge operations
  addEdge(source: string, target: string, type?: string, data: EdgeData = {}, id?: string): string {
    const edgeId = id || 'edge-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    this.edges.push({
      id: edgeId,
      source,
      target,
      type,
      data
    });
    return edgeId;
  }

  removeEdge(edgeId: string): boolean {
    const index = this.edges.findIndex(edge => edge.id === edgeId);
    if (index !== -1) {
      this.edges.splice(index, 1);
      return true;
    }
    return false;
  }

  updateEdge(edgeId: string, updates: Partial<CanvasEdge>): boolean {
    const edge = this.edges.find(edge => edge.id === edgeId);
    if (edge) {
      Object.assign(edge, updates);
      return true;
    }
    return false;
  }

  getEdge(edgeId: string): CanvasEdge | undefined {
    return this.edges.find(edge => edge.id === edgeId);
  }

  // Serialization
  toJson(): string {
    const document: CanvasDocument = {
      id: this.id,
      title: this.title,
      version: Canvas.CURRENT_VERSION,
      nodes: this.nodes,
      edges: this.edges
    };
    return JSON.stringify(document, null, 2);
  }

  static fromJson(json: string): Canvas {
    const rawObj = JSON.parse(json);
    const obj = Canvas.migrateToLatest(rawObj);
    const canvas = new Canvas(obj.id, obj.title);
    canvas.nodes = obj.nodes || [];
    canvas.edges = obj.edges || [];
    return canvas;
  }

  static fromObject(obj: CanvasDocument): Canvas {
    const migratedObj = Canvas.migrateToLatest(obj);
    const canvas = new Canvas(migratedObj.id, migratedObj.title);
    canvas.nodes = migratedObj.nodes || [];
    canvas.edges = migratedObj.edges || [];
    return canvas;
  }

  // localStorage persistence
  saveToStorage(): void {
    localStorage.setItem(this.id, this.toJson());
  }

  static loadFromStorage(id: string): Canvas | null {
    const json = localStorage.getItem(id);
    if (!json) return null;
    return Canvas.fromJson(json);
  }

  // Validation
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for duplicate node IDs
    const nodeIds = this.nodes.map(n => n.id);
    const duplicateNodeIds = nodeIds.filter((id, index) => nodeIds.indexOf(id) !== index);
    if (duplicateNodeIds.length > 0) {
      errors.push(`Duplicate node IDs: ${duplicateNodeIds.join(', ')}`);
    }

    // Check for duplicate edge IDs
    const edgeIds = this.edges.map(e => e.id);
    const duplicateEdgeIds = edgeIds.filter((id, index) => edgeIds.indexOf(id) !== index);
    if (duplicateEdgeIds.length > 0) {
      errors.push(`Duplicate edge IDs: ${duplicateEdgeIds.join(', ')}`);
    }

    // Check for edges pointing to non-existent nodes
    const validNodeIds = new Set(nodeIds);
    for (const edge of this.edges) {
      if (!validNodeIds.has(edge.source)) {
        errors.push(`Edge ${edge.id} references non-existent source node ${edge.source}`);
      }
      if (!validNodeIds.has(edge.target)) {
        errors.push(`Edge ${edge.id} references non-existent target node ${edge.target}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}