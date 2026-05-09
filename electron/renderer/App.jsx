import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { detectLocale, translate } from './i18n.js';
import {
  applyTheme,
  loadStoredTheme,
  persistTheme,
  resolveTheme,
  watchSystemTheme,
} from './theme.js';

const DEFAULT_INVITATIONS = [
  'Приму заявки в друзья.',
  'Открыт для новых знакомств. Жду заявку.',
  'Если хочется пообщаться — добавляйся в друзья.',
  'Готов принять заявку в друзья.',
  'Можно подружиться. Жду заявку в друзья.',
  'Принимаю заявки в друзья — пиши, познакомимся.',
  'Заявки в друзья приветствуются.',
  'Добавляйся в друзья, рад буду общению.',
  'Открыт для новых друзей. Заявки принимаются.',
  'Жду заявок в друзья — буду рад познакомиться.',
];

const DEFAULT_GREETINGS = [
  '🎉 Поздравляю с днём рождения!',
  'С днём рождения! 🎂',
  '🎈 Поздравляю с праздником!',
  'Желаю всего самого лучшего! 🌟',
  '🥳 С днём рождения!',
  'Счастья и здоровья! 💐',
  '🎁 С днём рождения! Пусть всё получится.',
  'Радости и улыбок! ☀️',
  'С днём рождения! Пусть мечты сбываются. ✨',
  'Поздравляю! Удачи во всём. 🍀',
];

const FEATURE_KEYS = [
  ['onlineStatus', 'featureOnlineStatus'],
  ['acceptFriendRequests', 'featureAcceptFriendRequests'],
  ['deleteDeactivatedFriends', 'featureDeleteDeactivated'],
  ['deleteOutgoingFriendRequests', 'featureDeleteOutgoing'],
  ['sendInvitationPosts', 'featureSendInvitationPosts'],
  ['sendBirthdayCongratulations', 'featureSendBirthday'],
];

const DEFAULT_FORM = {
  mode: 'local',
  vkToken: '',
  priorityFriendIds: '',
  invitationMessages: DEFAULT_INVITATIONS.join('\n'),
  invitationCommunities: '',
  birthdayGreetings: DEFAULT_GREETINGS.join('\n'),
  ssh: { host: '', user: '', port: '22', keyPath: '' },
  isolation: 'screen',
  features: Object.fromEntries(FEATURE_KEYS.map(([key]) => [key, true])),
};

