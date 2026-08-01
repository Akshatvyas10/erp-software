'use strict';
const router = require('express').Router();
const { body, param } = require('express-validator');
const C = require('../controllers/subjectController');
const authenticate = require('../middlewares/authenticate');
const validate = require('../middlewares/validate');

router.use(authenticate);

const isUUID = (name) => param(name).isUUID().withMessage(`${name} must be a UUID`);

router.get('/', C.getAllSubjects);

router.get('/:id', [isUUID('id')], validate, C.getSubjectById);

router.post('/',
    [
        body('name').trim().notEmpty(),
        body('type').isIn(['THEORY', 'PRACTICAL', 'LAB', 'ELECTIVE'])
    ],
    validate, C.createSubject);

router.put('/:id',
    [
        isUUID('id'),
        body('type').optional().isIn(['THEORY', 'PRACTICAL', 'LAB', 'ELECTIVE'])
    ],
    validate, C.updateSubject);

router.delete('/:id', [isUUID('id')], validate, C.deleteSubject);

module.exports = router;
