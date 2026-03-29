const fs = require('fs');
const pdfParse = require('pdf-parse');
const TaxAnalysis = require('../models/TaxAnalysis');
const logger = require('../utils/logger');

// Naive Form 16 field extractor from raw PDF text
const extractForm16Fields = (text) => {
  const extract = (pattern) => {
    const match = text.match(pattern);
    return match ? parseFloat(match[1].replace(/,/g, '')) : 0;
  };

  return {
    grossSalary: extract(/gross\s+salary[^\d]*([\d,]+)/i)
      || extract(/total\s+income[^\d]*([\d,]+)/i),
    hra: extract(/hra[^\d]*([\d,]+)/i)
      || extract(/house\s+rent\s+allowance[^\d]*([\d,]+)/i),
    deductionHomeLoanInterest: extract(/housing\s+loan\s+interest[^\d]*([\d,]+)/i)
      || extract(/section\s+24[^\d]*([\d,]+)/i),
    deduction80C: extract(/80c[^\d]*([\d,]+)/i),
    deduction80D: extract(/80d[^\d]*([\d,]+)/i),
    deduction80CCD1B: extract(/80ccd\(1b\)[^\d]*([\d,]+)/i)
      || extract(/nps[^\d]*([\d,]+)/i),
    tdsPaid: extract(/tds\s+deducted[^\d]*([\d,]+)/i)
      || extract(/tax\s+deducted[^\d]*([\d,]+)/i)
  };
};

// POST /api/upload/form16
exports.uploadForm16 = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  try {
    const pdfBuffer = fs.readFileSync(req.file.path);
    const data = await pdfParse(pdfBuffer);
    const extracted = extractForm16Fields(data.text);

    // Determine FY from file or default
    const financialYear = req.body.financialYear || '2024-25';

    // Save / update tax record with extracted data
    await TaxAnalysis.findOneAndUpdate(
      { user: req.user._id, financialYear },
      {
        ...extracted,
        financialYear,
        form16Uploaded: true,
        form16Path: req.file.filename
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: 'Form 16 processed',
      extracted,
      financialYear
    });
  } catch (err) {
    logger.error(`Form 16 parse error: ${err.message}`);
    res.status(500).json({ success: false, message: 'Failed to parse Form 16' });
  } finally {
    // Clean up uploaded file after parsing
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  }
};
