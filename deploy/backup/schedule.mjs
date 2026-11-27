const interval = /^[1-9]\d{0,2}h$/;
const daily = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function backupSchedule(value, timeZone) {
  const hours = interval.test(value) ? Number(value.slice(0, -1)) : 0;
  if (hours && hours <= 168) {
    const intervalMs = hours * 60 * 60 * 1000;
    return (now, last) => !last || now - last >= intervalMs;
  }
  if (!daily.test(value))
    throw new Error('Копирование: укажите время ЧЧ:ММ или интервал от 1h до 168h.');

  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  return (now, last) => {
    if (!last) return true;
    const [date, time] = formatter.format(now).split(' ');
    const previousDate = new Date(Date.parse(date) - 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const latestSlot = `${time >= value ? date : previousDate} ${value}`;
    return formatter.format(last) < latestSlot;
  };
}