function csvToList(value) {
  return String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function listToCsv(list) {
  return Array.isArray(list) ? list.join(', ') : '';
}

function linesToList(value) {
  return String(value || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function listToLines(list, fallback) {
  if (Array.isArray(list) && list.length > 0) {
    return list.join('\n');
  }
  return fallback.join('\n');
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
    priorityFriendIds: listToCsv(config.priorityFriendIds),
    invitationMessages: listToLines(
      config.invitationPost?.messages,
      DEFAULT_INVITATIONS
    ),
    invitationCommunities: listToCsv(config.invitationPost?.communities),
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
    priorityFriendIds: csvToList(form.priorityFriendIds),
    invitationPost: {
      text: messages[0] || DEFAULT_INVITATIONS[0],
      messages,
      communities: csvToList(form.invitationCommunities),
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

export default function App({ api }) {
  const [locale, setLocale] = useLocale(api);
  const [theme, setTheme] = useTheme(api);
  const t = useCallback((key) => translate(locale, key), [locale]);

  const [form, setForm] = useState(DEFAULT_FORM);
  const [running, setRunning] = useState(false);
  const [logLines, setLogLines] = useState([]);
  const [scriptPreview, setScriptPreview] = useState('');
  const [stats, setStats] = useState(null);
  const [toasts, setToasts] = useState([]);
  const logRef = useRef(null);
  const toastIdRef = useRef(0);

  const showToast = useCallback((text, kind = 'info') => {
    toastIdRef.current += 1;
    const id = toastIdRef.current;
    setToasts((prev) => [...prev, { id, text, kind }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3500);
  }, []);

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
      return;
    }
    api
      .loadConfig()
      .then((config) => setForm(configToForm(config)))
      .catch(() => {});
  }, [api]);

  useEffect(() => {
    refreshStats();
    const id = setInterval(refreshStats, 15000);
    return () => clearInterval(id);
  }, [refreshStats]);

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

  const onSave = useCallback(async () => {
    if (!api?.saveConfig) {
      return;
    }
    await api.saveConfig(formToConfig(form));
  }, [api, form]);

  const onStart = useCallback(async () => {
    if (!api?.startLocal) {
      return;
    }
    const result = await api.startLocal(formToConfig(form));
    setRunning(true);
    if (result?.stoppedOther) {
      showToast(t('notifSwitched'), 'info');
    }
    showToast(t('notifStarted'), 'success');
    refreshStats();
  }, [api, form, refreshStats, showToast, t]);

  const onStop = useCallback(async () => {
    if (!api?.stopLocal) {
      return;
    }
    await api.stopLocal();
    setRunning(false);
    showToast(t('notifStopped'), 'warn');
  }, [api, showToast, t]);

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
        priorityFriendIds: ids.join(', '),
      }));
    }
  }, [api, form.vkToken]);

  const onClearPriority = useCallback(() => {
    setForm((prev) => ({ ...prev, priorityFriendIds: '' }));
  }, []);

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
      <h1>{t('appTitle')}</h1>
      <StatsBanner stats={stats} t={t} />
      <div className="toolbar">
        <label>
          {t('mode')}
          {': '}
          <select
            value={form.mode}
            onChange={(event) => onField(['mode'], event.target.value)}
          >
            <option value="local">{t('modeLocal')}</option>
            <option value="server">{t('modeServer')}</option>
          </select>
        </label>
        <label>
          {t('theme')}
          {': '}
          <select
            value={theme}
            onChange={(event) => setTheme(event.target.value)}
          >
            <option value="auto">{t('themeAuto')}</option>
            <option value="light">{t('themeLight')}</option>
            <option value="dark">{t('themeDark')}</option>
          </select>
        </label>
        <label>
          {t('language')}
          {': '}
          <select
            value={locale}
            onChange={(event) => setLocale(event.target.value)}
          >
            <option value="en">English</option>
            <option value="ru">Русский</option>
          </select>
        </label>
        <button type="button" onClick={onStart} disabled={running}>
          {t('start')}
        </button>
        <button
          type="button"
          className="danger"
          onClick={onStop}
          disabled={!running}
        >
          {t('stop')}
        </button>
        <button type="button" className="secondary" onClick={onSave}>
          {t('saveConfig')}
        </button>
      </div>

      <div className="field">
        <label htmlFor="vk-token">{t('vkToken')}</label>
        <input
          id="vk-token"
          type="password"
          autoComplete="off"
          value={form.vkToken}
          onChange={(event) => onField(['vkToken'], event.target.value)}
        />
        <span className="help">{t('vkTokenHelp')}</span>
      </div>

      <div className="section">
        <h2>{t('features')}</h2>
        <div className="feature-list">{features}</div>
      </div>

      <Section title={t('sectionPriority')}>
        <div className="field">
          <label htmlFor="priority-ids">{t('priorityFriendIds')}</label>
          <textarea
            id="priority-ids"
            rows={3}
            value={form.priorityFriendIds}
            onChange={(event) =>
              onField(['priorityFriendIds'], event.target.value)
            }
          />
          <span className="help">{t('priorityFriendIdsHelp')}</span>
          <div className="row inline-actions">
            <button
              type="button"
              className="secondary"
              onClick={onFillPriorityFromOutgoing}
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
          <textarea
            id="invitation-messages"
            rows={6}
            value={form.invitationMessages}
            onChange={(event) =>
              onField(['invitationMessages'], event.target.value)
            }
          />
          <span className="help">{t('invitationMessagesHelp')}</span>
        </div>
        <div className="field">
          <label htmlFor="invite-communities">
            {t('invitationCommunities')}
          </label>
          <textarea
            id="invite-communities"
            rows={2}
            value={form.invitationCommunities}
            onChange={(event) =>
              onField(['invitationCommunities'], event.target.value)
            }
          />
          <span className="help">{t('invitationCommunitiesHelp')}</span>
        </div>
      </Section>

      <Section title={t('sectionGreetings')}>
        <div className="field">
          <label htmlFor="birthday-greetings">
            {t('birthdayGreetingsLabel')}
          </label>
          <textarea
            id="birthday-greetings"
            rows={6}
            value={form.birthdayGreetings}
            onChange={(event) =>
              onField(['birthdayGreetings'], event.target.value)
            }
          />
          <span className="help">{t('birthdayGreetingsHelp')}</span>
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
        <h2>{t('log')}</h2>
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
