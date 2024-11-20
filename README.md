# Translatabot

Translatabot is a GitHub app designed to automatically keep your localization files updated. By monitoring changes to your default translation file (e.g. `en.json`, or `en_GB.ts`), Translatabot ensures that all your localization files stay in sync by creating automated pull requests (PRs) for updates. This saves you time and effort, so you can focus on building great software.

## Features

- Automatically monitors your default translation file for changes.
- Creates PRs to update localization files for all specified languages.
- Supports multiple languages with easy configuration.
- Keeps your localization files in sync with minimal manual intervention.

## Getting Started

Follow these steps to set up Translatabot in your repository:

### 1. Install Translatabot

Visit [Translatabot's GitHub App page](#) and install it on your desired repository.

### 2. Create the Default Configuration

- After installation, Translatabot will create an initial pull request with a default configuration (`translatabot.yml`).
- Review the PR and select all the languages you want Translatabot to manage.
- Merge the PR into your default branch.

### 3. Automated PRs for Localization Updates

- Translatabot will monitor your default translation file for changes.
- Whenever updates are detected, it will automatically create PRs to update the corresponding localization files.

Now your localization files will stay in sync effortlessly!

## Default Configuration Example

Here's an example of a basic `translatabot.yml` configuration file:

```yaml
version: 1
defaultPath: config/languages/resources/en-GB.ts # Path to the default translation file
languages:
  - relativePath: de.ts # Relative path to the auto-translated file
    language: German # English name of the language to be translated to.
```

## Tested Localization Frameworks

Translatabot can in theory be used with any localization framework in any programming lanuage. Some frameworks may not work because of different file structures. These are the tested localization frameworks:

- [Fluent](https://projectfluent.org/)
- More to come...

## How it works

The translations are provided by Google Gemini. In the future, more AI models should be supported and the users shall be able to choose. Gemini is currently chosen since it's free and allows this service to remain free for use.

## Beta Status

🚧 **Translatabot is currently in Beta** 🚧
While Translatabot is functional, it may have bugs or missing features. We appreciate your feedback to improve it.

- **Found a bug?** [Submit an issue](#).
- **Have a feature request?** [Request a feature](#).

Your input helps us make Translatabot better for everyone. Thank you for trying it out!

## Contributions

Contributions of any type are welcome! Whether it's bug reports, feature suggestions, documentation updates, or code contributions, we appreciate your help in improving Translatabot.

Please refer to the [CONTRIBUTIONS.md](./CONTRIBUTIONS.md) file for guidelines on how to contribute.

---

Start automating your localization updates with Translatabot today!
