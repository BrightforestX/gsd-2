Feature: MCP bootstrap dry-run
  So that I can plan MCP server entries without network installs,
  GSD should print a dry-run plan for matching catalog entries.

  Scenario: Node project matches generic npm catalog entry
    Given a temporary project with package.json
    When I run gsd mcp bootstrap dry-run in that project
    Then the bootstrap output should include a server key
    And the bootstrap exit code should be 0
