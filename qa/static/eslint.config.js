const browserGlobals = [
  'window', 'document', 'navigator', 'localStorage', 'sessionStorage', 'location', 'console',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame',
  'fetch', 'URL', 'Intl', 'Event', 'PointerEvent', 'CustomEvent', 'KeyboardEvent', 'HTMLElement', 'Element', 'Node',
  'SpeechSynthesisUtterance', 'performance', 'Image', 'getComputedStyle', 'AbortController', 'matchMedia', 'screen',
  'alert', 'confirm', 'Audio', 'AudioContext', 'webkitAudioContext', 'ResizeObserver', 'MutationObserver', 'Date',
  'caches', 'Response',
];

module.exports = [
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: Object.fromEntries(browserGlobals.map((name) => [name, 'readonly'])),
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': ['warn', { args: 'none' }],
      'no-dupe-keys': 'error',
      'no-redeclare': 'error',
      'no-unreachable': 'warn',
      'no-dupe-else-if': 'error',
      'no-duplicate-case': 'error',
      'no-self-assign': 'warn',
      'no-empty': 'warn',
      'no-func-assign': 'error',
      'no-const-assign': 'error',
      'use-isnan': 'error',
      'valid-typeof': 'error',
      eqeqeq: ['warn', 'smart'],
      'no-unused-labels': 'warn',
      'no-useless-escape': 'warn',
      'no-constant-condition': 'warn',
    },
  },
];
