import logger from '../logger.js';
import {
  BIRTHDAY_GREETINGS,
  pickBirthdayGreeting,
} from '../messages/birthday-greetings.js';

const TWENTY_FOUR_HOURS_SECONDS = 24 * 60 * 60;

export function findBirthdayFriends({ friends, today = new Date() } = {}) {
  if (!Array.isArray(friends)) {
    return [];
  }
  const day = today.getDate();
  const month = today.getMonth() + 1;
  const matches = [];
  for (const friend of friends) {
    if (!friend.bdate) {
      continue;
    }
    const parts = String(friend.bdate).split('.');
    if (parts.length < 2) {
      continue;
    }
    const friendDay = Number(parts[0]);
    const friendMonth = Number(parts[1]);
    if (friendDay === day && friendMonth === month) {
      matches.push(friend);
    }
  }
  return matches;
}

/**
 * True if the conversation with `userId` has activity in the last
 * `withinSeconds` seconds. Used to avoid sending the canned birthday greeting
 * when the user has already exchanged messages with the friend today.
 *
 * Always returns `false` if the lookup fails so we never *block* a greeting on
 * a transient API error.
 */
export async function recentlyMessaged({
  vk,
  userId,
  withinSeconds = TWENTY_FOUR_HOURS_SECONDS,
  now = Date.now(),
} = {}) {
  if (!vk?.api?.messages?.getHistory) {
    return false;
  }
  try {
    const history = await vk.api.messages.getHistory({
      user_id: userId,
      count: 1,
    });
    const items = history?.items || [];
    if (items.length === 0) {
      return false;
    }
    const lastDate = Number(items[0]?.date) || 0;
    if (lastDate <= 0) {
      return false;
    }
    const cutoff = Math.floor(now / 1000) - withinSeconds;
    return lastDate >= cutoff;
  } catch (error) {
    logger.warn(
      'Could not read message history for birthday dedup; greeting anyway',
      { userId, error }
    );
    return false;
  }
}

export async function sendBirthdayCongratulations({ vk, config }) {
  if (config.features?.sendBirthdayCongratulations === false) {
    return;
  }
  const friends = await collectFriendsWithBirthday({ vk });
  const targets = findBirthdayFriends({ friends });
  const greetings = config.birthdayGreetings?.length
    ? config.birthdayGreetings
    : BIRTHDAY_GREETINGS;
  logger.info('Birthday targets identified', { count: targets.length });
  for (const friend of targets) {
    if (await recentlyMessaged({ vk, userId: friend.id })) {
      logger.info(
        'Skipping birthday greeting: recent conversation in last 24 hours',
        { userId: friend.id }
      );
      continue;
    }
    try {
      const message = pickBirthdayGreeting(Math.random, greetings);
      await vk.api.messages.send({
        user_id: friend.id,
        message,
        random_id: Math.floor(Math.random() * 1e9),
      });
      logger.info('Birthday message sent', {
        userId: friend.id,
        message,
      });
    } catch (error) {
      logger.warn('Could not send birthday message', {
        userId: friend.id,
        error,
      });
    }
  }
}

async function collectFriendsWithBirthday({ vk }) {
  const items = [];
  for (let offset = 0; offset < 10000; offset += 5000) {
    const response = await vk.api.friends.get({
      count: 5000,
      offset,
      fields: 'bdate',
    });
    if (!response.items || response.items.length === 0) {
      break;
    }
    for (const item of response.items) {
      items.push(typeof item === 'object' ? item : { id: item });
    }
    if (response.items.length < 5000) {
      break;
    }
  }
  return items;
}
