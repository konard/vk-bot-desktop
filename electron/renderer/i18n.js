/**
 * Tiny translation table for the renderer. Two locales (en, ru), one dictionary.
 * Auto-detected from `navigator.language` and overridable via the UI.
 */

export const TRANSLATIONS = {
  en: {
    appTitle: 'VK Bot Desktop',
    mode: 'Mode',
    modeLocal: 'Local',
    modeServer: 'Server (SSH + Docker)',
    theme: 'Theme',
    themeAuto: 'Auto',
    themeLight: 'Light',
    themeDark: 'Dark',
    language: 'Language',
    start: 'Start',
    stop: 'Stop',
    saveConfig: 'Save configuration',
    vkToken: 'VK access token',
    vkTokenHelp:
      'Used by the bot to call the VK API. Get one from https://vkhost.github.io/. Tokens are kept on this device only and redacted from all logs.',
    priorityFriendIds: 'Priority friend IDs',
    priorityFriendIdsHelp:
      'Comma-separated VK numeric user IDs. The bot will always send a request to these users and will never auto-delete them when they appear deactivated.',
    invitationCommunities: 'Invitation post communities',
    invitationCommunitiesHelp:
      'Comma-separated VK community numeric IDs. The bot posts a short text request on each wall.',
    invitationText: 'Invitation post text',
    invitationTextHelp:
      'Text added together with your avatar to each invitation post. Default: «Приму заявки в друзья.»',
    sshHost: 'SSH host',
    sshUser: 'SSH user',
    sshPort: 'SSH port',
    sshKeyPath: 'SSH private key path',
    sshKeyHelp:
      'Path to the private key on this machine. Never read by the bot — only used by the SSH client when you click Install.',
    isolation: 'Isolation',
    isolationDocker: 'docker (heavier, fully isolated)',
    isolationScreen: 'screen (lightweight, requires GNU screen)',
    serverGenerate: 'Generate install script',
    serverScriptLabel: 'Generated install script',
    log: 'Log',
    features: 'Features',
    featureOnlineStatus: 'Keep online status while running',
    featureAcceptFriendRequests: 'Auto-accept friend requests',
    featureDeleteDeactivated: 'Delete deactivated/blocked friends',
    featureDeleteOutgoing: 'Cancel outgoing friend requests',
    featureSendInvitationPosts: 'Post friend-request invitations',
    featureSendBirthday: 'Send birthday congratulations',
    runningHint:
      'The bot is running in the background. Logs appear below as they arrive. You can leave this window open or stop the bot.',
  },
  ru: {
    appTitle: 'VK Bot Desktop',
    mode: 'Режим',
    modeLocal: 'Локальный',
    modeServer: 'Сервер (SSH + Docker)',
    theme: 'Тема',
    themeAuto: 'Авто',
    themeLight: 'Светлая',
    themeDark: 'Тёмная',
    language: 'Язык',
    start: 'Запустить',
    stop: 'Остановить',
    saveConfig: 'Сохранить настройки',
    vkToken: 'VK access token',
    vkTokenHelp:
      'Используется ботом для вызовов VK API. Получите на https://vkhost.github.io/. Хранится только локально и скрывается во всех логах.',
    priorityFriendIds: 'Приоритетные ID друзей',
    priorityFriendIdsHelp:
      'ID пользователей через запятую. Бот всегда отправит им заявку и не удалит их при автоочистке.',
    invitationCommunities: 'Сообщества для постов-приглашений',
    invitationCommunitiesHelp:
      'ID сообществ через запятую. Бот публикует короткий текст с заявкой в друзья на стене каждого.',
    invitationText: 'Текст приглашения',
    invitationTextHelp:
      'Текст, который публикуется вместе с аватаром на стене сообществ. По умолчанию: «Приму заявки в друзья.»',
    sshHost: 'SSH хост',
    sshUser: 'SSH пользователь',
    sshPort: 'SSH порт',
    sshKeyPath: 'Путь к приватному SSH-ключу',
    sshKeyHelp:
      'Путь к ключу на этой машине. Бот не читает ключ — он используется только SSH-клиентом при установке.',
    isolation: 'Изоляция',
    isolationDocker: 'docker (тяжелее, полная изоляция)',
    isolationScreen: 'screen (лёгкий, требует GNU screen)',
    serverGenerate: 'Сгенерировать скрипт установки',
    serverScriptLabel: 'Сгенерированный скрипт',
    log: 'Журнал',
    features: 'Функции',
    featureOnlineStatus: 'Поддерживать статус «в сети»',
    featureAcceptFriendRequests: 'Автоматически принимать заявки в друзья',
    featureDeleteDeactivated: 'Удалять заблокированных друзей',
    featureDeleteOutgoing: 'Отменять исходящие заявки в друзья',
    featureSendInvitationPosts: 'Публиковать приглашения в сообществах',
    featureSendBirthday: 'Поздравлять с днём рождения',
    runningHint:
      'Бот работает в фоне. Журнал обновляется автоматически. Окно можно оставить открытым или остановить бота.',
  },
};

export function detectLocale(navigatorLanguage) {
  const lang = (navigatorLanguage || '').toLowerCase();
  if (lang.startsWith('ru')) {
    return 'ru';
  }
  return 'en';
}

export function translate(locale, key) {
  const dict = TRANSLATIONS[locale] || TRANSLATIONS.en;
  return dict[key] ?? TRANSLATIONS.en[key] ?? key;
}
