const verifyN8nRequest = (req, res, next) => {
    const apiKey = req.header('x-n8n-api-key');
    const secretKey = process.env.N8N_SECRET_KEY;

    if (!apiKey || apiKey !== secretKey) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized: Invalid or missing n8n API key.'
        });
    }

    next();
};

export { verifyN8nRequest };
