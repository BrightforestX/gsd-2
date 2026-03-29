Feature: Shell pre-dispatch hooks are opt-in
  So that arbitrary shell is never run by default,
  GSD requires GSD_SHELL_HOOKS_ENABLED before executing hook.run steps.

  Scenario: Global gate is off when the env var is unset
    Given GSD_SHELL_HOOKS_ENABLED is unset for the shell hook gate
    Then shell hooks should not be globally enabled
