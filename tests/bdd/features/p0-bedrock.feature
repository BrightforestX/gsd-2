Feature: Bedrock models when default AWS config exists
  So that I can see Bedrock in model lists without exporting AWS_PROFILE,
  GSD should treat shared ~/.aws files as a weak auth signal when opted in.

  Scenario: List models includes amazon-bedrock with assume-default-creds flag
    Given a temporary HOME with only default AWS shared config files
    And GSD_BEDROCK_ASSUME_DEFAULT_CREDS is enabled
    And explicit AWS credential environment variables are cleared
    When I run gsd with list-models argument "bedrock"
    Then the output should include "amazon-bedrock"
    And the exit code should be 0
