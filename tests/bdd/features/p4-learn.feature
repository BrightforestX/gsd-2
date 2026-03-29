Feature: Learn CLI
  So that I can discover overlay behavior,
  GSD learn should document overlays in help output.

  Scenario: Help mentions overlays
    When I run gsd learn with help flag
    Then the learn output should include "Overlays"
    And the learn exit code should be 0
