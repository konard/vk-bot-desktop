/**
 * Ten short Russian invitation messages used when posting to community walls.
 * One is picked at random for each post (no consecutive repeats).
 */
export const INVITATION_MESSAGES = [
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

let lastIndex = -1;

export function pickInvitationMessage(
  rng = Math.random,
  list = INVITATION_MESSAGES
) {
  if (!Array.isArray(list) || list.length === 0) {
    return '';
  }
  if (list.length === 1) {
    lastIndex = 0;
    return list[0];
  }
  let index;
  do {
    index = Math.floor(rng() * list.length);
  } while (index === lastIndex);
  lastIndex = index;
  return list[index];
}

export function resetInvitationMessageState() {
  lastIndex = -1;
}
