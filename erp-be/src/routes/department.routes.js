'use strict';

const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');
const authenticate = require('../middlewares/authenticate');
const { requirePermission } = require('../middlewares/authorize');

router.use(authenticate);

router.get('/', departmentController.listDepartments);
// Optionally require specific permissions to manage departments, here we can just use teacher permissions for now or a general admin check
// Since this is ERP we might just check if they are logged in or have 'teachers:read/write'
// I'll keep it simple: any authenticated user can view list (useful for dropdowns)
// But to create/update they might need 'teachers:create' permission as a proxy for HR/Admin
router.post('/', requirePermission('teachers', 'create'), departmentController.createDepartment);
router.put('/:id', requirePermission('teachers', 'update'), departmentController.updateDepartment);
router.delete('/:id', requirePermission('teachers', 'delete'), departmentController.deleteDepartment);

module.exports = router;
