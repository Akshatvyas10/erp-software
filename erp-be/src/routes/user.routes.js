'use strict';

import express from 'express';
const router = express.Router();
import { body, param } from 'express-validator';
import * as userController from '../controllers/userController.js';
const { listUsers, getUser, createUser, updateUser,
    assignRoles, setActiveStatus, deleteUser, } = userController;
import authenticate from '../middlewares/authenticate.js';
import { requirePermission } from '../middlewares/authorize.js';
import validate from '../middlewares/validate.js';

router.use(authenticate);

const createValidation = [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password min 8 characters'),
    body('firstName').trim().notEmpty(),
    body('lastName').trim().notEmpty(),
];

router.get('/', requirePermission('users', 'read'), listUsers);
router.get('/:id', [param('id').isUUID()], validate, requirePermission('users', 'read'), getUser);

router.post('/', createValidation, validate, requirePermission('users', 'create'), createUser);
router.put('/:id', [param('id').isUUID()], validate, requirePermission('users', 'update'), updateUser);
router.delete('/:id', [param('id').isUUID()], validate, requirePermission('users', 'delete'), deleteUser);

router.patch('/:id/roles', [param('id').isUUID(), body('roleIds').isArray()], validate, requirePermission('users', 'manage'), assignRoles);
router.patch('/:id/activate', [param('id').isUUID()], validate, requirePermission('users', 'manage'), setActiveStatus(true));
router.patch('/:id/deactivate', [param('id').isUUID()], validate, requirePermission('users', 'manage'), setActiveStatus(false));

export default router;
