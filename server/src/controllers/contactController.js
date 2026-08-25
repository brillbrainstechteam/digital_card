const contactService = require('../services/contactService')

async function submit(req, res, next) {
  try {
    const { name, email, subject, message } = req.body
    const saved = await contactService.submitMessage({ name, email, subject, message, ip: req.ip })
    res.status(201).json({ success: true, message: "Thanks — we'll get back to you within 2 business days.", data: saved })
  } catch (err) {
    next(err)
  }
}

module.exports = { submit }
