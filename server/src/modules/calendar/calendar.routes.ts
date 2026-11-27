import { Router } from 'express';
import { requireAuth } from '../../core/middleware/auth';
import { getFriendsBirthdays } from './calendar.service';

export const calendarRouter = Router();
calendarRouter.use(requireAuth);

calendarRouter.get('/birthdays', async (req, res) => {
  res.json({ birthdays: await getFriendsBirthdays(req.user!.id) });
});
