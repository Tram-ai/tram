/**
 * @license
 * Copyright 2025 Tram
 * SPDX-License-Identifier: Apache-2.0
 */

// English translations for TRAM CLI
// The key serves as both the translation key and the default English text

export default {
  // ============================================================================
  // Help / UI Components
  // ============================================================================
  // Attachment hints
  '闂?to manage attachments': '闂?to manage attachments',
  '闂?闂?select, Delete to remove, 闂?to exit':
    '闂?闂?select, Delete to remove, 闂?to exit',
  'Attachments: ': 'Attachments: ',

  'Basics:': 'Basics:',
  'Add context': 'Add context',
  'Use {{symbol}} to specify files for context (e.g., {{example}}) to target specific files or folders.':
    'Use {{symbol}} to specify files for context (e.g., {{example}}) to target specific files or folders.',
  '@': '@',
  '@src/myFile.ts': '@src/myFile.ts',
  'Shell mode': 'Shell mode',
  'YOLO mode': 'YOLO mode',
  'plan mode': 'plan mode',
  'auto-accept edits': 'auto-accept edits',
  'Accepting edits': 'Accepting edits',
  '(shift + tab to cycle)': '(shift + tab to cycle)',
  '(tab to cycle)': '(tab to cycle)',
  'Execute shell commands via {{symbol}} (e.g., {{example1}}) or use natural language (e.g., {{example2}}).':
    'Execute shell commands via {{symbol}} (e.g., {{example1}}) or use natural language (e.g., {{example2}}).',
  '!': '!',
  '!npm run start': '!npm run start',
  'start server': 'start server',
  'Commands:': 'Commands:',
  'shell command': 'shell command',
  'Model Context Protocol command (from external servers)':
    'Model Context Protocol command (from external servers)',
  'Keyboard Shortcuts:': 'Keyboard Shortcuts:',
  'Toggle this help display': 'Toggle this help display',
  'Toggle shell mode': 'Toggle shell mode',
  'Open command menu': 'Open command menu',
  'Add file context': 'Add file context',
  'Accept suggestion / Autocomplete': 'Accept suggestion / Autocomplete',
  'Reverse search history': 'Reverse search history',
  'Press ? again to close': 'Press ? again to close',
  // Keyboard shortcuts panel descriptions
  'for shell mode': 'for shell mode',
  'for commands': 'for commands',
  'for file paths': 'for file paths',
  'to clear input': 'to clear input',
  'to cycle approvals': 'to cycle approvals',
  'to quit': 'to quit',
  'for newline': 'for newline',
  'to clear screen': 'to clear screen',
  'to search history': 'to search history',
  'to paste images': 'to paste images',
  'for external editor': 'for external editor',
  'Jump through words in the input': 'Jump through words in the input',
  'Close dialogs, cancel requests, or quit application':
    'Close dialogs, cancel requests, or quit application',
  'New line': 'New line',
  'New line (Alt+Enter works for certain linux distros)':
    'New line (Alt+Enter works for certain linux distros)',
  'Clear the screen': 'Clear the screen',
  'Open input in external editor': 'Open input in external editor',
  'Send message': 'Send message',
  'Initializing...': 'Initializing...',
  'Connecting to MCP servers... ({{connected}}/{{total}})':
    'Connecting to MCP servers... ({{connected}}/{{total}})',
  'Type your message or @path/to/file': 'Type your message or @path/to/file',
  '? for shortcuts': '? for shortcuts',
  "Press 'i' for INSERT mode and 'Esc' for NORMAL mode.":
    "Press 'i' for INSERT mode and 'Esc' for NORMAL mode.",
  'Cancel operation / Clear input (double press)':
    'Cancel operation / Clear input (double press)',
  'Cycle approval modes': 'Cycle approval modes',
  'Cycle through your prompt history': 'Cycle through your prompt history',
  'For a full list of shortcuts, see {{docPath}}':
    'For a full list of shortcuts, see {{docPath}}',
  'docs/keyboard-shortcuts.md': 'docs/keyboard-shortcuts.md',
  'for help on TRAM': 'for help on TRAM',
  'show version info': 'show version info',
  'submit a bug report': 'submit a bug report',
  'About TRAM': 'About TRAM',
  Status: 'Status',
  '(/model to change)': '(/model to change)',

  // Initialization wizard
  'TRAM Initialization Wizard': 'TRAM Initialization Wizard',
  'Esc to cancel at any time.': 'Esc to cancel at any time.',
  'Initialization: Select providers': 'Initialization: Select providers',
  'Use 闂佹剚鍋呴崹鐔煎疮瀹€鍕劶闁硅埇鍔岄弲?to move, Space to toggle, Enter to continue. You can configure multiple providers in one run.':
    'Use 闂佹剚鍋呴崹鐔煎疮瀹€鍕劶闁硅埇鍔岄弲?to move, Space to toggle, Enter to continue. You can configure multiple providers in one run.',
  'Select at least one provider.': 'Select at least one provider.',
  'No provider selected.': 'No provider selected.',
  Enabled: 'Enabled',
  'Configure provider {{current}}/{{total}}: {{name}}':
    'Configure provider {{current}}/{{total}}: {{name}}',
  'This provider uses OAuth. Press Enter to continue to model selection.':
    'This provider uses OAuth. Press Enter to continue to model selection.',
  'Use 闂佹剚鍋呴崹鐔煎疮瀹€鍕劶闁硅埇鍔岄弲?to choose a field. Enter to edit. Press N to continue to model selection.':
    'Use 闂佹剚鍋呴崹鐔煎疮瀹€鍕劶闁硅埇鍔岄弲?to choose a field. Enter to edit. Press N to continue to model selection.',
  'Editing {{field}}: {{value}}': 'Editing {{field}}: {{value}}',
  'Model selection: {{name}}': 'Model selection: {{name}}',
  'Try OpenAI-compatible /models list first. If unavailable or incomplete, choose custom model.':
    'Try OpenAI-compatible /models list first. If unavailable or incomplete, choose custom model.',
  'Loading models...': 'Loading models...',
  'Custom model...': 'Custom model...',
  'Enter custom model name': 'Enter custom model name',
  'Press Enter to confirm.': 'Press Enter to confirm.',
  'Model name cannot be empty.': 'Model name cannot be empty.',
  'Select approval mode': 'Select approval mode',
  'Recommended: YOLO': 'Recommended: YOLO',
  'Plan only': 'Plan only',
  'Only generate plans, no execution. Best safety, lowest automation.':
    'Only generate plans, no execution. Best safety, lowest automation.',
  'Ask every time': 'Ask every time',
  'Every action requires confirmation. Safe but slower.':
    'Every action requires confirmation. Safe but slower.',
  'Auto-approve edits': 'Auto-approve edits',
  'Edit/write tools are auto-approved, others still ask.':
    'Edit/write tools are auto-approved, others still ask.',
  'YOLO (recommended)': 'YOLO (recommended)',
  'Fastest workflow. Fully automated execution with higher risk.':
    'Fastest workflow. Fully automated execution with higher risk.',
  'Proxy configuration': 'Proxy configuration',
  'Use 闂佹剚鍋呴崹鐔煎疮瀹€鍕劶闁硅埇鍔岄弲?to choose.': 'Use 闂佹剚鍋呴崹鐔煎疮瀹€鍕劶闁硅埇鍔岄弲?to choose.',
  'Follow system proxy': 'Follow system proxy',
  'No proxy': 'No proxy',
  'Custom proxy': 'Custom proxy',
  'Enter custom proxy': 'Enter custom proxy',
  'Example: http://127.0.0.1:7890': 'Example: http://127.0.0.1:7890',
  'Select theme': 'Select theme',
  'This list follows built-in /theme options.':
    'This list follows built-in /theme options.',
  'Review configuration': 'Review configuration',
  Providers: 'Providers',
  'Default provider': 'Default provider',
  'Default model': 'Default model',
  'Approval mode': 'Approval mode',
  'At least one provider must be configured.':
    'At least one provider must be configured.',
  'Press Enter to save, Esc to cancel.':
    'Press Enter to save, Esc to cancel.',
  'Initialization complete.': 'Initialization complete.',
  'Settings were saved. Press Enter to continue.':
    'Settings were saved. Press Enter to continue.',

  // ============================================================================
  // System Information Fields
  // ============================================================================
  'CLI Version': 'CLIバージョン',
  'Git Commit': 'Gitコミット',
  Model: 'モデル',
  'Fast Model': '高速モデル',
  Sandbox: 'サンドボックス',
  'OS Platform': 'OSプラットフォーム',
  'OS Arch': 'OSアーキテクチャ',
  'OS Release': 'OSリリース',
  'Node.js Version': 'Node.js バージョン',
  'NPM Version': 'NPM バージョン',
  'Session ID': 'セッションID',
  'Auth Method': '認証方式',
  'Base URL': 'ベースURL',
  'Memory Usage': 'メモリ使用量',
  'IDE Client': 'IDEクライアント',

  // ============================================================================
  // Commands - General
  // ============================================================================
  'Analyzes the project and creates a tailored TRAM.md file.':
    'Analyzes the project and creates a tailored TRAM.md file.',
  'List available TRAM tools. Usage: /tools [desc]':
    'List available TRAM tools. Usage: /tools [desc]',
  'List available skills.': 'List available skills.',
  'Available TRAM CLI tools:': 'Available TRAM CLI tools:',
  'No tools available': 'No tools available',
  'View or change the approval mode for tool usage':
    'View or change the approval mode for tool usage',
  'Invalid approval mode "{{arg}}". Valid modes: {{modes}}':
    'Invalid approval mode "{{arg}}". Valid modes: {{modes}}',
  'Approval mode set to "{{mode}}"': 'Approval mode set to "{{mode}}"',
  'View or change the language setting': 'View or change the language setting',
  'change the theme': 'change the theme',
  'Select Theme': 'Select Theme',
  Preview: 'Preview',
  '(Use Enter to select, Tab to configure scope)':
    '(Use Enter to select, Tab to configure scope)',
  '(Use Enter to apply scope, Tab to go back)':
    '(Use Enter to apply scope, Tab to go back)',
  'Theme configuration unavailable due to NO_COLOR env variable.':
    'Theme configuration unavailable due to NO_COLOR env variable.',
  'Theme "{{themeName}}" not found.': 'Theme "{{themeName}}" not found.',
  'Theme "{{themeName}}" not found in selected scope.':
    'Theme "{{themeName}}" not found in selected scope.',
  'Clear conversation history and free up context':
    'Clear conversation history and free up context',
  'Compresses the context by replacing it with a summary.':
    'Compresses the context by replacing it with a summary.',
  'open full TRAM documentation in your browser':
    'open full TRAM documentation in your browser',
  'Configuration not available.': 'Configuration not available.',
  'change the auth method': 'change the auth method',
  'Configure authentication information for login':
    'Configure authentication information for login',
  'Copy the last result or code snippet to clipboard':
    'Copy the last result or code snippet to clipboard',

  // ============================================================================
  // Commands - Agents
  // ============================================================================
  'Manage subagents for specialized task delegation.':
    'Manage subagents for specialized task delegation.',
  'Manage existing subagents (view, edit, delete).':
    'Manage existing subagents (view, edit, delete).',
  'Create a new subagent with guided setup.':
    'Create a new subagent with guided setup.',

  // ============================================================================
  // Agents - Management Dialog
  // ============================================================================
  Agents: 'Agents',
  'Choose Action': 'Choose Action',
  'Edit {{name}}': 'Edit {{name}}',
  'Edit Tools: {{name}}': 'Edit Tools: {{name}}',
  'Edit Color: {{name}}': 'Edit Color: {{name}}',
  'Delete {{name}}': 'Delete {{name}}',
  'Unknown Step': 'Unknown Step',
  'Esc to close': 'Esc to close',
  'Enter to select, 闂佹剚鍋呴崹鐔煎疮?to navigate, Esc to close':
    'Enter to select, 闂佹剚鍋呴崹鐔煎疮?to navigate, Esc to close',
  'Esc to go back': 'Esc to go back',
  'Enter to confirm, Esc to cancel': 'Enter to confirm, Esc to cancel',
  'Enter to select, 闂佹剚鍋呴崹鐔煎疮?to navigate, Esc to go back':
    'Enter to select, 闂佹剚鍋呴崹鐔煎疮?to navigate, Esc to go back',
  'Enter to submit, Esc to go back': 'Enter to submit, Esc to go back',
  'Invalid step: {{step}}': 'Invalid step: {{step}}',
  'No subagents found.': 'No subagents found.',
  "Use '/agents create' to create your first subagent.":
    "Use '/agents create' to create your first subagent.",
  '(built-in)': '(built-in)',
  '(overridden by project level agent)': '(overridden by project level agent)',
  'Project Level ({{path}})': 'Project Level ({{path}})',
  'User Level ({{path}})': 'User Level ({{path}})',
  'Built-in Agents': 'Built-in Agents',
  'Extension Agents': 'Extension Agents',
  'Using: {{count}} agents': 'Using: {{count}} agents',
  'View Agent': 'View Agent',
  'Edit Agent': 'Edit Agent',
  'Delete Agent': 'Delete Agent',
  Back: 'Back',
  'No agent selected': 'No agent selected',
  'File Path: ': 'File Path: ',
  'Tools: ': 'Tools: ',
  'Color: ': 'Color: ',
  'Description:': 'Description:',
  'System Prompt:': 'System Prompt:',
  'Open in editor': 'Open in editor',
  'Edit tools': 'Edit tools',
  'Edit color': 'Edit color',
  '闂?Error:': '闂?Error:',
  'Are you sure you want to delete agent "{{name}}"?':
    'Are you sure you want to delete agent "{{name}}"?',
  // ============================================================================
  // Agents - Creation Wizard
  // ============================================================================
  'Project Level (.tram/agents/)': 'Project Level (.tram/agents/)',
  'User Level (~/.tram/agents/)': 'User Level (~/.tram/agents/)',
  '闂?Subagent Created Successfully!': '闂?Subagent Created Successfully!',
  'Subagent "{{name}}" has been saved to {{level}} level.':
    'Subagent "{{name}}" has been saved to {{level}} level.',
  'Name: ': 'Name: ',
  'Location: ': 'Location: ',
  '闂?Error saving subagent:': '闂?Error saving subagent:',
  'Warnings:': 'Warnings:',
  'Name "{{name}}" already exists at {{level}} level - will overwrite existing subagent':
    'Name "{{name}}" already exists at {{level}} level - will overwrite existing subagent',
  'Name "{{name}}" exists at user level - project level will take precedence':
    'Name "{{name}}" exists at user level - project level will take precedence',
  'Name "{{name}}" exists at project level - existing subagent will take precedence':
    'Name "{{name}}" exists at project level - existing subagent will take precedence',
  'Description is over {{length}} characters':
    'Description is over {{length}} characters',
  'System prompt is over {{length}} characters':
    'System prompt is over {{length}} characters',
  // Agents - Creation Wizard Steps
  'Step {{n}}: Choose Location': 'Step {{n}}: Choose Location',
  'Step {{n}}: Choose Generation Method':
    'Step {{n}}: Choose Generation Method',
  'Generate with TRAM (Recommended)':
    'Generate with TRAM (Recommended)',
  'Manual Creation': 'Manual Creation',
  'Describe what this subagent should do and when it should be used. (Be comprehensive for best results)':
    'Describe what this subagent should do and when it should be used. (Be comprehensive for best results)',
  'e.g., Expert code reviewer that reviews code based on best practices...':
    'e.g., Expert code reviewer that reviews code based on best practices...',
  'Generating subagent configuration...':
    'Generating subagent configuration...',
  'Failed to generate subagent: {{error}}':
    'Failed to generate subagent: {{error}}',
  'Step {{n}}: Describe Your Subagent': 'Step {{n}}: Describe Your Subagent',
  'Step {{n}}: Enter Subagent Name': 'Step {{n}}: Enter Subagent Name',
  'Step {{n}}: Enter System Prompt': 'Step {{n}}: Enter System Prompt',
  'Step {{n}}: Enter Description': 'Step {{n}}: Enter Description',
  // Agents - Tool Selection
  'Step {{n}}: Select Tools': 'Step {{n}}: Select Tools',
  'All Tools (Default)': 'All Tools (Default)',
  'All Tools': 'All Tools',
  'Read-only Tools': 'Read-only Tools',
  'Read & Edit Tools': 'Read & Edit Tools',
  'Read & Edit & Execution Tools': 'Read & Edit & Execution Tools',
  'All tools selected, including MCP tools':
    'All tools selected, including MCP tools',
  'Selected tools:': 'Selected tools:',
  'Read-only tools:': 'Read-only tools:',
  'Edit tools:': 'Edit tools:',
  'Execution tools:': 'Execution tools:',
  'Step {{n}}: Choose Background Color': 'Step {{n}}: Choose Background Color',
  'Step {{n}}: Confirm and Save': 'Step {{n}}: Confirm and Save',
  // Agents - Navigation & Instructions
  'Esc to cancel': 'Esc to cancel',
  'Press Enter to save, e to save and edit, Esc to go back':
    'Press Enter to save, e to save and edit, Esc to go back',
  'Press Enter to continue, {{navigation}}Esc to {{action}}':
    'Press Enter to continue, {{navigation}}Esc to {{action}}',
  cancel: 'cancel',
  'go back': 'go back',
  '闂佹剚鍋呴崹鐔煎疮?to navigate, ': '闂佹剚鍋呴崹鐔煎疮?to navigate, ',
  'Enter a clear, unique name for this subagent.':
    'Enter a clear, unique name for this subagent.',
  'e.g., Code Reviewer': 'e.g., Code Reviewer',
  'Name cannot be empty.': 'Name cannot be empty.',
  "Write the system prompt that defines this subagent's behavior. Be comprehensive for best results.":
    "Write the system prompt that defines this subagent's behavior. Be comprehensive for best results.",
  'e.g., You are an expert code reviewer...':
    'e.g., You are an expert code reviewer...',
  'System prompt cannot be empty.': 'System prompt cannot be empty.',
  'Describe when and how this subagent should be used.':
    'Describe when and how this subagent should be used.',
  'e.g., Reviews code for best practices and potential bugs.':
    'e.g., Reviews code for best practices and potential bugs.',
  'Description cannot be empty.': 'Description cannot be empty.',
  'Failed to launch editor: {{error}}': 'Failed to launch editor: {{error}}',
  'Failed to save and edit subagent: {{error}}':
    'Failed to save and edit subagent: {{error}}',

  // ============================================================================
  // Extensions - Management Dialog
  // ============================================================================
  'Manage Extensions': 'Manage Extensions',
  'Extension Details': 'Extension Details',
  'View Extension': 'View Extension',
  'Update Extension': 'Update Extension',
  'Disable Extension': 'Disable Extension',
  'Enable Extension': 'Enable Extension',
  'Uninstall Extension': 'Uninstall Extension',
  'Select Scope': 'Select Scope',
  'User Scope': 'User Scope',
  'Workspace Scope': 'Workspace Scope',
  'No extensions found.': 'No extensions found.',
  Active: 'Active',
  Disabled: 'Disabled',
  'Update available': 'Update available',
  'Up to date': 'Up to date',
  'Checking...': 'Checking...',
  'Updating...': 'Updating...',
  Unknown: 'Unknown',
  Error: 'Error',
  'Version:': 'Version:',
  'Status:': 'Status:',
  'Are you sure you want to uninstall extension "{{name}}"?':
    'Are you sure you want to uninstall extension "{{name}}"?',
  'This action cannot be undone.': 'This action cannot be undone.',
  'Extension "{{name}}" disabled successfully.':
    'Extension "{{name}}" disabled successfully.',
  'Extension "{{name}}" enabled successfully.':
    'Extension "{{name}}" enabled successfully.',
  'Extension "{{name}}" updated successfully.':
    'Extension "{{name}}" updated successfully.',
  'Failed to update extension "{{name}}": {{error}}':
    'Failed to update extension "{{name}}": {{error}}',
  'Select the scope for this action:': 'Select the scope for this action:',
  'User - Applies to all projects': 'User - Applies to all projects',
  'Workspace - Applies to current project only':
    'Workspace - Applies to current project only',
  // Extension dialog - missing keys
  'Name:': 'Name:',
  'MCP Servers:': 'MCP Servers:',
  'Settings:': 'Settings:',
  active: 'active',
  disabled: 'disabled',
  'View Details': 'View Details',
  'Update failed:': 'Update failed:',
  'Updating {{name}}...': 'Updating {{name}}...',
  'Update complete!': 'Update complete!',
  'User (global)': 'User (global)',
  'Workspace (project-specific)': 'Workspace (project-specific)',
  'Disable "{{name}}" - Select Scope': 'Disable "{{name}}" - Select Scope',
  'Enable "{{name}}" - Select Scope': 'Enable "{{name}}" - Select Scope',
  'No extension selected': 'No extension selected',
  'Press Y/Enter to confirm, N/Esc to cancel':
    'Press Y/Enter to confirm, N/Esc to cancel',
  'Y/Enter to confirm, N/Esc to cancel': 'Y/Enter to confirm, N/Esc to cancel',
  '{{count}} extensions installed': '{{count}} extensions installed',
  "Use '/extensions install' to install your first extension.":
    "Use '/extensions install' to install your first extension.",
  // Update status values
  'up to date': 'up to date',
  'update available': 'update available',
  'checking...': 'checking...',
  'not updatable': 'not updatable',
  error: 'error',

  // ============================================================================
  // Commands - General (continued)
  // ============================================================================
  'View and edit TRAM settings': 'View and edit TRAM settings',
  Settings: 'Settings',
  'To see changes, TRAM must be restarted. Press r to exit and apply changes now.':
    'To see changes, TRAM must be restarted. Press r to exit and apply changes now.',
  'The command "/{{command}}" is not supported in non-interactive mode.':
    'The command "/{{command}}" is not supported in non-interactive mode.',
  // ============================================================================
  // Settings Labels
  // ============================================================================
  'Vim Mode': 'Vim Mode',
  'Disable Auto Update': 'Disable Auto Update',
  'Attribution: commit': 'Attribution: commit',
  'Terminal Bell Notification': 'Terminal Bell Notification',
  'Enable Usage Statistics': 'Enable Usage Statistics',
  Theme: 'Theme',
  'Preferred Editor': 'Preferred Editor',
  'Auto-connect to IDE': 'Auto-connect to IDE',
  'Enable Prompt Completion': 'Enable Prompt Completion',
  'Debug Keystroke Logging': 'Debug Keystroke Logging',
  'Language: UI': 'Language: UI',
  'Language: Model': 'Language: Model',
  'Output Format': 'Output Format',
  'Hide Window Title': 'Hide Window Title',
  'Show Status in Title': 'Show Status in Title',
  'Hide Tips': 'Hide Tips',
  'Show Line Numbers in Code': 'Show Line Numbers in Code',
  'Show Citations': 'Show Citations',
  'Custom Witty Phrases': 'Custom Witty Phrases',
  'Show Welcome Back Dialog': 'Show Welcome Back Dialog',
  'Enable User Feedback': 'Enable User Feedback',
  'How is TRAM doing this session? (optional)':
    'How is TRAM doing this session? (optional)',
  Bad: 'Bad',
  Fine: 'Fine',
  Good: 'Good',
  Dismiss: 'Dismiss',
  'Not Sure Yet': 'Not Sure Yet',
  'Any other key': 'Any other key',
  'Disable Loading Phrases': 'Disable Loading Phrases',
  'Screen Reader Mode': 'Screen Reader Mode',
  'IDE Mode': 'IDE Mode',
  'Max Session Turns': 'Max Session Turns',
  'Skip Next Speaker Check': 'Skip Next Speaker Check',
  'Skip Loop Detection': 'Skip Loop Detection',
  'Skip Startup Context': 'Skip Startup Context',
  'Enable OpenAI Logging': 'Enable OpenAI Logging',
  'OpenAI Logging Directory': 'OpenAI Logging Directory',
  Timeout: 'Timeout',
  'Max Retries': 'Max Retries',
  'Disable Cache Control': 'Disable Cache Control',
  'Memory Discovery Max Dirs': 'Memory Discovery Max Dirs',
  'Load Memory From Include Directories':
    'Load Memory From Include Directories',
  'Respect .gitignore': 'Respect .gitignore',
  'Respect .tramignore': 'Respect .tramignore',
  'Enable Recursive File Search': 'Enable Recursive File Search',
  'Disable Fuzzy Search': 'Disable Fuzzy Search',
  'Interactive Shell (PTY)': 'Interactive Shell (PTY)',
  'Show Color': 'Show Color',
  'Auto Accept': 'Auto Accept',
  'Use Ripgrep': 'Use Ripgrep',
  'Use Builtin Ripgrep': 'Use Builtin Ripgrep',
  'Enable Tool Output Truncation': 'Enable Tool Output Truncation',
  'Tool Output Truncation Threshold': 'Tool Output Truncation Threshold',
  'Tool Output Truncation Lines': 'Tool Output Truncation Lines',
  'Folder Trust': 'Folder Trust',
  'Vision Model Preview': 'Vision Model Preview',
  'Tool Schema Compliance': 'Tool Schema Compliance',
  // Settings enum options
  'Auto (detect from system)': 'Auto (detect from system)',
  Text: 'Text',
  JSON: 'JSON',
  Plan: 'Plan',
  Default: 'Default',
  'Auto Edit': 'Auto Edit',
  YOLO: 'YOLO',
  'toggle vim mode on/off': 'toggle vim mode on/off',
  'check session stats. Usage: /stats [model|tools]':
    'check session stats. Usage: /stats [model|tools]',
  'Show model-specific usage statistics.':
    'Show model-specific usage statistics.',
  'Show tool-specific usage statistics.':
    'Show tool-specific usage statistics.',
  'exit the cli': 'exit the cli',
  'Open MCP management dialog, or authenticate with OAuth-enabled servers':
    'Open MCP management dialog, or authenticate with OAuth-enabled servers',
  'List configured MCP servers and tools, or authenticate with OAuth-enabled servers':
    'List configured MCP servers and tools, or authenticate with OAuth-enabled servers',
  'Manage workspace directories': 'Manage workspace directories',
  'Add directories to the workspace. Use comma to separate multiple paths':
    'Add directories to the workspace. Use comma to separate multiple paths',
  'Show all directories in the workspace':
    'Show all directories in the workspace',
  'set external editor preference': 'set external editor preference',
  'Select Editor': 'Select Editor',
  'Editor Preference': 'Editor Preference',
  'These editors are currently supported. Please note that some editors cannot be used in sandbox mode.':
    'These editors are currently supported. Please note that some editors cannot be used in sandbox mode.',
  'Your preferred editor is:': 'Your preferred editor is:',
  'Manage extensions': 'Manage extensions',
  'Manage installed extensions': 'Manage installed extensions',
  'List active extensions': 'List active extensions',
  'Update extensions. Usage: update <extension-names>|--all':
    'Update extensions. Usage: update <extension-names>|--all',
  'Disable an extension': 'Disable an extension',
  'Enable an extension': 'Enable an extension',
  'Install an extension from a git repo or local path':
    'Install an extension from a git repo or local path',
  'Uninstall an extension': 'Uninstall an extension',
  'No extensions installed.': 'No extensions installed.',
  'Usage: /extensions update <extension-names>|--all':
    'Usage: /extensions update <extension-names>|--all',
  'Extension "{{name}}" not found.': 'Extension "{{name}}" not found.',
  'No extensions to update.': 'No extensions to update.',
  'Usage: /extensions install <source>': 'Usage: /extensions install <source>',
  'Installing extension from "{{source}}"...':
    'Installing extension from "{{source}}"...',
  'Extension "{{name}}" installed successfully.':
    'Extension "{{name}}" installed successfully.',
  'Failed to install extension from "{{source}}": {{error}}':
    'Failed to install extension from "{{source}}": {{error}}',
  'Usage: /extensions uninstall <extension-name>':
    'Usage: /extensions uninstall <extension-name>',
  'Uninstalling extension "{{name}}"...':
    'Uninstalling extension "{{name}}"...',
  'Extension "{{name}}" uninstalled successfully.':
    'Extension "{{name}}" uninstalled successfully.',
  'Failed to uninstall extension "{{name}}": {{error}}':
    'Failed to uninstall extension "{{name}}": {{error}}',
  'Usage: /extensions {{command}} <extension> [--scope=<user|workspace>]':
    'Usage: /extensions {{command}} <extension> [--scope=<user|workspace>]',
  'Unsupported scope "{{scope}}", should be one of "user" or "workspace"':
    'Unsupported scope "{{scope}}", should be one of "user" or "workspace"',
  'Extension "{{name}}" disabled for scope "{{scope}}"':
    'Extension "{{name}}" disabled for scope "{{scope}}"',
  'Extension "{{name}}" enabled for scope "{{scope}}"':
    'Extension "{{name}}" enabled for scope "{{scope}}"',
  'Do you want to continue? [Y/n]: ': 'Do you want to continue? [Y/n]: ',
  'Do you want to continue?': 'Do you want to continue?',
  'Installing extension "{{name}}".': 'Installing extension "{{name}}".',
  '**Extensions may introduce unexpected behavior. Ensure you have investigated the extension source and trust the author.**':
    '**Extensions may introduce unexpected behavior. Ensure you have investigated the extension source and trust the author.**',
  'This extension will run the following MCP servers:':
    'This extension will run the following MCP servers:',
  local: 'local',
  remote: 'remote',
  'This extension will add the following commands: {{commands}}.':
    'This extension will add the following commands: {{commands}}.',
  'This extension will append info to your TRAM.md context using {{fileName}}':
    'This extension will append info to your TRAM.md context using {{fileName}}',
  'This extension will exclude the following core tools: {{tools}}':
    'This extension will exclude the following core tools: {{tools}}',
  'This extension will install the following skills:':
    'This extension will install the following skills:',
  'This extension will install the following subagents:':
    'This extension will install the following subagents:',
  'Installation cancelled for "{{name}}".':
    'Installation cancelled for "{{name}}".',
  'You are installing an extension from {{originSource}}. Some features may not work perfectly with TRAM.':
    'You are installing an extension from {{originSource}}. Some features may not work perfectly with TRAM.',
  '--ref and --auto-update are not applicable for marketplace extensions.':
    '--ref and --auto-update are not applicable for marketplace extensions.',
  'Extension "{{name}}" installed successfully and enabled.':
    'Extension "{{name}}" installed successfully and enabled.',
  'Installs an extension from a git repository URL, local path, or claude marketplace (marketplace-url:plugin-name).':
    'Installs an extension from a git repository URL, local path, or claude marketplace (marketplace-url:plugin-name).',
  'The github URL, local path, or marketplace source (marketplace-url:plugin-name) of the extension to install.':
    'The github URL, local path, or marketplace source (marketplace-url:plugin-name) of the extension to install.',
  'The git ref to install from.': 'The git ref to install from.',
  'Enable auto-update for this extension.':
    'Enable auto-update for this extension.',
  'Enable pre-release versions for this extension.':
    'Enable pre-release versions for this extension.',
  'Acknowledge the security risks of installing an extension and skip the confirmation prompt.':
    'Acknowledge the security risks of installing an extension and skip the confirmation prompt.',
  'The source argument must be provided.':
    'The source argument must be provided.',
  'Extension "{{name}}" successfully uninstalled.':
    'Extension "{{name}}" successfully uninstalled.',
  'Uninstalls an extension.': 'Uninstalls an extension.',
  'The name or source path of the extension to uninstall.':
    'The name or source path of the extension to uninstall.',
  'Please include the name of the extension to uninstall as a positional argument.':
    'Please include the name of the extension to uninstall as a positional argument.',
  'Enables an extension.': 'Enables an extension.',
  'The name of the extension to enable.':
    'The name of the extension to enable.',
  'The scope to enable the extenison in. If not set, will be enabled in all scopes.':
    'The scope to enable the extenison in. If not set, will be enabled in all scopes.',
  'Extension "{{name}}" successfully enabled for scope "{{scope}}".':
    'Extension "{{name}}" successfully enabled for scope "{{scope}}".',
  'Extension "{{name}}" successfully enabled in all scopes.':
    'Extension "{{name}}" successfully enabled in all scopes.',
  'Invalid scope: {{scope}}. Please use one of {{scopes}}.':
    'Invalid scope: {{scope}}. Please use one of {{scopes}}.',
  'Disables an extension.': 'Disables an extension.',
  'The name of the extension to disable.':
    'The name of the extension to disable.',
  'The scope to disable the extenison in.':
    'The scope to disable the extenison in.',
  'Extension "{{name}}" successfully disabled for scope "{{scope}}".':
    'Extension "{{name}}" successfully disabled for scope "{{scope}}".',
  'Extension "{{name}}" successfully updated: {{oldVersion}} 闂?{{newVersion}}.':
    'Extension "{{name}}" successfully updated: {{oldVersion}} 闂?{{newVersion}}.',
  'Unable to install extension "{{name}}" due to missing install metadata':
    'Unable to install extension "{{name}}" due to missing install metadata',
  'Extension "{{name}}" is already up to date.':
    'Extension "{{name}}" is already up to date.',
  'Updates all extensions or a named extension to the latest version.':
    'Updates all extensions or a named extension to the latest version.',
  'Update all extensions.': 'Update all extensions.',
  'Either an extension name or --all must be provided':
    'Either an extension name or --all must be provided',
  'Lists installed extensions.': 'Lists installed extensions.',
  'Path:': 'Path:',
  'Source:': 'Source:',
  'Type:': 'Type:',
  'Ref:': 'Ref:',
  'Release tag:': 'Release tag:',
  'Enabled (User):': 'Enabled (User):',
  'Enabled (Workspace):': 'Enabled (Workspace):',
  'Context files:': 'Context files:',
  'Skills:': 'Skills:',
  'Agents:': 'Agents:',
  'MCP servers:': 'MCP servers:',
  'Link extension failed to install.': 'Link extension failed to install.',
  'Extension "{{name}}" linked successfully and enabled.':
    'Extension "{{name}}" linked successfully and enabled.',
  'Links an extension from a local path. Updates made to the local path will always be reflected.':
    'Links an extension from a local path. Updates made to the local path will always be reflected.',
  'The name of the extension to link.': 'The name of the extension to link.',
  'Set a specific setting for an extension.':
    'Set a specific setting for an extension.',
  'Name of the extension to configure.': 'Name of the extension to configure.',
  'The setting to configure (name or env var).':
    'The setting to configure (name or env var).',
  'The scope to set the setting in.': 'The scope to set the setting in.',
  'List all settings for an extension.': 'List all settings for an extension.',
  'Name of the extension.': 'Name of the extension.',
  'Extension "{{name}}" has no settings to configure.':
    'Extension "{{name}}" has no settings to configure.',
  'Settings for "{{name}}":': 'Settings for "{{name}}":',
  '(workspace)': '(workspace)',
  '(user)': '(user)',
  '[not set]': '[not set]',
  '[value stored in keychain]': '[value stored in keychain]',
  'Value:': 'Value:',
  'Manage extension settings.': 'Manage extension settings.',
  'You need to specify a command (set or list).':
    'You need to specify a command (set or list).',
  // ============================================================================
  // Plugin Choice / Marketplace
  // ============================================================================
  'No plugins available in this marketplace.':
    'No plugins available in this marketplace.',
  'Select a plugin to install from marketplace "{{name}}":':
    'Select a plugin to install from marketplace "{{name}}":',
  'Plugin selection cancelled.': 'Plugin selection cancelled.',
  'Select a plugin from "{{name}}"': 'Select a plugin from "{{name}}"',
  'Use 闂佹剚鍋呴崹鐔煎疮?or j/k to navigate, Enter to select, Escape to cancel':
    'Use 闂佹剚鍋呴崹鐔煎疮?or j/k to navigate, Enter to select, Escape to cancel',
  '{{count}} more above': '{{count}} more above',
  '{{count}} more below': '{{count}} more below',
  'manage IDE integration': 'manage IDE integration',
  'check status of IDE integration': 'check status of IDE integration',
  'install required IDE companion for {{ideName}}':
    'install required IDE companion for {{ideName}}',
  'enable IDE integration': 'enable IDE integration',
  'disable IDE integration': 'disable IDE integration',
  'IDE integration is not supported in your current environment. To use this feature, run TRAM in one of these supported IDEs: VS Code or VS Code forks.':
    'IDE integration is not supported in your current environment. To use this feature, run TRAM in one of these supported IDEs: VS Code or VS Code forks.',
  'Set up GitHub Actions': 'Set up GitHub Actions',
  'Configure terminal keybindings for multiline input (VS Code, Cursor, Windsurf, Trae)':
    'Configure terminal keybindings for multiline input (VS Code, Cursor, Windsurf, Trae)',
  'Please restart your terminal for the changes to take effect.':
    'Please restart your terminal for the changes to take effect.',
  'Failed to configure terminal: {{error}}':
    'Failed to configure terminal: {{error}}',
  'Could not determine {{terminalName}} config path on Windows: APPDATA environment variable is not set.':
    'Could not determine {{terminalName}} config path on Windows: APPDATA environment variable is not set.',
  '{{terminalName}} keybindings.json exists but is not a valid JSON array. Please fix the file manually or delete it to allow automatic configuration.':
    '{{terminalName}} keybindings.json exists but is not a valid JSON array. Please fix the file manually or delete it to allow automatic configuration.',
  'File: {{file}}': 'File: {{file}}',
  'Failed to parse {{terminalName}} keybindings.json. The file contains invalid JSON. Please fix the file manually or delete it to allow automatic configuration.':
    'Failed to parse {{terminalName}} keybindings.json. The file contains invalid JSON. Please fix the file manually or delete it to allow automatic configuration.',
  'Error: {{error}}': 'Error: {{error}}',
  'Shift+Enter binding already exists': 'Shift+Enter binding already exists',
  'Ctrl+Enter binding already exists': 'Ctrl+Enter binding already exists',
  'Existing keybindings detected. Will not modify to avoid conflicts.':
    'Existing keybindings detected. Will not modify to avoid conflicts.',
  'Please check and modify manually if needed: {{file}}':
    'Please check and modify manually if needed: {{file}}',
  'Added Shift+Enter and Ctrl+Enter keybindings to {{terminalName}}.':
    'Added Shift+Enter and Ctrl+Enter keybindings to {{terminalName}}.',
  'Modified: {{file}}': 'Modified: {{file}}',
  '{{terminalName}} keybindings already configured.':
    '{{terminalName}} keybindings already configured.',
  'Failed to configure {{terminalName}}.':
    'Failed to configure {{terminalName}}.',
  'Your terminal is already configured for an optimal experience with multiline input (Shift+Enter and Ctrl+Enter).':
    'Your terminal is already configured for an optimal experience with multiline input (Shift+Enter and Ctrl+Enter).',
  // ============================================================================
  // Commands - Hooks
  // ============================================================================
  'Manage Qwen Code hooks': 'Qwen Code のフックを管理する',
  'List all configured hooks': '設定済みのフックをすべて表示する',
  'Enable a disabled hook': '無効なフックを有効にする',
  'Disable an active hook': '有効なフックを無効にする',
  // Hooks - Dialog
  Hooks: 'フック',
  'Loading hooks...': 'フックを読み込んでいます...',
  'Error loading hooks:': 'フックの読み込みエラー：',
  'Press Escape to close': 'Escape キーで閉じる',
  'Press Escape, Ctrl+C, or Ctrl+D to cancel':
    'Escape、Ctrl+C、Ctrl+D でキャンセル',
  'Press Space, Enter, or Escape to dismiss': 'Space、Enter、Escape で閉じる',
  'No hook selected': 'フックが選択されていません',
  // Hooks - List Step
  'No hook events found.': 'フックイベントが見つかりません。',
  '{{count}} hook configured': '{{count}} 件のフックが設定されています',
  '{{count}} hooks configured': '{{count}} 件のフックが設定されています',
  'This menu is read-only. To add or modify hooks, edit settings.json directly or ask Qwen Code.':
    'このメニューは読み取り専用です。フックを追加または変更するには、settings.json を直接編集するか、Qwen Code に尋ねてください。',
  'Enter to select · Esc to cancel': 'Enter で選択 · Esc でキャンセル',
  // Hooks - Detail Step
  'Exit codes:': '終了コード：',
  'Configured hooks:': '設定済みのフック：',
  'No hooks configured for this event.':
    'このイベントにはフックが設定されていません。',
  'To add hooks, edit settings.json directly or ask Qwen.':
    'フックを追加するには、settings.json を直接編集するか、Qwen に尋ねてください。',
  'Enter to select · Esc to go back': 'Enter で選択 · Esc で戻る',
  // Hooks - Config Detail Step
  'Hook details': 'フック詳細',
  'Event:': 'イベント：',
  'Extension:': '拡張機能：',
  'Desc:': '説明：',
  'No hook config selected': 'フック設定が選択されていません',
  'To modify or remove this hook, edit settings.json directly or ask Qwen to help.':
    'このフックを変更または削除するには、settings.json を直接編集するか、Qwen に尋ねてください。',
  // Hooks - Disabled Step
  'Hook Configuration - Disabled': 'フック設定 - 無効',
  'All hooks are currently disabled. You have {{count}} that are not running.':
    'すべてのフックは現在無効です。{{count}} が実行されていません。',
  '{{count}} configured hook': '{{count}} 個の設定されたフック',
  '{{count}} configured hooks': '{{count}} 個の設定されたフック',
  'When hooks are disabled:': 'フックが無効な場合：',
  'No hook commands will execute': 'フックコマンドは実行されません',
  'StatusLine will not be displayed': 'StatusLine は表示されません',
  'Tool operations will proceed without hook validation':
    'ツール操作はフック検証なしで続行されます',
  'To re-enable hooks, remove "disableAllHooks" from settings.json or ask Qwen Code.':
    'フックを再有効化するには、settings.json から "disableAllHooks" を削除するか、Qwen Code に尋ねてください。',
  // Hooks - Source
  Project: 'プロジェクト',
  User: 'ユーザー',
  System: 'システム',
  Extension: '拡張機能',
  'Local Settings': 'ローカル設定',
  'User Settings': 'ユーザー設定',
  'System Settings': 'システム設定',
  Extensions: '拡張機能',
  // Hooks - Status
  '✓ Enabled': '✓ 有効',
  '✗ Disabled': '✗ 無効',
  // Hooks - Event Descriptions (short)
  'Before tool execution': 'ツール実行前',
  'After tool execution': 'ツール実行後',
  'After tool execution fails': 'ツール実行失敗時',
  'When notifications are sent': '通知送信時',
  'When the user submits a prompt': 'ユーザーがプロンプトを送信した時',
  'When a new session is started': '新しいセッションが開始された時',
  'Right before Qwen Code concludes its response':
    'Qwen Code が応答を終了する直前',
  'When a subagent (Agent tool call) is started':
    'サブエージェント（Agent ツール呼び出し）が開始された時',
  'Right before a subagent concludes its response':
    'サブエージェントが応答を終了する直前',
  'Before conversation compaction': '会話圧縮前',
  'When a session is ending': 'セッション終了時',
  'When a permission dialog is displayed': '権限ダイアログ表示時',
  // Hooks - Event Descriptions (detailed)
  'Input to command is JSON of tool call arguments.':
    'コマンドへの入力はツール呼び出し引数の JSON です。',
  'Input to command is JSON with fields "inputs" (tool call arguments) and "response" (tool call response).':
    'コマンドへの入力は "inputs"（ツール呼び出し引数）と "response"（ツール呼び出し応答）フィールドを持つ JSON です。',
  'Input to command is JSON with tool_name, tool_input, tool_use_id, error, error_type, is_interrupt, and is_timeout.':
    'コマンドへの入力は tool_name、tool_input、tool_use_id、error、error_type、is_interrupt、is_timeout を持つ JSON です。',
  'Input to command is JSON with notification message and type.':
    'コマンドへの入力は通知メッセージとタイプを持つ JSON です。',
  'Input to command is JSON with original user prompt text.':
    'コマンドへの入力は元のユーザープロンプトテキストを持つ JSON です。',
  'Input to command is JSON with session start source.':
    'コマンドへの入力はセッション開始ソースを持つ JSON です。',
  'Input to command is JSON with session end reason.':
    'コマンドへの入力はセッション終了理由を持つ JSON です。',
  'Input to command is JSON with agent_id and agent_type.':
    'コマンドへの入力は agent_id と agent_type を持つ JSON です。',
  'Input to command is JSON with agent_id, agent_type, and agent_transcript_path.':
    'コマンドへの入力は agent_id、agent_type、agent_transcript_path を持つ JSON です。',
  'Input to command is JSON with compaction details.':
    'コマンドへの入力は圧縮詳細を持つ JSON です。',
  'Input to command is JSON with tool_name, tool_input, and tool_use_id. Output JSON with hookSpecificOutput containing decision to allow or deny.':
    'コマンドへの入力は tool_name、tool_input、tool_use_id を持つ JSON です。許可または拒否の決定を含む hookSpecificOutput を持つ JSON を出力します。',
  // Hooks - Exit Code Descriptions
  'stdout/stderr not shown': 'stdout/stderr は表示されません',
  'show stderr to model and continue conversation':
    'stderr をモデルに表示し、会話を続ける',
  'show stderr to user only': 'stderr をユーザーのみに表示',
  'stdout shown in transcript mode (ctrl+o)':
    'stdout はトランスクリプトモードで表示 (ctrl+o)',
  'show stderr to model immediately': 'stderr をモデルに即座に表示',
  'show stderr to user only but continue with tool call':
    'stderr をユーザーのみに表示し、ツール呼び出しを続ける',
  'block processing, erase original prompt, and show stderr to user only':
    '処理をブロックし、元のプロンプトを消去し、stderr をユーザーのみに表示',
  'stdout shown to Qwen': 'stdout をモデルに表示',
  'show stderr to user only (blocking errors ignored)':
    'stderr をユーザーのみに表示（ブロッキングエラーは無視）',
  'command completes successfully': 'コマンドが正常に完了',
  'stdout shown to subagent': 'stdout をサブエージェントに表示',
  'show stderr to subagent and continue having it run':
    'stderr をサブエージェントに表示し、実行を続ける',
  'stdout appended as custom compact instructions':
    'stdout をカスタム圧縮指示として追加',
  'block compaction': '圧縮をブロック',
  'show stderr to user only but continue with compaction':
    'stderr をユーザーのみに表示し、圧縮を続ける',
  'use hook decision if provided': '提供されている場合はフックの決定を使用',
  // Hooks - Messages
  'Config not loaded.': '設定が読み込まれていません。',
  'Hooks are not enabled. Enable hooks in settings to use this feature.':
    'フックが有効になっていません。この機能を使用するには設定でフックを有効にしてください。',
  'No hooks configured. Add hooks in your settings.json file.':
    'フックが設定されていません。settings.json ファイルにフックを追加してください。',
  'Configured Hooks ({{count}} total)': '設定済みのフック（合計 {{count}} 件）',

  // ============================================================================
  // Commands - Session Export
  // ============================================================================
  'Export current session message history to a file':
    'Export current session message history to a file',
  'Export session to HTML format': 'Export session to HTML format',
  'Export session to JSON format': 'Export session to JSON format',
  'Export session to JSONL format (one message per line)':
    'Export session to JSONL format (one message per line)',
  'Export session to markdown format': 'Export session to markdown format',

  // ============================================================================
  // Commands - Insights
  // ============================================================================
  'generate personalized programming insights from your chat history':
    'generate personalized programming insights from your chat history',

  // ============================================================================
  // Commands - Session History
  // ============================================================================
  'Resume a previous session': 'Resume a previous session',
  'Restore a tool call. This will reset the conversation and file history to the state it was in when the tool call was suggested':
    'Restore a tool call. This will reset the conversation and file history to the state it was in when the tool call was suggested',
  'Could not detect terminal type. Supported terminals: VS Code, Cursor, Windsurf, and Trae.':
    'Could not detect terminal type. Supported terminals: VS Code, Cursor, Windsurf, and Trae.',
  'Terminal "{{terminal}}" is not supported yet.':
    'ターミナル "{{terminal}}" はまだサポートされていません',
  // Commands - Language
  'Invalid language. Available: {{options}}':
    '無効な言語です。使用可能: {{options}}',
  'Language subcommands do not accept additional arguments.':
    '言語サブコマンドは追加の引数を受け付けません',
  'Current UI language: {{lang}}': '現在のUI言語: {{lang}}',
  'Current LLM output language: {{lang}}': '現在のLLM出力言語: {{lang}}',
  'LLM output language not set': 'LLM出力言語が設定されていません',
  'Set UI language': 'UI言語を設定',
  'Set LLM output language': 'LLM出力言語を設定',
  'Usage: /language ui [{{options}}]': '使い方: /language ui [{{options}}]',
  'Usage: /language output <language>': '使い方: /language output <言語>',
  'Example: /language output 中文': '例: /language output 中文',
  'Example: /language output English': '例: /language output English',
  'Example: /language output 日本語': '例: /language output 日本語',
  'Example: /language output Português': '例: /language output Português',
  'UI language changed to {{lang}}': 'UI言語を {{lang}} に変更しました',
  'LLM output language rule file generated at {{path}}':
    'LLM出力言語ルールファイルを {{path}} に生成しました',
  'Please restart the application for the changes to take effect.':
    '変更を有効にするにはアプリケーションを再起動してください',
  'Failed to generate LLM output language rule file: {{error}}':
    'LLM出力言語ルールファイルの生成に失敗: {{error}}',
  'Invalid command. Available subcommands:':
    '無効なコマンドです。使用可能なサブコマンド:',
  'Available subcommands:': '使用可能なサブコマンド:',
  'To request additional UI language packs, please open an issue on GitHub.':
    '追加のUI言語パックをリクエストするには、GitHub で Issue を作成してください',
  'Available options:': '使用可能なオプション:',
  'Set UI language to {{name}}': 'UI言語を {{name}} に設定',
  // Approval Mode
  'Approval Mode': '承認モード',
  'Current approval mode: {{mode}}': '現在の承認モード: {{mode}}',
  'Available approval modes:': '利用可能な承認モード:',
  'Approval mode changed to: {{mode}}': '承認モードを変更しました: {{mode}}',
  'Approval mode changed to: {{mode}} (saved to {{scope}} settings{{location}})':
    '承認モードを {{mode}} に変更しました({{scope}} 設定{{location}}に保存)',
  'Usage: /approval-mode <mode> [--session|--user|--project]':
    '使い方: /approval-mode <モード> [--session|--user|--project]',
  'Scope subcommands do not accept additional arguments.':
    'スコープサブコマンドは追加の引数を受け付けません',
  'Plan mode - Analyze only, do not modify files or execute commands':
    'プランモード - 分析のみ、ファイルの変更やコマンドの実行はしません',
  'Default mode - Require approval for file edits or shell commands':
    'デフォルトモード - ファイル編集やシェルコマンドには承認が必要',
  'Auto-edit mode - Automatically approve file edits':
    '自動編集モード - ファイル編集を自動承認',
  'YOLO mode - Automatically approve all tools':
    'YOLOモード - すべてのツールを自動承認',
  '{{mode}} mode': '{{mode}}モード',
  'Settings service is not available; unable to persist the approval mode.':
    '設定サービスが利用できません。承認モードを保存できません',
  'Failed to save approval mode: {{error}}':
    '承認モードの保存に失敗: {{error}}',
  'Failed to change approval mode: {{error}}':
    '承認モードの変更に失敗: {{error}}',
  'Apply to current session only (temporary)':
    '現在のセッションのみに適用(一時的)',
  'Persist for this project/workspace': 'このプロジェクト/ワークスペースに保存',
  'Persist for this user on this machine': 'このマシンのこのユーザーに保存',
  'Analyze only, do not modify files or execute commands':
    '分析のみ、ファイルの変更やコマンドの実行はしません',
  'Require approval for file edits or shell commands':
    'ファイル編集やシェルコマンドには承認が必要',
  'Automatically approve file edits': 'ファイル編集を自動承認',
  'Automatically approve all tools': 'すべてのツールを自動承認',
  'Workspace approval mode exists and takes priority. User-level change will have no effect.':
    'ワークスペースの承認モードが存在し、優先されます。ユーザーレベルの変更は効果がありません',
  '(Use Enter to select, Tab to change focus)':
    '(Enter で選択、Tab でフォーカス変更)',
  'Apply To': '適用先',
  'Workspace Settings': 'ワークスペース設定',
  // Memory
  'Commands for interacting with memory.': 'メモリ操作のコマンド',
  'Show the current memory contents.': '現在のメモリ内容を表示',
  'Show project-level memory contents.': 'プロジェクトレベルのメモリ内容を表示',
  'Show global memory contents.': 'グローバルメモリ内容を表示',
  'Add content to project-level memory.':
    'プロジェクトレベルのメモリにコンテンツを追加',
  'Add content to global memory.': 'グローバルメモリにコンテンツを追加',
  'Refresh the memory from the source.': 'ソースからメモリを更新',
  'Usage: /memory add --project <text to remember>':
    '使い方: /memory add --project <記憶するテキスト>',
  'Usage: /memory add --global <text to remember>':
    '使い方: /memory add --global <記憶するテキスト>',
  'Attempting to save to project memory: "{{text}}"':
    'プロジェクトメモリへの保存を試行中: "{{text}}"',
  'Attempting to save to global memory: "{{text}}"':
    'グローバルメモリへの保存を試行中: "{{text}}"',
  'Current memory content from {{count}} file(s):':
    '{{count}} 個のファイルからの現在のメモリ内容:',
  'Memory is currently empty.': 'メモリは現在空です',
  'Project memory file not found or is currently empty.':
    'プロジェクトメモリファイルが見つからないか、現在空です',
  'Global memory file not found or is currently empty.':
    'グローバルメモリファイルが見つからないか、現在空です',
  'Global memory is currently empty.': 'グローバルメモリは現在空です',
  'Global memory content:\n\n---\n{{content}}\n---':
    'グローバルメモリ内容:\n\n---\n{{content}}\n---',
  'Project memory content from {{path}}:\n\n---\n{{content}}\n---':
    '{{path}} からのプロジェクトメモリ内容:\n\n---\n{{content}}\n---',
  'Project memory is currently empty.': 'プロジェクトメモリは現在空です',
  'Refreshing memory from source files...':
    'ソースファイルからメモリを更新中...',
  'Add content to the memory. Use --global for global memory or --project for project memory.':
    'メモリにコンテンツを追加。グローバルメモリには --global、プロジェクトメモリには --project を使用',
  'Usage: /memory add [--global|--project] <text to remember>':
    '使い方: /memory add [--global|--project] <記憶するテキスト>',
  'Attempting to save to memory {{scope}}: "{{fact}}"':
    'メモリ {{scope}} への保存を試行中: "{{fact}}"',
  // MCP
  'Authenticate with an OAuth-enabled MCP server':
    'OAuth対応のMCPサーバーで認証',
  'List configured MCP servers and tools':
    '設定済みのMCPサーバーとツールを一覧表示',
  'No MCP servers configured.': 'MCPサーバーが設定されていません',
  'Restarts MCP servers.': 'MCPサーバーを再起動します',
  'Could not retrieve tool registry.': 'ツールレジストリを取得できませんでした',
  'No MCP servers configured with OAuth authentication.':
    'OAuth認証が設定されたMCPサーバーはありません',
  'MCP servers with OAuth authentication:': 'OAuth認証のMCPサーバー:',
  'Use /mcp auth <server-name> to authenticate.':
    '認証するには /mcp auth <サーバー名> を使用',
  "MCP server '{{name}}' not found.": "MCPサーバー '{{name}}' が見つかりません",
  "Successfully authenticated and refreshed tools for '{{name}}'.":
    "'{{name}}' の認証とツール更新に成功しました",
  "Failed to authenticate with MCP server '{{name}}': {{error}}":
    "MCPサーバー '{{name}}' での認証に失敗: {{error}}",
  "Re-discovering tools from '{{name}}'...":
    "'{{name}}' からツールを再検出中...",
  "Discovered {{count}} tool(s) from '{{name}}'.":
    "'{{name}}' から {{count}} 個のツールを検出しました。",
  'Authentication complete. Returning to server details...':
    '認証完了。サーバー詳細に戻ります...',
  'Authentication successful.': '認証成功。',
  'If the browser does not open, copy and paste this URL into your browser:':
    'ブラウザが開かない場合は、このURLをコピーしてブラウザに貼り付けてください：',
  'Make sure to copy the COMPLETE URL - it may wrap across multiple lines.':
    '⚠️  URL全体をコピーしてください——複数行にまたがる場合があります。',
  'Configured MCP servers:': '設定済みMCPサーバー:',
  Ready: '準備完了',
  Disconnected: '切断',
  '{{count}} tool': '{{count}} ツール',
  '{{count}} tools': '{{count}} ツール',
  'Restarting MCP servers...': 'MCPサーバーを再起動中...',
  // Chat
  'Manage conversation history.': '会話履歴を管理します',
  'List saved conversation checkpoints':
    '保存された会話チェックポイントを一覧表示',
  'No saved conversation checkpoints found.':
    '保存された会話チェックポイントが見つかりません',
  'List of saved conversations:': '保存された会話の一覧:',
  'Note: Newest last, oldest first':
    '注: 最新のものが下にあり、過去のものが上にあります',
  'Save the current conversation as a checkpoint. Usage: /chat save <tag>':
    '現在の会話をチェックポイントとして保存。使い方: /chat save <タグ>',
  'Missing tag. Usage: /chat save <tag>':
    'タグが不足しています。使い方: /chat save <タグ>',
  'Delete a conversation checkpoint. Usage: /chat delete <tag>':
    '会話チェックポイントを削除。使い方: /chat delete <タグ>',
  'Missing tag. Usage: /chat delete <tag>':
    'タグが不足しています。使い方: /chat delete <タグ>',
  "Conversation checkpoint '{{tag}}' has been deleted.":
    "会話チェックポイント '{{tag}}' を削除しました",
  "Error: No checkpoint found with tag '{{tag}}'.":
    "エラー: タグ '{{tag}}' のチェックポイントが見つかりません",
  'Resume a conversation from a checkpoint. Usage: /chat resume <tag>':
    'チェックポイントから会話を再開。使い方: /chat resume <タグ>',
  'Missing tag. Usage: /chat resume <tag>':
    'タグが不足しています。使い方: /chat resume <タグ>',
  'No saved checkpoint found with tag: {{tag}}.':
    'タグ {{tag}} のチェックポイントが見つかりません',
  'A checkpoint with the tag {{tag}} already exists. Do you want to overwrite it?':
    'タグ {{tag}} のチェックポイントは既に存在します。上書きしますか?',
  'No chat client available to save conversation.':
    '会話を保存するためのチャットクライアントがありません',
  'Conversation checkpoint saved with tag: {{tag}}.':
    'タグ {{tag}} で会話チェックポイントを保存しました',
  'No conversation found to save.': '保存する会話が見つかりません',
  'No chat client available to share conversation.':
    '会話を共有するためのチャットクライアントがありません',
  'Invalid file format. Only .md and .json are supported.':
    '無効なファイル形式です。.md と .json のみサポートされています',
  'Error sharing conversation: {{error}}': '会話の共有中にエラー: {{error}}',
  'Conversation shared to {{filePath}}': '会話を {{filePath}} に共有しました',
  'No conversation found to share.': '共有する会話が見つかりません',
  'Share the current conversation to a markdown or json file. Usage: /chat share <file>':
    '現在の会話をmarkdownまたはjsonファイルに共有。使い方: /chat share <ファイル>',
  // Summary
  'Generate a project summary and save it to .qwen/PROJECT_SUMMARY.md':
    'プロジェクトサマリーを生成し、.qwen/PROJECT_SUMMARY.md に保存',
  'No chat client available to generate summary.':
    'サマリーを生成するためのチャットクライアントがありません',
  'Already generating summary, wait for previous request to complete':
    'サマリー生成中です。前のリクエストの完了をお待ちください',
  'No conversation found to summarize.': '要約する会話が見つかりません',
  'Failed to generate project context summary: {{error}}':
    'プロジェクトコンテキストサマリーの生成に失敗: {{error}}',
  'Saved project summary to {{filePathForDisplay}}.':
    'プロジェクトサマリーを {{filePathForDisplay}} に保存しました',
  'Saving project summary...': 'プロジェクトサマリーを保存中...',
  'Generating project summary...': 'プロジェクトサマリーを生成中...',
  'Failed to generate summary - no text content received from LLM response':
    'サマリーの生成に失敗 - LLMレスポンスからテキストコンテンツを受信できませんでした',
  // Model
  'Switch the model for this session (--fast for suggestion model)':
    'このセッションのモデルを切り替え（--fast で提案モデルを設定）',
  'Set a lighter model for prompt suggestions and speculative execution':
    'プロンプト提案と投機的実行用の軽量モデルを設定',
  'Content generator configuration not available.':
    'コンテンツジェネレーター設定が利用できません',
  'Authentication type not available.': '認証タイプが利用できません',
  'No models available for the current authentication type ({{authType}}).':
    '現在の認証タイプ({{authType}})で利用可能なモデルはありません',
  // Clear
  'Starting a new session, resetting chat, and clearing terminal.':
    '新しいセッションを開始し、チャットをリセットし、ターミナルをクリアしています',
  'Starting a new session and clearing.':
    '新しいセッションを開始してクリアしています',
  // Compress
  'Already compressing, wait for previous request to complete':
    '圧縮中です。前のリクエストの完了をお待ちください',
  'Failed to compress chat history.': 'チャット履歴の圧縮に失敗しました',
  'Failed to compress chat history: {{error}}':
    'チャット履歴の圧縮に失敗: {{error}}',
  'Compressing chat history': 'チャット履歴を圧縮中',
  'Chat history compressed from {{originalTokens}} to {{newTokens}} tokens.':
    'チャット履歴を {{originalTokens}} トークンから {{newTokens}} トークンに圧縮しました',
  'Compression was not beneficial for this history size.':
    'この履歴サイズには圧縮の効果がありませんでした',
  'Chat history compression did not reduce size. This may indicate issues with the compression prompt.':
    'チャット履歴の圧縮でサイズが減少しませんでした。圧縮プロンプトに問題がある可能性があります',
  'Could not compress chat history due to a token counting error.':
    'トークンカウントエラーのため、チャット履歴を圧縮できませんでした',
  'Chat history is already compressed.': 'チャット履歴は既に圧縮されています',
  // Directory
  'Configuration is not available.': '設定が利用できません',
  'Please provide at least one path to add.':
    '追加するパスを少なくとも1つ指定してください',
  'The /directory add command is not supported in restrictive sandbox profiles. Please use --include-directories when starting the session instead.':
    '制限的なサンドボックスプロファイルでは /directory add コマンドはサポートされていません。代わりにセッション開始時に --include-directories を使用してください',
  "Error adding '{{path}}': {{error}}":
    "'{{path}}' の追加中にエラー: {{error}}",
  'Successfully added QWEN.md files from the following directories if there are:\n- {{directories}}':
    '以下のディレクトリから QWEN.md ファイルを追加しました(存在する場合):\n- {{directories}}',
  'Error refreshing memory: {{error}}': 'メモリの更新中にエラー: {{error}}',
  'Successfully added directories:\n- {{directories}}':
    'ディレクトリを正常に追加しました:\n- {{directories}}',
  'Current workspace directories:\n{{directories}}':
    '現在のワークスペースディレクトリ:\n{{directories}}',
  // Docs
  'Please open the following URL in your browser to view the documentation:\n{{url}}':
    'ドキュメントを表示するには、ブラウザで以下のURLを開いてください:\n{{url}}',
  'Opening documentation in your browser: {{url}}':
    '  ブラウザでドキュメントを開きました: {{url}}',
  // Dialogs - Tool Confirmation
  'Do you want to proceed?': '続行しますか?',
  'Yes, allow once': 'はい(今回のみ許可)',
  'Allow always': '常に許可する',
  Yes: 'はい',
  No: 'いいえ',
  'No (esc)': 'いいえ (Esc)',
  'Yes, allow always for this session': 'はい、このセッションで常に許可',

  // ============================================================================
  // Commands - Language
  // ============================================================================
  'Invalid language. Available: {{options}}':
    'Invalid language. Available: {{options}}',
  'Language subcommands do not accept additional arguments.':
    'Language subcommands do not accept additional arguments.',
  'Current UI language: {{lang}}': 'Current UI language: {{lang}}',
  'Current LLM output language: {{lang}}':
    'Current LLM output language: {{lang}}',
  'LLM output language not set': 'LLM output language not set',
  'Set UI language': 'Set UI language',
  'Set LLM output language': 'Set LLM output language',
  'Usage: /language ui [{{options}}]': 'Usage: /language ui [{{options}}]',
  'Usage: /language output <language>': 'Usage: /language output <language>',
  'Example: /language output Chinese': 'Example: /language output Chinese',
  'Example: /language output English': 'Example: /language output English',
  'Example: /language output Russian': 'Example: /language output Russian',
  'Example: /language output Portuguese': 'Example: /language output Portuguese',
  'UI language changed to {{lang}}': 'UI language changed to {{lang}}',
  'LLM output language set to {{lang}}': 'LLM output language set to {{lang}}',
  'LLM output language rule file generated at {{path}}':
    'LLM output language rule file generated at {{path}}',
  'Please restart the application for the changes to take effect.':
    'Please restart the application for the changes to take effect.',
  'Failed to generate LLM output language rule file: {{error}}':
    'Failed to generate LLM output language rule file: {{error}}',
  'Invalid command. Available subcommands:':
    'Invalid command. Available subcommands:',
  'Available subcommands:': 'Available subcommands:',
  'To request additional UI language packs, please open an issue on GitHub.':
    'To request additional UI language packs, please open an issue on GitHub.',
  'Available options:': 'Available options:',
  'Set UI language to {{name}}': 'Set UI language to {{name}}',

  // ============================================================================
  // Commands - Approval Mode
  // ============================================================================
  'Tool Approval Mode': 'Tool Approval Mode',
  'Current approval mode: {{mode}}': 'Current approval mode: {{mode}}',
  'Available approval modes:': 'Available approval modes:',
  'Approval mode changed to: {{mode}}': 'Approval mode changed to: {{mode}}',
  'Approval mode changed to: {{mode}} (saved to {{scope}} settings{{location}})':
    'Approval mode changed to: {{mode}} (saved to {{scope}} settings{{location}})',
  'Usage: /approval-mode <mode> [--session|--user|--project]':
    'Usage: /approval-mode <mode> [--session|--user|--project]',

  'Scope subcommands do not accept additional arguments.':
    'Scope subcommands do not accept additional arguments.',
  'Plan mode - Analyze only, do not modify files or execute commands':
    'Plan mode - Analyze only, do not modify files or execute commands',
  'Default mode - Require approval for file edits or shell commands':
    'Default mode - Require approval for file edits or shell commands',
  'Auto-edit mode - Automatically approve file edits':
    'Auto-edit mode - Automatically approve file edits',
  'YOLO mode - Automatically approve all tools':
    'YOLO mode - Automatically approve all tools',
  '{{mode}} mode': '{{mode}} mode',
  'Settings service is not available; unable to persist the approval mode.':
    'Settings service is not available; unable to persist the approval mode.',
  'Failed to save approval mode: {{error}}':
    'Failed to save approval mode: {{error}}',
  'Failed to change approval mode: {{error}}':
    'Failed to change approval mode: {{error}}',
  'Apply to current session only (temporary)':
    'Apply to current session only (temporary)',
  'Persist for this project/workspace': 'Persist for this project/workspace',
  'Persist for this user on this machine':
    'Persist for this user on this machine',
  'Analyze only, do not modify files or execute commands':
    'Analyze only, do not modify files or execute commands',
  'Require approval for file edits or shell commands':
    'Require approval for file edits or shell commands',
  'Automatically approve file edits': 'Automatically approve file edits',
  'Automatically approve all tools': 'Automatically approve all tools',
  'Workspace approval mode exists and takes priority. User-level change will have no effect.':
    'Workspace approval mode exists and takes priority. User-level change will have no effect.',
  'Apply To': 'Apply To',
  'User Settings': 'User Settings',
  'Workspace Settings': 'Workspace Settings',

  // ============================================================================
  // Commands - Memory
  // ============================================================================
  'Commands for interacting with memory.':
    'Commands for interacting with memory.',
  'Show the current memory contents.': 'Show the current memory contents.',
  'Show project-level memory contents.': 'Show project-level memory contents.',
  'Show global memory contents.': 'Show global memory contents.',
  'Add content to project-level memory.':
    'Add content to project-level memory.',
  'Add content to global memory.': 'Add content to global memory.',
  'Refresh the memory from the source.': 'Refresh the memory from the source.',
  'Usage: /memory add --project <text to remember>':
    'Usage: /memory add --project <text to remember>',
  'Usage: /memory add --global <text to remember>':
    'Usage: /memory add --global <text to remember>',
  'Attempting to save to project memory: "{{text}}"':
    'Attempting to save to project memory: "{{text}}"',
  'Attempting to save to global memory: "{{text}}"':
    'Attempting to save to global memory: "{{text}}"',
  'Current memory content from {{count}} file(s):':
    'Current memory content from {{count}} file(s):',
  'Memory is currently empty.': 'Memory is currently empty.',
  'Project memory file not found or is currently empty.':
    'Project memory file not found or is currently empty.',
  'Global memory file not found or is currently empty.':
    'Global memory file not found or is currently empty.',
  'Global memory is currently empty.': 'Global memory is currently empty.',
  'Global memory content:\n\n---\n{{content}}\n---':
    'Global memory content:\n\n---\n{{content}}\n---',
  'Project memory content from {{path}}:\n\n---\n{{content}}\n---':
    'Project memory content from {{path}}:\n\n---\n{{content}}\n---',
  'Project memory is currently empty.': 'Project memory is currently empty.',
  'Refreshing memory from source files...':
    'Refreshing memory from source files...',
  'Add content to the memory. Use --global for global memory or --project for project memory.':
    'Add content to the memory. Use --global for global memory or --project for project memory.',
  'Usage: /memory add [--global|--project] <text to remember>':
    'Usage: /memory add [--global|--project] <text to remember>',
  'Attempting to save to memory {{scope}}: "{{fact}}"':
    'Attempting to save to memory {{scope}}: "{{fact}}"',

  // ============================================================================
  // Commands - MCP
  // ============================================================================
  'Authenticate with an OAuth-enabled MCP server':
    'Authenticate with an OAuth-enabled MCP server',
  'List configured MCP servers and tools':
    'List configured MCP servers and tools',
  'Restarts MCP servers.': 'Restarts MCP servers.',
  'Open MCP management dialog': 'Open MCP management dialog',
  'Config not loaded.': 'Config not loaded.',
  'Could not retrieve tool registry.': 'Could not retrieve tool registry.',
  'No MCP servers configured with OAuth authentication.':
    'No MCP servers configured with OAuth authentication.',
  'MCP servers with OAuth authentication:':
    'MCP servers with OAuth authentication:',
  'Use /mcp auth <server-name> to authenticate.':
    'Use /mcp auth <server-name> to authenticate.',
  "MCP server '{{name}}' not found.": "MCP server '{{name}}' not found.",
  "Successfully authenticated and refreshed tools for '{{name}}'.":
    "Successfully authenticated and refreshed tools for '{{name}}'.",
  "Failed to authenticate with MCP server '{{name}}': {{error}}":
    "Failed to authenticate with MCP server '{{name}}': {{error}}",
  "Re-discovering tools from '{{name}}'...":
    "Re-discovering tools from '{{name}}'...",
  "Discovered {{count}} tool(s) from '{{name}}'.":
    "Discovered {{count}} tool(s) from '{{name}}'.",
  'Authentication complete. Returning to server details...':
    'Authentication complete. Returning to server details...',
  'Authentication successful.': 'Authentication successful.',
  'If the browser does not open, copy and paste this URL into your browser:':
    'If the browser does not open, copy and paste this URL into your browser:',
  'Make sure to copy the COMPLETE URL - it may wrap across multiple lines.':
    'Make sure to copy the COMPLETE URL - it may wrap across multiple lines.',

  // ============================================================================
  // MCP Management Dialog
  // ============================================================================
  'Manage MCP servers': 'Manage MCP servers',
  'Server Detail': 'Server Detail',
  'Disable Server': 'Disable Server',
  Tools: 'Tools',
  'Tool Detail': 'Tool Detail',
  'MCP Management': 'MCP Management',
  'Loading...': 'Loading...',
  'Unknown step': 'Unknown step',
  'Esc to back': 'Esc to back',
  '闂佹剚鍋呴崹鐔煎疮?to navigate 閻?Enter to select 閻?Esc to close':
    '闂佹剚鍋呴崹鐔煎疮?to navigate 閻?Enter to select 閻?Esc to close',
  '闂佹剚鍋呴崹鐔煎疮?to navigate 閻?Enter to select 閻?Esc to back':
    '闂佹剚鍋呴崹鐔煎疮?to navigate 閻?Enter to select 閻?Esc to back',
  '闂佹剚鍋呴崹鐔煎疮?to navigate 閻?Enter to confirm 閻?Esc to back':
    '闂佹剚鍋呴崹鐔煎疮?to navigate 閻?Enter to confirm 閻?Esc to back',
  'User Settings (global)': 'User Settings (global)',
  'Workspace Settings (project-specific)':
    'Workspace Settings (project-specific)',
  'Disable server:': 'Disable server:',
  'Select where to add the server to the exclude list:':
    'サーバーを除外リストに追加する場所を選択してください:',
  'Press Enter to confirm, Esc to cancel': 'Enter で確認、Esc でキャンセル',
  Disable: '無効化',
  Enable: '有効化',
  Authenticate: '認証',
  'Re-authenticate': '再認証',
  'Clear Authentication': '認証をクリア',
  disabled: '無効',
  'Server:': 'サーバー:',
  Reconnect: '再接続',
  'View tools': 'ツールを表示',
  'Status:': 'ステータス:',
  'Source:': 'ソース:',
  'Command:': 'コマンド:',
  'Working Directory:': '作業ディレクトリ:',
  'Capabilities:': '機能:',
  'No server selected': 'サーバーが選択されていません',
  '(disabled)': '(無効)',
  'Error:': 'エラー:',
  tool: 'ツール',
  tools: 'ツール',
  connected: '接続済み',
  connecting: '接続中',
  disconnected: '切断済み',
  error: 'エラー',

  // MCP Server List
  'User MCPs': 'User MCPs',
  'Project MCPs': 'Project MCPs',
  'Extension MCPs': 'Extension MCPs',
  server: 'server',
  servers: 'servers',
  'Add MCP servers to your settings to get started.':
    'Add MCP servers to your settings to get started.',
  'Run tram --debug to see error logs': 'Run tram --debug to see error logs',

  // MCP OAuth Authentication
  'OAuth Authentication': 'OAuth Authentication',
  'Press Enter to start authentication, Esc to go back':
    'Press Enter to start authentication, Esc to go back',
  'Authenticating... Please complete the login in your browser.':
    'Authenticating... Please complete the login in your browser.',
  'Press Enter or Esc to go back': 'Press Enter or Esc to go back',

  // MCP Tool List
  'No tools available for this server.': 'No tools available for this server.',
  destructive: 'destructive',
  'read-only': 'read-only',
  'open-world': 'open-world',
  idempotent: 'idempotent',
  'Tools for {{name}}': 'Tools for {{name}}',
  'Tools for {{serverName}}': 'Tools for {{serverName}}',
  '{{current}}/{{total}}': '{{current}}/{{total}}',

  // MCP Tool Detail
  required: 'required',
  Type: 'Type',
  Enum: 'Enum',
  Parameters: 'Parameters',
  'No tool selected': 'No tool selected',
  Annotations: 'Annotations',
  Title: 'Title',
  'Read Only': 'Read Only',
  Destructive: 'Destructive',
  Idempotent: 'Idempotent',
  'Open World': 'Open World',
  Server: 'Server',

  // Invalid tool related translations
  '{{count}} invalid tools': '{{count}} invalid tools',
  invalid: 'invalid',
  'invalid: {{reason}}': 'invalid: {{reason}}',
  'missing name': 'missing name',
  'missing description': 'missing description',
  '(unnamed)': '(unnamed)',
  'Warning: This tool cannot be called by the LLM':
    'Warning: This tool cannot be called by the LLM',
  Reason: 'Reason',
  'Tools must have both name and description to be used by the LLM.':
    'Tools must have both name and description to be used by the LLM.',

  // ============================================================================
  // Commands - Chat
  // ============================================================================
  'Manage conversation history.': 'Manage conversation history.',
  'List saved conversation checkpoints': 'List saved conversation checkpoints',
  'No saved conversation checkpoints found.':
    'No saved conversation checkpoints found.',
  'List of saved conversations:': 'List of saved conversations:',
  'Note: Newest last, oldest first': 'Note: Newest last, oldest first',
  'Save the current conversation as a checkpoint. Usage: /chat save <tag>':
    'Save the current conversation as a checkpoint. Usage: /chat save <tag>',
  'Missing tag. Usage: /chat save <tag>':
    'Missing tag. Usage: /chat save <tag>',
  'Delete a conversation checkpoint. Usage: /chat delete <tag>':
    'Delete a conversation checkpoint. Usage: /chat delete <tag>',
  'Missing tag. Usage: /chat delete <tag>':
    'Missing tag. Usage: /chat delete <tag>',
  "Conversation checkpoint '{{tag}}' has been deleted.":
    "Conversation checkpoint '{{tag}}' has been deleted.",
  "Error: No checkpoint found with tag '{{tag}}'.":
    "Error: No checkpoint found with tag '{{tag}}'.",
  'Resume a conversation from a checkpoint. Usage: /chat resume <tag>':
    'Resume a conversation from a checkpoint. Usage: /chat resume <tag>',
  'Missing tag. Usage: /chat resume <tag>':
    'Missing tag. Usage: /chat resume <tag>',
  'No saved checkpoint found with tag: {{tag}}.':
    'No saved checkpoint found with tag: {{tag}}.',
  'A checkpoint with the tag {{tag}} already exists. Do you want to overwrite it?':
    'A checkpoint with the tag {{tag}} already exists. Do you want to overwrite it?',
  'No chat client available to save conversation.':
    'No chat client available to save conversation.',
  'Conversation checkpoint saved with tag: {{tag}}.':
    'Conversation checkpoint saved with tag: {{tag}}.',
  'No conversation found to save.': 'No conversation found to save.',
  'No chat client available to share conversation.':
    'No chat client available to share conversation.',
  'Invalid file format. Only .md and .json are supported.':
    'Invalid file format. Only .md and .json are supported.',
  'Error sharing conversation: {{error}}':
    'Error sharing conversation: {{error}}',
  'Conversation shared to {{filePath}}': 'Conversation shared to {{filePath}}',
  'No conversation found to share.': 'No conversation found to share.',
  'Share the current conversation to a markdown or json file. Usage: /chat share <file>':
    'Share the current conversation to a markdown or json file. Usage: /chat share <file>',

  // ============================================================================
  // Commands - Summary
  // ============================================================================
  'Generate a project summary and save it to .tram/PROJECT_SUMMARY.md':
    'Generate a project summary and save it to .tram/PROJECT_SUMMARY.md',
  'No chat client available to generate summary.':
    'No chat client available to generate summary.',
  'Already generating summary, wait for previous request to complete':
    'Already generating summary, wait for previous request to complete',
  'No conversation found to summarize.': 'No conversation found to summarize.',
  'Failed to generate project context summary: {{error}}':
    'Failed to generate project context summary: {{error}}',
  'Saved project summary to {{filePathForDisplay}}.':
    'Saved project summary to {{filePathForDisplay}}.',
  'Saving project summary...': 'Saving project summary...',
  'Generating project summary...': 'Generating project summary...',
  'Failed to generate summary - no text content received from LLM response':
    'Failed to generate summary - no text content received from LLM response',

  // ============================================================================
  // Commands - Model
  // ============================================================================
  'Switch the model for this session': 'Switch the model for this session',
  'Content generator configuration not available.':
    'Content generator configuration not available.',
  'Authentication type not available.': 'Authentication type not available.',
  'No models available for the current authentication type ({{authType}}).':
    'No models available for the current authentication type ({{authType}}).',

  // ============================================================================
  // Commands - Clear
  // ============================================================================
  'Starting a new session, resetting chat, and clearing terminal.':
    'Starting a new session, resetting chat, and clearing terminal.',
  'Starting a new session and clearing.':
    'Starting a new session and clearing.',

  // ============================================================================
  // Commands - Compress
  // ============================================================================
  'Already compressing, wait for previous request to complete':
    'Already compressing, wait for previous request to complete',
  'Failed to compress chat history.': 'Failed to compress chat history.',
  'Failed to compress chat history: {{error}}':
    'Failed to compress chat history: {{error}}',
  'Compressing chat history': 'Compressing chat history',
  'Chat history compressed from {{originalTokens}} to {{newTokens}} tokens.':
    'Chat history compressed from {{originalTokens}} to {{newTokens}} tokens.',
  'Compression was not beneficial for this history size.':
    'Compression was not beneficial for this history size.',
  'Chat history compression did not reduce size. This may indicate issues with the compression prompt.':
    'Chat history compression did not reduce size. This may indicate issues with the compression prompt.',
  'Could not compress chat history due to a token counting error.':
    'Could not compress chat history due to a token counting error.',
  'Chat history is already compressed.': 'Chat history is already compressed.',

  // ============================================================================
  // Commands - Directory
  // ============================================================================
  'Configuration is not available.': 'Configuration is not available.',
  'Please provide at least one path to add.':
    'Please provide at least one path to add.',
  'The /directory add command is not supported in restrictive sandbox profiles. Please use --include-directories when starting the session instead.':
    'The /directory add command is not supported in restrictive sandbox profiles. Please use --include-directories when starting the session instead.',
  "Error adding '{{path}}': {{error}}": "Error adding '{{path}}': {{error}}",
  'Successfully added TRAM.md files from the following directories if there are:\n- {{directories}}':
    'Successfully added TRAM.md files from the following directories if there are:\n- {{directories}}',
  'Error refreshing memory: {{error}}': 'Error refreshing memory: {{error}}',
  'Successfully added directories:\n- {{directories}}':
    'Successfully added directories:\n- {{directories}}',
  'Current workspace directories:\n{{directories}}':
    'Current workspace directories:\n{{directories}}',

  // ============================================================================
  // Commands - Docs
  // ============================================================================
  'Please open the following URL in your browser to view the documentation:\n{{url}}':
    'Please open the following URL in your browser to view the documentation:\n{{url}}',
  'Opening documentation in your browser: {{url}}':
    'Opening documentation in your browser: {{url}}',

  // ============================================================================
  // Dialogs - Tool Confirmation
  // ============================================================================
  'Do you want to proceed?': 'Do you want to proceed?',
  'Yes, allow once': 'Yes, allow once',
  'Allow always': 'Allow always',
  Yes: 'Yes',
  No: 'No',
  'No (esc)': 'No (esc)',
  'Yes, allow always for this session': 'Yes, allow always for this session',
  'Modify in progress:': 'Modify in progress:',
  'Save and close external editor to continue':
    '続行するには外部エディタを保存して閉じてください',
  'Apply this change?': 'この変更を適用しますか?',
  'Yes, allow always': 'はい、常に許可',
  'Modify with external editor': '外部エディタで編集',
  'No, suggest changes (esc)': 'いいえ、変更を提案 (Esc)',
  "Allow execution of: '{{command}}'?": "'{{command}}' の実行を許可しますか?",
  'Yes, allow always ...': 'はい、常に許可...',
  'Always allow in this project': 'このプロジェクトで常に許可',
  'Always allow {{action}} in this project':
    'このプロジェクトで{{action}}を常に許可',
  'Always allow for this user': 'このユーザーに常に許可',
  'Always allow {{action}} for this user': 'このユーザーに{{action}}を常に許可',
  'Yes, restore previous mode ({{mode}})':
    'はい、以前のモードに戻す ({{mode}})',
  'Yes, and auto-accept edits': 'はい、編集を自動承認',
  'Yes, and manually approve edits': 'はい、編集を手動承認',
  'No, keep planning (esc)': 'いいえ、計画を続ける (Esc)',
  'URLs to fetch:': '取得するURL:',
  'MCP Server: {{server}}': 'MCPサーバー: {{server}}',
  'Tool: {{tool}}': 'ツール: {{tool}}',
  'Allow execution of MCP tool "{{tool}}" from server "{{server}}"?':
    'Allow execution of MCP tool "{{tool}}" from server "{{server}}"?',
  'Yes, always allow tool "{{tool}}" from server "{{server}}"':
    'Yes, always allow tool "{{tool}}" from server "{{server}}"',
  'Yes, always allow all tools from server "{{server}}"':
    'Yes, always allow all tools from server "{{server}}"',

  // ============================================================================
  // Dialogs - Shell Confirmation
  // ============================================================================
  'Shell Command Execution': 'Shell Command Execution',
  'A custom command wants to run the following shell commands:':
    'A custom command wants to run the following shell commands:',

  // ============================================================================
  // Dialogs - Pro Quota
  // ============================================================================
  'Pro quota limit reached for {{model}}.':
    'Pro quota limit reached for {{model}}.',
  'Change auth (executes the /auth command)':
    'Change auth (executes the /auth command)',
  'Continue with {{model}}': 'Continue with {{model}}',

  // ============================================================================
  // Dialogs - Welcome Back
  // ============================================================================
  'Current Plan:': 'Current Plan:',
  'Progress: {{done}}/{{total}} tasks completed':
    'Progress: {{done}}/{{total}} tasks completed',
  ', {{inProgress}} in progress': ', {{inProgress}} in progress',
  'Pending Tasks:': 'Pending Tasks:',
  'What would you like to do?': 'What would you like to do?',
  'Choose how to proceed with your session:':
    'Choose how to proceed with your session:',
  'Start new chat session': 'Start new chat session',
  'Continue previous conversation': 'Continue previous conversation',
  '濡絽鍟崯?Welcome back! (Last updated: {{timeAgo}})':
    '濡絽鍟崯?Welcome back! (Last updated: {{timeAgo}})',
  '濡絽鍟粻?Overall Goal:': '濡絽鍟粻?Overall Goal:',

  // ============================================================================
  // Dialogs - Auth
  // ============================================================================
  'Get started': 'Get started',
  'Select Authentication Method': 'Select Authentication Method',
  'OpenAI API key is required to use OpenAI authentication.':
    'OpenAI API key is required to use OpenAI authentication.',
  'You must select an auth method to proceed. Press Ctrl+C again to exit.':
    '続行するには認証方法を選択してください。Ctrl+C をもう一度押すと終了します',
  'Terms of Services and Privacy Notice': '利用規約とプライバシー通知',
  'Qwen OAuth': 'Qwen OAuth',
  'Discontinued — switch to Coding Plan or API Key':
    '終了 — Coding Plan または API Key に切り替えてください',
  'Qwen OAuth free tier was discontinued on 2026-04-15. Run /auth to switch provider.':
    'Qwen OAuth 無料枠は 2026-04-15 に終了しました。/auth を実行してプロバイダーを切り替えてください。',
  'Qwen OAuth free tier was discontinued on 2026-04-15. Please select Coding Plan or API Key instead.':
    'Qwen OAuth 無料枠は 2026-04-15 に終了しました。Coding Plan または API Key を選択してください。',
  'Qwen OAuth free tier was discontinued on 2026-04-15. Please select a model from another provider or run /auth to switch.':
    'Qwen OAuth無料プランは2026-04-15に終了しました。他のプロバイダーのモデルを選択するか、/authを実行して切り替えてください。',
  '\n⚠ Qwen OAuth free tier was discontinued on 2026-04-15. Please select another option.\n':
    '\n⚠ Qwen OAuth 無料枠は 2026-04-15 に終了しました。他のオプションを選択してください。\n',
  'Paid \u00B7 Up to 6,000 requests/5 hrs \u00B7 All Alibaba Cloud Coding Plan Models':
    'Paid \u00B7 Up to 6,000 requests/5 hrs \u00B7 All Alibaba Cloud Coding Plan Models',
  'Alibaba Cloud Coding Plan': 'Alibaba Cloud Coding Plan',
  'Bring your own API key': 'Bring your own API key',
  'API-KEY': 'API-KEY',
  'Use coding plan credentials or your own api-keys/providers.':
    'Use coding plan credentials or your own api-keys/providers.',
  OpenAI: 'OpenAI',
  'Failed to login. Message: {{message}}':
    'Failed to login. Message: {{message}}',
  'Authentication is enforced to be {{enforcedType}}, but you are currently using {{currentType}}.':
    'Authentication is enforced to be {{enforcedType}}, but you are currently using {{currentType}}.',
  'TRAM OAuth authentication timed out. Please try again.':
    'TRAM OAuth authentication timed out. Please try again.',
  'TRAM OAuth authentication cancelled.':
    'TRAM OAuth authentication cancelled.',
  'TRAM OAuth Authentication': 'TRAM OAuth Authentication',
  'Please visit this URL to authorize:': 'Please visit this URL to authorize:',
  'Or scan the QR code below:': 'Or scan the QR code below:',
  'Waiting for authorization': 'Waiting for authorization',
  'Time remaining:': 'Time remaining:',
  '(Press ESC or CTRL+C to cancel)': '(Press ESC or CTRL+C to cancel)',
  'TRAM OAuth Authentication Timeout': 'TRAM OAuth Authentication Timeout',
  'OAuth token expired (over {{seconds}} seconds). Please select authentication method again.':
    'OAuth token expired (over {{seconds}} seconds). Please select authentication method again.',
  'Press any key to return to authentication type selection.':
    'Press any key to return to authentication type selection.',
  'Waiting for TRAM OAuth authentication...':
    'Waiting for TRAM OAuth authentication...',
  'Note: Your existing API key in settings.json will not be cleared when using TRAM OAuth. You can switch back to OpenAI authentication later if needed.':
    'Note: Your existing API key in settings.json will not be cleared when using TRAM OAuth. You can switch back to OpenAI authentication later if needed.',
  'Note: Your existing API key will not be cleared when using TRAM OAuth.':
    'Note: Your existing API key will not be cleared when using TRAM OAuth.',
  'Authentication timed out. Please try again.':
    'Authentication timed out. Please try again.',
  'Waiting for auth... (Press ESC or CTRL+C to cancel)':
    'Waiting for auth... (Press ESC or CTRL+C to cancel)',
  'Missing API key for OpenAI-compatible auth. Set settings.security.auth.apiKey, or set the {{envKeyHint}} environment variable.':
    'Missing API key for OpenAI-compatible auth. Set settings.security.auth.apiKey, or set the {{envKeyHint}} environment variable.',
  '{{envKeyHint}} environment variable not found.':
    '{{envKeyHint}} environment variable not found.',
  '{{envKeyHint}} environment variable not found. Please set it in your .env file or environment variables.':
    '{{envKeyHint}} environment variable not found. Please set it in your .env file or environment variables.',
  '{{envKeyHint}} environment variable not found (or set settings.security.auth.apiKey). Please set it in your .env file or environment variables.':
    '{{envKeyHint}} environment variable not found (or set settings.security.auth.apiKey). Please set it in your .env file or environment variables.',
  'Missing API key for OpenAI-compatible auth. Set the {{envKeyHint}} environment variable.':
    'Missing API key for OpenAI-compatible auth. Set the {{envKeyHint}} environment variable.',
  'Anthropic provider missing required baseUrl in modelProviders[].baseUrl.':
    'Anthropic provider missing required baseUrl in modelProviders[].baseUrl.',
  'ANTHROPIC_BASE_URL environment variable not found.':
    'ANTHROPIC_BASE_URL environment variable not found.',
  'Invalid auth method selected.': 'Invalid auth method selected.',
  'Failed to authenticate. Message: {{message}}':
    'Failed to authenticate. Message: {{message}}',
  'Authenticated successfully with {{authType}} credentials.':
    'Authenticated successfully with {{authType}} credentials.',
  'Invalid TRAM_DEFAULT_AUTH_TYPE value: "{{value}}". Valid values are: {{validValues}}':
    'Invalid TRAM_DEFAULT_AUTH_TYPE value: "{{value}}". Valid values are: {{validValues}}',
  'OpenAI Configuration Required': 'OpenAI Configuration Required',
  'Please enter your OpenAI configuration. You can get an API key from':
    'OpenAI設定を入力してください。APIキーは以下から取得できます',
  'API Key:': 'APIキー:',
  'Invalid credentials: {{errorMessage}}': '無効な認証情報: {{errorMessage}}',
  'Failed to validate credentials': '認証情報の検証に失敗しました',
  'Press Enter to continue, Tab/↑↓ to navigate, Esc to cancel':
    'Enter で続行、Tab/↑↓ で移動、Esc でキャンセル',
  // Dialogs - Model
  'Select Model': 'モデルを選択',
  '(Press Esc to close)': '(Esc で閉じる)',
  Modality: 'モダリティ',
  'Context Window': 'コンテキストウィンドウ',
  text: 'テキスト',
  'text-only': 'テキストのみ',
  image: '画像',
  pdf: 'PDF',
  audio: '音声',
  video: '動画',
  'not set': '未設定',
  none: 'なし',
  unknown: '不明',
  'Qwen 3.6 Plus — efficient hybrid model with leading coding performance':
    'Qwen 3.6 Plus — 効率的なハイブリッドモデル、業界トップクラスのコーディング性能',
  'The latest Qwen Vision model from Alibaba Cloud ModelStudio (version: qwen3-vl-plus-2025-09-23)':
    'Alibaba Cloud ModelStudioの最新Qwen Visionモデル(バージョン: qwen3-vl-plus-2025-09-23)',
  // Dialogs - Permissions
  'Manage folder trust settings': 'フォルダ信頼設定を管理',
  'Manage permission rules': '権限ルールを管理',
  Allow: '許可',
  Ask: '確認',
  Deny: '拒否',
  Workspace: 'ワークスペース',
  "Qwen Code won't ask before using allowed tools.":
    'Qwen Code は許可されたツールを使用する前に確認しません。',
  'Qwen Code will ask before using these tools.':
    'Qwen Code はこれらのツールを使用する前に確認します。',
  'Qwen Code is not allowed to use denied tools.':
    'Qwen Code は拒否されたツールを使用できません。',
  'Manage trusted directories for this workspace.':
    'このワークスペースの信頼済みディレクトリを管理します。',
  'Any use of the {{tool}} tool': '{{tool}} ツールのすべての使用',
  "{{tool}} commands matching '{{pattern}}'":
    "'{{pattern}}' に一致する {{tool}} コマンド",
  'From user settings': 'ユーザー設定から',
  'From project settings': 'プロジェクト設定から',
  'From session': 'セッションから',
  'Project settings (local)': 'プロジェクト設定（ローカル）',
  'Saved in .qwen/settings.local.json': '.qwen/settings.local.json に保存',
  'Project settings': 'プロジェクト設定',
  'Checked in at .qwen/settings.json': '.qwen/settings.json にチェックイン',
  'User settings': 'ユーザー設定',
  'Saved in at ~/.qwen/settings.json': '~/.qwen/settings.json に保存',
  'Add a new rule…': '新しいルールを追加…',
  'Add {{type}} permission rule': '{{type}}権限ルールを追加',
  'Permission rules are a tool name, optionally followed by a specifier in parentheses.':
    '権限ルールはツール名で、オプションで括弧内に指定子を付けます。',
  'e.g.,': '例：',
  or: 'または',
  'Enter permission rule…': '権限ルールを入力…',
  'Enter to submit · Esc to cancel': 'Enter で送信 · Esc でキャンセル',
  'Where should this rule be saved?': 'このルールをどこに保存しますか？',
  'Enter to confirm · Esc to cancel': 'Enter で確認 · Esc でキャンセル',
  'Delete {{type}} rule?': '{{type}}ルールを削除しますか？',
  'Are you sure you want to delete this permission rule?':
    'この権限ルールを削除してもよろしいですか？',
  'Permissions:': '権限：',
  '(←/→ or tab to cycle)': '（←/→ または Tab で切替）',
  'Press ↑↓ to navigate · Enter to select · Type to search · Esc to cancel':
    '↑↓ でナビゲート · Enter で選択 · 入力で検索 · Esc でキャンセル',
  'Search…': '検索…',
  'Use /trust to manage folder trust settings for this workspace.':
    '/trust を使用してこのワークスペースのフォルダ信頼設定を管理します。',
  // Workspace directory management
  'Add directory…': 'ディレクトリを追加…',
  'Add directory to workspace': 'ワークスペースにディレクトリを追加',
  'Qwen Code can read files in the workspace, and make edits when auto-accept edits is on.':
    'Qwen Code はワークスペース内のファイルを読み取り、自動編集承認が有効な場合は編集を行えます。',
  'Qwen Code will be able to read files in this directory and make edits when auto-accept edits is on.':
    'Qwen Code はこのディレクトリ内のファイルを読み取り、自動編集承認が有効な場合は編集を行えます。',
  'Enter the path to the directory:': 'ディレクトリのパスを入力してください:',
  'Enter directory path…': 'ディレクトリパスを入力…',
  'Tab to complete · Enter to add · Esc to cancel':
    'Tab で補完 · Enter で追加 · Esc でキャンセル',
  'Remove directory?': 'ディレクトリを削除しますか？',
  'Are you sure you want to remove this directory from the workspace?':
    'このディレクトリをワークスペースから削除してもよろしいですか？',
  '  (Original working directory)': '  （元の作業ディレクトリ）',
  '  (from settings)': '  （設定より）',
  'Directory does not exist.': 'ディレクトリが存在しません。',
  'Path is not a directory.': 'パスはディレクトリではありません。',
  'This directory is already in the workspace.':
    'このディレクトリはすでにワークスペースに含まれています。',
  'Already covered by existing directory: {{dir}}':
    '既存のディレクトリによって既にカバーされています: {{dir}}',
  // Status Bar
  'Using:': '使用中:',
  '{{count}} open file': '{{count}} 個のファイルを開いています',
  '{{count}} open files': '{{count}} 個のファイルを開いています',
  '(ctrl+g to view)': '(Ctrl+G で表示)',
  '{{count}} {{name}} file': '{{count}} {{name}} ファイル',
  '{{count}} {{name}} files': '{{count}} {{name}} ファイル',
  '{{count}} MCP server': '{{count}} MCPサーバー',
  '{{count}} MCP servers': '{{count}} MCPサーバー',
  '{{count}} Blocked': '{{count}} ブロック',
  '(ctrl+t to view)': '(Ctrl+T で表示)',
  '(ctrl+t to toggle)': '(Ctrl+T で切り替え)',
  'Press Ctrl+C again to exit.': 'Ctrl+C をもう一度押すと終了します',
  'Press Ctrl+D again to exit.': 'Ctrl+D をもう一度押すと終了します',
  'Press Esc again to clear.': 'Esc をもう一度押すとクリアします',
  'Press ↑ to edit queued messages': '↑ を押してキュー内のメッセージを編集',
  // MCP Status
  '⏳ MCP servers are starting up ({{count}} initializing)...':
    '⏳ MCPサーバーを起動中({{count}} 初期化中)...',
  'Note: First startup may take longer. Tool availability will update automatically.':
    '注: 初回起動には時間がかかる場合があります。ツールの利用可能状況は自動的に更新されます',
  'Starting... (first startup may take longer)':
    '起動中...(初回起動には時間がかかる場合があります)',
  '{{count}} prompt': '{{count}} プロンプト',
  '{{count}} prompts': '{{count}} プロンプト',
  '(from {{extensionName}})': '({{extensionName}} から)',
  OAuth: 'OAuth',
  'OAuth expired': 'OAuth 期限切れ',
  'OAuth not authenticated': 'OAuth 未認証',
  'tools and prompts will appear when ready':
    'ツールとプロンプトは準備完了後に表示されます',
  '{{count}} tools cached': '{{count}} ツール(キャッシュ済み)',
  'Tools:': 'ツール:',
  'Parameters:': 'パラメータ:',
  'Prompts:': 'プロンプト:',
  Blocked: 'ブロック',
  '💡 Tips:': '💡 ヒント:',
  Use: '使用',
  'to show server and tool descriptions': 'サーバーとツールの説明を表示',
  'to show tool parameter schemas': 'ツールパラメータスキーマを表示',
  'to hide descriptions': '説明を非表示',
  'to authenticate with OAuth-enabled servers': 'OAuth対応サーバーで認証',
  Press: '押す',
  'to toggle tool descriptions on/off': 'ツール説明の表示/非表示を切り替え',
  "Starting OAuth authentication for MCP server '{{name}}'...":
    "MCPサーバー '{{name}}' のOAuth認証を開始中...",
  // Startup Tips
  'Tips:': 'ヒント：',
  'Use /compress when the conversation gets long to summarize history and free up context.':
    '会話が長くなったら /compress で履歴を要約し、コンテキストを解放できます。',
  'Start a fresh idea with /clear or /new; the previous session stays available in history.':
    '/clear または /new で新しいアイデアを始められます。前のセッションは履歴に残ります。',
  'Use /bug to submit issues to the maintainers when something goes off.':
    '問題が発生したら /bug でメンテナーに報告できます。',
  'Switch auth type quickly with /auth.':
    '/auth で認証タイプをすばやく切り替えられます。',
  'You can run any shell commands from Qwen Code using ! (e.g. !ls).':
    'Qwen Code から ! を使って任意のシェルコマンドを実行できます（例: !ls）。',
  'Type / to open the command popup; Tab autocompletes slash commands and saved prompts.':
    '/ を入力してコマンドポップアップを開きます。Tab でスラッシュコマンドと保存済みプロンプトを補完できます。',
  'You can resume a previous conversation by running qwen --continue or qwen --resume.':
    'qwen --continue または qwen --resume で前の会話を再開できます。',
  'You can switch permission mode quickly with Shift+Tab or /approval-mode.':
    'Shift+Tab または /approval-mode で権限モードをすばやく切り替えられます。',
  'You can switch permission mode quickly with Tab or /approval-mode.':
    'Tab または /approval-mode で権限モードをすばやく切り替えられます。',
  'Try /insight to generate personalized insights from your chat history.':
    '/insight でチャット履歴からパーソナライズされたインサイトを生成できます。',
  'Add a QWEN.md file to give Qwen Code persistent project context.':
    'QWEN.md ファイルを追加すると、Qwen Code に永続的なプロジェクトコンテキストを与えられます。',
  'Use /btw to ask a quick side question without disrupting the conversation.':
    '会話を中断せずに /btw でちょっとした横道の質問ができます。',
  'Context is almost full! Run /compress now or start /new to continue.':
    'コンテキストがもうすぐいっぱいです！今すぐ /compress を実行するか、/new を開始して続けてください。',
  'Context is getting full. Use /compress to free up space.':
    'コンテキストが埋まりつつあります。/compress を使って空きを増やしてください。',
  'Long conversation? /compress summarizes history to free context.':
    '会話が長くなりましたか？ /compress は履歴を要約してコンテキストを空けます。',
  'Tips for getting started:': '始めるためのヒント:',
  '1. Ask questions, edit files, or run commands.':
    '1. 質問したり、ファイルを編集したり、コマンドを実行したりできます',
  '2. Be specific for the best results.':
    '2. 具体的に指示すると最良の結果が得られます',
  'files to customize your interactions with Qwen Code.':
    'Qwen Code との対話をカスタマイズするためのファイル',
  'for more information.': '詳細情報を確認できます',
  // Exit Screen / Stats
  'Agent powering down. Goodbye!': 'エージェントを終了します。さようなら!',
  'To continue this session, run': 'このセッションを続行するには、次を実行:',
  'Interaction Summary': 'インタラクション概要',
  'Session ID:': 'セッションID:',
  'Tool Calls:': 'ツール呼び出し:',
  'Success Rate:': '成功率:',
  'User Agreement:': 'ユーザー同意:',
  reviewed: 'レビュー済み',
  'Code Changes:': 'コード変更:',
  Performance: 'パフォーマンス',
  'Wall Time:': '経過時間:',
  'Agent Active:': 'エージェント稼働時間:',
  'API Time:': 'API時間:',
  'Tool Time:': 'ツール時間:',
  'Session Stats': 'セッション統計',
  'Model Usage': 'モデル使用量',
  Reqs: 'リクエスト',
  'Input Tokens': '入力トークン',
  'Output Tokens': '出力トークン',
  'Savings Highlight:': '節約ハイライト:',
  'of input tokens were served from the cache, reducing costs.':
    '入力トークンがキャッシュから提供され、コストを削減しました',
  'Tip: For a full token breakdown, run `/stats model`.':
    'ヒント: トークンの詳細な内訳は `/stats model` を実行してください',
  'Model Stats For Nerds': 'マニア向けモデル統計',
  'Tool Stats For Nerds': 'マニア向けツール統計',
  Metric: 'メトリック',
  API: 'API',
  Requests: 'リクエスト',
  Errors: 'エラー',
  'Avg Latency': '平均レイテンシ',
  Tokens: 'トークン',
  Total: '合計',
  Prompt: 'プロンプト',
  Cached: 'キャッシュ',
  Thoughts: '思考',
  Tool: 'ツール',
  Output: '出力',
  'No API calls have been made in this session.':
    'このセッションではAPI呼び出しが行われていません',
  'Tool Name': 'ツール名',
  Calls: '呼び出し',
  'Success Rate': '成功率',
  'Avg Duration': '平均時間',
  'User Decision Summary': 'ユーザー決定サマリー',
  'Total Reviewed Suggestions:': '総レビュー提案数:',
  ' » Accepted:': ' » 承認:',
  ' » Rejected:': ' » 却下:',
  ' » Modified:': ' » 変更:',
  ' Overall Agreement Rate:': ' 全体承認率:',
  'No tool calls have been made in this session.':
    'このセッションではツール呼び出しが行われていません',
  'Session start time is unavailable, cannot calculate stats.':
    'セッション開始時刻が利用できないため、統計を計算できません',
  // Loading
  'Waiting for user confirmation...': 'ユーザーの確認を待っています...',
  '(esc to cancel, {{time}})': '(Esc でキャンセル、{{time}})',
  // Witty Loading Phrases
  WITTY_LOADING_PHRASES: [
    '運任せで検索中...',
    '中の人がタイピング中...',
    'ロジックを最適化中...',
    '電子の数を確認中...',
    '宇宙のバグをチェック中...',
    '大量の0と1をコンパイル中...',
    'HDDと思い出をデフラグ中...',
    'ビットをこっそり入れ替え中...',
    'ニューロンの接続を再構築中...',
    'どこかに行ったセミコロンを捜索中...',
    'フラックスキャパシタを調整中...',
    'フォースと交感中...',
    'アルゴリズムをチューニング中...',
    '白いウサギを追跡中...',
    'カセットフーフー中...',
    'ローディングメッセージを考え中...',
    'ほぼ完了...多分...',
    '最新のミームについて調査中...',
    'この表示を改善するアイデアを思索中...',
    'この問題を考え中...',
    'それはバグでなく誰も知らない新機能だよ',
    'ダイヤルアップ接続音が終わるのを待機中...',
    'コードに油を追加中...',

  // ============================================================================
  // Dialogs - Model
  // ============================================================================
  'Select Model': 'Select Model',
  '(Press Esc to close)': '(Press Esc to close)',
  'Current (effective) configuration': 'Current (effective) configuration',
  AuthType: 'AuthType',
  'API Key': 'API Key',
  unset: 'unset',
  '(default)': '(default)',
  '(set)': '(set)',
  '(not set)': '(not set)',
  Modality: 'Modality',
  'Context Window': 'Context Window',
  text: 'text',
  'text-only': 'text-only',
  image: 'image',
  pdf: 'pdf',
  audio: 'audio',
  video: 'video',
  'not set': 'not set',
  none: 'none',
  unknown: 'unknown',
  "Failed to switch model to '{{modelId}}'.\n\n{{error}}":
    "Failed to switch model to '{{modelId}}'.\n\n{{error}}",
  'Tram 3.5 Plus 闂?efficient hybrid model with leading coding performance':
    'Tram 3.5 Plus 闂?efficient hybrid model with leading coding performance',
  'The latest Tram Vision model from Alibaba Cloud ModelStudio (version: qwen3-vl-plus-2025-09-23)':
    'The latest Tram Vision model from Alibaba Cloud ModelStudio (version: qwen3-vl-plus-2025-09-23)',

  // ============================================================================
  // Dialogs - Permissions
  // ============================================================================
  'Manage folder trust settings': 'Manage folder trust settings',

  // ============================================================================
  // Status Bar
  // ============================================================================
  'Using:': 'Using:',
  '{{count}} open file': '{{count}} open file',
  '{{count}} open files': '{{count}} open files',
  '(ctrl+g to view)': '(ctrl+g to view)',
  '{{count}} {{name}} file': '{{count}} {{name}} file',
  '{{count}} {{name}} files': '{{count}} {{name}} files',
  '{{count}} MCP server': '{{count}} MCP server',
  '{{count}} MCP servers': '{{count}} MCP servers',
  '{{count}} Blocked': '{{count}} Blocked',
  '(ctrl+t to view)': '(ctrl+t to view)',
  '(ctrl+t to toggle)': '(ctrl+t to toggle)',
  'Press Ctrl+C again to exit.': 'Press Ctrl+C again to exit.',
  'Press Ctrl+D again to exit.': 'Press Ctrl+D again to exit.',
  'Press Esc again to clear.': 'Press Esc again to clear.',

  // ============================================================================
  // MCP Status
  // ============================================================================
  'No MCP servers configured.': 'No MCP servers configured.',
  '闂?MCP servers are starting up ({{count}} initializing)...':
    '闂?MCP servers are starting up ({{count}} initializing)...',
  'Note: First startup may take longer. Tool availability will update automatically.':
    'Note: First startup may take longer. Tool availability will update automatically.',
  'Configured MCP servers:': 'Configured MCP servers:',
  Ready: 'Ready',
  'Starting... (first startup may take longer)':
    'Starting... (first startup may take longer)',
  Disconnected: 'Disconnected',
  '{{count}} tool': '{{count}} tool',
  '{{count}} tools': '{{count}} tools',
  '{{count}} prompt': '{{count}} prompt',
  '{{count}} prompts': '{{count}} prompts',
  '(from {{extensionName}})': '(from {{extensionName}})',
  OAuth: 'OAuth',
  'OAuth expired': 'OAuth expired',
  'OAuth not authenticated': 'OAuth not authenticated',
  'tools and prompts will appear when ready':
    'tools and prompts will appear when ready',
  '{{count}} tools cached': '{{count}} tools cached',
  'Tools:': 'Tools:',
  'Parameters:': 'Parameters:',
  'Prompts:': 'Prompts:',
  Blocked: 'Blocked',
  '濡絽鍟€?Tips:': '濡絽鍟€?Tips:',
  Use: 'Use',
  'to show server and tool descriptions':
    'to show server and tool descriptions',
  'to show tool parameter schemas': 'to show tool parameter schemas',
  'to hide descriptions': 'to hide descriptions',
  'to authenticate with OAuth-enabled servers':
    'to authenticate with OAuth-enabled servers',
  Press: 'Press',
  'to toggle tool descriptions on/off': 'to toggle tool descriptions on/off',
  "Starting OAuth authentication for MCP server '{{name}}'...":
    "Starting OAuth authentication for MCP server '{{name}}'...",
  'Restarting MCP servers...': 'Restarting MCP servers...',

  // ============================================================================
  // Startup Tips
  // ============================================================================
  'Tips:': 'Tips:',
  'Use /compress when the conversation gets long to summarize history and free up context.':
    'Use /compress when the conversation gets long to summarize history and free up context.',
  'Start a fresh idea with /clear or /new; the previous session stays available in history.':
    'Start a fresh idea with /clear or /new; the previous session stays available in history.',
  'Use /bug to submit issues to the maintainers when something goes off.':
    'Use /bug to submit issues to the maintainers when something goes off.',
  'Switch auth type quickly with /auth.':
    'Switch auth type quickly with /auth.',
  'You can run any shell commands from TRAM using ! (e.g. !ls).':
    'You can run any shell commands from TRAM using ! (e.g. !ls).',
  'Type / to open the command popup; Tab autocompletes slash commands and saved prompts.':
    'Type / to open the command popup; Tab autocompletes slash commands and saved prompts.',
  'You can resume a previous conversation by running tram --continue or tram --resume.':
    'You can resume a previous conversation by running tram --continue or tram --resume.',
  'You can switch permission mode quickly with Shift+Tab or /approval-mode.':
    'You can switch permission mode quickly with Shift+Tab or /approval-mode.',
  'You can switch permission mode quickly with Tab or /approval-mode.':
    'You can switch permission mode quickly with Tab or /approval-mode.',
  'Try /insight to generate personalized insights from your chat history.':
    'Try /insight to generate personalized insights from your chat history.',

  // ============================================================================
  // Exit Screen / Stats
  // ============================================================================
  'Agent powering down. Goodbye!': 'Agent powering down. Goodbye!',
  'To continue this session, run': 'To continue this session, run',
  'Interaction Summary': 'Interaction Summary',
  'Session ID:': 'Session ID:',
  'Tool Calls:': 'Tool Calls:',
  'Success Rate:': 'Success Rate:',
  'User Agreement:': 'User Agreement:',
  reviewed: 'reviewed',
  'Code Changes:': 'Code Changes:',
  Performance: 'Performance',
  'Wall Time:': 'Wall Time:',
  'Agent Active:': 'Agent Active:',
  'API Time:': 'API Time:',
  'Tool Time:': 'Tool Time:',
  'Session Stats': 'Session Stats',
  'Model Usage': 'Model Usage',
  Reqs: 'Reqs',
  'Input Tokens': 'Input Tokens',
  'Output Tokens': 'Output Tokens',
  'Savings Highlight:': 'Savings Highlight:',
  'of input tokens were served from the cache, reducing costs.':
    'of input tokens were served from the cache, reducing costs.',
  'Tip: For a full token breakdown, run `/stats model`.':
    'Tip: For a full token breakdown, run `/stats model`.',
  'Model Stats For Nerds': 'Model Stats For Nerds',
  'Tool Stats For Nerds': 'Tool Stats For Nerds',
  Metric: 'Metric',
  API: 'API',
  Requests: 'Requests',
  Errors: 'Errors',
  'Avg Latency': 'Avg Latency',
  Tokens: 'Tokens',
  Total: 'Total',
  Prompt: 'Prompt',
  Cached: 'Cached',
  Thoughts: 'Thoughts',
  Tool: 'Tool',
  Output: 'Output',
  'No API calls have been made in this session.':
    'No API calls have been made in this session.',
  'Tool Name': 'Tool Name',
  Calls: 'Calls',
  'Success Rate': 'Success Rate',
  'Avg Duration': 'Avg Duration',
  'User Decision Summary': 'User Decision Summary',
  'Total Reviewed Suggestions:': 'Total Reviewed Suggestions:',
  ' 缂?Accepted:': ' 缂?Accepted:',
  ' 缂?Rejected:': ' 缂?Rejected:',
  ' 缂?Modified:': ' 缂?Modified:',
  ' Overall Agreement Rate:': ' Overall Agreement Rate:',
  'No tool calls have been made in this session.':
    'No tool calls have been made in this session.',
  'Session start time is unavailable, cannot calculate stats.':
    'Session start time is unavailable, cannot calculate stats.',

  // ============================================================================
  // Command Format Migration
  // ============================================================================
  'Command Format Migration': 'Command Format Migration',
  'Found {{count}} TOML command file:': 'Found {{count}} TOML command file:',
  'Found {{count}} TOML command files:': 'Found {{count}} TOML command files:',
  '... and {{count}} more': '... and {{count}} more',
  'The TOML format is deprecated. Would you like to migrate them to Markdown format?':
    'The TOML format is deprecated. Would you like to migrate them to Markdown format?',
  '(Backups will be created and original files will be preserved)':
    '(Backups will be created and original files will be preserved)',

  // ============================================================================
  // Loading Phrases
  // ============================================================================
  'Waiting for user confirmation...': 'Waiting for user confirmation...',
  '(esc to cancel, {{time}})': '(esc to cancel, {{time}})',

  // ============================================================================
  // Loading Phrases
  // ============================================================================
  WITTY_LOADING_PHRASES: [
    "I'm Feeling Lucky",
    'Shipping awesomeness... ',
    'Painting the serifs back on...',
    'Navigating the slime mold...',
    'Consulting the digital spirits...',
    'Reticulating splines...',
    'Warming up the AI hamsters...',
    'Asking the magic conch shell...',
    'Generating witty retort...',
    'Polishing the algorithms...',
    "Don't rush perfection (or my code)...",
    'Brewing fresh bytes...',
    'Counting electrons...',
    'Engaging cognitive processors...',
    'Checking for syntax errors in the universe...',
    'One moment, optimizing humor...',
    'Shuffling punchlines...',
    'Untangling neural nets...',
    'Compiling brilliance...',
    'Loading wit.exe...',
    'Summoning the cloud of wisdom...',
    'Preparing a witty response...',
    "Just a sec, I'm debugging reality...",
    'Confuzzling the options...',
    'Tuning the cosmic frequencies...',
    'Crafting a response worthy of your patience...',
    'Compiling the 1s and 0s...',
    'Resolving dependencies... and existential crises...',
    'Defragmenting memories... both RAM and personal...',
    'Rebooting the humor module...',
    'Caching the essentials (mostly cat memes)...',
    'Optimizing for ludicrous speed',
    "Swapping bits... don't tell the bytes...",
    'Garbage collecting... be right back...',
    'Assembling the interwebs...',
    'Converting coffee into code...',
    'Updating the syntax for reality...',
    'Rewiring the synapses...',
    'Looking for a misplaced semicolon...',
    "Greasin' the cogs of the machine...",
    'Pre-heating the servers...',
    'Calibrating the flux capacitor...',
    'Engaging the improbability drive...',
    'Channeling the Force...',
    'Aligning the stars for optimal response...',
    'So say we all...',
    'Loading the next great idea...',
    "Just a moment, I'm in the zone...",
    'Preparing to dazzle you with brilliance...',
    "Just a tick, I'm polishing my wit...",
    "Hold tight, I'm crafting a masterpiece...",
    "Just a jiffy, I'm debugging the universe...",
    "Just a moment, I'm aligning the pixels...",
    "Just a sec, I'm optimizing the humor...",
    "Just a moment, I'm tuning the algorithms...",
    'Warp speed engaged...',
    'Mining for more Dilithium crystals...',
    "Don't panic...",
    'Following the white rabbit...',
    'The truth is in here... somewhere...',
    'Blowing on the cartridge...',
    'Loading... Do a barrel roll!',
    'Waiting for the respawn...',
    'Finishing the Kessel Run in less than 12 parsecs...',
    "The cake is not a lie, it's just still loading...",
    'Fiddling with the character creation screen...',
    "Just a moment, I'm finding the right meme...",
    "Pressing 'A' to continue...",
    'Herding digital cats...',
    'Polishing the pixels...',
    'Finding a suitable loading screen pun...',
    'Distracting you with this witty phrase...',
    'Almost there... probably...',
    'Our hamsters are working as fast as they can...',
    'Giving Cloudy a pat on the head...',
    'Petting the cat...',
    'Rickrolling my boss...',
    'Never gonna give you up, never gonna let you down...',
    'Slapping the bass...',
    'Tasting the snozberries...',
    "I'm going the distance, I'm going for speed...",
    'Is this the real life? Is this just fantasy?...',
    "I've got a good feeling about this...",
    'Poking the bear...',
    'Doing research on the latest memes...',
    'Figuring out how to make this more witty...',
    'Hmmm... let me think...',
    'What do you call a fish with no eyes? A fsh...',
    'Why did the computer go to therapy? It had too many bytes...',
    "Why don't programmers like nature? It has too many bugs...",
    'Why do programmers prefer dark mode? Because light attracts bugs...',
    'Why did the developer go broke? Because they used up all their cache...',
    "What can you do with a broken pencil? Nothing, it's pointless...",
    'Applying percussive maintenance...',
    'Searching for the correct USB orientation...',
    'Ensuring the magic smoke stays inside the wires...',
    'Trying to exit Vim...',
    'Spinning up the hamster wheel...',
    "That's not a bug, it's an undocumented feature...",
    'Engage.',
    "I'll be back... with an answer.",
    'My other process is a TARDIS...',
    'Communing with the machine spirit...',
    'Letting the thoughts marinate...',
    'Just remembered where I put my keys...',
    'Pondering the orb...',
    "I've seen things you people wouldn't believe... like a user who reads loading messages.",
    'Initiating thoughtful gaze...',
    "What's a computer's favorite snack? Microchips.",
    "Why do Java developers wear glasses? Because they don't C#.",
    'Charging the laser... pew pew!',
    'Dividing by zero... just kidding!',
    'Looking for an adult superviso... I mean, processing.',
    'Making it go beep boop.',
    'Buffering... because even AIs need a moment.',
    'Entangling quantum particles for a faster response...',
    'Polishing the chrome... on the algorithms.',
    'Are you not entertained? (Working on it!)',
    'Summoning the code gremlins... to help, of course.',
    'Just waiting for the dial-up tone to finish...',
    'Recalibrating the humor-o-meter.',
    'My other loading screen is even funnier.',
    "Pretty sure there's a cat walking on the keyboard somewhere...",
    'Enhancing... Enhancing... Still loading.',
    "It's not a bug, it's a feature... of this loading screen.",
    'Have you tried turning it off and on again? (The loading screen, not me.)',
    'Constructing additional pylons...',
  ],

  // ============================================================================
  // Extension Settings Input
  // ============================================================================
  'Enter value...': 'Enter value...',
  'Enter sensitive value...': 'Enter sensitive value...',
  'Press Enter to submit, Escape to cancel':
    'Press Enter to submit, Escape to cancel',

  // ============================================================================
  // Command Migration Tool
  // ============================================================================
  'Markdown file already exists: {{filename}}':
    'Markdown file already exists: {{filename}}',
  'TOML Command Format Deprecation Notice':
    'TOML Command Format Deprecation Notice',
  'Found {{count}} command file(s) in TOML format:':
    'Found {{count}} command file(s) in TOML format:',
  'The TOML format for commands is being deprecated in favor of Markdown format.':
    'The TOML format for commands is being deprecated in favor of Markdown format.',
  'Markdown format is more readable and easier to edit.':
    'Markdown format is more readable and easier to edit.',
  'You can migrate these files automatically using:':
    'You can migrate these files automatically using:',
  'Or manually convert each file:': 'Or manually convert each file:',
  'TOML: prompt = "..." / description = "..."':
    'TOML: prompt = "..." / description = "..."',
  'Markdown: YAML frontmatter + content':
    'Markdown: YAML frontmatter + content',
  'The migration tool will:': 'The migration tool will:',
  'Convert TOML files to Markdown': 'Convert TOML files to Markdown',
  'Create backups of original files': 'Create backups of original files',
  'Preserve all command functionality': 'Preserve all command functionality',
  'TOML format will continue to work for now, but migration is recommended.':
    'TOML format will continue to work for now, but migration is recommended.',

  // ============================================================================
  // Extensions - Explore Command
  // ============================================================================
  'Open extensions page in your browser':
    'Open extensions page in your browser',
  'Unknown extensions source: {{source}}.':
    'Unknown extensions source: {{source}}.',
  'Would open extensions page in your browser: {{url}} (skipped in test environment)':
    'Would open extensions page in your browser: {{url}} (skipped in test environment)',
  'View available extensions at {{url}}':
    'View available extensions at {{url}}',
  'Opening extensions page in your browser: {{url}}':
    'Opening extensions page in your browser: {{url}}',
  'Failed to open browser. Check out the extensions gallery at {{url}}':
    'Failed to open browser. Check out the extensions gallery at {{url}}',

  // ============================================================================
  // Retry / Rate Limit
  // ============================================================================
  'Rate limit error: {{reason}}': 'Rate limit error: {{reason}}',
  'Retrying in {{seconds}} seconds闂?(attempt {{attempt}}/{{maxRetries}})':
    'Retrying in {{seconds}} seconds闂?(attempt {{attempt}}/{{maxRetries}})',
  'Press Ctrl+Y to retry': 'Press Ctrl+Y to retry',
  'No failed request to retry.': 'No failed request to retry.',
  'to retry last request': 'to retry last request',

  // ============================================================================
  // Coding Plan Authentication
  // ============================================================================
  'API key cannot be empty.': 'API key cannot be empty.',
  'You can get your Coding Plan API key here':
    'You can get your Coding Plan API key here',
  'API key is stored in settings.env. You can migrate it to a .env file for better security.':
    'API key is stored in settings.env. You can migrate it to a .env file for better security.',
  'New model configurations are available for Alibaba Cloud Coding Plan. Update now?':
    'New model configurations are available for Alibaba Cloud Coding Plan. Update now?',
  'Coding Plan configuration updated successfully. New models are now available.':
    'Coding Plan configuration updated successfully. New models are now available.',
  'Coding Plan API key not found. Please re-authenticate with Coding Plan.':
    'Coding Plan API key not found. Please re-authenticate with Coding Plan.',
  'Failed to update Coding Plan configuration: {{message}}':
    'Failed to update Coding Plan configuration: {{message}}',

  // ============================================================================
  // Custom API Key Configuration
  // ============================================================================
  'You can configure your API key and models in settings.json':
    'You can configure your API key and models in settings.json',
  'Refer to the documentation for setup instructions':
    'Refer to the documentation for setup instructions',

  // ============================================================================
  // Auth Dialog - View Titles and Labels
  // ============================================================================
  'Coding Plan': 'Coding Plan',
  "Paste your api key of ModelStudio Coding Plan and you're all set!":
    'ModelStudio Coding PlanのAPIキーを貼り付けるだけで準備完了です！',
  Custom: 'カスタム',
  'More instructions about configuring `modelProviders` manually.':
    'More instructions about configuring `modelProviders` manually.',
  'Select API-KEY configuration mode:': 'Select API-KEY configuration mode:',
  '(Press Escape to go back)': '(Press Escape to go back)',
  '(Press Enter to submit, Escape to cancel)':
    '(Press Enter to submit, Escape to cancel)',
  'Select Region for Coding Plan': 'Select Region for Coding Plan',
  'Choose based on where your account is registered':
    'Choose based on where your account is registered',
  'Enter Coding Plan API Key': 'Enter Coding Plan API Key',

  // ============================================================================
  // Coding Plan International Updates
  // ============================================================================
  'New model configurations are available for {{region}}. Update now?':
    'New model configurations are available for {{region}}. Update now?',
  '{{region}} configuration updated successfully. Model switched to "{{model}}".':
    '{{region}} の設定が正常に更新されました。モデルが "{{model}}" に切り替わりました。',
  'Authenticated successfully with {{region}}. API key and model configs saved to settings.json (backed up).':
    '{{region}} での認証に成功しました。API キーとモデル設定が settings.json に保存されました（バックアップ済み）。',

  // ============================================================================
  // Context Usage Component
  // ============================================================================
  'Context Usage': 'コンテキスト使用量',
  'No API response yet. Send a message to see actual usage.':
    'API応答はありません。メッセージを送信して実際の使用量を確認してください。',
  'Estimated pre-conversation overhead': '推定事前会話オーバーヘッド',
  'Context window': 'コンテキストウィンドウ',
  tokens: 'トークン',
  Used: '使用済み',
  Free: '空き',
  'Autocompact buffer': '自動圧縮バッファ',
  'Usage by category': 'カテゴリ別の使用量',
  'System prompt': 'システムプロンプト',
  'Built-in tools': '組み込みツール',
  'MCP tools': 'MCPツール',
  'Memory files': 'メモリファイル',
  Skills: 'スキル',
  Messages: 'メッセージ',
  'Show context window usage breakdown.':
    'コンテキストウィンドウの使用状況を表示します。',
  'Run /context detail for per-item breakdown.':
    '/context detail を実行すると項目ごとの内訳を表示します。',
  active: '有効',
  'body loaded': '本文読み込み済み',
  memory: 'メモリ',
  '{{region}} configuration updated successfully.':
    '{{region}} configuration updated successfully.',
  'Authenticated successfully with {{region}}. API key and model configs saved to settings.json.':
    'Authenticated successfully with {{region}}. API key and model configs saved to settings.json.',
  'Tip: Use /model to switch between available Coding Plan models.':
    'Tip: Use /model to switch between available Coding Plan models.',

  // ============================================================================
  // Service Command
  // ============================================================================
  'Manage persistent background services.':
    'Manage persistent background services.',
  'Tip: Recommended Alt+L to open the ask flow quickly. You can also type /service alert <name>.':
    'Tip: Recommended Alt+L to open the ask flow quickly. You can also type /service alert <name>.',
  'Tip: Press Ctrl+Tab to switch to Servers Log, then press again to return to Chat.':
    'Tip: Press Ctrl+Tab to switch to Servers Log, then press again to return to Chat.',
  'No services registered. Use /service register ... to add one.\nCurrent max running services: {{maxRunningServices}}':
    'No services registered. Use /service register ... to add one.\nCurrent max running services: {{maxRunningServices}}',
  '- {{runningStatus}} {{name}} | autoStart={{autoStart}} | pid={{pid}} | follow={{follow}} | notify={{notify}} | alert={{alert}} | cwd={{cwd}} | cmd={{command}}':
    '- {{runningStatus}} {{name}} | autoStart={{autoStart}} | pid={{pid}} | follow={{follow}} | notify={{notify}} | alert={{alert}} | cwd={{cwd}} | cmd={{command}}',
  'Registered services ({{count}})\nMax running services: {{maxRunningServices}}\nTo change the limit manually, edit services.json in project storage.\n\n{{listLines}}':
    'Registered services ({{count}})\nMax running services: {{maxRunningServices}}\nTo change the limit manually, edit services.json in project storage.\n\n{{listLines}}',
  'Unknown option: {{option}}': 'Unknown option: {{option}}',
  'Service "{{name}}" registered and started.\nautoStart={{autoStart}}, watch={{watchPatterns}}':
    'Service "{{name}}" registered and started.\nautoStart={{autoStart}}, watch={{watchPatterns}}',
  'Service name is required for /service {{action}}.':
    'Service name is required for /service {{action}}.',
  'Service "{{name}}" started.': 'Service "{{name}}" started.',
  'Service "{{name}}" stopped.': 'Service "{{name}}" stopped.',
  'Service "{{name}}" restarted.': 'Service "{{name}}" restarted.',
  'Service "{{name}}" removed.': 'Service "{{name}}" removed.',
  'Service "{{name}}" not found.': 'Service "{{name}}" not found.',
  'Service "{{name}}" realtime notifications enabled.':
    'Service "{{name}}" realtime notifications enabled.',
  'Service "{{name}}" realtime notifications muted.\nErrors are still buffered. Use /service alert {{name}} to inspect buffered logs.':
    'Service "{{name}}" realtime notifications muted.\nErrors are still buffered. Use /service alert {{name}} to inspect buffered logs.',
  'Unknown option for log: {{option}}': 'Unknown option for log: {{option}}',
  'Service {{name}} ({{runningStatus}}, pid={{pid}})\nfollow={{followStatus}} notify={{notifyStatus}}\n\n{{logs}}':
    'Service {{name}} ({{runningStatus}}, pid={{pid}})\nfollow={{followStatus}} notify={{notifyStatus}}\n\n{{logs}}',
  'No pending alert buffer for service "{{name}}".':
    'No pending alert buffer for service "{{name}}".',
  'Service {{name}} has alerts. Choose the next action.\nStart line: {{startLine}}, buffered lines: {{bufferedLines}}, error lines: {{errorLines}}\nRecommended: press Alt+L to open ask flow quickly; command input is also supported.\nTip: Press Ctrl+Tab to switch to Servers Log, then press again to return to Chat.':
    'Service {{name}} has alerts. Choose the next action.\nStart line: {{startLine}}, buffered lines: {{bufferedLines}}, error lines: {{errorLines}}\nRecommended: press Alt+L to open ask flow quickly; command input is also supported.\nTip: Press Ctrl+Tab to switch to Servers Log, then press again to return to Chat.',
  'Analyze logs only': 'Analyze logs only',
  'Alert handling': 'Alert handling',
  'Analyze logs without entering repair flow (equivalent: /service analyze {{name}} all)':
    'Analyze logs without entering repair flow (equivalent: /service analyze {{name}} all)',
  'Analyze then fix issue (Recommended)':
    'Analyze then fix issue (Recommended)',
  'Analyze logs and continue to fix. You can run /service analyze {{name}} all first, then ask the model to directly repair in follow-up prompts.':
    'Analyze logs and continue to fix. You can run /service analyze {{name}} all first, then ask the model to directly repair in follow-up prompts.',
  'Handle later': 'Handle later',
  'Do not process now; continue buffering subsequent logs in background.':
    'Do not process now; continue buffering subsequent logs in background.',
  'No pending alert logs for service "{{name}}".':
    'No pending alert logs for service "{{name}}".',
  'No logs available in selected mode ({{mode}}) for service "{{name}}".':
    'No logs available in selected mode ({{mode}}) for service "{{name}}".',
  'Please analyze the following service logs for service "{{name}}".\nMode: {{mode}}.\nProvide: root cause, confidence, immediate mitigation, and next checks.\n\n':
    'Please analyze the following service logs for service "{{name}}".\nMode: {{mode}}.\nProvide: root cause, confidence, immediate mitigation, and next checks.\n\n',
  'No log patterns configured for service "{{name}}".':
    'No log patterns configured for service "{{name}}".',
  '- [{{id}}] Pattern: `{{pattern}}` | Action: {{action}} | Description: {{description}}':
    '- [{{id}}] Pattern: `{{pattern}}` | Action: {{action}} | Description: {{description}}',
  'Log patterns for service "{{name}}":\n{{listText}}':
    'Log patterns for service "{{name}}":\n{{listText}}',
  'To add log patterns for service "{{name}}", LM will use the request_log_pattern tool.':
    'To add log patterns for service "{{name}}", LM will use the request_log_pattern tool.',
  'Removed pattern rule "{{ruleId}}" from service "{{name}}".':
    'Removed pattern rule "{{ruleId}}" from service "{{name}}".',
  'Pattern rule "{{ruleId}}" not found in service "{{name}}".':
    'Pattern rule "{{ruleId}}" not found in service "{{name}}".',
  'Sent input to service "{{name}}".': 'Sent input to service "{{name}}".',
  'Unknown subcommand: {{subcommand}}\n\n{{helpText}}':
    'Unknown subcommand: {{subcommand}}\n\n{{helpText}}',
  '[service/{{name}}] detected error signal: {{sourceLine}}\nLogs were buffered from this point. Recommended: press Alt+L to open the ask flow. You can also use /service alert {{name}} to inspect and decide whether to send logs to LM.\nThen use /service analyze {{name}} all or /service analyze {{name}} errors.\nTip: Press Ctrl+Tab to switch to Servers Log, then press again to return to Chat.':
    '[service/{{name}}] detected error signal: {{sourceLine}}\nLogs were buffered from this point. Recommended: press Alt+L to open the ask flow. You can also use /service alert {{name}} to inspect and decide whether to send logs to LM.\nThen use /service analyze {{name}} all or /service analyze {{name}} errors.\nTip: Press Ctrl+Tab to switch to Servers Log, then press again to return to Chat.',

  // ============================================================================
  // Ask User Question Tool
  // ============================================================================
  'Please answer the following question(s):':
    'Please answer the following question(s):',
  'Cannot ask user questions in non-interactive mode. Please run in interactive mode to use this tool.':
    'Cannot ask user questions in non-interactive mode. Please run in interactive mode to use this tool.',
  'User declined to answer the questions.':
    'User declined to answer the questions.',
  'User has provided the following answers:':
    'ユーザーは以下の回答を提供しました：',
  'Failed to process user answers:': 'ユーザー回答の処理に失敗しました：',
  'Type something...': '何か入力...',
  Submit: '送信',
  'Submit answers': '回答を送信',
  Cancel: 'キャンセル',
  'Your answers:': 'あなたの回答：',
  '(not answered)': '(未回答)',
  'Ready to submit your answers?': '回答を送信しますか？',
  '↑/↓: Navigate | ←/→: Switch tabs | Enter: Select':
    '↑/↓: ナビゲート | ←/→: タブ切り替え | Enter: 選択',
  '↑/↓: Navigate | ←/→: Switch tabs | Space/Enter: Toggle | Esc: Cancel':
    '↑/↓: ナビゲート | ←/→: タブ切り替え | Space/Enter: 切り替え | Esc: キャンセル',
  '↑/↓: Navigate | Space/Enter: Toggle | Esc: Cancel':
    '↑/↓: ナビゲート | Space/Enter: 切り替え | Esc: キャンセル',
  '↑/↓: Navigate | Enter: Select | Esc: Cancel':
    '↑/↓: ナビゲート | Enter: 選択 | Esc: キャンセル',

  // ============================================================================
  // Commands - Auth
  // ============================================================================
  'Configure Qwen authentication information with Qwen-OAuth or Alibaba Cloud Coding Plan':
    'Qwen-OAuth または Alibaba Cloud Coding Plan で Qwen 認証情報を設定する',
  'Authenticate using Qwen OAuth': 'Qwen OAuth で認証する',
  'Authenticate using Alibaba Cloud Coding Plan':
    'Alibaba Cloud Coding Plan で認証する',
  'Region for Coding Plan (china/global)':
    'Coding Plan のリージョン (china/global)',
  'API key for Coding Plan': 'Coding Plan の API キー',
  'Show current authentication status': '現在の認証ステータスを表示',
  'Authentication completed successfully.': '認証が正常に完了しました。',
  'Starting Qwen OAuth authentication...': 'Qwen OAuth 認証を開始しています...',
  'Successfully authenticated with Qwen OAuth.':
    'Qwen OAuth での認証に成功しました。',
  'Failed to authenticate with Qwen OAuth: {{error}}':
    'Qwen OAuth での認証に失敗しました: {{error}}',
  'Processing Alibaba Cloud Coding Plan authentication...':
    'Alibaba Cloud Coding Plan 認証を処理しています...',
  'Successfully authenticated with Alibaba Cloud Coding Plan.':
    'Alibaba Cloud Coding Plan での認証に成功しました。',
  'Failed to authenticate with Coding Plan: {{error}}':
    'Coding Plan での認証に失敗しました: {{error}}',
  '中国 (China)': '中国 (China)',
  '阿里云百炼 (aliyun.com)': '阿里云百炼 (aliyun.com)',
  Global: 'グローバル',
  'Alibaba Cloud (alibabacloud.com)': 'Alibaba Cloud (alibabacloud.com)',
  'Select region for Coding Plan:': 'Coding Plan のリージョンを選択:',
  'Enter your Coding Plan API key: ':
    'Coding Plan の API キーを入力してください: ',
  'Select authentication method:': '認証方法を選択:',
  '\n=== Authentication Status ===\n': '\n=== 認証ステータス ===\n',
  '⚠️  No authentication method configured.\n':
    '⚠️  認証方法が設定されていません。\n',
  'Run one of the following commands to get started:\n':
    '以下のコマンドのいずれかを実行して開始してください:\n',
  '  qwen auth qwen-oauth     - Authenticate with Qwen OAuth (discontinued)':
    '  qwen auth qwen-oauth     - Qwen OAuth で認証（終了）',
  '  qwen auth coding-plan      - Authenticate with Alibaba Cloud Coding Plan\n':
    '  qwen auth coding-plan      - Alibaba Cloud Coding Plan で認証\n',
  'Or simply run:': 'または以下を実行:',
  '  qwen auth                - Interactive authentication setup\n':
    '  qwen auth                - インタラクティブ認証セットアップ\n',
  '✓ Authentication Method: Qwen OAuth': '✓ 認証方法: Qwen OAuth',
  '  Type: Free tier (discontinued 2026-04-15)':
    '  タイプ: 無料枠（2026-04-15 終了）',
  '  Limit: No longer available': '  制限: 利用不可',
  'Qwen OAuth free tier was discontinued on 2026-04-15. Run /auth to switch to Coding Plan, OpenRouter, Fireworks AI, or another provider.':
    'Qwen OAuth 無料枠は 2026-04-15 に終了しました。/auth を実行して Coding Plan、OpenRouter、Fireworks AI、または他のプロバイダーに切り替えてください。',
  '  Models: Qwen latest models\n': '  モデル: Qwen 最新モデル\n',
  '✓ Authentication Method: Alibaba Cloud Coding Plan':
    '✓ 認証方法: Alibaba Cloud Coding Plan',
  '中国 (China) - 阿里云百炼': '中国 (China) - 阿里云百炼',
  'Global - Alibaba Cloud': 'グローバル - Alibaba Cloud',
  '  Region: {{region}}': '  リージョン: {{region}}',
  '  Current Model: {{model}}': '  現在のモデル: {{model}}',
  '  Config Version: {{version}}': '  設定バージョン: {{version}}',
  '  Status: API key configured\n': '  ステータス: APIキー設定済み\n',
  '⚠️  Authentication Method: Alibaba Cloud Coding Plan (Incomplete)':
    '⚠️  認証方法: Alibaba Cloud Coding Plan（不完全）',
  '  Issue: API key not found in environment or settings\n':
    '  問題: 環境変数または設定にAPIキーが見つかりません\n',
  '  Run `qwen auth coding-plan` to re-configure.\n':
    '  `qwen auth coding-plan` を実行して再設定してください。\n',
  '✓ Authentication Method: {{type}}': '✓ 認証方法: {{type}}',
  '  Status: Configured\n': '  ステータス: 設定済み\n',
  'Failed to check authentication status: {{error}}':
    '認証ステータスの確認に失敗しました: {{error}}',
  'Select an option:': 'オプションを選択:',
  'Raw mode not available. Please run in an interactive terminal.':
    'Rawモードが利用できません。インタラクティブターミナルで実行してください。',
  '(Use ↑ ↓ arrows to navigate, Enter to select, Ctrl+C to exit)\n':
    '(↑ ↓ 矢印キーで移動、Enter で選択、Ctrl+C で終了)\n',
  compact: 'コンパクト',
  'Hide tool output and thinking for a cleaner view (toggle with Ctrl+O).':
    'コンパクトモードでツール出力と思考を非表示にします（Ctrl+O で切り替え）。',
  'Press Ctrl+O to show full tool output': 'Ctrl+O で完全なツール出力を表示',

  'Switch to plan mode or exit plan mode':
    'Switch to plan mode or exit plan mode',
  'Exited plan mode. Previous approval mode restored.':
    'Exited plan mode. Previous approval mode restored.',
  'Enabled plan mode. The agent will analyze and plan without executing tools.':
    'Enabled plan mode. The agent will analyze and plan without executing tools.',
  'Already in plan mode. Use "/plan exit" to exit plan mode.':
    'Already in plan mode. Use "/plan exit" to exit plan mode.',
  'Not in plan mode. Use "/plan" to enter plan mode first.':
    'Not in plan mode. Use "/plan" to enter plan mode first.',

  "Set up Qwen Code's status line UI": "Set up Qwen Code's status line UI",
};
