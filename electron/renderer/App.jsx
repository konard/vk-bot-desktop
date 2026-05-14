import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { detectLocale, translate } from './i18n.js';
import { copyTextToClipboard } from './clipboard.js';
import {
  applyTheme,
  loadStoredTheme,
  persistTheme,
  resolveTheme,
  watchSystemTheme,
} from './theme.js';
import { KATE_MOBILE_TOKEN_URL, extractVkAccessToken } from './vk-token.js';
import { maskVkToken } from './vk-token-mask.js';

const DEFAULT_INVITATIONS = [
  'Приму заявки в друзья.',
  'Жду заявку в друзья — давай знакомиться.',
  'Если хочется пообщаться — добавляйтесь в друзья.',
  'Принимаю заявки в друзья.',
  'Можно подружиться. Жду заявку в друзья.',
  'Принимаю заявки в друзья — пишите, познакомимся.',
  'Заявки в друзья приветствуются.',
  'Добавляйтесь в друзья — будет приятно пообщаться.',
  'Новые друзья приветствуются. Заявки принимаются.',
  'Жду заявок в друзья — давайте знакомиться.',
];

const DEFAULT_GREETINGS = [
  '🎉 Поздравляю с днём рождения!',
  'С днём рождения! 🎂',
  '🎈 С днём рождения! Хорошего праздника.',
  'С днём рождения! Желаю всего самого лучшего. 🌟',
  '🥳 С днём рождения!',
  'С днём рождения! Счастья и здоровья. 💐',
  '🎁 С днём рождения! Пусть всё получится.',
  'С днём рождения! Радости и улыбок. ☀️',
  'С днём рождения! Пусть мечты сбываются. ✨',
  'С днём рождения! Удачи во всём. 🍀',
];

const DEFAULT_INVITATION_COMMUNITIES = [
  64758790, 34985835, 24261502, 53294903, 33764742, 8337923, 94946045,
  194360448, 39130136, 198580397, 195285978, 47350356, 61413825, 30345825,
  180442247, 214787806,
];

const FEATURE_KEYS = [
  ['onlineStatus', 'featureOnlineStatus'],
  ['acceptFriendRequests', 'featureAcceptFriendRequests'],
  ['deleteDeactivatedFriends', 'featureDeleteDeactivated'],
  ['deleteOutgoingFriendRequests', 'featureDeleteOutgoing'],
  ['sendInvitationPosts', 'featureSendInvitationPosts'],
  ['sendBirthdayCongratulations', 'featureSendBirthday'],
];

const AUTO_SAVE_DELAY_MS = 800;

const DEFAULT_FORM = {
  mode: 'local',
  vkToken: '',
  priorityFriendIds: '',
  invitationMessages: DEFAULT_INVITATIONS.join('\n'),
  invitationCommunities: DEFAULT_INVITATION_COMMUNITIES.join('\n'),
  birthdayGreetings: DEFAULT_GREETINGS.join('\n'),
  ssh: { host: '', user: '', port: '22', keyPath: '' },
  isolation: 'screen',
  features: Object.fromEntries(FEATURE_KEYS.map(([key]) => [key, true])),
};

function listToLines(list, fallback) {
  if (Array.isArray(list) && list.length > 0) {
    return list.join('\n');
  }
  return fallback.join('\n');
}

function linesToList(value) {
  return String(value || '')
    .split(/[\r\n,;]+/u)
    .map((line) => line.trim())
    .filter(Boolean);
}

function configToForm(config) {
  if (!config) {
    return DEFAULT_FORM;
  }
  const features = { ...DEFAULT_FORM.features };
  for (const [key] of FEATURE_KEYS) {
    if (config.features && typeof config.features[key] === 'boolean') {
      features[key] = config.features[key];
    }
  }
  return {
    mode: config.mode === 'server' ? 'server' : 'local',
    vkToken: config.vk?.token || '',
    priorityFriendIds: Array.isArray(config.priorityFriendIds)
      ? config.priorityFriendIds.join('\n')
      : '',
    invitationMessages: listToLines(
      config.invitationPost?.messages,
      DEFAULT_INVITATIONS
    ),
    invitationCommunities: listToLines(
      config.invitationPost?.communities,
      DEFAULT_INVITATION_COMMUNITIES.map(String)
    ),
    birthdayGreetings: listToLines(config.birthdayGreetings, DEFAULT_GREETINGS),
    ssh: {
      host: config.server?.host || '',
      user: config.server?.user || '',
      port: String(config.server?.port || '22'),
      keyPath: config.server?.keyPath || '',
    },
    isolation: config.server?.isolation === 'docker' ? 'docker' : 'screen',
    features,
  };
}

