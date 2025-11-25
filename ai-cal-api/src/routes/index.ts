import express from 'express';
import authRoute from './auth.route';
import messageRoute from './message.route';
import calendarRoute from './calendar.route';

const router = express.Router();

// Default App Routes
const defaultRoutes = [
  {
    path: '/auth',
    route: authRoute,
  },
  {
    path: '/message',
    route: messageRoute,
  },
  {
    path: '/calendar',
    route: calendarRoute,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

export default router;
