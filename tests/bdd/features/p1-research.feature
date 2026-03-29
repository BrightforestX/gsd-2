Feature: Research CLI materializes RESEARCH.md
  Scenario: gsd research --milestone creates milestone research scaffold
    Given a minimal GSD project with milestone M001
    When I run gsd research with milestone flag in that project
    Then the project should contain M001-RESEARCH.md with dispatch scaffold
