// Role Based Authorization Middleware 

const authorize = (roles = []) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({message: "Access denied: You are not permitted"})
        }
        next()
    };
};

module.exports = authorize;