function formToConfig(form) {
  const messages = linesToList(form.invitationMessages);
  return {
    mode: form.mode,
    vk: { token: form.vkToken },
    priorityFriendIds: linesToList(form.priorityFriendIds),
    invitationPost: {
      text: messages[0] || DEFAULT_INVITATIONS[0],
      messages,
      communities: linesToList(form.invitationCommunities),
    },
    birthdayGreetings: linesToList(form.birthdayGreetings),
    server: {
      host: form.ssh.host,
      user: form.ssh.user,
      port: Number(form.ssh.port) || 22,
      keyPath: form.ssh.keyPath,
      isolation: form.isolation,
    },
    features: { ...form.features },
  };
}

function useTheme(api) {
  const [preference, setPreference] = useState(() => loadStoredTheme());
  const [systemTheme, setSystemTheme] = useState('light');

  useEffect(() => {
    let active = true;
    if (api?.getSystemTheme) {
      api
        .getSystemTheme()
        .then((value) => {
          if (active && (value === 'dark' || value === 'light')) {
            setSystemTheme(value);
          }
        })
        .catch(() => {});
    }
    const stop = watchSystemTheme(
      typeof window !== 'undefined' ? window.matchMedia.bind(window) : null,
      (value) => setSystemTheme(value)
    );
    return () => {
      active = false;
      stop();
    };
  }, [api]);

  useEffect(() => {
    applyTheme(
      document.documentElement,
      resolveTheme({ preference, systemTheme })
    );
  }, [preference, systemTheme]);

  const updatePreference = useCallback((value) => {
    setPreference(value);
    persistTheme(value);
  }, []);

  return [preference, updatePreference];
}

