
import dotenv from 'dotenv';
dotenv.config();

const ENV = process.env.NODE_ENV || 'development';

const config = {
    development: {
        cors: {
            origin: function (origin, callback) {
                // Allow all localhost and specific frontend URL in Dev
                const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174', process.env.FRONTEND_URL];
                if (!origin || allowedOrigins.indexOf(origin) !== -1 || origin.startsWith('http://localhost:')) {
                    callback(null, true);
                } else {
                    callback(new Error('Not allowed by CORS'));
                }
            },
            credentials: true
        },
        rateLimit: {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 10000, // Relaxed for dev/testing
            message: 'Too many requests (Dev Limit)'
        },
        morganFormat: 'dev'
    },
    production: {
        cors: {
            origin: [process.env.FRONTEND_URL, 'https://consultas.cge.mil.ar'], // Strict List
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
        },
        rateLimit: {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 500, // Strict for prod (500 req / 15 min per IP)
            standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
            legacyHeaders: false, // Disable the `X-RateLimit-*` headers
            message: 'Too many requests, please try again later.'
        },
        morganFormat: 'combined'
    },
    test: {
        cors: { origin: '*' },
        rateLimit: { windowMs: 15 * 60 * 1000, max: 10000 }
    }
};

export default config[ENV] || config.development;
