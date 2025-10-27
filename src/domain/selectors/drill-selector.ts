import { differenceInHours, parseISO } from 'date-fns';
import type { VocabItem } from '../../contracts/models';

/** Options controlling drill queue creation. */
export interface DrillSelectorOptions {
  /** Timestamp representing the current moment for due comparisons. */
  now: Date;
  /** Maximum number of items returned in the queue. */
  limit?: number;
  /** Window in hours considered "upcoming" after the due threshold. */
  upcomingWindowHours?: number;
}

/** Selection result describing queue composition and counts. */
export interface DrillSelection {
  /** Ordered list of items to present to the learner. */
  queue: VocabItem[];
  /** Number of items currently due or overdue. */
  dueCount: number;
  /** Number of items scheduled within the upcoming window. */
  upcomingCount: number;
  /** Number of items without any scheduling history. */
  newCount: number;
}

/** Derives a drill queue prioritising due items, then upcoming, then new entries. */
export const selectDrillQueue = (
  items: VocabItem[],
  options: DrillSelectorOptions,
): DrillSelection => {
  const { now, limit = items.length, upcomingWindowHours = 12 } = options;

  const due: VocabItem[] = [];
  const upcoming: VocabItem[] = [];
  const newItems: VocabItem[] = [];
  const later: VocabItem[] = [];

  items.forEach(item => {
    const srs = item.srsData;
    if (!srs) {
      newItems.push(item);
      return;
    }

    const dueDate = parseISO(srs.dueAt);
    const hoursUntilDue = differenceInHours(dueDate, now);

    if (hoursUntilDue <= 0) {
      due.push(item);
      return;
    }

    if (hoursUntilDue <= upcomingWindowHours) {
      upcoming.push(item);
      return;
    }

    later.push(item);
  });

  const compareByDue = (a: VocabItem, b: VocabItem) =>
    parseISO(a.srsData!.dueAt).getTime() - parseISO(b.srsData!.dueAt).getTime();

  due.sort(compareByDue);
  upcoming.sort(compareByDue);

  const compareByCreated = (a: VocabItem, b: VocabItem) =>
    parseISO(a.createdAt).getTime() - parseISO(b.createdAt).getTime();

  newItems.sort(compareByCreated);
  later.sort(compareByDue);

  const orderedQueue = [...due, ...upcoming, ...newItems, ...later].slice(0, limit);

  return {
    queue: orderedQueue,
    dueCount: due.length,
    upcomingCount: upcoming.length,
    newCount: newItems.length,
  };
};