function useLocale(api) {
  const [locale, setLocale] = useState(() => {
    if (typeof navigator !== 'undefined') {
      return detectLocale(navigator.language);
    }
    return 'en';
  });

  useEffect(() => {
    if (!api?.getSystemLocale) {
      return undefined;
    }
    let active = true;
    api
      .getSystemLocale()
      .then((value) => {
        if (active && (value === 'ru' || value === 'en')) {
          setLocale(value);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [api]);

  return [locale, setLocale];
}

function FeatureCheckbox({ id, checked, onChange, label }) {
  return (
    <label className="feature-row">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />{' '}
      {label}
    </label>
  );
}

function Section({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="section">
      <button
        type="button"
        className="section-toggle"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="section-toggle-arrow">{open ? '▼' : '▶'}</span>
        <span>{title}</span>
      </button>
      {open ? <div className="section-body">{children}</div> : null}
    </div>
  );
}

function SegmentedControl({ label, value, options, onChange, className = '' }) {
  return (
    <div className={`segmented-field ${className}`.trim()}>
      <span className="segmented-label">{label}</span>
      <div className="segmented-control" role="group" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={value === option.value ? 'active' : ''}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function StatsBanner({ stats, t }) {
  const total = Number(stats?.total?.acceptedFriends || 0);
  const month = Number(stats?.month?.acceptedFriends || 0);
  const week = Number(stats?.week?.acceptedFriends || 0);
  const initial = Number(stats?.total?.initialFriendsCount ?? -1);
  if (total <= 0) {
    return null;
  }
  return (
    <div className="stats-banner" role="status">
      <strong>{t('statsTitle')}</strong>
      <span>
        {t('statsWeek')}: {week}
      </span>
      <span>
        {t('statsMonth')}: {month}
      </span>
      <span>
        {t('statsTotal')}: {total}
      </span>
      {initial >= 0 ? (
        <span className="stats-initial">
          {t('statsInitial')}: {initial}
        </span>
      ) : null}
    </div>
  );
}

function Toasts({ toasts }) {
  if (!toasts || toasts.length === 0) {
    return null;
  }
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.kind || 'info'}`}>
          {toast.text}
        </div>
      ))}
    </div>
  );
}

function AutosizeTextarea({ id, value, onChange, rows = 3, ariaLabel }) {
  const ref = useRef(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }
    // Only autosize while the user has not manually resized. We detect a
    // manual resize by watching for style.height being set externally.
    const previous = node.style.height;
    node.style.height = 'auto';
    const next = `${node.scrollHeight + 2}px`;
    node.style.height = next;
    // If the browser ignored us (e.g. very small viewports), fall back.
    if (!node.style.height) {
      node.style.height = previous;
    }
  }, [value]);
  return (
    <textarea
      ref={ref}
      id={id}
      rows={rows}
      value={value}
      aria-label={ariaLabel}
      onChange={(event) => onChange(event.target.value)}
      className="autosize"
    />
  );
}

const THEME_EMOJI = { auto: '🌓', light: '☀️', dark: '🌙' };
const LOCALE_EMOJI = { en: '🇬🇧', ru: '🇷🇺' };
const MODE_EMOJI = { local: '💻', server: '🌐' };

function TokenField({
  t,
  token,
  validation,
  validating,
  onChange,
  onReset,
  onOpenTokenUrl,
}) {
  const [focused, setFocused] = useState(false);
  const masked = maskVkToken(token);
  const display = focused ? token : masked;
  let icon = '·';
  let iconClass = 'token-validity unknown';
  if (validating) {
    icon = '…';
    iconClass = 'token-validity checking';
  } else if (validation?.valid) {
    icon = '✓';
    iconClass = 'token-validity valid';
  } else if (token && validation && !validation.valid) {
    icon = '✗';
    iconClass = 'token-validity invalid';
  }
  return (
    <div className="field token-field">
      <label htmlFor="vk-token">{t('vkToken')}</label>
      <div className="token-row">
        <input
          id="vk-token"
          type={focused ? 'text' : 'password'}
          autoComplete="off"
          spellCheck={false}
          value={focused ? token : display}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(event) => onChange(event.target.value)}
        />
        <span className={iconClass} aria-hidden="true" title={icon}>
          {icon}
        </span>
        <button
          type="button"
          className="secondary compact"
          onClick={() => onOpenTokenUrl(KATE_MOBILE_TOKEN_URL)}
        >
          {t('getKateMobileToken')}
        </button>
        <button
          type="button"
          className="secondary compact"
          onClick={onReset}
          disabled={!token}
        >
          {t('resetToken')}
        </button>
      </div>
      <span className="help">{t('vkTokenHelp')}</span>
      {validation && token && !validation.valid && !validating ? (
        <span className="help token-help-warn">
          {t('tokenInvalidHelp')}
          {validation.message ? ` (${validation.message})` : ''}
        </span>
      ) : null}
      {validation && validation.valid ? (
        <span className="help token-help-ok">
          {t('tokenValidHelp')}
          {validation.firstName
            ? ` — ${validation.firstName} ${validation.lastName || ''}`.trim()
            : ''}
        </span>
      ) : null}
    </div>
  );
}

function HeaderControls({
  t,
  locale,
  setLocale,
  theme,
  setTheme,
  mode,
  setMode,
  running,
  botBusy,
  tokenValid,
  onToggleRunning,
}) {
  const stateEmoji = botBusy ? '⏳' : running ? '⏸️' : '▶️';
  const stateLabel = botBusy ? t('working') : running ? t('stop') : t('start');
  return (
    <header className="app-header">
      <div className="header-row">
        <label className="header-control header-left">
          <span className="header-control-label">{t('language')}</span>
          <select
            value={locale}
            onChange={(event) => setLocale(event.target.value)}
            aria-label={t('language')}
          >
            <option value="en">{LOCALE_EMOJI.en} English</option>
            <option value="ru">{LOCALE_EMOJI.ru} Русский</option>
          </select>
        </label>
        <div className="header-control header-center">
          <SegmentedControl
            label={t('mode')}
            value={mode}
            className="mode-segment"
            onChange={setMode}
            options={[
              {
                value: 'local',
                label: `${MODE_EMOJI.local} ${t('modeLocal')}`,
              },
              {
                value: 'server',
                label: `${MODE_EMOJI.server} ${t('modeServer')}`,
              },
            ]}
          />
        </div>
        <label className="header-control header-right">
          <span className="header-control-label">{t('theme')}</span>
          <select
            value={theme}
            onChange={(event) => setTheme(event.target.value)}
            aria-label={t('theme')}
          >
            <option value="auto">
              {THEME_EMOJI.auto} {t('themeAuto')}
            </option>
            <option value="light">
              {THEME_EMOJI.light} {t('themeLight')}
            </option>
            <option value="dark">
              {THEME_EMOJI.dark} {t('themeDark')}
            </option>
          </select>
        </label>
      </div>
      <div className="start-row">
        <button
          type="button"
          className={`run-toggle big ${running ? 'danger' : ''}`.trim()}
          onClick={onToggleRunning}
          disabled={botBusy || (!running && !tokenValid)}
          aria-label={stateLabel}
          title={!tokenValid && !running ? t('tokenRequiredHelp') : stateLabel}
        >
          <span className="run-toggle-emoji" aria-hidden="true">
            {stateEmoji}
          </span>
          <span className="run-toggle-text">{stateLabel}</span>
        </button>
      </div>
    </header>
  );
}

export default function App({ api }) {
  const [locale, setLocale] = useLocale(api);
  const [theme, setTheme] = useTheme(api);
  const t = useCallback((key) => translate(locale, key), [locale]);

  const [form, setForm] = useState(DEFAULT_FORM);
  const [running, setRunning] = useState(false);
  const [botBusy, setBotBusy] = useState(false);
  const [logLines, setLogLines] = useState([]);
  const [scriptPreview, setScriptPreview] = useState('');
  const [stats, setStats] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [tokenValidation, setTokenValidation] = useState(null);
  const [tokenValidating, setTokenValidating] = useState(false);
  const [hasPrefilled, setHasPrefilled] = useState(false);
  const logRef = useRef(null);
  const toastIdRef = useRef(0);
  const formRef = useRef(form);
  const savedConfigRef = useRef('');
  const autoSaveReadyRef = useRef(false);

  const showToast = useCallback((text, kind = 'info') => {
    toastIdRef.current += 1;
    const id = toastIdRef.current;
    setToasts((prev) => [...prev, { id, text, kind }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3500);
  }, []);

  const logText = useMemo(() => logLines.join(''), [logLines]);

  useEffect(() => {
    formRef.current = form;
  }, [form]);

  const refreshStats = useCallback(async () => {
    if (!api?.readStats) {
      return;
    }
    try {
      const snapshot = await api.readStats();
      setStats(snapshot);
    } catch {
      // ignore
    }
  }, [api]);

  useEffect(() => {
    if (!api?.loadConfig) {
      autoSaveReadyRef.current = true;
      return undefined;
    }
    let active = true;
    api
      .loadConfig()
      .then((config) => {
        if (!active) {
          return;
        }
        const nextForm = configToForm(config);
        nextForm.vkToken = extractVkAccessToken(nextForm.vkToken);
        setForm(nextForm);
        savedConfigRef.current = JSON.stringify(formToConfig(nextForm));
        // Only flag as already-prefilled when the stored config already
        // contains a non-default communities list; otherwise we still want
        // to prefill outgoing IDs into priority on first successful
        // token validation.
        setHasPrefilled(
          Array.isArray(config?.invitationPost?.communities) &&
            config.invitationPost.communities.length > 0
        );
        autoSaveReadyRef.current = true;
      })
      .catch(() => {
        if (active) {
          autoSaveReadyRef.current = true;
        }
      });
    return () => {
      active = false;
    };
  }, [api]);

  useEffect(() => {
    refreshStats();
    const id = setInterval(refreshStats, 15000);
    return () => clearInterval(id);
  }, [refreshStats]);

  const refreshBotStatus = useCallback(async () => {
    if (!api?.getStatus) {
      return;
    }
    try {
      const status = await api.getStatus();
      setRunning(Boolean(status?.running));
    } catch {
      // ignore
    }
  }, [api]);

  useEffect(() => {
    refreshBotStatus();
    const id = setInterval(refreshBotStatus, 3000);
    return () => clearInterval(id);
  }, [refreshBotStatus]);

  useEffect(() => {
    if (!api?.onStatus) {
      return undefined;
    }
    return api.onStatus((status) => {
      setRunning(Boolean(status?.running));
    });
  }, [api]);

  useEffect(() => {
    if (!api?.onLog) {
      return undefined;
    }
    return api.onLog((chunk) => {
      setLogLines((prev) => {
        const next = prev.concat(String(chunk));
        if (next.length > 500) {
          return next.slice(-500);
        }
        return next;
      });
    });
  }, [api]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logLines]);

  const onField = useCallback((path, value) => {
    setForm((prev) => {
      const next = { ...prev };
      if (path.length === 1) {
        next[path[0]] = value;
        return next;
      }
      const [head, ...rest] = path;
      next[head] = { ...prev[head] };
      let cursor = next[head];
      for (let i = 0; i < rest.length - 1; i += 1) {
        cursor[rest[i]] = { ...cursor[rest[i]] };
        cursor = cursor[rest[i]];
      }
      cursor[rest[rest.length - 1]] = value;
      return next;
    });
  }, []);

  // Validate token after it stops changing.
  useEffect(() => {
    if (!api?.validateToken) {
      return undefined;
    }
    const token = form.vkToken.trim();
    if (!token) {
      setTokenValidation(null);
      setTokenValidating(false);
      return undefined;
    }
    setTokenValidating(true);
    const id = setTimeout(async () => {
      try {
        const result = await api.validateToken(token);
        setTokenValidation(result);
      } catch {
        setTokenValidation({ valid: false, reason: 'exception' });
      } finally {
        setTokenValidating(false);
      }
    }, 500);
    return () => {
      clearTimeout(id);
      setTokenValidating(false);
    };
  }, [api, form.vkToken]);

  // Auto-save every field change after a debounce. Replaces the old
  // explicit "Save configuration" button. We snapshot the serialized
  // config so we don't fire a save when only ephemeral state changes.
  useEffect(() => {
    if (!autoSaveReadyRef.current || !api?.saveConfig) {
      return undefined;
    }
    const serialized = JSON.stringify(formToConfig(form));
    if (serialized === savedConfigRef.current) {
      return undefined;
    }
    const id = setTimeout(async () => {
      try {
        await api.saveConfig(JSON.parse(serialized));
        savedConfigRef.current = serialized;
        showToast(t('notifConfigSaved'), 'success');
      } catch {
        showToast(t('notifConfigSaveFailed'), 'warn');
      }
    }, AUTO_SAVE_DELAY_MS);
    return () => clearTimeout(id);
  }, [api, form, showToast, t]);

  const onTokenChange = useCallback(
    (value) => {
      onField(['vkToken'], extractVkAccessToken(value));
    },
    [onField]
  );

  useEffect(() => {
    if (!api?.onToken) {
      return undefined;
    }
    return api.onToken((token) => {
      onTokenChange(token);
      showToast(t('notifTokenReceived'), 'success');
    });
  }, [api, onTokenChange, showToast, t]);

  const onResetToken = useCallback(async () => {
    setTokenValidation(null);
    applyAndSave((prev) => ({ ...prev, vkToken: '' }), 'notifTokenCleared');
    if (running && api?.stopLocal) {
      try {
        await api.stopLocal();
        showToast(t('notifStopped'), 'warn');
      } catch {
        // ignore
      }
    }
  }, [api, applyAndSave, running, showToast, t]);

  const onOpenTokenUrl = useCallback(
    async (url) => {
      try {
        if (api?.openTokenUrl) {
          await api.openTokenUrl(url);
        } else if (typeof window !== 'undefined') {
          window.open(url, '_blank', 'noopener,noreferrer');
        }
        showToast(t('notifTokenUrlOpened'), 'info');
      } catch {
        showToast(t('notifTokenUrlFailed'), 'warn');
      }
    },
    [api, showToast, t]
  );

  const tokenValid = Boolean(tokenValidation?.valid);

  const onStart = useCallback(async () => {
    if (!api?.startLocal) {
      return;
    }
    setBotBusy(true);
    try {
      const result = await api.startLocal(formToConfig(form));
      setRunning(true);
      if (result?.stoppedOther) {
        showToast(t('notifSwitched'), 'info');
      }
      showToast(t('notifStarted'), 'success');
      refreshStats();
      refreshBotStatus();
    } catch {
      showToast(t('notifStartFailed'), 'warn');
      refreshBotStatus();
    } finally {
      setBotBusy(false);
    }
  }, [api, form, refreshBotStatus, refreshStats, showToast, t]);

  const onStop = useCallback(async () => {
    if (!api?.stopLocal) {
      return;
    }
    setBotBusy(true);
    try {
      await api.stopLocal();
      setRunning(false);
      showToast(t('notifStopped'), 'warn');
      refreshBotStatus();
    } finally {
      setBotBusy(false);
    }
  }, [api, refreshBotStatus, showToast, t]);

  const onToggleRunning = useCallback(() => {
    if (running) {
      onStop();
    } else {
      onStart();
    }
  }, [onStart, onStop, running]);

  const onCopyLog = useCallback(async () => {
    if (!logText) {
      showToast(t('notifNoLogToCopy'), 'info');
      return;
    }
    try {
      await copyTextToClipboard(logText, { api });
      showToast(t('notifLogCopied'), 'success');
    } catch {
      showToast(t('notifLogCopyFailed'), 'warn');
    }
  }, [api, logText, showToast, t]);

  const onClearLog = useCallback(() => {
    setLogLines([]);
    showToast(t('notifLogCleared'), 'info');
  }, [showToast, t]);

  const onGenerateScript = useCallback(async () => {
    if (!api?.buildServerScript) {
      return;
    }
    const result = await api.buildServerScript({
      remoteDir: '~/vk-bot-desktop',
      isolation: form.isolation,
      configLino: '',
    });
    setScriptPreview(result?.script || '');
  }, [api, form]);

  const onFillPriorityFromOutgoing = useCallback(async () => {
    if (!api?.fetchOutgoing) {
      return;
    }
    const ids = await api.fetchOutgoing(form.vkToken);
    if (Array.isArray(ids) && ids.length > 0) {
      setForm((prev) => ({
        ...prev,
        priorityFriendIds: ids.join('\n'),
      }));
      showToast(t('notifPriorityFilled'), 'success');
    } else {
      showToast(t('notifPriorityEmpty'), 'info');
    }
  }, [api, form.vkToken, showToast, t]);

  // Reset/clear writes the new form to disk immediately and notifies the
  // user. Without this, the debounced auto-save would silently no-op when
  // the new form happens to round-trip to the same value as the snapshot
  // (e.g. defaults that were never persisted), leaving the user thinking
  // the button did nothing.
  const flushSave = useCallback(
    async (nextForm, successToastKey) => {
      if (!api?.saveConfig) {
        return;
      }
      const serialized = JSON.stringify(formToConfig(nextForm));
      try {
        await api.saveConfig(JSON.parse(serialized));
        savedConfigRef.current = serialized;
        showToast(t(successToastKey), 'success');
      } catch {
        showToast(t('notifConfigSaveFailed'), 'warn');
      }
    },
    [api, showToast, t]
  );

  const applyAndSave = useCallback(
    (mutate, toastKey) => {
      const next = mutate(formRef.current);
      setForm(next);
      flushSave(next, toastKey);
    },
    [flushSave]
  );

  const onClearPriority = useCallback(() => {
    applyAndSave(
      (prev) => ({ ...prev, priorityFriendIds: '' }),
      'notifListCleared'
    );
  }, [applyAndSave]);

  const onResetInvitationMessages = useCallback(() => {
    applyAndSave(
      (prev) => ({
        ...prev,
        invitationMessages: DEFAULT_INVITATIONS.join('\n'),
      }),
      'notifResetToDefault'
    );
  }, [applyAndSave]);
  const onClearInvitationMessages = useCallback(() => {
    applyAndSave(
      (prev) => ({ ...prev, invitationMessages: '' }),
      'notifListCleared'
    );
  }, [applyAndSave]);
  const onResetInvitationCommunities = useCallback(() => {
    applyAndSave(
      (prev) => ({
        ...prev,
        invitationCommunities: DEFAULT_INVITATION_COMMUNITIES.join('\n'),
      }),
      'notifResetToDefault'
    );
  }, [applyAndSave]);
  const onClearInvitationCommunities = useCallback(() => {
    applyAndSave(
      (prev) => ({ ...prev, invitationCommunities: '' }),
      'notifListCleared'
    );
  }, [applyAndSave]);
  const onResetBirthdayGreetings = useCallback(() => {
    applyAndSave(
      (prev) => ({
        ...prev,
        birthdayGreetings: DEFAULT_GREETINGS.join('\n'),
      }),
      'notifResetToDefault'
    );
  }, [applyAndSave]);
  const onClearBirthdayGreetings = useCallback(() => {
    applyAndSave(
      (prev) => ({ ...prev, birthdayGreetings: '' }),
      'notifListCleared'
    );
  }, [applyAndSave]);

  // Prefill priority IDs from outgoing requests the first time the
  // token is validated as good.
  useEffect(() => {
    if (!tokenValid || hasPrefilled || !api?.fetchOutgoing) {
      return;
    }
    let active = true;
    api
      .fetchOutgoing(form.vkToken)
      .then((ids) => {
        if (!active) {
          return;
        }
        if (Array.isArray(ids) && ids.length > 0) {
          setForm((prev) => {
            if (prev.priorityFriendIds.trim()) {
              return prev;
            }
            return { ...prev, priorityFriendIds: ids.join('\n') };
          });
          showToast(t('notifPriorityPrefilled'), 'info');
        }
        setHasPrefilled(true);
      })
      .catch(() => {
        if (active) {
          setHasPrefilled(true);
        }
      });
    return () => {
      active = false;
    };
  }, [api, form.vkToken, hasPrefilled, showToast, t, tokenValid]);

  const features = useMemo(
    () =>
      FEATURE_KEYS.map(([key, labelKey]) => (
        <FeatureCheckbox
          key={key}
          id={`feature-${key}`}
          checked={form.features[key]}
          label={t(labelKey)}
          onChange={(value) => onField(['features', key], value)}
        />
      )),
    [form.features, onField, t]
  );

  return (
    <div className="app">
      <Toasts toasts={toasts} />
      <HeaderControls
        t={t}
        locale={locale}
        setLocale={setLocale}
        theme={theme}
        setTheme={setTheme}
        mode={form.mode}
        setMode={(value) => onField(['mode'], value)}
        running={running}
        botBusy={botBusy}
        tokenValid={tokenValid}
        onToggleRunning={onToggleRunning}
      />
      <StatsBanner stats={stats} t={t} />

      <TokenField
        t={t}
        token={form.vkToken}
        validation={tokenValidation}
        validating={tokenValidating}
        onChange={onTokenChange}
        onReset={onResetToken}
        onOpenTokenUrl={onOpenTokenUrl}
      />

      <div className="section">
        <h2>{t('features')}</h2>
        <div className="feature-list">{features}</div>
      </div>

      <Section title={t('sectionPriority')}>
        <div className="field">
          <label htmlFor="priority-ids">{t('priorityFriendIds')}</label>
          <AutosizeTextarea
            id="priority-ids"
            value={form.priorityFriendIds}
            onChange={(value) => onField(['priorityFriendIds'], value)}
            ariaLabel={t('priorityFriendIds')}
          />
          <span className="help">{t('priorityFriendIdsHelp')}</span>
          <div className="inline-actions">
            <button
              type="button"
              className="secondary"
              onClick={onFillPriorityFromOutgoing}
              disabled={!tokenValid}
            >
              {t('fillFromOutgoing')}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={onClearPriority}
            >
              {t('clearList')}
            </button>
          </div>
        </div>
      </Section>

      <Section title={t('sectionInvitations')}>
        <div className="field">
          <label htmlFor="invitation-messages">{t('invitationMessages')}</label>
          <AutosizeTextarea
            id="invitation-messages"
            value={form.invitationMessages}
            onChange={(value) => onField(['invitationMessages'], value)}
            rows={6}
            ariaLabel={t('invitationMessages')}
          />
          <span className="help">{t('invitationMessagesHelp')}</span>
          <div className="inline-actions">
            <button
              type="button"
              className="secondary"
              onClick={onResetInvitationMessages}
            >
              {t('resetToDefault')}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={onClearInvitationMessages}
            >
              {t('clearList')}
            </button>
          </div>
        </div>
        <div className="field">
          <label htmlFor="invite-communities">
            {t('invitationCommunities')}
          </label>
          <AutosizeTextarea
            id="invite-communities"
            value={form.invitationCommunities}
            onChange={(value) => onField(['invitationCommunities'], value)}
            ariaLabel={t('invitationCommunities')}
          />
          <span className="help">{t('invitationCommunitiesHelp')}</span>
          <div className="inline-actions">
            <button
              type="button"
              className="secondary"
              onClick={onResetInvitationCommunities}
            >
              {t('resetToDefault')}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={onClearInvitationCommunities}
            >
              {t('clearList')}
            </button>
          </div>
        </div>
      </Section>

      <Section title={t('sectionGreetings')}>
        <div className="field">
          <label htmlFor="birthday-greetings">
            {t('birthdayGreetingsLabel')}
          </label>
          <AutosizeTextarea
            id="birthday-greetings"
            value={form.birthdayGreetings}
            onChange={(value) => onField(['birthdayGreetings'], value)}
            rows={6}
            ariaLabel={t('birthdayGreetingsLabel')}
          />
          <span className="help">{t('birthdayGreetingsHelp')}</span>
          <div className="inline-actions">
            <button
              type="button"
              className="secondary"
              onClick={onResetBirthdayGreetings}
            >
              {t('resetToDefault')}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={onClearBirthdayGreetings}
            >
              {t('clearList')}
            </button>
          </div>
        </div>
      </Section>

      {form.mode === 'server' ? (
        <Section title={t('sectionServer')} defaultOpen>
          <div className="row">
            <div className="field">
              <label htmlFor="ssh-host">{t('sshHost')}</label>
              <input
                id="ssh-host"
                value={form.ssh.host}
                onChange={(event) =>
                  onField(['ssh', 'host'], event.target.value)
                }
              />
            </div>
            <div className="field">
              <label htmlFor="ssh-user">{t('sshUser')}</label>
              <input
                id="ssh-user"
                value={form.ssh.user}
                onChange={(event) =>
                  onField(['ssh', 'user'], event.target.value)
                }
              />
            </div>
            <div className="field">
              <label htmlFor="ssh-port">{t('sshPort')}</label>
              <input
                id="ssh-port"
                value={form.ssh.port}
                onChange={(event) =>
                  onField(['ssh', 'port'], event.target.value)
                }
              />
            </div>
            <div className="field">
              <label htmlFor="ssh-key">{t('sshKeyPath')}</label>
              <input
                id="ssh-key"
                value={form.ssh.keyPath}
                onChange={(event) =>
                  onField(['ssh', 'keyPath'], event.target.value)
                }
              />
              <span className="help">{t('sshKeyHelp')}</span>
            </div>
          </div>

          <div className="field">
            <label htmlFor="isolation">{t('isolation')}</label>
            <select
              id="isolation"
              value={form.isolation}
              onChange={(event) => onField(['isolation'], event.target.value)}
            >
              <option value="screen">{t('isolationScreen')}</option>
              <option value="docker">{t('isolationDocker')}</option>
            </select>
          </div>

          <button
            type="button"
            className="secondary"
            onClick={onGenerateScript}
          >
            {t('serverGenerate')}
          </button>

          {scriptPreview ? (
            <div className="field" style={{ marginTop: 16 }}>
              <label>{t('serverScriptLabel')}</label>
              <textarea readOnly rows={10} value={scriptPreview} />
            </div>
          ) : null}
        </Section>
      ) : null}

      <div className="section">
        <div className="section-heading">
          <h2>{t('log')}</h2>
          <div className="inline-actions">
            <button
              type="button"
              className="secondary compact"
              onClick={onCopyLog}
              disabled={!logText}
            >
              {t('copyLog')}
            </button>
            <button
              type="button"
              className="secondary compact"
              onClick={onClearLog}
              disabled={!logText}
            >
              {t('clearLog')}
            </button>
          </div>
        </div>
        {running ? (
          <p className="help" style={{ marginTop: 0 }}>
            {t('runningHint')}
          </p>
        ) : null}
        <div className="log" ref={logRef}>
          {logLines.join('')}
        </div>
      </div>
    </div>
  );
}
