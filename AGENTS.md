```markdown
# AGENTS.md - AI Coding Agent Guidelines

These guidelines are designed to ensure the consistent and high-quality development of our AI coding agents. Adherence to these principles is mandatory for all development activities.

## 1. DRY (Don't Repeat Yourself)

*   **Single Responsibility Principle:** Each agent should have a single, well-defined purpose.  Avoid creating multiple agents with similar functionality.
*   **Code Reuse:** Leverage existing components and libraries whenever possible.  Document reuse patterns clearly.
*   **Abstraction:**  Implement abstract interfaces for agents and their functions.  This promotes flexibility and reduces duplication.
*   **Template Design:** Utilize templates for common agent types (e.g., sensor, controller, analyzer) to minimize boilerplate.

## 2. KISS (Keep It Simple, Stupid)

*   **Minimalism:** Strive for the simplest possible solutions.  Avoid unnecessary complexity.
*   **Readability:** Write code that is easy to understand and maintain.  Use clear variable names and comments judiciously.
*   **Efficiency:** Optimize for performance where possible without compromising correctness.
*   **Testability:** Design components to be easily testable.

## 3. SOLID Principles

*   **Single Responsibility:** Each class/component has only one reason to change.
*   **Open/Closed Principle:** The system should be extensible without modifying its core implementation.
*   **Liskov Substitution Principle:**  Subclasses should be substitutable for their base classes without altering the correctness of the program.
*   **Interface Segregation Principle:**  Clients should not be forced to depend on methods they don't use.
*   **Dependency Inversion Principle:**  High-level modules should not depend on low-level modules.

## 4. YAGNI (You Aren't Gonna Need It)

*   **Avoid Over-Engineering:**  Don't add features or complexity just because it *might* be needed later. Focus on what’s essential for the current task.
*   **Future-Proofing:**  Design agents with flexibility in mind – avoid constraints that could limit future development.

## 5. Development Process & Quality

*   **Progressive Builds:** Build and test frequently, even in small increments.
*   **Unit Tests:**  Generate at least 80% of the code with comprehensive unit tests.
*   **Integration Tests:**  Ensure agents work seamlessly together.
*   **Regression Testing:**  Automate regression tests to prevent regressions.
*   **Code Reviews:**  Mandatory code reviews for all changes.
*   **Documentation:**  Clear and concise documentation for all agents and components.
*   **Version Control:** Use Git with branch management for all code.
*   **Static Analysis:** Employ static analysis tools (e.g., pylint, flake8) to identify potential issues.
*   **Linting:** Utilize linting tools to enforce coding standards and style.

## 6. File Size & Structure

*   **Maximum Code Length:** 180 lines of code (excluding comments).
*   **File Organization:**  Organize code logically within files.  Use clear naming conventions.
*   **Modular Design:** Break down large files into smaller, manageable modules.
*   **Consistent Formatting:**  Follow a consistent coding style throughout the project.

## 7.  Specific Considerations for AGENTS.md

*   **Component Definitions:**  Clearly define the purpose and input/output of each agent type.
*   **Data Structures:**  Specify data structures used within agents to ensure consistency.
*   **Error Handling:**  Define error handling strategies for agent operations.
*   **Logging:** Implement logging for debugging and monitoring.
*   **API Definitions:**  Document API endpoints and data formats.
*   **Dependencies:**  Clearly specify external dependencies.

## 8.  Testing Framework

*   **Unit Tests:**  All tests should be unit tests.
*   **Integration Tests:**  Focus on core agent interactions.
*   **Regression Tests:**  Run regression tests after each change.

## 9.  Reporting

*   **Coverage Reports:**  Generate code coverage reports for each agent.
*   **Bug Reports:**  Document any identified bugs.

These guidelines are subject to change as the project evolves.  All AI coders are expected to stay updated with the latest best practices.
```