type NotificationLike = {
  title: string;
  message: string;
};

const titleMap: Record<string, string> = {
  'Новый отзыв': 'Новый отзыв',
  'Appointment booked': 'Запись создана',
  'Appointment scheduled': 'Запись создана',
  'Appointment confirmed': 'Запись подтверждена',
  'Appointment cancelled': 'Запись отменена',
  'Appointment rescheduled': 'Запись перенесена',
  'Appointment completed': 'Приём завершён',
  'Appointment reminder': 'Напоминание о приёме',
};

const translateMessage = (message: string) => {
  let translated = message;

  translated = translated.replace(
    /^Your appointment is scheduled for (.+?) with Dr\. (.+?)\.$/,
    'Ваша запись назначена на $1 к врачу $2.'
  );
  translated = translated.replace(
    /^Appointment (.+?) with Dr\. (.+?) has been completed\.$/,
    'Приём $1 у врача $2 завершён.'
  );
  translated = translated.replace(
    /^Appointment (.+?) with Dr\. (.+?) has been cancelled\.$/,
    'Запись $1 к врачу $2 отменена.'
  );
  translated = translated.replace(
    /^Appointment (.+?) with Dr\. (.+?) has been confirmed\.$/,
    'Запись $1 к врачу $2 подтверждена.'
  );
  translated = translated.replace(
    /^Appointment (.+?) with Dr\. (.+?) has been rescheduled to (.+?)\.$/,
    'Запись $1 к врачу $2 перенесена на $3.'
  );
  translated = translated.replace(
    /^Reminder: you have an appointment (.+?) with Dr\. (.+?)\.$/,
    'Напоминание: у вас приём $1 у врача $2.'
  );

  return translated;
};

export const localizeNotification = <T extends NotificationLike>(notification: T): T => ({
  ...notification,
  title: titleMap[notification.title] || notification.title,
  message: translateMessage(notification.message),
});
