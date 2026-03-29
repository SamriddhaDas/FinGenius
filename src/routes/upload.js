const express = require('express');
const uploadMiddleware = require('../middleware/upload');
const { protect } = require('../middleware/auth');
const { uploadForm16 } = require('../controllers/uploadController');

const router = express.Router();
router.use(protect);

router.post('/form16', uploadMiddleware.single('file'), uploadForm16);

module.exports = router;
