import express from 'express';
const router = express.Router();
import { body, param } from 'express-validator';
import * as C from '../controllers/subjectController.js';
import authenticate from '../middlewares/authenticate.js';
import validate from '../middlewares/validate.js';

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

export default router;
