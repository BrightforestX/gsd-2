export class Canvas {
  static CURRENT_VERSION = 1;

  static migrations = {
    0: (doc) => {
      return {
        id: doc.id,
        title: doc.title,
        version: 1,
        nodes: doc.nodes || [],
        edges: doc.edges || [],
        searchTerm: doc.searchTerm || ""
      };
    }
  };

  static migrateToLatest(document) {
    let doc = { ...document };
    let currentVersion = doc.version || 0;
    while (currentVersion < Canvas.CURRENT_VERSION) {
      const migrate = Canvas.migrations[currentVersion];
      if (!migrate) {
        throw new Error('No migration available from version ' + currentVersion + ' to ' + (currentVersion + 1));
      }
      doc = migrate(doc);
      currentVersion = doc.version;
    }
    return doc;
  }

  constructor(id, title = "Untitled Canvas", searchTerm = "") {
    this.id = id || this.generateId();
    this.title = title;
    this.nodes = [];
    this.edges = [];
    this.searchTerm = searchTerm;
  }

  generateId() {
    return 'canvas-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  addNode(type, position, data = {}, id) {
    const nodeId = id || 'node-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    this.nodes.push({
      id: nodeId,
      type,
      position,
      data
    });
    return nodeId;
  }

  removeNode(nodeId) {
    const index = this.nodes.findIndex(node => node.id === nodeId);
    if (index !== -1) {
      this.nodes.splice(index, 1);
      this.edges = this.edges.filter(edge => edge.source !== nodeId && edge.target !== nodeId);
      return true;
    }
    return false;
  }

  updateNode(nodeId, updates) {
    const node = this.nodes.find(node => node.id === nodeId);
    if (node) {
      Object.assign(node, updates);
      return true;
    }
    return false;
  }

  getNode(nodeId) {
    return this.nodes.find(node => node.id === nodeId);
  }

  addEdge(source, target, type, data = {}, id) {
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

  removeEdge(edgeId) {
    const index = this.edges.findIndex(edge => edge.id === edgeId);
    if (index !== -1) {
      this.edges.splice(index, 1);
      return true;
    }
    return false;
  }

  updateEdge(edgeId, updates) {
    const edge = this.edges.find(edge => edge.id === edgeId);
    if (edge) {
      Object.assign(edge, updates);
      return true;
    }
    return false;
  }

  getEdge(edgeId) {
    return this.edges.find(edge => edge.id === edgeId);
  }

  toJson() {
    const document = {
      id: this.id,
      title: this.title,
      version: Canvas.CURRENT_VERSION,
      nodes: this.nodes,
      edges: this.edges,
      searchTerm: this.searchTerm
    };
    return JSON.stringify(document, null, 2);
  }

  static fromJson(json) {
    const rawObj = JSON.parse(json);
    const obj = Canvas.migrateToLatest(rawObj);
    const canvas = new Canvas(obj.id, obj.title);
    canvas.nodes = obj.nodes || [];
    canvas.edges = obj.edges || [];
    canvas.searchTerm = obj.searchTerm || "";
    return canvas;
  }

  static fromObject(obj) {
    const migratedObj = Canvas.migrateToLatest(obj);
    const canvas = new Canvas(migratedObj.id, migratedObj.title);
    canvas.nodes = migratedObj.nodes || [];
    canvas.edges = migratedObj.edges || [];
    canvas.searchTerm = migratedObj.searchTerm || "";
    return canvas;
  }

  saveToStorage() {
    localStorage.setItem(this.id, this.toJson());
  }

  static loadFromStorage(id) {
    const json = localStorage.getItem(id);
    if (!json) return null;
    return Canvas.fromJson(json);
  }

  validate() {
    const errors = [];
    const nodeIds = this.nodes.map(n => n.id);
    const duplicateNodeIds = nodeIds.filter((id, index) => nodeIds.indexOf(id) !== index);
    if (duplicateNodeIds.length > 0) {
      errors.push('Duplicate node IDs: ' + duplicateNodeIds.join(', '));
    }
    const edgeIds = this.edges.map(e => e.id);
    const duplicateEdgeIds = edgeIds.filter((id, index) => edgeIds.indexOf(id) !== index);
    if (duplicateEdgeIds.length > 0) {
      errors.push('Duplicate edge IDs: ' + duplicateEdgeIds.join(', '));
    }
    const validNodeIds = new Set(nodeIds);
    for (const edge of this.edges) {
      if (!validNodeIds.has(edge.source)) {
        errors.push('Edge ' + edge.id + ' references non-existent source node ' + edge.source);
      }
      if (!validNodeIds.has(edge.target)) {
        errors.push('Edge ' + edge.id + ' references non-existent target node ' + edge.target);
      }
    }
    return {
      valid: errors.length === 0,
      errors
    };
  }
}