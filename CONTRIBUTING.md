# Contributions Guide

We welcome contributions of all types to make Translatabot better for everyone! Whether you're fixing bugs, suggesting new features, improving documentation, or sharing feedback, your input is valuable.

## How to Contribute

### 1. Report Issues

- Found a bug? Have a feature request? Open an issue on GitHub.
- Clearly describe the problem or suggestion, including steps to reproduce if applicable.

### 2. Suggest Features

- Share your ideas for new features or improvements by opening an issue.
- Provide as much detail as possible to help us understand your proposal.

### 3. Submit Pull Requests

- Fork the repository and create a new branch for your changes.
- Ensure your code adheres to the existing style and passes all tests.
- Include a clear and descriptive title for your pull request.
- Reference any related issues in the pull request description.

### 4. Improve Documentation

- Found a typo? Have suggestions to clarify instructions? Contributions to the documentation are always appreciated!
- Open a pull request with your updates.

## Guidelines

1. **Follow the Code of Conduct**  
   Be respectful and constructive in all interactions.

2. **Use Clear Commit Messages**  
   Write commit messages that explain the purpose of your changes.

3. **Write Tests**  
   When adding new features or fixing bugs, include tests to ensure the code works as intended.

4. **Keep Changes Small and Focused**  
   Avoid combining unrelated changes in a single pull request.

## Development Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/your-repo/translatabot.git
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Run tests:

   ```bash
   npm test
   ```

4. Run server:

   ```bash
   npm start
   ```

5. Simulate Github event with payload

   ```bash
   node_modules/.bin/probot receive -e pull_request -p "test/fixtures/partial_update_pull_request.closed.json" lib/src/index.js
   ```

6. Check [https://probot.github.io/docs/simulating-webhooks/](Probot documentation) for more options to test changes
