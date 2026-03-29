// Test Canvas serialization

const serialized = JSON.stringify({
  "id": "test",
  "title": "Test Canvas",
  "nodes": [],
  "edges": []
}, null, 2);

console.log(serialized);