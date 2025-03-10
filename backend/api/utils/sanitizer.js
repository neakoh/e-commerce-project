const sanitizeUsername = (username) => {
  if (typeof username !== 'string') return username;
  return username.trim().replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase();
};

const sanitizeName = (name) => {
  if (typeof name !== 'string') return name;
  const sanitized = name.trim().replace(/[^a-zA-Z]/g, '');
  return sanitized.charAt(0).toUpperCase() + sanitized.slice(1).toLowerCase();
};

const sanitizeEmail = (email) => {
  if (typeof email !== 'string') return email;
  return email.trim().replace(/[^a-zA-Z0-9@._+-]/g, '').toLowerCase();
};

const sanitizePassword = (password) => {
  if (typeof password !== 'string') return password;
  return password.trim(); // Only trim whitespace
};

module.exports = { 
  sanitizeUsername,
  sanitizeName,
  sanitizeEmail,
  sanitizePassword
}