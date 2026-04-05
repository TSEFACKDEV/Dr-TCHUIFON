import { Router } from 'express';
import authRouter from './auth.route.js';
import publicationRouter from './publication.route.js';
import coursRouter from './cours.routes.js';
import userRouter from './user.route.js';
import profileRouter from './profile.route.js';
import supervisionRouter from './supervision.route.js';
import collaboratorRouter from './collaborator.route.js';
import contactRouter from './contact.route.js';

const routes = Router();

// Routes
routes.use('/auth', authRouter);
routes.use('/publications', publicationRouter);
routes.use('/courses', coursRouter);
routes.use('/users', userRouter);
routes.use('/profile', profileRouter);
routes.use('/supervisions', supervisionRouter);
routes.use('/collaborators', collaboratorRouter);
routes.use('/contact', contactRouter);

export default routes;
