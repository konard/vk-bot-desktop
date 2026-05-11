/**
 * Tiny translation table for the renderer. Two locales (en, ru), one dictionary.
 * Auto-detected from `navigator.language` and overridable via the UI.
 */

export const TRANSLATIONS = {
  en: {
    appTitle: 'VK Bot Desktop',
    mode: 'Mode',
    modeLocal: 'Local',
    modeServer: 'Remote',
    execution: 'Execution',
    statusRunning: 'Running',
    statusStopped: 'Stopped',
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
      'Paste the full VK redirect URL or the token itself. Token changes are saved automatically and kept on this device only.',
    getKateMobileToken: 'Get Kate Mobile token',
    getLocalhostToken: 'Experimental localhost redirect',
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
    statsTitle: 'Accepted friends',
    statsTotal: 'Total',
    statsMonth: 'This month',
    statsWeek: 'This week',
    statsInitial: 'Initial friends count',
    notifStarted: 'Bot started',
    notifStopped: 'Bot stopped',
    notifSwitched: 'Stopped the other instance to avoid duplicates',
    notifConfigSaved: 'Configuration saved',
    notifTokenSaved: 'Token saved to configuration',
    notifTokenCleared: 'Token removed from configuration',
    notifTokenSaveFailed: 'Token was not saved',
    notifTokenReceived: 'Token received from browser',
    notifTokenUrlOpened: 'Token page opened in your browser',
    notifTokenUrlFailed: 'Token page could not be opened',
    notifStartFailed: 'Bot failed to start',
    working: 'Working...',
    sectionPriority: 'Priority friends',
    sectionInvitations: 'Invitation messages',
    sectionGreetings: 'Birthday greetings',
    sectionServer: 'Server (SSH)',
    fillFromOutgoing: 'Pre-fill from current outgoing requests',
    clearList: 'Clear list',
    addItem: 'Add',
    invitationMessages: 'Invitation messages (one per line)',
    invitationMessagesHelp:
      'When the bot posts an invitation, it picks one of these messages at random.',
    birthdayGreetingsLabel: 'Birthday greetings (one per line)',
    birthdayGreetingsHelp:
      'When the bot sends a birthday congratulation, it picks one of these messages at random. Keep them short with at most two emojis.',
  },
  ru: {
    appTitle: 'VK Bot Desktop',
    mode: 'Режим',
    modeLocal: 'Локальный',
    modeServer: 'Удалённый',
    execution: 'Выполнение',
    statusRunning: 'Работает',
    statusStopped: 'Остановлен',
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
      'Вставьте полный URL редиректа VK или сам токен. Изменения токена сохраняются автоматически и остаются только на этом устройстве.',
    getKateMobileToken: 'Получить токен Kate Mobile',
    getLocalhostToken: 'Экспериментальный localhost редирект',
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
    statsTitle: 'Принятые друзья',
    statsTotal: 'Всего',
    statsMonth: 'За месяц',
    statsWeek: 'За неделю',
    statsInitial: 'Друзей было на старте',
    notifStarted: 'Бот запущен',
    notifStopped: 'Бот остановлен',
    notifSwitched: 'Остановил вторую копию, чтобы не было дублирования',
    notifConfigSaved: 'Настройки сохранены',
    notifTokenSaved: 'Токен сохранён в настройках',
    notifTokenCleared: 'Токен удалён из настроек',
    notifTokenSaveFailed: 'Не удалось сохранить токен',
    notifTokenReceived: 'Токен получен из браузера',
    notifTokenUrlOpened: 'Страница токена открыта в браузере',
    notifTokenUrlFailed: 'Не удалось открыть страницу токена',
    notifStartFailed: 'Не удалось запустить бота',
    working: 'Подождите...',
    sectionPriority: 'Приоритетные друзья',
    sectionInvitations: 'Сообщения приглашения',
    sectionGreetings: 'Поздравления с днём рождения',
    sectionServer: 'Сервер (SSH)',
    fillFromOutgoing: 'Заполнить из исходящих заявок',
    clearList: 'Очистить',
    addItem: 'Добавить',
    invitationMessages: 'Сообщения приглашения (по одному на строку)',
    invitationMessagesHelp:
      'При публикации приглашения бот выбирает одно из этих сообщений случайным образом.',
    birthdayGreetingsLabel:
      'Поздравления с днём рождения (по одному на строку)',
    birthdayGreetingsHelp:
      'При отправке поздравления бот случайно выбирает одно из этих сообщений. Старайтесь не больше двух эмоджи в одном сообщении.',
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
