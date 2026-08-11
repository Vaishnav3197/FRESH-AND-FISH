export const toJSDate = (val: any): Date => {
  if (!val) return new Date();
  if (typeof val === 'number') {
    return new Date(val);
  }
  if (val && typeof val.toDate === 'function') {
    return val.toDate();
  }
  if (val instanceof Date) {
    return val;
  }
  return new Date(val);
};

export const formatDateTime = (dateVal: any): string => {
  const date = toJSDate(dateVal);
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

export const formatDate = (dateVal: any): string => {
  const date = toJSDate(dateVal);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

export const startOfToday = (): Date => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export const endOfToday = (): Date => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
};

export const startOfThisWeek = (): Date => {
  const d = new Date();
  const day = d.getDay(); // 0 is Sunday, 1 is Monday...
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to start on Monday
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
};

export const endOfThisWeek = (): Date => {
  const monday = startOfThisWeek();
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return sunday;
};

export const startOfThisMonth = (): Date => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
};

export const endOfThisMonth = (): Date => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
};

export const isToday = (dateVal: any): boolean => {
  const date = toJSDate(dateVal);
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

export const isThisWeek = (dateVal: any): boolean => {
  const dateMs = toJSDate(dateVal).getTime();
  return dateMs >= startOfThisWeek().getTime() && dateMs <= endOfThisWeek().getTime();
};

export const isThisMonth = (dateVal: any): boolean => {
  const dateMs = toJSDate(dateVal).getTime();
  return dateMs >= startOfThisMonth().getTime() && dateMs <= endOfThisMonth().getTime();
};
