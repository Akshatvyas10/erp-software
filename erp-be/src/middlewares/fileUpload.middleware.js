import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Centralized upload directory
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Ensure school config directory exists
const SCHOOL_DIR = path.join(UPLOAD_DIR, 'school');
if (!fs.existsSync(SCHOOL_DIR)) {
    fs.mkdirSync(SCHOOL_DIR, { recursive: true });
}

// Memory storage to process with sharp before saving
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only JPEG, PNG, and WebP images are allowed'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 2 * 1024 * 1024, // Strictly less than 2MB
    },
});

/**
 * Middleware to handle single or multiple image uploads, compress them, and save them.
 */
export const uploadSchoolImages = upload.fields([
    { name: 'logoUrl', maxCount: 1 },
    { name: 'watermarkUrl', maxCount: 1 }
]);

export const compressAndSaveSchoolImages = async (req, res, next) => {
    try {
        if (!req.files) return next();

        const processImage = async (fileArray, fieldName) => {
            if (fileArray && fileArray.length > 0) {
                const file = fileArray[0];
                const ext = '.webp'; // Convert to webp for better compression
                const filename = `school-${fieldName}-${uuidv4()}${ext}`;
                const filepath = path.join(SCHOOL_DIR, filename);

                await sharp(file.buffer)
                    .resize({ width: 800, withoutEnlargement: true }) // Resize to max 800px width
                    .webp({ quality: 80 }) // Compress
                    .toFile(filepath);

                req.body[fieldName] = `/uploads/school/${filename}`;
            }
        };

        await Promise.all([
            processImage(req.files['logoUrl'], 'logoUrl'),
            processImage(req.files['watermarkUrl'], 'watermarkUrl')
        ]);

        next();
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'Image processing failed',
            error: err.message
        });
    }
};
