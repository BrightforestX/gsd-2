Feature: Doctor environment sandbox hints
  So that GSD projects see sandbox documentation pointers,
  environment checks should include gsd_sandbox when .gsd exists.

  Scenario: gsd_sandbox check for initialized projects
    Given a temporary directory with a gsd project marker
    When I run environment health checks on that directory
    Then the environment results should include gsd_sandbox
