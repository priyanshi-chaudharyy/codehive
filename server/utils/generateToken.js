import jwt from 'jsonwebtoken';

/**
 * Generate a JWT token for the given user ID.
 * @param {string} id - The user's MongoDB _id
 * @returns {string} Signed JWT token
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

export default generateToken;
